/**
 * tests/e2e/helpers/e2eTestHarness.ts
 *
 * Contract-compliant reference implementations, fixtures, double-entry ledger audits,
 * seeded PRNG, map schemas, and headless match simulation runner for CHAOS MONOPOLY E2E tests.
 * Adheres strictly to PROJECT.md § Interface Contracts.
 */

import { PlayerId, TileType, PropertyData } from '../../../src/game/types';

// ============================================================================
// 1. SEEDED DETERMINISTIC PRNG (Mulberry32)
// ============================================================================

export class Mulberry32 {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = (seed >>> 0) || 1337;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    if (min > max) [min, max] = [max, min];
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  rollDice(): [number, number] {
    return [this.nextInt(1, 6), this.nextInt(1, 6)];
  }

  pickOne<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from empty array');
    return items[Math.floor(this.next() * items.length)];
  }

  shuffle<T>(array: readonly T[] | T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// ============================================================================
// 2. DOUBLE-ENTRY FINANCIAL LEDGER & EQUILIBRIUM AUDIT
// ============================================================================

export interface LedgerAuditParty {
  id: string;
  cash: number;
  isBankrupt?: boolean;
}

export interface LedgerAuditTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  category: string;
  timestamp: number;
}

export interface LedgerEquilibriumResult {
  isBalanced: boolean;
  systemTotalCash: number;
  expectedTotalCash: number;
  delta: number;
  playerCashSum: number;
  bankCashReserve: number;
}

export function verifyLedgerEquilibrium(
  players: LedgerAuditParty[],
  bankReserve: number = 100000,
  expectedTotal: number = 100000 + players.reduce((s, p) => s + p.cash, 0)
): LedgerEquilibriumResult {
  const playerCashSum = players.reduce((sum, p) => sum + (p.cash >= 0 ? p.cash : 0), 0);
  const systemTotalCash = playerCashSum + bankReserve;
  const delta = systemTotalCash - expectedTotal;

  return {
    isBalanced: Math.abs(delta) < 0.0001,
    systemTotalCash,
    expectedTotalCash: expectedTotal,
    delta,
    playerCashSum,
    bankCashReserve: bankReserve,
  };
}

export function executeDeterministicTransfer(
  source: LedgerAuditParty,
  target: LedgerAuditParty,
  requestedAmount: number
): { actualAmount: number; sourceAfter: number; targetAfter: number; ledgerBalanced: boolean } {
  const actualAmount = Math.max(0, Math.min(requestedAmount, source.cash));
  source.cash -= actualAmount;
  target.cash += actualAmount;
  return {
    actualAmount,
    sourceAfter: source.cash,
    targetAfter: target.cash,
    ledgerBalanced: true, // source.cash delta + target.cash delta === 0
  };
}

// ============================================================================
// 3. 3D SPATIAL GRAPH TOPOLOGY & TRAVERSAL ENGINE
// ============================================================================

import {
  getValidNextNodes,
  stepTraverse,
  findShortestPath,
  getReachableNodes,
  hasBranchIntersections,
} from '../../../src/game/graph/spatialGraphEngine';
export {
  getValidNextNodes,
  stepTraverse,
  findShortestPath,
  getReachableNodes,
  hasBranchIntersections,
};
export type {
  Position3D,
  EdgeType,
  GraphEdge,
  BoardNode,
  SpatialBoardGraph,
} from '../../../src/game/graph/spatialGraphTypes';

// ============================================================================
// 4. URBAN FOG OF WAR ENGINE
// ============================================================================

import {
  evaluateZoneUnlocks,
  createInitialFogOfWarState,
  checkUnlockTriggers,
  unlockZone,
} from '../../../src/game/graph/urbanFogOfWarEngine';
export {
  evaluateZoneUnlocks,
  createInitialFogOfWarState,
  checkUnlockTriggers,
  unlockZone,
};
export type { FogOfWarState } from '../../../src/game/graph/urbanFogOfWarEngine';

// ============================================================================
// 5. LEGACY RING GRAPH ADAPTER (40-TILE MONOPOLY COMPATIBILITY)
// ============================================================================

