/**
 * CHAOS MONOPOLY — 3D Architectural Building Mesh Factory
 * Distinct 3D architectures for Tiers 1 through 5:
 * Level 1: Suburban Cottage / Villa
 * Level 2: Two-Story Duplex / Townhouse
 * Level 3: Multi-Wing Residential Estate
 * Level 4: Luxury Manor / Mid-Rise Complex
 * Level 5: Grand Landmark Hotel / Skyscraper
 * Smooth construction rise animation & world-themed materials.
 */

import * as THREE from 'three';
import { getTile3DWorldPosition, TILE_HEIGHT } from './threeCoordinates';
import { getTileRotationY } from './ThreeTileMeshes';

export interface PropertyOwnershipState {
  ownerId: string | null;
  level: number;
  isMortgaged?: boolean;
  tileId?: number;
}

// World palette styling for building materials
interface BuildingTheme {
  wallColor: number;
  roofColor: number;
  accentColor: number;
  glassColor: number;
  metalness: number;
  roughness: number;
}

function getBuildingTheme(worldId: string = 'modern-metropolis'): BuildingTheme {
  switch (worldId) {
    case 'cyberpunk-city':
      return {
        wallColor: 0x1e1b2e,
        roofColor: 0x7c3aed,
        accentColor: 0x06b6d4,
        glassColor: 0x38bdf8,
        metalness: 0.45,
        roughness: 0.25,
      };
    case 'mekong-delta':
      return {
        wallColor: 0xfef3c7, // Warm bamboo / teak cream
        roofColor: 0xb45309, // Clay terracotta
        accentColor: 0x15803d, // Tropical green
        glassColor: 0xbae6fd,
        metalness: 0.05,
        roughness: 0.65,
      };
    case 'space-colony':
      return {
        wallColor: 0xe2e8f0, // Titanium white
        roofColor: 0x2563eb, // Solar blue
        accentColor: 0xf59e0b, // Hazard amber
        glassColor: 0x60a5fa,
        metalness: 0.6,
        roughness: 0.2,
      };
    case 'modern-metropolis':
    default:
      return {
        wallColor: 0xffffff, // Crisp ivory stucco
        roofColor: 0x16a34a, // Vibrant emerald green
        accentColor: 0xd4af37, // Polished gold
        glassColor: 0x93c5fd,
        metalness: 0.1,
        roughness: 0.4,
      };
  }
}

/**
 * TIER 1: Cozy Suburban Cottage / Villa (Level 1)
 */
