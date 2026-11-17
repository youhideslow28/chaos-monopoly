/**
 * src/components/board/three/ThreeTrapMeshes.ts
 * Three.js 3D Volumetric Trap Markers:
 * 1. Abandoned Suitcase with Blinking LED
 * 2. Cybernetic EMP Mine with Rotating Disc
 * 3. Warning Hazard Sign with Blinking Beacon
 *
 * Owner view: glows player accent color.
 * Opponent view: neutral suspicious object.
 */

import * as THREE from 'three';
import { PlacedTrap, TrapType } from '../../../game/chaos-engine/trapEngine';
import { PlayerState } from '../../../game/types';
import { SpatialBoardGraph } from '../../../game/graph/spatialGraphTypes';
import { getTile3DWorldPosition, TILE_HEIGHT } from './threeCoordinates';

export interface TrapMeshEntry {
  id: string;
  nodeId: string;
  group: THREE.Group;
  ledMesh?: THREE.Mesh;
  rotatingMesh?: THREE.Mesh;
  accentMesh?: THREE.Mesh;
  pulseLight?: THREE.PointLight;
  isOwner: boolean;
  trapType: TrapType | 'HIDDEN';
}

export class ThreeTrapManager {
  private container: THREE.Group = new THREE.Group();
  private entries: Map<string, TrapMeshEntry> = new Map();
  private reducedMotion = false;

  constructor(scene: THREE.Scene) {
    this.container.name = 'ThreeTrapContainer';
    scene.add(this.container);
  }

  public getContainer(): THREE.Group {
    return this.container;
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /**
   * Synchronizes active trap meshes with GameState.placedTraps.
   */
  public syncWithTraps(
    traps: PlacedTrap[] = [],
    players: PlayerState[] = [],
    localPlayerId?: string | null,
    graph?: SpatialBoardGraph | null
  ): void {
    const activeTrapIds = new Set(traps.filter(t => !t.revealed).map(t => t.id));

    // Remove obsolete or triggered traps
    for (const [id, entry] of this.entries) {
      if (!activeTrapIds.has(id)) {
        this.disposeEntry(entry);
        this.entries.delete(id);
      }
    }

    // Player color mapping
    const playerColors = new Map<string, string>();
    for (const p of players) {
      playerColors.set(p.id, p.token?.accentHex || p.token?.colorHex || '#38bdf8');
    }

    // Add or update active traps
    for (const trap of traps) {
      if (trap.revealed) continue;

      const isOwner = Boolean(localPlayerId && trap.ownerPlayerId === localPlayerId);
      const ownerColor = playerColors.get(trap.ownerPlayerId) || '#38bdf8';
      let existing = this.entries.get(trap.id);

      if (!existing) {
        existing = this.createTrapMeshEntry(trap, isOwner, ownerColor, graph);
        this.entries.set(trap.id, existing);
      } else if (existing.isOwner !== isOwner) {
        // Perspective changed (e.g. spectator switch)
        this.disposeEntry(existing);
        existing = this.createTrapMeshEntry(trap, isOwner, ownerColor, graph);
        this.entries.set(trap.id, existing);
      }
    }
  }

  /**
   * Animation tick for pulsing LED and rotating EMP disc.
   */
  public tick(dt: number, now: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
    const blink = Math.sin(now * 0.008) > 0 ? 1.0 : 0.2;

    for (const entry of this.entries.values()) {
      // 1. Blinking LED / Beacon
      if (entry.ledMesh) {
        const mat = entry.ledMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = this.reducedMotion ? 1.0 : blink;
      }

      // 2. Rotating EMP Disc
      if (entry.rotatingMesh && !this.reducedMotion) {
        entry.rotatingMesh.rotation.y += dt * 1.5;
      }

      // 3. Pulsing Accent Glow for Owner
      if (entry.accentMesh && !this.reducedMotion) {
        const mat = entry.accentMesh.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = 0.4 + 0.4 * pulse;
        }
      }

      if (entry.pulseLight && !this.reducedMotion) {
        entry.pulseLight.intensity = 0.3 + 0.5 * pulse;
      }
    }
  }

  private createTrapMeshEntry(
    trap: PlacedTrap,
    isOwner: boolean,
    ownerAccentHex: string,
    graph?: SpatialBoardGraph | null
  ): TrapMeshEntry {
    const pos = getTile3DWorldPosition(trap.nodeId, graph);
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y + TILE_HEIGHT / 2 + 0.02, pos.z);
    this.container.add(group);

    let ledMesh: THREE.Mesh | undefined;
    let rotatingMesh: THREE.Mesh | undefined;
    let accentMesh: THREE.Mesh | undefined;
    let pulseLight: THREE.PointLight | undefined;

