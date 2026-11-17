/**
 * src/game/chaos-engine/trapEngine.ts
 * Trap Cards & Sabotage Engine for CHAOS MONOPOLY.
 */

import { GameState, PlayerId } from '../types';
import { SpatialBoardGraph } from '../graph/spatialGraphTypes';
import { findShortestPath } from '../graph/spatialGraphEngine';
import { executeLedgerTransaction } from '../economy/ledgerEngine';

export type TrapType = 'LOCKDOWN' | 'ROBBERY' | 'TELEPORT_HAZARD' | 'SMUGGLER_BOON';

export interface PlacedTrap {
  id: string;
  nodeId: string;
  ownerPlayerId: PlayerId;
  trapType: TrapType;
  placedRound: number;
  revealed: boolean;
}

export interface TrapTriggerResult {
  nextTraps: PlacedTrap[];
  trapTriggered?: PlacedTrap;
  victimCashAfter: number;
  ownerCashAfter: number;
  turnLocked?: boolean;
  teleportedNodeId?: string;
  cashDelta: number;
}

export const MAX_ACTIVE_TRAPS_PER_PLAYER = 2;
export const MAX_PLACEMENT_GRAPH_DISTANCE = 6;
export const ROBBERY_PERCENTAGE = 0.20;
export const MAX_ROBBERY_AMOUNT = 250;
export const SMUGGLER_BOON_REWARD = 150;
export const SMUGGLER_BOON_PENALTY = 200;

/**
 * Validates whether a player can place a trap on a node.
 * Supports both standalone signature (traps array + graph) and full GameState signature.
 */