function createTier1Cottage(theme: BuildingTheme): THREE.Group {
  const group = new THREE.Group();

  // Main House Walls
  const wallGeo = new THREE.BoxGeometry(0.42, 0.32, 0.42);
  const wallMat = new THREE.MeshStandardMaterial({
    color: theme.wallColor,
    roughness: theme.roughness,
    metalness: theme.metalness,
  });
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = 0.16;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Pitched Hip Roof
  const roofGeo = new THREE.ConeGeometry(0.34, 0.24, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roofMat = new THREE.MeshStandardMaterial({
    color: theme.roofColor,
    roughness: 0.35,
    metalness: 0.1,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 0.32 + 0.12;
  roof.castShadow = true;
  group.add(roof);

  // Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.07, 0.16, 0.07);
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
  chimney.position.set(0.1, 0.44, 0.08);
  chimney.castShadow = true;
  group.add(chimney);

  return group;
}

/**
 * TIER 2: Two-Story Duplex / Townhouse (Level 2)
 */
function createTier2Duplex(theme: BuildingTheme): THREE.Group {
  const group = new THREE.Group();

  // First Floor
  const floor1Geo = new THREE.BoxGeometry(0.68, 0.28, 0.48);
  const wallMat = new THREE.MeshStandardMaterial({
    color: theme.wallColor,
    roughness: theme.roughness,
    metalness: theme.metalness,
  });
  const floor1 = new THREE.Mesh(floor1Geo, wallMat);
  floor1.position.y = 0.14;
  floor1.castShadow = true;
  floor1.receiveShadow = true;
  group.add(floor1);

  // Second Floor (Setback slightly)
  const floor2Geo = new THREE.BoxGeometry(0.6, 0.26, 0.42);
  const floor2 = new THREE.Mesh(floor2Geo, wallMat);
  floor2.position.y = 0.28 + 0.13;
  floor2.castShadow = true;
  group.add(floor2);

  // Balcony Rim
  const balconyGeo = new THREE.BoxGeometry(0.64, 0.05, 0.1);
  const accentMat = new THREE.MeshStandardMaterial({
    color: theme.accentColor,
    metalness: 0.4,
    roughness: 0.3,
  });
  const balcony = new THREE.Mesh(balconyGeo, accentMat);
  balcony.position.set(0, 0.3, 0.22);
  balcony.castShadow = true;
  group.add(balcony);

  // Dual Gable Roof
  const roofGeo = new THREE.BoxGeometry(0.66, 0.12, 0.46);
  const roofMat = new THREE.MeshStandardMaterial({
    color: theme.roofColor,
    roughness: 0.3,
    metalness: 0.15,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 0.28 + 0.26 + 0.06;
  roof.castShadow = true;
  group.add(roof);

  return group;
}

/**
 * TIER 3: Multi-Wing Residential Estate (Level 3)
 */
function createTier3Estate(theme: BuildingTheme): THREE.Group {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: theme.wallColor,
    roughness: theme.roughness,
    metalness: theme.metalness,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: theme.roofColor,
    roughness: 0.3,
    metalness: 0.15,
  });

  // Central Pavilion
  const centerGeo = new THREE.BoxGeometry(0.45, 0.58, 0.52);
  const centerMesh = new THREE.Mesh(centerGeo, wallMat);
  centerMesh.position.y = 0.29;
  centerMesh.castShadow = true;
  centerMesh.receiveShadow = true;
  group.add(centerMesh);

  // Central Roof
  const centerRoofGeo = new THREE.ConeGeometry(0.36, 0.26, 4);
  centerRoofGeo.rotateY(Math.PI / 4);
  const centerRoof = new THREE.Mesh(centerRoofGeo, roofMat);
  centerRoof.position.y = 0.58 + 0.13;
  centerRoof.castShadow = true;
  group.add(centerRoof);

  // Left Wing
  const leftWingGeo = new THREE.BoxGeometry(0.28, 0.4, 0.42);
  const leftWing = new THREE.Mesh(leftWingGeo, wallMat);
  leftWing.position.set(-0.34, 0.2, 0);
  leftWing.castShadow = true;
  group.add(leftWing);

  // Right Wing
  const rightWingGeo = new THREE.BoxGeometry(0.28, 0.4, 0.42);
  const rightWing = new THREE.Mesh(rightWingGeo, wallMat);
  rightWing.position.set(0.34, 0.2, 0);
  rightWing.castShadow = true;
  group.add(rightWing);

  // Wing Sloped Roofs
  const wingRoofGeo = new THREE.BoxGeometry(0.3, 0.08, 0.44);
  const leftRoof = new THREE.Mesh(wingRoofGeo, roofMat);
  leftRoof.position.set(-0.34, 0.42, 0);
  leftRoof.castShadow = true;
  group.add(leftRoof);

  const rightRoof = new THREE.Mesh(wingRoofGeo, roofMat);
  rightRoof.position.set(0.34, 0.42, 0);
  rightRoof.castShadow = true;
  group.add(rightRoof);

  return group;
}

/**
 * TIER 4: Luxury Manor / Mid-Rise Complex (Level 4)
 */
function createTier4Manor(theme: BuildingTheme): THREE.Group {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: theme.wallColor,
    roughness: 0.35,
    metalness: 0.15,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: theme.glassColor,
    roughness: 0.1,
    metalness: 0.6,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: theme.accentColor,
    metalness: 0.6,
    roughness: 0.2,
  });

  // Base Podium
  const podiumGeo = new THREE.BoxGeometry(0.98, 0.26, 0.58);
  const podium = new THREE.Mesh(podiumGeo, wallMat);
  podium.position.y = 0.13;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  // Main High-rise Tower
  const towerGeo = new THREE.BoxGeometry(0.72, 0.55, 0.46);
  const tower = new THREE.Mesh(towerGeo, wallMat);
  tower.position.y = 0.26 + 0.275;
  tower.castShadow = true;
  group.add(tower);

  // Glass Facade Center Window
  const glassGeo = new THREE.BoxGeometry(0.48, 0.44, 0.06);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 0.26 + 0.275, 0.22);
  group.add(glass);

  // Stepped Penthouse Level
  const penthouseGeo = new THREE.BoxGeometry(0.52, 0.2, 0.34);
  const penthouse = new THREE.Mesh(penthouseGeo, accentMat);
  penthouse.position.y = 0.26 + 0.55 + 0.1;
  penthouse.castShadow = true;
  group.add(penthouse);

  // Rooftop Garden Balcony Rim
  const rimGeo = new THREE.BoxGeometry(0.74, 0.04, 0.48);
  const rim = new THREE.Mesh(rimGeo, accentMat);
  rim.position.y = 0.26 + 0.55 + 0.02;
  group.add(rim);

  return group;
}

/**
 * TIER 5: Grand Landmark Hotel / Skyscraper (Level 5)
 */
