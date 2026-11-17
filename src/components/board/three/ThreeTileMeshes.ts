/**
 * CHAOS MONOPOLY — 3D Tabletop Tile Mesh Factory
 * Generates perimeter-aligned 3D tile meshes whose textures are drawn at the tile's
 * real aspect ratio (so text is never stretched) with auto-fitted, crisp typography.
 */

import * as THREE from 'three';
import { BoardTile } from '../../../game/types';
import { formatMoney } from '../../../utils/money';
import { WorldConfig } from '../../../worlds/types';
import { getTile3DWorldPosition, BOARD_HALF_SIZE, TILE_HEIGHT } from './threeCoordinates';

// Light-optimized luxury district colors
export const DISTRICT_HEX_COLORS: Record<string, string> = {
  'district-brown': '#78350f',      // Warm espresso brown
  'district-lightblue': '#0284c7',  // Ocean cyan blue
  'district-pink': '#db2777',       // Rose magenta
  'district-orange': '#ea580c',     // Tangerine orange
  'district-red': '#dc2626',        // Crimson red
  'district-yellow': '#ca8a04',     // Rich gold yellow
  'district-green': '#15803d',      // Emerald forest green
  'district-darkblue': '#1e3a8a',   // Deep royal navy
};

export interface TileMeshGroup {
  group: THREE.Group;
  tileMesh: THREE.Mesh;
  /** Textured top face, kept separate so the box itself needs only one draw call. */
  topMesh: THREE.Mesh;
  highlightMesh: THREE.Mesh;
  tileId: number;
  /** Corner tiles: camera-facing text label (so the name never reads sideways). */
  labelMesh?: THREE.Mesh;
}

const CORNER_SPAN = 2.4;
const EDGE_TILES = 9;
const REGULAR_SPAN = (BOARD_HALF_SIZE * 2 - CORNER_SPAN * 2) / EDGE_TILES; // ~1.69 units
const TEX_HEIGHT = 1024;
const FONT_STACK = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Computes perimeter rotation angle around Y axis for tile index (0..39)
 * so that the top texture and street frontage always face the inside of the board.
 */
export function getTileRotationY(tileId: number): number {
  const normId = ((tileId % 40) + 40) % 40;
  if (normId === 0) return 0;
  if (normId > 0 && normId < 10) return 0;             // Bottom: face inward (+Z to -Z)
  if (normId === 10) return 0;
  if (normId > 10 && normId < 20) return -Math.PI / 2; // Left: rotate -90 deg
  if (normId === 20) return 0;
  if (normId > 20 && normId < 30) return Math.PI;      // Top: rotate 180 deg
  if (normId === 30) return 0;
  return Math.PI / 2;                                  // Right: rotate +90 deg
}

/** Texture pixel size matching the physical tile footprint (width : depth). */
export function getTileTextureSize(tileId: number): { width: number; height: number } {
  const isCorner = tileId % 10 === 0;
  if (isCorner) return { width: TEX_HEIGHT, height: TEX_HEIGHT };
  const w = REGULAR_SPAN - 0.06;
  const d = CORNER_SPAN - 0.06;
  return { width: Math.round((TEX_HEIGHT * w) / d), height: TEX_HEIGHT };
}

function font(weight: string | number, px: number): string {
  return `${weight} ${px}px ${FONT_STACK}`;
}

/** Shrinks the font until `text` fits in `maxWidth`. Returns the chosen px size. */
function fitSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  minPx: number,
  weight: string | number
): number {
  let px = startPx;
  ctx.font = font(weight, px);
  while (px > minPx && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = font(weight, px);
  }
  return px;
}

/** Greedy word wrap into at most `maxLines`, shrinking font until everything fits. */
function wrapToFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startPx: number,
  minPx: number,
  weight: string | number
): { lines: string[]; px: number } {
  const words = text.split(/\s+/).filter(Boolean);
  for (let px = startPx; px >= minPx; px -= 2) {
    ctx.font = font(weight, px);
    const lines: string[] = [];
    let line = '';
    let ok = true;
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width <= maxWidth) {
        line = trial;
      } else {
        if (!line) {
          ok = false; // a single word is too wide at this size
          break;
        }
        lines.push(line);
        line = word;
        if (ctx.measureText(line).width > maxWidth) {
          ok = false;
          break;
        }
      }
    }
    if (!ok) continue;
    if (line) lines.push(line);
    if (lines.length <= maxLines) return { lines, px };
  }
  ctx.font = font(weight, minPx);
  return { lines: [text], px: minPx };
}

function drawCenteredLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  cx: number,
  cy: number,
  lineHeight: number
): void {
  const total = (lines.length - 1) * lineHeight;
  lines.forEach((l, i) => ctx.fillText(l, cx, cy - total / 2 + i * lineHeight));
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

/**
 * Creates a canvas texture sized to the tile's real aspect ratio.
 */
export function createTileTexture(tile: BoardTile, worldConfig?: WorldConfig | null): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as any);
  }
  const { width: W, height: H } = getTileTextureSize(tile.id);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const cx = W / 2;
  const pad = Math.round(W * 0.07);
  const maxTextW = W - pad * 2;

  // Base background: crisp cardstock
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  const isProperty = tile.type === 'PROPERTY' && tile.property;
  const isCorner = tile.id % 10 === 0;
  const localizedTitle = worldConfig?.pack?.tileNames?.[tile.id]?.vi || tile.shortName;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isProperty && tile.property) {
    // 1. District colour band on the street-facing (inner) side
    const bandH = Math.round(H * 0.26);
    const bandColor =
      worldConfig?.pack?.tileVisuals?.districtColors?.[tile.property.districtColor] ||
      DISTRICT_HEX_COLORS[tile.property.districtColor] ||
      '#0284c7';
    ctx.fillStyle = bandColor;
    ctx.fillRect(10, 10, W - 20, bandH);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(10, 10 + bandH, W - 20, 10);

    const district = tile.property.district.toUpperCase();
    const dPx = fitSingleLine(ctx, district, maxTextW, 58, 28, 800);
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, dPx);
    ctx.fillText(district, cx, 10 + bandH / 2);

    // 2. Property title (wrapped, auto-sized, large)
    const titleTop = 10 + bandH + 24;
    const titleBottom = H * 0.76;
    const { lines, px } = wrapToFit(ctx, localizedTitle, maxTextW, 3, 128, 44, 800);
    ctx.fillStyle = '#0f172a';
    ctx.font = font(800, px);
    drawCenteredLines(ctx, lines, cx, (titleTop + titleBottom) / 2, px * 1.12);

    // 3. Price tag
    const pillW = W * 0.78;
    const pillH = H * 0.13;
    const pillY = H * 0.8;
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    roundRectPath(ctx, cx - pillW / 2, pillY, pillW, pillH, 30);
    ctx.fill();
    ctx.stroke();

    const price = formatMoney(tile.property.basePrice);
    const pricePx = fitSingleLine(ctx, price, pillW - 40, 92, 40, 900);
    ctx.fillStyle = '#0f172a';
    ctx.font = font(900, pricePx);
    ctx.fillText(price, cx, pillY + pillH / 2 + 2);
  } else if (isCorner) {
    // Plain face only: the name plate owns everything the player reads, so no inner frame that
    // would look like a second tile nested inside the corner.
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, W, H);

    // Art and text both live on the camera-facing plate (see createCornerLabelTexture):
    // this keeps the corner readable and the icon turns with the name.
  } else {
    // Special tiles: Chaos / Tax / Station / Utility
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(12, 12, W - 24, H - 24);

    const { lines, px } = wrapToFit(ctx, localizedTitle, maxTextW, 3, 110, 44, 800);
    ctx.fillStyle = '#0f172a';
    ctx.font = font(800, px);
    drawCenteredLines(ctx, lines, cx, H * 0.22, px * 1.12);

    let emoji = '💡';
    let emojiColor = '#475569';
    let label = 'DỊCH VỤ ĐÔ THỊ';
    let labelColor = '#334155';

    if (tile.type === 'CHAOS') {
      emojiColor = worldConfig?.pack?.chaosPresentation?.accent || '#7c3aed';
      labelColor = emojiColor;
      label = (worldConfig?.pack?.chaosPresentation?.label?.vi || 'CƠ HỘI / BIẾN CỐ').toUpperCase();
      emoji = '⚡';
    } else if (tile.type === 'TAX') {
      emoji = '⚖️';
      emojiColor = '#ea580c';
      label = 'NỘP THUẾ PHÍ';
      labelColor = '#c2410c';
    } else if (tile.type === 'TRANSPORT') {
      emoji = '🚆';
      emojiColor = '#0284c7';
      label = 'VẬN TẢI';
      labelColor = '#0369a1';
    }

    ctx.font = `${Math.round(W * 0.34)}px ${FONT_STACK}`;
    ctx.fillStyle = emojiColor;
    ctx.fillText(emoji, cx, H * 0.55);

    const lPx = fitSingleLine(ctx, label, maxTextW, 56, 28, 800);
    ctx.fillStyle = labelColor;
    ctx.font = font(800, lPx);
    ctx.fillText(label, cx, H * 0.86);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8; // clamped to the GPU maximum by the renderer
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Camera-facing text label for a corner tile: heading across the top, caption near the bottom,
 * transparent in the middle so the tile's icon stays visible underneath.
 */
function createCornerLabelTexture(tile: BoardTile): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as any);
  }
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  let heading = '';
  let headingColor = '#0f172a';
  let caption = '';
  let captionColor = '#64748b';

  if (tile.id === 0) {
    heading = 'KHỞI HÀNH';
    headingColor = '#15803d';
    caption = `NHẬN ${formatMoney(200)}`;
    captionColor = '#0f172a';
  } else if (tile.id === 10) {
    heading = 'NHÀ LAO';
    headingColor = '#d97706';
    caption = 'THĂM / GIAM GIỮ';
  } else if (tile.id === 20) {
    heading = 'BÃI ĐỖ XE';
    headingColor = '#0284c7';
    caption = 'NGHỈ CHÂN MIỄN PHÍ';
  } else if (tile.id === 30) {
    heading = 'VÀO TÙ';
    headingColor = '#dc2626';
    caption = 'ĐI THẲNG VÀO LAO';
    captionColor = '#991b1b';
  }

  const cx = size / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Icon lives on this plate too, so it turns toward the camera together with the name.
  if (tile.id === 0) {
    // Only the direction of travel: a single clean arrow along the bottom edge (toward tile 1).
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 108, 288);
    ctx.lineTo(cx - 84, 288);
    ctx.stroke();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(cx - 150, 288);
    ctx.lineTo(cx - 56, 232);
    ctx.lineTo(cx - 56, 344);
    ctx.closePath();
    ctx.fill();
  } else if (tile.id === 10) {
    ctx.fillStyle = '#475569';
    for (let b = 0; b < 5; b++) {
      ctx.fillRect(168 + b * 44, 216, 14, 148);
    }
    ctx.fillRect(154, 216, 204, 14);
    ctx.fillRect(154, 350, 204, 14);
  } else if (tile.id === 20) {
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.arc(cx, 288, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = font(900, 104);
    ctx.fillText('P', cx, 292);
  } else if (tile.id === 30) {
    ctx.font = `118px ${FONT_STACK}`;
    ctx.fillStyle = '#b91c1c';
    ctx.fillText('🚨', cx, 288);
  }

  const hPx = fitSingleLine(ctx, heading, size - 60, 96, 44, 900);
  ctx.font = font(900, hPx);
  ctx.fillStyle = headingColor;
  ctx.fillText(heading, cx, 92);

  const cPx = fitSingleLine(ctx, caption, size - 60, 54, 30, 700);
  ctx.font = font(700, cPx);
  ctx.fillStyle = captionColor;
  ctx.fillText(caption, cx, 424);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * Creates 3D mesh representations for all 40 tiles with perimeter alignment.
 */
export function createAllTileMeshes(tiles: BoardTile[], worldConfig?: WorldConfig | null): TileMeshGroup[] {
  const result: TileMeshGroup[] = [];

  for (const tile of tiles) {
    const isCorner = tile.id % 10 === 0;
    const pos = getTile3DWorldPosition(tile.id);
    const rotY = getTileRotationY(tile.id);

    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.rotation.y = rotY;

    // Corner: square. Edge: (regularSpan - 0.06) wide, (cornerSpan - 0.06) deep.
    const w = isCorner ? CORNER_SPAN : REGULAR_SPAN - 0.06;
    const d = CORNER_SPAN - 0.06;
    const h = TILE_HEIGHT;

    const geometry = new THREE.BoxGeometry(w, h, d);
    const texture = createTileTexture(tile, worldConfig);

    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.45,
      metalness: 0.04,
    });

    // One material for the whole box = one draw call per tile instead of six.
    // The textured face is a separate plane laid on top (same result, cheaper).
    const tileMesh = new THREE.Mesh(geometry, sideMaterial);
    tileMesh.castShadow = true;
    tileMesh.receiveShadow = true;
    tileMesh.userData = { tileId: tile.id };
    group.add(tileMesh);

    const topGeo = new THREE.PlaneGeometry(w, d);
    topGeo.rotateX(-Math.PI / 2);
    const topMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.4,
      metalness: 0.02,
    });
    const topMesh = new THREE.Mesh(topGeo, topMaterial);
    topMesh.position.y = h / 2 + 0.004;
    topMesh.receiveShadow = true;
    topMesh.userData = { tileId: tile.id };
    group.add(topMesh);

    // Selection / hover highlight plane hovering just above the top surface
    const highlightGeo = new THREE.PlaneGeometry(w, d);
    highlightGeo.rotateX(-Math.PI / 2);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x16a34a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.position.y = h / 2 + 0.02;
    highlightMesh.renderOrder = 2;
    // Idle highlights are invisible; making them non-rendering removes ~40 wasted draw calls.
    highlightMesh.visible = false;
    group.add(highlightMesh);

    // Corner name plate: flat on the tile, turned toward the camera every frame by the scene
    // manager, so "NHÀ LAO" / "BÃI ĐỖ XE" never read sideways.
    let labelMesh: THREE.Mesh | undefined;
    if (isCorner) {
      const labelSize = Math.min(w, d) * 0.68;
      const labelGeo = new THREE.PlaneGeometry(labelSize, labelSize);
      labelGeo.rotateX(-Math.PI / 2);
      const labelMat = new THREE.MeshBasicMaterial({
        map: createCornerLabelTexture(tile),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.y = h / 2 + 0.035;
      labelMesh.renderOrder = 4;
      labelMesh.userData = { tileId: tile.id, labelBaseRotY: rotY };
      group.add(labelMesh);
    }

    result.push({
      group,
      tileMesh,
      topMesh,
      highlightMesh,
      tileId: tile.id,
      labelMesh,
    });
  }

  return result;
}