export function createLegacyRingGraph(boardSize: number = 40): SpatialBoardGraph {
  const nodes: Record<string, BoardNode> = {};
  const edges: Record<string, GraphEdge> = {};

  for (let i = 0; i < boardSize; i++) {
    const id = `NODE_${i}`;
    const nextId = `NODE_${(i + 1) % boardSize}`;

    // 11x11 perimeter grid layout mapped to 3D
    let x = 0;
    let z = 0;
    if (i <= 10) {
      x = i;
      z = 0;
    } else if (i <= 20) {
      x = 10;
      z = i - 10;
    } else if (i <= 30) {
      x = 10 - (i - 20);
      z = 10;
    } else {
      x = 0;
      z = 10 - (i - 30);
    }

    nodes[id] = {
      id,
      numericId: i,
      name: i === 0 ? 'START' : i === 10 ? 'DETENTION' : `Tile ${i}`,
      shortName: `T${i}`,
      type: i === 0 ? 'START' : i === 10 ? 'DETENTION' : 'PROPERTY',
      zoneId: 'ZONE_LEGACY_RING',
      floor: 0,
      position3D: { x, y: 0.0, z },
      connectedNodeIds: [nextId],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
      hazardStatus: 'NONE',
    };

    edges[`EDGE_${id}_${nextId}`] = {
      id: `EDGE_${id}_${nextId}`,
      fromNodeId: id,
      toNodeId: nextId,
      type: 'MAIN_LOOP',
      bidirectional: false,
    };
  }

  return {
    mapId: 'classic-ring-40',
    mapName: 'Classic Monopoly 40 Ring',
    nodes,
    edges,
    startNodeId: 'NODE_0',
    detentionNodeId: 'NODE_10',
    floors: [{ floorIndex: 0, name: 'Ground Floor', elevationY: 0.0, nodeIds: Object.keys(nodes) }],
  };
}

// ============================================================================
// 6. CONTINUOUS CHAOS METER & CENTRALIZED EVENT BUS
// ============================================================================

import {
  createInitialChaosMeter,
  applyChaosDelta,
  getChaosPhaseRentMultiplier,
  CHAOS_DELTAS,
} from '../../../src/game/chaos-engine/chaosMeter';
export {
  createInitialChaosMeter,
  applyChaosDelta,
  getChaosPhaseRentMultiplier,
  CHAOS_DELTAS,
};
export type {
  ChaosPhase,
  ChaosMeterState,
  PatrolUnit,
} from '../../../src/game/chaos-engine/chaosMeter';

import {
  ChaosEventBus,
  processGameEvent,
  computeDeltaForEvent,
} from '../../../src/game/chaos-engine/chaosEventBus';
export {
  ChaosEventBus,
  processGameEvent,
  computeDeltaForEvent,
};
export type {
  GameEvent,
  GameEventType,
} from '../../../src/game/chaos-engine/chaosEventBus';

// ============================================================================
// 7. TRAP CARDS & SABOTAGE ENGINE
// ============================================================================

import {
  canPlaceTrap,
  triggerTrapOnNode,
  triggerTrapAtNode,
  MAX_ACTIVE_TRAPS_PER_PLAYER,
  MAX_PLACEMENT_GRAPH_DISTANCE,
  ROBBERY_PERCENTAGE,
  MAX_ROBBERY_AMOUNT,
  SMUGGLER_BOON_REWARD,
  SMUGGLER_BOON_PENALTY,
} from '../../../src/game/chaos-engine/trapEngine';
export {
  canPlaceTrap,
  triggerTrapOnNode,
  triggerTrapAtNode,
  MAX_ACTIVE_TRAPS_PER_PLAYER,
  MAX_PLACEMENT_GRAPH_DISTANCE,
  ROBBERY_PERCENTAGE,
  MAX_ROBBERY_AMOUNT,
  SMUGGLER_BOON_REWARD,
  SMUGGLER_BOON_PENALTY,
};
export type {
  PlacedTrap,
  TrapType,
  TrapTriggerResult,
} from '../../../src/game/chaos-engine/trapEngine';

// ============================================================================
// 8. MULTI-TIER BUSINESS CATALOG & ADJACENCY SYNERGY MATRIX
// ============================================================================

import {
  BUSINESS_CATALOG,
  getBusinessById,
  isValidBusinessId,
  getBusinessesByCategory,
} from '../../../src/game/business/businessCatalog';
export {
  BUSINESS_CATALOG,
  getBusinessById,
  isValidBusinessId,
  getBusinessesByCategory,
};
export type {
  BusinessCategory,
  BusinessArchetypeId,
  BusinessDefinition,
  BusinessSynergyResult,
  CurrentBusiness,
  BusinessRentOptions,
} from '../../../src/game/business/businessTypes';

import {
  getAdjacentNodeIds,
  calculateSynergyModifier,
  calculateBusinessRent,
  calculateDynamicBusinessRent,
} from '../../../src/game/business/businessSynergyEngine';
export {
  getAdjacentNodeIds,
  calculateSynergyModifier,
  calculateBusinessRent,
  calculateDynamicBusinessRent,
};

// ============================================================================
// 9. KOWLOON WALLED CITY REFERENCE MAP (MAP 1)
// ============================================================================

