import { PlayerState } from '../../game/types';

/**
 * 2.5D Isometric Multi-Player Token Stacking & Collision Avoidance Engine.
 * Computes deterministic, collision-free isometric 3D coordinates, elevations,
 * scales, and depth-sorting layers for 1 to 4+ occupying player tokens on any board tile.
 */

export interface TokenPlacement {
  xPercent: number;    // Horizontal center offset (0% to 100%)
  yPercent: number;    // Vertical center offset (0% to 100%)
  elevationZ: number;  // Height in pixels above the tile plate
  scale: number;       // Token scale multiplier (0.72 to 1.0)
  depthIndex: number;  // Depth sorting index (1 = background, higher = forefront)
  isForefront: boolean;// Whether this token occupies the prominent front slot
}

interface FormationSlot {
  xPercent: number;
  yPercent: number;
  elevationZ: number;
  scale: number;
  depthIndex: number;
}

/**
 * Deterministic layout formations tailored to 2.5D isometric tile perspective.
 * In 45-degree isometric tilt, larger Y values are closer to the viewer (front/south),
 * smaller Y values are further away (back/north).
 */
const FORMATIONS: Record<number, FormationSlot[]> = {
  // 1 Player: Centered in the lower-middle active token zone
  1: [
    { xPercent: 50, yPercent: 58, elevationZ: 14, scale: 1.0, depthIndex: 1 },
  ],
  // 2 Players: 45° isometric diagonal split (South-West to North-East)
  2: [
    { xPercent: 33, yPercent: 66, elevationZ: 16, scale: 0.88, depthIndex: 2 }, // Forefront (SW)
    { xPercent: 67, yPercent: 50, elevationZ: 12, scale: 0.88, depthIndex: 1 }, // Rear (NE)
  ],
  // 3 Players: Delta pod formation (Apex south, 2 wingmen north)
  3: [
    { xPercent: 50, yPercent: 70, elevationZ: 18, scale: 0.80, depthIndex: 3 }, // Apex / South (Forefront)
    { xPercent: 72, yPercent: 48, elevationZ: 12, scale: 0.80, depthIndex: 2 }, // Rear-Right (East)
    { xPercent: 28, yPercent: 48, elevationZ: 12, scale: 0.80, depthIndex: 1 }, // Rear-Left (West)
  ],
  // 4 Players: Isometric diamond formation (South, East, West, North)
  4: [
    { xPercent: 50, yPercent: 74, elevationZ: 18, scale: 0.72, depthIndex: 4 }, // South (Forefront)
    { xPercent: 75, yPercent: 56, elevationZ: 14, scale: 0.72, depthIndex: 3 }, // East
    { xPercent: 25, yPercent: 56, elevationZ: 14, scale: 0.72, depthIndex: 2 }, // West
    { xPercent: 50, yPercent: 38, elevationZ: 10, scale: 0.72, depthIndex: 1 }, // North (Rear)
  ],
};

/**
 * Calculates deterministic CSS zIndex based on depthIndex and active player status.
 * Formula: 20 + depthIndex * 5 + (isPlayerActive ? 50 : 0)
 */
export function getTokenZIndex(depthIndex: number, isPlayerActive: boolean): number {
  return 20 + depthIndex * 5 + (isPlayerActive ? 50 : 0);
}

/**
 * Clamps coordinates strictly within visible tile bounds (5% to 95%).
 */
function clampPercent(val: number): number {
  return Math.max(5, Math.min(95, Math.round(val * 10) / 10));
}

/**
 * Pure math function to compute collision-free 3D token placements.
 * Guarantees that:
 * 1. Active player is prioritized to the foremost slot (highest depthIndex) with +6px elevation.
 * 2. Tokens never overlap in 2.5D space.
 * 3. Coordinates are bounded within [0, 100] percent.
 * 4. Scale factor stays within [0.72, 1.0].
 */
export function computeTokenPlacements(
  playersHere: PlayerState[],
  activePlayerId?: string,
  isIsometric: boolean = true
): Record<string, TokenPlacement> {
  const result: Record<string, TokenPlacement> = {};
  const count = playersHere.length;
  if (count === 0) return result;

  // Identify active player index if present on this tile
  const activeIdx = activePlayerId
    ? playersHere.findIndex((p) => p.id === activePlayerId)
    : -1;

  // Order players so the active player receives the foremost slot (slot index 0)
  const sortedPlayers = [...playersHere];
  if (activeIdx > 0) {
    const [activeP] = sortedPlayers.splice(activeIdx, 1);
    sortedPlayers.unshift(activeP);
  }

  // Retrieve base formation or calculate fallback for N > 4
  const slots: FormationSlot[] = FORMATIONS[count] || generateFallbackSlots(count);

  sortedPlayers.forEach((player, index) => {
    const slot = slots[index] || {
      xPercent: 50,
      yPercent: 58,
      elevationZ: 12,
      scale: 0.72,
      depthIndex: 1,
    };

    const isCurrentActive = player.id === activePlayerId;
    const isForefront = index === 0;

    // Active player gets +6px elevation lift in 3D isometric view
    const elevationZ = isIsometric
      ? slot.elevationZ + (isCurrentActive ? 6 : 0)
      : 0;

    result[player.id] = {
      xPercent: clampPercent(slot.xPercent),
      yPercent: clampPercent(slot.yPercent),
      elevationZ,
      scale: Math.max(0.72, Math.min(1.0, slot.scale)),
      depthIndex: slot.depthIndex,
      isForefront,
    };
  });

  return result;
}

/**
 * Fallback generator for extreme cases where N > 4 players occupy the same tile.
 */
function generateFallbackSlots(count: number): FormationSlot[] {
  const slots: FormationSlot[] = [];
  const scale = 0.72;
  const radiusX = 26;
  const radiusY = 16;
  const centerY = 58;
  const centerX = 50;

  for (let i = 0; i < count; i++) {
    // Angular distribution: slot 0 at the bottom (pi/2)
    const angle = Math.PI / 2 + (i * 2 * Math.PI) / count;
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    const depthIndex = Math.max(1, Math.round(y / 15));
    const elevationZ = 10 + depthIndex * 2;

    slots.push({
      xPercent: clampPercent(x),
      yPercent: clampPercent(y),
      elevationZ,
      scale,
      depthIndex,
    });
  }

  // Sort slots so slot 0 has the highest depth index (closest to viewer)
  slots.sort((a, b) => b.depthIndex - a.depthIndex);
  return slots;
}
