import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CameraPresetType,
  clampZoom,
  clampPan,
  getCameraPreset,
  calculateTileFocusPan,
  getCameraTransformString,
  MIN_PAN,
  MAX_PAN,
} from '../../components/camera/useCameraState';
import { CameraControls } from '../../components/camera/CameraControls';
import {
  SpatialChaosVFX,
  determineChaosEffectType,
  resolveChaos3DPosition,
  SpatialChaosEffectType,
} from '../../components/chaos/SpatialChaosVFX';
import { BoardView } from '../../components/board/BoardView';
import { CHAOS_CARDS } from '../chaos-engine/chaosCards';
import { GameState } from '../types';
import { INITIAL_GAME_STATE } from '../gameReducer';

// Oracle sanitization helper
function assertZeroNaNOrUndefined(markup: string, contextDescription: string) {
  expect(markup, `${contextDescription} contained literal "NaN"`).not.toMatch(/\bNaN\b/);
  expect(markup, `${contextDescription} contained literal "undefined"`).not.toMatch(/\bundefined\b/);
  expect(markup, `${contextDescription} contained "[object Object]"`).not.toContain('[object Object]');
}

describe('Empirical Challenger: Milestone 3 Adversarial Camera, HUD & Calamity VFX Stress Suite', () => {
  // =========================================================================
  // 1. MATHEMATICAL ADVERSARIAL BOUNDS & FLOATING POINT STRESS
  // =========================================================================
  describe('1. Mathematical Adversarial Bounds & Floating Point Stress', () => {
    it('handles extreme zoom inputs without leaking NaN or violating [0.6, 1.6]', () => {
      // Normal range
      expect(clampZoom(0.6)).toBe(0.6);
      expect(clampZoom(1.0)).toBe(1.0);
      expect(clampZoom(1.6)).toBe(1.6);

      // Boundary infractions
      expect(clampZoom(0.5999999)).toBe(0.6);
      expect(clampZoom(1.6000001)).toBe(1.6);
      expect(clampZoom(-1000)).toBe(0.6);
      expect(clampZoom(10000)).toBe(1.6);

      // Subnormal / epsilon floats
      expect(clampZoom(Number.EPSILON)).toBe(0.6);
      expect(clampZoom(-Number.EPSILON)).toBe(0.6);

      // Infinite and NaN
      expect(clampZoom(Infinity)).toBe(1.6);
      expect(clampZoom(-Infinity)).toBe(0.6);
      expect(clampZoom(NaN)).toBe(1.0);

      // Precision check: 2 decimal places rounding
      expect(clampZoom(1.15678)).toBe(1.16);
      expect(clampZoom(0.85432)).toBe(0.85);
    });

    it('handles extreme pan inputs without leaking NaN or violating [-250, 250]', () => {
      // Normal range
      expect(clampPan(0)).toBe(0);
      expect(clampPan(-250)).toBe(-250);
      expect(clampPan(250)).toBe(250);

      // Boundary infractions
      expect(clampPan(-250.001)).toBe(-250);
      expect(clampPan(250.001)).toBe(250);
      expect(clampPan(-999999)).toBe(-250);
      expect(clampPan(999999)).toBe(250);

      // Subnormal / epsilon floats
      expect(clampPan(Number.EPSILON)).toBe(0);
      expect(clampPan(-Number.EPSILON)).toBe(-0);

      // Infinite and NaN
      expect(clampPan(Infinity)).toBe(250);
      expect(clampPan(-Infinity)).toBe(-250);
      expect(clampPan(NaN)).toBe(0);

      // Precision check: 1 decimal place rounding
      expect(clampPan(42.567)).toBe(42.6);
      expect(clampPan(-120.44)).toBe(-120.4);
    });

    it('satisfies camera pan invariants for all 40 tiles across all 4 presets and diverse board sizes', () => {
      const presets: CameraPresetType[] = ['TOP_DOWN', 'ISOMETRIC', 'CINEMATIC', 'TACTICAL'];
      const boardSizes = [360, 560, 800, 1200];

      let totalCombinationsTested = 0;

      for (const preset of presets) {
        const camera = getCameraPreset(preset);

        for (const size of boardSizes) {
          for (let tileId = 0; tileId < 40; tileId++) {
            const pan = calculateTileFocusPan(tileId, camera, size);

            expect(pan.panX).toBeGreaterThanOrEqual(MIN_PAN);
            expect(pan.panX).toBeLessThanOrEqual(MAX_PAN);
            expect(pan.panY).toBeGreaterThanOrEqual(MIN_PAN);
            expect(pan.panY).toBeLessThanOrEqual(MAX_PAN);

            expect(Number.isFinite(pan.panX)).toBe(true);
            expect(Number.isFinite(pan.panY)).toBe(true);

            totalCombinationsTested++;
          }
        }
      }

      // 4 presets * 4 board sizes * 40 tiles = 640 permutations
      expect(totalCombinationsTested).toBe(640);
    });

    it('gracefully normalizes out-of-bounds tile IDs (-1, 40, 100, -999) without throwing', () => {
      const camera = getCameraPreset('ISOMETRIC');
      const testCases = [-1, 40, 100, -999, 1042];

      testCases.forEach((invalidTileId) => {
        expect(() => {
          const pan = calculateTileFocusPan(invalidTileId, camera, 560);
          expect(pan.panX).toBeGreaterThanOrEqual(MIN_PAN);
          expect(pan.panX).toBeLessThanOrEqual(MAX_PAN);
          expect(pan.panY).toBeGreaterThanOrEqual(MIN_PAN);
          expect(pan.panY).toBeLessThanOrEqual(MAX_PAN);
        }).not.toThrow();
      });
    });

    it('generates valid CSS 3D transform strings under all presets with zero NaN or undefined', () => {
      const presets: CameraPresetType[] = ['TOP_DOWN', 'ISOMETRIC', 'CINEMATIC', 'TACTICAL'];

      presets.forEach((preset) => {
        const cam = getCameraPreset(preset);
        const transformStr = getCameraTransformString(cam);

        expect(transformStr).toContain(`rotateX(${cam.pitch}deg)`);
        expect(transformStr).toContain(`rotateZ(${cam.yaw}deg)`);
        expect(transformStr).toContain(`scale(${cam.zoom})`);
        expect(transformStr).toContain(`translate3d(0px, 0px, 0)`);
        assertZeroNaNOrUndefined(transformStr, `Transform string for preset ${preset}`);
      });
    });
  });

  // =========================================================================
  // 2. HUD TOOLBAR & ACCESSIBILITY AUDIT
  // =========================================================================
  describe('2. HUD Toolbar & Accessibility Audit', () => {
    it('verifies complete WAI-ARIA role and label hierarchy on CameraControls', () => {
      const camera = getCameraPreset('TACTICAL');
      const markup = renderToStaticMarkup(
        React.createElement(CameraControls, {
          camera,
          onSetPreset: () => {},
          onZoomIn: () => {},
          onZoomOut: () => {},
          onReset: () => {},
          onFocusActivePlayer: () => {},
          activePlayerTileId: 5,
        })
      );

      // 1. Toolbar container role & label
      expect(markup).toContain('role="toolbar"');
      expect(markup).toContain('aria-label="Điều khiển góc nhìn camera"');
      expect(markup).toContain('data-testid="camera-controls-hud"');

      // 2. Simplified view controls: one 2D/3D switch plus a rotate-view cycle (no preset row)
      expect(markup).toMatch(/data-testid="camera-view-toggle"[^>]*aria-pressed="false"/);
      expect(markup).toContain('data-testid="camera-view-cycle"');
      expect(markup).not.toContain('data-testid="camera-preset-');

      // 3. Zoom controls have descriptive aria-labels
      expect(markup).toContain('aria-label="Phóng to bản đồ"');
      expect(markup).toContain('aria-label="Thu nhỏ bản đồ"');
      expect(markup).toContain('aria-label="Đặt lại góc nhìn mặc định"');
      expect(markup).toContain('aria-label="Tập trung vào lượt người chơi hiện tại"');

      // 4. Separator lines are hidden from screen readers
      expect(markup).toContain('aria-hidden="true"');
      assertZeroNaNOrUndefined(markup, 'CameraControls full render');
    });

    it('cleanly omits player focus button when onFocusActivePlayer is not provided', () => {
      const camera = getCameraPreset('ISOMETRIC');
      const markup = renderToStaticMarkup(
        React.createElement(CameraControls, {
          camera,
          onSetPreset: () => {},
          onZoomIn: () => {},
          onZoomOut: () => {},
          onReset: () => {},
        })
      );

      expect(markup).not.toContain('data-testid="camera-focus-player"');
      expect(markup).not.toContain('Tâm điểm');
      assertZeroNaNOrUndefined(markup, 'CameraControls without player focus');
    });
  });

  // =========================================================================
  // 3. 36 VIETNAMESE CHAOS CARDS & 3D CALAMITY VFX COVERAGE
  // =========================================================================
  // Count updated: 36 original + 24 new (roadmap C) = 60, minus the 2 insurance/counter cards
  // removed when the Chaos insurance feature was dropped = 58.
  describe('3. 58 Vietnamese Chaos Cards & 3D Calamity VFX Stress', () => {
    it('maps all 58 distinct Vietnamese chaos cards to a valid non-null 3D spatial effect', () => {
      expect(CHAOS_CARDS.length).toBe(58);

      const effectCounts: Record<SpatialChaosEffectType, number> = {
        METEOR_STRIKE: 0,
        MARKET_CRASH: 0,
        ECONOMIC_BOOM: 0,
      };

      CHAOS_CARDS.forEach((card) => {
        const effect = determineChaosEffectType(card);
        expect(effect).not.toBeNull();
        expect(['METEOR_STRIKE', 'MARKET_CRASH', 'ECONOMIC_BOOM']).toContain(effect);
        if (effect) {
          effectCounts[effect]++;
        }
      });

      // Verify that all 3 calamity types are actively represented across the deck
      expect(effectCounts.METEOR_STRIKE).toBeGreaterThan(0);
      expect(effectCounts.MARKET_CRASH).toBeGreaterThan(0);
      expect(effectCounts.ECONOMIC_BOOM).toBeGreaterThan(0);
      expect(
        effectCounts.METEOR_STRIKE + effectCounts.MARKET_CRASH + effectCounts.ECONOMIC_BOOM
      ).toBe(58);
    });

    it('resolves finite 3D coordinates for all 58 cards under varied board dimensions', () => {
      const boardSizes = [400, 560, 900];

      boardSizes.forEach((size) => {
        CHAOS_CARDS.forEach((card) => {
          const effect = determineChaosEffectType(card)!;
          const pos = resolveChaos3DPosition(effect, size, 28, card.targetTileId, card);

          expect(Number.isFinite(pos.x)).toBe(true);
          expect(Number.isFinite(pos.y)).toBe(true);
          expect(Number.isFinite(pos.z)).toBe(true);
          expect(pos.z).toBe(28); // Anchored on top slab surface
        });
      });
    });

    it('renders all 3 spatial calamity VFX variants with preserve-3d context and zero NaNs', () => {
      const effects: SpatialChaosEffectType[] = ['METEOR_STRIKE', 'MARKET_CRASH', 'ECONOMIC_BOOM'];

      effects.forEach((effect) => {
        const markup = renderToStaticMarkup(
          React.createElement(SpatialChaosVFX, {
            forceEffect: effect,
            targetTileId: 10,
            boardSize: 560,
            slabHeight: 28,
          })
        );

        assertZeroNaNOrUndefined(markup, `SpatialChaosVFX for ${effect}`);
        expect(markup).toContain('data-testid="spatial-chaos-vfx"');
        expect(markup).toContain(`data-effect="${effect}"`);
        expect(markup).toContain('preserve-3d');
      });
    });
  });

  // =========================================================================
  // 4. BOARDVIEW 2.5D VS 2D VIEWPORT & CALAMITY ANCHORING
  // =========================================================================
  describe('4. BoardView Viewport & Calamity Anchoring', () => {
    it('renders BoardView in 3D mode with preserve-3d stage, slab, and docked camera controls', () => {
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

      assertZeroNaNOrUndefined(markup, 'BoardView 3D render');
      expect(markup).toContain('data-testid="board-view-container"');
      expect(markup).toContain('data-testid="board-camera-stage"');
      expect(markup).toContain('data-testid="camera-controls-hud"');
      expect(markup).toContain('transform-style:preserve-3d');
    });

    it('renders BoardView in 2D mode with flat view and zero pitch/yaw angles', () => {
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

      assertZeroNaNOrUndefined(markup, 'BoardView 2D render');
      expect(markup).toContain('flat-view');
      expect(markup).toContain('rotateX(0deg)');
      expect(markup).toContain('rotateZ(0deg)');
    });

    it('anchors SpatialChaosVFX on 3D board slab when activeChaosCard is active', () => {
      const crashCard = CHAOS_CARDS.find((c) => c.id === 'neg-real-estate-crash') || CHAOS_CARDS[0];

      const mockState: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
        activeChaosCard: crashCard,
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

      assertZeroNaNOrUndefined(markup, 'BoardView with active real estate crash card');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
    });
  });
});