import {
  COFFIN_HOME_UPGRADES,
  createKowloonWalledCityGraph,
  applyKowloonFireClearance,
  calculateKowloonDensityRent,
  getKowloonFloorDensityMultiplier,
} from '../../../src/game/maps/kowloonWalledCity';
export {
  COFFIN_HOME_UPGRADES,
  createKowloonWalledCityGraph,
  applyKowloonFireClearance,
  calculateKowloonDensityRent,
  getKowloonFloorDensityMultiplier,
};
export type {
  CoffinUpgradeTier,
  MapSchemaDefinition,
  MapDisasterDefinition,
  KowloonFireClearanceResult,
} from '../../../src/game/maps/mapTypes';

// ============================================================================
// 10. MAPS 2-5 DATA SCHEMAS & CONFIGURATIONS
// ============================================================================

import {
  MAP_SCHEMAS,
  validateMapSchema,
  buildGraphFromSchema,
  getSpatialGraphForMapId,
} from '../../../src/game/maps/mapRegistry';
export {
  MAP_SCHEMAS,
  validateMapSchema,
  buildGraphFromSchema,
  getSpatialGraphForMapId,
};

// ============================================================================
// 11. AI DECISION MAKING HEURISTIC ENGINE
// ============================================================================

import {
  evaluateAIBranchChoice,
  evaluateAIChokePointTrap,
  evaluateAIAdaptiveBusiness,
} from '../../../src/game/ai/aiDecisionEngine';
export {
  evaluateAIBranchChoice,
  evaluateAIChokePointTrap,
  evaluateAIAdaptiveBusiness,
};

// ============================================================================
// 12. MULTIPLAYER PROTOCOL & STATE SANITIZATION
// ============================================================================

import {
  sanitizeStateForClient as serverSanitizeStateForClient,
  validateClientIntent,
} from '../../../src/server/roomManager';
export { validateClientIntent };

export interface SanitizedGameState {
  players: any[];
  placedTraps?: {
    id: string;
    nodeId: string;
    ownerPlayerId?: string;
    trapType: string;
    revealed: boolean;
  }[];
  config: { seed?: number; [key: string]: any };
  [key: string]: any;
}

export function sanitizeStateForClient(state: any, viewingPlayerId: string): SanitizedGameState {
  return serverSanitizeStateForClient(state, viewingPlayerId) as unknown as SanitizedGameState;
}

// ============================================================================
// 13. HEADLESS MATCH SIMULATION RUNNER
// ============================================================================

export interface E2EMatchSimulationOptions {
  seed?: number;
  maxRounds?: number;
  startingCash?: number;
  mapGraph?: SpatialBoardGraph;
}

export interface E2EMatchSimulationResult {
  roundsPlayed: number;
  finalPlayers: LedgerAuditParty[];
  winner: LedgerAuditParty;
  ledgerBalanced: boolean;
  totalTransactions: number;
  chaosHistory: number[];
  fireClearedFloors: number[];
}

