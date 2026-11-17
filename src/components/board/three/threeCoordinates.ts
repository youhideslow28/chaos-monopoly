/**
 * CHAOS MONOPOLY — 3D Tabletop Coordinate System
 * Maps 40 board tile indices and spatial graph nodes to physical 3D world coordinates (X, Y, Z).
 * The 3D board lies in the XZ plane with Y as the upward vertical axis.
 * Supports legacy 40-tile perimeter as well as multi-floor 3D spatial graphs.
 */

import { BoardNode, SpatialBoardGraph } from '../../../game/graph/spatialGraphTypes';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export const BOARD_HALF_SIZE = 10.0;     // Board extends from -10 to +10 in X and Z
export const TILE_HEIGHT = 0.25;         // Upward extrusion of tile surface
export const SLAB_THICKNESS = 0.8;       // Volumetric thickness of main board slab
export const DEFAULT_FLOOR_HEIGHT = 3.5; // Standard vertical spacing per floor
export const CORNER_SPAN = 2.4;          // 2.4 x 2.4 square corner footprint
export const EDGE_TILES = 9;             // 9 regular tiles per edge on perimeter
export const REGULAR_SPAN = (BOARD_HALF_SIZE * 2 - CORNER_SPAN * 2) / EDGE_TILES; // ~1.69 units

// Active graph context for seamless legacy caller compatibility
let activeSpatialGraph: SpatialBoardGraph | null = null;

export function setActiveSpatialGraph(graph: SpatialBoardGraph | null): void {
  activeSpatialGraph = graph;
}

export function getActiveSpatialGraph(): SpatialBoardGraph | null {
  return activeSpatialGraph;
}

/**
 * Computes legacy 3D center position (X, Y, Z) for tile index (0..39).
 * Tile 0 is at Bottom-Right (+X, +Z).
 * Tiles 1..9 along Bottom edge (-X, +Z).
 * Tile 10 at Bottom-Left (-X, +Z).
 * Tiles 11..19 along Left edge (-X, -Z).
 * Tile 20 at Top-Left (-X, -Z).
 * Tiles 21..29 along Top edge (+X, -Z).
 * Tile 30 at Top-Right (+X, -Z).
 * Tiles 31..39 along Right edge (+X, +Z).
 */
export function getLegacyTile3DWorldPosition(tileId: number): Vector3 {
  const normId = ((tileId % 40) + 40) % 40;
  const startOffset = BOARD_HALF_SIZE - CORNER_SPAN / 2;

  // Tile 0: Bottom-Right Corner (GO)
  if (normId === 0) {
    return { x: startOffset, y: TILE_HEIGHT / 2, z: startOffset };
  }

  // Tiles 1..9: Bottom Edge (moving Right to Left: +X to -X)
  if (normId > 0 && normId < 10) {
    const step = normId;
    const x = startOffset - CORNER_SPAN / 2 - (step - 0.5) * REGULAR_SPAN;
    return { x, y: TILE_HEIGHT / 2, z: startOffset };
  }

  // Tile 10: Bottom-Left Corner (JAIL)
  if (normId === 10) {
    return { x: -startOffset, y: TILE_HEIGHT / 2, z: startOffset };
  }

  // Tiles 11..19: Left Edge (moving Bottom to Top: +Z to -Z)
  if (normId > 10 && normId < 20) {
    const step = normId - 10;
    const z = startOffset - CORNER_SPAN / 2 - (step - 0.5) * REGULAR_SPAN;
    return { x: -startOffset, y: TILE_HEIGHT / 2, z };
  }

  // Tile 20: Top-Left Corner (FREE PARKING)
  if (normId === 20) {
    return { x: -startOffset, y: TILE_HEIGHT / 2, z: -startOffset };
  }

  // Tiles 21..29: Top Edge (moving Left to Right: -X to +X)
  if (normId > 20 && normId < 30) {
    const step = normId - 20;
    const x = -startOffset + CORNER_SPAN / 2 + (step - 0.5) * REGULAR_SPAN;
    return { x, y: TILE_HEIGHT / 2, z: -startOffset };
  }

  // Tile 30: Top-Right Corner (GO TO JAIL)
  if (normId === 30) {
    return { x: startOffset, y: TILE_HEIGHT / 2, z: -startOffset };
  }

  // Tiles 31..39: Right Edge (moving Top to Bottom: -Z to +Z)
  const step = normId - 30;
  const z = -startOffset + CORNER_SPAN / 2 + (step - 0.5) * REGULAR_SPAN;
  return { x: startOffset, y: TILE_HEIGHT / 2, z };
}

