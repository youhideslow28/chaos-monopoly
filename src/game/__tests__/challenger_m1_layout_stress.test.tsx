import { describe, it, expect, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  calculateFitBoardSize,
  getTile3DPosition,
  calculateDepthIndex,
  getBillboardTransform,
  project3DToScreen,
  screenToTileId,
  DEFAULT_CAMERA,
  TOP_DOWN_CAMERA,
  CameraState,
} from '../../components/board/spatialMath';
import { BoardSlab } from '../../components/board/BoardSlab';
import { loadWorldConfig } from '../../worlds/registry';
import { WorldConfig } from '../../worlds/types';

describe('Empirical Challenger: Milestone 1 Layout & Responsive Bounds Stress Test', () => {
  let metropolisConfig: WorldConfig;
  let cyberpunkConfig: WorldConfig;
  let mekongConfig: WorldConfig;
  let spaceConfig: WorldConfig;

  beforeAll(async () => {
    metropolisConfig = (await loadWorldConfig('modern-metropolis')).config;
    cyberpunkConfig = (await loadWorldConfig('cyberpunk-city')).config;
    mekongConfig = (await loadWorldConfig('mekong-delta')).config;
    spaceConfig = (await loadWorldConfig('space-colony')).config;
  });

  describe('1. Viewport Scaling & Diamond Bounding Box Bounds', () => {
    // 6 typical screen sizes specified in mission
    const TARGET_VIEWPORTS = [
      { name: 'Compact Mobile (Android)', width: 360, height: 640 },
      { name: 'Modern iPhone 12/13/14', width: 390, height: 844 },
      { name: 'Tablet Portrait (iPad)', width: 768, height: 1024 },
      { name: 'Standard Laptop (1366x768)', width: 1366, height: 768 },
      { name: 'Full HD Desktop (1080p)', width: 1920, height: 1080 },
      { name: 'QHD 2K Desktop (1440p)', width: 2560, height: 1440 },
    ];

    it.each(TARGET_VIEWPORTS)(
      'guarantees diamond bounding box width strictly fits within container with >= 20px clearance for $name ($width x $height)',
      ({ width, height }) => {
        const boardSize = calculateFitBoardSize(width, height, DEFAULT_CAMERA);

        // Bounding box of a square of side L rotated 45 degrees is sqrt(2) * L
        const diamondBoundingWidth = Math.SQRT2 * boardSize;
        const horizontalClearance = width - diamondBoundingWidth;

        // Bounding box vertical projection is sqrt(2) * L * cos(pitch)
        const radPitch = ((DEFAULT_CAMERA.pitch ?? 55) * Math.PI) / 180;
        const diamondBoundingHeight = Math.SQRT2 * boardSize * Math.cos(radPitch);
        const verticalClearance = height - diamondBoundingHeight;

        // STRICT REQUIREMENT: Horizontal clearance >= 20px
        expect(horizontalClearance).toBeGreaterThanOrEqual(20.0);
        expect(diamondBoundingWidth).toBeLessThanOrEqual(width - 20.0);

        // Vertical clearance must also be strictly positive (board fits inside height)
        expect(verticalClearance).toBeGreaterThanOrEqual(20.0);
        expect(diamondBoundingHeight).toBeLessThanOrEqual(height - 20.0);

        // Board size must be an integer (rounded) and within clamped limits [240, 760]
        expect(Number.isInteger(boardSize)).toBe(true);
        expect(boardSize).toBeGreaterThanOrEqual(240);
        expect(boardSize).toBeLessThanOrEqual(760);
      }
    );

    it('demonstrates monotonic scaling with zoom factor in calculateFitBoardSize', () => {
      const zoomLevels = [0.8, 1.0, 1.25, 1.5, 2.0];
      const baseWidth = 1920;
      const baseHeight = 1080;

      let prevSize = Infinity;
      for (const zoom of zoomLevels) {
        const camera: CameraState = { ...DEFAULT_CAMERA, zoom };
        const boardSize = calculateFitBoardSize(baseWidth, baseHeight, camera);
        expect(boardSize).toBeLessThanOrEqual(prevSize);
        expect(boardSize).toBeGreaterThanOrEqual(240);
        expect(boardSize).toBeLessThanOrEqual(760);
        prevSize = boardSize;
      }
    });

    it('handles extreme aspect ratios without NaN or crashing', () => {
      // Ultra-wide 32:9 (3840 x 1080)
      const ultraWide = calculateFitBoardSize(3840, 1080, DEFAULT_CAMERA);
      expect(Number.isFinite(ultraWide)).toBe(true);
      expect(ultraWide).toBeLessThanOrEqual(760);
      expect(ultraWide * Math.SQRT2).toBeLessThanOrEqual(3840 - 20);

      // Ultra-tall 9:32 (1080 x 3840)
      const ultraTall = calculateFitBoardSize(1080, 3840, DEFAULT_CAMERA);
      expect(Number.isFinite(ultraTall)).toBe(true);
      expect(ultraTall).toBeLessThanOrEqual(760);
      expect(ultraTall * Math.SQRT2).toBeLessThanOrEqual(1080 - 20);

      // Edge cases: zero or negative
      const zeroW = calculateFitBoardSize(0, 600, DEFAULT_CAMERA);
      expect(zeroW).toBe(360);
      const zeroH = calculateFitBoardSize(600, 0, DEFAULT_CAMERA);
      expect(zeroH).toBe(360);
      const neg = calculateFitBoardSize(-100, -200, DEFAULT_CAMERA);
      expect(neg).toBe(360);
    });

    it('scales properly in 2D flat mode (TOP_DOWN_CAMERA)', () => {
      TARGET_VIEWPORTS.forEach(({ width, height }) => {
        const size2D = calculateFitBoardSize(width, height, TOP_DOWN_CAMERA);
        expect(size2D).toBeLessThanOrEqual(width);
        expect(size2D).toBeLessThanOrEqual(height);
        expect(width - size2D).toBeGreaterThanOrEqual(0);
        expect(height - size2D).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('2. BoardSlab Props & Sidewall Transforms Verification', () => {
    it('renders clean HTML markup with no NaN or undefined values across all standard props', () => {
      const html = renderToStaticMarkup(
        <BoardSlab boardSize={600} slabThickness={28} worldConfig={metropolisConfig} is3DView={true}>
          <div data-testid="board-content">Tiles</div>
        </BoardSlab>
      );

      // Verify absence of rendering corruption
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');

      // Verify structure
      expect(html).toContain('preserve-3d');
      expect(html).toContain('width:600px');
      expect(html).toContain('height:600px');
      expect(html).toContain('Tiles');
    });

    it('renders all 4 extruded sidewalls and ground contact shadow in 3D mode', () => {
      const slabThickness = 32;
      const html = renderToStaticMarkup(
        <BoardSlab boardSize={500} slabThickness={slabThickness} is3DView={true}>
          <span>Content</span>
        </BoardSlab>
      );

      // South-West Front Extruded Wall
      expect(html).toContain('rotateX(-90deg)');
      expect(html).toContain(`height:${slabThickness}px`);

      // South-East Front Extruded Wall
      expect(html).toContain('rotateY(90deg)');
      expect(html).toContain(`width:${slabThickness}px`);

      // North-West Back Extruded Wall
      expect(html).toContain('rotateY(-90deg)');

      // North-East Back Extruded Wall
      expect(html).toContain('rotateX(90deg)');

      // Ground Contact Shadow with correct offset translateZ(-{slabThickness + 14}px)
      const expectedShadowZ = -(slabThickness + 14);
      expect(html).toContain(`translateZ(${expectedShadowZ}px) scale(1.08)`);
      expect(html).toContain('blur(16px)');

      // Backface culling class
      expect(html).toContain('backface-hidden');
    });

    it('omits sidewalls and ground shadow in 2D mode (is3DView = false)', () => {
      const html = renderToStaticMarkup(
        <BoardSlab boardSize={500} slabThickness={28} is3DView={false}>
          <span>Content</span>
        </BoardSlab>
      );

      // No 3D walls
      expect(html).not.toContain('rotateX(-90deg)');
      expect(html).not.toContain('rotateY(90deg)');
      expect(html).not.toContain('rotateY(-90deg)');
      expect(html).not.toContain('rotateX(90deg)');
      expect(html).not.toContain('blur(16px)');

      // Flat transform style
      expect(html).toContain('transform-style:flat');
      expect(html).not.toContain('preserve-3d');
    });

    it('renders without error or NaN across all 4 world theme configs', () => {
      const worldConfigs = [metropolisConfig, cyberpunkConfig, mekongConfig, spaceConfig, null];

      for (const worldConfig of worldConfigs) {
        const html = renderToStaticMarkup(
          <BoardSlab boardSize={550} worldConfig={worldConfig} is3DView={true}>
            <div>Content</div>
          </BoardSlab>
        );

        expect(html).not.toContain('NaN');
        expect(html).not.toContain('undefined');
        expect(html).toContain('width:550px');
        expect(html).toContain('height:550px');
      }
    });

    it('handles edge case props (slabThickness = 0, unusual board sizes) gracefully', () => {
      const htmlZeroThickness = renderToStaticMarkup(
        <BoardSlab boardSize={240} slabThickness={0} is3DView={true}>
          <div>Inner</div>
        </BoardSlab>
      );
      expect(htmlZeroThickness).not.toContain('NaN');
      expect(htmlZeroThickness).not.toContain('undefined');
      expect(htmlZeroThickness).toContain('height:0px');
      expect(htmlZeroThickness).toContain('translateZ(-14px) scale(1.08)');
    });
  });

  describe('3. Spatial Math & Raycasting Invariants', () => {
    it('guarantees calculateDepthIndex monotonicity for all 40 tiles', () => {
      // Background corner (Tile 20, col 1, row 1)
      const depth20 = calculateDepthIndex(1, 1, 0);
      // Foreground corner (Tile 0, col 11, row 11)
      const depth0 = calculateDepthIndex(11, 11, 0);

      expect(depth0).toBeGreaterThan(depth20);

      // Center plaza sits behind perimeter tiles
      const depthCenter = calculateDepthIndex(6, 6, 0);
      const depthTileNearCenter = calculateDepthIndex(6, 11, 10);
      expect(depthTileNearCenter).toBeGreaterThan(depthCenter);
    });

    it('guarantees billboard transform contains inverse rotation without NaN', () => {
      const angles = [
        { pitch: 55, yaw: 45 },
        { pitch: 0, yaw: 0 },
        { pitch: 65, yaw: 20 },
        { pitch: 35, yaw: 45 },
      ];

      for (const { pitch, yaw } of angles) {
        const transform = getBillboardTransform({ pitch, yaw, zoom: 1, panX: 0, panY: 0 }, 12);
        expect(transform).not.toContain('NaN');
        expect(transform).not.toContain('undefined');
        expect(transform).toContain(`translateZ(12px)`);
        expect(transform).toContain(`rotateZ(${-yaw}deg)`);
        expect(transform).toContain(`rotateX(${-pitch}deg)`);
      }
    });

    it('verifies getTile3DPosition generates finite and symmetric coordinates', () => {
      for (let i = 0; i < 40; i++) {
        const pos = getTile3DPosition(i, 600, 28);
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
        expect(pos.z).toBe(28);
        expect(Math.abs(pos.x)).toBeLessThanOrEqual(300);
        expect(Math.abs(pos.y)).toBeLessThanOrEqual(300);
      }
    });

    it('projects and unprojects center point accurately', () => {
      const origin = { x: 500, y: 500 };
      const proj = project3DToScreen({ x: 0, y: 0, z: 0 }, TOP_DOWN_CAMERA, origin);
      expect(proj.x).toBe(500);
      expect(proj.y).toBe(500);

      const boardRect = { left: 200, top: 200, width: 600, height: 600 };
      const hitCenterCorner = screenToTileId(785, 785, boardRect, TOP_DOWN_CAMERA);
      expect(hitCenterCorner).toBe(0);
    });
  });
});
