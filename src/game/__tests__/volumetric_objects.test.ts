import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  computeTokenPlacements,
  getTokenZIndex,
  TokenPlacement,
} from '../../components/board/tokenStackingEngine';
import {
  OPPOSITE_FACES,
  DICE_FACE_ORIENTATIONS,
  getFaceRotation,
  getDiceSkinPalette,
  VolumetricDice3D,
} from '../../components/dice/VolumetricDice3D';
import {
  VolumetricBuilding,
} from '../../components/board/VolumetricBuilding';
import {
  VolumetricPlayerToken,
} from '../../components/board/VolumetricPlayerToken';
import {
  calculateFitBoardSize,
  DEFAULT_CAMERA,
} from '../../components/board/spatialMath';
import { TileComponent } from '../../components/board/TileComponent';
import { BoardTile, PlayerState, PropertyOwnership } from '../types';

describe('2.5D Volumetric Objects & Stacking Engine (volumetric_objects.test.ts)', () => {
  // Helper to create mock player states
  const createMockPlayer = (id: string, name: string, colorHex: string, symbol: string): PlayerState => ({
    id,
    name,
    token: { id: `token-${id}`, name, colorHex, symbol },
    cash: 1500,
    position: 0,
    inDetention: false,
    detentionTurns: 0,
    isBankrupt: false,
    consecutiveDoubles: 0,
    stats: {
      rentPaid: 0,
      rentCollected: 0,
      chaosTriggered: 0,
      tilesTraveled: 0,
      propertiesOwned: 0,
    },
  });

  const p1 = createMockPlayer('p1', 'Player 1', '#ef4444', '🚗');
  const p2 = createMockPlayer('p2', 'Player 2', '#3b82f6', '🚀');
  const p3 = createMockPlayer('p3', 'Player 3', '#10b981', '⛵');
  const p4 = createMockPlayer('p4', 'Player 4', '#f59e0b', '🎩');

  // =========================================================================
  // 1. TOKEN STACKING & COLLISION AVOIDANCE ENGINE
  // =========================================================================
  describe('1. Token Stacking Engine (computeTokenPlacements)', () => {
    it('returns empty dictionary for 0 players', () => {
      const placements = computeTokenPlacements([]);
      expect(placements).toEqual({});
    });

    it('places 1 player at center zone with 1.0 scale and base elevation', () => {
      const placements = computeTokenPlacements([p1]);
      const placement = placements['p1'];

      expect(placement).toBeDefined();
      expect(placement.xPercent).toBe(50);
      expect(placement.yPercent).toBe(58);
      expect(placement.scale).toBe(1.0);
      expect(placement.elevationZ).toBe(14);
      expect(placement.depthIndex).toBe(1);
      expect(placement.isForefront).toBe(true);
    });

    it('elevates 1 player by +6px when designated as active player', () => {
      const placements = computeTokenPlacements([p1], 'p1', true);
      const placement = placements['p1'];

      expect(placement.elevationZ).toBe(20); // 14 + 6
      expect(placement.isForefront).toBe(true);
    });

    it('places 2 players along a 45° isometric diagonal split without overlap', () => {
      const placements = computeTokenPlacements([p1, p2]);
      const place1 = placements['p1'];
      const place2 = placements['p2'];

      expect(place1).toBeDefined();
      expect(place2).toBeDefined();

      // Ensure distinct coordinates
      expect(place1.xPercent).not.toBe(place2.xPercent);
      expect(place1.yPercent).not.toBe(place2.yPercent);

      // Distance in % coordinate space must be >= 20%
      const dist = Math.hypot(place1.xPercent - place2.xPercent, place1.yPercent - place2.yPercent);
      expect(dist).toBeGreaterThanOrEqual(20);

      // Scale should be 0.88 for 2P
      expect(place1.scale).toBe(0.88);
      expect(place2.scale).toBe(0.88);

      // Depth indices must be sorted
      expect(place1.depthIndex).toBeGreaterThan(place2.depthIndex);
    });

    it('prioritizes active player to forefront slot (SW / depthIndex 2) in 2P match', () => {
      // p2 is active player
      const placements = computeTokenPlacements([p1, p2], 'p2', true);
      const place1 = placements['p1'];
      const place2 = placements['p2'];

      // Active player p2 must occupy foremost slot (depthIndex 2, isForefront: true)
      expect(place2.depthIndex).toBe(2);
      expect(place2.isForefront).toBe(true);
      expect(place2.elevationZ).toBe(22); // 16 + 6

      // Inactive player p1 is pushed to background
      expect(place1.depthIndex).toBe(1);
      expect(place1.isForefront).toBe(false);
      expect(place1.elevationZ).toBe(12);
    });

    it('places 3 players in a delta formation with apex and wings', () => {
      const placements = computeTokenPlacements([p1, p2, p3], 'p1');
      const coords = [placements['p1'], placements['p2'], placements['p3']];

      // All 3 players must have valid placements
      coords.forEach((c) => {
        expect(c).toBeDefined();
        expect(c.scale).toBe(0.80);
        expect(c.xPercent).toBeGreaterThanOrEqual(5);
        expect(c.xPercent).toBeLessThanOrEqual(95);
        expect(c.yPercent).toBeGreaterThanOrEqual(5);
        expect(c.yPercent).toBeLessThanOrEqual(95);
      });

      // Pairwise distances must ensure non-overlap
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          const d = Math.hypot(
            coords[i].xPercent - coords[j].xPercent,
            coords[i].yPercent - coords[j].yPercent
          );
          expect(d).toBeGreaterThanOrEqual(20);
        }
      }

      // Active player p1 receives apex (highest depthIndex 3)
      expect(placements['p1'].depthIndex).toBe(3);
      expect(placements['p1'].isForefront).toBe(true);
    });

    it('places 4 players in an isometric diamond formation (South, East, West, North)', () => {
      const placements = computeTokenPlacements([p1, p2, p3, p4], 'p3');
      const p3Place = placements['p3']; // Active player

      expect(p3Place.depthIndex).toBe(4);
      expect(p3Place.isForefront).toBe(true);
      expect(p3Place.yPercent).toBe(74); // South apex (closest to camera)

      // All 4 players scale to 0.72
      [p1, p2, p3, p4].forEach((p) => {
        expect(placements[p.id].scale).toBe(0.72);
        expect(placements[p.id].xPercent).toBeGreaterThanOrEqual(5);
        expect(placements[p.id].xPercent).toBeLessThanOrEqual(95);
        expect(placements[p.id].yPercent).toBeGreaterThanOrEqual(5);
        expect(placements[p.id].yPercent).toBeLessThanOrEqual(95);
      });
    });

    it('sets elevation to 0px when isIsometric is false (2D flat mode)', () => {
      const placements = computeTokenPlacements([p1, p2], 'p1', false);
      expect(placements['p1'].elevationZ).toBe(0);
      expect(placements['p2'].elevationZ).toBe(0);
    });

    it('calculates deterministic CSS zIndex with active player priority', () => {
      // Inactive player depthIndex 1 -> 20 + 1 * 5 + 0 = 25
      expect(getTokenZIndex(1, false)).toBe(25);
      // Inactive player depthIndex 4 -> 20 + 4 * 5 + 0 = 40
      expect(getTokenZIndex(4, false)).toBe(40);
      // Active player depthIndex 4 -> 20 + 4 * 5 + 50 = 90
      expect(getTokenZIndex(4, true)).toBe(90);
      // Active player always beats any inactive player
      expect(getTokenZIndex(1, true)).toBeGreaterThan(getTokenZIndex(4, false));
    });

    it('handles fallback gracefully when N > 4 players are present', () => {
      const p5 = createMockPlayer('p5', 'Player 5', '#9333ea', '💎');
      const p6 = createMockPlayer('p6', 'Player 6', '#06b6d4', '⚡');
      const placements = computeTokenPlacements([p1, p2, p3, p4, p5, p6]);

      expect(Object.keys(placements)).toHaveLength(6);
      Object.values(placements).forEach((pl) => {
        expect(pl.xPercent).toBeGreaterThanOrEqual(5);
        expect(pl.xPercent).toBeLessThanOrEqual(95);
        expect(pl.yPercent).toBeGreaterThanOrEqual(5);
        expect(pl.yPercent).toBeLessThanOrEqual(95);
        expect(pl.scale).toBeLessThanOrEqual(1.0);
        expect(pl.scale).toBeGreaterThanOrEqual(0.72);
      });
    });
  });

  // =========================================================================
  // 2. 6-FACED 3D CUBE DICE & OPPOSITE-FACE 7 SUM MATHEMATICS
  // =========================================================================
  describe('2. Volumetric 3D Dice Geometry & Opposite-Face 7 Sum', () => {
    it('strictly enforces opposite faces sum to 7 for all 6 faces', () => {
      for (let face = 1; face <= 6; face++) {
        const opposite = OPPOSITE_FACES[face];
        expect(opposite).toBeDefined();
        expect(face + opposite).toBe(7);
        // Reciprocal symmetry: OPPOSITE[OPPOSITE[f]] === f
        expect(OPPOSITE_FACES[opposite]).toBe(face);
      }
    });

    it('defines exact Euler rotation angles for all 6 faces', () => {
      for (let face = 1; face <= 6; face++) {
        const rot = DICE_FACE_ORIENTATIONS[face];
        expect(rot).toBeDefined();
        expect(Number.isFinite(rot.rotX)).toBe(true);
        expect(Number.isFinite(rot.rotY)).toBe(true);
      }

      // Check key face normals
      expect(getFaceRotation(1)).toEqual({ rotX: 0, rotY: 0 });     // Front
      expect(getFaceRotation(6)).toEqual({ rotX: 0, rotY: 180 });   // Back
      expect(getFaceRotation(2)).toEqual({ rotX: -90, rotY: 0 });   // Top
      expect(getFaceRotation(5)).toEqual({ rotX: 90, rotY: 0 });    // Bottom
      expect(getFaceRotation(3)).toEqual({ rotX: 0, rotY: -90 });   // Right
      expect(getFaceRotation(4)).toEqual({ rotX: 0, rotY: 90 });    // Left
    });

    it('returns valid cosmetic skin palettes across all catalog skins', () => {
      const skins = [
        'dice-cyber-gold',
        'dice-obsidian-void',
        'dice-starlight',
        'dice-flame-ruby',
        'dice-neon-cyan',
        undefined, // default
      ];

      skins.forEach((skinId) => {
        const palette = getDiceSkinPalette(skinId);
        expect(palette.faceBg).toBeDefined();
        expect(palette.border).toBeDefined();
        expect(palette.pipColor).toBeDefined();
        expect(palette.pipCenter).toBeDefined();
        expect(palette.shadow).toBeDefined();
      });
    });

    it('renders VolumetricDice3D HTML with 3D preserve-3d structure and both dice', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricDice3D, {
          dice: [3, 4],
          isRolling: false,
          isDouble: false,
          diceSkinId: 'dice-neon-cyan',
        })
      );

      expect(html).toContain('volumetric-dice-3d');
      expect(html).toContain('preserve-3d');
      expect(html).toContain('Tổng:');
      expect(html).toContain('7'); // 3 + 4 = 7
    });

    it('renders celebration aura and badge when dice is double', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricDice3D, {
          dice: [5, 5],
          isRolling: false,
          isDouble: true,
          diceSkinId: 'dice-cyber-gold',
        })
      );

      expect(html).toContain('ĐÔI! LẮC THÊM LƯỢT');
      expect(html).toContain('ring-amber-400');
    });
  });

  // =========================================================================
  // 3. VOLUMETRIC BUILDINGS & ARCHITECTURAL TIERS ACROSS WORLD THEMES
  // =========================================================================
  describe('3. Volumetric Buildings Across Tiers & World Themes', () => {
    it('returns null for non-property tiles or level <= 0', () => {
      const nonProp = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 3,
          districtColor: 'district-transport',
          tileType: 'TRANSPORT',
        })
      );
      expect(nonProp).toBe('');

      const levelZero = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 0,
          districtColor: 'district-red',
          tileType: 'PROPERTY',
        })
      );
      expect(levelZero).toBe('');
    });

    it('renders Level 1 Shophouse with pitched roof gable', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 1,
          districtColor: 'district-red',
          districtHex: '#ef4444',
          worldId: 'modern-metropolis',
          tileType: 'PROPERTY',
          isIsometric: true,
        })
      );

      expect(html).toContain('volumetric-building-tier-1');
      expect(html).toContain('polygon(50% 0%, 100% 100%, 0% 100%)'); // Gable roof
      expect(html).toContain('translateZ(10px)');
    });

    it('renders Level 2 Duplex with twin linked buildings', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 2,
          districtColor: 'district-blue',
          districtHex: '#3b82f6',
          worldId: 'modern-metropolis',
          tileType: 'PROPERTY',
          isIsometric: true,
        })
      );

      expect(html).toContain('volumetric-building-tier-2');
      expect(html).toContain('translateZ(14px)');
    });

    it('renders Level 3 Mid-Rise Apartments with HVAC and window grid', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 3,
          districtColor: 'district-yellow',
          districtHex: '#eab308',
          worldId: 'cyberpunk-city',
          tileType: 'PROPERTY',
          isIsometric: true,
        })
      );

      expect(html).toContain('volumetric-building-tier-3');
      expect(html).toContain('translateZ(20px)');
      expect(html).toContain('grid-cols-2');
    });

    it('renders Level 4 Corporate Tower with rooftop helipad ("H")', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 4,
          districtColor: 'district-green',
          districtHex: '#10b981',
          worldId: 'modern-metropolis',
          tileType: 'PROPERTY',
          isIsometric: true,
        })
      );

      expect(html).toContain('volumetric-building-tier-4');
      expect(html).toContain('translateZ(28px)');
      expect(html).toContain('>H<'); // Helipad 'H' mark
    });

    it('renders Level 5 Super Landmark with iconic spire and crown beacon', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 5,
          districtColor: 'district-darkblue',
          districtHex: '#1d4ed8',
          worldId: 'modern-metropolis',
          tileType: 'PROPERTY',
          isIsometric: true,
        })
      );

      expect(html).toContain('volumetric-building-tier-5');
      expect(html).toContain('translateZ(38px)');
      expect(html).toContain('👑'); // Crown beacon
      expect(html).toContain('Siêu Landmark Cấp 5');
    });

    it('applies world-specific theme styling for all 4 worlds', () => {
      const worlds = ['modern-metropolis', 'cyberpunk-city', 'mekong-delta', 'space-colony'];

      worlds.forEach((w) => {
        const html = renderToStaticMarkup(
          React.createElement(VolumetricBuilding, {
            level: 3,
            districtColor: 'district-pink',
            worldId: w,
            tileType: 'PROPERTY',
          })
        );
        expect(html).toContain('volumetric-building-tier-3');
      });
    });

    it('renders holographic caution barrier and grayscale filter when mortgaged', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricBuilding, {
          level: 4,
          districtColor: 'district-red',
          districtHex: '#ef4444',
          isMortgaged: true,
          tileType: 'PROPERTY',
        })
      );

      expect(html).toContain('grayscale-[0.85]');
      expect(html).toContain('🚧'); // Caution barrier
    });
  });

  // =========================================================================
  // 4. VOLUMETRIC PLAYER TOKEN RENDERING
  // =========================================================================
  describe('4. Volumetric Player Token Component', () => {
    const placement: TokenPlacement = {
      xPercent: 50,
      yPercent: 58,
      elevationZ: 14,
      scale: 1.0,
      depthIndex: 2,
      isForefront: true,
    };

    it('renders 3D cylinder pedestal with ground shadow and player symbol', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: p1,
          isPlayerActive: false,
          placement: placement,
          isIsometric: true,
        })
      );

      expect(html).toContain('volumetric-token-p1');
      expect(html).toContain('preserve-3d');
      expect(html).toContain('translateZ(14px)');
      expect(html).toContain('🚗'); // Player 1 symbol
    });

    it('renders active levitating energy ring when player is active', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: p1,
          isPlayerActive: true,
          placement: { ...placement, elevationZ: 20 },
          isIsometric: true,
        })
      );

      expect(html).toContain('ring-cyan-300');
      expect(html).toContain('translateZ(10px)'); // Energy ring elevation
    });

    it('renders 3D detention cage overlay when player is in detention', () => {
      const detainedPlayer = { ...p1, inDetention: true, detentionTurns: 2 };
      const html = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: detainedPlayer,
          isPlayerActive: false,
          placement: placement,
          isIsometric: true,
        })
      );

      expect(html).toContain('🔒'); // Detention lock
      expect(html).toContain('Đang bị Tạm Giam');
    });

    it('renders companion pet satellite when pet is equipped', () => {
      const html = renderToStaticMarkup(
        React.createElement(VolumetricPlayerToken, {
          player: p1,
          isPlayerActive: false,
          equippedPetId: 'pet-shiba',
          placement: placement,
          isIsometric: true,
        })
      );

      expect(html).toContain('🐕'); // Dog emoji
      expect(html).toContain('Thú cưng đồng hành:');
    });
  });

  // =========================================================================
  // 5. REVIEWER 2 ARCHITECTURAL FINDINGS VERIFICATION
  // =========================================================================
  describe('5. Reviewer 2 Architectural Findings & Tile Integration', () => {
    it('Reviewer 2 Finding 2: prevents diamond vertex clipping on 320px mobile screens', () => {
      const boardSize320 = calculateFitBoardSize(320, 568, DEFAULT_CAMERA);
      const diamondBoundingWidth = boardSize320 * Math.SQRT2;

      // Diamond width must strictly fit within 320px container (zero vertex clipping)
      expect(diamondBoundingWidth).toBeLessThanOrEqual(320);
      expect(boardSize320).toBeGreaterThanOrEqual(180);
      expect(boardSize320).toBeLessThanOrEqual(240);
    });

    it('Reviewer 2 Finding 1: mortgaged tile removes opacity-85 from root to preserve CSS 3D context', () => {
      const mockTile: BoardTile = {
        id: 1,
        name: 'Phố Cổ Hà Nội',
        shortName: 'Phố Cổ',
        type: 'PROPERTY',
        description: 'Bất động sản vàng',
        iconName: 'Building',
        property: {
          basePrice: 60,
          baseRent: 10,
          houseRent: [20, 40, 80, 160, 320],
          upgradeCost: 50,
          maxLevel: 5,
          district: 'Hà Nội Cổ',
          districtColor: 'district-brown',
          mortgageValue: 30,
        },
      };

      const mortgagedOwnership: PropertyOwnership = {
        ownerId: 'p1',
        level: 3,
        isMortgaged: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(TileComponent, {
          tile: mockTile,
          ownership: mortgagedOwnership,
          ownerPlayer: p1,
          playersHere: [p1],
          activePlayerId: 'p1',
          onSelect: () => {},
          is3DView: true,
        })
      );

      // Root element must NOT contain opacity-85 (which would flatten 3D context)
      expect(html).not.toContain('opacity-85');
      // Must maintain preserve-3d
      expect(html).toContain('preserve-3d');
      // Must embed VolumetricBuilding tier 3
      expect(html).toContain('volumetric-building-tier-3');
      // Must embed VolumetricPlayerToken for p1
      expect(html).toContain('volumetric-token-p1');
    });
  });
});
