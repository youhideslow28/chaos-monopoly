import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import {
  AI_PERSONALITIES,
  AI_PERSONALITY_LIST,
  AI_DIFFICULTIES,
} from '../ai/aiPersonalities';
import {
  evaluatePropertyForPlayer,
  calculateRequiredSafetyReserve,
  shouldEscapeDetentionImmediately,
} from '../ai/aiValuation';
import {
  evaluateIncomingTradeForAI,
  generateOutboundTradeForAI,
} from '../ai/aiNegotiationEngine';
import {
  computeNextAIDecision,
  getActiveAIActor,
} from '../ai/aiDecisionEngine';
import {
  runHeadlessMatchSimulation,
  runBatchSimulations,
} from '../ai/aiSimulationRunner';
import {
  selectContextWeightedChaosCard,
  applyChaosCard,
} from '../chaos-engine/chaosEngine';
import * as chaosEngineModule from '../chaos-engine/chaosEngine';
import { CHAOS_CARDS, getChaosCardById } from '../chaos-engine/chaosCards';
import { createPRNG } from '../chaos-engine/prng';
import { AIPersonalityId, GameState, PlayerState } from '../types';

function createAIMatch(
  personalities: AIPersonalityId[] = ['TYCOON', 'STRATEGIST', 'SHARK', 'SURVIVOR'],
  difficulty: 'EASY' | 'NORMAL' | 'HARD' = 'NORMAL'
): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players: personalities.map((p, idx) => ({
      name: `AI ${p} ${idx + 1}`,
      isAI: true,
      aiPersonality: p,
      aiDifficulty: difficulty,
    })),
    config: { startingCash: 1500, maxRounds: 35, seed: 2026 },
  });
}