export function runHeadlessE2EMatch(options: E2EMatchSimulationOptions = {}): E2EMatchSimulationResult {
  const seed = options.seed ?? 1001;
  const prng = new Mulberry32(seed);
  const maxRounds = options.maxRounds ?? 40;
  const startingCash = options.startingCash ?? 1500;
  const graph = options.mapGraph ?? createKowloonWalledCityGraph();

  let bankReserve = 100000;
  const players: (LedgerAuditParty & {
    id: string;
    currentNodeId: string;
    floor: number;
    properties: string[];
    isBankrupt: boolean;
  })[] = [
    { id: 'player_1', cash: startingCash, currentNodeId: graph.startNodeId, floor: 0, properties: [], isBankrupt: false },
    { id: 'player_2', cash: startingCash, currentNodeId: graph.startNodeId, floor: 0, properties: [], isBankrupt: false },
    { id: 'player_3', cash: startingCash, currentNodeId: graph.startNodeId, floor: 0, properties: [], isBankrupt: false },
    { id: 'player_4', cash: startingCash, currentNodeId: graph.startNodeId, floor: 0, properties: [], isBankrupt: false },
  ];

  let chaosMeter = createInitialChaosMeter();
  const chaosHistory: number[] = [0.0];
  const fireClearedFloors: number[] = [];
  const traps: PlacedTrap[] = [];
  let totalTransactions = 0;

  for (let round = 1; round <= maxRounds; round++) {
    // Check upward fire disaster triggers
    if (round === 18 && !fireClearedFloors.includes(0)) {
      fireClearedFloors.push(0);
      applyKowloonFireClearance(graph, 0);
      // Evacuate players on Floor 0 to Floor 1
      for (const p of players) {
        if (!p.isBankrupt && p.floor === 0) {
          p.floor = 1;
          p.currentNodeId = 'KOW_F1_00';
          const penalty = Math.min(p.cash, 100);
          p.cash -= penalty;
          bankReserve += penalty;
          totalTransactions++;
        }
      }
    } else if (round === 21 && !fireClearedFloors.includes(1)) {
      fireClearedFloors.push(1);
      applyKowloonFireClearance(graph, 1);
      for (const p of players) {
        if (!p.isBankrupt && p.floor <= 1) {
          p.floor = 2;
          p.currentNodeId = 'KOW_F2_00';
        }
      }
    } else if (round === 24 && !fireClearedFloors.includes(2)) {
      fireClearedFloors.push(2);
      applyKowloonFireClearance(graph, 2);
      for (const p of players) {
        if (!p.isBankrupt && p.floor <= 2) {
          p.floor = 3;
          p.currentNodeId = 'KOW_F3_00';
        }
      }
    }

    for (const player of players) {
      if (player.isBankrupt) continue;

      const dice = prng.rollDice();
      const steps = dice[0] + dice[1];

      // Bump chaos meter from dice roll
      const deltaResult = applyChaosDelta(chaosMeter, 0.4);
      chaosMeter = deltaResult.nextMeter;
      chaosHistory.push(chaosMeter.value);

      // Traverse steps
      let currentNodeId = player.currentNodeId;
      for (let s = 0; s < steps; s++) {
        const nextNodes = getValidNextNodes(graph, currentNodeId, player.cash);
        if (nextNodes.length === 0) break;

        // Choose next node: AI branch choice if intersection
        if (nextNodes.length > 1) {
          const opponentRentMap: Record<string, number> = {};
          const trapMap: Record<string, boolean> = {};
          for (const cand of nextNodes) {
            opponentRentMap[cand.id] = cand.property?.baseRent ?? 0;
            trapMap[cand.id] = traps.some(t => t.nodeId === cand.id && !t.revealed);
          }
          const { chosenNodeId } = evaluateAIBranchChoice({
            branches: nextNodes,
            playerCash: player.cash,
            opponentProperties: opponentRentMap,
            trapsOnNodes: trapMap,
            riskTolerance: 0.5,
          });
          currentNodeId = chosenNodeId;
        } else {
          currentNodeId = nextNodes[0].id;
        }
      }

      player.currentNodeId = currentNodeId;
      const targetNode = graph.nodes[currentNodeId];
      if (targetNode) player.floor = targetNode.floor;

      // Check traps on landing
      const activeTrap = traps.find(t => t.nodeId === currentNodeId && !t.revealed);
      if (activeTrap && activeTrap.ownerPlayerId !== player.id) {
        const owner = players.find(p => p.id === activeTrap.ownerPlayerId);
        if (owner) {
          const triggerResult = triggerTrapOnNode(
            traps,
            player.id,
            currentNodeId,
            player.cash,
            owner.cash,
            graph.detentionNodeId
          );
          player.cash = triggerResult.victimCashAfter;
          owner.cash = triggerResult.ownerCashAfter;
          totalTransactions++;
        }
      }

      // Check property purchase / rent
      if (targetNode && targetNode.type === 'PROPERTY' && targetNode.hazardStatus !== 'FIRE') {
        const owner = players.find(p => p.properties.includes(currentNodeId));
        if (!owner && player.cash >= 150) {
          // Buy property
          player.cash -= 100;
          bankReserve += 100;
          player.properties.push(currentNodeId);
          totalTransactions++;
        } else if (owner && owner.id !== player.id) {
          // Pay rent with floor density scaling
          const playersOnFloor = players.filter(p => !p.isBankrupt && p.floor === player.floor).length;
          const rent = calculateBusinessRent(graph, currentNodeId, {
            floorPlayers: playersOnFloor,
            chaosPhase: chaosMeter.phase,
          });
          const rentPaid = Math.min(player.cash, rent);
          player.cash -= rentPaid;
          owner.cash += rentPaid;
          totalTransactions++;

          if (player.cash === 0) {
            player.isBankrupt = true;
          }
        }
      }

      // Occasional trap placement
      if (prng.next() < 0.15 && canPlaceTrap(traps, player.id, currentNodeId, graph)) {
        traps.push({
          id: `TRAP_${round}_${player.id}`,
          nodeId: currentNodeId,
          ownerPlayerId: player.id,
          trapType: 'ROBBERY',
          placedRound: round,
          revealed: false,
        });
      }
    }
  }

  // Determine winner
  const activePlayers = players.filter(p => !p.isBankrupt);
  const winner = activePlayers.sort((a, b) => b.cash - a.cash)[0] || players[0];

  const equilibrium = verifyLedgerEquilibrium(players, bankReserve, 100000 + players.length * startingCash);

  return {
    roundsPlayed: maxRounds,
    finalPlayers: players,
    winner,
    ledgerBalanced: equilibrium.isBalanced,
    totalTransactions,
    chaosHistory,
    fireClearedFloors,
  };
}
