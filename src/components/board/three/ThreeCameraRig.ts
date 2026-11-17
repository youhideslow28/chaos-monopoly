/**
 * CHAOS MONOPOLY — 3D Camera Rig
 * Pure camera math for the Three.js tabletop (no WebGL context required).
 *
 * Key ideas:
 *  - The camera orbits a target using (theta, phi, zoom). `zoom = 1` always means
 *    "the whole board exactly fits the viewport", whatever the canvas aspect ratio.
 *    The orbit radius is derived by projecting the board's bounding box, so the
 *    corners can never be clipped.
 *  - A `goal` pose is eased into the `current` pose with frame-rate independent damping.
 *  - Panning is limited to the board and is only available when zoomed in.
 */

import * as THREE from 'three';
import { BOARD_HALF_SIZE, SLAB_THICKNESS } from './threeCoordinates';

export type ThreeCameraPreset = 'STANDARD' | 'ISOMETRIC' | 'TOP_DOWN' | 'CINEMATIC' | 'TACTICAL';

export interface CameraPose {
  /** Azimuth around Y. 0 = looking from +Z (GO corner at bottom-right). */
  theta: number;
  /** Polar angle from vertical, radians. 0 = straight down. */
  phi: number;
  /** 1 = whole board fits viewport. >1 zooms in. */
  zoom: number;
  /** Orbit target in world space. */
  x: number;
  y: number;
  z: number;
}

export const CAMERA_FOV = 38;
export const MIN_PHI = 0.04;
export const MAX_PHI = 1.38;
export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 3.2;
export const FOCUS_ZOOM = 1.45;
export const MAX_PAN = BOARD_HALF_SIZE + 1;

/** Fraction of half-viewport the board may occupy at zoom = 1 (leaves a small margin). */
const FIT_MARGIN = 0.93;

export const CAMERA_PRESET_POSES: Record<ThreeCameraPreset, CameraPose> = {
  // Classic Monopoly orientation: GO bottom-right, Jail bottom-left, text upright on the near edge.
  STANDARD: { theta: 0, phi: 0.92, zoom: 1, x: 0, y: 0, z: 0 },
  ISOMETRIC: { theta: Math.PI / 4, phi: 0.95, zoom: 1, x: 0, y: 0, z: 0 },
  TOP_DOWN: { theta: 0, phi: MIN_PHI, zoom: 1, x: 0, y: 0, z: 0 },
  CINEMATIC: { theta: Math.PI / 7, phi: 1.15, zoom: 1, x: 0, y: 0, z: 0 },
  TACTICAL: { theta: 0, phi: 0.5, zoom: 1, x: 0, y: 0, z: 0 },
};

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function shortestAngleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Bounding volume of the physical board (slab + tallest buildings)
const SLAB_HALF = BOARD_HALF_SIZE + 0.7;
const FIT_POINTS: THREE.Vector3[] = [];
for (const x of [-SLAB_HALF, SLAB_HALF]) {
  for (const z of [-SLAB_HALF, SLAB_HALF]) {
    for (const y of [-SLAB_THICKNESS, 1.6]) {
      FIT_POINTS.push(new THREE.Vector3(x, y, z));
    }
  }
}

const scratchCamera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
const scratchVec = new THREE.Vector3();

function placeOnSphere(
  out: THREE.Vector3,
  theta: number,
  phi: number,
  radius: number,
  target: { x: number; y: number; z: number }
): THREE.Vector3 {
  const sinPhi = Math.sin(phi);
  return out.set(
    target.x + radius * sinPhi * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * sinPhi * Math.cos(theta)
  );
}

/**
 * Smallest orbit radius (looking at the board centre) for which every corner of the
 * board volume projects inside the viewport. Works for any aspect ratio.
 */
export function computeFitDistance(
  theta: number,
  phi: number,
  aspect: number,
  fovDeg: number = CAMERA_FOV
): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1;
  scratchCamera.fov = fovDeg;
  scratchCamera.aspect = safeAspect;
  scratchCamera.near = 0.1;
  scratchCamera.far = 1000;
  scratchCamera.updateProjectionMatrix();

  const fits = (r: number): boolean => {
    placeOnSphere(scratchCamera.position, theta, phi, r, { x: 0, y: 0, z: 0 });
    scratchCamera.lookAt(0, 0, 0);
    scratchCamera.updateMatrixWorld(true);
    for (const p of FIT_POINTS) {
      scratchVec.copy(p).applyMatrix4(scratchCamera.matrixWorldInverse);
      if (scratchVec.z >= -scratchCamera.near) return false; // behind camera
      scratchVec.applyMatrix4(scratchCamera.projectionMatrix);
      if (Math.abs(scratchVec.x) > FIT_MARGIN || Math.abs(scratchVec.y) > FIT_MARGIN) return false;
    }
    return true;
  };

  let lo = 4;
  let hi = 260;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Magnet: a released yaw within this angle of a preset's 90° step snaps onto it. */
export const YAW_SNAP_RADIANS = (12 * Math.PI) / 180;
/** Zoom used while the camera is pinned to the active player (the whole board stays in frame). */
export const FOLLOW_ZOOM = 1.1;

export class ThreeCameraRig {
  public readonly current: CameraPose = { ...CAMERA_PRESET_POSES.STANDARD };
  public readonly goal: CameraPose = { ...CAMERA_PRESET_POSES.STANDARD };

