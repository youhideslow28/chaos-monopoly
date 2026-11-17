import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CAMERA_PRESETS,
  CameraPresetType,
  clampZoom,
  clampPan,
  getCameraPreset,
  calculateTileFocusPan,
  getCameraTransformString,
  MIN_ZOOM,
  MAX_ZOOM,
  MIN_PAN,
  MAX_PAN,
} from '../../components/camera/useCameraState';
import { CameraControls } from '../../components/camera/CameraControls';
import {
  SpatialChaosVFX,
  determineChaosEffectType,
  resolveChaos3DPosition,
} from '../../components/chaos/SpatialChaosVFX';
import { WorldEnvironment } from '../../components/worlds/WorldEnvironment';
import { BoardView } from '../../components/board/BoardView';
import {
  CameraState,
  DEFAULT_CAMERA,
  getTile3DPosition,
} from '../../components/board/spatialMath';
import { ChaosCard, GameState } from '../types';
import { INITIAL_GAME_STATE } from '../gameReducer';

// Oracle sanitization helper
function assertZeroNaNOrUndefined(markup: string, contextDescription: string) {
  expect(markup, `${contextDescription} contained literal "NaN"`).not.toMatch(/\bNaN\b/);
  expect(markup, `${contextDescription} contained literal "undefined"`).not.toMatch(/\bundefined\b/);
  expect(markup, `${contextDescription} contained "[object Object]"`).not.toContain('[object Object]');
}

