import { TILE_GRID_POSITIONS_40 } from '../../game/board/boardData';

/**
 * 2.5D Isometric & Spatial Mathematics Engine for CHAOS MONOPOLY
 * Handles 3D coordinate transformations, axonometric camera projections,
 * depth-sorting indexes, container-fit sizing, and camera-facing billboarding transforms.
 */

export interface Vector3D {
  x: number; // Board space X (-0.5 to +0.5 normalized, or px)
  y: number; // Board space Y (-0.5 to +0.5 normalized, or px)
  z: number; // Elevation in px above board surface
}

export interface ScreenCoord {
  x: number;
  y: number;
  depth: number; // Z-depth for sorting / occlusion
}

export interface CameraState {
  preset?: string;
  pitch: number; // Pitch in degrees (e.g. 55 for isometric diamond)
  yaw: number;   // Yaw in degrees (e.g. 45 for isometric diamond)
  zoom: number;  // Scale multiplier (e.g. 1.0)
  panX: number;  // Pan X offset in px
  panY: number;  // Pan Y offset in px
  isDragging?: boolean;
  focusedTileId?: number | null;
}

export const DEFAULT_CAMERA: CameraState = {
  preset: 'ISOMETRIC',
  pitch: 55,
  yaw: 45,
  zoom: 1.0,
  panX: 0,
  panY: 0,
};

export const TOP_DOWN_CAMERA: CameraState = {
  preset: 'TOP_DOWN',
  pitch: 0,
  yaw: 0,
  zoom: 1.0,
  panX: 0,
  panY: 0,
};

/**
 * Retrieves the 1-based CSS grid coordinates (col: 1..11, row: 1..11) for a given tile ID (0..39).
 */
export function getTileGridPosition(tileId: number): { col: number; row: number } {
  const normId = ((tileId % 40) + 40) % 40;
  return TILE_GRID_POSITIONS_40[normId] || { col: 11, row: 11 };
}

/**
 * Returns normalized board center-relative (x, y) coordinates for any tile 0..39.
 * Center of board is (0, 0), corners reach approximately +/- 0.5.
 */
export function getTileBoardCoords(tileId: number): { x: number; y: number } {
  const gridPos = getTileGridPosition(tileId);
  // Grid columns and rows run 1..11. Col 6 / Row 6 is center.
  // Normalized range: [-0.5, +0.5]
  return {
    x: (gridPos.col - 6) / 10,
    y: (gridPos.row - 6) / 10,
  };
}

/**
 * Returns the exact 3D Cartesian coordinates in pixels for a given tile on the board slab.
 * (0, 0) is the center of the board top surface.
 * Z is the elevation above the ground plane (defaulting to slabHeightPx).
 */
export function getTile3DPosition(
  tileId: number,
  boardSizePx: number,
  slabHeightPx: number = 28
): Vector3D {
  const normalized = getTileBoardCoords(tileId);
  return {
    x: normalized.x * boardSizePx,
    y: normalized.y * boardSizePx,
    z: slabHeightPx,
  };
}

/**
 * Calculates deterministic depth index for 2.5D isometric layering.
 * In a 45-degree diamond rotated clockwise, elements with higher (row + col)
 * are closer to the viewer (foreground) and must have higher z-index / stacking context.
 * Formula: depth = (row + col) * 100 + layerOffset
 */
export function calculateDepthIndex(col: number, row: number, layerOffset: number = 0): number {
  return (row + col) * 100 + layerOffset;
}

/**
 * Projects a 3D board point to 2D screen coordinates under camera transform.
 * Rotates by yaw (around Z), then pitches by pitch (around X).
 */
export function project3DToScreen(
  point: Vector3D,
  camera: CameraState = DEFAULT_CAMERA,
  origin: { x: number; y: number } = { x: 0, y: 0 }
): ScreenCoord {
  const radYaw = (camera.yaw * Math.PI) / 180;
  const radPitch = (camera.pitch * Math.PI) / 180;

  // Yaw rotation around board Z axis
  const rotX = point.x * Math.cos(radYaw) - point.y * Math.sin(radYaw);
  const rotY = point.x * Math.sin(radYaw) + point.y * Math.cos(radYaw);

  // Pitch tilt around X axis
  const zoom = camera.zoom || 1.0;
  const screenX = rotX * zoom + camera.panX + origin.x;
  const screenY = (rotY * Math.cos(radPitch) - point.z * Math.sin(radPitch)) * zoom + camera.panY + origin.y;
  const depth = rotY * Math.sin(radPitch) + point.z * Math.cos(radPitch);

  return { x: screenX, y: screenY, depth };
}