export function canPlaceTrap(
  trapsOrState: PlacedTrap[] | GameState,
  playerId: PlayerId,
  nodeId: string,
  graphParam?: SpatialBoardGraph
): boolean {
  if (Array.isArray(trapsOrState)) {
    const traps = trapsOrState;
    const graph = graphParam;

    // Max 2 active traps per player
    const playerTraps = traps.filter(t => t.ownerPlayerId === playerId && !t.revealed);
    if (playerTraps.length >= MAX_ACTIVE_TRAPS_PER_PLAYER) {
      return false;
    }

    // Node must exist and not be locked or collapsed
    if (graph && graph.nodes) {
      const node = graph.nodes[nodeId];
      if (!node || node.isLocked || node.hazardStatus === 'COLLAPSED') {
        return false;
      }
    }

    // No duplicate active trap on the same node
    const existingTrap = traps.find(t => t.nodeId === nodeId && !t.revealed);
    if (existingTrap) {
      return false;
    }

    return true;
  }

  // Full GameState validation
  const state = trapsOrState;
  const graph = state.spatialGraph;
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.isBankrupt) {
    return false;
  }

  const currentTraps = (state.placedTraps || []).filter(t => t.ownerPlayerId === playerId && !t.revealed);
  if (currentTraps.length >= MAX_ACTIVE_TRAPS_PER_PLAYER) {
    return false;
  }

  if (graph && graph.nodes) {
    const node = graph.nodes[nodeId];
    if (!node || node.isLocked || node.hazardStatus === 'COLLAPSED') {
      return false;
    }
  }

  const existingTrap = (state.placedTraps || []).find(t => t.nodeId === nodeId && !t.revealed);
  if (existingTrap) {
    return false;
  }

  // Check placement range: owned property OR within 6 steps
  if (graph && graph.nodes) {
    const isOwned = isNodeOwnedByPlayer(state, nodeId, playerId);
    if (!isOwned) {
      const playerPosNode =
        player.positionNodeId || (player.position !== undefined ? `node-${player.position}` : graph.startNodeId);
      const pathRes = findShortestPath(graph, playerPosNode, nodeId);
      if (!pathRes || pathRes.totalDistance > MAX_PLACEMENT_GRAPH_DISTANCE) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Pure evaluation function matching E2E test harness contracts.
 */
export function triggerTrapOnNode(
  traps: PlacedTrap[],
  victimPlayerId: PlayerId,
  nodeId: string,
  victimCash: number,
  ownerCash: number,
  detentionNodeId: string = 'KOW_F0_06'
): TrapTriggerResult {
  const trapIndex = traps.findIndex(t => t.nodeId === nodeId && !t.revealed);
  if (trapIndex === -1) {
    return {
      nextTraps: traps,
      victimCashAfter: victimCash,
      ownerCashAfter: ownerCash,
      cashDelta: 0,
    };
  }

  const trap = traps[trapIndex];

  // OWNER IMMUNITY: Passing over your own trap does not trigger it
  if (victimPlayerId === trap.ownerPlayerId) {
    return {
      nextTraps: traps,
      victimCashAfter: victimCash,
      ownerCashAfter: ownerCash,
      cashDelta: 0,
    };
  }

  const updatedTraps = [...traps];
  const triggeredTrap: PlacedTrap = { ...trap, revealed: true };
  updatedTraps[trapIndex] = triggeredTrap;

  let victimCashAfter = victimCash;
  let ownerCashAfter = ownerCash;
  let turnLocked = false;
  let teleportedNodeId: string | undefined;
  let cashDelta = 0;

  switch (trap.trapType) {
    case 'ROBBERY': {
      const stealAmount = Math.max(0, Math.min(Math.floor(victimCash * ROBBERY_PERCENTAGE), MAX_ROBBERY_AMOUNT));
      victimCashAfter -= stealAmount;
      ownerCashAfter += stealAmount;
      cashDelta = stealAmount;
      break;
    }
    case 'LOCKDOWN': {
      turnLocked = true;
      break;
    }
    case 'TELEPORT_HAZARD': {
      teleportedNodeId = detentionNodeId;
      break;
    }
    case 'SMUGGLER_BOON': {
      if (victimCash % 2 === 0) {
        victimCashAfter += SMUGGLER_BOON_REWARD;
      } else {
        const penalty = Math.min(victimCash, SMUGGLER_BOON_PENALTY);
        victimCashAfter -= penalty;
      }
      break;
    }
  }

  return {
    nextTraps: updatedTraps,
    trapTriggered: triggeredTrap,
    victimCashAfter,
    ownerCashAfter,
    turnLocked,
    teleportedNodeId,
    cashDelta,
  };
}

/**
 * Reducer-integrated trap trigger with strict double-entry ledger safety.
 */
export function triggerTrapAtNode(
  state: GameState,
  victimPlayerId: PlayerId,
  nodeId: string
): { nextState: GameState; trapTriggered?: PlacedTrap; haltedMovement: boolean } {
  const traps = state.placedTraps || [];
  const trapIndex = traps.findIndex(t => t.nodeId === nodeId && !t.revealed);
  if (trapIndex === -1) {
    return { nextState: state, haltedMovement: false };
  }

  const trap = traps[trapIndex];

  // OWNER IMMUNITY: Stepping on own trap NEVER triggers it
  if (victimPlayerId === trap.ownerPlayerId) {
    return { nextState: state, haltedMovement: false };
  }

  const victim = state.players.find(p => p.id === victimPlayerId);
  const owner = state.players.find(p => p.id === trap.ownerPlayerId);
  if (!victim || !owner) {
    return { nextState: state, haltedMovement: false };
  }

  const updatedTraps = [...traps];
  const triggeredTrap: PlacedTrap = { ...trap, revealed: true };
  updatedTraps[trapIndex] = triggeredTrap;

  let currentPlayers = state.players;
  let currentLedger = state.ledger || [];
  let haltedMovement = false;
  const newLogs = [...state.logs];

  switch (trap.trapType) {
    case 'ROBBERY': {
      const victimLiquid = Math.max(0, victim.cash);
      const stealAmount = Math.min(Math.floor(victimLiquid * ROBBERY_PERCENTAGE), MAX_ROBBERY_AMOUNT);
      if (stealAmount > 0) {
        const txRes = executeLedgerTransaction(
          currentPlayers,
          {
            category: 'CHAOS_EFFECT',
            from: victim.id,
            to: owner.id,
            amount: stealAmount,
            roundNumber: state.roundNumber,
            memo: `Bị cướp bởi bẫy Robbery ($${stealAmount}M)`,
          },
          currentLedger
        );
        if (txRes.success && txRes.entry) {
          currentPlayers = txRes.newPlayers;
          currentLedger = [...currentLedger, txRes.entry];
        }
      }
      newLogs.unshift({
        id: `trap-rob-${Date.now()}`,
        timestamp: Date.now(),
        playerId: victim.id,
        playerName: victim.name,
        message: `💣 [BẪY CƯỚP TIỀN] ${victim.name} đạp trúng bẫy của ${owner.name}! Bị cướp $${stealAmount}M!`,
        type: 'CHAOS',
      });
      break;
    }

    case 'LOCKDOWN': {
      haltedMovement = true;
      currentPlayers = currentPlayers.map(p =>
        p.id === victim.id ? { ...p, turnLockTurns: 1 } : p
      );
      newLogs.unshift({
        id: `trap-lock-${Date.now()}`,
        timestamp: Date.now(),
        playerId: victim.id,
        playerName: victim.name,
        message: `⛓️ [BẪY LOCKDOWN] ${victim.name} đạp trúng bẫy Lockdown! Dừng bước ngay lập tức và mất 1 lượt tiếp theo!`,
        type: 'CHAOS',
      });
      break;
    }

    case 'TELEPORT_HAZARD': {
      haltedMovement = true;
      const opponentLandmarkTile = findOpponentLandmarkTile(state, victim.id);

      if (opponentLandmarkTile !== null) {
        const destNodeId = `node-${opponentLandmarkTile}`;
        currentPlayers = currentPlayers.map(p =>
          p.id === victim.id ? { ...p, position: opponentLandmarkTile, positionNodeId: destNodeId } : p
        );
        newLogs.unshift({
          id: `trap-tele-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `🌀 [BẪY DỊCH CHUYỂN] ${victim.name} bị dịch chuyển tới Landmark đối thủ (Ô ${opponentLandmarkTile})!`,
          type: 'CHAOS',
        });
      } else {
        const detentionNode = state.spatialGraph?.detentionNodeId || 'node-10';
        currentPlayers = currentPlayers.map(p =>
          p.id === victim.id
            ? { ...p, position: 10, positionNodeId: detentionNode, inDetention: true, detentionTurns: 2, consecutiveDoubles: 0 }
            : p
        );
        newLogs.unshift({
          id: `trap-tele-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `🌀 [BẪY DỊCH CHUYỂN] ${victim.name} bị dịch chuyển thẳng vào Trại Giam!`,
          type: 'CHAOS',
        });
      }
      break;
    }

    case 'SMUGGLER_BOON': {
      const isReward = victim.cash % 2 === 0;
      if (isReward) {
        const txRes = executeLedgerTransaction(
          currentPlayers,
          {
            category: 'CHAOS_EFFECT',
            from: 'BANK',
            to: victim.id,
            amount: SMUGGLER_BOON_REWARD,
            roundNumber: state.roundNumber,
            memo: `Thưởng Rương Buôn Lậu (+$${SMUGGLER_BOON_REWARD}M)`,
          },
          currentLedger
        );
        if (txRes.success && txRes.entry) {
          currentPlayers = txRes.newPlayers;
          currentLedger = [...currentLedger, txRes.entry];
        }
        newLogs.unshift({
          id: `trap-smug-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `🎁 [RƯƠNG BUÔN LẬU] ${victim.name} mở trúng Rương Buôn Lậu! Nhận được +$${SMUGGLER_BOON_REWARD}M!`,
          type: 'CHAOS',
        });
      } else {
        const penalty = Math.min(victim.cash, SMUGGLER_BOON_PENALTY);
        const txRes = executeLedgerTransaction(
          currentPlayers,
          {
            category: 'CHAOS_EFFECT',
            from: victim.id,
            to: 'BANK',
            amount: penalty,
            allowPartial: true,
            roundNumber: state.roundNumber,
            memo: `Phạt Rương Buôn Lậu phát nổ (-$${penalty}M)`,
          },
          currentLedger
        );
        if (txRes.success && txRes.entry) {
          currentPlayers = txRes.newPlayers;
          currentLedger = [...currentLedger, txRes.entry];
        }
        newLogs.unshift({
          id: `trap-smug-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `💥 [RƯƠNG BUÔN LẬU] Rương Buôn Lậu phát nổ! ${victim.name} bị phạt -$${penalty}M!`,
          type: 'CHAOS',
        });
      }
      break;
    }
  }

  return {
    nextState: {
      ...state,
      placedTraps: updatedTraps,
      players: currentPlayers,
      ledger: currentLedger,
      ledgerHistory: currentLedger,
      logs: newLogs,
    },
    trapTriggered: triggeredTrap,
    haltedMovement,
  };
}

function isNodeOwnedByPlayer(state: GameState, nodeId: string, playerId: PlayerId): boolean {
  const numericStr = nodeId.replace(/^(node-|tile-)/, '');
  const numericId = parseInt(numericStr, 10);
  if (!isNaN(numericId) && state.properties[numericId]?.ownerId === playerId) {
    return true;
  }
  const graph = state.spatialGraph;
  if (graph && graph.nodes && graph.nodes[nodeId]?.numericId !== undefined) {
    const nid = graph.nodes[nodeId].numericId!;
    return state.properties[nid]?.ownerId === playerId;
  }
  return false;
}

function findOpponentLandmarkTile(state: GameState, victimPlayerId: PlayerId): number | null {
  for (const [tileIdStr, prop] of Object.entries(state.properties)) {
    if (prop.ownerId && prop.ownerId !== victimPlayerId && prop.level === 5) {
      return parseInt(tileIdStr, 10);
    }
  }
  return null;
}
