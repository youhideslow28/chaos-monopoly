import { describe, it, expect } from 'vitest';
import {
  getTileBoardCoords,
  getTileGridPosition,
  getTile3DPosition,
  calculateDepthIndex,
  calculateFitBoardSize,
  getBillboardTransform,
  project3DToScreen,
  screenToTileId,
  DEFAULT_CAMERA,
  TOP_DOWN_CAMERA,
  CameraState,
} from '../../components/board/spatialMath';

/**
 * Empirical Adversarial Test Harness for Milestone 1:
 * Spatial Math Engine (src/components/board/spatialMath.ts)
 */
describe('Empirical Challenger: Spatial Math Adversarial Stress Suite', () => {
  // =========================================================================
  // 1. ALL 40 TILES NORMALIZED COORDINATES & BOUNDS [-0.5, 0.5]
  // =========================================================================
  describe('1. Adversarial Coordinate Engine (All 40 Tiles & Cyclic Extensions)', () => {
    it('guarantees all 40 tiles (0..39) have valid normalized coordinates strictly within [-0.5, 0.5]', () => {
      for (let tileId = 0; tileId < 40; tileId++) {
        const gridPos = getTileGridPosition(tileId);
        expect(gridPos.col).toBeGreaterThanOrEqual(1);
        expect(gridPos.col).toBeLessThanOrEqual(11);
        expect(gridPos.row).toBeGreaterThanOrEqual(1);
        expect(gridPos.row).toBeLessThanOrEqual(11);

        const coords = getTileBoardCoords(tileId);

        // Finite and strictly within [-0.5, 0.5]
        expect(Number.isFinite(coords.x)).toBe(true);
        expect(Number.isFinite(coords.y)).toBe(true);
        expect(coords.x).toBeGreaterThanOrEqual(-0.5);
        expect(coords.x).toBeLessThanOrEqual(0.5);
        expect(coords.y).toBeGreaterThanOrEqual(-0.5);
        expect(coords.y).toBeLessThanOrEqual(0.5);

        // Every tile on the perimeter board must touch at least one boundary edge (|x| == 0.5 or |y| == 0.5)
        const touchesPerimeter =
          Math.abs(Math.abs(coords.x) - 0.5) < 1e-6 ||
          Math.abs(Math.abs(coords.y) - 0.5) < 1e-6;
        expect(touchesPerimeter).toBe(true);
      }
    });

    it('verifies exact 4 corner tile normalized positions', () => {
      // Tile 0 (Start): Bottom-Right (+0.5, +0.5)
      expect(getTileBoardCoords(0)).toEqual({ x: 0.5, y: 0.5 });
      // Tile 10 (Detention): Bottom-Left (-0.5, +0.5)
      expect(getTileBoardCoords(10)).toEqual({ x: -0.5, y: 0.5 });
      // Tile 20 (Free Parking): Top-Left (-0.5, -0.5)
      expect(getTileBoardCoords(20)).toEqual({ x: -0.5, y: -0.5 });
      // Tile 30 (Go To Detention): Top-Right (+0.5, -0.5)
      expect(getTileBoardCoords(30)).toEqual({ x: 0.5, y: -0.5 });
    });

    it('verifies exact edge center tile normalized positions', () => {
      // Tile 5 (Mid-Bottom): col 6, row 11 -> x: 0, y: 0.5
      expect(getTileBoardCoords(5)).toEqual({ x: 0, y: 0.5 });
      // Tile 15 (Mid-Left): col 1, row 6 -> x: -0.5, y: 0
      expect(getTileBoardCoords(15)).toEqual({ x: -0.5, y: 0 });
      // Tile 25 (Mid-Top): col 6, row 1 -> x: 0, y: -0.5
      expect(getTileBoardCoords(25)).toEqual({ x: 0, y: -0.5 });
      // Tile 35 (Mid-Right): col 11, row 6 -> x: 0.5, y: 0
      expect(getTileBoardCoords(35)).toEqual({ x: 0.5, y: 0 });
    });

    it('handles cyclic modulo extension for arbitrary positive, negative, and extreme integers', () => {
      const testCases = [-400, -81, -41, -40, -1, 40, 41, 79, 80, 400, 100003];
      for (const rawId of testCases) {
        const normalizedExpectedId = ((rawId % 40) + 40) % 40;
        const coords = getTileBoardCoords(rawId);
        const expectedCoords = getTileBoardCoords(normalizedExpectedId);

        expect(coords).toEqual(expectedCoords);
        expect(coords.x).toBeGreaterThanOrEqual(-0.5);
        expect(coords.x).toBeLessThanOrEqual(0.5);
        expect(coords.y).toBeGreaterThanOrEqual(-0.5);
        expect(coords.y).toBeLessThanOrEqual(0.5);
      }
    });

    it('validates 3D Cartesian tile position scaling across varied board sizes and slab heights', () => {
      const boardSizes = [0, 100, 360, 600, 1000];
      const slabHeights = [0, 14, 28, 48];

      for (const size of boardSizes) {
        for (const slab of slabHeights) {
          const p0 = getTile3DPosition(0, size, slab);
          expect(p0.x).toBeCloseTo(0.5 * size);
          expect(p0.y).toBeCloseTo(0.5 * size);
          expect(p0.z).toBe(slab);

          const p20 = getTile3DPosition(20, size, slab);
          expect(p20.x).toBeCloseTo(-0.5 * size);
          expect(p20.y).toBeCloseTo(-0.5 * size);
          expect(p20.z).toBe(slab);
        }
      }
    });
  });

  // =========================================================================
  // 2. DEPTH SORTING MONOTONICITY & CORRELATION
  // =========================================================================
  describe('2. Depth Sorting Monotonicity Engine', () => {
    it('guarantees strict monotonicity for all (r1, c1) vs (r2, c2) pairs on the 11x11 grid', () => {
      // 11x11 = 121 cells, checking all pairs (r1, c1) vs (r2, c2)
      let comparisonsTested = 0;

      for (let r1 = 1; r1 <= 11; r1++) {
        for (let c1 = 1; c1 <= 11; c1++) {
          const depth1 = calculateDepthIndex(c1, r1, 0);

          for (let r2 = 1; r2 <= 11; r2++) {
            for (let c2 = 1; c2 <= 11; c2++) {
              const depth2 = calculateDepthIndex(c2, r2, 0);
              const sum1 = r1 + c1;
              const sum2 = r2 + c2;

              if (sum2 > sum1) {
                expect(depth2).toBeGreaterThan(depth1);
              } else if (sum2 < sum1) {
                expect(depth2).toBeLessThan(depth1);
              } else {
                expect(depth2).toBe(depth1);
              }
              comparisonsTested++;
            }
          }
        }
      }

      // Total comparisons: 121 * 121 = 14,641
      expect(comparisonsTested).toBe(14641);
    });

    it('confirms depth index strictly correlates with true 3D screen projected camera depth', () => {
      // Under isometric camera (pitch 55, yaw 45)
      const boardSize = 600;
      const camera = DEFAULT_CAMERA;

      // Sample a path along the isometric diagonal from back corner (1, 1) to front corner (11, 11)
      let prevScreenDepth = -Infinity;
      let prevDepthIndex = -Infinity;

      for (let step = 1; step <= 11; step++) {
        const col = step;
        const row = step;
        const depthIdx = calculateDepthIndex(col, row, 0);

        const normX = (col - 6) / 10;
        const normY = (row - 6) / 10;
        const point3D = { x: normX * boardSize, y: normY * boardSize, z: 28 };
        const screenProj = project3DToScreen(point3D, camera);

        expect(depthIdx).toBeGreaterThan(prevDepthIndex);
        expect(screenProj.depth).toBeGreaterThan(prevScreenDepth);

        prevDepthIndex = depthIdx;
        prevScreenDepth = screenProj.depth;
      }
    });

    it('ensures layer offsets [0..99] preserve stacking order without cross-cell depth collision', () => {
      // Stacking order: slab (0) < tile (10) < token (20) < building (30) < billboard (40)
      const layers = [
        { name: 'slab', offset: 0 },
        { name: 'tile', offset: 10 },
        { name: 'token', offset: 20 },
        { name: 'building', offset: 30 },
        { name: 'billboard', offset: 40 },
      ];

      for (let r = 1; r <= 11; r++) {
        for (let c = 1; c <= 11; c++) {
          for (let i = 0; i < layers.length - 1; i++) {
            const lower = calculateDepthIndex(c, r, layers[i].offset);
            const upper = calculateDepthIndex(c, r, layers[i + 1].offset);
            expect(upper).toBeGreaterThan(lower);
          }
        }
      }

      // Adjacent cell verification: foreground cell slab (row+col+1, offset 0)
      // must have strictly higher depth than background cell billboard (row+col, offset 40)
      for (let r = 1; r <= 10; r++) {
        for (let c = 1; c <= 10; c++) {
          const bgBillboard = calculateDepthIndex(c, r, 40);
          const fgSlabNextRow = calculateDepthIndex(c, r + 1, 0);
          const fgSlabNextCol = calculateDepthIndex(c + 1, r, 0);

          expect(fgSlabNextRow).toBeGreaterThan(bgBillboard);
          expect(fgSlabNextCol).toBeGreaterThan(bgBillboard);
        }
      }
    });
  });

  // =========================================================================
  // 3. CONTAINER FIT SIZING & PATHOLOGICAL INPUT STRESS
  // =========================================================================
  describe('3. Container Fit Sizing with Pathological & Extreme Inputs', () => {
    it('always returns finite, positive, non-NaN numbers for zero or negative dimensions', () => {
      const nonPositiveInputs = [
        { w: 0, h: 0 },
        { w: 0, h: 800 },
        { w: 800, h: 0 },
        { w: -1, h: -1 },
        { w: -500, h: 800 },
        { w: 1000, h: -200 },
        { w: -9999, h: -9999 },
      ];

      for (const { w, h } of nonPositiveInputs) {
        const size3D = calculateFitBoardSize(w, h, DEFAULT_CAMERA);
        const size2D = calculateFitBoardSize(w, h, TOP_DOWN_CAMERA);

        expect(Number.isFinite(size3D)).toBe(true);
        expect(Number.isFinite(size2D)).toBe(true);
        expect(size3D).toBeGreaterThan(0);
        expect(size2D).toBeGreaterThan(0);
        expect(isNaN(size3D)).toBe(false);
        expect(isNaN(size2D)).toBe(false);
      }
    });

    it('always returns finite, positive numbers for 1px minimum inputs', () => {
      const tinyInputs = [
        { w: 1, h: 1 },
        { w: 1, h: 1000 },
        { w: 1000, h: 1 },
      ];

      for (const { w, h } of tinyInputs) {
        const size = calculateFitBoardSize(w, h, DEFAULT_CAMERA);
        expect(Number.isFinite(size)).toBe(true);
        expect(size).toBeGreaterThan(0);
      }
    });

    it('always returns finite, positive numbers for massive inputs (100,000px and beyond)', () => {
      const massiveInputs = [
        { w: 100000, h: 100000 },
        { w: 1000000, h: 1000000 },
        { w: Number.MAX_SAFE_INTEGER, h: Number.MAX_SAFE_INTEGER },
      ];

      for (const { w, h } of massiveInputs) {
        const size3D = calculateFitBoardSize(w, h, DEFAULT_CAMERA);
        const size2D = calculateFitBoardSize(w, h, TOP_DOWN_CAMERA);

        expect(Number.isFinite(size3D)).toBe(true);
        expect(Number.isFinite(size2D)).toBe(true);
        expect(size3D).toBeGreaterThan(0);
        expect(size2D).toBeGreaterThan(0);
      }
    });

    it('handles extreme aspect ratios (10:1 and 1:10) without NaN or infinite explosion', () => {
      const extremeAspects = [
        { w: 10000, h: 1000 }, // 10:1 wide
        { w: 1000, h: 10000 }, // 1:10 tall
        { w: 50000, h: 500 },   // 100:1 ultra wide
        { w: 500, h: 50000 },   // 1:100 ultra tall
        { w: 10, h: 1 },
        { w: 1, h: 10 },
      ];

      for (const { w, h } of extremeAspects) {
        const size = calculateFitBoardSize(w, h, DEFAULT_CAMERA);
        expect(Number.isFinite(size)).toBe(true);
        expect(size).toBeGreaterThan(0);
        expect(isNaN(size)).toBe(false);
      }
    });

    it('inspects clamping range across implementation: records actual bounds', () => {
      // In 2.5D Isometric mode:
      const min3D = calculateFitBoardSize(1, 1, DEFAULT_CAMERA);
      const max3D = calculateFitBoardSize(100000, 100000, DEFAULT_CAMERA);
      // In 2D Top-Down mode:
      const min2D = calculateFitBoardSize(1, 1, TOP_DOWN_CAMERA);
      const max2D = calculateFitBoardSize(100000, 100000, TOP_DOWN_CAMERA);

      // Verify that all outputs are firmly bounded
      expect(min3D).toBeGreaterThanOrEqual(240);
      expect(max3D).toBeLessThanOrEqual(760);
      expect(min2D).toBeGreaterThanOrEqual(260);
      expect(max2D).toBeLessThanOrEqual(840);
    });

    it('verifies diamond vertex bounding box width does not clip container width on standard screens', () => {
      const screens = [
        { name: 'Mobile SE', w: 375, h: 667 },
        { name: 'iPhone Pro', w: 390, h: 844 },
        { name: 'iPad Mini', w: 768, h: 1024 },
        { name: 'HD Laptop', w: 1366, h: 768 },
        { name: 'Full HD Desktop', w: 1920, h: 1080 },
      ];

      for (const screen of screens) {
        const size = calculateFitBoardSize(screen.w, screen.h, DEFAULT_CAMERA);
        const diamondWidth = size * Math.SQRT2;

        // Diamond width must not exceed container width
        expect(diamondWidth).toBeLessThanOrEqual(screen.w);
      }
    });
  });

  // =========================================================================
  // 4. BILLBOARD TRANSFORM FORMATTING UNDER ARBITRARY CAMERA ANGLES
  // =========================================================================
  describe('4. Billboard Transform Inversion & Formatting Engine', () => {
    it('correctly inverts pitch and yaw in reverse order for default isometric camera', () => {
      const transform = getBillboardTransform(DEFAULT_CAMERA, 16);
      expect(transform).toBe('translateZ(16px) rotateZ(-45deg) rotateX(-55deg)');
    });

    it('formats correctly for 2D top-down camera with zero angles', () => {
      const transform = getBillboardTransform(TOP_DOWN_CAMERA, 0);
      expect(transform).toBe('translateZ(0px) rotateZ(0deg) rotateX(0deg)');
    });

    it('handles negative, arbitrary, and extreme camera angles without formatting errors', () => {
      const testCameras: { camera: CameraState; elev: number; expected: string }[] = [
        {
          camera: { pitch: 65, yaw: 20, zoom: 1.2, panX: 0, panY: 0 },
          elev: 24,
          expected: 'translateZ(24px) rotateZ(-20deg) rotateX(-65deg)',
        },
        {
          camera: { pitch: 35, yaw: -45, zoom: 0.9, panX: 10, panY: -10 },
          elev: 48,
          expected: 'translateZ(48px) rotateZ(45deg) rotateX(-35deg)',
        },
        {
          camera: { pitch: -15, yaw: -180, zoom: 1.0, panX: 0, panY: 0 },
          elev: 8,
          expected: 'translateZ(8px) rotateZ(180deg) rotateX(15deg)',
        },
        {
          camera: { pitch: 89.5, yaw: 270, zoom: 1.0, panX: 0, panY: 0 },
          elev: 0,
          expected: 'translateZ(0px) rotateZ(-270deg) rotateX(-89.5deg)',
        },
      ];

      for (const { camera, elev, expected } of testCameras) {
        const result = getBillboardTransform(camera, elev);
        expect(result).toBe(expected);
      }
    });

    it('strictly satisfies the CSS 3D billboard syntax specification pattern', () => {
      const billboardRegex =
        /^translateZ\(-?[\d.]+px\)\s+rotateZ\(-?[\d.]+deg\)\s+rotateX\(-?[\d.]+deg\)$/;

      const samples = [
        getBillboardTransform(),
        getBillboardTransform(DEFAULT_CAMERA, 12),
        getBillboardTransform({ pitch: 42.1, yaw: -33.7, zoom: 1, panX: 0, panY: 0 }, 100),
        getBillboardTransform({ pitch: 0, yaw: 0, zoom: 1, panX: 0, panY: 0 }, -5),
      ];

      for (const sample of samples) {
        expect(billboardRegex.test(sample)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 5. SCREEN TO TILE RAYCASTING & BOUNDARY INVARIANTS
  // =========================================================================
  describe('5. Screen Raycasting & Inverse Projection Invariants', () => {
    it('correctly maps 2D top-down clicks on board perimeter to the exact tile id', () => {
      const boardRect = { left: 0, top: 0, width: 800, height: 800 };

      // In top-down mode (pitch: 0, yaw: 0):
      // Center is at (400, 400).
      // Tile 0 is at normalized (+0.5, +0.5) -> (800, 800)
      const hit0 = screenToTileId(780, 780, boardRect, TOP_DOWN_CAMERA);
      expect(hit0).toBe(0);

      // Tile 20 is at normalized (-0.5, -0.5) -> (0, 0)
      const hit20 = screenToTileId(20, 20, boardRect, TOP_DOWN_CAMERA);
      expect(hit20).toBe(20);

      // Tile 10 is at normalized (-0.5, +0.5) -> (0, 800)
      const hit10 = screenToTileId(20, 780, boardRect, TOP_DOWN_CAMERA);
      expect(hit10).toBe(10);

      // Tile 30 is at normalized (+0.5, -0.5) -> (800, 0)
      const hit30 = screenToTileId(780, 20, boardRect, TOP_DOWN_CAMERA);
      expect(hit30).toBe(30);
    });

    it('rejects raycast clicks far outside the board rectangle as null', () => {
      const boardRect = { left: 100, top: 100, width: 600, height: 600 };
      expect(screenToTileId(-500, -500, boardRect, DEFAULT_CAMERA)).toBeNull();
      expect(screenToTileId(2000, 2000, boardRect, DEFAULT_CAMERA)).toBeNull();
    });
  });
});
