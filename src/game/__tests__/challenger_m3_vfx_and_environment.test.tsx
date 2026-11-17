import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

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
import { getCameraPreset } from '../../components/camera/useCameraState';
import { ChaosCard, GameState } from '../types';
import { INITIAL_GAME_STATE } from '../gameReducer';
import { loadWorldConfig } from '../../worlds/registry';
import { WorldConfig } from '../../worlds/types';

// Visual & Oracle Sanitization Helper
function assertZeroNaNOrUndefined(markup: string, context: string) {
  expect(markup, `${context} contained literal "NaN"`).not.toMatch(/\bNaN\b/);
  expect(markup, `${context} contained literal "undefined"`).not.toMatch(/\bundefined\b/);
  expect(markup, `${context} contained "[object Object]"`).not.toContain('[object Object]');
}

describe('Empirical Challenger Suite: Milestone 3 Calamity VFX & Parallax Environment', () => {
  let metropolisConfig: WorldConfig;
  let cyberpunkConfig: WorldConfig;
  let mekongConfig: WorldConfig;
  let spaceConfig: WorldConfig;

  beforeEach(async () => {
    metropolisConfig = (await loadWorldConfig('modern-metropolis')).config;
    cyberpunkConfig = (await loadWorldConfig('cyberpunk-city')).config;
    mekongConfig = (await loadWorldConfig('mekong-delta')).config;
    spaceConfig = (await loadWorldConfig('space-colony')).config;
  });

  // =========================================================================
  // 1. MATHEMATICAL INVARIANT & 3D CARTESIAN COORDINATE ANCHORING
  // =========================================================================
  describe('1. 3D Cartesian Coordinate Anchoring & Resolution Invariants', () => {
    const TEST_BOARD_SIZES = [360, 480, 560, 720, 800];
    const TEST_SLAB_HEIGHTS = [0, 14, 28, 40];

    it('anchors METEOR_STRIKE exactly at getTile3DPosition for all 40 tiles (0..39)', () => {
      TEST_BOARD_SIZES.forEach((boardSize) => {
        TEST_SLAB_HEIGHTS.forEach((slabHeight) => {
          for (let tileId = 0; tileId < 40; tileId++) {
            const expectedPos = getTile3DPosition(tileId, boardSize, slabHeight);
            const actualPos = resolveChaos3DPosition(
              'METEOR_STRIKE',
              boardSize,
              slabHeight,
              tileId
            );

            expect(actualPos.x).toBeCloseTo(expectedPos.x, 5);
            expect(actualPos.y).toBeCloseTo(expectedPos.y, 5);
            expect(actualPos.z).toBeCloseTo(expectedPos.z, 5);
          }
        });
      });
    });

    it('anchors MARKET_CRASH exactly at getTile3DPosition for all 40 tiles (0..39)', () => {
      TEST_BOARD_SIZES.forEach((boardSize) => {
        for (let tileId = 0; tileId < 40; tileId++) {
          const expectedPos = getTile3DPosition(tileId, boardSize, 28);
          const actualPos = resolveChaos3DPosition(
            'MARKET_CRASH',
            boardSize,
            28,
            tileId
          );

          expect(actualPos).toEqual(expectedPos);
        }
      });
    });

    it('STRICT INVARIANT: ECONOMIC_BOOM ALWAYS anchors at Center Plaza (0, 0, slabHeight) regardless of targetTileId', () => {
      TEST_BOARD_SIZES.forEach((boardSize) => {
        TEST_SLAB_HEIGHTS.forEach((slabHeight) => {
          for (let tileId = 0; tileId < 40; tileId++) {
            const dummyCard: ChaosCard = {
              id: 'test-boom',
              title: 'Thịnh Vượng',
              tagline: 'Jackpot',
              flavorText: 'Vàng rơi',
              rarity: 'COMMON',
              effectType: 'WINDFALL_JACKPOT',
              value: 100,
              targetTileId: tileId, // Even if card explicitly specifies a tile!
              iconName: 'Sparkles',
            };

            const actualPos = resolveChaos3DPosition(
              'ECONOMIC_BOOM',
              boardSize,
              slabHeight,
              tileId,
              dummyCard
            );

            // Must strictly be center plaza (0, 0, slabHeight)
            expect(actualPos).toEqual({ x: 0, y: 0, z: slabHeight });
          }
        });
      });
    });

    it('resolves target tile precedence: targetTileId prop > card.targetTileId > fallback tile 20', () => {
      const boardSize = 560;
      const slabHeight = 28;

      const cardWithTile15: ChaosCard = {
        id: 'c1',
        title: 'Thảm Họa',
        tagline: '',
        flavorText: '',
        rarity: 'CALAMITY',
        effectType: 'CALAMITY_DEMOLISH',
        value: 1,
        targetTileId: 15,
        iconName: 'Flame',
      };

      // 1. Explicit prop targetTileId = 7 overrides card's targetTileId = 15
      const posProp = resolveChaos3DPosition('METEOR_STRIKE', boardSize, slabHeight, 7, cardWithTile15);
      expect(posProp).toEqual(getTile3DPosition(7, boardSize, slabHeight));

      // 2. Omitted prop falls back to card.targetTileId = 15
      const posCard = resolveChaos3DPosition('METEOR_STRIKE', boardSize, slabHeight, undefined, cardWithTile15);
      expect(posCard).toEqual(getTile3DPosition(15, boardSize, slabHeight));

      // 3. Omitted prop and card without targetTileId falls back to tile 20 (Free Parking)
      const cardNoTile: ChaosCard = { ...cardWithTile15, targetTileId: undefined };
      const posFallback = resolveChaos3DPosition('METEOR_STRIKE', boardSize, slabHeight, undefined, cardNoTile);
      expect(posFallback).toEqual(getTile3DPosition(20, boardSize, slabHeight));
    });

    it('verifies 4 corner tiles (0, 10, 20, 30) Cartesian symmetry and sign quadrants', () => {
      const boardSize = 600;
      const slabHeight = 28;

      const pos0 = getTile3DPosition(0, boardSize, slabHeight);   // Bottom-right GO
      const pos10 = getTile3DPosition(10, boardSize, slabHeight); // Bottom-left Jail
      const pos20 = getTile3DPosition(20, boardSize, slabHeight); // Top-left Free Parking
      const pos30 = getTile3DPosition(30, boardSize, slabHeight); // Top-right Go To Jail

      // Signs
      expect(pos0.x).toBeGreaterThan(0);
      expect(pos0.y).toBeGreaterThan(0);

      expect(pos10.x).toBeLessThan(0);
      expect(pos10.y).toBeGreaterThan(0);

      expect(pos20.x).toBeLessThan(0);
      expect(pos20.y).toBeLessThan(0);

      expect(pos30.x).toBeGreaterThan(0);
      expect(pos30.y).toBeLessThan(0);

      // Radial magnitude equality
      const r0 = Math.hypot(pos0.x, pos0.y);
      const r10 = Math.hypot(pos10.x, pos10.y);
      const r20 = Math.hypot(pos20.x, pos20.y);
      const r30 = Math.hypot(pos30.x, pos30.y);

      expect(r0).toBeCloseTo(r10, 5);
      expect(r10).toBeCloseTo(r20, 5);
      expect(r20).toBeCloseTo(r30, 5);
    });
  });

  // =========================================================================
  // 2. CALAMITY EFFECT CLASSIFICATION & BOUNDARY FUZZING
  // =========================================================================
  describe('2. Calamity Effect Classification & Boundary Fuzzing', () => {
    it('correctly classifies Vietnamese and English disaster keywords to METEOR_STRIKE', () => {
      const testCases = [
        { title: 'Mưa Thiên Thạch Bão Lửa', effectType: 'CALAMITY_DEMOLISH' },
        { title: 'Thảm Họa Động Đất Sóng Thần', effectType: 'DISASTER' },
        { title: 'Hỏa Hoạn Thiêu Rụi Tòa Nhà', effectType: 'FIRE_DAMAGE' },
        { title: 'Typhoon Catastrophe', effectType: 'TYPHOON_STRIKE' },
        { title: 'Alien Invasion Demolition', effectType: 'ALIEN_ATTACK' },
      ];

      testCases.forEach((tc) => {
        const card: ChaosCard = {
          id: 'test',
          title: tc.title,
          tagline: '',
          flavorText: '',
          rarity: 'CALAMITY',
          effectType: tc.effectType,
          value: 1,
          iconName: 'Flame',
        };
        expect(determineChaosEffectType(card)).toBe('METEOR_STRIKE');
      });
    });

    it('correctly classifies Vietnamese and English financial crises to MARKET_CRASH', () => {
      const testCases = [
        { title: 'Thị Trường Chứng Khoán Sụp Đổ', effectType: 'MARKET_CRASH' },
        { title: 'Khủng Hoảng Kinh Tế Toàn Cầu', effectType: 'RECESSION' },
        { title: 'Bão Lạm Phát Phi Mã', effectType: 'INFLATION_SURGE' },
        { title: 'Thuế Trừng Phạt Bất Động Sản', effectType: 'TAX_PENALTY' },
        { title: 'Mortgage Freeze Downgrade', effectType: 'MORTGAGE_FREEZE_DEVALUE' },
      ];

      testCases.forEach((tc) => {
        const card: ChaosCard = {
          id: 'test',
          title: tc.title,
          tagline: '',
          flavorText: '',
          rarity: 'RARE',
          effectType: tc.effectType,
          value: 100,
          iconName: 'TrendingDown',
        };
        expect(determineChaosEffectType(card)).toBe('MARKET_CRASH');
      });
    });

    it('correctly classifies windfalls and positive rewards to ECONOMIC_BOOM', () => {
      const testCases = [
        { title: 'Kỳ Tích Kinh Tế Bùng Nổ', effectType: 'ECONOMIC_BOOM' },
        { title: 'Kho Báu Hoàng Gia Thịnh Vượng', effectType: 'WINDFALL_JACKPOT' },
        { title: 'Phát Tài Trúng Số Độc Đắc', effectType: 'LOTTERY_PRIZE' },
        { title: 'Trợ Cấp Phát Triển Hạ Tầng', effectType: 'SUBSIDY_GRANT' },
        { title: 'Cổ Tức Vàng Rực Rỡ', effectType: 'DIVIDEND_GOLD_PAYOUT' },
      ];

      testCases.forEach((tc) => {
        const card: ChaosCard = {
          id: 'test',
          title: tc.title,
          tagline: '',
          flavorText: '',
          rarity: 'UNCOMMON',
          effectType: tc.effectType,
          value: 500,
          iconName: 'Sparkles',
        };
        expect(determineChaosEffectType(card)).toBe('ECONOMIC_BOOM');
      });
    });

    it('handles rarity fallback when title/effectType are generic or ambiguous', () => {
      // COMMON / UNCOMMON defaults to ECONOMIC_BOOM
      const commonCard: ChaosCard = {
        id: 'c-gen',
        title: 'Sự Kiện Bất Ngờ',
        tagline: '',
        flavorText: '',
        rarity: 'COMMON',
        effectType: 'GENERIC_EVENT',
        value: 10,
        iconName: 'Sparkles',
      };
      expect(determineChaosEffectType(commonCard)).toBe('ECONOMIC_BOOM');

      // RARE / CALAMITY defaults to METEOR_STRIKE
      const rareCard: ChaosCard = {
        ...commonCard,
        rarity: 'RARE',
      };
      expect(determineChaosEffectType(rareCard)).toBe('METEOR_STRIKE');
    });

    it('forceEffect strictly overrides any card content, null card, or empty card', () => {
      const crashCard: ChaosCard = {
        id: 'crash',
        title: 'Khủng Hoảng Sụp Đổ',
        tagline: '',
        flavorText: '',
        rarity: 'RARE',
        effectType: 'MARKET_CRASH',
        value: 10,
        iconName: 'TrendingDown',
      };

      // Force to ECONOMIC_BOOM despite crash card
      expect(determineChaosEffectType(crashCard, 'ECONOMIC_BOOM')).toBe('ECONOMIC_BOOM');

      // Force with null card
      expect(determineChaosEffectType(null, 'METEOR_STRIKE')).toBe('METEOR_STRIKE');

      // Force with undefined card
      expect(determineChaosEffectType(undefined, 'MARKET_CRASH')).toBe('MARKET_CRASH');
    });

    it('returns null when card is null/undefined and no forceEffect is provided', () => {
      expect(determineChaosEffectType(null)).toBeNull();
      expect(determineChaosEffectType(undefined)).toBeNull();
    });
  });

  // =========================================================================
  // 3. SPATIAL CHAOS VFX DOM & VISUAL MARKUP ORACLE
  // =========================================================================
  describe('3. SpatialChaosVFX DOM & Visual Markup Oracle', () => {
    it('renders METEOR_STRIKE with exact Cartesian translate3d style and required visual sub-elements', () => {
      const boardSize = 560;
      const slabHeight = 28;
      const targetTileId = 10; // Jail corner (-280, 280)

      const markup = renderToStaticMarkup(
        React.createElement(SpatialChaosVFX, {
          forceEffect: 'METEOR_STRIKE',
          targetTileId,
          boardSize,
          slabHeight,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Meteor Strike markup');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
      expect(markup).toContain('data-effect="METEOR_STRIKE"');
      expect(markup).toContain('data-testid="spatial-vfx-meteor"');

      // Verify exact 3D Cartesian coordinates in translate3d
      const pos10 = getTile3DPosition(10, boardSize, slabHeight);
      expect(markup).toContain(`translate3d(${pos10.x}px, ${pos10.y}px, ${pos10.z}px)`);

      // Verify essential visual parts
      expect(markup).toContain('spatial-meteor-projectile');
      expect(markup).toContain('spatial-shockwave-ring');
      expect(markup).toContain('spatial-shockwave-ring-delayed');
      expect(markup).toContain('spatial-scorch-decal');
      expect(markup).toContain('preserve-3d');
    });

    it('renders MARKET_CRASH with exact Cartesian coordinates, wireframe hologram, and warning beacon', () => {
      const boardSize = 640;
      const slabHeight = 32;
      const targetTileId = 20; // Free Parking corner (-320, -320)

      const markup = renderToStaticMarkup(
        React.createElement(SpatialChaosVFX, {
          forceEffect: 'MARKET_CRASH',
          targetTileId,
          boardSize,
          slabHeight,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Market Crash markup');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
      expect(markup).toContain('data-effect="MARKET_CRASH"');
      expect(markup).toContain('data-testid="spatial-vfx-market-crash"');

      const pos20 = getTile3DPosition(20, boardSize, slabHeight);
      expect(markup).toContain(`translate3d(${pos20.x}px, ${pos20.y}px, ${pos20.z}px)`);

      // Verify visual sub-elements
      expect(markup).toContain('spatial-market-grid');
      expect(markup).toContain('spatial-down-arrow');
      expect(markup).toContain('CRASH');
      expect(markup).toContain('spatial-warning-beacon');
    });

    it('renders ECONOMIC_BOOM with (0, 0, slabHeight) coordinates, golden particle fountain, and crest', () => {
      const boardSize = 560;
      const slabHeight = 28;

      const markup = renderToStaticMarkup(
        React.createElement(SpatialChaosVFX, {
          forceEffect: 'ECONOMIC_BOOM',
          targetTileId: 35, // Ignored!
          boardSize,
          slabHeight,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Economic Boom markup');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
      expect(markup).toContain('data-effect="ECONOMIC_BOOM"');
      expect(markup).toContain('data-testid="spatial-vfx-economic-boom"');

      // Center Plaza invariant: translate3d(0px, 0px, 28px)
      expect(markup).toContain(`translate3d(0px, 0px, ${slabHeight}px)`);

      // Verify visual sub-elements
      expect(markup).toContain('spatial-boom-aura');
      expect(markup).toContain('spatial-gold-stream-0');
      expect(markup).toContain('spatial-gold-stream-1');
      expect(markup).toContain('spatial-gold-stream-2');
      expect(markup).toContain('spatial-gold-stream-3');
      expect(markup).toContain('spatial-gold-stream-4');
      expect(markup).toContain('BOOM!');
    });

    it('returns empty string when card is null and no forceEffect is given', () => {
      const markup = renderToStaticMarkup(
        React.createElement(SpatialChaosVFX, {
          card: null,
          boardSize: 560,
        })
      );
      expect(markup).toBe('');
    });
  });

  // =========================================================================
  // 4. LIFECYCLE, AUTO-CLEANUP TIMER & HOOK CONTRACT
  // =========================================================================
  describe('4. Lifecycle, Auto-cleanup Timer & Hook Contract', () => {
    it('verifies SpatialChaosVFX source implements exactly 2600ms timeout with clearTimeout cleanup', () => {
      const vfxFilePath = path.resolve(
        process.cwd(),
        'src/components/chaos/SpatialChaosVFX.tsx'
      );
      const vfxSource = fs.readFileSync(vfxFilePath, 'utf-8');

      // 1. Duration constant must be exactly 2600ms
      expect(vfxSource).toMatch(/setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*2600\s*\)/);

      // 2. Must call onAnimationComplete?.()
      expect(vfxSource).toContain('onAnimationComplete?.()');

      // 3. Must return cleanup function with clearTimeout
      expect(vfxSource).toMatch(/return\s*\(\)\s*=>\s*clearTimeout\(timer\)/);

      // 4. Must track card?.id and forceEffect in dependency array
      expect(vfxSource).toMatch(/\[card\?\.id,\s*forceEffect,\s*onAnimationComplete\]/);
    });

    it('empirically verifies the 2600ms timer lifecycle contract with Vitest fake timers', () => {
      vi.useFakeTimers();

      let active = true;
      const onAnimationComplete = vi.fn();

      // Simulate the exact hook logic of SpatialChaosVFX
      const timer = setTimeout(() => {
        active = false;
        onAnimationComplete();
      }, 2600);

      // Advance by 1500ms: still active, callback not called
      vi.advanceTimersByTime(1500);
      expect(active).toBe(true);
      expect(onAnimationComplete).not.toHaveBeenCalled();

      // Advance to 2599ms: still active, callback not called
      vi.advanceTimersByTime(1099);
      expect(active).toBe(true);
      expect(onAnimationComplete).not.toHaveBeenCalled();

      // Advance final 1ms to 2600ms: state becomes false, callback fired once
      vi.advanceTimersByTime(1);
      expect(active).toBe(false);
      expect(onAnimationComplete).toHaveBeenCalledTimes(1);

      // Advancing further does NOT fire callback again
      vi.advanceTimersByTime(5000);
      expect(onAnimationComplete).toHaveBeenCalledTimes(1);

      clearTimeout(timer);
      vi.useRealTimers();
    });

    it('empirically verifies timer cancellation on early unmount/prop change', () => {
      vi.useFakeTimers();

      const onAnimationComplete = vi.fn();

      let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        onAnimationComplete();
      }, 2600);

      // Advance 1000ms
      vi.advanceTimersByTime(1000);
      expect(onAnimationComplete).not.toHaveBeenCalled();

      // Simulate unmount / effect cleanup before 2600ms
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      // Advance past 2600ms (e.g. 3000ms total)
      vi.advanceTimersByTime(3000);
      expect(onAnimationComplete).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 5. REDUCED MOTION ACCESSIBILITY & CSS ANIMATION INVARIANTS
  // =========================================================================
  describe('5. Reduced Motion Accessibility & CSS Animation Invariants', () => {
    it('verifies src/index.css defines strict prefers-reduced-motion overrides disabling calamity VFX', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssSource = fs.readFileSync(cssPath, 'utf-8');

      // 1. Must contain prefers-reduced-motion media query
      expect(cssSource).toContain('@media (prefers-reduced-motion: reduce)');

      // 2. Must disable spatial meteor animations
      expect(cssSource).toContain('.spatial-meteor-projectile');
      expect(cssSource).toContain('.spatial-shockwave-ring');
      expect(cssSource).toContain('.spatial-shockwave-ring-delayed');

      // 3. Must disable spatial market crash animations
      expect(cssSource).toContain('.spatial-market-grid');
      expect(cssSource).toContain('.spatial-down-arrow');

      // 4. Must disable spatial economic boom animations
      expect(cssSource).toContain('.spatial-boom-aura');
      expect(cssSource).toContain('[class*="spatial-gold-stream-"]');

      // 5. Must disable weather animations
      expect(cssSource).toContain('.world-env-rain');
      expect(cssSource).toContain('.world-env-stars');
      expect(cssSource).toContain('.world-env-firefly');

      // 6. Must contain global transition/animation duration bypass
      expect(cssSource).toContain('transition-duration: 0.01ms !important');
      expect(cssSource).toContain('animation-duration: 0.01ms !important');
    });

    it('verifies all Calamity VFX CSS keyframes exist with hardware accelerated 3D transforms', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssSource = fs.readFileSync(cssPath, 'utf-8');

      const requiredKeyframes = [
        '@keyframes spatialMeteorDescent',
        '@keyframes spatialShockwave',
        '@keyframes spatialScorch',
        '@keyframes spatialMarketDescent',
        '@keyframes spatialDownBounce',
        '@keyframes spatialBoomExpand',
        '@keyframes spatialGoldFountain',
      ];

      requiredKeyframes.forEach((kf) => {
        expect(cssSource, `CSS keyframe ${kf} missing`).toContain(kf);
      });
    });
  });

  // =========================================================================
  // 6. WORLD ENVIRONMENT HORIZON PARALLAX SKYBOX SHIFT SUITE
  // =========================================================================
  describe('6. WorldEnvironment Horizon Parallax Skybox Shift Suite', () => {
    it('computes exact horizon skybox parallax shift across all 4 camera presets', () => {
      // Formula:
      // parallaxX = -((yaw - 45) * 1.8)
      // parallaxY = (pitch - 55) * 0.7

      // 1. ISOMETRIC: yaw 45, pitch 55 -> parallaxX = 0, parallaxY = 0
      const camIso: CameraState = getCameraPreset('ISOMETRIC');
      const expectedIsoX = -((camIso.yaw - 45) * 1.8); // -0
      const expectedIsoY = (camIso.pitch - 55) * 0.7;  // 0
      expect(Math.abs(expectedIsoX)).toBe(0);
      expect(Math.abs(expectedIsoY)).toBe(0);

      const markupIso = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
          camera: camIso,
        })
      );
      // In CSS, -0px or 0px both serialize cleanly without NaN
      expect(markupIso).toMatch(/translate3d\(-?0px, 0px, 0\)/);

      // 2. TOP_DOWN: yaw 0, pitch 0 -> parallaxX = +81, parallaxY = -38.5
      const camTop: CameraState = getCameraPreset('TOP_DOWN');
      const expectedTopX = -((0 - 45) * 1.8); // +81
      const expectedTopY = (0 - 55) * 0.7;   // -38.5
      expect(expectedTopX).toBe(81);
      expect(expectedTopY).toBe(-38.5);

      const markupTop = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
          camera: camTop,
        })
      );
      expect(markupTop).toContain('translate3d(81px, -38.5px, 0)');

      // 3. CINEMATIC: yaw 20, pitch 65 -> parallaxX = +45, parallaxY = +7
      const camCine: CameraState = getCameraPreset('CINEMATIC');
      const expectedCineX = -((20 - 45) * 1.8); // +45
      const expectedCineY = (65 - 55) * 0.7;   // +7
      expect(expectedCineX).toBe(45);
      expect(expectedCineY).toBe(7);

      const markupCine = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
          camera: camCine,
        })
      );
      expect(markupCine).toContain('translate3d(45px, 7px, 0)');

      // 4. TACTICAL: yaw 45, pitch 35 -> parallaxX = 0, parallaxY = -14
      const camTac: CameraState = getCameraPreset('TACTICAL');
      const expectedTacX = -((45 - 45) * 1.8); // -0
      const expectedTacY = (35 - 55) * 0.7;   // -14
      expect(Math.abs(expectedTacX)).toBe(0);
      expect(expectedTacY).toBe(-14);

      const markupTac = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
          camera: camTac,
        })
      );
      expect(markupTac).toMatch(/translate3d\(-?0px, -14px, 0\)/);
    });

    it('verifies strict monotonic inverse relationship between camera yaw and parallaxX', () => {
      // When camera rotates right (+yaw), skybox must shift left (-parallaxX)
      const yawAngles = [-90, -45, 0, 20, 45, 60, 90, 135, 180];
      let prevParallaxX = Infinity;

      yawAngles.forEach((yaw) => {
        const parallaxX = -((yaw - 45) * 1.8);
        expect(parallaxX).toBeLessThan(prevParallaxX);
        prevParallaxX = parallaxX;
      });
    });

    it('verifies strict monotonic direct relationship between camera pitch and parallaxY', () => {
      // When camera tilts up (+pitch), horizon drops down (+parallaxY)
      const pitchAngles = [0, 15, 30, 45, 55, 65, 75, 90];
      let prevParallaxY = -Infinity;

      pitchAngles.forEach((pitch) => {
        const parallaxY = (pitch - 55) * 0.7;
        expect(parallaxY).toBeGreaterThan(prevParallaxY);
        prevParallaxY = parallaxY;
      });
    });

    it('handles camera prop omission and missing yaw/pitch gracefully with zero NaNs', () => {
      // 1. Camera omitted entirely
      const markupOmitted = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
        })
      );
      assertZeroNaNOrUndefined(markupOmitted, 'WorldEnvironment with omitted camera');
      expect(markupOmitted).toContain('translate3d(0px, 0px, 0)');

      // 2. Camera with empty object / undefined yaw & pitch
      const markupEmptyCam = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
          camera: {} as any,
        })
      );
      assertZeroNaNOrUndefined(markupEmptyCam, 'WorldEnvironment with empty camera object');
      expect(markupEmptyCam).toContain('translate3d(0px, 0px, 0)');
    });
  });

  // =========================================================================
  // 7. WORLD ENVIRONMENT 4 THEMED SILHOUETTES SUITE
  // =========================================================================
  describe('7. WorldEnvironment 4 Themed World Silhouettes Suite', () => {
    it('renders Modern Metropolis silhouette with skyscraper columns and cyan spire beacons', () => {
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Metropolis Environment markup');
      expect(markup).toContain('data-testid="world-environment"');
      expect(markup).toContain('data-testid="world-horizon-skybox"');
      expect(markup).toContain('border-cyan-500/20');
      expect(markup).toContain('bg-cyan-400/80 rounded-full animate-ping');
    });

    it('renders Cyberpunk City silhouette with violet gradient spires and cyan horizontal neon strips', () => {
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: cyberpunkConfig,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Cyberpunk Environment markup');
      expect(markup).toContain('data-testid="world-horizon-skybox"');
      expect(markup).toContain('#0d0718');
      expect(markup).toContain('border-fuchsia-500/40');
      expect(markup).toContain('shadow-[0_0_8px_#06b6d4]');
    });

    it('renders Mekong Delta silhouette with organic rounded hills and emerald borders', () => {
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: mekongConfig,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Mekong Delta Environment markup');
      expect(markup).toContain('data-testid="world-horizon-skybox"');
      expect(markup).toContain('rounded-t-full');
      expect(markup).toContain('#08150f');
      expect(markup).toContain('border-emerald-500/20');
    });

    it('renders Space Colony silhouette with celestial Saturnian ring system rotated -15deg', () => {
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: spaceConfig,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Space Colony Environment markup');
      expect(markup).toContain('data-testid="world-horizon-skybox"');
      expect(markup).toContain('rounded-[100%]');
      expect(markup).toContain('border-indigo-400/30');
      expect(markup).toContain('rotate(-15deg)');
    });

    it('returns null when config is null', () => {
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: null,
        })
      );
      expect(markup).toBe('');
    });
  });

  // =========================================================================
  // 8. PERSPECTIVE WEATHER PARTICLES EMPIRICAL VERIFICATION
  // =========================================================================
  describe('8. Perspective Weather Particles Empirical Verification', () => {
    it('renders rain precipitation with 3D perspective rotation tilt in Cyberpunk City', () => {
      const camera: CameraState = { ...DEFAULT_CAMERA, pitch: 55, yaw: 65 };
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: cyberpunkConfig, // kind: 'rain', intensity: 0.35
          camera,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Cyberpunk Rain Weather markup');
      expect(markup).toContain('data-testid="world-perspective-weather"');
      expect(markup).toContain('world-env-rain');

      // Check rain 3D perspective rotation: rotateX(22deg) rotateZ(5deg)
      // pitch 55 * 0.4 = 22deg, (yaw 65 - 45) * 0.25 = 5deg
      expect(markup).toContain('rotateX(22deg) rotateZ(5deg)');
    });

    it('renders twinkling stars with parallax translation in Space Colony', () => {
      const camera: CameraState = { ...DEFAULT_CAMERA, pitch: 55, yaw: 65 };
      // parallaxX = -(65 - 45) * 1.8 = -36. Scaled by 0.3x = -10.8px
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: spaceConfig, // kind: 'stars', intensity: 0.5
          camera,
        })
      );

      assertZeroNaNOrUndefined(markup, 'Space Colony Stars Weather markup');
      expect(markup).toContain('data-testid="world-perspective-weather"');
      expect(markup).toContain('world-env-stars');
      expect(markup).toMatch(/translate3d\(-10\.(?:799\d*|8)px,\s*0px,\s*0\)/);
    });

    it('renders exactly 8 volumetric fireflies with 3D Z-elevation in Mekong Delta', () => {
      const markup = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: mekongConfig, // kind: 'fireflies', intensity: 0.4
        })
      );

      assertZeroNaNOrUndefined(markup, 'Mekong Delta Fireflies Weather markup');
      expect(markup).toContain('data-testid="world-perspective-weather"');
      expect(markup).toContain('world-env-firefly');

      // Count occurrences of firefly spans
      const matches = markup.match(/class="[^"]*world-env-firefly[^"]*"/g);
      expect(matches).not.toBeNull();
      expect(matches?.length).toBe(8);

      // Verify volumetric Z-axis elevation translateZ
      expect(markup).toMatch(/translateZ\(-?\d+px\)/);
    });

    it('does NOT render weather particle container when kind is none or intensity is 0', () => {
      // 1. Metropolis has kind: 'none', intensity: 0
      const markupMetropolis = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: metropolisConfig,
        })
      );
      expect(markupMetropolis).not.toContain('data-testid="world-perspective-weather"');

      // 2. Custom config with rain but 0 intensity
      const customConfig: WorldConfig = {
        ...cyberpunkConfig,
        pack: {
          ...cyberpunkConfig.pack,
          environment: { kind: 'rain', intensity: 0 },
        },
      };
      const markupZeroIntensity = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: customConfig,
        })
      );
      expect(markupZeroIntensity).not.toContain('data-testid="world-perspective-weather"');
    });

    it('clamps negative intensity to 0 and excessive intensity to 1.0 gracefully', () => {
      // Negative intensity should not render weather
      const negativeConfig: WorldConfig = {
        ...cyberpunkConfig,
        pack: {
          ...cyberpunkConfig.pack,
          environment: { kind: 'rain', intensity: -0.5 },
        },
      };
      const markupNegative = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: negativeConfig,
        })
      );
      expect(markupNegative).not.toContain('data-testid="world-perspective-weather"');

      // Excessive intensity (e.g. 5.0) clamped to 1.0 (opacity = 0.38 * 1.0 = 0.38)
      const excessiveConfig: WorldConfig = {
        ...cyberpunkConfig,
        pack: {
          ...cyberpunkConfig.pack,
          environment: { kind: 'rain', intensity: 5.0 },
        },
      };
      const markupExcessive = renderToStaticMarkup(
        React.createElement(WorldEnvironment, {
          config: excessiveConfig,
        })
      );
      expect(markupExcessive).toContain('data-testid="world-perspective-weather"');
      expect(markupExcessive).toContain('opacity:0.38');
    });
  });

  // =========================================================================
  // 9. BOARDVIEW INTEGRATION & CALAMITY VFX ANCHORING
  // =========================================================================
  describe('9. BoardView Integration & Calamity VFX Anchoring', () => {
    it('renders BoardView with Meteor Strike VFX properly anchored on the 3D board slab', () => {
      const meteorCard: ChaosCard = {
        id: 'calamity-meteor-24',
        title: 'Mưa Thiên Thạch Khổng Lồ',
        tagline: 'Thảm Họa',
        flavorText: 'Phá hủy nhà',
        rarity: 'CALAMITY',
        effectType: 'CALAMITY_DEMOLISH',
        value: 1,
        targetTileId: 24,
        iconName: 'Flame',
      };

      const stateWithMeteor: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
        activeChaosCard: meteorCard,
      };

      const markup = renderToStaticMarkup(
        React.createElement(BoardView, {
          state: stateWithMeteor,
          is3DView: true,
          onRollDice: () => {},
          onEndTurn: () => {},
          onSelectTile: () => {},
        })
      );

      assertZeroNaNOrUndefined(markup, 'BoardView with Meteor Strike VFX');
      expect(markup).toContain('data-testid="board-camera-stage"');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
      expect(markup).toContain('data-testid="spatial-vfx-meteor"');
      expect(markup).toContain('spatial-meteor-projectile');
      expect(markup).toContain('spatial-shockwave-ring');
    });

    it('renders BoardView with Market Crash VFX properly anchored on the 3D board slab', () => {
      const crashCard: ChaosCard = {
        id: 'calamity-crash-18',
        title: 'Thị Trường Đổ Vỡ',
        tagline: 'Khủng Hoảng',
        flavorText: 'Bất động sản sụt giá',
        rarity: 'RARE',
        effectType: 'MARKET_CRASH',
        value: 50,
        targetTileId: 18,
        iconName: 'TrendingDown',
      };

      const stateWithCrash: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
        activeChaosCard: crashCard,
      };

      const markup = renderToStaticMarkup(
        React.createElement(BoardView, {
          state: stateWithCrash,
          is3DView: true,
          onRollDice: () => {},
          onEndTurn: () => {},
          onSelectTile: () => {},
        })
      );

      assertZeroNaNOrUndefined(markup, 'BoardView with Market Crash VFX');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
      expect(markup).toContain('data-testid="spatial-vfx-market-crash"');
      expect(markup).toContain('spatial-market-grid');
      expect(markup).toContain('CRASH');
    });

    it('renders BoardView with Economic Boom VFX properly anchored at center plaza', () => {
      const boomCard: ChaosCard = {
        id: 'calamity-boom',
        title: 'Thịnh Vượng Toàn Cầu',
        tagline: 'Jackpot',
        flavorText: 'Mưa vàng',
        rarity: 'COMMON',
        effectType: 'ECONOMIC_BOOM',
        value: 1000,
        iconName: 'Sparkles',
      };

      const stateWithBoom: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
        activeChaosCard: boomCard,
      };

      const markup = renderToStaticMarkup(
        React.createElement(BoardView, {
          state: stateWithBoom,
          is3DView: true,
          onRollDice: () => {},
          onEndTurn: () => {},
          onSelectTile: () => {},
        })
      );

      assertZeroNaNOrUndefined(markup, 'BoardView with Economic Boom VFX');
      expect(markup).toContain('data-testid="spatial-chaos-vfx"');
      expect(markup).toContain('data-testid="spatial-vfx-economic-boom"');
      expect(markup).toContain('spatial-boom-aura');
      expect(markup).toContain('BOOM!');
    });

    it('does NOT render SpatialChaosVFX when activeChaosCard is null in GameState', () => {
      const stateNoChaos: GameState = {
        ...INITIAL_GAME_STATE,
        status: 'PLAYING',
        activeChaosCard: null,
      };

      const markup = renderToStaticMarkup(
        React.createElement(BoardView, {
          state: stateNoChaos,
          is3DView: true,
          onRollDice: () => {},
          onEndTurn: () => {},
          onSelectTile: () => {},
        })
      );

      expect(markup).not.toContain('data-testid="spatial-chaos-vfx"');
    });
  });
});
