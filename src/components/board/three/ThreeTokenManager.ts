/**
 * CHAOS MONOPOLY — 3D Player Token Manager
 * Places one token per player on the board with collision-free radial stacking,
 * animates tile-to-tile hops with a single shared tween loop (driven by `tick`),
 * and marks the active player with a pulsing ring.
 */

import * as THREE from 'three';
import { PlayerState } from '../../../game/types';
import { getTile3DWorldPosition, TILE_HEIGHT } from './threeCoordinates';
import { buildTokenGroup } from './ThreeTokenMeshes';

/** Matches the 110ms step interval used by BoardView's hop animation. */
const HOP_DURATION_MS = 120;
const HOP_HEIGHT = 0.45;
/** Anything farther than this is a teleport (jail, chaos card), not a hop. */
const MAX_HOP_DISTANCE = 12;

interface Tween {
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  startTime: number | null;
}

interface TokenEntry {
  group: THREE.Group;
  ring: THREE.Mesh;
  baseY: number;
  tween: Tween | null;
  tileId: number;
}

export class ThreeTokenManager {
  private container: THREE.Group;
  private entries: Map<string, TokenEntry> = new Map();
  private activePlayerId: string | null = null;
  private reducedMotion = false;

  constructor(scene: THREE.Scene) {
    this.container = new THREE.Group();
    this.container.name = 'ThreeTokenContainer';
    scene.add(this.container);
  }

  /** When enabled, tokens jump straight to their tile and the active ring stops pulsing. */
  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (!reduced) return;
    for (const entry of this.entries.values()) {
      if (!entry.tween) continue;
      entry.group.position.set(entry.tween.targetX, entry.baseY, entry.tween.targetZ);
      entry.tween = null;
    }
  }

  private createRing(colorHex: string): THREE.Mesh {
    const geo = new THREE.RingGeometry(0.5, 0.62, 40);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.y = 0.02;
    ring.renderOrder = 3;
    ring.visible = false;
    return ring;
  }

  /**
   * Syncs 3D tokens with game state. Safe to call on every state change:
   * tokens only start a new hop when their target slot actually changes.
   */
  public updateTokens(
    players: PlayerState[],
    visualPositions: Record<string, number>,
    activePlayerId: string | null = null
  ): void {
    this.activePlayerId = activePlayerId;

    const playersByTile: Record<number, PlayerState[]> = {};
    for (const p of players) {
      if (p.isBankrupt) continue;
      const tilePos = visualPositions[p.id] ?? p.position;
      if (!playersByTile[tilePos]) playersByTile[tilePos] = [];
      playersByTile[tilePos].push(p);
    }

    const now = performance.now();

    for (const tileIdStr of Object.keys(playersByTile)) {
      const tileId = parseInt(tileIdStr, 10);
      const groupHere = playersByTile[tileId];
      const count = groupHere.length;
      const worldPos = getTile3DWorldPosition(tileId);

      groupHere.forEach((player, index) => {
        let entry = this.entries.get(player.id);
        const isNew = !entry;

        if (!entry) {
          const group = buildTokenGroup(player.token);
          group.userData = { playerId: player.id };
          const ring = this.createRing(player.token.colorHex || '#0284c7');
          group.add(ring);
          this.container.add(group);
          entry = { group, ring, baseY: 0, tween: null, tileId };
          this.entries.set(player.id, entry);
        }

        let offsetX = 0;
        let offsetZ = 0;
        if (count === 2) {
          const sign = index === 0 ? -1 : 1;
          offsetX = sign * 0.36;
          offsetZ = sign * 0.18;
        } else if (count === 3) {
          const angle = (index * 2 * Math.PI) / 3;
          offsetX = Math.cos(angle) * 0.42;
          offsetZ = Math.sin(angle) * 0.42;
        } else if (count >= 4) {
          const angle = (index * Math.PI) / 2;
          offsetX = Math.cos(angle) * 0.46;
          offsetZ = Math.sin(angle) * 0.46;
        }

        const targetX = worldPos.x + offsetX;
        const targetZ = worldPos.z + offsetZ;
        const baseY = worldPos.y + TILE_HEIGHT / 2;
        entry.baseY = baseY;
        entry.tileId = tileId;

        // Already heading to (or standing on) this exact slot: nothing to do.
        if (entry.tween && entry.tween.targetX === targetX && entry.tween.targetZ === targetZ) {
          return;
        }

        const curX = entry.group.position.x;
        const curZ = entry.group.position.z;
        const dist = Math.hypot(targetX - curX, targetZ - curZ);

        if (isNew || this.reducedMotion || dist < 0.02 || dist > MAX_HOP_DISTANCE) {
          entry.tween = null;
          entry.group.position.set(targetX, baseY, targetZ);
        } else {
          entry.group.rotation.y = Math.atan2(targetX - curX, targetZ - curZ);
          entry.tween = { startX: curX, startZ: curZ, targetX, targetZ, startTime: now };
        }
      });
    }

    // Remove bankrupt / missing players
    for (const [playerId, entry] of [...this.entries.entries()]) {
      const active = players.find((p) => p.id === playerId && !p.isBankrupt);
      if (!active) {
        this.removeEntry(playerId, entry);
      }
    }
  }

  /** Advances hop tweens and pulses the active ring. Call once per rendered frame. */
  public tick(nowMs: number): void {
    const pulse = this.reducedMotion ? 1 : 1 + 0.12 * Math.sin(nowMs * 0.005);
    for (const [playerId, entry] of this.entries) {
      const tw = entry.tween;
      if (tw) {
        const start = tw.startTime ?? nowMs;
        const progress = Math.min(1, Math.max(0, (nowMs - start) / HOP_DURATION_MS));
        const ease = 1 - Math.pow(1 - progress, 2);
        entry.group.position.x = tw.startX + (tw.targetX - tw.startX) * ease;
        entry.group.position.z = tw.startZ + (tw.targetZ - tw.startZ) * ease;
        entry.group.position.y = entry.baseY + Math.sin(progress * Math.PI) * HOP_HEIGHT;
        if (progress >= 1) {
          entry.group.position.set(tw.targetX, entry.baseY, tw.targetZ);
          entry.tween = null;
        }
      }

      const isActive = playerId === this.activePlayerId;
      entry.ring.visible = isActive;
      if (isActive) entry.ring.scale.setScalar(pulse);
    }
  }

  private removeEntry(playerId: string, entry: TokenEntry): void {
    this.container.remove(entry.group);
    this.disposeGroup(entry.group);
    this.entries.delete(playerId);
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    });
  }

  public dispose(): void {
    for (const [playerId, entry] of [...this.entries.entries()]) {
      this.removeEntry(playerId, entry);
    }
  }
}
