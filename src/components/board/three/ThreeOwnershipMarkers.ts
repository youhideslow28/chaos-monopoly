/**
 * CHAOS MONOPOLY — 3D Ownership Markers
 * A coloured rail along the outer edge of every owned tile (owner's token colour),
 * greyed out when the property is mortgaged.
 */

import * as THREE from 'three';
import { PlayerState, PropertyOwnership } from '../../../game/types';
import { getTile3DWorldPosition, TILE_HEIGHT } from './threeCoordinates';
import { getTileRotationY } from './ThreeTileMeshes';

const CORNER_SPAN = 2.4;
const REGULAR_SPAN = (20 - CORNER_SPAN * 2) / 9;
const MORTGAGED_COLOR = '#64748b';

interface MarkerEntry {
  group: THREE.Group;
  key: string;
}

export class ThreeOwnershipManager {
  private container = new THREE.Group();
  private markers = new Map<number, MarkerEntry>();
  private geometry = new THREE.BoxGeometry(1, 1, 1);

  constructor(scene: THREE.Scene) {
    this.container.name = 'ThreeOwnershipContainer';
    scene.add(this.container);
  }

  public update(properties: Record<number, PropertyOwnership>, players: PlayerState[]): void {
    const colorByPlayer = new Map<string, string>();
    for (const p of players) {
      colorByPlayer.set(p.id, p.token?.colorHex || '#0284c7');
    }

    for (let tileId = 0; tileId < 40; tileId++) {
      const prop = properties?.[tileId];
      const ownerId = prop?.ownerId ?? null;
      const existing = this.markers.get(tileId);

      if (!ownerId || tileId % 10 === 0) {
        if (existing) this.removeMarker(tileId, existing);
        continue;
      }

      const mortgaged = !!prop?.isMortgaged;
      const color = mortgaged ? MORTGAGED_COLOR : colorByPlayer.get(ownerId) || '#0284c7';
      const key = `${color}|${mortgaged ? 1 : 0}`;
      if (existing?.key === key) continue;
      if (existing) this.removeMarker(tileId, existing);

      this.markers.set(tileId, { group: this.createMarker(tileId, color, mortgaged), key });
    }
  }

  private createMarker(tileId: number, colorHex: string, mortgaged: boolean): THREE.Group {
    const pos = getTile3DWorldPosition(tileId);
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.rotation.y = getTileRotationY(tileId);

    const w = REGULAR_SPAN - 0.06;
    const d = CORNER_SPAN - 0.06;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.3,
      metalness: 0.35,
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: mortgaged ? 0.02 : 0.28,
    });

    // Outer-edge rail (local +Z is the outside of the board)
    const rail = new THREE.Mesh(this.geometry, material);
    rail.scale.set(w * 0.9, 0.09, 0.2);
    rail.position.set(0, TILE_HEIGHT / 2 + 0.045, d / 2 - 0.13);
    rail.castShadow = true;
    group.add(rail);

    // Small end caps to read as a "flag" from a distance
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(this.geometry, material);
      cap.scale.set(0.12, 0.26, 0.2);
      cap.position.set(sx * (w * 0.45), TILE_HEIGHT / 2 + 0.13, d / 2 - 0.13);
      cap.castShadow = true;
      group.add(cap);
    }

    this.container.add(group);
    return group;
  }

  private removeMarker(tileId: number, entry: MarkerEntry): void {
    this.container.remove(entry.group);
    const seen = new Set<THREE.Material>();
    entry.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && !seen.has(mesh.material as THREE.Material)) {
        seen.add(mesh.material as THREE.Material);
        (mesh.material as THREE.Material).dispose();
      }
    });
    this.markers.delete(tileId);
  }

  public dispose(): void {
    for (const [tileId, entry] of [...this.markers.entries()]) {
      this.removeMarker(tileId, entry);
    }
    this.geometry.dispose();
  }
}
