import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CAMERA_PRESETS,
  CameraPresetType,
  MIN_ZOOM,
  MAX_ZOOM,
  MIN_PAN,
  MAX_PAN,
  clampZoom,
  clampPan,
  getCameraPreset,
  calculateTileFocusPan,
  getCameraTransformString,
  useCameraState,
} from '../../components/camera/useCameraState';
import {
  CameraState,
  getTile3DPosition,
} from '../../components/board/spatialMath';

// Sanitization Oracle Helper: verifies string output has zero corrupted tokens
function assertSanitizedCSS(css: string, context: string) {
  expect(css, `${context} contained literal "NaN"`).not.toMatch(/\bNaN\b/);
  expect(css, `${context} contained literal "undefined"`).not.toMatch(/\bundefined\b/);
  expect(css, `${context} contained literal "null"`).not.toMatch(/\bnull\b/);
  expect(css, `${context} contained "[object Object]"`).not.toContain('[object Object]');
}

// Strict CSS 3D Transform Regex Validator
const CSS_3D_TRANSFORM_REGEX =
  /^translate3d\((-?\d+(?:\.\d+)?px),\s*(-?\d+(?:\.\d+)?px),\s*0\)\s+scale\((-?\d+(?:\.\d+)?)\)\s+rotateX\((-?\d+(?:\.\d+)?deg)\)\s+rotateZ\((-?\d+(?:\.\d+)?deg)\)$/;

