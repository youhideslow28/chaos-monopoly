/**
 * CHAOS MONOPOLY — 3D Physical Dice Mesh Factory
 * Generates genuine 3D six-sided dice with authentic indented pips,
 * dynamic rolling physics, and authoritative outcome synchronization.
 */

import * as THREE from 'three';

/**
 * Creates procedural texture for a dice face with pip circles.
 */
function createDiceFaceTexture(value: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Pure ivory card white surface
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  // Soft border bezel
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 244, 244);

  // Pip drawing helper
  const drawPip = (x: number, y: number, isRed: boolean = false) => {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = isRed ? '#dc2626' : '#0f172a';
    ctx.fill();

    // Pip inner depth shadow
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  const center = 128;
  const left = 68;
  const right = 188;
  const top = 68;
  const bottom = 188;

  switch (value) {
    case 1:
      // Face 1: Large Red Pip (Asian / International standard)
      ctx.beginPath();
      ctx.arc(center, center, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      break;
    case 2:
      drawPip(left, top);
      drawPip(right, bottom);
      break;
    case 3:
      drawPip(left, top);
      drawPip(center, center);
      drawPip(right, bottom);
      break;
    case 4:
      // Face 4: Four red or black pips
      drawPip(left, top, true);
      drawPip(right, top, true);
      drawPip(left, bottom, true);
      drawPip(right, bottom, true);
      break;
    case 5:
      drawPip(left, top);
      drawPip(right, top);
      drawPip(center, center);
      drawPip(left, bottom);
      drawPip(right, bottom);
      break;
    case 6:
      drawPip(left, top);
      drawPip(right, top);
      drawPip(left, center);
      drawPip(right, center);
      drawPip(left, bottom);
      drawPip(right, bottom);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Standard dice Euler rotations so that a chosen value (1..6) faces directly UP (+Y).
 */
const DICE_ROTATIONS_FOR_UP_FACE: Record<number, { x: number; y: number; z: number }> = {
  // Box face mapping: [+X: 4, -X: 3, +Y: 1, -Y: 6, +Z: 2, -Z: 5]
  1: { x: 0, y: 0, z: 0 },
  2: { x: -Math.PI / 2, y: 0, z: 0 },
  3: { x: 0, y: 0, z: -Math.PI / 2 },
  4: { x: 0, y: 0, z: Math.PI / 2 },
  5: { x: Math.PI / 2, y: 0, z: 0 },
  6: { x: Math.PI, y: 0, z: 0 },
};

export class ThreeDiceManager {
  private container: THREE.Group;
  private dice1Mesh: THREE.Mesh;
  private dice2Mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.container = new THREE.Group();
    this.container.name = 'ThreeDiceContainer';
    // Position dice in the central open plaza slightly above surface
    this.container.position.set(0, 0.52, 0);

    const diceGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);

    // Create 6 face materials [+X, -X, +Y, -Y, +Z, -Z] => [4, 3, 1, 6, 2, 5]
    const materials = [
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(4), roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(3), roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(1), roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(6), roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(2), roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(5), roughness: 0.25 }),
    ];

    this.dice1Mesh = new THREE.Mesh(diceGeo, materials);
    this.dice1Mesh.position.set(-0.9, 0, 0);
    this.dice1Mesh.castShadow = true;
    this.dice1Mesh.receiveShadow = true;
    this.container.add(this.dice1Mesh);

    this.dice2Mesh = new THREE.Mesh(diceGeo, materials);
    this.dice2Mesh.position.set(0.9, 0, 0);
    this.dice2Mesh.castShadow = true;
    this.dice2Mesh.receiveShadow = true;
    this.container.add(this.dice2Mesh);

    scene.add(this.container);
  }

  private tumbleFrameId: number | null = null;
  private settleToken = 0;
  private reducedMotion = false;

  /**
   * Shifts the dice on the plaza (x/z only; the roll animation owns y), keeping the cluster
   * slightly toward the viewer instead of dead centre.
   */
  public setPlazaOffset(x: number, z: number): void {
    this.container.position.x = x;
    this.container.position.z = z;
  }

  /** When enabled, dice never spin or bounce; they just show the final faces. */
  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) {
      this.stopTumble();
      this.settleToken++;
      this.container.position.y = 0.52;
    }
  }

  /**
   * Starts a continuous tumble (used while waiting for the authoritative result).
   * Call `rollTo` to settle the dice on the real values.
   */
  public tumble(): void {
    this.settleToken++;
    if (this.reducedMotion) return;
    if (this.tumbleFrameId !== null) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / 1000;
      this.dice1Mesh.rotation.x += 0.23;
      this.dice1Mesh.rotation.y += 0.17;
      this.dice1Mesh.rotation.z += 0.11;
      this.dice2Mesh.rotation.x += 0.13;
      this.dice2Mesh.rotation.y += 0.21;
      this.dice2Mesh.rotation.z += 0.19;
      this.container.position.y = 0.52 + Math.abs(Math.sin(t * 7)) * 0.9;
      this.tumbleFrameId = requestAnimationFrame(step);
    };
    this.tumbleFrameId = requestAnimationFrame(step);
  }

  private stopTumble(): void {
    if (this.tumbleFrameId !== null) {
      cancelAnimationFrame(this.tumbleFrameId);
      this.tumbleFrameId = null;
    }
  }

  /**
   * Aligns faces to authoritative results (animated settle, or instant).
   */
  public rollTo(d1: number, d2: number, animate: boolean = true): void {
    const wasTumbling = this.tumbleFrameId !== null;
    this.stopTumble();
    const token = ++this.settleToken;
    this.container.position.y = 0.52;
    animate = animate && !this.reducedMotion;
    const rot1 = DICE_ROTATIONS_FOR_UP_FACE[d1] || DICE_ROTATIONS_FOR_UP_FACE[1];
    const rot2 = DICE_ROTATIONS_FOR_UP_FACE[d2] || DICE_ROTATIONS_FOR_UP_FACE[1];

    if (!animate) {
      this.dice1Mesh.rotation.set(rot1.x, rot1.y, rot1.z);
      this.dice2Mesh.rotation.set(rot2.x, rot2.y, rot2.z);
      return;
    }

    // Settle on exact target. Normalise start angles so interpolation never lands off-face.
    const TWO_PI = Math.PI * 2;
    const norm = (a: number) => ((a % TWO_PI) + TWO_PI) % TWO_PI;
    this.dice1Mesh.rotation.set(norm(this.dice1Mesh.rotation.x), norm(this.dice1Mesh.rotation.y), norm(this.dice1Mesh.rotation.z));
    this.dice2Mesh.rotation.set(norm(this.dice2Mesh.rotation.x), norm(this.dice2Mesh.rotation.y), norm(this.dice2Mesh.rotation.z));
    const startRot1 = { x: this.dice1Mesh.rotation.x, y: this.dice1Mesh.rotation.y, z: this.dice1Mesh.rotation.z };
    const startRot2 = { x: this.dice2Mesh.rotation.x, y: this.dice2Mesh.rotation.y, z: this.dice2Mesh.rotation.z };
    const extraSpins = wasTumbling ? TWO_PI : Math.PI * 4;

    const duration = wasTumbling ? 420 : 650; // ms
    const startTime = performance.now();
    let settled = false;

    const settle = () => {
      if (settled || token !== this.settleToken) return;
      settled = true;
      this.dice1Mesh.rotation.set(rot1.x, rot1.y, rot1.z);
      this.dice2Mesh.rotation.set(rot2.x, rot2.y, rot2.z);
      this.container.position.y = 0.52;
    };

    const animateRoll = (now: number) => {
      if (settled || token !== this.settleToken) return; // superseded by a newer roll/tumble
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      // Smooth cubic-out easing
      const ease = 1 - Math.pow(1 - progress, 3);

      this.dice1Mesh.rotation.x = startRot1.x + (rot1.x + extraSpins - startRot1.x) * ease;
      this.dice1Mesh.rotation.y = startRot1.y + (rot1.y + extraSpins - startRot1.y) * ease;
      this.dice1Mesh.rotation.z = startRot1.z + (rot1.z + extraSpins - startRot1.z) * ease;

      this.dice2Mesh.rotation.x = startRot2.x + (rot2.x + extraSpins - startRot2.x) * ease;
      this.dice2Mesh.rotation.y = startRot2.y + (rot2.y + extraSpins - startRot2.y) * ease;
      this.dice2Mesh.rotation.z = startRot2.z + (rot2.z + extraSpins - startRot2.z) * ease;

      // Parabolic bounce
      const bounceHeight = Math.sin(progress * Math.PI) * 1.4;
      this.container.position.y = 0.52 + bounceHeight;

      if (progress < 1.0) {
        requestAnimationFrame(animateRoll);
      } else {
        settle();
      }
    };

    requestAnimationFrame(animateRoll);
    // requestAnimationFrame stops in background tabs, which would leave the dice frozen on their
    // starting face. A timer always lands the authoritative result.
    setTimeout(settle, duration + 100);
  }

  public dispose(): void {
    this.stopTumble();
    this.settleToken++;
    this.container.clear();
  }
}
