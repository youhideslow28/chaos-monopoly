import {
  AIDifficulty,
  AIPersonalityId,
  GameState,
  PlayerState,
} from '../types';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { computeNextAIDecision, getActiveAIActor } from './aiDecisionEngine';
import { createPRNG, SeededPRNG } from '../chaos-engine/prng';
import { calculatePlayerNetWorth } from '../economy/economyEngine';
import { verifyLedgerAudit } from '../economy/ledgerEngine';

export interface SimulatedPlayerConfig {
  name: string;
  isAI: boolean;
  aiPersonality: AIPersonalityId;
  aiDifficulty: AIDifficulty;
}

export interface SingleMatchSimulationResult {
  seed: number;
  winnerId: string | null;
  winnerName: string | null;
  winnerPersonality: AIPersonalityId | null;
  winnerDifficulty: AIDifficulty | null;
  roundsPlayed: number;
  totalDecisions: number;
  bankruptcies: number;
  propertiesPurchased: number;
  upgradesBuilt: number;
  auctionsInitiated: number;
  auctionBidsPlaced: number;
  tradesProposed: number;
  tradesAccepted: number;
  chaosEventsTriggered: number;
  finalNetWorths: Record<string, number>;
  ledgerAuditValid: boolean;
}

export interface BatchSimulationStats {
  totalMatches: number;
  averageRounds: number;
  averageDecisions: number;
  bankruptcyRate: number;
  averagePropertiesAcquired: number;
  averageUpgradesPerMatch: number;
  averageAuctionsPerMatch: number;
  tradeAcceptanceRate: number;
  averageChaosEvents: number;
  winRateByPersonality: Record<AIPersonalityId, { wins: number; appearances: number; winRate: number; avgNetWorth: number }>;
  winRateByDifficulty: Record<AIDifficulty, { wins: number; appearances: number; winRate: number; avgNetWorth: number }>;
  allLedgersValid: boolean;
}

function rollDeterministicDice(rng: SeededPRNG): [number, number] {
  return [rng.nextInt(1, 6), rng.nextInt(1, 6)];
}

/**
 * Runs a complete match headless from start to finish using deterministic PRNG.
 * Guarantees termination via strict maxSteps and per-turn step limits.
 */