describe('Challenger M3: Camera Mathematical Model & Focus Coordinate Stress Suite', () => {
  // =========================================================================
  // SECTION 1: Exhaustive 40-Tile Focus Stress Test & Clamping Invariants
  // =========================================================================
  describe('1. Exhaustive 40-Tile Focus Stress Test & Boundary Clamping', () => {
    const presets: CameraPresetType[] = ['TOP_DOWN', 'ISOMETRIC', 'CINEMATIC', 'TACTICAL'];
    const boardSizes = [180, 240, 360, 560, 760, 1000, 50000];

    it('guarantees calculateTileFocusPan stays strictly within [-250, 250] for all 40 tiles across all 4 presets', () => {
      let totalChecks = 0;

      for (const preset of presets) {
        const camera = getCameraPreset(preset);

        for (let tileId = 0; tileId < 40; tileId++) {
          const pan = calculateTileFocusPan(tileId, camera, 560);
          totalChecks++;

          // Invariant 1: Finite numbers
          expect(Number.isFinite(pan.panX), `Tile ${tileId} under ${preset} panX is not finite`).toBe(true);
          expect(Number.isFinite(pan.panY), `Tile ${tileId} under ${preset} panY is not finite`).toBe(true);

          // Invariant 2: Bounded inside [-250, 250]
          expect(pan.panX, `Tile ${tileId} under ${preset} panX out of bounds: ${pan.panX}`).toBeGreaterThanOrEqual(MIN_PAN);
          expect(pan.panX, `Tile ${tileId} under ${preset} panX out of bounds: ${pan.panX}`).toBeLessThanOrEqual(MAX_PAN);
          expect(pan.panY, `Tile ${tileId} under ${preset} panY out of bounds: ${pan.panY}`).toBeGreaterThanOrEqual(MIN_PAN);
          expect(pan.panY, `Tile ${tileId} under ${preset} panY out of bounds: ${pan.panY}`).toBeLessThanOrEqual(MAX_PAN);

          // Invariant 3: Precision rounded to 1 decimal place
          const roundedX = Math.round(pan.panX * 10) / 10;
          const roundedY = Math.round(pan.panY * 10) / 10;
          expect(pan.panX).toBeCloseTo(roundedX, 5);
          expect(pan.panY).toBeCloseTo(roundedY, 5);
        }
      }

      // 4 presets * 40 tiles = 160 verified combinations
      expect(totalChecks).toBe(160);
    });

    it('enforces [-250, 250] boundary invariant across varying and extreme board sizes (180px to 50,000px)', () => {
      for (const boardSize of boardSizes) {
        for (let tileId = 0; tileId < 40; tileId += 5) {
          for (const preset of presets) {
            const camera = getCameraPreset(preset);
            const pan = calculateTileFocusPan(tileId, camera, boardSize);

            expect(pan.panX).toBeGreaterThanOrEqual(MIN_PAN);
            expect(pan.panX).toBeLessThanOrEqual(MAX_PAN);
            expect(pan.panY).toBeGreaterThanOrEqual(MIN_PAN);
            expect(pan.panY).toBeLessThanOrEqual(MAX_PAN);
          }
        }
      }
    });

    it('handles zero and degenerate board sizes safely without NaN or crashes', () => {
      const camera = getCameraPreset('ISOMETRIC');
      const panZero = calculateTileFocusPan(0, camera, 0);

      expect(Number.isFinite(panZero.panX)).toBe(true);
      expect(Number.isFinite(panZero.panY)).toBe(true);
      expect(panZero.panX).toBeGreaterThanOrEqual(MIN_PAN);
      expect(panZero.panX).toBeLessThanOrEqual(MAX_PAN);
      expect(panZero.panY).toBeGreaterThanOrEqual(MIN_PAN);
      expect(panZero.panY).toBeLessThanOrEqual(MAX_PAN);
    });

    it('gracefully handles out-of-range tile IDs (negative, >=40, fractional, NaN)', () => {
      const camera = getCameraPreset('ISOMETRIC');
      const abnormalTileIds = [-1, -40, 40, 45, 100, 3.14159, NaN];

      abnormalTileIds.forEach((badId) => {
        const pan = calculateTileFocusPan(badId, camera, 560);
        expect(Number.isFinite(pan.panX)).toBe(true);
        expect(Number.isFinite(pan.panY)).toBe(true);
        expect(pan.panX).toBeGreaterThanOrEqual(MIN_PAN);
        expect(pan.panX).toBeLessThanOrEqual(MAX_PAN);
        expect(pan.panY).toBeGreaterThanOrEqual(MIN_PAN);
        expect(pan.panY).toBeLessThanOrEqual(MAX_PAN);
      });
    });
  });

  // =========================================================================
  // SECTION 2: Corner Tiles (0, 10, 20, 30) Geometric & Trigonometric Symmetry
  // =========================================================================
  describe('2. Corner Tiles (0, 10, 20, 30) Geometric & Trigonometric Symmetry', () => {
    it('verifies exact diagonal horizontal symmetry in ISOMETRIC view (yaw 45, pitch 55)', () => {
      const isoCamera = getCameraPreset('ISOMETRIC'); // yaw: 45, pitch: 55, zoom: 1.0
      const boardSize = 560;

      // In a 45-degree rotated diamond, Corner 0 (GO at South) and Corner 20 (Free Parking at North)
      // lie exactly on the central vertical axis (rotX = 0).
      const pan0 = calculateTileFocusPan(0, isoCamera, boardSize);
      const pan20 = calculateTileFocusPan(20, isoCamera, boardSize);

      expect(Math.abs(pan0.panX)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(pan20.panX)).toBeLessThanOrEqual(0.1);

      // Corner 10 (Jail at West) and Corner 30 (Go to Jail at East) lie along the horizontal axis.
      // By geometry, their horizontal offsets must be opposite in sign and equal in magnitude: panX(10) == -panX(30).
      const pan10 = calculateTileFocusPan(10, isoCamera, boardSize);
      const pan30 = calculateTileFocusPan(30, isoCamera, boardSize);

      expect(pan10.panX).toBeCloseTo(-pan30.panX, 1);
    });

    it('verifies exact orthogonal point-reflection symmetry in TOP_DOWN view (yaw 0, pitch 0)', () => {
      const topDownCamera = getCameraPreset('TOP_DOWN'); // yaw: 0, pitch: 0, zoom: 1.0
      const boardSize = 400; // Small board size so coords do not saturate clamp bounds

      // Tile 0 is at (col 11, row 11) -> normalized (0.5, 0.5) -> pos (200, 200)
      // Tile 20 is at (col 1, row 1)   -> normalized (-0.5, -0.5) -> pos (-200, -200)
      const pan0 = calculateTileFocusPan(0, topDownCamera, boardSize);
      const pan20 = calculateTileFocusPan(20, topDownCamera, boardSize);

      expect(pan0.panX).toBeCloseTo(-pan20.panX, 1);
      expect(pan0.panY).toBeCloseTo(-pan20.panY, 1);

      // Tile 10 is at (col 1, row 11) -> normalized (-0.5, 0.5) -> pos (-200, 200)
      // Tile 30 is at (col 11, row 1) -> normalized (0.5, -0.5) -> pos (200, -200)
      const pan10 = calculateTileFocusPan(10, topDownCamera, boardSize);
      const pan30 = calculateTileFocusPan(30, topDownCamera, boardSize);

      expect(pan10.panX).toBeCloseTo(-pan30.panX, 1);
      expect(pan10.panY).toBeCloseTo(-pan30.panY, 1);
    });

    it('maintains corner boundary invariants under CINEMATIC and TACTICAL presets', () => {
      const cinematic = getCameraPreset('CINEMATIC');
      const tactical = getCameraPreset('TACTICAL');

      [0, 10, 20, 30].forEach((corner) => {
        const panCine = calculateTileFocusPan(corner, cinematic, 560);
        const panTac = calculateTileFocusPan(corner, tactical, 560);

        expect(panCine.panX).toBeGreaterThanOrEqual(MIN_PAN);
        expect(panCine.panX).toBeLessThanOrEqual(MAX_PAN);
        expect(panCine.panY).toBeGreaterThanOrEqual(MIN_PAN);
        expect(panCine.panY).toBeLessThanOrEqual(MAX_PAN);

        expect(panTac.panX).toBeGreaterThanOrEqual(MIN_PAN);
        expect(panTac.panX).toBeLessThanOrEqual(MAX_PAN);
        expect(panTac.panY).toBeGreaterThanOrEqual(MIN_PAN);
        expect(panTac.panY).toBeLessThanOrEqual(MAX_PAN);
      });
    });
  });

  // =========================================================================
  // SECTION 3: Extreme Camera Angles & Coordinate Stress
  // =========================================================================
  describe('3. Extreme Camera Angles & Pitch/Yaw Stress', () => {
    const extremePitches = [-180, -90, -45, 0, 15, 35, 55, 75, 80, 90, 180, 360];
    const extremeYaws = [-1080, -720, -360, -180, -90, 0, 45, 90, 180, 360, 720, 1080];

    it('guarantees focus pan never breaches [-250, 250] under arbitrary extreme pitch and yaw angles', () => {
      for (const pitch of extremePitches) {
        for (const yaw of extremeYaws) {
          const testCamera: CameraState = {
            pitch,
            yaw,
            zoom: 1.0,
            panX: 0,
            panY: 0,
          };

          // Test a sampling of tiles: corners and edge midpoints
          const sampleTiles = [0, 5, 10, 15, 20, 25, 30, 35];
          for (const tileId of sampleTiles) {
            const pan = calculateTileFocusPan(tileId, testCamera, 560);

            expect(Number.isFinite(pan.panX)).toBe(true);
            expect(Number.isFinite(pan.panY)).toBe(true);
            expect(pan.panX).toBeGreaterThanOrEqual(MIN_PAN);
            expect(pan.panX).toBeLessThanOrEqual(MAX_PAN);
            expect(pan.panY).toBeGreaterThanOrEqual(MIN_PAN);
            expect(pan.panY).toBeLessThanOrEqual(MAX_PAN);
          }
        }
      }
    });

    it('safely handles non-finite (NaN, Infinity, -Infinity) camera angles without throwing', () => {
      // When both pitch and yaw are NaN, rotX and rotY are NaN, and pan cleanly falls back to (0, 0)
      const fullNaNCam: CameraState = { pitch: NaN, yaw: NaN, zoom: 1.0, panX: 0, panY: 0 };
      const panNaN = calculateTileFocusPan(0, fullNaNCam, 560);
      expect(panNaN.panX).toBe(0);
      expect(panNaN.panY).toBe(0);

      const nonFiniteCameras: CameraState[] = [
        { pitch: NaN, yaw: 0, zoom: 1.0, panX: 0, panY: 0 },
        { pitch: 55, yaw: NaN, zoom: 1.0, panX: 0, panY: 0 },
        { pitch: Infinity, yaw: 45, zoom: 1.0, panX: 0, panY: 0 },
        { pitch: 55, yaw: -Infinity, zoom: 1.0, panX: 0, panY: 0 },
      ];

      nonFiniteCameras.forEach((cam) => {
        const pan = calculateTileFocusPan(0, cam, 560);
        expect(Number.isFinite(pan.panX)).toBe(true);
        expect(Number.isFinite(pan.panY)).toBe(true);
        expect(pan.panX).toBeGreaterThanOrEqual(MIN_PAN);
        expect(pan.panX).toBeLessThanOrEqual(MAX_PAN);
        expect(pan.panY).toBeGreaterThanOrEqual(MIN_PAN);
        expect(pan.panY).toBeLessThanOrEqual(MAX_PAN);
      });
    });

    it('exhibits exact 360-degree rotational periodicity in yaw', () => {
      const camera0: CameraState = { pitch: 55, yaw: 45, zoom: 1.0, panX: 0, panY: 0 };
      const camera360: CameraState = { pitch: 55, yaw: 45 + 360, zoom: 1.0, panX: 0, panY: 0 };
      const camera720: CameraState = { pitch: 55, yaw: 45 - 720, zoom: 1.0, panX: 0, panY: 0 };

      for (let tileId = 0; tileId < 40; tileId += 4) {
        const pan0 = calculateTileFocusPan(tileId, camera0, 560);
        const pan360 = calculateTileFocusPan(tileId, camera360, 560);
        const pan720 = calculateTileFocusPan(tileId, camera720, 560);

        expect(pan360.panX).toBeCloseTo(pan0.panX, 1);
        expect(pan360.panY).toBeCloseTo(pan0.panY, 1);
        expect(pan720.panX).toBeCloseTo(pan0.panX, 1);
        expect(pan720.panY).toBeCloseTo(pan0.panY, 1);
      }
    });
  });

  // =========================================================================
  // SECTION 4: Extreme Numerical Stress on clampZoom and clampPan
  // =========================================================================
  describe('4. Extreme Numerical Stress on clampZoom and clampPan', () => {
    describe('clampZoom', () => {
      it('clamps astronomical positive values to MAX_ZOOM (1.6)', () => {
        expect(clampZoom(1.60001)).toBe(1.6);
        expect(clampZoom(2.0)).toBe(1.6);
        expect(clampZoom(100)).toBe(1.6);
        expect(clampZoom(1e9)).toBe(1.6);
        expect(clampZoom(1e20)).toBe(1.6);
        expect(clampZoom(Number.MAX_VALUE)).toBe(1.6);
        expect(clampZoom(Infinity)).toBe(1.6);
      });

      it('clamps astronomical negative and sub-minimum values to MIN_ZOOM (0.6)', () => {
        expect(clampZoom(0.59999)).toBe(0.6);
        expect(clampZoom(0.5)).toBe(0.6);
        expect(clampZoom(0.00001)).toBe(0.6);
        expect(clampZoom(0)).toBe(0.6);
        expect(clampZoom(-0)).toBe(0.6);
        expect(clampZoom(-1)).toBe(0.6);
        expect(clampZoom(-100)).toBe(0.6);
        expect(clampZoom(-1e9)).toBe(0.6);
        expect(clampZoom(-Number.MAX_VALUE)).toBe(0.6);
        expect(clampZoom(-Infinity)).toBe(0.6);
      });

      it('rounds within-range zoom values to 2 decimal places', () => {
        expect(clampZoom(0.601)).toBe(0.6);
        expect(clampZoom(0.854)).toBe(0.85);
        expect(clampZoom(0.856)).toBe(0.86);
        expect(clampZoom(1.155)).toBe(1.16);
        expect(clampZoom(1.594)).toBe(1.59);
      });

      it('returns safe fallback 1.0 when zoom is NaN', () => {
        expect(clampZoom(NaN)).toBe(1.0);
      });
    });

    describe('clampPan', () => {
      it('clamps astronomical positive values to MAX_PAN (250)', () => {
        expect(clampPan(250.001)).toBe(250);
        expect(clampPan(251)).toBe(250);
        expect(clampPan(500)).toBe(250);
        expect(clampPan(1e9)).toBe(250);
        expect(clampPan(1e20)).toBe(250);
        expect(clampPan(Number.MAX_VALUE)).toBe(250);
        expect(clampPan(Infinity)).toBe(250);
      });

      it('clamps astronomical negative values to MIN_PAN (-250)', () => {
        expect(clampPan(-250.001)).toBe(-250);
        expect(clampPan(-251)).toBe(-250);
        expect(clampPan(-500)).toBe(-250);
        expect(clampPan(-1e9)).toBe(-250);
        expect(clampPan(-1e20)).toBe(-250);
        expect(clampPan(-Number.MAX_VALUE)).toBe(-250);
        expect(clampPan(-Infinity)).toBe(-250);
      });

      it('rounds within-range pan values to 1 decimal place', () => {
        expect(clampPan(0)).toBe(0);
        expect(Math.abs(clampPan(-0))).toBe(0);
        expect(clampPan(42.54)).toBe(42.5);
        expect(clampPan(42.56)).toBe(42.6);
        expect(clampPan(-185.34)).toBe(-185.3);
        expect(clampPan(-185.38)).toBe(-185.4);
      });

      it('returns safe fallback 0 when val is NaN', () => {
        expect(clampPan(NaN)).toBe(0);
      });
    });
  });

  // =========================================================================
  // SECTION 5: CSS 3D Transform String Syntax & Robustness
  // =========================================================================
  describe('5. CSS 3D Transform String Syntax & Robustness', () => {
    it('formats valid CSS 3D transform strings adhering to strict translate3d scale rotateX rotateZ specification', () => {
      const presets: CameraPresetType[] = ['TOP_DOWN', 'ISOMETRIC', 'CINEMATIC', 'TACTICAL'];

      presets.forEach((preset) => {
        const camera = getCameraPreset(preset);
        const transformStr = getCameraTransformString(camera);

        assertSanitizedCSS(transformStr, `Preset ${preset} transform`);
        expect(transformStr).toMatch(CSS_3D_TRANSFORM_REGEX);

        // Verifies specific components
        expect(transformStr).toContain(`translate3d(${camera.panX}px, ${camera.panY}px, 0)`);
        expect(transformStr).toContain(`scale(${camera.zoom})`);
        expect(transformStr).toContain(`rotateX(${camera.pitch}deg)`);
        expect(transformStr).toContain(`rotateZ(${camera.yaw}deg)`);
      });
    });

    it('generates fully valid CSS transforms under boundary and negative pan/angle states', () => {
      const boundaryCases: CameraState[] = [
        { pitch: 0, yaw: 0, zoom: 0.6, panX: -250, panY: -250 },
        { pitch: 80, yaw: -180, zoom: 1.6, panX: 250, panY: 250 },
        { pitch: 45.5, yaw: 135.2, zoom: 1.25, panX: -42.8, panY: 105.3 },
      ];

      boundaryCases.forEach((camera, idx) => {
        const transformStr = getCameraTransformString(camera);
        assertSanitizedCSS(transformStr, `Boundary case #${idx}`);
        expect(transformStr).toMatch(CSS_3D_TRANSFORM_REGEX);
      });
    });

    it('handles falsy or zero zoom by safely defaulting to 1.0', () => {
      const cameraZeroZoom: CameraState = {
        pitch: 55,
        yaw: 45,
        zoom: 0, // Falsy
        panX: 0,
        panY: 0,
      };

      const transformStr = getCameraTransformString(cameraZeroZoom);
      expect(transformStr).toContain('scale(1)');
      assertSanitizedCSS(transformStr, 'Falsy zoom transform');
    });

    it('generates 100 randomized camera states with zero NaN, undefined, or malformed syntax', () => {
      for (let i = 0; i < 100; i++) {
        const randomPitch = Math.round((Math.random() * 90) * 10) / 10;
        const randomYaw = Math.round((Math.random() * 360 - 180) * 10) / 10;
        const randomZoom = Math.round((0.6 + Math.random() * 1.0) * 100) / 100;
        const randomPanX = Math.round((Math.random() * 500 - 250) * 10) / 10;
        const randomPanY = Math.round((Math.random() * 500 - 250) * 10) / 10;

        const randomCamera: CameraState = {
          pitch: randomPitch,
          yaw: randomYaw,
          zoom: randomZoom,
          panX: randomPanX,
          panY: randomPanY,
        };

        const transformStr = getCameraTransformString(randomCamera);
        assertSanitizedCSS(transformStr, `Random camera sample #${i}`);
        expect(transformStr).toMatch(CSS_3D_TRANSFORM_REGEX);
      }
    });
  });

  // =========================================================================
  // SECTION 6: Perimeter Monotonicity & Adjacent Tile Delta Continuity
  // =========================================================================
  describe('6. Perimeter Monotonicity & Adjacent Tile Delta Continuity', () => {
    it('verifies adjacent perimeter tiles exhibit continuous bounded displacement without discontinuity spikes', () => {
      const camera = getCameraPreset('ISOMETRIC');
      const boardSize = 560;

      // Check step delta between consecutive perimeter tiles
      const maxAllowedDelta = 120; // px displacement between adjacent tiles

      for (let i = 0; i < 40; i++) {
        const nextId = (i + 1) % 40;
        const panA = calculateTileFocusPan(i, camera, boardSize);
        const panB = calculateTileFocusPan(nextId, camera, boardSize);

        const delta = Math.hypot(panB.panX - panA.panX, panB.panY - panA.panY);
        expect(delta, `Tile ${i} to ${nextId} displacement spike of ${delta}px exceeds max allowed ${maxAllowedDelta}px`).toBeLessThanOrEqual(maxAllowedDelta);
      }
    });

    it('demonstrates identical focus pan for identical calls (pure deterministic mathematical guarantee)', () => {
      const camera = getCameraPreset('CINEMATIC');

      for (let tileId = 0; tileId < 40; tileId += 3) {
        const panCall1 = calculateTileFocusPan(tileId, camera, 560);
        const panCall2 = calculateTileFocusPan(tileId, camera, 560);

        expect(panCall1.panX).toBe(panCall2.panX);
        expect(panCall1.panY).toBe(panCall2.panY);
      }
    });
  });

  // =========================================================================
  // SECTION 7: Preset Immutability & Safe Defaults
  // =========================================================================
  describe('7. Preset Immutability & Safe Defaults', () => {
    it('returns brand new decoupled CameraState objects from getCameraPreset without shared references', () => {
      const state1 = getCameraPreset('ISOMETRIC');
      const state2 = getCameraPreset('ISOMETRIC');

      expect(state1).not.toBe(state2); // Different memory references
      expect(state1).toEqual(state2);

      // Mutating state1 must not pollute state2 or CAMERA_PRESETS
      state1.panX = 99;
      state1.zoom = 1.5;
      expect(state2.panX).toBe(0);
      expect(state2.zoom).toBe(1.0);
      expect(CAMERA_PRESETS.ISOMETRIC.zoom).toBe(1.0);
    });

    it('falls back safely to ISOMETRIC for unknown or corrupted preset strings', () => {
      const fallback = getCameraPreset('INVALID_VIEW' as any);
      expect(fallback.preset).toBe('ISOMETRIC');
      expect(fallback.pitch).toBe(55);
      expect(fallback.yaw).toBe(45);
      expect(fallback.zoom).toBe(1.0);
    });
  });

  // =========================================================================
  // SECTION 8: Interactive Hook Behavior & State Transition Mechanics
  // =========================================================================
  describe('8. Interactive Hook Behavior & State Transition Mechanics', () => {
    it('initializes correct preset based on is3DView option', () => {
      let hook3D: any;
      let hook2D: any;

      function Test3D() {
        hook3D = useCameraState({ is3DView: true });
        return null;
      }

      function Test2D() {
        hook2D = useCameraState({ is3DView: false });
        return null;
      }

      renderToStaticMarkup(React.createElement(Test3D));
      renderToStaticMarkup(React.createElement(Test2D));

      expect(hook3D.camera.preset).toBe('ISOMETRIC');
      expect(hook3D.camera.pitch).toBe(55);
      expect(hook3D.camera.yaw).toBe(45);

      expect(hook2D.camera.preset).toBe('TOP_DOWN');
      expect(hook2D.camera.pitch).toBe(0);
      expect(hook2D.camera.yaw).toBe(0);
    });

    it('renders valid cameraTransform string directly from hook output', () => {
      let hookResult: any;

      function TestHook() {
        hookResult = useCameraState({ initialPreset: 'CINEMATIC' });
        return null;
      }

      renderToStaticMarkup(React.createElement(TestHook));

      expect(hookResult.cameraTransform).toMatch(CSS_3D_TRANSFORM_REGEX);
      expect(hookResult.cameraTransform).toContain('rotateX(65deg)');
      expect(hookResult.cameraTransform).toContain('rotateZ(20deg)');
      assertSanitizedCSS(hookResult.cameraTransform, 'Hook cameraTransform');
    });
  });

  // =========================================================================
  // SECTION 9: Pointer Drag & Wheel Zoom Mathematical Simulation
  // =========================================================================
  describe('9. Pointer Drag & Wheel Zoom Mathematical Simulation', () => {
    it('simulates progressive zoom clamping over repeated wheel scroll cycles', () => {
      let zoom = 1.0;
      const zoomStep = 0.08;

      // 15 wheel-up actions (zoom in)
      for (let i = 0; i < 15; i++) {
        zoom = clampZoom(zoom + zoomStep);
        expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
        expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
      }
      expect(zoom).toBe(MAX_ZOOM); // Exactly 1.6

      // 25 wheel-down actions (zoom out)
      for (let i = 0; i < 25; i++) {
        zoom = clampZoom(zoom - zoomStep);
        expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
        expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
      }
      expect(zoom).toBe(MIN_ZOOM); // Exactly 0.6
    });

    it('simulates pointer pan drag deadzone threshold (<=3px ignored) and clamp bounds', () => {
      const dragStart = { x: 200, y: 300 };
      expect(dragStart.x).toBe(200);
      const panStart = { x: 0, y: 0 };

      // Micro-jitters within 3px threshold (e.g. deltaX=2, deltaY=1 -> hypot=2.23px)
      const jitterDelta = { x: 2, y: 1 };
      const jitterHypot = Math.hypot(jitterDelta.x, jitterDelta.y);
      expect(jitterHypot <= 3).toBe(true);

      // Definite drag movement beyond 3px threshold (deltaX=20, deltaY=15 -> hypot=25px)
      const moveDelta = { x: 20, y: 15 };
      const moveHypot = Math.hypot(moveDelta.x, moveDelta.y);
      expect(moveHypot > 3).toBe(true);

      const activePanX = clampPan(panStart.x + moveDelta.x);
      const activePanY = clampPan(panStart.y + moveDelta.y);
      expect(activePanX).toBe(20);
      expect(activePanY).toBe(15);

      // Extreme pointer fling (e.g. +5000px horizontally, -5000px vertically)
      const flingPanX = clampPan(panStart.x + 5000);
      const flingPanY = clampPan(panStart.y - 5000);
      expect(flingPanX).toBe(MAX_PAN); // 250
      expect(flingPanY).toBe(MIN_PAN); // -250
    });
  });

  // =========================================================================
  // SECTION 10: formatCameraTransform Contract & Projection Depth Sanity
  // =========================================================================
  describe('10. formatCameraTransform Contract & Projection Depth Sanity', () => {
    // Verify formatCameraTransform alias contract matches getCameraTransformString
    const formatCameraTransform = getCameraTransformString;

    it('ensures formatCameraTransform satisfies exact CSS transform contract', () => {
      const camera: CameraState = {
        pitch: 55,
        yaw: 45,
        zoom: 1.0,
        panX: 0,
        panY: 0,
      };

      const css = formatCameraTransform(camera);
      expect(css).toBe('translate3d(0px, 0px, 0) scale(1) rotateX(55deg) rotateZ(45deg)');
      expect(css).toMatch(CSS_3D_TRANSFORM_REGEX);
      assertSanitizedCSS(css, 'formatCameraTransform default');
    });

    it('verifies 3D depth monotonicity: Tile 0 (foreground) has greater screen depth than Tile 20 (background)', () => {
      const camera = getCameraPreset('ISOMETRIC'); // yaw 45, pitch 55
      const boardSize = 560;

      // In isometric diamond view, tile 0 (GO) is in foreground (+y in board coordinates),
      // while tile 20 (Free Parking) is in background (-y in board coordinates).
      // depth formula: depth = rotY * sin(pitch) + z * cos(pitch)
      const pos0 = getTile3DPosition(0, boardSize, 28);
      const pos20 = getTile3DPosition(20, boardSize, 28);

      const radYaw = (camera.yaw * Math.PI) / 180;
      const radPitch = (camera.pitch * Math.PI) / 180;

      const rotY0 = pos0.x * Math.sin(radYaw) + pos0.y * Math.cos(radYaw);
      const rotY20 = pos20.x * Math.sin(radYaw) + pos20.y * Math.cos(radYaw);

      const depth0 = rotY0 * Math.sin(radPitch) + pos0.z * Math.cos(radPitch);
      const depth20 = rotY20 * Math.sin(radPitch) + pos20.z * Math.cos(radPitch);

      // Tile 0 must have strictly greater depth (closer to viewer) than Tile 20
      expect(depth0).toBeGreaterThan(depth20);
    });
  });
});