describe('Milestone 3 — Camera System & 3D Spatial Calamity VFX', () => {
  describe('1. Camera Presets & Mathematical Invariants', () => {
    it('defines all 4 required camera presets with exact pitch, yaw, and zoom specifications', () => {
      // TOP_DOWN: pitch 0, yaw 0, zoom 1.0
      expect(CAMERA_PRESETS.TOP_DOWN).toEqual({
        preset: 'TOP_DOWN',
        pitch: 0,
        yaw: 0,
        zoom: 1.0,
      });

      // ISOMETRIC: pitch 55, yaw 45, zoom 1.0
      expect(CAMERA_PRESETS.ISOMETRIC).toEqual({
        preset: 'ISOMETRIC',
        pitch: 55,
        yaw: 45,
        zoom: 1.0,
      });

      // CINEMATIC: pitch 65, yaw 20, zoom 1.2
      expect(CAMERA_PRESETS.CINEMATIC).toEqual({
        preset: 'CINEMATIC',
        pitch: 65,
        yaw: 20,
        zoom: 1.2,
      });

      // TACTICAL: pitch 35, yaw 45, zoom 0.9
      expect(CAMERA_PRESETS.TACTICAL).toEqual({
        preset: 'TACTICAL',
        pitch: 35,
        yaw: 45,
        zoom: 0.9,
      });
    });

    it('initializes clean CameraState for each preset with zero pan and no dragging', () => {
      const presets: CameraPresetType[] = ['TOP_DOWN', 'ISOMETRIC', 'CINEMATIC', 'TACTICAL'];

      presets.forEach((preset) => {
        const state = getCameraPreset(preset);
        expect(state.preset).toBe(preset);
        expect(state.pitch).toBe(CAMERA_PRESETS[preset].pitch);
        expect(state.yaw).toBe(CAMERA_PRESETS[preset].yaw);
        expect(state.zoom).toBe(CAMERA_PRESETS[preset].zoom);
        expect(state.panX).toBe(0);
        expect(state.panY).toBe(0);
        expect(state.isDragging).toBe(false);
        expect(state.focusedTileId).toBeNull();
      });
    });

    it('falls back safely to ISOMETRIC for unknown preset values', () => {
      const fallback = getCameraPreset('UNKNOWN_PRESET' as any);
      expect(fallback.preset).toBe('ISOMETRIC');
      expect(fallback.pitch).toBe(55);
      expect(fallback.yaw).toBe(45);
    });
  });

  describe('2. Zoom & Pan Bounds Clamping', () => {
    it('strictly clamps zoom to [0.6, 1.6]', () => {
      expect(MIN_ZOOM).toBe(0.6);
      expect(MAX_ZOOM).toBe(1.6);

      // Normal in-range zoom
      expect(clampZoom(1.0)).toBe(1.0);
      expect(clampZoom(0.85)).toBe(0.85);
      expect(clampZoom(1.4)).toBe(1.4);

      // Lower boundary
      expect(clampZoom(0.6)).toBe(0.6);
      expect(clampZoom(0.59)).toBe(0.6);
      expect(clampZoom(0.1)).toBe(0.6);
      expect(clampZoom(-5)).toBe(0.6);

      // Upper boundary
      expect(clampZoom(1.6)).toBe(1.6);
      expect(clampZoom(1.61)).toBe(1.6);
      expect(clampZoom(2.5)).toBe(1.6);
      expect(clampZoom(100)).toBe(1.6);

      // Edge cases
      expect(clampZoom(NaN)).toBe(1.0);
    });

    it('strictly clamps pan offsets to [-250, 250] for panX and panY', () => {
      expect(MIN_PAN).toBe(-250);
      expect(MAX_PAN).toBe(250);

      // Normal in-range offsets
      expect(clampPan(0)).toBe(0);
      expect(clampPan(120)).toBe(120);
      expect(clampPan(-185)).toBe(-185);

      // Lower boundary
      expect(clampPan(-250)).toBe(-250);
      expect(clampPan(-250.5)).toBe(-250);
      expect(clampPan(-600)).toBe(-250);

      // Upper boundary
      expect(clampPan(250)).toBe(250);
      expect(clampPan(250.5)).toBe(250);
      expect(clampPan(999)).toBe(250);

      // Edge cases
      expect(clampPan(NaN)).toBe(0);
    });
  });

  describe('3. focusTile Coordinate Resolution', () => {
    it('calculates deterministic pan offsets within bounds for all 4 corners (0, 10, 20, 30)', () => {
      const camera = getCameraPreset('ISOMETRIC');
      const boardSize = 560;

      [0, 10, 20, 30].forEach((cornerTileId) => {
        const pan = calculateTileFocusPan(cornerTileId, camera, boardSize);
        expect(pan.panX).toBeGreaterThanOrEqual(-250);
        expect(pan.panX).toBeLessThanOrEqual(250);
        expect(pan.panY).toBeGreaterThanOrEqual(-250);
        expect(pan.panY).toBeLessThanOrEqual(250);
        expect(Number.isFinite(pan.panX)).toBe(true);
        expect(Number.isFinite(pan.panY)).toBe(true);
      });
    });

    it('calculates symmetrical pan offsets for diagonal corners in isometric view', () => {
      const camera = getCameraPreset('ISOMETRIC'); // yaw 45, pitch 55
      const boardSize = 560;

      // Tile 0 (GO, bottom corner at yaw 45) should have rotX close to 0
      const pan0 = calculateTileFocusPan(0, camera, boardSize);
      expect(Math.abs(pan0.panX)).toBeLessThan(1.0); // Exactly centered horizontally!

      // Tile 20 (Free Parking, top corner at yaw 45) should also be centered horizontally
      const pan20 = calculateTileFocusPan(20, camera, boardSize);
      expect(Math.abs(pan20.panX)).toBeLessThan(1.0);
    });

    it('computes correct orthogonal offsets in TOP_DOWN camera view', () => {
      const camera = getCameraPreset('TOP_DOWN'); // yaw 0, pitch 0
      const boardSize = 500;

      // Tile 0 is at normalized (0.5, 0.5) -> position (250, 250)
      // Moving camera requires negative pan: -250, -250
      const pan0 = calculateTileFocusPan(0, camera, boardSize);
      expect(pan0.panX).toBe(-250);
      expect(pan0.panY).toBe(-250);

      // Tile 20 is at normalized (-0.5, -0.5) -> position (-250, -250)
      // Moving camera requires positive pan: +250, +250
      const pan20 = calculateTileFocusPan(20, camera, boardSize);
      expect(pan20.panX).toBe(250);
      expect(pan20.panY).toBe(250);
    });
  });

  describe('4. Camera Stage CSS Transform Formatting', () => {
    it('formats valid CSS 3D translate3d, scale, rotateX, and rotateZ syntax', () => {
      const camera: CameraState = {
        preset: 'ISOMETRIC',
        pitch: 55,
        yaw: 45,
        zoom: 1.15,
        panX: 42.5,
        panY: -80,
      };

      const transformStr = getCameraTransformString(camera);
      expect(transformStr).toBe(
        'translate3d(42.5px, -80px, 0) scale(1.15) rotateX(55deg) rotateZ(45deg)'
      );
      assertZeroNaNOrUndefined(transformStr, 'Camera transform string');
    });
  });

  describe('5. CameraControls Component & ARIA Accessibility', () => {
    it('renders glassmorphic toolbar with all 4 preset buttons, zoom controls, and reset', () => {
      const camera = getCameraPreset('ISOMETRIC');
      const markup = renderToStaticMarkup(
        React.createElement(CameraControls, {
          camera,
          onSetPreset: () => {},
          onZoomIn: () => {},
          onZoomOut: () => {},
          onReset: () => {},
          onFocusActivePlayer: () => {},
          activePlayerTileId: 0,
        })
      );

      assertZeroNaNOrUndefined(markup, 'CameraControls markup');
      expect(markup).toContain('role="toolbar"');
      expect(markup).toContain('aria-label="Điều khiển góc nhìn camera"');
      expect(markup).toContain('data-testid="camera-controls-hud"');

      // 2D/3D switch and rotate-view cycle (the old five-preset row was simplified away)
      expect(markup).toContain('data-testid="camera-view-toggle"');
      expect(markup).toContain('data-testid="camera-view-cycle"');
      expect(markup).not.toContain('data-testid="camera-preset-');

      // Zoom & action buttons
      expect(markup).toContain('data-testid="camera-zoom-in"');
      expect(markup).toContain('data-testid="camera-zoom-out"');
      expect(markup).toContain('data-testid="camera-focus-player"');
      expect(markup).toContain('data-testid="camera-reset"');

      // Isometric is a 3D view, so the toggle offers 2D and is not pressed
      expect(markup).toMatch(/data-testid="camera-view-toggle"[^>]*aria-pressed="false"/);
    });
  });

  describe('6. SpatialChaosVFX Calamity Mapping & 3D Positioning', () => {
    it('correctly maps chaos cards to METEOR_STRIKE, MARKET_CRASH, and ECONOMIC_BOOM', () => {
      // 1. Meteor strike cards
      const meteorCard: ChaosCard = {
        id: 'meteor-strike',
        title: 'Mưa Thiên Thạch',
        tagline: 'Calamity',
        flavorText: 'Thảm họa giáng xuống',
        rarity: 'CALAMITY',
        effectType: 'CALAMITY_DEMOLISH',
        value: 1,
        targetTileId: 24,
        iconName: 'Flame',
      };
      expect(determineChaosEffectType(meteorCard)).toBe('METEOR_STRIKE');

      // 2. Market crash cards
      const crashCard: ChaosCard = {
        id: 'market-crash',
        title: 'Thị Trường Sụp Đổ',
        tagline: 'Khủng hoảng',
        flavorText: 'Giá trị nhà đất sụt giảm',
        rarity: 'RARE',
        effectType: 'MARKET_CRASH_DEVALUE',
        value: 50,
        targetTileId: 15,
        iconName: 'TrendingDown',
      };
      expect(determineChaosEffectType(crashCard)).toBe('MARKET_CRASH');

      // 3. Economic boom cards
      const boomCard: ChaosCard = {
        id: 'economic-boom',
        title: 'Kho Báu Thịnh Vượng',
        tagline: 'Jackpot',
        flavorText: 'Cơn mưa vàng',
        rarity: 'UNCOMMON',
        effectType: 'WINDFALL_JACKPOT',
        value: 500,
        iconName: 'Sparkles',
      };
      expect(determineChaosEffectType(boomCard)).toBe('ECONOMIC_BOOM');

      // 4. Force effect override
      expect(determineChaosEffectType(meteorCard, 'ECONOMIC_BOOM')).toBe('ECONOMIC_BOOM');
    });

    it('resolves 3D positions accurately: Economic Boom at center plaza, others at target tile', () => {
      const boardSize = 560;
      const slabHeight = 28;

      // Economic Boom must be at board center (0, 0, 28)
      const boomPos = resolveChaos3DPosition('ECONOMIC_BOOM', boardSize, slabHeight);
      expect(boomPos).toEqual({ x: 0, y: 0, z: 28 });

      // Meteor Strike anchors at target tile 20
      const meteorPos = resolveChaos3DPosition(
        'METEOR_STRIKE',
        boardSize,
        slabHeight,
        20
      );
      const expectedTile20 = getTile3DPosition(20, boardSize, slabHeight);
      expect(meteorPos).toEqual(expectedTile20);

      // Market Crash anchors at target tile 15
      const crashPos = resolveChaos3DPosition(
        'MARKET_CRASH',
        boardSize,
        slabHeight,
        15
      );
      const expectedTile15 = getTile3DPosition(15, boardSize, slabHeight);
      expect(crashPos).toEqual(expectedTile15);
    });

    it('renders 3D Calamity VFX markup with appropriate child elements and zero NaNs', () => {
      // 1. Meteor Strike render
      const meteorMarkup = renderToStaticMarkup(
        React.createElement(SpatialChaosVFX, {
          forceEffect: 'METEOR_STRIKE',
          targetTileId: 24,
          boardSize: 560,
          slabHeight: 28,
        })
      );
      assertZeroNaNOrUndefined(meteorMarkup, 'Meteor Strike markup');
      expect(meteorMarkup).toContain('data-testid="spatial-chaos-vfx"');
      expect(meteorMarkup).toContain('data-testid="spatial-vfx-meteor"');
      expect(meteorMarkup).toContain('spatial-meteor-projectile');
      expect(meteorMarkup).toContain('spatial-shockwave-ring');

      // 2. Market Crash render
      const crashMarkup = renderToStaticMarkup(
        React.createElement(SpatialChaosVFX, {
          forceEffect: 'MARKET_CRASH',
          targetTileId: 15,
          boardSize: 560,
          slabHeight: 28,
        })
      );
      assertZeroNaNOrUndefined(crashMarkup, 'Market Crash markup');
      expect(crashMarkup).toContain('data-testid="spatial-vfx-market-crash"');
      expect(crashMarkup).toContain('spatial-market-grid');
      expect(crashMarkup).toContain('CRASH');

      // 3. Economic Boom render
      const boomMarkup = renderToStaticMarkup(
        React.createElement(SpatialChaosVFX, {
          forceEffect: 'ECONOMIC_BOOM',
          boardSize: 560,
          slabHeight: 28,
        })
      );
      assertZeroNaNOrUndefined(boomMarkup, 'Economic Boom markup');
      expect(boomMarkup).toContain('data-testid="spatial-vfx-economic-boom"');
      expect(boomMarkup).toContain('spatial-boom-aura');
      expect(boomMarkup).toContain('BOOM!');
    });
  });

  describe('7. WorldEnvironment Horizon Parallax & Perspective Weather', () => {
    it('renders 3D horizon parallax skybox that reacts to camera yaw', () => {
      const mockWorldConfig: any = {
        id: 'modern-metropolis',
        name: { vi: 'Thành Phố Hiện Đại', en: 'Modern Metropolis' },
        tagline: { vi: 'Đô thị phồn hoa', en: 'Bustling metropolis' },
        palette: { accent: '#06b6d4', border: '#1e293b', text: '#fff' },
        pack: {
          environment: { kind: 'rain', intensity: 0.8 },
          background: { boardGradient: '#0a0e17', gradient: '#000' },
          animations: { introMs: 0 },
          typography: { display: 'sans-serif' },
        },
      };

      const camera45 = { ...DEFAULT_CAMERA, yaw: 45, pitch: 55 };
      const markup45 = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: mockWorldConfig,
          camera: camera45,
        })
      );
      assertZeroNaNOrUndefined(markup45, 'WorldEnvironment markup at yaw 45');
      expect(markup45).toContain('data-testid="world-horizon-skybox"');
      expect(markup45).toContain('data-testid="world-perspective-weather"');
      expect(markup45).toContain('world-env-rain');

      // When yaw rotates to 65, parallaxX shifts
      const camera65 = { ...DEFAULT_CAMERA, yaw: 65, pitch: 55 };
      const markup65 = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: mockWorldConfig,
          camera: camera65,
        })
      );
      // Parallax offset = -(65 - 45) * 1.8 = -36px
      expect(markup65).toContain('translate3d(-36px, 0px, 0)');
    });
  });

  describe('8. BoardView Camera Stage & Controls Docking', () => {
    it('renders BoardView in 3D isometric view with docked camera controls HUD and preserve-3d stage', () => {
      const mockState: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
      };

      const markup = renderToStaticMarkup(
        React.createElement(BoardView, {
          state: mockState,
          is3DView: true,
          onRollDice: () => {},
          onEndTurn: () => {},
          onSelectTile: () => {},
        })
      );

      assertZeroNaNOrUndefined(markup, 'BoardView 3D markup');
      expect(markup).toContain('data-testid="board-view-container"');
      expect(markup).toContain('data-testid="board-camera-stage"');
      expect(markup).toContain('data-testid="camera-controls-hud"');
      expect(markup).toContain('rotateX(55deg)');
      expect(markup).toContain('rotateZ(45deg)');
    });

    it('renders BoardView in 2D top-down view with flat transforms when is3DView is false', () => {
      const mockState: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
      };

      const markup = renderToStaticMarkup(
        React.createElement(BoardView, {
          state: mockState,
          is3DView: false,
          onRollDice: () => {},
          onEndTurn: () => {},
          onSelectTile: () => {},
        })
      );

      assertZeroNaNOrUndefined(markup, 'BoardView 2D markup');
      expect(markup).toContain('rotateX(0deg)');
      expect(markup).toContain('rotateZ(0deg)');
    });

    it('renders SpatialChaosVFX inside board stage when activeChaosCard is present in GameState', () => {
      const meteorCard: ChaosCard = {
        id: 'calamity-meteor',
        title: 'Mưa Thiên Thạch Khổng Lồ',
        tagline: 'Calamity',
        flavorText: 'Phá hủy một công trình',
        rarity: 'CALAMITY',
        effectType: 'CALAMITY_DEMOLISH',
        value: 1,
        targetTileId: 10,
        iconName: 'Flame',
      };

      const mockStateWithChaos: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
        activeChaosCard: meteorCard,
      };

      const markup = renderToStaticMarkup(
        React.createElement(BoardView, {
          state: mockStateWithChaos,
          is3DView: true,
          onRollDice: () => {},
          onEndTurn: () => {},
          onSelectTile: () => {},
        })
      );

      assertZeroNaNOrUndefined(markup, 'BoardView with active chaos card');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
      expect(markup).toContain('data-testid="spatial-vfx-meteor"');
    });
  });
});
