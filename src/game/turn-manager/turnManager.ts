import { GameState } from '../types';
import { evaluateWinCondition } from '../win-condition/winCondition';
import { executeLedgerTransaction } from '../economy/ledgerEngine';
import { calculatePlayerNetWorth } from '../economy/economyEngine';
import { formatMoney } from '../../utils/money';
import { advanceWorldRound } from '../world-rules/worldRules';
import { movePatrolUnits, checkPatrolInterception, resolvePatrolPenalty } from '../chaos-engine/patrolEngine';
import { advanceKowloonDisasterIfNeeded } from '../maps';

/** Catch-up shield: every 5 rounds the poorest player still in the match gets a small stipend. */
export const CATCH_UP_SHIELD_ROUNDS = 5;
export const CATCH_UP_SHIELD_AMOUNT = 150;

export function getNextActivePlayerIndex(players: GameState['players'], currentIndex: number): {
  nextIndex: number;
  completedRound: boolean;
} {
  let next = (currentIndex + 1) % players.length;
  let completedRound = next <= currentIndex;
  let count = 0;

  // Search for the next player who is NOT bankrupt
  while (players[next].isBankrupt && count < players.length) {
    next = (next + 1) % players.length;
    if (next <= currentIndex) {
      completedRound = true;
    }
    count++;
  }

  return { nextIndex: next, completedRound };
}

