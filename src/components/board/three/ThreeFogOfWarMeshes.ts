/**
 * CHAOS MONOPOLY — Urban Fog of War 3D Meshes
 * Renders localized volumetric smog, muted dark tile shaders, 3D barrier gates,
 * and coordinates smooth 1500ms unlock transition animations.
 */

import * as THREE from 'three';
import { SpatialBoardGraph } from '../../../game/graph/spatialGraphTypes';
import { FogOfWarState } from '../../../game/graph/urbanFogOfWarEngine';
import { getTile3DWorldPosition, getTile3DDimensions, TILE_HEIGHT } from './threeCoordinates';

export interface LockedZoneVisualGroup {
  zoneId: string;
  nodeIds: string[];
  container: THREE.Group;
  shroudBox: THREE.Mesh | null;
  particlePoints: THREE.Points | null;
  particlePositions: Float32Array | null;
  particleVelocities: Float32Array | null;
  barrierGates: THREE.Group[];
  tileOverlays: THREE.Mesh[];
  isLocked: boolean;
  unlockAnimation: {
    startTime: number;
    duration: number; // 1500ms
  } | null;
}

export class ThreeFogOfWarManager {
  private container: THREE.Group = new THREE.Group();
  private zoneGroups: Map<string, LockedZoneVisualGroup> = new Map();

  constructor(scene: THREE.Scene) {
    scene.add(this.container);
  }

  public getContainer(): THREE.Group {
    return this.container;
  }

  /**
   * Synchronizes 3D meshes with the current graph and FogOfWarState.
   */
  public syncWithGraph(graph: SpatialBoardGraph, fogState?: FogOfWarState): void {
    if (!graph.zones) return;

    const currentZoneIds = new Set(Object.keys(graph.zones));

    // Remove zones no longer present
    for (const [zoneId, group] of this.zoneGroups) {
      if (!currentZoneIds.has(zoneId)) {
        this.disposeZoneGroup(group);
        this.zoneGroups.delete(zoneId);
      }
    }

    // Build or update zones
    for (const [zoneId, zoneDef] of Object.entries(graph.zones)) {
      const isLocked = fogState ? !fogState.unlockedZones[zoneId] : Boolean(zoneDef.isLocked);
      let existing = this.zoneGroups.get(zoneId);

      if (!existing) {
        existing = this.createLockedZoneGroup(zoneId, zoneDef.nodeIds, graph, isLocked);
        this.zoneGroups.set(zoneId, existing);
      } else {
        // Handle unlock transition trigger
        if (existing.isLocked && !isLocked && !existing.unlockAnimation) {
          this.triggerUnlockAnimation(zoneId);
        }
      }
    }
  }

  /**
   * Triggers the 1500ms smooth unlock animation for a zone.
   */
  public triggerUnlockAnimation(zoneId: string): void {
    const group = this.zoneGroups.get(zoneId);
    if (!group) return;

    group.unlockAnimation = {
      startTime: Date.now(),
      duration: 1500,
    };
    group.isLocked = false;
  }

  /**
   * Instantiates visual meshes for a locked zone.
   */
  private createLockedZoneGroup(
    zoneId: string,
    nodeIds: string[],
    graph: SpatialBoardGraph,
    isLocked: boolean
  ): LockedZoneVisualGroup {
    const groupContainer = new THREE.Group();
    this.container.add(groupContainer);

    const nodes = nodeIds.map(id => graph.nodes[id]).filter(Boolean);
    if (nodes.length === 0) {
      return {
        zoneId,
        nodeIds,
        container: groupContainer,
        shroudBox: null,
        particlePoints: null,
        particlePositions: null,
        particleVelocities: null,
        barrierGates: [],
        tileOverlays: [],
        isLocked,
        unlockAnimation: null,
      };
    }

    const tileOverlays: THREE.Mesh[] = [];
    const barrierGates: THREE.Group[] = [];

    // Dark tile overlays for locked nodes
    for (const node of nodes) {
      const pos = getTile3DWorldPosition(node, graph);
      const dims = getTile3DDimensions(node, graph);

      const overlayGeo = new THREE.PlaneGeometry(dims.width, dims.depth);
      overlayGeo.rotateX(-Math.PI / 2);
      const overlayMat = new THREE.MeshBasicMaterial({
        color: 0x181820,
        transparent: true,
        opacity: isLocked ? 0.82 : 0.0,
      });
      const overlay = new THREE.Mesh(overlayGeo, overlayMat);
      overlay.position.set(pos.x, pos.y + TILE_HEIGHT / 2 + 0.01, pos.z);
      groupContainer.add(overlay);
      tileOverlays.push(overlay);

      // Create barrier gate if node connects to an unlocked boundary
      for (const targetId of node.connectedNodeIds) {
        const targetNode = graph.nodes[targetId];
        if (targetNode && !targetNode.isLocked && !nodeIds.includes(targetId)) {
          const gate = this.createBarrierGate(pos, getTile3DWorldPosition(targetNode, graph));
          groupContainer.add(gate);
          barrierGates.push(gate);
        }
      }
    }

    // Volumetric smog particle points
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const node of nodes) {
      const pos = getTile3DWorldPosition(node, graph);
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxZ = Math.max(maxZ, pos.z);
    }