    if (trap.trapType === 'ROBBERY' || trap.trapType === 'SMUGGLER_BOON' || (trap.trapType as string) === 'HIDDEN') {
      // 1. Abandoned Suitcase
      const res = this.buildSuitcaseMesh(isOwner, ownerAccentHex);
      group.add(res.model);
      ledMesh = res.ledMesh;
      accentMesh = res.accentMesh;
      pulseLight = res.pulseLight;
    } else if (trap.trapType === 'LOCKDOWN') {
      // 2. Cybernetic EMP Mine
      const res = this.buildEMPMineMesh(isOwner, ownerAccentHex);
      group.add(res.model);
      rotatingMesh = res.rotatingMesh;
      accentMesh = res.accentMesh;
      pulseLight = res.pulseLight;
    } else {
      // 3. Warning Hazard Sign (TELEPORT_HAZARD)
      const res = this.buildHazardSignMesh(isOwner, ownerAccentHex);
      group.add(res.model);
      ledMesh = res.ledMesh;
      accentMesh = res.accentMesh;
      pulseLight = res.pulseLight;
    }

    return {
      id: trap.id,
      nodeId: trap.nodeId,
      group,
      ledMesh,
      rotatingMesh,
      accentMesh,
      pulseLight,
      isOwner,
      trapType: trap.trapType,
    };
  }

  private buildSuitcaseMesh(isOwner: boolean, ownerAccentHex: string) {
    const model = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2,
    });
    const bodyGeo = new THREE.BoxGeometry(0.38, 0.16, 0.24);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.08;
    body.castShadow = true;
    model.add(body);

    // Latches & Handle
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const latchGeo = new THREE.BoxGeometry(0.04, 0.06, 0.02);
    const l1 = new THREE.Mesh(latchGeo, metalMat);
    l1.position.set(-0.1, 0.08, 0.125);
    const l2 = new THREE.Mesh(latchGeo, metalMat);
    l2.position.set(0.1, 0.08, 0.125);
    model.add(l1, l2);

    // Blinking LED
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true });
    const ledGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.14, 0.16, 0.08);
    model.add(ledMesh);

    // Owner distinction glow
    let accentMesh: THREE.Mesh | undefined;
    let pulseLight: THREE.PointLight | undefined;
    if (isOwner) {
      const ringGeo = new THREE.RingGeometry(0.24, 0.32, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(ownerAccentHex),
        emissive: new THREE.Color(ownerAccentHex),
        emissiveIntensity: 0.6,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8,
      });
      accentMesh = new THREE.Mesh(ringGeo, ringMat);
      accentMesh.position.y = 0.005;
      model.add(accentMesh);

      pulseLight = new THREE.PointLight(ownerAccentHex, 0.6, 1.2);
      pulseLight.position.set(0, 0.2, 0);
      model.add(pulseLight);
    }

    return { model, ledMesh, accentMesh, pulseLight };
  }

  private buildEMPMineMesh(isOwner: boolean, ownerAccentHex: string) {
    const model = new THREE.Group();

    // Base puck
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.85,
    });
    const baseGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.06, 20);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.03;
    base.castShadow = true;
    model.add(base);

    // Rotating Outer Ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.8,
    });
    const ringGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16);
    const rotatingMesh = new THREE.Mesh(ringGeo, ringMat);
    rotatingMesh.position.y = 0.04;
    model.add(rotatingMesh);

    // Center Core
    const coreColor = isOwner ? ownerAccentHex : '#f59e0b';
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(coreColor),
      emissive: new THREE.Color(coreColor),
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const coreGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const accentMesh = new THREE.Mesh(coreGeo, coreMat);
    accentMesh.position.y = 0.07;
    model.add(accentMesh);

    const pulseLight = new THREE.PointLight(coreColor, 0.8, 1.5);
    pulseLight.position.set(0, 0.15, 0);
    model.add(pulseLight);

    return { model, rotatingMesh, accentMesh, pulseLight };
  }

  private buildHazardSignMesh(isOwner: boolean, ownerAccentHex: string) {
    const model = new THREE.Group();

    // Base Stanchion
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const poleGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.32, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0.16;
    model.add(pole);

    // Footing
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const baseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.03, 8);
    const footing = new THREE.Mesh(baseGeo, baseMat);
    footing.position.y = 0.015;
    model.add(footing);

    // Triangle Board
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
      metalness: 0.2,
    });
    const signGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 3);
    signGeo.rotateX(Math.PI / 2);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 0.28, 0.02);
    model.add(sign);

    // Beacon Light
    const beaconColor = isOwner ? ownerAccentHex : '#f97316';
    const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(beaconColor), transparent: true });
    const ledGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0, 0.38, 0);
    model.add(ledMesh);

    const pulseLight = new THREE.PointLight(beaconColor, 0.7, 1.2);
    pulseLight.position.set(0, 0.38, 0);
    model.add(pulseLight);

    return { model, ledMesh, accentMesh: sign, pulseLight };
  }

  public dispose(): void {
    for (const entry of this.entries.values()) {
      this.disposeEntry(entry);
    }
    this.entries.clear();
    if (this.container.parent) {
      this.container.parent.remove(this.container);
    }
  }

  private disposeEntry(entry: TrapMeshEntry): void {
    this.container.remove(entry.group);
    entry.group.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }
}
