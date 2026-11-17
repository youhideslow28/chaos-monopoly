import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  VolumetricBuilding,
  VolumetricBuildingProps,
} from '../../components/board/VolumetricBuilding';
import {
  VolumetricPlayerToken,
} from '../../components/board/VolumetricPlayerToken';
import {
  VolumetricDice3D,
  OPPOSITE_FACES,
  DICE_FACE_ORIENTATIONS,
  getFaceRotation,
  getDiceSkinPalette,
} from '../../components/dice/VolumetricDice3D';
import { TileComponent } from '../../components/board/TileComponent';
import { BoardTile, PlayerState, PropertyOwnership } from '../types';
import {
  computeTokenPlacements,
  TokenPlacement,
  getTokenZIndex,
} from '../../components/board/tokenStackingEngine';

// Helper to create mock player states
function createMockPlayer(
  id: string,
  name: string,
  colorHex: string,
  symbol: string,
  inDetention: boolean = false,
  isAI: boolean = false
): PlayerState {
  return {
    id,
    name,
    token: { id: `token-${id}`, name, colorHex, symbol },
    cash: 1500,
    position: 0,
    inDetention,
    detentionTurns: inDetention ? 2 : 0,
    isBankrupt: false,
    isAI,
    consecutiveDoubles: 0,
    stats: {
      rentPaid: 0,
      rentCollected: 0,
      chaosTriggered: 0,
      tilesTraveled: 0,
      propertiesOwned: 0,
    },
  };
}

// Regex oracle scanner for unexpected JS values in rendered DOM
function assertZeroNaNOrUndefined(markup: string, contextDescription: string) {
  expect(markup, `${contextDescription} contained literal "NaN"`).not.toMatch(/\bNaN\b/);
  expect(markup, `${contextDescription} contained literal "undefined"`).not.toMatch(/\bundefined\b/);
  expect(markup, `${contextDescription} contained "[object Object]"`).not.toContain('[object Object]');
}

