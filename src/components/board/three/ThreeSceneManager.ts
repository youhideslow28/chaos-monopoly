/**
 * CHAOS MONOPOLY — 3D Scene Manager (Three.js WebGL Tabletop Engine)
 * Orchestrates the physical board diorama: tabletop, slab, tiles, buildings, tokens,
 * dice, ownership markers, lighting, raycasting and the smart camera rig.
 */

import * as THREE from 'three';
import { GameState } from '../../../game/types';
import { WorldConfig } from '../../../worlds/types';
import { BOARD_TILES } from '../../../game/board/boardData';
import { BOARD_HALF_SIZE, SLAB_THICKNESS, getTile3DWorldPosition } from './threeCoordinates';
import {
  createAllTileMeshes,
  updateAllTileMeshesWithWorld,
  disposeTileMeshes,
  TileMeshGroup,
} from './ThreeTileMeshes';
import { ThreeBuildingManager } from './ThreeBuildingMeshes';
import { ThreeTokenManager } from './ThreeTokenManager';
import { ThreeDiceManager } from './ThreeDiceMeshes';
import { ThreeOwnershipManager } from './ThreeOwnershipMarkers';
import {
  ThreeCameraRig,
  ThreeCameraPreset,
  CAMERA_FOV,
  CAMERA_PRESET_POSES,
  FOCUS_ZOOM,
} from './ThreeCameraRig';
import { ThreeMultiFloorManager } from './ThreeMultiFloorManager';
import { ThreeVerticalConnectors } from './ThreeVerticalConnectors';
import { ThreeFogOfWarManager } from './ThreeFogOfWarMeshes';
import { ThreeTrapManager } from './ThreeTrapMeshes';
import { setActiveSpatialGraph } from './threeCoordinates';

export type { ThreeCameraPreset } from './ThreeCameraRig';

export interface SceneManagerOptions {
  canvas: HTMLCanvasElement;
  onSelectTile: (tileId: number) => void;
  worldConfig: WorldConfig | null;
  initialPreset?: ThreeCameraPreset;
  /** Classic board-game look (no particles, neutral palette, plain title plaza). */
  minimal?: boolean;
}

interface WorldPalette {
  table: number;
  slab: number;
  rim: number;
  plaza: number;
  sun: number;
  hemiSky: number;
  hemiGround: number;
  dark: boolean;
}

function getWorldPalette(worldId: string): WorldPalette {
  switch (worldId) {
    case 'cyberpunk-city':
      return { table: 0x0f172a, slab: 0x181825, rim: 0x06b6d4, plaza: 0x111827, sun: 0x38bdf8, hemiSky: 0x4c1d95, hemiGround: 0x0284c7, dark: true };
    case 'mekong-delta':
      return { table: 0x451a03, slab: 0xfef3c7, rim: 0xb45309, plaza: 0xecfdf5, sun: 0xfef08a, hemiSky: 0xf0fdf4, hemiGround: 0x15803d, dark: false };
    case 'space-colony':
      return { table: 0x0f172a, slab: 0xe2e8f0, rim: 0xf59e0b, plaza: 0x090d16, sun: 0xffffff, hemiSky: 0x1e293b, hemiGround: 0x3b82f6, dark: true };
    case 'modern-metropolis':
    default:
      return { table: 0xf5ede0, slab: 0xfdfbf7, rim: 0xd4af37, plaza: 0xfaf8f5, sun: 0xfffaed, hemiSky: 0xfffbf2, hemiGround: 0xfde68a, dark: false };
  }
}

const DRAG_CLICK_THRESHOLD_PX = 6;

export class ThreeSceneManager {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rig: ThreeCameraRig;

  // Managers & Mesh Groups
  private tileMeshes: TileMeshGroup[] = [];
  private buildingManager: ThreeBuildingManager;
  private tokenManager: ThreeTokenManager;
  private diceManager: ThreeDiceManager;
  private ownershipManager: ThreeOwnershipManager;
  private multiFloorManager: ThreeMultiFloorManager;
  private verticalConnectors: ThreeVerticalConnectors;
  private fogOfWarManager: ThreeFogOfWarManager;
  private trapManager: ThreeTrapManager;

