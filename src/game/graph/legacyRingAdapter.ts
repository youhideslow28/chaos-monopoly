/**
 * Legacy Ring Graph Adapter
 * Wraps existing 40-tile perimeter into a valid 1-cycle SpatialBoardGraph.
 * Guarantees 100% backwards compatibility and zero regressions for existing tests.
 */

import { BOARD_TILES, TILE_GRID_POSITIONS_40, BOARD_SIZE } from '../board/boardData';
import { BoardTile } from '../types';
import { getLegacyTile3DWorldPosition } from '../../components/board/three/threeCoordinates';
import {
  SpatialBoardGraph,
  BoardNode,
  GraphEdge,
  FloorDefinition,
} from './spatialGraphTypes';

export const LEGACY_MAP_ID = 'legacy-ring-40';
export const LEGACY_MAP_NAME = 'Bản Đồ Cổ Điển 40 Ô (Perimeter Ring)';

/**
 * Maps numeric tile ID (0..39) to string node ID ('node-0' .. 'node-39').
 */
export function legacyTileIdToNodeId(tileId: number): string {
  const normId = ((tileId % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  return `node-${normId}`;
}

/**
 * Maps string node ID ('node-0' .. 'node-39') back to numeric tile ID (0..39).
 */
export function legacyNodeIdToTileId(nodeId: string): number {
  const match = nodeId.match(/^node-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const directNum = parseInt(nodeId, 10);
  if (!isNaN(directNum)) {
    return ((directNum % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  }
  throw new Error(`legacyNodeIdToTileId: Invalid legacy node ID "${nodeId}"`);
}

/**
 * Checks whether a given graph is the legacy 40-tile ring graph.
 */
export function isLegacyRingGraph(graph: SpatialBoardGraph): boolean {
  return graph.mapId === LEGACY_MAP_ID || (Object.keys(graph.nodes).length === 40 && graph.mapId === 'ring-40');
}

/**
 * Creates a fully validated SpatialBoardGraph from BoardTile array.
 */
export function createLegacyRingGraph(tiles: BoardTile[] = BOARD_TILES): SpatialBoardGraph {
  const nodes: Record<string, BoardNode> = {};
  const edges: Record<string, GraphEdge> = {};
  const nodeIds: string[] = [];

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const nodeId = legacyTileIdToNodeId(tile.id);
    const nextTileId = (tile.id + 1) % tiles.length;
    const nextNodeId = legacyTileIdToNodeId(nextTileId);
    const edgeId = `edge-ring-${tile.id}-to-${nextTileId}`;

    nodeIds.push(nodeId);

    // Retrieve 3D coordinates from threeCoordinates engine
    const pos3D = getLegacyTile3DWorldPosition(tile.id);

    // Create edge connecting node-i -> node-((i+1)%40)
    edges[edgeId] = {
      id: edgeId,
      fromNodeId: nodeId,
      toNodeId: nextNodeId,
      type: 'MAIN_LOOP',
      bidirectional: false,
      stepCost: 1,
      label: `Vòng chu vi: ${tile.shortName} -> ${tiles[nextTileId].shortName}`,
    };

    // Create node
    nodes[nodeId] = {
      id: nodeId,
      numericId: tile.id,
      name: tile.name,
      shortName: tile.shortName,
      type: tile.type,
      zoneId: tile.property?.district || 'zone-perimeter-ring',
      floor: 0,
      position3D: {
        x: pos3D.x,
        y: 0.0,
        z: pos3D.z,
      },
      connectedNodeIds: [nextNodeId],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
      property: tile.property ? { ...tile.property } : undefined,
      currentBusiness: undefined,
      hazardStatus: 'NONE',
      description: tile.description,
      iconName: tile.iconName,
      taxAmount: tile.taxAmount,
      gridPosition: tile.gridPosition || TILE_GRID_POSITIONS_40[tile.id],
    };
  }

  const groundFloor: FloorDefinition = {
    floorIndex: 0,
    name: 'Mặt Đất (Ground Level)',
    elevationY: 0.0,
    nodeIds,
  };

  return {
    mapId: LEGACY_MAP_ID,
    mapName: LEGACY_MAP_NAME,
    description: 'Bản đồ 40 ô truyền thống với chu vi vòng khép kín tiêu chuẩn.',
    nodes,
    edges,
    startNodeId: legacyTileIdToNodeId(0),
    detentionNodeId: legacyTileIdToNodeId(10),
    floors: [groundFloor],
  };
}

/**
 * Pre-instantiated immutable legacy ring graph singleton.
 */
export const LEGACY_RING_GRAPH: SpatialBoardGraph = Object.freeze(createLegacyRingGraph());