describe('Adversarial Empirical Stress-Testing: Milestone 2 Volumetric Architecture', () => {
  // =========================================================================
  // 1. VOLUMETRIC BUILDING: 40-COMBINATION EXHAUSTIVE MATRIX & BOUNDARY TESTS
  // =========================================================================
  describe('1. VolumetricBuilding: 40-Combination Matrix & Boundary Stress', () => {
    const levels = [1, 2, 3, 4, 5];
    const themes = ['modern-metropolis', 'cyberpunk-city', 'mekong-delta', 'space-colony'];
    const mortgageStates = [false, true];

    // Total 5 * 4 * 2 = 40 combinations
    levels.forEach((level) => {
      themes.forEach((theme) => {
        mortgageStates.forEach((isMortgaged) => {
          it(`stress-tests level ${level} in "${theme}" theme (mortgaged: ${isMortgaged})`, () => {
            const props: VolumetricBuildingProps = {
              level,
              districtColor: 'district-cyber',
              districtHex: '#a855f7',
              worldId: theme,
              isMortgaged,
              tileType: 'PROPERTY',
              isIsometric: true,
            };

            const html = renderToStaticMarkup(React.createElement(VolumetricBuilding, props));

            // Oracle 1: Zero NaN or undefined in HTML
            assertZeroNaNOrUndefined(html, `Level ${level} (${theme}, mortgaged: ${isMortgaged})`);

            // Oracle 2: Correct tier container rendered
            expect(html).toContain(`data-testid="volumetric-building-tier-${level}"`);
            expect(html).toContain('preserve-3d');

            // Oracle 3: Mortgaged states properly styled
            if (isMortgaged) {
              expect(html).toContain('grayscale-[0.85]');
              expect(html).toContain('🚧');
              expect(html).toContain('repeating-linear-gradient');
            } else {
              expect(html).not.toContain('grayscale-[0.85]');
              expect(html).not.toContain('🚧');
            }

            // Oracle 4: Theme-specific classes present
            if (theme === 'cyberpunk-city') {
              expect(html).toContain('border-fuchsia-500/50');
            } else if (theme === 'mekong-delta') {
              expect(html).toContain('border-amber-700/60');
            } else if (theme === 'space-colony') {
              expect(html).toContain('border-cyan-300/80');
            } else if (theme === 'modern-metropolis') {
              expect(html).toContain('border-slate-600/70');
            }

            // Oracle 5: Level-specific geometric landmarks
            if (level === 1) {
              expect(html).toContain('polygon(50% 0%, 100% 100%, 0% 100%)');
              expect(html).toContain('translateZ(10px)');
            } else if (level === 2) {
              expect(html).toContain('translateZ(14px)');
            } else if (level === 3) {
              expect(html).toContain('translateZ(20px)');
              expect(html).toContain('grid-cols-2');
            } else if (level === 4) {
              expect(html).toContain('translateZ(28px)');
              expect(html).toContain('>H<');
            } else if (level === 5) {
              expect(html).toContain('translateZ(38px)');
              expect(html).toContain('👑');
              expect(html).toContain('Siêu Landmark Cấp 5');
            }
          });
        });
      });
    });

    it('rejects rendering for level <= 0 or invalid tile types', () => {
      // Level 0
      const l0 = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 0,
          districtColor: 'district-red',
          tileType: 'PROPERTY',
        })
      );
      expect(l0).toBe('');

      // Negative level
      const neg = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: -3,
          districtColor: 'district-red',
          tileType: 'PROPERTY',
        })
      );
      expect(neg).toBe('');

      // Non-property tiles
      const transport = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 2,
          districtColor: 'district-transport',
          tileType: 'TRANSPORT',
        })
      );
      expect(transport).toBe('');

      const utility = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 2,
          districtColor: 'district-utility',
          tileType: 'UTILITY',
        })
      );
      expect(utility).toBe('');
    });

    it('handles unexpected worldId by falling back to modern-metropolis safely', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 3,
          districtColor: 'district-blue',
          worldId: 'atlantis-underwater-unknown' as any,
          tileType: 'PROPERTY',
          isIsometric: true,
        })
      );
      assertZeroNaNOrUndefined(html, 'Unknown worldId fallback');
      expect(html).toContain('border-slate-600/70'); // modern-metropolis wallBorder
      expect(html).toContain('volumetric-building-tier-3');
    });

    it('handles flat 2D mode (isIsometric: false) by omitting translateZ', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 4,
          districtColor: 'district-green',
          districtHex: '#10b981',
          worldId: 'modern-metropolis',
          tileType: 'PROPERTY',
          isIsometric: false,
        })
      );
      assertZeroNaNOrUndefined(html, 'Flat 2D mode');
      expect(html).not.toContain('translateZ(');
      expect(html).toContain('transform-style:flat');
    });
  });

  // =========================================================================
  // 2. CSS 3D CONTEXT PRESERVATION IN TILECOMPONENT (NO OPACITY-85)
  // =========================================================================
  describe('2. TileComponent: CSS 3D Stacking & Flattening Prevention', () => {
    const baseTile: BoardTile = {
      id: 3,
      name: 'Hồ Hoàn Kiếm',
      shortName: 'Bờ Hồ',
      type: 'PROPERTY',
      description: 'Trái tim thủ đô',
      iconName: 'Landmark',
      property: {
        basePrice: 100,
        baseRent: 15,
        houseRent: [30, 60, 120, 240, 480],
        upgradeCost: 75,
        maxLevel: 5,
        district: 'Hà Nội Cổ',
        districtColor: 'district-brown',
        mortgageValue: 50,
      },
    };

    const p1 = createMockPlayer('p1', 'Player 1', '#ef4444', '🚗');

    it('ensures mortgaged tile strictly omits opacity-85 to prevent CSS 3D context-flattening', () => {
      const mortgagedOwnership: PropertyOwnership = {
        ownerId: 'p1',
        level: 3,
        isMortgaged: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(TileComponent, {
          tile: baseTile,
          ownership: mortgagedOwnership,
          ownerPlayer: p1,
          playersHere: [p1],
          activePlayerId: 'p1',
          onSelect: () => {},
          is3DView: true,
          worldId: 'cyberpunk-city',
        })
      );

      // CRITICAL ORACLE: No opacity-85 on root or any tile element
      expect(html).not.toContain('opacity-85');

      // CRITICAL ORACLE: preserve-3d class AND style must be maintained
      expect(html).toContain('preserve-3d');
      expect(html).toContain('transform-style:preserve-3d');

      // Mortgaged tiles sink to translateZ(-4px)
      expect(html).toContain('translateZ(-4px)');

      // Inner volumetric components must be preserved
      expect(html).toContain('volumetric-building-tier-3');
      expect(html).toContain('volumetric-token-p1');

      // No NaN or undefined
      assertZeroNaNOrUndefined(html, 'Mortgaged 3D tile');
    });

    it('maintains preserve-3d across all tile operational states', () => {
      const states: Array<{ name: string; props: Partial<React.ComponentProps<typeof TileComponent>> }> = [
        {
          name: 'Normal unowned tile',
          props: {},
        },
        {
          name: 'Owned Tier 5 Landmark tile',
          props: {
            ownership: { ownerId: 'p1', level: 5, isMortgaged: false },
            ownerPlayer: p1,
          },
        },
        {
          name: 'Highlighted active tile',
          props: {
            isHighlighted: true,
          },
        },
        {
          name: 'Corner GO tile (id: 0)',
          props: {
            tile: { ...baseTile, id: 0, type: 'START' as const, iconName: 'Flag', property: undefined },
          },
        },
        {
          name: 'Corner Detention tile (id: 10)',
          props: {
            tile: { ...baseTile, id: 10, type: 'DETENTION' as const, iconName: 'ShieldAlert', property: undefined },
          },
        },
        {
          name: 'Transport tile',
          props: {
            tile: { ...baseTile, id: 5, type: 'TRANSPORT', iconName: 'Train', property: undefined },
          },
        },
      ];

      states.forEach(({ name, props }) => {
        const html = renderToStaticMarkup(
          React.createElement(TileComponent, {
            tile: baseTile,
            playersHere: [],
            onSelect: () => {},
            is3DView: true,
            ...props,
          })
        );

        // All 3D tiles must keep preserve-3d and avoid opacity-85
        expect(html, `${name} must preserve 3D context`).toContain('preserve-3d');
        expect(html, `${name} must not contain opacity-85`).not.toContain('opacity-85');
        assertZeroNaNOrUndefined(html, name);
      });
    });

    it('confirms 3D Z-elevation hierarchy avoids collisions between layers', () => {
      // Base plate: +4px
      // Mortgaged: -4px
      // Highlighted: +14px
      // Building: +6px container -> Level 1 (10px) to Level 5 (38px)
      // Token: +12px to +22px
      // SpatialBillboard: +4px
      const ownership: PropertyOwnership = { ownerId: 'p1', level: 4, isMortgaged: false };
      const html = renderToStaticMarkup(
        React.createElement(TileComponent, {
          tile: baseTile,
          ownership,
          ownerPlayer: p1,
          playersHere: [p1],
          activePlayerId: 'p1',
          onSelect: () => {},
          is3DView: true,
          worldId: 'modern-metropolis',
        })
      );

      expect(html).toContain('translateZ(4px)'); // Tile base elevation
      expect(html).toContain('translateZ(6px)'); // Building container elevation
      expect(html).toContain('translateZ(28px)'); // Tier 4 high-rise elevation
      expect(html).toContain('translateZ(20px)'); // Token elevation (active player 1P)
    });
  });

  // =========================================================================
  // 3. DETENTION CAGES, COMPANION PETS, AND VOLUMETRIC TOKENS
  // =========================================================================
  describe('3. VolumetricPlayerToken: Detention Cages & Companion Pets', () => {
    const basePlacement: TokenPlacement = {
      xPercent: 50,
      yPercent: 58,
      elevationZ: 14,
      scale: 1.0,
      depthIndex: 1,
      isForefront: true,
    };

    it('renders detention cage accurately when player is in detention', () => {
      const detainedPlayer = createMockPlayer('p_detained', 'Prisoner', '#ef4444', '🚗', true);
      const html = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: detainedPlayer,
          isPlayerActive: false,
          placement: basePlacement,
          isIsometric: true,
        })
      );

      assertZeroNaNOrUndefined(html, 'Detained player token');
      expect(html).toContain('🔒'); // Padlock
      expect(html).toContain('Đang bị Tạm Giam'); // Title
      expect(html).toContain('border-amber-500/80'); // Amber metallic bars
      expect(html).toContain('translateZ(12px)'); // Cage elevation
    });

    it('does NOT render detention cage when player is free', () => {
      const freePlayer = createMockPlayer('p_free', 'Citizen', '#3b82f6', '🚀', false);
      const html = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: freePlayer,
          isPlayerActive: false,
          placement: basePlacement,
          isIsometric: true,
        })
      );

      expect(html).not.toContain('🔒');
      expect(html).not.toContain('Đang bị Tạm Giam');
    });

    it('renders companion pets across all pet catalog items for human players', () => {
      const humanPlayer = createMockPlayer('human1', 'Human', '#10b981', '⛵', false, false);

      const petTestCases: Array<{ petId: string; expectedEmoji: string }> = [
        { petId: 'pet-shiba', expectedEmoji: '🐕' },
        { petId: 'pet-otter', expectedEmoji: '🦦' },
        { petId: 'pet-drone', expectedEmoji: '🛸' },
        { petId: 'pet-phoenix', expectedEmoji: '🔥' },
      ];

      petTestCases.forEach(({ petId, expectedEmoji }) => {
        const html = renderToStaticMarkup(
          React.createElement(VolumetricPlayerToken, {
            player: humanPlayer,
            isPlayerActive: false,
            equippedPetId: petId,
            placement: basePlacement,
            isIsometric: true,
          })
        );

        assertZeroNaNOrUndefined(html, `Pet ${petId}`);
        expect(html).toContain(expectedEmoji);
        expect(html).toContain('Thú cưng đồng hành:');
        expect(html).toContain('translateZ(10px)'); // Satellite orbit elevation
      });
    });

    it('suppresses companion pet for AI players or when equippedPetId is pet-none / null', () => {
      const aiPlayer = createMockPlayer('ai1', 'AI Bot', '#f59e0b', '🤖', false, true);
      const htmlAI = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: aiPlayer,
          isPlayerActive: false,
          equippedPetId: 'pet-shiba', // Even if passed, AI shouldn't get pet
          placement: basePlacement,
          isIsometric: true,
        })
      );
      expect(htmlAI).not.toContain('Thú cưng đồng hành:');

      const humanPlayer = createMockPlayer('human2', 'Human', '#10b981', '⛵', false, false);
      const htmlNone = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: humanPlayer,
          isPlayerActive: false,
          equippedPetId: 'pet-none',
          placement: basePlacement,
          isIsometric: true,
        })
      );
      expect(htmlNone).not.toContain('Thú cưng đồng hành:');

      const htmlNull = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: humanPlayer,
          isPlayerActive: false,
          equippedPetId: null,
          placement: basePlacement,
          isIsometric: true,
        })
      );
      expect(htmlNull).not.toContain('Thú cưng đồng hành:');
    });

    it('renders active levitating aura with cyan pulse for active player', () => {
      const activePlayer = createMockPlayer('act1', 'Active', '#8b5cf6', '👑');
      const html = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: activePlayer,
          isPlayerActive: true,
          placement: { ...basePlacement, elevationZ: 20 },
          isIsometric: true,
        })
      );

      assertZeroNaNOrUndefined(html, 'Active player token');
      expect(html).toContain('border-cyan-300/80');
      expect(html).toContain('animate-pulse-subtle');
      expect(html).toContain('translateZ(10px)'); // Aura ring elevation
      expect(html).toContain('ring-cyan-300'); // Top face highlight
    });
  });

  // =========================================================================
  // 4. COSMETIC DICE SKINS & VOLUMETRIC 3D CUBE DICE
  // =========================================================================
  describe('4. VolumetricDice3D: Skins, Geometry & Pip Layouts', () => {
    const catalogSkins = [
      'dice-cyber-gold',
      'dice-obsidian-void',
      'dice-starlight',
      'dice-flame-ruby',
      'dice-neon-cyan',
      'default-skin-fallback',
    ];

    it('renders all catalog dice skins with proper palette classes and zero NaN', () => {
      catalogSkins.forEach((skinId) => {
        const palette = getDiceSkinPalette(skinId === 'default-skin-fallback' ? undefined : skinId);
        expect(palette.faceBg).toBeDefined();
        expect(palette.border).toBeDefined();
        expect(palette.pipColor).toBeDefined();
        expect(palette.pipCenter).toBeDefined();

        const html = renderToStaticMarkup(
          React.createElement(VolumetricDice3D, {
            dice: [2, 5],
            isRolling: false,
            isDouble: false,
            diceSkinId: skinId,
          })
        );

        assertZeroNaNOrUndefined(html, `Dice skin ${skinId}`);
        expect(html).toContain('preserve-3d');
        expect(html).toContain('Tổng: <strong class="text-white font-extrabold">7</strong> điểm');
      });
    });

    it('strictly satisfies opposite faces sum to 7 for all 36 dice outcome combinations', () => {
      for (let d1 = 1; d1 <= 6; d1++) {
        for (let d2 = 1; d2 <= 6; d2++) {
          const isDouble = d1 === d2;
          const html = renderToStaticMarkup(
            React.createElement(VolumetricDice3D, {
              dice: [d1, d2],
              isRolling: false,
              isDouble,
              diceSkinId: 'dice-neon-cyan',
            })
          );

          assertZeroNaNOrUndefined(html, `Dice [${d1}, ${d2}]`);
          const sum = d1 + d2;
          expect(html).toContain(`Tổng: <strong class="text-white font-extrabold">${sum}</strong> điểm`);

          if (isDouble) {
            expect(html).toContain('ĐÔI! LẮC THÊM LƯỢT');
            expect(html).toContain('ring-amber-400');
          } else {
            expect(html).not.toContain('ĐÔI! LẮC THÊM LƯỢT');
          }
        }
      }
    });

    it('verifies mathematical opposite pairs and normal rotations for all 6 faces', () => {
      // 1 <-> 6
      expect(OPPOSITE_FACES[1]).toBe(6);
      expect(OPPOSITE_FACES[6]).toBe(1);
      // 2 <-> 5
      expect(OPPOSITE_FACES[2]).toBe(5);
      expect(OPPOSITE_FACES[5]).toBe(2);
      // 3 <-> 4
      expect(OPPOSITE_FACES[3]).toBe(4);
      expect(OPPOSITE_FACES[4]).toBe(3);

      for (let f = 1; f <= 6; f++) {
        expect(f + OPPOSITE_FACES[f]).toBe(7);
        const rot = getFaceRotation(f);
        expect(Number.isFinite(rot.rotX)).toBe(true);
        expect(Number.isFinite(rot.rotY)).toBe(true);
      }
    });

    it('clamps out-of-range dice values gracefully in getFaceRotation', () => {
      expect(getFaceRotation(0)).toEqual(DICE_FACE_ORIENTATIONS[1]);
      expect(getFaceRotation(-10)).toEqual(DICE_FACE_ORIENTATIONS[1]);
      expect(getFaceRotation(10)).toEqual(DICE_FACE_ORIENTATIONS[6]);
      expect(getFaceRotation(3.2)).toEqual(DICE_FACE_ORIENTATIONS[3]);
    });
  });

  // =========================================================================
  // 5. DETERMINISTIC TOKEN STACKING STRESS & ADVERSARIAL MULTI-PLAYER SCENARIOS
  // =========================================================================
  describe('5. tokenStackingEngine: Multi-Player Formations & Bounds', () => {
    const p1 = createMockPlayer('p1', 'P1', '#ef4444', '🚗');
    const p2 = createMockPlayer('p2', 'P2', '#3b82f6', '🚀');
    const p3 = createMockPlayer('p3', 'P3', '#10b981', '⛵');
    const p4 = createMockPlayer('p4', 'P4', '#f59e0b', '🎩');

    it('maintains non-overlapping pairwise distance across all player count variations 1..4', () => {
      // 2P
      const p2Placements = computeTokenPlacements([p1, p2]);
      const dist2P = Math.hypot(
        p2Placements['p1'].xPercent - p2Placements['p2'].xPercent,
        p2Placements['p1'].yPercent - p2Placements['p2'].yPercent
      );
      expect(dist2P).toBeGreaterThanOrEqual(25);

      // 3P
      const p3Placements = computeTokenPlacements([p1, p2, p3]);
      const pts3P = [p3Placements['p1'], p3Placements['p2'], p3Placements['p3']];
      for (let i = 0; i < pts3P.length; i++) {
        for (let j = i + 1; j < pts3P.length; j++) {
          const d = Math.hypot(pts3P[i].xPercent - pts3P[j].xPercent, pts3P[i].yPercent - pts3P[j].yPercent);
          expect(d).toBeGreaterThanOrEqual(20);
        }
      }

      // 4P
      const p4Placements = computeTokenPlacements([p1, p2, p3, p4]);
      const pts4P = [p4Placements['p1'], p4Placements['p2'], p4Placements['p3'], p4Placements['p4']];
      for (let i = 0; i < pts4P.length; i++) {
        for (let j = i + 1; j < pts4P.length; j++) {
          const d = Math.hypot(pts4P[i].xPercent - pts4P[j].xPercent, pts4P[i].yPercent - pts4P[j].yPercent);
          expect(d).toBeGreaterThanOrEqual(20);
        }
      }
    });

    it('enforces strict boundary clamp [5%, 95%] under high occupancy', () => {
      const extraPlayers = Array.from({ length: 10 }, (_, i) =>
        createMockPlayer(`ext_${i}`, `Bot ${i}`, '#999999', '♟️')
      );
      const placements = computeTokenPlacements(extraPlayers);

      Object.values(placements).forEach((pl) => {
        expect(pl.xPercent).toBeGreaterThanOrEqual(5);
        expect(pl.xPercent).toBeLessThanOrEqual(95);
        expect(pl.yPercent).toBeGreaterThanOrEqual(5);
        expect(pl.yPercent).toBeLessThanOrEqual(95);
        expect(pl.scale).toBeGreaterThanOrEqual(0.72);
        expect(pl.scale).toBeLessThanOrEqual(1.0);
      });
    });

    it('ensures active player receives foremost depth and +6px elevation boost', () => {
      // 3P match with p2 active
      const placements = computeTokenPlacements([p1, p2, p3], 'p2', true);
      expect(placements['p2'].isForefront).toBe(true);
      expect(placements['p2'].depthIndex).toBe(3);
      expect(placements['p2'].elevationZ).toBe(18 + 6); // 24px

      const zActive = getTokenZIndex(placements['p2'].depthIndex, true);
      const zInactive = getTokenZIndex(placements['p1'].depthIndex, false);
      expect(zActive).toBeGreaterThan(zInactive);
    });
  });
});