export function advanceTurn(state: GameState): GameState {
  const maxRounds = state.config.maxRounds > 0 ? state.config.maxRounds : 0;

  // Check win condition before advancing (elimination only, round cap checked upon round completion)
  const winResult = evaluateWinCondition(
    state.players,
    state.properties,
    state.roundNumber,
    0,
    state
  );

  if (winResult.isGameOver) {
    return {
      ...state,
      status: 'ENDED',
      winner: winResult.winner,
      turnPhase: 'GAME_OVER',
    };
  }

  const { nextIndex, completedRound } = getNextActivePlayerIndex(state.players, state.activePlayerIndex);
  const nextPlayer = state.players[nextIndex];
  const newRound = completedRound ? state.roundNumber + 1 : state.roundNumber;

  // Round cap (only when configured): checked once a round completes
  if (maxRounds > 0 && completedRound && newRound > maxRounds) {
    const postRoundWin = evaluateWinCondition(
      state.players,
      state.properties,
      maxRounds,
      maxRounds,
      state
    );

    if (postRoundWin.isGameOver) {
      return {
        ...state,
        roundNumber: maxRounds,
        status: 'ENDED',
        winner: postRoundWin.winner,
        turnPhase: 'GAME_OVER',
      };
    }
  }

  // Reset consecutive doubles for next player (detentionTurns is managed exclusively on roll attempts)
  const updatedPlayer = { ...nextPlayer, consecutiveDoubles: 0 };

  const updatedPlayers = [...state.players];
  updatedPlayers[nextIndex] = updatedPlayer;

  // Decrement chaos modifiers when a round completes
  let updatedChaosModifiers = state.chaosModifiers;
  if (completedRound && state.chaosModifiers) {
    updatedChaosModifiers = {
      reverseDirectionTurns: Math.max(0, state.chaosModifiers.reverseDirectionTurns - 1),
      marketFrozenTurns: Math.max(0, state.chaosModifiers.marketFrozenTurns - 1),
      goldenHourTurns: Math.max(0, state.chaosModifiers.goldenHourTurns - 1),
      curfewTurns: Math.max(0, state.chaosModifiers.curfewTurns - 1),
      transportBoomTurns: Math.max(0, state.chaosModifiers.transportBoomTurns - 1),
      utilityBoomTurns: Math.max(0, state.chaosModifiers.utilityBoomTurns - 1),
      districtBoomTurns: Math.max(0, state.chaosModifiers.districtBoomTurns - 1),
      alienMothershipTurns: Math.max(0, state.chaosModifiers.alienMothershipTurns - 1),
      interestHikeTurns: Math.max(0, state.chaosModifiers.interestHikeTurns - 1),
      subsidizedMortgageTurns: Math.max(0, state.chaosModifiers.subsidizedMortgageTurns - 1),
    };
  }

  // Catch-up shield: keeps a trailing player in the game and the match tense.
  let shieldPlayers = updatedPlayers;
  let shieldLedger = state.ledger || [];
  const shieldLogs: GameState['logs'] = [];
  if (completedRound && newRound % CATCH_UP_SHIELD_ROUNDS === 0) {
    const solvent = updatedPlayers.filter((p) => !p.isBankrupt);
    if (solvent.length > 1) {
      const trailing = [...solvent].sort(
        (a, b) =>
          calculatePlayerNetWorth(a, state.properties, state.chaosModifiers, newRound, state) -
          calculatePlayerNetWorth(b, state.properties, state.chaosModifiers, newRound, state)
      )[0];
      const shieldRes = executeLedgerTransaction(
        shieldPlayers,
        {
          category: 'CHAOS_EFFECT',
          from: 'BANK',
          to: trailing.id,
          amount: CATCH_UP_SHIELD_AMOUNT,
          roundNumber: newRound,
          memo: 'Khiên chống dẫn đầu (trợ cấp bám đuổi)',
        },
        shieldLedger
      );
      if (shieldRes.success) {
        shieldPlayers = shieldRes.newPlayers;
        shieldLedger = shieldRes.entry ? [...shieldLedger, shieldRes.entry] : shieldLedger;
        shieldLogs.push({
          id: `shield-${Date.now()}`,
          timestamp: Date.now(),
          playerId: trailing.id,
          playerName: trailing.name,
          message: `🛡️ [KHIÊN CHỐNG DẪN ĐẦU] ${trailing.name} đang xếp cuối, nhận ${formatMoney(
            CATCH_UP_SHIELD_AMOUNT
          )} trợ cấp để bám đuổi.`,
          type: 'CHAOS',
        });
      }
    }
  }

  const world = completedRound ? advanceWorldRound(state, newRound) : null;

  // Advance patrol units if Instability or Chaos phase
  let updatedChaosMeter = state.chaosMeter;
  let patrolPlayers = shieldPlayers;
  let patrolLedger = shieldLedger;
  const patrolLogs: GameState['logs'] = [];

  if (
    updatedChaosMeter &&
    updatedChaosMeter.phase !== 'PEACEFUL' &&
    updatedChaosMeter.patrolUnits &&
    updatedChaosMeter.patrolUnits.length > 0 &&
    state.spatialGraph
  ) {
    const movedUnits = movePatrolUnits(updatedChaosMeter.patrolUnits, state.spatialGraph);
    updatedChaosMeter = {
      ...updatedChaosMeter,
      patrolUnits: movedUnits,
    };

    // Check interception against solvent players
    for (const player of patrolPlayers) {
      if (player.isBankrupt) continue;
      const interception = checkPatrolInterception(player, movedUnits);
      if (interception) {
        const dummyState: GameState = {
          ...state,
          players: patrolPlayers,
          ledger: patrolLedger,
          chaosMeter: updatedChaosMeter,
          roundNumber: newRound,
        };
        const penRes = resolvePatrolPenalty(dummyState, player.id);
        patrolPlayers = penRes.nextState.players;
        patrolLedger = penRes.nextState.ledger || patrolLedger;
        if (penRes.nextState.logs.length > dummyState.logs.length) {
          patrolLogs.push(penRes.nextState.logs[0]);
        }
      }
    }
  }

  const worldLogs = (world?.logs ?? []).map((entry, i) => ({
    id: `world-${newRound}-${i}`,
    timestamp: Date.now(),
    playerId: undefined,
    playerName: undefined,
    message: entry.message,
    type: entry.type,
  }));

  const allNewLogs = [
    ...worldLogs,
    ...(patrolLogs.length > 0 ? patrolLogs : []),
    ...(shieldLogs.length > 0 ? shieldLogs : []),
  ];

  const nextTurnState: GameState = {
    ...state,
    players: patrolPlayers,
    ledger: patrolLedger,
    ledgerHistory: patrolLedger,
    chaosMeter: updatedChaosMeter,
    activePlayerIndex: nextIndex,
    roundNumber: newRound,
    turnPhase: 'WAITING_FOR_ROLL',
    worldState: world ? world.worldState : state.worldState,
    activeChaosCard: null,
    pendingDebt: null,
    dice: [1, 1],
    isDouble: false,
    rentModifier: 1, // Reset turn rent modifier
    chaosModifiers: updatedChaosModifiers,
    logs: allNewLogs.length > 0 ? [...allNewLogs, ...state.logs] : state.logs,
  };

  if (completedRound) {
    return advanceKowloonDisasterIfNeeded(nextTurnState, newRound);
  }

  return nextTurnState;
}