/**
 * Generates the CSS 3D transform for a billboard element inside the isometric stage.
 * Applies an elevation along +Z, followed by inverse camera rotation (-yaw then -pitch)
 * so that typography, price tags, and tooltips face the camera directly without distortion.
 */
export function getBillboardTransform(
  camera: CameraState = DEFAULT_CAMERA,
  elevationPx: number = 0
): string {
  const yaw = camera.yaw ?? 45;
  const pitch = camera.pitch ?? 55;
  return `translateZ(${elevationPx}px) rotateZ(${-yaw}deg) rotateX(${-pitch}deg)`;
}

/**
 * Calculates optimal square board pixel size given available container dimensions.
 * Accounts for bounding expansion when rotated 45 degrees into an isometric diamond,
 * ensuring diamond vertices (tiles 10, 20, 30, 0) never clip horizontally or vertically.
 */
export function calculateFitBoardSize(
  containerWidth: number,
  containerHeight: number,
  camera: CameraState = DEFAULT_CAMERA
): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 360;

  const isIsometric = (camera.yaw ?? 45) !== 0 || (camera.pitch ?? 55) !== 0;
  const zoom = Math.max(0.1, camera.zoom || 1.0);

  if (!isIsometric) {
    // 2D flat mode: standard 1:1 box with safety margins
    const maxW = (containerWidth * 0.94) / zoom;
    const maxH = (containerHeight * 0.92) / zoom;
    return Math.round(Math.max(260, Math.min(840, Math.min(maxW, maxH))));
  }

  const radPitch = ((camera.pitch ?? 55) * Math.PI) / 180;
  
  // Rotating a square by 45 degrees expands width to sqrt(2) * W
  const diamondWidthRatio = Math.SQRT2;
  // Tilt pitch compresses vertical projection to sqrt(2) * W * cos(pitch)
  const diamondHeightRatio = Math.SQRT2 * Math.cos(radPitch);

  // Apply safety factors to accommodate slab thickness (28px) and peripheral HUD
  const maxW = (containerWidth * 0.90) / (diamondWidthRatio * zoom);
  const maxH = (containerHeight * 0.86) / (Math.max(0.25, diamondHeightRatio) * zoom);

  const fit = Math.min(maxW, maxH);
  // Scale lower clamp when containerWidth is in compact mobile range (< 360px) to prevent 320px vertex clipping
  const minSize =
    containerWidth >= 160 && containerWidth < 360
      ? Math.max(180, Math.floor((containerWidth * 0.90) / diamondWidthRatio))
      : 240;
  return Math.round(Math.max(minSize, Math.min(760, fit)));
}

/**
 * Converts screen coordinates (e.g. mouse click or touch tap) back to the corresponding
 * tile ID (0..39) if within bounds, providing an inverse projection fallback.
 */
export function screenToTileId(
  screenX: number,
  screenY: number,
  boardRect: { left: number; top: number; width: number; height: number },
  camera: CameraState = DEFAULT_CAMERA
): number | null {
  const centerX = boardRect.left + boardRect.width / 2 + camera.panX;
  const centerY = boardRect.top + boardRect.height / 2 + camera.panY;
  const zoom = camera.zoom || 1.0;

  const dx = (screenX - centerX) / zoom;
  const dy = (screenY - centerY) / zoom;

  const radYaw = (camera.yaw * Math.PI) / 180;
  const radPitch = (camera.pitch * Math.PI) / 180;

  // Invert pitch (divide by cos(pitch))
  const cosPitch = Math.cos(radPitch);
  if (Math.abs(cosPitch) < 0.01) return null;
  const rotY = dy / cosPitch;
  const rotX = dx;

  // Invert yaw rotation: rotate by -yaw
  const bx = rotX * Math.cos(-radYaw) - rotY * Math.sin(-radYaw);
  const by = rotX * Math.sin(-radYaw) + rotY * Math.cos(-radYaw);

  // Check normalized bounds: [-boardRect.width / 2, boardRect.width / 2]
  const halfSize = boardRect.width / 2;
  const normX = bx / halfSize; // [-1, 1]
  const normY = by / halfSize; // [-1, 1]

  if (Math.abs(normX) > 1.05 || Math.abs(normY) > 1.05) {
    return null; // Click fell outside board
  }

  // Find closest tile among the 40 perimeter tiles
  let closestTileId: number | null = null;
  let minDistanceSq = Infinity;

  for (let id = 0; id < 40; id++) {
    const coords = getTileBoardCoords(id); // [-0.5, 0.5]
    // Convert to [-1, 1] space
    const tileX = coords.x * 2;
    const tileY = coords.y * 2;

    const distSq = (normX - tileX) ** 2 + (normY - tileY) ** 2;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestTileId = id;
    }
  }

  return closestTileId;
}
