import { describe, it, expect } from 'vitest';
import {
  legacyTileIdToNodeId,
  legacyNodeIdToTileId,
  isLegacyRingGraph,
  createLegacyRingGraph,
  LEGACY_RING_GRAPH,
  LEGACY_MAP_ID,
} from '../legacyRingAdapter';
import { stepTraverse, getValidNextNodes, hasBranchIntersections } from '../spatialGraphEngine';

describe('Legacy Ring Graph Adapter', () => {
  it('converts tile IDs to node IDs with modular wrapping', () => {
    expect(legacyTileIdToNodeId(0)).toBe('node-0');
    expect(legacyTileIdToNodeId(39)).toBe('node-39');
    expect(legacyTileIdToNodeId(40)).toBe('node-0');
    expect(legacyTileIdToNodeId(-1)).toBe('node-39');
  });

  it('converts node IDs back to tile IDs', () => {
    expect(legacyNodeIdToTileId('node-0')).toBe(0);
    expect(legacyNodeIdToTileId('node-39')).toBe(39);
    expect(legacyNodeIdToTileId('15')).toBe(15);
    expect(() => legacyNodeIdToTileId('invalid-string')).toThrow();
  });

  it('creates valid 40-node 1-cycle SpatialBoardGraph', () => {
    const graph = createLegacyRingGraph();
    expect(graph.mapId).toBe(LEGACY_MAP_ID);
    expect(Object.keys(graph.nodes).length).toBe(40);
    expect(Object.keys(graph.edges).length).toBe(40);
    expect(graph.floors.length).toBe(1);
    expect(graph.floors[0].elevationY).toBe(0.0);
    expect(graph.startNodeId).toBe('node-0');
    expect(graph.detentionNodeId).toBe('node-10');

    // Invariant: every node connects exclusively to (i + 1) % 40
    for (let i = 0; i < 40; i++) {
      const nodeId = `node-${i}`;
      const nextNodeId = `node-${(i + 1) % 40}`;
      const node = graph.nodes[nodeId];

      expect(node).toBeDefined();
      expect(node.numericId).toBe(i);
      expect(node.connectedNodeIds).toEqual([nextNodeId]);
      expect(node.isIntersection).toBe(false);
      expect(node.isLocked).toBe(false);
      expect(node.floor).toBe(0);

      // Edge validation
      const edge = graph.edges[`edge-ring-${i}-to-${(i + 1) % 40}`];
      expect(edge).toBeDefined();
      expect(edge.type).toBe('MAIN_LOOP');
      expect(edge.fromNodeId).toBe(nodeId);
      expect(edge.toNodeId).toBe(nextNodeId);
    }
  });

  it('has zero branch intersections on legacy graph', () => {
    expect(hasBranchIntersections(LEGACY_RING_GRAPH)).toBe(false);
    expect(isLegacyRingGraph(LEGACY_RING_GRAPH)).toBe(true);
  });

  it('guarantees deterministic cyclic traversal matching (pos + S) % 40', () => {
    const graph = LEGACY_RING_GRAPH;

    // Simulate 7-step roll from tile 35: should land on tile 2 (passing 0)
    let curr = 'node-35';
    let steps = 7;
    const path: string[] = [curr];

    while (steps > 0) {
      const next = getValidNextNodes(graph, curr);
      expect(next.length).toBe(1);
      const res = stepTraverse(graph, curr, next[0].id, 1000);
      curr = res.nextNodeId;
      path.push(curr);
      steps--;
    }

    expect(curr).toBe('node-2');
    expect(graph.nodes[curr].numericId).toBe(2);
    expect(path).toEqual(['node-35', 'node-36', 'node-37', 'node-38', 'node-39', 'node-0', 'node-1', 'node-2']);
  });
});
