import { describe, it, expect } from 'vitest';
import {
  SpatialBoardGraph,
  BoardNode,
  GraphEdge,
} from '../spatialGraphTypes';
import {
  getEdge,
  createFallbackEdge,
  getValidCandidateEdges,
  getValidNextNodes,
  stepTraverse,
  findShortestPath,
  getReachableNodes,
  hasBranchIntersections,
} from '../spatialGraphEngine';
import { getTile3DWorldPosition } from '../../../components/board/three/threeCoordinates';

describe('Spatial Graph Traversal Engine', () => {
  // Helper to construct a simple 4-node test graph with a branch and an elevator
  function createTestGraph(): SpatialBoardGraph {
    const nodes: Record<string, BoardNode> = {
      'A': {
        id: 'A',
        name: 'Node A (Ground)',
        shortName: 'A',
        type: 'START',
        zoneId: 'zone-ground',
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ['B', 'C'], // Intersection!
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
      },
      'B': {
        id: 'B',
        name: 'Node B (Street)',
        shortName: 'B',
        type: 'PROPERTY',
        zoneId: 'zone-ground',
        floor: 0,
        position3D: { x: 2, y: 0, z: 0 },
        connectedNodeIds: ['D'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'C': {
        id: 'C',
        name: 'Node C (Elevator Shaft)',
        shortName: 'C',
        type: 'TRANSPORT',
        zoneId: 'zone-ground',
        floor: 0,
        position3D: { x: 0, y: 0, z: 2 },
        connectedNodeIds: ['E_LOCKED', 'F_ELEVATED'],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
      },
      'D': {
        id: 'D',
        name: 'Node D (Market)',
        shortName: 'D',
        type: 'PROPERTY',
        zoneId: 'zone-ground',
        floor: 0,
        position3D: { x: 4, y: 0, z: 0 },
        connectedNodeIds: ['A'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'E_LOCKED': {
        id: 'E_LOCKED',
        name: 'Node E (Secret Basement)',
        shortName: 'E',
        type: 'PROPERTY',
        zoneId: 'zone-secret',
        floor: 0,
        position3D: { x: 0, y: -3.5, z: 2 },
        connectedNodeIds: ['C'],
        isIntersection: false,
        isSecretZone: true,
        isLocked: true, // Fog of War locked!
      },
      'F_ELEVATED': {
        id: 'F_ELEVATED',
        name: 'Node F (2F Rooftop)',
        shortName: 'F',
        type: 'PROPERTY',
        zoneId: 'zone-rooftop',
        floor: 1,
        position3D: { x: 0, y: 3.5, z: 2 },
        connectedNodeIds: ['D'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'COLLAPSED_NODE': {
        id: 'COLLAPSED_NODE',
        name: 'Collapsed Hazard',
        shortName: 'COLLAPSED',
        type: 'REST_ZONE',
        zoneId: 'zone-ground',
        floor: 0,
        position3D: { x: 1, y: 0, z: 1 },
        connectedNodeIds: ['A'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'COLLAPSED',
      },
    };

    const edges: Record<string, GraphEdge> = {
      'A->B': {
        id: 'A->B',
        fromNodeId: 'A',
        toNodeId: 'B',
        type: 'MAIN_LOOP',
        stepCost: 1,
      },
      'A->C': {
        id: 'A->C',
        fromNodeId: 'A',
        toNodeId: 'C',
        type: 'BRANCH',
        stepCost: 1,
      },
      'B->D': {
        id: 'B->D',
        fromNodeId: 'B',
        toNodeId: 'D',
        type: 'MAIN_LOOP',
        stepCost: 1,
      },
      'C->E_LOCKED': {
        id: 'C->E_LOCKED',
        fromNodeId: 'C',
        toNodeId: 'E_LOCKED',
        type: 'BRANCH',
        stepCost: 1,
      },
      'C->F_ELEVATED': {
        id: 'C->F_ELEVATED',
        fromNodeId: 'C',
        toNodeId: 'F_ELEVATED',
        type: 'VERTICAL_ELEVATOR',
        stepCost: 1,
        toll: { currency: 'CASH', amount: 50 },
      },
      'F_ELEVATED->D': {
        id: 'F_ELEVATED->D',
        fromNodeId: 'F_ELEVATED',
        toNodeId: 'D',
        type: 'VERTICAL_STAIRS',
        stepCost: 1,
      },
      'D->A': {
        id: 'D->A',
        fromNodeId: 'D',
        toNodeId: 'A',
        type: 'MAIN_LOOP',
        stepCost: 1,
      },
    };

    return {
      mapId: 'test-spatial-graph',
      mapName: 'Test Spatial Graph Level',
      nodes,
      edges,
      startNodeId: 'A',
      detentionNodeId: 'B',
      floors: [
        { floorIndex: 0, name: 'Ground', elevationY: 0, nodeIds: ['A', 'B', 'C', 'D', 'E_LOCKED', 'COLLAPSED_NODE'] },
        { floorIndex: 1, name: '2F', elevationY: 3.5, nodeIds: ['F_ELEVATED'] },
      ],
    };
  }

  it('detects branch intersections in non-linear graphs', () => {
    const graph = createTestGraph();
    expect(hasBranchIntersections(graph)).toBe(true);
  });

  it('retrieves edges correctly by ID and directional endpoints', () => {
    const graph = createTestGraph();
    const edge = getEdge(graph, 'A', 'B');
    expect(edge).toBeDefined();
    expect(edge?.type).toBe('MAIN_LOOP');

    const elevatorEdge = getEdge(graph, 'C', 'F_ELEVATED');
    expect(elevatorEdge).toBeDefined();
    expect(elevatorEdge?.type).toBe('VERTICAL_ELEVATOR');
    expect(elevatorEdge?.toll?.amount).toBe(50);

    const nonExistent = getEdge(graph, 'B', 'C');
    expect(nonExistent).toBeUndefined();
  });

  it('creates fallback edge when edge entry is omitted', () => {
    const fallback = createFallbackEdge('X', 'Y');
    expect(fallback.id).toBe('X->Y');
    expect(fallback.type).toBe('MAIN_LOOP');
    expect(fallback.stepCost).toBe(1);
  });

  it('filters out Fog of War locked nodes from valid candidates', () => {
    const graph = createTestGraph();
    // C connects to E_LOCKED and F_ELEVATED
    // E_LOCKED is locked, so only F_ELEVATED should be a candidate (if cash >= 50)
    const candidates = getValidCandidateEdges(graph, 'C', 100);
    expect(candidates.map(c => c.targetNode.id)).toEqual(['F_ELEVATED']);
  });

  it('enforces elevator toll: rejects when cash < 50, accepts when cash >= 50', () => {
    const graph = createTestGraph();

    // Broke player (cash = 20): cannot afford elevator ($50 toll)
    const brokeCandidates = getValidCandidateEdges(graph, 'C', 20);
    expect(brokeCandidates.length).toBe(0);

    // Player with cash = 50: can afford elevator
    const solventCandidates = getValidCandidateEdges(graph, 'C', 50);
    expect(solventCandidates.length).toBe(1);
    expect(solventCandidates[0].targetNode.id).toBe('F_ELEVATED');
  });

  it('prevents immediate backtracking if forward alternatives exist', () => {
    const graph = createTestGraph();
    // A connects to B and C
    // If player just came from B, next nodes should prioritize C to prevent 180 oscillation
    const nextNodes = getValidNextNodes(graph, 'A', 100, 'B');
    expect(nextNodes.map(n => n.id)).toEqual(['C']);

    // If no previousNodeId given, all forward branches returned
    const allBranches = getValidNextNodes(graph, 'A', 100);
    expect(allBranches.map(n => n.id)).toEqual(['B', 'C']);
  });

  it('stepTraverse executes valid transitions and returns toll amount', () => {
    const graph = createTestGraph();

    // Free step: A -> B
    const step1 = stepTraverse(graph, 'A', 'B', 100);
    expect(step1.nextNodeId).toBe('B');
    expect(step1.tollPaid).toBe(0);

    // Paid step: C -> F_ELEVATED ($50 toll)
    const stepElevator = stepTraverse(graph, 'C', 'F_ELEVATED', 100);
    expect(stepElevator.nextNodeId).toBe('F_ELEVATED');
    expect(stepElevator.tollPaid).toBe(50);
  });

  it('stepTraverse throws deterministic error on invalid moves', () => {
    const graph = createTestGraph();

    // Move to locked node
    expect(() => stepTraverse(graph, 'C', 'E_LOCKED', 100)).toThrow(/locked by Fog of War/);

    // Insufficient cash for elevator
    expect(() => stepTraverse(graph, 'C', 'F_ELEVATED', 30)).toThrow(/Insufficient cash/);

    // Disconnected nodes
    expect(() => stepTraverse(graph, 'B', 'C', 100)).toThrow(/not connected/);
  });

  it('finds shortest path with Dijkstra avoiding locked nodes and computing tolls', () => {
    const graph = createTestGraph();

    // Shortest path A -> D via street: A -> B -> D (distance 2, toll 0)
    const pathStreet = findShortestPath(graph, 'A', 'D', { maxCash: 0 });
    expect(pathStreet).not.toBeNull();
    expect(pathStreet?.path).toEqual(['A', 'B', 'D']);
    expect(pathStreet?.totalDistance).toBe(2);
    expect(pathStreet?.totalTolls).toBe(0);

    // Path to locked node returns null
    const pathLocked = findShortestPath(graph, 'A', 'E_LOCKED');
    expect(pathLocked).toBeNull();
  });

  it('calculates reachable destinations with BFS stepping', () => {
    const graph = createTestGraph();

    // 1 step from A: B and C
    const step1 = getReachableNodes(graph, 'A', 1, 100);
    expect(step1.map(n => n.id).sort()).toEqual(['B', 'C']);

    // 2 steps from A:
    // A -> B -> D
    // A -> C -> F_ELEVATED (E_LOCKED excluded)
    const step2 = getReachableNodes(graph, 'A', 2, 100);
    expect(step2.map(n => n.id).sort()).toEqual(['D', 'F_ELEVATED']);
  });

  describe('Adversarial & Edge Case Invariants (Milestone 1 Iteration 2)', () => {
    it('permits walking on free edges when player cash is negative (debt)', () => {
      const graph = createTestGraph();

      // Node A has free edges to B and C (tollAmount = 0).
      // When player cash is negative (e.g. -50), candidates must NOT be filtered out.
      const candidates = getValidCandidateEdges(graph, 'A', -50);
      expect(candidates.map(c => c.targetNode.id).sort()).toEqual(['B', 'C']);

      const nextNodes = getValidNextNodes(graph, 'A', -50);
      expect(nextNodes.map(n => n.id).sort()).toEqual(['B', 'C']);

      // Stepping on free edge succeeds
      const stepRes = stepTraverse(graph, 'A', 'B', -50);
      expect(stepRes.nextNodeId).toBe('B');
      expect(stepRes.tollPaid).toBe(0);

      // In contrast, toll elevator from C to F_ELEVATED ($50 toll) must be blocked
      const cCandidates = getValidCandidateEdges(graph, 'C', -50);
      expect(cCandidates.some(c => c.targetNode.id === 'F_ELEVATED')).toBe(false);

      expect(() => stepTraverse(graph, 'C', 'F_ELEVATED', -50)).toThrow(/Insufficient cash/);
    });

    it('getTile3DWorldPosition safely handles null or undefined position3D without throwing', () => {
      // Must not throw when target object has null or undefined position3D
      expect(() => getTile3DWorldPosition({ position3D: null } as any)).not.toThrow();
      const resNull = getTile3DWorldPosition({ position3D: null } as any);
      expect(resNull).toEqual({ x: 0, y: 0.125, z: 0 });

      expect(() => getTile3DWorldPosition({ position3D: undefined } as any)).not.toThrow();
      const resUndef = getTile3DWorldPosition({ position3D: undefined } as any);
      expect(resUndef).toEqual({ x: 0, y: 0.125, z: 0 });

      expect(() => getTile3DWorldPosition({} as any)).not.toThrow();
      const resEmpty = getTile3DWorldPosition({} as any);
      expect(resEmpty).toEqual({ x: 0, y: 0.125, z: 0 });

      // Valid position3D is returned properly
      const resValid = getTile3DWorldPosition({
        position3D: { x: 5, y: 3.5, z: -2 },
      } as any);
      expect(resValid).toEqual({ x: 5, y: 3.5, z: -2 });
    });
  });
});