/**
 * Dynamically re-renders tile textures when the world or theme changes.
 */
export function updateAllTileMeshesWithWorld(
  tileMeshes: TileMeshGroup[],
  tiles: BoardTile[],
  worldConfig?: WorldConfig | null
): void {
  for (const item of tileMeshes) {
    const tile = tiles[item.tileId];
    if (!tile) continue;
    const topMat = item.topMesh.material as THREE.MeshStandardMaterial;
    if (topMat.map) {
      topMat.map.dispose();
    }
    topMat.map = createTileTexture(tile, worldConfig);
    topMat.needsUpdate = true;
  }
}

/** Releases GPU resources owned by tile meshes. */
export function disposeTileMeshes(tileMeshes: TileMeshGroup[]): void {
  for (const item of tileMeshes) {
    item.tileMesh.geometry.dispose();
    const mats = Array.isArray(item.tileMesh.material) ? item.tileMesh.material : [item.tileMesh.material];
    const seen = new Set<THREE.Material>();
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      (m as THREE.MeshStandardMaterial).map?.dispose();
      m.dispose();
    }
    item.topMesh.geometry.dispose();
    const topMat = item.topMesh.material as THREE.MeshStandardMaterial;
    topMat.map?.dispose();
    topMat.dispose();
    item.highlightMesh.geometry.dispose();
    (item.highlightMesh.material as THREE.Material).dispose();
    if (item.labelMesh) {
      item.labelMesh.geometry.dispose();
      const labelMat = item.labelMesh.material as THREE.MeshBasicMaterial;
      labelMat.map?.dispose();
      labelMat.dispose();
    }
  }
}
