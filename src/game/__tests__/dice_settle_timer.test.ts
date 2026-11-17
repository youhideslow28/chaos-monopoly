import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeDiceManager } from '../../components/board/three/ThreeDiceMeshes';

// BoxGeometry group order [+X, -X, +Y, -Y, +Z, -Z] matches the material order in ThreeDiceManager.
const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const FACE_VALUES = [4, 3, 1, 6, 2, 5];

function faceUp(mesh: THREE.Mesh): number {
  const rotation = new THREE.Matrix4().makeRotationFromEuler(mesh.rotation);
  let best = 0;
  let bestY = -Infinity;
  FACE_NORMALS.forEach((normal, i) => {
    const y = normal.clone().applyMatrix4(rotation).y;
    if (y > bestY) {
      bestY = y;
      best = i;
    }
  });
  return FACE_VALUES[best];
}

describe('ThreeDiceManager settles on the authoritative faces', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
    // Background tabs stop animation frames; the settle must not depend on them.
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    [5, 4],
    [1, 3],
    [2, 6],
    [6, 6],
  ])('shows %i and %i after a roll even when animation frames never run', (d1, d2) => {
    const manager = new ThreeDiceManager(new THREE.Scene());
    manager.rollTo(d1, d2, true);
    vi.advanceTimersByTime(1000);

    const internals = manager as unknown as { dice1Mesh: THREE.Mesh; dice2Mesh: THREE.Mesh };
    expect(faceUp(internals.dice1Mesh)).toBe(d1);
    expect(faceUp(internals.dice2Mesh)).toBe(d2);
  });
});
