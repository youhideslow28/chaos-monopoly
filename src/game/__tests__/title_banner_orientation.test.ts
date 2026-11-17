import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CAMERA_PRESET_POSES } from '../../components/board/three/ThreeCameraRig';
import { BOARD_HALF_SIZE } from '../../components/board/three/threeCoordinates';

/**
 * The plaza used to carry a red "CỜ TỶ PHÚ" title plate that faced the camera. The client
 * asked for a clean centre tabletop, so the plate was removed (session: board cleanup).
 *
 * This file used to assert the plate's orientation invariants. It now guards the removal
 * instead: no title artwork may be re-added to the scene, and the dice cluster must stay
 * comfortably inside the plaza at every camera angle.
 */
const PLAZA_WIDTH = BOARD_HALF_SIZE * 2 - 4.8;
/** Same ratio the scene manager uses for `diceCenterOffset`. */
const DICE_CENTER_OFFSET = PLAZA_WIDTH * 0.069;
const DICE_CLUSTER_RADIUS = 1.6;

const SCENE_MANAGER = path.resolve(
  process.cwd(),
  'src/components/board/three/ThreeSceneManager.ts'
);

describe('Board centre stays clean (title plate removed)', () => {
  it('creates no title artwork in the 3D scene', () => {
    const source = fs.readFileSync(SCENE_MANAGER, 'utf8');
    expect(source).not.toContain('CỜ TỶ PHÚ');
    expect(source).not.toMatch(/titleMesh|titleTexture|paintTitleBanner/);
  });

  it('keeps the dice cluster inside the plaza at every camera preset', () => {
    const plazaRadius = PLAZA_WIDTH / 2;
    for (const [name, pose] of Object.entries(CAMERA_PRESET_POSES)) {
      const theta = pose.theta;
      const x = DICE_CENTER_OFFSET * Math.sin(theta);
      const z = DICE_CENTER_OFFSET * Math.cos(theta);
      const reach = Math.hypot(x, z) + DICE_CLUSTER_RADIUS;
      expect(reach, `${name}: dice stay inside the plaza`).toBeLessThan(plazaRadius);
    }
  });

  it('keeps the dice cluster inside the plaza across a sampled full turn', () => {
    const plazaRadius = PLAZA_WIDTH / 2;
    for (let i = 0; i < 24; i++) {
      const theta = (i / 24) * Math.PI * 2;
      const x = DICE_CENTER_OFFSET * Math.sin(theta);
      const z = DICE_CENTER_OFFSET * Math.cos(theta);
      expect(Math.hypot(x, z) + DICE_CLUSTER_RADIUS).toBeLessThan(plazaRadius);
    }
  });
});
