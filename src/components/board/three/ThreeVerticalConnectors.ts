import * as THREE from 'three';
import { SpatialBoardGraph, BoardNode } from '../../../game/graph/spatialGraphTypes';
import { getTile3DWorldPosition, Vector3 } from './threeCoordinates';

export class ThreeVerticalConnectors {
  private container: THREE.Group = new THREE.Group();
  private connectorMeshes: THREE.Group[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.container);
  }

  public getContainer(): THREE.Group {
    return this.container;
  }

  public syncConnectors(graph: SpatialBoardGraph): void {
    this.dispose();
    if (!graph.nodes) return;

    // Detect cross-floor transitions
    const processedPairs = new Set<string>();

    for (const node of Object.values(graph.nodes)) {
      for (const targetId of node.connectedNodeIds) {
        const targetNode = graph.nodes[targetId];
        if (!targetNode) continue;

        if (node.floor !== targetNode.floor) {
          const pairKey = [node.id, targetNode.id].sort().join('<->');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const posA = getTile3DWorldPosition(node, graph);
          const posB = getTile3DWorldPosition(targetNode, graph);

          // Decide connector type based on node properties or edge metadata
          const isElevator =
            node.type === 'TRANSPORT' ||
            targetNode.type === 'TRANSPORT' ||
            Math.abs(posA.x - posB.x) < 1.0;

          if (isElevator) {
            this.buildElevatorShaft(posA, posB, node, targetNode);
          } else {
            this.buildStairwell(posA, posB);
          }
        }
      }
    }
  }

  /**
   * Builds vertical elevator shaft (metal cage, hoist cables, cabin, $50 toll badge)
   */
  private buildElevatorShaft(bottom: Vector3, top: Vector3, _nodeA: BoardNode, _nodeB: BoardNode): void {
    const group = new THREE.Group();
    const minY = Math.min(bottom.y, top.y);
    const maxY = Math.max(bottom.y, top.y);
    const height = Math.max(0.5, maxY - minY);
    const midX = (bottom.x + top.x) / 2;
    const midZ = (bottom.z + top.z) / 2;
    const midY = (minY + maxY) / 2;

    const w = 1.0;
    const d = 1.0;

    // 1. Four corner steel posts
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, height, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.2 });
    const postOffsets = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [-w / 2, d / 2],
      [w / 2, d / 2],
    ];
    for (const [ox, oz] of postOffsets) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(midX + ox, midY, midZ + oz);
      group.add(post);
    }

    // 2. Horizontal cage ribs every 0.8 units
    const ribCount = Math.floor(height / 0.8);
    const ringGeo = new THREE.BoxGeometry(w + 0.04, 0.03, d + 0.04);
    for (let i = 0; i <= ribCount; i++) {
      const ring = new THREE.Mesh(ringGeo, postMat);
      ring.position.set(midX, minY + i * 0.8, midZ);
      group.add(ring);
    }

    // 3. Semi-transparent cyan glass panel
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.9,
    });
    const panelGeoZ = new THREE.PlaneGeometry(w, height);
    const panelBack = new THREE.Mesh(panelGeoZ, glassMat);
    panelBack.position.set(midX, midY, midZ - d / 2);
    group.add(panelBack);

    // 4. Elevator cabin box (resting at lower level)
    const cabinGeo = new THREE.BoxGeometry(0.8, 0.9, 0.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(midX, minY + 0.5, midZ);
    cabin.castShadow = true;
    group.add(cabin);

    // 5. Toll badge ("$50 TOLL" neon header)
    const tollBadgeGeo = new THREE.PlaneGeometry(0.7, 0.25);
    tollBadgeGeo.rotateX(-Math.PI / 4);
    const tollBadgeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const tollSign = new THREE.Mesh(tollBadgeGeo, tollBadgeMat);
    tollSign.position.set(midX, minY + 1.1, midZ + d / 2 + 0.05);
    group.add(tollSign);

    this.container.add(group);
    this.connectorMeshes.push(group);
  }

  /**
   * Builds inclined industrial metal stairwell with steps and yellow safety rails
   */
  private buildStairwell(posA: Vector3, posB: Vector3): void {
    const group = new THREE.Group();
    const bottom = posA.y <= posB.y ? posA : posB;
    const top = posA.y > posB.y ? posA : posB;
    const deltaY = Math.max(0.2, top.y - bottom.y);
    const stepCount = Math.max(4, Math.round(deltaY / 0.22));

    const stepWidth = 0.8;
    const stepDepth = 0.26;
    const stepHeight = 0.04;
    const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 });
    const hazardStripeMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });

    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      const sx = bottom.x + (top.x - bottom.x) * t;
      const sy = bottom.y + deltaY * t;
      const sz = bottom.z + (top.z - bottom.z) * t;

      const stepMesh = new THREE.Mesh(stepGeo, stepMat);
      stepMesh.position.set(sx, sy, sz);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      group.add(stepMesh);

      // Yellow hazard edge
      if (i % 2 === 0) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, 0.01, 0.04), hazardStripeMat);
        stripe.position.set(sx, sy + 0.025, sz + stepDepth / 2);
        group.add(stripe);
      }
    }

    // Safety handrails along the slope
    const railMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6, roughness: 0.3 });
    const railDist = Math.max(0.5, Math.hypot(top.x - bottom.x, top.y - bottom.y, top.z - bottom.z));
    const railGeo = new THREE.CylinderGeometry(0.025, 0.025, railDist, 8);
    railGeo.rotateX(Math.PI / 2);

    for (const side of [-stepWidth / 2, stepWidth / 2]) {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set((bottom.x + top.x) / 2 + side, (bottom.y + top.y) / 2 + 0.45, (bottom.z + top.z) / 2);
      rail.lookAt(top.x + side, top.y + 0.45, top.z);
      group.add(rail);
    }

    this.container.add(group);
    this.connectorMeshes.push(group);
  }

  public dispose(): void {
    for (const g of this.connectorMeshes) {
      this.container.remove(g);
      g.traverse(obj => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach(mat => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    }
    this.connectorMeshes = [];
  }
}
