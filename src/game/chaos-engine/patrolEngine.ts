/**
 * src/game/chaos-engine/patrolEngine.ts
 * Patrolling Police / Guard Units Engine for CHAOS MONOPOLY.
 */

import { GameState, PlayerId, PlayerState } from '../types';
import { SpatialBoardGraph, BoardNode } from '../graph/spatialGraphTypes';
import { findShortestPath, getValidNextNodes } from '../graph/spatialGraphEngine';
import { executeLedgerTransaction } from '../economy/ledgerEngine';
import type { PatrolUnit } from './chaosMeter';

export type { PatrolUnit };

export const PATROL_FINE_AMOUNT = 100;

export function createPatrolUnit(
  id: string = 'PATROL_01',
  startNodeId: string = 'KOW_F1_04',
  destinationNodeId: string = 'KOW_F1_08'
): PatrolUnit {
  return {
    id,
    currentNodeId: startNodeId,
    destinationNodeId,
    targetNodeId: destinationNodeId,
    direction: 'FORWARD',
  };
}

/**
 * Moves each patrol unit one step along the spatial graph edges.
 * Avoids locked, fire, or collapsed nodes.
 */
export function movePatrolUnits(
  patrolUnits: PatrolUnit[],
  graph: SpatialBoardGraph
): PatrolUnit[] {
  if (!patrolUnits || patrolUnits.length === 0 || !graph || !graph.nodes) {
    return patrolUnits || [];
  }

  return patrolUnits.map(unit => {
    const currentNode = graph.nodes[unit.currentNodeId];
    if (!currentNode) {
      return unit;
    }

    let destId = unit.destinationNodeId || unit.targetNodeId;

    // If destination reached or not set, determine next waypoint
    if (!destId || unit.currentNodeId === destId) {
      // Toggle or pick alternate waypoint
      if (unit.currentNodeId === 'KOW_F1_08') {
        destId = 'KOW_F1_04';
      } else if (unit.currentNodeId === 'KOW_F1_04') {
        destId = 'KOW_F1_08';
      } else if (unit.currentNodeId === 'node-20') {
        destId = 'node-10';
      } else if (unit.currentNodeId === 'node-10') {
        destId = 'node-20';
      } else {
        // Fallback: pick any valid connected neighbor
        const validNeighbors = getValidNextNodes(graph, unit.currentNodeId).filter(
          n => !n.isLocked && n.hazardStatus !== 'COLLAPSED' && n.hazardStatus !== 'FIRE'
        );
        if (validNeighbors.length > 0) {
          destId = validNeighbors[0].id;
        }
      }
    }

    let nextNodeId = unit.currentNodeId;

    // Use shortest path to traverse toward destination
    if (destId && destId !== unit.currentNodeId) {
      const pathRes = findShortestPath(graph, unit.currentNodeId, destId);
      if (pathRes && pathRes.path && pathRes.path.length > 1) {
        const candidateId = pathRes.path[1];
        const candidateNode = graph.nodes[candidateId];
        if (
          candidateNode &&
          !candidateNode.isLocked &&
          candidateNode.hazardStatus !== 'COLLAPSED' &&
          candidateNode.hazardStatus !== 'FIRE'
        ) {
          nextNodeId = candidateId;
        }
      }
    }

    // Fallback if shortest path is blocked: pick any valid neighbor
    if (nextNodeId === unit.currentNodeId) {
      const candidates: BoardNode[] = getValidNextNodes(graph, unit.currentNodeId).filter(
        n => !n.isLocked && n.hazardStatus !== 'COLLAPSED' && n.hazardStatus !== 'FIRE'
      );
      if (candidates.length > 0) {
        nextNodeId = candidates[0].id;
      }
    }

    return {
      ...unit,
      currentNodeId: nextNodeId,
      destinationNodeId: destId,
      targetNodeId: destId,
    };
  });
}

/**
 * Checks if a player occupies the same node as any patrol unit.
 */
export function checkPatrolInterception(
  player: PlayerState,
  patrolUnits: PatrolUnit[]
): PatrolUnit | undefined {
  if (!player || player.isBankrupt || !patrolUnits || patrolUnits.length === 0) {
    return undefined;
  }

  const playerNodeId = player.positionNodeId || (player.position !== undefined ? `node-${player.position}` : undefined);
  if (!playerNodeId) return undefined;

  return patrolUnits.find(unit => unit.currentNodeId === playerNodeId);
}

/**
 * Resolves penalty when a player is intercepted by a patrol unit:
 * - If victim cash >= $100 and phase !== 'CHAOS': Fined $100M paid to BANK via double-entry ledger.
 * - Otherwise: Sent to detention for 2 turns.
 */
export function resolvePatrolPenalty(
  state: GameState,
  victimPlayerId: PlayerId
): { nextState: GameState; penaltyType: 'FINE' | 'DETENTION'; amountPaid: number } {
  const victim = state.players.find(p => p.id === victimPlayerId);
  if (!victim || victim.isBankrupt) {
    return { nextState: state, penaltyType: 'FINE', amountPaid: 0 };
  }

  const isChaos = state.chaosMeter?.phase === 'CHAOS';
  const canAffordFine = victim.cash >= PATROL_FINE_AMOUNT;

  if (canAffordFine && !isChaos) {
    // Fine $100M via double-entry ledger to BANK
    const currentLedger = state.ledger || [];
    const txResult = executeLedgerTransaction(
      state.players,
      {
        category: 'TAX_PAYMENT',
        from: victim.id,
        to: 'BANK',
        amount: PATROL_FINE_AMOUNT,
        roundNumber: state.roundNumber,
        memo: `Cảnh sát tuần tra xử phạt vi phạm an ninh ($${PATROL_FINE_AMOUNT}M)`,
      },
      currentLedger
    );

    const updatedPlayers = txResult.success ? txResult.newPlayers : state.players;
    const updatedLedger = txResult.entry ? [...currentLedger, txResult.entry] : currentLedger;

    const logEntry = {
      id: `patrol-fine-${Date.now()}`,
      timestamp: Date.now(),
      playerId: victim.id,
      playerName: victim.name,
      message: `🚨 [CẢNH SÁT TUẦN TRA] ${victim.name} bị cảnh sát chặn bắt và xử phạt $${PATROL_FINE_AMOUNT}M!`,
      type: 'WARNING' as const,
    };

    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        logs: [logEntry, ...state.logs],
        lastSoundEffect: 'chaosWarning',
      },
      penaltyType: 'FINE',
      amountPaid: PATROL_FINE_AMOUNT,
    };
  } else {
    // Insolvent or CHAOS phase -> Detention
    const detentionNodeId = state.spatialGraph?.detentionNodeId || 'node-10';
    const updatedPlayers = state.players.map(p => {
      if (p.id === victim.id) {
        return {
          ...p,
          position: 10,
          positionNodeId: detentionNodeId,
          inDetention: true,
          detentionTurns: 2,
          consecutiveDoubles: 0,
        };
      }
      return p;
    });

    const logEntry = {
      id: `patrol-jail-${Date.now()}`,
      timestamp: Date.now(),
      playerId: victim.id,
      playerName: victim.name,
      message: `🚨 [CẢNH SÁT TUẦN TRA] ${victim.name} không thể nộp phạt hoặc vi phạm trong vùng Hỗn Loạn! Bị giải thẳng vào Trại Giam (2 lượt)!`,
      type: 'WARNING' as const,
    };

    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        logs: [logEntry, ...state.logs],
        lastSoundEffect: 'chaosWarning',
      },
      penaltyType: 'DETENTION',
      amountPaid: 0,
    };
  }
}