  // Environment & Tabletop Objects
  private tableMesh!: THREE.Mesh;
  private slabMesh!: THREE.Mesh;
  private slabRimMesh!: THREE.Mesh;
  private plazaMesh!: THREE.Mesh;
  /**
   * Distance from the plaza centre to the dice cluster. Kept as a field so the dice sit
   * slightly toward the viewer instead of exactly on the plaza centre.
   */
  private diceCenterOffset = 1.9;

  /** Corner tile name plates, turned to face the camera every frame. */
  private cornerLabels: THREE.Mesh[] = [];
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private particleGroup: THREE.Group | null = null;
  private particlePoints: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private particleVelocities: Float32Array | null = null;
  private worldConfig: WorldConfig | null = null;

  // Interaction & Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2(-999, -999);
  private hoveredTileId: number | null = null;
  private selectedTileId: number | null = null;
  private onSelectTileCallback: (tileId: number) => void;

  // Camera state
  private activePreset: ThreeCameraPreset;
  private lastSelectedFromState: number | null = null;
  private focusRestorePose: ReturnType<ThreeCameraRig['snapshotGoal']> | null = null;
  private userMovedSinceFocus = false;
  /** Camera stays pinned to the active player's token until the player moves the view by hand. */
  private followActive = true;
  private activeTileId: number | null = null;
  private lastFollowTileId: number | null = null;
  /** The one player the camera follows (the viewer's own token). null = no auto-follow. */
  private followPlayerId: string | null = null;
  private reducedMotion = false;
  /** Classic look: fixed neutral palette, no ambient particles, plain title plaza. */
  private minimal = false;

  // Pointer gesture tracking
  private pointers = new Map<number, { x: number; y: number }>();
  private dragMode: 'orbit' | 'pan' = 'orbit';
  private totalDragDist = 0;
  private pinchDist = 0;
  private eventAbort = new AbortController();
  private activeShockwaves: Array<{
    mesh: THREE.Mesh;
    geo: THREE.BufferGeometry;
    mat: THREE.Material;
    birth: number;
    duration: number;
  }> = [];

  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private isDisposed = false;

  constructor(options: SceneManagerOptions) {
    this.canvas = options.canvas;
    this.onSelectTileCallback = options.onSelectTile;
    this.worldConfig = options.worldConfig;
    this.activePreset = options.initialPreset ?? 'STANDARD';
    this.minimal = options.minimal ?? false;

    // 1. WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 2. Scene & camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, this.getAspect(), 0.5, 400);
    this.rig = new ThreeCameraRig(this.camera);
    this.rig.setPose(CAMERA_PRESET_POSES[this.activePreset]);
    this.rig.snapToGoal(this.getAspect());

    const motionQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    this.reducedMotion = motionQuery?.matches ?? false;

    // 3. Lighting, tabletop, tiles
    this.setupLighting();
    this.setupTabletopAndSlab();

    this.tileMeshes = createAllTileMeshes(BOARD_TILES, this.worldConfig);
    for (const item of this.tileMeshes) {
      this.scene.add(item.group);
      if (item.labelMesh) this.cornerLabels.push(item.labelMesh);
    }

    // 4. Subsystem managers
    this.buildingManager = new ThreeBuildingManager(this.scene);
    this.ownershipManager = new ThreeOwnershipManager(this.scene);
    this.tokenManager = new ThreeTokenManager(this.scene);
    this.diceManager = new ThreeDiceManager(this.scene);
    this.multiFloorManager = new ThreeMultiFloorManager(this.scene);
    this.verticalConnectors = new ThreeVerticalConnectors(this.scene);
    this.fogOfWarManager = new ThreeFogOfWarManager(this.scene);
    this.trapManager = new ThreeTrapManager(this.scene);

    const applyReducedMotion = () => {
      this.reducedMotion = motionQuery?.matches ?? false;
      this.tokenManager.setReducedMotion(this.reducedMotion);
      this.diceManager.setReducedMotion(this.reducedMotion);
      this.trapManager.setReducedMotion(this.reducedMotion);
    };
    applyReducedMotion();
    motionQuery?.addEventListener?.('change', applyReducedMotion, { signal: this.eventAbort.signal });

    // 5. World palette, lighting & particles
    this.applyWorldTheme(this.worldConfig);

    // 6. Input + render loop
    this.bindEvents();
    this.renderLoop = this.renderLoop.bind(this);
    this.lastFrameTime = performance.now();
    this.renderLoop();
  }

