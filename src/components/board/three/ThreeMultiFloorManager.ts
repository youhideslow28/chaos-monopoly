import * as THREE from 'three';
import { SpatialBoardGraph } from '../../../game/graph/spatialGraphTypes';
import { CORNER_SPAN, getTile3DWorldPosition } from './threeCoordinates';

export interface FloorPlatformGroup {
  floorIndex: number;
  elevationY: number;
  slabMesh: THREE.Mesh;
  labelGroup: THREE.Group;
}

export class ThreeMultiFloorManager {
  private container: THREE.Group = new THREE.Group();
  private platforms: FloorPlatformGroup[] = [];
  private supportColumns: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.container);
  }

  public getContainer(): THREE.Group {
    return this.container;
  }

  public buildFloors(graph: SpatialBoardGraph): void {
    this.dispose();
    if (!graph.floors || graph.floors.length <= 1) return;

    for (const floor of graph.floors) {
      if (floor.floorIndex === 0) continue; // Floor 0 uses the main ground slab

      // Compute bounding box of nodes on this floor
      const floorNodes = floor.nodeIds.map(id => graph.nodes[id]).filter(Boolean);
      if (floorNodes.length === 0) continue;

      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (const n of floorNodes) {
        const pos = getTile3DWorldPosition(n, graph);
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minZ = Math.min(minZ, pos.z);
        maxZ = Math.max(maxZ, pos.z);
      }

      const pad = CORNER_SPAN / 2 + 0.3;
      const width = (maxX - minX) + pad * 2;
      const depth = (maxZ - minZ) + pad * 2;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      // Volumetric concrete/metal floor platform
      const geo = new THREE.BoxGeometry(width, 0.4, depth);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.25,
      });
      const slabMesh = new THREE.Mesh(geo, mat);
      slabMesh.position.set(centerX, floor.elevationY - 0.2, centerZ);
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = true;
      this.container.add(slabMesh);

      // Floor name label
      const labelGroup = this.createFloorLabel(floor.name || `FLOOR ${floor.floorIndex + 1}`, centerX, floor.elevationY, depth / 2 + centerZ);
      this.container.add(labelGroup);

      this.platforms.push({
        floorIndex: floor.floorIndex,
        elevationY: floor.elevationY,
        slabMesh,
        labelGroup,
      });

      // Corner support columns down to previous floor
      this.buildColumns(minX - pad + 0.2, maxX + pad - 0.2, minZ - pad + 0.2, maxZ + pad - 0.2, floor.elevationY);
    }
  }

  private buildColumns(minX: number, maxX: number, minZ: number, maxZ: number, topY: number): void {
    const colGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.5, 8);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const corners = [
      [minX, minZ],
      [maxX, minZ],
      [minX, maxZ],
      [maxX, maxZ],
    ];
    for (const [cx, cz] of corners) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, topY - 1.75, cz);
      col.castShadow = true;
      this.container.add(col);
      this.supportColumns.push(col);
    }
  }

  private createFloorLabel(_text: string, x: number, y: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    return group;
  }

  public dispose(): void {
    for (const p of this.platforms) {
      this.container.remove(p.slabMesh);
      p.slabMesh.geometry.dispose();
      if (Array.isArray(p.slabMesh.material)) {
        p.slabMesh.material.forEach(m => m.dispose());
      } else {
        p.slabMesh.material.dispose();
      }
      this.container.remove(p.labelGroup);
    }
    for (const c of this.supportColumns) {
      this.container.remove(c);
      c.geometry.dispose();
      if (Array.isArray(c.material)) {
        c.material.forEach(m => m.dispose());
      } else {
        c.material.dispose();
      }
    }
    this.platforms = [];
    this.supportColumns = [];
  }
}