function createTier5Hotel(theme: BuildingTheme, worldId: string): THREE.Group {
  const hotel = new THREE.Group();

  const hotelColor = worldId === 'cyberpunk-city' ? 0x0f172a : 0xdc2626; // Signature red hotel or cyber black
  const towerMat = new THREE.MeshStandardMaterial({
    color: hotelColor,
    roughness: 0.25,
    metalness: 0.3,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Polished architectural gold
    roughness: 0.2,
    metalness: 0.8,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: theme.glassColor,
    roughness: 0.1,
    metalness: 0.7,
  });

  // Grand Entrance Base
  const baseGeo = new THREE.BoxGeometry(1.05, 0.32, 0.65);
  const baseMesh = new THREE.Mesh(baseGeo, towerMat);
  baseMesh.position.y = 0.16;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  hotel.add(baseMesh);

  // Illuminated Glass Atrium
  const atriumGeo = new THREE.BoxGeometry(0.5, 0.22, 0.12);
  const atrium = new THREE.Mesh(atriumGeo, glassMat);
  atrium.position.set(0, 0.11, 0.3);
  hotel.add(atrium);

  // Main Skyscraper Tower
  const towerGeo = new THREE.BoxGeometry(0.82, 0.75, 0.52);
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.y = 0.32 + 0.375;
  tower.castShadow = true;
  hotel.add(tower);

  // Upper Gold Setback Lintel
  const midGeo = new THREE.BoxGeometry(0.66, 0.22, 0.42);
  const midTier = new THREE.Mesh(midGeo, goldMat);
  midTier.position.y = 0.32 + 0.75 + 0.11;
  midTier.castShadow = true;
  hotel.add(midTier);

  // Crowned Penthouse
  const topGeo = new THREE.BoxGeometry(0.48, 0.18, 0.32);
  const top = new THREE.Mesh(topGeo, towerMat);
  top.position.y = 0.32 + 0.75 + 0.22 + 0.09;
  top.castShadow = true;
  hotel.add(top);

  // Rooftop Spire
  const spireGeo = new THREE.ConeGeometry(0.14, 0.38, 4);
  spireGeo.rotateY(Math.PI / 4);
  const spire = new THREE.Mesh(spireGeo, goldMat);
  spire.position.y = 0.32 + 0.75 + 0.22 + 0.18 + 0.19;
  spire.castShadow = true;
  hotel.add(spire);

  return hotel;
}

export class ThreeBuildingManager {
  private container: THREE.Group;
  private buildingMeshes: Map<number, THREE.Group> = new Map();

  constructor(scene: THREE.Scene) {
    this.container = new THREE.Group();
    this.container.name = 'ThreeBuildingContainer';
    scene.add(this.container);
  }

  /**
   * Updates building models across all properties according to current game state,
   * creating distinct 3D architecture for every level (1..5) with rise animation.
   */
  public updateBuildings(
    properties: Record<number, PropertyOwnershipState>,
    worldId: string = 'modern-metropolis'
  ): void {
    const theme = getBuildingTheme(worldId);

    for (let tileId = 0; tileId < 40; tileId++) {
      const prop = properties[tileId];
      const level = prop?.level ?? 0;
      const isMortgaged = prop?.isMortgaged ?? false;

      const existing = this.buildingMeshes.get(tileId);

      // If level is 0 or mortgaged, remove existing mesh
      if (level <= 0 || isMortgaged) {
        if (existing) {
          this.container.remove(existing);
          this.buildingMeshes.delete(tileId);
        }
        continue;
      }

      // If existing building level matches, continue
      if (existing && existing.userData.level === level) {
        continue;
      }

      // Remove previous level building
      if (existing) {
        this.container.remove(existing);
        this.buildingMeshes.delete(tileId);
      }

      // Generate distinct 3D structure according to level
      let structure: THREE.Group;
      switch (level) {
        case 1:
          structure = createTier1Cottage(theme);
          break;
        case 2:
          structure = createTier2Duplex(theme);
          break;
        case 3:
          structure = createTier3Estate(theme);
          break;
        case 4:
          structure = createTier4Manor(theme);
          break;
        case 5:
        default:
          structure = createTier5Hotel(theme, worldId);
          break;
      }

      const worldPos = getTile3DWorldPosition(tileId);
      const rotY = getTileRotationY(tileId);

      const group = new THREE.Group();
      group.userData = { level, tileId };
      group.position.set(worldPos.x, worldPos.y + TILE_HEIGHT / 2, worldPos.z);
      group.rotation.y = rotY;

      // Smooth rise animation from ground
      group.scale.set(0.01, 0.01, 0.01);
      group.add(structure);

      this.container.add(group);
      this.buildingMeshes.set(tileId, group);

      // Animate construction rise
      const startTime = performance.now();
      const duration = 380; // ms

      const animateRise = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);
        // Back-out elastic overshoot
        const s = 1.70158;
        const p = progress - 1;
        const ease = p * p * ((s + 1) * p + s) + 1;

        const currentScale = Math.max(0.01, ease);
        group.scale.set(currentScale, currentScale, currentScale);

        if (progress < 1.0) {
          requestAnimationFrame(animateRise);
        } else {
          group.scale.set(1, 1, 1);
        }
      };

      requestAnimationFrame(animateRise);
    }
  }

  public dispose(): void {
    for (const mesh of this.buildingMeshes.values()) {
      this.container.remove(mesh);
    }
    this.buildingMeshes.clear();
  }
}
