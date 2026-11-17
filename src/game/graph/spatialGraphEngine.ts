/**
 * Pure Mathematical Graph Traversal Engine
 * Decoupled from rendering and frame loops.
 */

import {
  SpatialBoardGraph,
  BoardNode,
  GraphEdge,
  BranchCandidate,
  PathFindingResult,
} from './spatialGraphTypes';

/**
 * Retrieves edge between two nodes from graph dictionary.
 * Supports directional lookup, direct composite key lookup, and bidirectional edges.
 */
export function getEdge(
  graph: SpatialBoardGraph,
  fromNodeId: string,
  toNodeId: string
): GraphEdge | undefined {
  if (!graph.edges) return undefined;

  // 1. Fast direct key checks
  const directKey = `${fromNodeId}->${toNodeId}`;
  if (graph.edges[directKey]) return graph.edges[directKey];

  const edgeIdKey = `edge-${fromNodeId}->${toNodeId}`;
  if (graph.edges[edgeIdKey]) return graph.edges[edgeIdKey];

  // 2. Scan edge list
  for (const edge of Object.values(graph.edges)) {
    if (edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId) {
      return edge;
    }
    if (edge.bidirectional && edge.fromNodeId === toNodeId && edge.toNodeId === fromNodeId) {
      return edge;
    }
  }

  return undefined;
}

/**
 * Creates fallback edge if missing in edge table (MAIN_LOOP, cost 1, toll 0).
 */
export function createFallbackEdge(fromNodeId: string, toNodeId: string): GraphEdge {
  return {
    id: `${fromNodeId}->${toNodeId}`,
    fromNodeId,
    toNodeId,
    type: 'MAIN_LOOP',
    stepCost: 1,
  };
}

/**
 * Retrieves all valid outgoing candidates from currentNodeId, checking:
 * 1. Node exists and is not collapsed
 * 2. Target node exists, is NOT locked by Fog of War, and is NOT collapsed
 * 3. Edge cash toll is affordable if player cash is provided ($50 for elevators)
 */
export function getValidCandidateEdges(
  graph: SpatialBoardGraph,
  currentNodeId: string,
  currentCash?: number
): BranchCandidate[] {
  const currentNode = graph.nodes[currentNodeId];
  if (!currentNode) return [];
  if (currentNode.hazardStatus === 'COLLAPSED') return [];

  const candidates: BranchCandidate[] = [];

  for (const targetId of currentNode.connectedNodeIds) {
    const targetNode = graph.nodes[targetId];
    if (!targetNode) continue;

    // Fog of war check: locked nodes cannot be entered
    if (targetNode.isLocked) continue;

    // Hazard check: collapsed tiles cannot be traversed into
    if (targetNode.hazardStatus === 'COLLAPSED') continue;

    const edge = getEdge(graph, currentNodeId, targetId) || createFallbackEdge(currentNodeId, targetId);
    const tollAmount = edge.toll?.currency === 'CASH' ? edge.toll.amount : 0;
    const canAffordToll = currentCash === undefined || tollAmount === 0 || currentCash >= tollAmount;

    // If cash is specified and insufficient, cannot traverse
    if (!canAffordToll) continue;

    candidates.push({
      targetNode,
      edge,
      tollAmount,
      canAffordToll: true,
    });
  }

  return candidates;
}

/**
 * Returns array of valid BoardNodes the player can step onto from currentNodeId.
 * Incorporates backtracking prevention: if previousNodeId is supplied and forward
 * alternatives exist, excludes previousNodeId so the player does not immediately oscillate.
 */
export function getValidNextNodes(
  graph: SpatialBoardGraph,
  currentNodeId: string,
  currentCash?: number,
  previousNodeId?: string
): BoardNode[] {
  const candidates = getValidCandidateEdges(graph, currentNodeId, currentCash);
  let validNodes = candidates.map(c => c.targetNode);

  if (previousNodeId && validNodes.length > 1) {
    const nonBacktrack = validNodes.filter(n => n.id !== previousNodeId);
    if (nonBacktrack.length > 0) {
      validNodes = nonBacktrack;
    }
  }

  return validNodes;
}

/**
 * Executes a single graph step from fromNodeId to toNodeId.
 * Validates connection, fog-of-war lock, collapsed hazard, and toll affordability.
 * Throws deterministic Error if invalid.
 */
export function stepTraverse(
  graph: SpatialBoardGraph,
  fromNodeId: string,
  toNodeId: string,
  currentCash: number
): { nextNodeId: string; tollPaid: number; edge: GraphEdge } {
  const fromNode = graph.nodes[fromNodeId];
  const toNode = graph.nodes[toNodeId];

  if (!fromNode || !toNode) {
    throw new Error(`stepTraverse: Invalid node ID(s) [from: ${fromNodeId}, to: ${toNodeId}]`);
  }

  if (toNode.isLocked) {
    throw new Error(`stepTraverse: Target node ${toNodeId} is locked by Fog of War (locked or collapsed)`);
  }

  if (toNode.hazardStatus === 'COLLAPSED') {
    throw new Error(`stepTraverse: Target node ${toNodeId} is locked or collapsed`);
  }

  if (!fromNode.connectedNodeIds.includes(toNodeId)) {
    throw new Error(`stepTraverse: Invalid traversal: node ${fromNodeId} is not connected to ${toNodeId}`);
  }

  const edge = getEdge(graph, fromNodeId, toNodeId) || createFallbackEdge(fromNodeId, toNodeId);
  const tollAmount = edge.toll?.currency === 'CASH' ? edge.toll.amount : 0;

  if (tollAmount > 0 && currentCash < tollAmount) {
    throw new Error(`stepTraverse: Insufficient cash for toll ($${currentCash} available, $${tollAmount} required) on edge ${edge.id}`);
  }

  return {
    nextNodeId: toNodeId,
    tollPaid: tollAmount,
    edge,
  };
}

