import { describe, it, expect } from 'vitest';
import {
  getTile3DPosition,
  calculateFitBoardSize,
  calculateDepthIndex,
  getBillboardTransform,
  project3DToScreen,
  screenToTileId,
  getTileGridPosition,
  getTileBoardCoords,
  DEFAULT_CAMERA,
  TOP_DOWN_CAMERA,
  CameraState,
} from '../../components/board/spatialMath';

describe('2.5D Spatial Mathematics Engine (spatialMath.ts)', () => {
  describe('Grid Positioning & Normalized Coordinates', () => {
    it('maps corner tiles correctly to 11x11 grid corners', () => {
      // 0: Bottom-right (Start)
      expect(getTileGridPosition(0)).toEqual({ col: 11, row: 11 });
      // 10: Bottom-left (Detention)
      expect(getTileGridPosition(10)).toEqual({ col: 1, row: 11 });
      // 20: Top-left (Free Parking)
      expect(getTileGridPosition(20)).toEqual({ col: 1, row: 1 });
      // 30: Top-right (Go To Detention)
      expect(getTileGridPosition(30)).toEqual({ col: 11, row: 1 });
    });

    it('normalizes corner board coordinates symmetrically around center (0, 0)', () => {
      const c0 = getTileBoardCoords(0);
      const c10 = getTileBoardCoords(10);
      const c20 = getTileBoardCoords(20);
      const c30 = getTileBoardCoords(30);

      // Col 11 -> +0.5, Col 1 -> -0.5, Row 11 -> +0.5, Row 1 -> -0.5
      expect(c0).toEqual({ x: 0.5, y: 0.5 });
      expect(c10).toEqual({ x: -0.5, y: 0.5 });
      expect(c20).toEqual({ x: -0.5, y: -0.5 });
      expect(c30).toEqual({ x: 0.5, y: -0.5 });
    });

    it('handles negative or out-of-range tile indices cyclically modulo 40', () => {
      expect(getTileGridPosition(40)).toEqual(getTileGridPosition(0));
      expect(getTileGridPosition(-1)).toEqual(getTileGridPosition(39));
      expect(getTileGridPosition(80)).toEqual(getTileGridPosition(0));
    });
  });

  describe('3D Tile Positions (getTile3DPosition)', () => {
    it('calculates 3D Cartesian coordinates scaled by board size and slab height', () => {
      const boardSize = 600;
      const slabHeight = 28;

      const p0 = getTile3DPosition(0, boardSize, slabHeight);
      expect(p0.x).toBeCloseTo(300); // 0.5 * 600
      expect(p0.y).toBeCloseTo(300);
      expect(p0.z).toBe(28);

      const p20 = getTile3DPosition(20, boardSize, slabHeight);
      expect(p20.x).toBeCloseTo(-300); // -0.5 * 600
      expect(p20.y).toBeCloseTo(-300);
      expect(p20.z).toBe(28);

      const p10 = getTile3DPosition(10, boardSize, slabHeight);
      expect(p10.x).toBeCloseTo(-300);
      expect(p10.y).toBeCloseTo(300);
      expect(p10.z).toBe(28);
    });

    it('defaults slab height to 28px if omitted', () => {
      const pos = getTile3DPosition(5, 500);
      expect(pos.z).toBe(28);
    });
  });

  describe('Depth Index Calculation (calculateDepthIndex)', () => {
    it('ensures foreground tiles have strictly higher depth indices than background tiles', () => {
      // Background corner (Tile 20: col 1, row 1)
      const depth20 = calculateDepthIndex(1, 1, 0);
      // Foreground corner (Tile 0: col 11, row 11)
      const depth0 = calculateDepthIndex(11, 11, 0);

      expect(depth0).toBe((11 + 11) * 100); // 2200
      expect(depth20).toBe((1 + 1) * 100);  // 200
      expect(depth0).toBeGreaterThan(depth20);
    });

    it('orders layers properly via layerOffset', () => {
      const baseCol = 6;
      const baseRow = 6;

      const slabDepth = calculateDepthIndex(baseCol, baseRow, 0);
      const tileDepth = calculateDepthIndex(baseCol, baseRow, 10);
      const tokenDepth = calculateDepthIndex(baseCol, baseRow, 20);
      const buildingDepth = calculateDepthIndex(baseCol, baseRow, 30);
      const billboardDepth = calculateDepthIndex(baseCol, baseRow, 40);

      expect(slabDepth).toBeLessThan(tileDepth);
      expect(tileDepth).toBeLessThan(tokenDepth);
      expect(tokenDepth).toBeLessThan(buildingDepth);
      expect(buildingDepth).toBeLessThan(billboardDepth);
    });
  });

  describe('Container-Fit Board Sizing (calculateFitBoardSize)', () => {
    it('returns clamped board size for 2D flat mode without isometric expansion', () => {
      const size = calculateFitBoardSize(1000, 800, TOP_DOWN_CAMERA);
      // 1000 * 0.94 = 940, 800 * 0.92 = 736 -> min 736 clamped to 736
      expect(size).toBe(736);
    });

    it('scales board size proportionally to prevent diamond vertex clipping in 2.5D', () => {
      // 1080p desktop standard container (e.g. 900w x 800h)
      const sizeDesktop = calculateFitBoardSize(900, 800, DEFAULT_CAMERA);
      // Diamond width is sqrt(2) * sizeDesktop
      const diamondWidth = sizeDesktop * Math.SQRT2;
      expect(diamondWidth).toBeLessThanOrEqual(900);

      // Mobile container (375w x 667h)
      const sizeMobile = calculateFitBoardSize(375, 667, DEFAULT_CAMERA);
      const mobileDiamondWidth = sizeMobile * Math.SQRT2;
      expect(mobileDiamondWidth).toBeLessThanOrEqual(375);
    });

    it('respects zoom factor when sizing', () => {
      const normal = calculateFitBoardSize(800, 800, { ...DEFAULT_CAMERA, zoom: 1.0 });
      const zoomedIn = calculateFitBoardSize(800, 800, { ...DEFAULT_CAMERA, zoom: 1.5 });
      const zoomedOut = calculateFitBoardSize(800, 800, { ...DEFAULT_CAMERA, zoom: 0.8 });

      expect(zoomedIn).toBeLessThan(normal);
      expect(zoomedOut).toBeGreaterThan(normal);
    });

    it('clamps size within safe minimum (240px) and maximum (760px) limits', () => {
      const tiny = calculateFitBoardSize(50, 50, DEFAULT_CAMERA);
      expect(tiny).toBe(240);

      const massive = calculateFitBoardSize(4000, 3000, DEFAULT_CAMERA);
      expect(massive).toBe(760);
    });
  });

  describe('Camera Billboard Transform (getBillboardTransform)', () => {
    it('inverts camera yaw and pitch in reverse order to cancel stage rotation', () => {
      const camera: CameraState = { pitch: 55, yaw: 45, zoom: 1, panX: 0, panY: 0 };
      const transform = getBillboardTransform(camera, 16);

      expect(transform).toBe('translateZ(16px) rotateZ(-45deg) rotateX(-55deg)');
    });

    it('supports custom elevation and camera angles', () => {
      const camera: CameraState = { pitch: 60, yaw: -30, zoom: 1.2, panX: 10, panY: 20 };
      const transform = getBillboardTransform(camera, 32);

      expect(transform).toBe('translateZ(32px) rotateZ(30deg) rotateX(-60deg)');
    });

    it('defaults to 0px elevation and DEFAULT_CAMERA when arguments omitted', () => {
      const transform = getBillboardTransform();
      expect(transform).toBe('translateZ(0px) rotateZ(-45deg) rotateX(-55deg)');
    });
  });

  describe('3D Screen Projection & Raycasting (project3DToScreen & screenToTileId)', () => {
    it('projects center of board (0, 0, 0) to screen origin with zero pan', () => {
      const screen = project3DToScreen({ x: 0, y: 0, z: 0 }, DEFAULT_CAMERA);
      expect(screen.x).toBeCloseTo(0);
      expect(screen.y).toBeCloseTo(0);
      expect(screen.depth).toBeCloseTo(0);
    });

    it('inverts screen clicks back to correct tile id', () => {
      const boardRect = { left: 100, top: 100, width: 600, height: 600 };
      const camera = TOP_DOWN_CAMERA; // In 2D mode, raycast mapping is straightforward

      // Center of board is at (400, 400). Let's test a click near bottom-right (Tile 0)
      // Tile 0 is at normalized (+0.5, +0.5), which is at (400 + 300, 400 + 300) = (700, 700)
      const hitTile0 = screenToTileId(680, 680, boardRect, camera);
      expect(hitTile0).toBe(0);

      // Top-left is Tile 20 at normalized (-0.5, -0.5), which is at (400 - 300, 400 - 300) = (100, 100)
      const hitTile20 = screenToTileId(120, 120, boardRect, camera);
      expect(hitTile20).toBe(20);
    });

    it('returns null when screen click is far outside the board bounds', () => {
      const boardRect = { left: 100, top: 100, width: 600, height: 600 };
      const outOfBounds = screenToTileId(9999, 9999, boardRect, DEFAULT_CAMERA);
      expect(outOfBounds).toBeNull();
    });
  });
});