/**
 * Multi-floor 3D coordinate mapping.
 * Accepts:
 *  - BoardNode: returns node.position3D directly
 *  - string nodeId: looks up node in graph.nodes, or parses legacy numeric ID
 *  - number tileId: looks up node by numericId in graph, or falls back to legacy perimeter coordinates
 */
export function getTile3DWorldPosition(
  target: number | string | BoardNode,
  graph: SpatialBoardGraph | null = activeSpatialGraph
): Vector3 {
  // Case 1: Direct BoardNode object
  if (
    typeof target === 'object' &&
    target !== null &&
    'position3D' in target &&
    target.position3D &&
    typeof target.position3D.x === 'number'
  ) {
    return {
      x: target.position3D.x,
      y: target.position3D.y,
      z: target.position3D.z,
    };
  }

  // Case 2: String nodeId
  if (typeof target === 'string') {
    if (graph && graph.nodes && graph.nodes[target]) {
      const node = graph.nodes[target];
      return { x: node.position3D.x, y: node.position3D.y, z: node.position3D.z };
    }
    // Attempt parse as numeric string (e.g. "14", "tile-14", or "node-14")
    const cleanStr = target.replace(/^(tile-|node-)/, '');
    const parsed = parseInt(cleanStr, 10);
    if (!isNaN(parsed)) {
      if (graph && graph.nodes) {
        const found = Object.values(graph.nodes).find(n => n.numericId === parsed || n.id === target);
        if (found) {
          return { x: found.position3D.x, y: found.position3D.y, z: found.position3D.z };
        }
      }
      if (parsed >= 0 && parsed < 40) {
        return getLegacyTile3DWorldPosition(parsed);
      }
    }
    return { x: 0, y: TILE_HEIGHT / 2, z: 0 };
  }

  // Case 3: Numeric tileId (0..39 or numericId)
  if (typeof target === 'number') {
    if (graph && graph.nodes) {
      const found = Object.values(graph.nodes).find(
        n => n.numericId === target || n.id === `tile-${target}` || n.id === `node-${target}`
      );
      if (found) {
        return { x: found.position3D.x, y: found.position3D.y, z: found.position3D.z };
      }
    }
    return getLegacyTile3DWorldPosition(target);
  }

  return { x: 0, y: TILE_HEIGHT / 2, z: 0 };
}

/**
 * Returns dimensions (width, height, depth) for a tile or graph node.
 * Corners are square and larger (2.4 x 2.4).
 * Edge tiles are rectangular (1.69 x 2.4 or 2.4 x 1.69).
 */
export function getTile3DDimensions(
  target: number | string | BoardNode,
  _graph: SpatialBoardGraph | null = activeSpatialGraph
): { width: number; height: number; depth: number } {
  let normId: number | null = null;

  if (typeof target === 'number') {
    normId = ((target % 40) + 40) % 40;
  } else if (typeof target === 'string') {
    const cleanStr = target.replace(/^(tile-|node-)/, '');
    const p = parseInt(cleanStr, 10);
    if (!isNaN(p)) normId = ((p % 40) + 40) % 40;
  } else if (typeof target === 'object' && target !== null && typeof target.numericId === 'number') {
    normId = ((target.numericId % 40) + 40) % 40;
  }

  if (normId !== null) {
    const isCorner = normId % 10 === 0;
    if (isCorner) {
      return { width: CORNER_SPAN, height: TILE_HEIGHT, depth: CORNER_SPAN };
    }
    // Bottom or Top edge
    if ((normId > 0 && normId < 10) || (normId > 20 && normId < 30)) {
      return { width: REGULAR_SPAN - 0.06, height: TILE_HEIGHT, depth: CORNER_SPAN - 0.06 };
    }
    // Left or Right edge
    return { width: CORNER_SPAN - 0.06, height: TILE_HEIGHT, depth: REGULAR_SPAN - 0.06 };
  }

  return { width: REGULAR_SPAN - 0.06, height: TILE_HEIGHT, depth: CORNER_SPAN - 0.06 };
}

/**
 * Computes elevation bounds for multi-floor camera framing.
 */
export function getGraphElevationBounds(graph: SpatialBoardGraph): { minY: number; maxY: number; floorCount: number } {
  if (!graph.floors || graph.floors.length === 0) {
    return { minY: 0, maxY: 0, floorCount: 1 };
  }
  let minY = Infinity;
  let maxY = -Infinity;
  for (const f of graph.floors) {
    if (f.elevationY < minY) minY = f.elevationY;
    if (f.elevationY > maxY) maxY = f.elevationY;
  }
  return { minY, maxY, floorCount: graph.floors.length };
}