export function runHeadlessMatchSimulation(options: {
  players: SimulatedPlayerConfig[];
  seed?: number;
  maxRounds?: number;
  startingCash?: number;
  maxDecisions?: number;
  /** World under test (roadmap B balance runs). Defaults to the base world. */
  worldId?: string;
}): SingleMatchSimulationResult {
  const seed = options.seed ?? 1001;
  const rng = createPRNG(seed);
  const maxRounds = options.maxRounds ?? 45;
  const startingCash = options.startingCash ?? 1500;
  const maxDecisions = options.maxDecisions ?? 3500;

  let state: GameState = gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players: options.players.map(p => ({
      name: p.name,
      isAI: true, // Headless simulation drives all players through the strategic engine
      aiPersonality: p.aiPersonality,
      aiDifficulty: p.aiDifficulty,
    })),
    config: {
      startingCash,
      maxRounds,
      seed,
      worldId: options.worldId,
    },
  });

  let totalDecisions = 0;
  let propertiesPurchased = 0;
  let upgradesBuilt = 0;
  let auctionsInitiated = 0;
  let auctionBidsPlaced = 0;
  let tradesProposed = 0;
  let tradesAccepted = 0;
  let chaosEventsTriggered = 0;

  let currentTurnPlayerId = state.players[state.activePlayerIndex]?.id;
  let turnActionCounter = 0;

  while (state.status === 'PLAYING' && state.turnPhase !== 'GAME_OVER' && totalDecisions < maxDecisions) {
    totalDecisions++;

    const activePlayer = state.players[state.activePlayerIndex];
    if (activePlayer?.id !== currentTurnPlayerId) {
      currentTurnPlayerId = activePlayer?.id;
      turnActionCounter = 0;
    }

    const actor: PlayerState | null = getActiveAIActor(state);
    if (!actor) {
      // Fallback safety: advance turn if no actor is eligible
      state = gameReducer(state, { type: 'END_TURN' });
      continue;
    }

    const decision = computeNextAIDecision(state, turnActionCounter);
    if (!decision) {
      state = gameReducer(state, { type: 'END_TURN' });
      continue;
    }

    const { action } = decision;

    if (action.type === 'ROLL_DICE_START') {
      state = gameReducer(state, action);
      const dice = rollDeterministicDice(rng);
      const prevChaosCount = state.chaosHistory?.length || 0;
      state = gameReducer(state, {
        type: 'ROLL_DICE_RESULT',
        dice,
        senderPlayerId: actor.id,
      });
      if ((state.chaosHistory?.length || 0) > prevChaosCount) {
        chaosEventsTriggered++;
      }
      turnActionCounter = 0;
      continue;
    }

    // Track telemetry metrics
    if (action.type === 'BUY_PROPERTY') propertiesPurchased++;
    if (action.type === 'UPGRADE_PROPERTY') upgradesBuilt++;
    if (action.type === 'START_AUCTION') auctionsInitiated++;
    if (action.type === 'PLACE_AUCTION_BID') auctionBidsPlaced++;
    if (action.type === 'PROPOSE_TRADE') tradesProposed++;
    if (action.type === 'ACCEPT_TRADE') tradesAccepted++;

    const prevState = state;
    state = gameReducer(state, action);
    state = gameReducer(state, { type: 'RECORD_AI_DECISION', decision: decision.reason });

    if (
      action.type !== 'PLACE_AUCTION_BID' &&
      action.type !== 'PASS_AUCTION_BID' &&
      action.type !== 'ACCEPT_TRADE' &&
      action.type !== 'REJECT_TRADE'
    ) {
      turnActionCounter++;
    }

    // Stale/no-op action guard: if reducer rejected an action in ACTION_MENU, force END_TURN to prevent infinite loops
    if (state.turnPhase === prevState.turnPhase && state.players === prevState.players && state.properties === prevState.properties && state.activeAuction === prevState.activeAuction && state.activeTrade === prevState.activeTrade) {
      if (state.turnPhase === 'ACTION_MENU') {
        state = gameReducer(state, { type: 'END_TURN' });
        turnActionCounter = 0;
      } else if (state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION') {
        state = gameReducer(state, {
          type: 'DECLARE_BANKRUPTCY',
          playerId: actor.id,
        });
        turnActionCounter = 0;
      }
    }
  }

  // If maxDecisions was reached before natural end, evaluate winner by Net Worth
  let winner = state.winner;
  if (!winner && state.players.length > 0) {
    const solvent = state.players.filter(p => !p.isBankrupt);
    const pool = solvent.length > 0 ? solvent : state.players;
    winner = [...pool].sort(
      (a, b) =>
        calculatePlayerNetWorth(b, state.properties, state.chaosModifiers, state.roundNumber, state) -
        calculatePlayerNetWorth(a, state.properties, state.chaosModifiers, state.roundNumber, state)
    )[0];
  }

  const finalNetWorths: Record<string, number> = {};
  for (const p of state.players) {
    finalNetWorths[p.id] = calculatePlayerNetWorth(p, state.properties, state.chaosModifiers, state.roundNumber, state);
  }

  const audit = verifyLedgerAudit(startingCash, state.players, state.ledger || []);
  const bankruptcies = state.players.filter(p => p.isBankrupt).length;

  return {
    seed,
    winnerId: winner?.id || null,
    winnerName: winner?.name || null,
    winnerPersonality: winner?.aiPersonality || null,
    winnerDifficulty: winner?.aiDifficulty || null,
    roundsPlayed: state.roundNumber,
    totalDecisions,
    bankruptcies,
    propertiesPurchased,
    upgradesBuilt,
    auctionsInitiated,
    auctionBidsPlaced,
    tradesProposed,
    tradesAccepted,
    chaosEventsTriggered,
    finalNetWorths,
    ledgerAuditValid: audit.isValid,
  };
}

