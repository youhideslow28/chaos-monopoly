import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ThreeCameraRig, CAMERA_PRESET_POSES, FOLLOW_ZOOM, MAX_ZOOM } from '../../components/board/three/ThreeCameraRig';

const STEP = Math.PI / 2;
const newRig = () => new ThreeCameraRig(new THREE.PerspectiveCamera(38, 1, 0.1, 1000));

describe('Camera magnet: a released yaw snaps to the preset 90° grid', () => {
  it('Chuẩn (0°) snaps to the nearest 90° step when within 12°', () => {
    const rig = newRig();
    rig.setPreset('STANDARD');
    rig.orbit(0.1, 0);
    rig.settleYaw();
    expect(rig.goal.theta).toBeCloseTo(0, 6);

    rig.orbit(STEP + 0.05, 0);
    rig.settleYaw();
    expect(rig.goal.theta).toBeCloseTo(STEP, 6);
  });

  it('keeps the yaw when it is far from any step', () => {
    const rig = newRig();
    rig.setPreset('STANDARD');
    rig.orbit(0.3, 0);
    rig.settleYaw();
    expect(rig.goal.theta).toBeCloseTo(0.3, 6);
  });

  it('Iso snaps to its own grid (45°, 135°, …), not to 0°', () => {
    const rig = newRig();
    rig.setPreset('ISOMETRIC');
    const iso = CAMERA_PRESET_POSES.ISOMETRIC.theta;
    rig.orbit(0.04, 0);
    rig.settleYaw();
    expect(rig.goal.theta).toBeCloseTo(iso, 6);

    rig.orbit(STEP - 0.04, 0);
    rig.settleYaw();
    expect(rig.goal.theta).toBeCloseTo(iso + STEP, 6);
  });
});

describe('Camera follow: pinning to a tile turns the board so that edge faces the viewer', () => {
  it('a tile on the right edge turns the board 90° and centres the view on it', () => {
    const rig = newRig();
    rig.setPreset('STANDARD');
    rig.pinTo(2, 0.3);
    expect(rig.goal.theta).toBeCloseTo(STEP, 6);
    expect(rig.goal.x).toBe(2);
    expect(rig.goal.z).toBe(0.3);
    expect(rig.goal.zoom).toBeCloseTo(FOLLOW_ZOOM, 6);
  });

  it('pan stays clamped at follow zoom so the whole board remains in frame', () => {
    const rig = newRig();
    rig.setPreset('STANDARD');
    rig.pinTo(20, 1);
    expect(rig.goal.theta).toBeCloseTo(STEP, 6);
    expect(Math.abs(rig.goal.x)).toBeLessThan(20);
  });

  it('a tile on the near edge keeps the classic orientation (0°)', () => {
    const rig = newRig();
    rig.setPreset('STANDARD');
    rig.pinTo(1, 20);
    expect(rig.goal.theta).toBeCloseTo(0, 6);
  });

  it('pinning keeps the preset grid (Iso stays on 45° steps)', () => {
    const rig = newRig();
    rig.setPreset('ISOMETRIC');
    rig.pinTo(-20, 0);
    const offset = (rig.goal.theta - CAMERA_PRESET_POSES.ISOMETRIC.theta) / STEP;
    expect(Math.abs(offset - Math.round(offset))).toBeLessThan(1e-6);
  });

  it('follow zoom is clamped to the allowed range', () => {
    const rig = newRig();
    rig.pinTo(0, 0, 999);
    expect(rig.goal.zoom).toBe(MAX_ZOOM);
  });
});
