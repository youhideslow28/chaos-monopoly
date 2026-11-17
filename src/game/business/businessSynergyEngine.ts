/**
 * src/game/business/businessSynergyEngine.ts
 * Adjacency Synergy Graph and Dynamic Multi-tier Rent Calculation Engine.
 */

import { SpatialBoardGraph } from '../graph/spatialGraphTypes';
import { GameState } from '../types';
import { BUSINESS_CATALOG } from './businessCatalog';
import { BusinessRentOptions, BusinessSynergyResult } from './businessTypes';

/**
 * Resolves all directly adjacent neighbor node IDs across graph edges,
 * bidirectional links, and connectedNodeIds.
 */
export function getAdjacentNodeIds(graph: SpatialBoardGraph, nodeId: string): string[] {
  const node = graph.nodes[nodeId];
  if (!node) return [];

  const neighborIds = new Set<string>();

  // 1. Direct forward/branch connections in connectedNodeIds
  if (Array.isArray(node.connectedNodeIds)) {
    for (const cid of node.connectedNodeIds) {
      if (cid && cid !== nodeId && graph.nodes[cid]) {
        neighborIds.add(cid);
      }
    }
  }

  // 2. Traversal edges in graph.edges (both directions represent spatial adjacency)
  if (graph.edges) {
    for (const edge of Object.values(graph.edges)) {
      if (edge.fromNodeId === nodeId && edge.toNodeId !== nodeId && graph.nodes[edge.toNodeId]) {
        neighborIds.add(edge.toNodeId);
      }
      if (edge.toNodeId === nodeId && edge.fromNodeId !== nodeId && graph.nodes[edge.fromNodeId]) {
        neighborIds.add(edge.fromNodeId);
      }
    }
  }

  // 3. Fallback for legacy 40-tile perimeter ring if connectedNodeIds is empty
  if (neighborIds.size === 0 && node.numericId !== undefined) {
    const prevTileId = (node.numericId - 1 + 40) % 40;
    const nextTileId = (node.numericId + 1) % 40;
    const prevNodeId = `node-${prevTileId}`;
    const nextNodeId = `node-${nextTileId}`;
    if (graph.nodes[prevNodeId]) neighborIds.add(prevNodeId);
    if (graph.nodes[nextNodeId]) neighborIds.add(nextNodeId);
  }

  return Array.from(neighborIds);
}

/**
 * Calculates compounding synergy modifiers and negative counters between
 * a target business archetype and its adjacent business neighbors.
 */
export function calculateSynergyModifier(
  targetBusinessId: string,
  adjacentBusinessIds: string[]
): BusinessSynergyResult {
  let multiplier = 1.0;
  let isSuppressed = false;
  const modifierSummary: string[] = [];

  for (const adjId of adjacentBusinessIds) {
    // 1. Complete Suppression: Police Checkpoint shuts down Underground Casino completely ($0)
    if (adjId === 'police_checkpoint' && targetBusinessId === 'underground_casino') {
      isSuppressed = true;
      multiplier = 0.0;
      modifierSummary.push('Police Checkpoint completely shuts down Casino ($0 rent)');
      return {
        multiplier: 0.0,
        isSuppressed: true,
        disabled: true,
        modifierSummary,
      };
    }

    // 2. Negative Counter: Police Checkpoint penalizes Pawn Shop by -50%
    if (adjId === 'police_checkpoint' && targetBusinessId === 'pawn_shop') {
      multiplier *= 0.5;
      modifierSummary.push('Police Checkpoint suppresses Pawn Shop (-50%)');
    }

    // 3. Negative Counter: Coffin Home penalizes Luxury Boutique by -40%
    if (adjId === 'coffin_home_units' && targetBusinessId === 'luxury_boutique') {
      multiplier *= 0.6;
      modifierSummary.push('Coffin Home reduces Luxury Boutique foot traffic (-40%)');
    }

    // 4. Positive Mutual Synergy: Bar + Pawn Shop (+25% to both)
    if (
      (targetBusinessId === 'underground_bar' && adjId === 'pawn_shop') ||
      (targetBusinessId === 'pawn_shop' && adjId === 'underground_bar')
    ) {
      multiplier *= 1.25;
      modifierSummary.push('Bar & Pawn Shop mutual synergy (+25%)');
    }

    // 5. Positive Synergy: Bar boosts adjacent Casino (+30%)
    if (targetBusinessId === 'underground_casino' && adjId === 'underground_bar') {
      multiplier *= 1.3;
      modifierSummary.push('Bar boosts adjacent Casino patrons (+30%)');
    }

    // 6. Positive Synergy: Food Stall + Coffin Home (+15% per adjacent Coffin Home)
    if (targetBusinessId === 'street_food_stall' && adjId === 'coffin_home_units') {
      multiplier *= 1.15;
      modifierSummary.push('High density Coffin Homes boost Street Food Stall (+15%)');
    }

    // 7. Positive Healthcare District Synergy: Clinic + Pharmacy mutual (+20% per neighbor)
    if (targetBusinessId === 'clinic_pharmacy' && adjId === 'clinic_pharmacy') {
      multiplier *= 1.2;
      modifierSummary.push('Healthcare district synergy (+20%)');
    }
  }

  return {
    multiplier,
    isSuppressed,
    disabled: isSuppressed,
    modifierSummary,
  };
}

/**
 * Calculates dynamic business rent adhering strictly to E2E test contracts:
 * TotalRent = BaseRent * SynergyMultiplier * DensityMultiplier * PhaseMultiplier
 */