/**
 * Runs a batch of multi-seed simulations and aggregates empirical statistics
 * across personalities and difficulty levels.
 */
export function runBatchSimulations(
  configs: { players: SimulatedPlayerConfig[]; seed: number; maxRounds?: number }[]
): BatchSimulationStats {
  const personalityStats: BatchSimulationStats['winRateByPersonality'] = {
    TYCOON: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
    STRATEGIST: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
    SHARK: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
    SURVIVOR: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
    CHAOTIC: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
    DIPLOMAT: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
  };

  const difficultyStats: BatchSimulationStats['winRateByDifficulty'] = {
    EASY: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
    NORMAL: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
    HARD: { wins: 0, appearances: 0, winRate: 0, avgNetWorth: 0 },
  };

  let sumRounds = 0;
  let sumDecisions = 0;
  let sumBankruptcies = 0;
  let totalPlayers = 0;
  let sumProps = 0;
  let sumUpgrades = 0;
  let sumAuctions = 0;
  let sumTradesProposed = 0;
  let sumTradesAccepted = 0;
  let sumChaos = 0;
  let allLedgersValid = true;

  for (const cfg of configs) {
    const res = runHeadlessMatchSimulation(cfg);
    sumRounds += res.roundsPlayed;
    sumDecisions += res.totalDecisions;
    sumBankruptcies += res.bankruptcies;
    totalPlayers += cfg.players.length;
    sumProps += res.propertiesPurchased;
    sumUpgrades += res.upgradesBuilt;
    sumAuctions += res.auctionsInitiated;
    sumTradesProposed += res.tradesProposed;
    sumTradesAccepted += res.tradesAccepted;
    sumChaos += res.chaosEventsTriggered;
    if (!res.ledgerAuditValid) allLedgersValid = false;

    cfg.players.forEach((p, idx) => {
      const pid = `player-${idx + 1}`;
      const nw = res.finalNetWorths[pid] || 0;

      const pEntry = personalityStats[p.aiPersonality];
      pEntry.appearances++;
      pEntry.avgNetWorth += nw;
      if (res.winnerId === pid) pEntry.wins++;

      const dEntry = difficultyStats[p.aiDifficulty];
      dEntry.appearances++;
      dEntry.avgNetWorth += nw;
      if (res.winnerId === pid) dEntry.wins++;
    });
  }

  for (const key of Object.keys(personalityStats) as AIPersonalityId[]) {
    const item = personalityStats[key];
    if (item.appearances > 0) {
      item.winRate = Number(((item.wins / item.appearances) * 100).toFixed(1));
      item.avgNetWorth = Math.round(item.avgNetWorth / item.appearances);
    }
  }

  for (const key of Object.keys(difficultyStats) as AIDifficulty[]) {
    const item = difficultyStats[key];
    if (item.appearances > 0) {
      item.winRate = Number(((item.wins / item.appearances) * 100).toFixed(1));
      item.avgNetWorth = Math.round(item.avgNetWorth / item.appearances);
    }
  }

  const n = Math.max(1, configs.length);
  return {
    totalMatches: configs.length,
    averageRounds: Number((sumRounds / n).toFixed(1)),
    averageDecisions: Math.round(sumDecisions / n),
    bankruptcyRate: Number(((sumBankruptcies / Math.max(1, totalPlayers)) * 100).toFixed(1)),
    averagePropertiesAcquired: Number((sumProps / n).toFixed(1)),
    averageUpgradesPerMatch: Number((sumUpgrades / n).toFixed(1)),
    averageAuctionsPerMatch: Number((sumAuctions / n).toFixed(1)),
    tradeAcceptanceRate:
      sumTradesProposed > 0
        ? Number(((sumTradesAccepted / sumTradesProposed) * 100).toFixed(1))
        : 0,
    averageChaosEvents: Number((sumChaos / n).toFixed(1)),
    winRateByPersonality: personalityStats,
    winRateByDifficulty: difficultyStats,
    allLedgersValid,
  };
}