describe('Phase 03 — AI Players, Personalities, Strategic Engine, Chaos Intelligence & Simulations', () => {
  describe('1. Six Distinct AI Personalities & Behavioral Differentiation', () => {
    it('defines all 6 required AI personalities with distinct strategic parameters', () => {
      expect(AI_PERSONALITY_LIST.length).toBe(6);
      const ids = AI_PERSONALITY_LIST.map(p => p.id);
      expect(ids).toEqual(['TYCOON', 'STRATEGIST', 'SHARK', 'SURVIVOR', 'CHAOTIC', 'DIPLOMAT']);

      // Verify distinct reserve ratios and acquisition thresholds
      expect(AI_PERSONALITIES.SURVIVOR.minReserveRatio).toBeGreaterThan(
        AI_PERSONALITIES.TYCOON.minReserveRatio
      );
      expect(AI_PERSONALITIES.TYCOON.minReserveRatio).toBeGreaterThan(
        AI_PERSONALITIES.CHAOTIC.minReserveRatio
      );
      expect(AI_PERSONALITIES.SHARK.predatoryFactor).toBeGreaterThan(
        AI_PERSONALITIES.DIPLOMAT.predatoryFactor
      );
    });

    it('produces measurably different purchase vs auction decisions between Tycoon and Survivor under tight cash', () => {
      let state = createAIMatch(['TYCOON', 'SURVIVOR'], 'NORMAL');
      // Place active player at Tile 37 (Phố Cổ Hà Nội, basePrice = 350) with $520M cash
      state = {
        ...state,
        players: state.players.map((p, idx) =>
          idx === 0
            ? { ...p, position: 37, cash: 520, aiPersonality: 'TYCOON' }
            : { ...p, position: 37, cash: 520, aiPersonality: 'SURVIVOR' }
        ),
        turnPhase: 'ACTION_MENU',
      };

      // Tycoon buys Tile 37 directly because it is a preferred green district and reserve ratio is low (12%)
      const tycoonDecision = computeNextAIDecision(state, 0);
      expect(tycoonDecision?.action.type).toBe('BUY_PROPERTY');

      // Switch active player to Survivor at the exact same position and cash ($520M)
      const survivorState: GameState = {
        ...state,
        activePlayerIndex: 1,
      };
      // Survivor declines direct purchase to protect its 38% safety reserve ($570M) and triggers START_AUCTION
      const survivorDecision = computeNextAIDecision(survivorState, 0);
      expect(survivorDecision?.action.type).toBe('START_AUCTION');
    });

    it('adapts Chaotic and Tycoon valuation during active Chaos Economic Booms', () => {
      let state = createAIMatch(['CHAOTIC', 'STRATEGIST'], 'HARD');
      const player = state.players[0];

      const baseVal = evaluatePropertyForPlayer(state, player, 5, 'CHAOTIC', 'HARD'); // Tile 5 Transport Hub
      const boomState: GameState = {
        ...state,
        chaosModifiers: {
          ...state.chaosModifiers!,
          transportBoomTurns: 3,
        },
      };
      const boomVal = evaluatePropertyForPlayer(boomState, player, 5, 'CHAOTIC', 'HARD');
      expect(boomVal.intrinsicValue).toBeGreaterThan(baseVal.intrinsicValue);
    });
  });

  describe('2. Three Difficulty Levels (EASY, NORMAL, HARD) & Opponent Modeling', () => {
    it('differentiates EASY vs HARD when an opponent is 1 tile away from completing a Monopoly', () => {
      expect(Object.keys(AI_DIFFICULTIES)).toEqual(['EASY', 'NORMAL', 'HARD']);

      let state = createAIMatch(['SHARK', 'TYCOON'], 'HARD');
      // Opponent (player-2) already owns Tile 37 (Hà Nội); Tile 39 (Landmark 81) would complete Darkblue/Green if 2-tile district
      // Let's use Darkblue district: Tile 37 is Green (27, 29, 31/32/34), Darkblue is Tiles 37 & 39!
      state = {
        ...state,
        properties: {
          ...state.properties,
          37: { ownerId: 'player-2', level: 0, isMortgaged: false },
        },
      };

      const p1 = state.players[0];
      const easyVal = evaluatePropertyForPlayer(state, p1, 39, 'SHARK', 'EASY');
      const hardVal = evaluatePropertyForPlayer(state, p1, 39, 'SHARK', 'HARD');

      expect(hardVal.blocksOpponentMonopoly).toBe(true);
      expect(hardVal.blockedOpponentId).toBe('player-2');
      // HARD AI assigns a significantly higher blocking valuation than EASY AI
      expect(hardVal.intrinsicValue).toBeGreaterThan(easyVal.intrinsicValue * 1.25);
    });

    it('calculates dynamic safety reserve factoring in next-roll board danger on NORMAL/HARD', () => {
      let state = createAIMatch(['STRATEGIST', 'TYCOON'], 'HARD');
      const p1 = state.players[0];

      const safeBoardReserve = calculateRequiredSafetyReserve(state, p1, 'STRATEGIST', 'HARD');

      // Now populate Tiles 6, 8, 9 (ahead of position 0) with Level 4 enemy skyscrapers
      const dangerousState: GameState = {
        ...state,
        properties: {
          ...state.properties,
          6: { ownerId: 'player-2', level: 4, isMortgaged: false },
          8: { ownerId: 'player-2', level: 4, isMortgaged: false },
          9: { ownerId: 'player-2', level: 4, isMortgaged: false },
        },
      };

      const dangerBoardReserve = calculateRequiredSafetyReserve(
        dangerousState,
        p1,
        'STRATEGIST',
        'HARD'
      );
      expect(dangerBoardReserve).toBeGreaterThan(safeBoardReserve);
    });
  });

  describe('3. Strategic Decision Engine (Auctions, Upgrades, Debt, Detention)', () => {
    it('bids strategically in public auctions up to ceiling and passes when bid exceeds value', () => {
      let state = createAIMatch(['TYCOON', 'SURVIVOR'], 'NORMAL');
      state = gameReducer(state, { type: 'START_AUCTION', tileId: 6 }); // Vũng Tàu, basePrice 100, openingBid 50

      expect(getActiveAIActor(state)?.id).toBe('player-1');
      const firstBid = computeNextAIDecision(state, 0);
      expect(firstBid?.action.type).toBe('PLACE_AUCTION_BID');

      // If current highest bid is artificially inflated to $900M, AI passes
      const inflatedAuctionState: GameState = {
        ...state,
        activeAuction: {
          ...state.activeAuction!,
          highestBid: 900,
          highestBidderId: 'player-2',
          currentTurnBidderId: 'player-1',
        },
      };
      const passDecision = computeNextAIDecision(inflatedAuctionState, 0);
      expect(passDecision?.action.type).toBe('PASS_AUCTION_BID');
    });

    it('handles emergency debt liquidation by mortgaging/downgrading before settling debt', () => {
      let state = createAIMatch(['SURVIVOR', 'TYCOON'], 'NORMAL');
      // Give player-1 $20M cash, Tile 1 (unmortgaged), and a $45M pending debt
      state = {
        ...state,
        players: state.players.map((p, i) => (i === 0 ? { ...p, cash: 20 } : p)),
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 0, isMortgaged: false },
        },
        turnPhase: 'BANKRUPTCY_CHECK',
        pendingDebt: {
          creditorPlayerId: null,
          amount: 45,
          reason: 'Thuế khẩn cấp',
          category: 'TAX_PAYMENT',
        },
      };

      // Step 1: AI mortgages Tile 1 (+$36M at 60% -> total cash $56M)
      const step1 = computeNextAIDecision(state, 0);
      expect(step1?.action.type).toBe('MORTGAGE_PROPERTY');
      state = gameReducer(state, step1!.action);
      expect(state.players[0].cash).toBe(56);

      // Step 2: Now cash ($56M) >= debt ($45M) -> AI dispatches RESOLVE_DEBT!
      const step2 = computeNextAIDecision(state, 1);
      expect(step2?.action.type).toBe('RESOLVE_DEBT');
      state = gameReducer(state, step2!.action);
      expect(state.pendingDebt).toBeNull();
      expect(state.turnPhase).toBe('ACTION_MENU');
    });

    it('evaluates detention escape: escapes early game, stays sheltered late game when enemy monopolies dominate', () => {
      let state = createAIMatch(['SURVIVOR', 'TYCOON'], 'HARD');
      // Early game (all properties unowned): Survivor escapes immediately
      const detainedEarly: PlayerState = {
        ...state.players[0],
        inDetention: true,
        detentionTurns: 2,
        jailFreeCards: 1,
      };
      expect(shouldEscapeDetentionImmediately(state, detainedEarly).shouldEscape).toBe(true);

      // Late game: mark almost all properties owned by player-2 with monopolies
      const lateProps = { ...state.properties };
      for (const tidStr of Object.keys(lateProps)) {
        lateProps[Number(tidStr)] = { ownerId: 'player-2', level: 2, isMortgaged: false };
      }
      const lateState: GameState = {
        ...state,
        properties: lateProps,
      };
      expect(shouldEscapeDetentionImmediately(lateState, detainedEarly).shouldEscape).toBe(false);
    });
  });

  describe('4. Negotiation, Trade Evaluation & Counteroffers', () => {
    it('rejects exploitative trades that hand an opponent a monopoly for cheap, and generates counteroffers when appropriate', () => {
      let state = createAIMatch(['STRATEGIST', 'SHARK'], 'HARD');
      // Player-2 (SHARK) owns Tile 1 and wants Tile 3 from Player-1 (STRATEGIST) to complete Brown monopoly
      // Player-2 must hold the turn: proactive offers outside the active turn are rejected.
      state = {
        ...state,
        activePlayerIndex: 1,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-2', level: 0, isMortgaged: false },
          3: { ownerId: 'player-1', level: 0, isMortgaged: false },
        },
      };

      // Lowball offer: $40M for Tile 3 (basePrice 60, plus completes monopoly)
      state = gameReducer(state, {
        type: 'PROPOSE_TRADE',
        proposal: {
          senderPlayerId: 'player-2',
          targetPlayerId: 'player-1',
          offeredCash: 40,
          offeredPropertyIds: [],
          offeredJailCards: 0,
          requestedCash: 0,
          requestedPropertyIds: [3],
          requestedJailCards: 0,
        },
      });

      const evalLowball = evaluateIncomingTradeForAI(
        state,
        state.players[0],
        state.activeTrade!
      );
      expect(evalLowball.decision).not.toBe('ACCEPT');
      // On HARD difficulty with smart negotiation enabled, a bridgeable deficit produces a COUNTER offer!
      expect(['REJECT', 'COUNTER']).toContain(evalLowball.decision);

      // Generous offer: $600M for Tile 3 -> Accepted!
      state = { ...state, activeTrade: null };
      state = gameReducer(state, {
        type: 'PROPOSE_TRADE',
        proposal: {
          senderPlayerId: 'player-2',
          targetPlayerId: 'player-1',
          offeredCash: 600,
          offeredPropertyIds: [],
          offeredJailCards: 0,
          requestedCash: 0,
          requestedPropertyIds: [3],
          requestedJailCards: 0,
        },
      });
      const evalGenerous = evaluateIncomingTradeForAI(
        state,
        state.players[0],
        state.activeTrade!
      );
      expect(evalGenerous.decision).toBe('ACCEPT');
    });

    it('generates valid outbound trade proposals when AI can complete a district', () => {
      let state = createAIMatch(['DIPLOMAT', 'TYCOON'], 'HARD');
      // Player-1 (DIPLOMAT) owns Tile 1, Player-2 owns Tile 3 (completes Brown district)
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 0, isMortgaged: false },
          3: { ownerId: 'player-2', level: 0, isMortgaged: false },
        },
      };

      const outbound = generateOutboundTradeForAI(state, state.players[0]);
      expect(outbound).not.toBeNull();
      expect(outbound?.proposal.requestedPropertyIds).toContain(3);
    });
  });

  describe('5. Chaos Intelligence (Context Weighting, Mutual Exclusion & Event History)', () => {
    it('prevents immediate duplicate Chaos cards via cooldown history and records ChaosEventHistoryEntry', () => {
      let state = createAIMatch(['TYCOON', 'SURVIVOR'], 'NORMAL');
      const cardA = getChaosCardById('pos-vietlott-jackpot')!;
      const cardB = getChaosCardById('pos-fdi-boost')!;

      state = applyChaosCard(state, cardA, createPRNG(10));
      expect(state.chaosHistory?.length).toBe(1);
      expect(state.chaosHistory?.[0].cardId).toBe('pos-vietlott-jackpot');

      // When selecting from a 2-card pool where cardA was just played, cooldown selects cardB deterministically
      const selected = selectContextWeightedChaosCard([cardA, cardB], createPRNG(99), state);
      expect(selected.id).toBe('pos-fdi-boost');
    });

    it('resolves contradictory economic modifiers (INTEREST_HIKE vs SUBSIDIZED_MORTGAGE)', () => {
      let state = createAIMatch(['TYCOON', 'SURVIVOR'], 'NORMAL');
      const hikeCard = getChaosCardById('eco-bank-interest-hike')!;
      const subsidyCard = getChaosCardById('eco-subsidized-mortgage')!;

      state = applyChaosCard(state, hikeCard, createPRNG(1));
      expect(state.chaosModifiers?.interestHikeTurns).toBe(3);

      // Applying Subsidized Mortgage cancels Interest Hike
      state = applyChaosCard(state, subsidyCard, createPRNG(2));
      expect(state.chaosModifiers?.subsidizedMortgageTurns).toBe(2);
      expect(state.chaosModifiers?.interestHikeTurns).toBe(0);
    });

    it('leaves Calamity/Legendary cards as single events (event chaining removed)', () => {
      // The aftershock chain trigger was removed: one landing draws exactly one card.
      const engine = chaosEngineModule as unknown as Record<string, unknown>;
      expect(engine.evaluateChaosEventChainTrigger).toBeUndefined();
      const calamityCard = CHAOS_CARDS.find(c => c.rarity === 'CALAMITY')!;
      const state = createAIMatch(['TYCOON', 'SHARK'], 'NORMAL');
      const after = applyChaosCard({ ...state, turnPhase: 'CHAOS_EVENT' }, calamityCard, createPRNG(1));
      expect(after.activeChaosCard?.id).toBe(calamityCard.id);
    });
  });

  describe('6. Automated Headless Match Simulations & Reproducibility', () => {
    it('reproduces identical match outcomes when run with the same seed', () => {
      const players = [
        { name: 'Tycoon', isAI: true, aiPersonality: 'TYCOON' as const, aiDifficulty: 'HARD' as const },
        { name: 'Strategist', isAI: true, aiPersonality: 'STRATEGIST' as const, aiDifficulty: 'HARD' as const },
        { name: 'Survivor', isAI: true, aiPersonality: 'SURVIVOR' as const, aiDifficulty: 'HARD' as const },
      ];

      const run1 = runHeadlessMatchSimulation({ players, seed: 777, maxRounds: 30 });
      const run2 = runHeadlessMatchSimulation({ players, seed: 777, maxRounds: 30 });

      expect(run1.winnerId).toBe(run2.winnerId);
      expect(run1.totalDecisions).toBe(run2.totalDecisions);
      expect(run1.finalNetWorths).toEqual(run2.finalNetWorths);
      expect(run1.ledgerAuditValid).toBe(true);
    });

    it('runs a multi-seed batch simulation across all 6 personalities and 3 difficulty levels with 100% ledger integrity', () => {
      const batchConfigs = [
        {
          seed: 101,
          maxRounds: 35,
          players: [
            { name: 'P1', isAI: true, aiPersonality: 'STRATEGIST' as const, aiDifficulty: 'HARD' as const },
            { name: 'P2', isAI: true, aiPersonality: 'TYCOON' as const, aiDifficulty: 'NORMAL' as const },
            { name: 'P3', isAI: true, aiPersonality: 'SURVIVOR' as const, aiDifficulty: 'EASY' as const },
            { name: 'P4', isAI: true, aiPersonality: 'SHARK' as const, aiDifficulty: 'HARD' as const },
          ],
        },
        {
          seed: 202,
          maxRounds: 35,
          players: [
            { name: 'P1', isAI: true, aiPersonality: 'DIPLOMAT' as const, aiDifficulty: 'NORMAL' as const },
            { name: 'P2', isAI: true, aiPersonality: 'CHAOTIC' as const, aiDifficulty: 'EASY' as const },
            { name: 'P3', isAI: true, aiPersonality: 'TYCOON' as const, aiDifficulty: 'HARD' as const },
          ],
        },
        {
          seed: 303,
          maxRounds: 35,
          players: [
            { name: 'P1', isAI: true, aiPersonality: 'SHARK' as const, aiDifficulty: 'HARD' as const },
            { name: 'P2', isAI: true, aiPersonality: 'SURVIVOR' as const, aiDifficulty: 'EASY' as const },
          ],
        },
      ];

      const stats = runBatchSimulations(batchConfigs);
      expect(stats.totalMatches).toBe(3);
      expect(stats.allLedgersValid).toBe(true);
      expect(stats.averagePropertiesAcquired).toBeGreaterThan(5);
      expect(stats.averageDecisions).toBeGreaterThan(40);
    });
  });
});