/**
 * Computes shortest path from startNodeId to targetNodeId using Dijkstra's algorithm.
 * Avoids locked nodes, collapsed nodes, and toll edges exceeding maxCash if provided.
 */
export function findShortestPath(
  graph: SpatialBoardGraph,
  startNodeId: string,
  targetNodeId: string,
  options?: { maxCash?: number; avoidHazards?: boolean }
): PathFindingResult | null {
  if (!graph.nodes[startNodeId] || !graph.nodes[targetNodeId]) return null;
  if (graph.nodes[targetNodeId].isLocked) return null;

  const distances: Record<string, number> = {};
  const tollsMap: Record<string, number> = {};
  const previous: Record<string, { nodeId: string; edge: GraphEdge } | null> = {};
  const unvisited = new Set<string>();

  for (const nodeId of Object.keys(graph.nodes)) {
    distances[nodeId] = Infinity;
    tollsMap[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  }

  distances[startNodeId] = 0;
  tollsMap[startNodeId] = 0;

  while (unvisited.size > 0) {
    let closestNodeId: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        closestNodeId = nodeId;
      }
    }

    if (!closestNodeId || minDistance === Infinity) break;
    if (closestNodeId === targetNodeId) break;

    unvisited.delete(closestNodeId);

    const candidates = getValidCandidateEdges(graph, closestNodeId, options?.maxCash);
    for (const { targetNode, edge, tollAmount } of candidates) {
      if (!unvisited.has(targetNode.id)) continue;
      if (options?.avoidHazards && targetNode.hazardStatus && targetNode.hazardStatus !== 'NONE') continue;

      const altDistance = distances[closestNodeId] + (edge.stepCost || 1);
      const altTolls = tollsMap[closestNodeId] + tollAmount;

      if (options?.maxCash !== undefined && altTolls > options.maxCash) continue;

      if (altDistance < distances[targetNode.id]) {
        distances[targetNode.id] = altDistance;
        tollsMap[targetNode.id] = altTolls;
        previous[targetNode.id] = { nodeId: closestNodeId, edge };
      }
    }
  }

  if (distances[targetNodeId] === Infinity) return null;

  // Reconstruct path
  const path: string[] = [];
  const edges: GraphEdge[] = [];
  let curr: string | null = targetNodeId;

  while (curr && curr !== startNodeId) {
    path.unshift(curr);
    const prevEntry: { nodeId: string; edge: GraphEdge } | null = previous[curr];
    if (prevEntry) {
      edges.unshift(prevEntry.edge);
      curr = prevEntry.nodeId;
    } else {
      break;
    }
  }
  path.unshift(startNodeId);

  return {
    path,
    totalDistance: distances[targetNodeId],
    totalTolls: tollsMap[targetNodeId],
    edges,
  };
}

/**
 * Explores all reachable nodes exactly `steps` away from startNodeId.
 */
export function getReachableNodes(
  graph: SpatialBoardGraph,
  startNodeId: string,
  steps: number,
  currentCash?: number
): BoardNode[] {
  if (steps <= 0) {
    const node = graph.nodes[startNodeId];
    return node ? [node] : [];
  }

  // Queue holds { nodeId, remainingSteps, cash, prevNodeId }
  const queue: { nodeId: string; remainingSteps: number; cash?: number; prevNodeId?: string }[] = [
    { nodeId: startNodeId, remainingSteps: steps, cash: currentCash },
  ];
  const destinations = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.remainingSteps === 0) {
      destinations.add(item.nodeId);
      continue;
    }

    const nextNodes = getValidNextNodes(graph, item.nodeId, item.cash, item.prevNodeId);
    for (const nextNode of nextNodes) {
      const edge = getEdge(graph, item.nodeId, nextNode.id);
      const toll = edge?.toll?.currency === 'CASH' ? edge.toll.amount : 0;
      const nextCash = item.cash !== undefined ? item.cash - toll : undefined;

      queue.push({
        nodeId: nextNode.id,
        remainingSteps: item.remainingSteps - 1,
        cash: nextCash,
        prevNodeId: item.nodeId,
      });
    }
  }

  return Array.from(destinations)
    .map(id => graph.nodes[id])
    .filter((n): n is BoardNode => n !== undefined);
}

/**
 * Helper to check whether any node in the graph is an intersection with >1 outgoing paths.
 */
export function hasBranchIntersections(graph: SpatialBoardGraph): boolean {
  if (!graph || !graph.nodes) return false;
  return Object.values(graph.nodes).some(n => n.connectedNodeIds.length > 1 || n.isIntersection);
}