    const particleCount = 40;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = minX + Math.random() * (maxX - minX + 1.0) - 0.5;
      positions[i * 3 + 1] = minY + Math.random() * (maxY - minY + 1.5);
      positions[i * 3 + 2] = minZ + Math.random() * (maxZ - minZ + 1.0) - 0.5;

      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.2;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x475569,
      size: 0.6,
      transparent: true,
      opacity: isLocked ? 0.6 : 0.0,
    });
    const particlePoints = new THREE.Points(pGeo, pMat);
    groupContainer.add(particlePoints);

    return {
      zoneId,
      nodeIds,
      container: groupContainer,
      shroudBox: null,
      particlePoints,
      particlePositions: positions,
      particleVelocities: velocities,
      barrierGates,
      tileOverlays,
      isLocked,
      unlockAnimation: null,
    };
  }

  private createBarrierGate(posA: { x: number; y: number; z: number }, posB: { x: number; y: number; z: number }): THREE.Group {
    const group = new THREE.Group();
    const midX = (posA.x + posB.x) / 2;
    const midY = (posA.y + posB.y) / 2;
    const midZ = (posA.z + posB.z) / 2;

    const barricadeGeo = new THREE.BoxGeometry(0.8, 0.4, 0.2);
    const barricadeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const barricade = new THREE.Mesh(barricadeGeo, barricadeMat);
    barricade.position.set(midX, midY + 0.2, midZ);
    group.add(barricade);

    return group;
  }

  /**
   * Per-frame animation tick updating smog drift and handling unlock transitions.
   */
  public tick(_delta: number, now: number = Date.now()): void {
    for (const group of this.zoneGroups.values()) {
      // 1. Particle drift
      if (group.particlePoints && group.particlePositions && group.particleVelocities) {
        const positions = group.particlePositions;
        const velocities = group.particleVelocities;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          positions[i * 3 + 0] += velocities[i * 3 + 0] * 0.05;
          positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.05;
          positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.05;
        }
        group.particlePoints.geometry.attributes.position.needsUpdate = true;
      }

      // 2. Unlock transition animation
      if (group.unlockAnimation) {
        const elapsed = now - group.unlockAnimation.startTime;
        const progress = Math.min(1.0, elapsed / group.unlockAnimation.duration);

        // Fade out dark overlays
        const overlayOpacity = Math.max(0, 0.82 * (1.0 - progress));
        for (const overlay of group.tileOverlays) {
          (overlay.material as THREE.MeshBasicMaterial).opacity = overlayOpacity;
        }

        // Fade out particle smog
        if (group.particlePoints) {
          (group.particlePoints.material as THREE.PointsMaterial).opacity = Math.max(0, 0.6 * (1.0 - progress));
        }

        // Sink barricade gates
        for (const gate of group.barrierGates) {
          gate.position.y = -progress * 1.5;
        }

        if (progress >= 1.0) {
          group.unlockAnimation = null;
          // Completed: hide overlays
          for (const overlay of group.tileOverlays) {
            overlay.visible = false;
          }
          if (group.particlePoints) {
            group.particlePoints.visible = false;
          }
          for (const gate of group.barrierGates) {
            gate.visible = false;
          }
        }
      }
    }
  }

  private disposeZoneGroup(group: LockedZoneVisualGroup): void {
    this.container.remove(group.container);
    for (const overlay of group.tileOverlays) {
      overlay.geometry.dispose();
      (overlay.material as THREE.Material).dispose();
    }
    if (group.particlePoints) {
      group.particlePoints.geometry.dispose();
      (group.particlePoints.material as THREE.Material).dispose();
    }
    for (const gate of group.barrierGates) {
      gate.traverse(obj => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
          else m.material?.dispose();
        }
      });
    }
    group.tileOverlays = [];
    group.barrierGates = [];
  }

  public dispose(): void {
    for (const group of this.zoneGroups.values()) {
      this.disposeZoneGroup(group);
    }
    this.zoneGroups.clear();
  }
}