  private camera: THREE.PerspectiveCamera;
  private lastRadius = 30;
  private fitKey = '';
  /** Yaw of the active preset. Each preset snaps to its own 90° grid (ISO snaps to 45°, +90° steps). */
  private presetTheta = CAMERA_PRESET_POSES.STANDARD.theta;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public setPose(pose: CameraPose): void {
    this.goal.theta = pose.theta;
    this.goal.phi = clamp(pose.phi, MIN_PHI, MAX_PHI);
    this.goal.zoom = clamp(pose.zoom, MIN_ZOOM, MAX_ZOOM);
    this.goal.x = pose.x;
    this.goal.y = pose.y;
    this.goal.z = pose.z;
    this.clampGoalPan();
  }

  public setPreset(preset: ThreeCameraPreset): void {
    const pose = CAMERA_PRESET_POSES[preset] ?? CAMERA_PRESET_POSES.STANDARD;
    this.presetTheta = pose.theta;
    this.setPose(pose);
  }

  public orbit(dTheta: number, dPhi: number): void {
    this.goal.theta += dTheta;
    this.goal.phi = clamp(this.goal.phi + dPhi, MIN_PHI, MAX_PHI);
  }

  /** Snaps the yaw to the nearest preset 90° step when it is close enough (called on release). */
  public settleYaw(): void {
    const step = Math.PI / 2;
    const k = Math.round((this.goal.theta - this.presetTheta) / step);
    const snapped = this.presetTheta + k * step;
    if (Math.abs(shortestAngleDelta(this.goal.theta, snapped)) <= YAW_SNAP_RADIANS) {
      this.goal.theta = snapped;
    }
  }

  /**
   * Pins the camera to a board point: the point stays centred and the yaw turns to the
   * 90° step that faces the nearest board edge toward the viewer (preset grid preserved).
   */
  public pinTo(x: number, z: number, zoom: number = FOLLOW_ZOOM, y: number = 0): void {
    const step = Math.PI / 2;
    const bearing = Math.atan2(x, z);
    const k = Math.round((bearing - this.presetTheta) / step);
    this.goal.theta = this.presetTheta + k * step;
    this.goal.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.goal.x = x;
    this.goal.z = z;
    this.goal.y = y;
    this.clampGoalPan();
  }

  /** Multiplicative zoom (factor > 1 zooms in). */
  public zoomBy(factor: number): void {
    this.goal.zoom = clamp(this.goal.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.clampGoalPan();
  }

  /**
   * Grab-style pan: moves the target so the ground follows the pointer.
   * dx/dy in CSS pixels, viewportHeight in CSS pixels.
   */
  public panByPixels(dx: number, dy: number, viewportHeight: number): void {
    const radius = this.lastRadius / this.current.zoom;
    const unit = (2 * radius * Math.tan((CAMERA_FOV * Math.PI) / 360)) / Math.max(1, viewportHeight);
    const theta = this.goal.theta;
    const right = { x: Math.cos(theta), z: -Math.sin(theta) };
    const forward = { x: -Math.sin(theta), z: -Math.cos(theta) };
    const foreshorten = Math.max(0.3, Math.cos(this.goal.phi));
    this.goal.x += -right.x * dx * unit + forward.x * (dy * unit) / foreshorten;
    this.goal.z += -right.z * dx * unit + forward.z * (dy * unit) / foreshorten;
    this.clampGoalPan();
  }

  public focusPoint(x: number, z: number, zoom: number = FOCUS_ZOOM, y: number = 0): void {
    this.goal.zoom = clamp(Math.max(this.goal.zoom, zoom), MIN_ZOOM, MAX_ZOOM);
    this.goal.x = x;
    this.goal.z = z;
    this.goal.y = y;
    this.clampGoalPan();
  }

  public snapshotGoal(): CameraPose {
    return { ...this.goal };
  }

  public snapToGoal(aspect: number): void {
    this.current.theta = this.goal.theta;
    this.current.phi = this.goal.phi;
    this.current.zoom = this.goal.zoom;
    this.current.x = this.goal.x;
    this.current.y = this.goal.y;
    this.current.z = this.goal.z;
    this.apply(aspect);
  }

  /** Panning is only meaningful when zoomed in; at zoom 1 the board is centred. */
  private clampGoalPan(): void {
    const allowance = MAX_PAN * clamp((this.goal.zoom - 1) / 0.35, 0, 1);
    this.goal.x = clamp(this.goal.x, -allowance, allowance);
    this.goal.z = clamp(this.goal.z, -allowance, allowance);
  }

  /** Eases current pose to goal (frame-rate independent) and updates the THREE camera. */
  public update(dtSeconds: number, aspect: number, instant: boolean = false): void {
    const k = instant ? 1 : 1 - Math.exp(-clamp(dtSeconds, 0, 0.1) * 9);
    const c = this.current;
    const g = this.goal;

    c.theta += shortestAngleDelta(c.theta, g.theta) * k;
    c.phi += (g.phi - c.phi) * k;
    c.zoom *= Math.pow(g.zoom / c.zoom, k);
    c.x += (g.x - c.x) * k;
    c.y += (g.y - c.y) * k;
    c.z += (g.z - c.z) * k;

    this.apply(aspect);
  }

  private apply(aspect: number): void {
    const c = this.current;
    const key = `${c.theta.toFixed(4)}|${c.phi.toFixed(4)}|${aspect.toFixed(4)}`;
    if (key !== this.fitKey) {
      this.fitKey = key;
      this.lastRadius = computeFitDistance(c.theta, c.phi, aspect);
    }
    const radius = this.lastRadius / Math.max(0.01, c.zoom);
    placeOnSphere(this.camera.position, c.theta, c.phi, radius, c);
    this.camera.lookAt(c.x, c.y, c.z);
  }
}