  private getAspect(): number {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return w > 0 && h > 0 ? w / h : 1;
  }

  // ---------------------------------------------------------------------------
  // Scene construction
  // ---------------------------------------------------------------------------

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xfffbf2, 0xfde68a, 0.85);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.sunLight.position.set(20, 36, 18);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.camera.left = -18;
    this.sunLight.shadow.camera.right = 18;
    this.sunLight.shadow.camera.top = 18;
    this.sunLight.shadow.camera.bottom = -18;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    this.fillLight.position.set(-20, 25, -20);
    this.scene.add(this.fillLight);
  }

  private setupTabletopAndSlab(): void {
    // Tabletop: large enough that its edge is never visible, faded by fog.
    const tableGeo = new THREE.PlaneGeometry(500, 500);
    tableGeo.rotateX(-Math.PI / 2);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xf5ede0, roughness: 0.7, metalness: 0.04 });
    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.position.y = -SLAB_THICKNESS;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // Volumetric board slab
    const slabWidth = BOARD_HALF_SIZE * 2 + 1.4;
    const slabGeo = new THREE.BoxGeometry(slabWidth, SLAB_THICKNESS, slabWidth);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.35, metalness: 0.06 });
    this.slabMesh = new THREE.Mesh(slabGeo, slabMat);
    this.slabMesh.position.y = -SLAB_THICKNESS / 2;
    this.slabMesh.castShadow = true;
    this.slabMesh.receiveShadow = true;
    this.scene.add(this.slabMesh);

    // Gold rim around slab border
    const slabRimGeo = new THREE.RingGeometry(slabWidth / 2 - 0.08, slabWidth / 2, 4);
    slabRimGeo.rotateX(-Math.PI / 2);
    slabRimGeo.rotateY(Math.PI / 4);
    const goldRimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
    this.slabRimMesh = new THREE.Mesh(slabRimGeo, goldRimMat);
    this.slabRimMesh.position.y = 0.01;
    this.scene.add(this.slabRimMesh);

    // Central plaza (coloured field; the title is a separate flat piece on top)
    const plazaWidth = BOARD_HALF_SIZE * 2 - 4.8;
    const plazaGeo = new THREE.PlaneGeometry(plazaWidth, plazaWidth);
    plazaGeo.rotateX(-Math.PI / 2);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
    this.plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    this.plazaMesh.position.y = 0.02;
    this.plazaMesh.receiveShadow = true;
    this.scene.add(this.plazaMesh);

    // The plaza centre is deliberately left clean: no title plate, no logo. The dice sit a
    // little toward the viewer so the middle of the board reads as empty tabletop.
    this.diceCenterOffset = plazaWidth * 0.069;
  }

  private createPlazaTexture(palette: WorldPalette, _worldConfig: WorldConfig | null): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (this.minimal) {
      this.paintClassicPlaza(ctx, size);
      return this.finishPlazaTexture(canvas);
    }

    const css = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;
    const accent = css(palette.rim);

    ctx.fillStyle = css(palette.plaza);
    ctx.fillRect(0, 0, size, size);

    // Subtle warm inlaid tabletop marquetry pattern & compass rose emblem ("bớt trống trơn")
    const cx = size / 2;
    const cy = size / 2;

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 2;
    for (let ring = 140; ring <= 320; ring += 90) {
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle 8-point tabletop compass lines
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 90, cy + Math.sin(ang) * 90);
      ctx.lineTo(cx + Math.cos(ang) * 320, cy + Math.sin(ang) * 320);
      ctx.stroke();
    }

    // Corner filigree brackets
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 4;
    const pad = 82;
    const len = 48;
    const corners: [number, number, number, number][] = [
      [pad, pad, 1, 1],
      [size - pad, pad, -1, 1],
      [size - pad, size - pad, -1, -1],
      [pad, size - pad, 1, -1],
    ];
    for (const [x, y, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx * len, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * len);
      ctx.stroke();
    }
    ctx.restore();

    // Clean centre double rule around perimeter
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, size - 72, size - 72);
    ctx.lineWidth = 3;
    ctx.strokeRect(58, 58, size - 116, size - 116);
    ctx.globalAlpha = 1;

    return this.finishPlazaTexture(canvas);
  }

  private finishPlazaTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  /** Classic board-game centre: plain soft green field (the title is a separate flat piece). */
  private paintClassicPlaza(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = '#d5e8d4';
    ctx.fillRect(0, 0, size, size);
  }

  // ---------------------------------------------------------------------------
  // World theme
  // ---------------------------------------------------------------------------

  public setWorldConfig(worldConfig: WorldConfig | null): void {
    if (worldConfig === this.worldConfig) return;
    this.worldConfig = worldConfig;
    this.applyWorldTheme(worldConfig);
    updateAllTileMeshesWithWorld(this.tileMeshes, BOARD_TILES, worldConfig);
  }

  private applyWorldTheme(worldConfig: WorldConfig | null): void {
    const worldId = this.minimal ? 'modern-metropolis' : worldConfig?.id || 'modern-metropolis';
    const palette = getWorldPalette(worldId);

    (this.tableMesh.material as THREE.MeshStandardMaterial).color.setHex(palette.table);
    (this.slabMesh.material as THREE.MeshStandardMaterial).color.setHex(palette.slab);
    (this.slabRimMesh.material as THREE.MeshStandardMaterial).color.setHex(palette.rim);
    this.sunLight.color.setHex(palette.sun);
    this.hemiLight.color.setHex(palette.hemiSky);
    this.hemiLight.groundColor.setHex(palette.hemiGround);

    // Background + fog blend the endless tabletop into the horizon
    this.scene.background = new THREE.Color(palette.table);
    this.scene.fog = new THREE.Fog(palette.table, 70, 190);

    // Plaza texture
    const plazaMat = this.plazaMesh.material as THREE.MeshStandardMaterial;
    plazaMat.map?.dispose();
    const plazaTexture = this.createPlazaTexture(palette, worldConfig);
    if (plazaTexture) {
      plazaMat.map = plazaTexture;
      plazaMat.color.setHex(0xffffff);
    } else {
      plazaMat.map = null;
      plazaMat.color.setHex(palette.plaza);
    }
    plazaMat.needsUpdate = true;

    if (!this.minimal) this.setupParticles(worldId);
  }

  private setupParticles(worldId: string): void {
    if (this.particleGroup) {
      this.scene.remove(this.particleGroup);
      this.particlePoints?.geometry.dispose();
      (this.particlePoints?.material as THREE.Material)?.dispose();
      this.particleGroup = null;
      this.particlePoints = null;
      this.particlePositions = null;
      this.particleVelocities = null;
    }

    const count = 120;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    let pColor = 0xfde68a;
    let pSize = 0.15;

    if (worldId === 'cyberpunk-city') {
      pColor = 0x22d3ee;
      pSize = 0.14;
    } else if (worldId === 'mekong-delta') {
      pColor = 0xa3e635;
      pSize = 0.22;
    } else if (worldId === 'space-colony') {
      pColor = 0x93c5fd;
      pSize = 0.18;
    }

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 45;
      positions[i * 3 + 1] = Math.random() * 15 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 45;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] =
        worldId === 'cyberpunk-city' ? -(Math.random() * 0.15 + 0.08) : (Math.random() - 0.5) * 0.015;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: pColor,
      size: pSize,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(geo, mat);
    this.particlePoints.frustumCulled = false;
    this.particlePositions = positions;
    this.particleVelocities = velocities;

    this.particleGroup = new THREE.Group();
    this.particleGroup.add(this.particlePoints);
    this.scene.add(this.particleGroup);
  }

  // ---------------------------------------------------------------------------
  // Camera API
  // ---------------------------------------------------------------------------

  /** Returns to the current preset's default pose (also clears any tile focus). */
  public resetCamera(smooth: boolean = true): void {
    this.followActive = true;
    this.setCameraPreset(this.activePreset, smooth);
  }

  public setCameraPreset(preset: ThreeCameraPreset, smooth: boolean = true): void {
    this.activePreset = preset;
    this.focusRestorePose = null;
    this.rig.setPreset(preset);
    if (this.followActive && this.activeTileId !== null) {
      const pos = getTile3DWorldPosition(this.activeTileId);
      this.rig.pinTo(pos.x, pos.z);
    }
    if (!smooth) this.rig.snapToGoal(this.getAspect());
  }

  /** Multiplicative zoom: >1 zooms in, <1 zooms out. The player's zoom ends the auto-follow. */
  public zoomBy(factor: number): void {
    this.userMovedSinceFocus = true;
    this.followActive = false;
    this.rig.zoomBy(factor);
  }

  /** Pins the camera on a tile and turns the board so that tile's edge faces the viewer. */
  public focusTile(tileId: number): void {
    const pos = getTile3DWorldPosition(tileId);
    this.userMovedSinceFocus = true;
    this.followActive = true;
    this.activeTileId = tileId;
    this.rig.pinTo(pos.x, pos.z);
  }

  /**
   * Triggers a 3D expanding shockwave ring at the world coordinates of the given tile.
   * Interface contract for M1 ↔ M3 tile actions (purchase, upgrade, salary).
   */
  public emitTileEvent(tileId: number, type: 'PURCHASE' | 'UPGRADE' | 'SALARY'): void {
    const pos = getTile3DWorldPosition(tileId);
    const colorMap: Record<'PURCHASE' | 'UPGRADE' | 'SALARY', number> = {
      PURCHASE: 0x10b981,
      UPGRADE: 0xf59e0b,
      SALARY: 0x06b6d4,
    };
    const color = colorMap[type] ?? 0xffffff;

    const geo = new THREE.RingGeometry(0.2, 0.45, 32);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, SLAB_THICKNESS + 0.06, pos.z);

    this.scene.add(mesh);
    this.activeShockwaves.push({
      mesh,
      geo,
      mat,
      birth: performance.now(),
      duration: 650,
    });
  }

  // ---------------------------------------------------------------------------
  // Game state sync
  // ---------------------------------------------------------------------------

  public updateState(state: GameState, visualPositions: Record<string, number>): void {
    const players = state.players || [];
    const activePlayerId = state.status === 'PLAYING' ? players[state.activePlayerIndex]?.id ?? null : null;

    if (state.spatialGraph) {
      setActiveSpatialGraph(state.spatialGraph);
      this.multiFloorManager.buildFloors(state.spatialGraph);
      this.verticalConnectors.syncConnectors(state.spatialGraph);
      this.fogOfWarManager.syncWithGraph(state.spatialGraph, state.fogOfWarState);
    }

    this.buildingManager.updateBuildings(state.properties || {}, state.config.worldId);
    this.ownershipManager.update(state.properties || {}, players);
    this.tokenManager.updateTokens(players, visualPositions, activePlayerId);
    this.trapManager.syncWithTraps(
      state.placedTraps || [],
      players,
      this.followPlayerId || activePlayerId,
      state.spatialGraph
    );

    const selected = state.selectedTileForDetail ?? null;
    this.setSelectedTile(selected);

    // Smart camera: focus only when the selection *changes*, and restore afterwards.
    if (selected !== this.lastSelectedFromState) {
      this.lastSelectedFromState = selected;
      if (selected !== null) {
        if (!this.focusRestorePose) this.focusRestorePose = this.rig.snapshotGoal();
        this.userMovedSinceFocus = false;
        const pos = getTile3DWorldPosition(selected);
        this.rig.focusPoint(pos.x, pos.z, FOCUS_ZOOM, pos.y);
      } else if (this.focusRestorePose) {
        if (!this.userMovedSinceFocus) this.rig.setPose(this.focusRestorePose);
        this.focusRestorePose = null;
      }
    }

    // Follow: only the followed player's token moves the camera (never other players').
    const followTile =
      this.followPlayerId !== null
        ? visualPositions[this.followPlayerId] ??
          players.find(p => p.id === this.followPlayerId)?.position ??
          null
        : null;
    this.activeTileId = followTile;
    if (this.followActive && selected === null && followTile !== null && followTile !== this.lastFollowTileId) {
      this.lastFollowTileId = followTile;
      const pos = getTile3DWorldPosition(followTile);
      this.rig.pinTo(pos.x, pos.z, undefined, pos.y);
    }
  }

  /** Chooses whose token the camera follows. Changing the player re-pins immediately. */
  public setFollowPlayer(playerId: string | null): void {
    if (playerId === this.followPlayerId) return;
    this.followPlayerId = playerId;
    this.lastFollowTileId = null;
    if (playerId !== null) this.followActive = true;
  }

  /** The tile of the followed player (used by the "Tâm điểm" button). */
  public getFollowTileId(): number | null {
    return this.activeTileId;
  }

  /**
   * Camera-facing artwork, updated every frame. The plate is small enough to fit inside the
   * plaza at any rotation, so it simply stays visible and readable while the camera turns —
   * no shrinking, no clipping, no covering by the tile ring.
   */
  private updateCameraFacingArt(): void {
    const spin = this.rig.current.theta;

    for (const label of this.cornerLabels) {
      const baseRotY = (label.userData.labelBaseRotY as number) || 0;
      label.rotation.y = spin - baseRotY;
    }

    // Dice sit a little toward the viewer, keeping the plaza centre visually open.
    this.diceManager.setPlazaOffset(
      this.diceCenterOffset * Math.sin(spin),
      this.diceCenterOffset * Math.cos(spin)
    );
  }

  /** Starts tumbling the dice while the authoritative result is pending. */
  public tumbleDice(): void {
    this.diceManager.tumble();
  }

  /** Settles the dice on the given faces. */
  public rollDice(d1: number, d2: number, animate: boolean = true): void {
    this.diceManager.rollTo(d1, d2, animate);
  }

  public setSelectedTile(tileId: number | null): void {
    this.selectedTileId = tileId;
    for (const item of this.tileMeshes) {
      const isSelected = item.tileId === tileId;
      const isHovered = item.tileId === this.hoveredTileId;

      const mat = item.highlightMesh.material as THREE.MeshBasicMaterial;
      if (isSelected) {
        mat.color.setHex(0x16a34a);
        mat.opacity = 0.6;
        item.highlightMesh.visible = true;
      } else if (isHovered) {
        mat.color.setHex(0xd97706);
        mat.opacity = 0.35;
        item.highlightMesh.visible = true;
      } else {
        mat.opacity = 0;
        item.highlightMesh.visible = false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  public pickTileAt(clientX: number, clientY: number): number | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.mouse.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.tileMeshes.map((t) => t.tileMesh), false);
    return hits.length > 0 ? (hits[0].object.userData.tileId as number) : null;
  }

  private bindEvents(): void {
    const signal = this.eventAbort.signal;
    const canvas = this.canvas;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });

    canvas.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* pointer capture is best-effort */
        }
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (this.pointers.size === 1) {
          this.dragMode = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'orbit';
          this.totalDragDist = 0;
        } else if (this.pointers.size === 2) {
          const [a, b] = [...this.pointers.values()];
          this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          this.totalDragDist = Infinity; // multi-touch is never a click
        }
      },
      { signal }
    );

    canvas.addEventListener(
      'pointermove',
      (e: PointerEvent) => {
        const prev = this.pointers.get(e.pointerId);

        if (!prev) {
          // Hover (mouse only)
          if (e.pointerType !== 'mouse') return;
          const hit = this.pickTileAt(e.clientX, e.clientY);
          if (hit !== this.hoveredTileId) {
            this.hoveredTileId = hit;
            canvas.style.cursor = hit !== null ? 'pointer' : 'default';
            this.setSelectedTile(this.selectedTileId);
          }
          return;
        }

        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (this.pointers.size >= 2) {
          const [a, b] = [...this.pointers.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (this.pinchDist > 0 && dist > 0) this.zoomBy(dist / this.pinchDist);
          this.pinchDist = dist;
          return;
        }

        this.totalDragDist += Math.abs(dx) + Math.abs(dy);
        if (this.totalDragDist <= DRAG_CLICK_THRESHOLD_PX) return;

        this.userMovedSinceFocus = true;
        this.followActive = false;
        if (this.dragMode === 'pan') {
          this.rig.panByPixels(dx, dy, canvas.clientHeight);
        } else {
          this.rig.orbit(-dx * 0.006, -dy * 0.006);
        }
      },
      { signal }
    );

    const endPointer = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      const wasSingle = this.pointers.size === 1;
      this.pointers.delete(e.pointerId);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }

      if (this.pointers.size === 1) {
        this.totalDragDist = Infinity; // finishing a pinch must not select a tile
      }

      // Magnet: releasing a rotation close to a 90° step snaps the board onto it.
      if (wasSingle && Number.isFinite(this.totalDragDist) && this.totalDragDist > DRAG_CLICK_THRESHOLD_PX) {
        this.rig.settleYaw();
      }

      if (wasSingle && e.type === 'pointerup' && e.button === 0 && this.totalDragDist <= DRAG_CLICK_THRESHOLD_PX) {
        const hit = this.pickTileAt(e.clientX, e.clientY);
        if (hit !== null) this.onSelectTileCallback(hit);
      }
    };
    canvas.addEventListener('pointerup', endPointer, { signal });
    canvas.addEventListener('pointercancel', endPointer, { signal });

    canvas.addEventListener(
      'pointerleave',
      (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && this.hoveredTileId !== null && this.pointers.size === 0) {
          this.hoveredTileId = null;
          canvas.style.cursor = 'default';
          this.setSelectedTile(this.selectedTileId);
        }
      },
      { signal }
    );

    canvas.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const delta = Math.max(-240, Math.min(240, e.deltaY));
        this.zoomBy(Math.exp(-delta * 0.0014));
      },
      { passive: false, signal }
    );
  }

  public handleResize(): void {
    if (this.isDisposed) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------

  private renderLoop(): void {
    if (this.isDisposed) return;

    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.rig.update(dt, this.getAspect(), this.reducedMotion);
    this.updateCameraFacingArt();
    this.tokenManager.tick(now);
    this.fogOfWarManager.tick(dt, now);
    this.trapManager.tick(dt, now);

    if (!this.reducedMotion && this.particlePositions && this.particleVelocities && this.particlePoints) {
      const count = this.particlePositions.length / 3;
      const posAttr = this.particlePoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        this.particlePositions[i * 3] += this.particleVelocities[i * 3];
        this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1];
        this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2];

        if (this.particlePositions[i * 3 + 1] < 0.2) {
          this.particlePositions[i * 3 + 1] = 15;
        } else if (this.particlePositions[i * 3 + 1] > 16) {
          this.particlePositions[i * 3 + 1] = 0.5;
        }
      }
      posAttr.needsUpdate = true;
    }

    if (this.activeShockwaves.length > 0) {
      const remaining: typeof this.activeShockwaves = [];
      for (const sw of this.activeShockwaves) {
        const elapsed = now - sw.birth;
        const progress = Math.min(1, elapsed / sw.duration);
        if (progress < 1) {
          const scale = 1 + progress * 2.8;
          sw.mesh.scale.set(scale, scale, 1);
          (sw.mat as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
          remaining.push(sw);
        } else {
          this.scene.remove(sw.mesh);
          sw.geo.dispose();
          sw.mat.dispose();
        }
      }
      this.activeShockwaves = remaining;
    }

    this.renderer.render(this.scene, this.camera);
    // Roadmap 8.5: expose renderer counters so draw calls / triangles can be measured
    // from the page without guessing. Read-only snapshot, refreshed once per frame.
    if (typeof window !== 'undefined') {
      const info = this.renderer.info;
      (window as unknown as { __chaosPerf?: unknown }).__chaosPerf = {
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? null,
        shadowMapEnabled: this.renderer.shadowMap.enabled,
      };
    }
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }

  public dispose(): void {
    this.isDisposed = true;
    this.eventAbort.abort();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.particleGroup) {
      this.scene.remove(this.particleGroup);
      this.particlePoints?.geometry.dispose();
      (this.particlePoints?.material as THREE.Material)?.dispose();
      this.particleGroup = null;
    }
    for (const sw of this.activeShockwaves) {
      this.scene.remove(sw.mesh);
      sw.geo.dispose();
      sw.mat.dispose();
    }
    this.activeShockwaves = [];
    this.buildingManager.dispose();
    this.ownershipManager.dispose();
    this.tokenManager.dispose();
    this.diceManager.dispose();
    this.multiFloorManager.dispose();
    this.verticalConnectors.dispose();
    this.fogOfWarManager.dispose();
    this.trapManager.dispose();
    disposeTileMeshes(this.tileMeshes);

    for (const mesh of [this.tableMesh, this.slabMesh, this.slabRimMesh, this.plazaMesh]) {
      mesh.geometry.dispose();
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    }

    // The canvas (and its GL context) may be reused by the next scene instance, e.g. React
    // StrictMode remounts. Clear the upload flags left by CanvasTexture so three.js can create
    // its empty 3D textures on the next init without INVALID_OPERATION warnings.
    const gl = this.renderer.getContext?.();
    if (gl && typeof gl.pixelStorei === 'function') {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    this.renderer.dispose();
  }
}