export function calculateBusinessRent(
  graph: SpatialBoardGraph,
  nodeId: string,
  options?: BusinessRentOptions
): number {
  const node = graph.nodes[nodeId];
  if (!node) return 0;

  // Hazard conditions or locked zones disable rent
  if (node.hazardStatus === 'FIRE' || node.hazardStatus === 'COLLAPSED' || node.isLocked) {
    return 0;
  }

  // Base rent from current business or property
  const business = node.currentBusiness
    ? BUSINESS_CATALOG[node.currentBusiness.businessId]
    : undefined;
  let baseRent = business ? business.baseRent : node.property?.baseRent ?? 30;

  // Coffin home upgrade tree overrides
  if (options?.upgradeTier) {
    const tierRents = [0, 15, 45, 135, 350, 800];
    baseRent = tierRents[Math.min(5, Math.max(1, options.upgradeTier))];
  }

  // Synergies with adjacent nodes
  const adjacentNodeIds = getAdjacentNodeIds(graph, nodeId);
  const adjacentBusinessIds: string[] = [];

  for (const adjId of adjacentNodeIds) {
    const adjNode = graph.nodes[adjId];
    if (adjNode?.currentBusiness) {
      adjacentBusinessIds.push(adjNode.currentBusiness.businessId);
    }
  }

  const targetBizId = node.currentBusiness?.businessId ?? 'coffin_home_units';
  const { multiplier, isSuppressed } = calculateSynergyModifier(targetBizId, adjacentBusinessIds);

  if (isSuppressed) return 0;

  let totalRent = baseRent * multiplier;

  // Kowloon dynamic floor density rent formula: Rent * (1 + 0.5 * (N_floor - 1))
  const floorPlayers = options?.floorPlayers ?? 1;
  const densityMultiplier = 1.0 + 0.5 * Math.max(0, floorPlayers - 1);
  totalRent *= densityMultiplier;

  // Chaos phase volatility
  if (options?.chaosPhase === 'INSTABILITY') {
    totalRent *= 1.1;
  } else if (options?.chaosPhase === 'CHAOS') {
    totalRent *= 1.25;
  }

  return Math.round(totalRent);
}

/**
 * Full Reducer-integrated dynamic rent calculator extracting state context.
 */
export function calculateDynamicBusinessRent(
  graph: SpatialBoardGraph,
  nodeId: string,
  state: GameState
): number {
  const node = graph.nodes[nodeId];
  if (!node) return 0;

  // Count active solvent players on the same floor
  const targetFloor = node.floor ?? 0;
  let floorPlayers = 0;

  for (const player of state.players) {
    if (player.isBankrupt) continue;
    const playerNodeId = player.positionNodeId || `node-${player.position}`;
    const pNode = graph.nodes[playerNodeId];
    if (pNode && (pNode.floor ?? 0) === targetFloor) {
      floorPlayers += 1;
    }
  }

  const chaosPhase = state.chaosMeter?.phase ?? 'PEACEFUL';

  // Check property upgrade level
  let upgradeTier: number | undefined;
  if (node.numericId !== undefined && state.properties[node.numericId]) {
    upgradeTier = state.properties[node.numericId].level;
  } else {
    const numId = parseInt(nodeId.replace(/^(node-|tile-)/, ''), 10);
    if (!isNaN(numId) && state.properties[numId]) {
      upgradeTier = state.properties[numId].level;
    }
  }

  return calculateBusinessRent(graph, nodeId, {
    floorPlayers: Math.max(1, floorPlayers),
    chaosPhase,
    upgradeTier,
  });
}

/**
 * Adaptive AI heuristic evaluating the optimal business archetype to build/pivot to.
 */
export function evaluateAIAdaptiveBusiness(
  graph: SpatialBoardGraph,
  nodeId: string,
  state: GameState,
  availableCash: number
): string | null {
  const adjacentNodeIds = getAdjacentNodeIds(graph, nodeId);
  const adjacentBusinessIds: string[] = [];

  for (const adjId of adjacentNodeIds) {
    const adjNode = graph.nodes[adjId];
    if (adjNode?.currentBusiness) {
      adjacentBusinessIds.push(adjNode.currentBusiness.businessId);
    }
  }

  const chaosPhase = state.chaosMeter?.phase ?? 'PEACEFUL';

  // If adjacent to opponent's underground casino, building a police checkpoint is devastating
  if (adjacentBusinessIds.includes('underground_casino')) {
    const policeDef = BUSINESS_CATALOG['police_checkpoint'];
    if (availableCash >= (policeDef.buildCost || 120)) {
      return 'police_checkpoint';
    }
  }

  // In Chaos phase, defensive civic and essential residential businesses perform best
  if (chaosPhase === 'CHAOS') {
    if (availableCash >= 160) return 'security_hq';
    if (availableCash >= 140) return 'clinic_pharmacy';
    if (availableCash >= 110) return 'coffin_home_units';
  }

  // If adjacent to bar, casino or pawn shop gives high returns
  if (adjacentBusinessIds.includes('underground_bar')) {
    if (availableCash >= 200) return 'underground_casino';
    if (availableCash >= 90) return 'pawn_shop';
  }

  // If adjacent to coffin homes, food stall gives positive boost
  if (adjacentBusinessIds.includes('coffin_home_units')) {
    if (availableCash >= 60) return 'street_food_stall';
  }

  // Default affordable businesses
  if (availableCash >= 100) return 'underground_bar';
  if (availableCash >= 60) return 'street_food_stall';

  return null;
}
