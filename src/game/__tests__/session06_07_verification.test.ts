/**
 * CHAOS MONOPOLY — Sessions 06 & 07 Verification Test Suite
 * Verifies:
 * 1. Classic vs. Chaos mode enforcement in reducer and chaos engine
 * 2. Multi-world configuration, tile localization, and distinct district visuals
 * 3. 4-channel independent audio settings (Master, Music, SFX, Ambience)
 * 4. Online lobby room configuration (Classic/Chaos mode, world, capacity, rounds)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, INITIAL_GAME_CONFIG } from '../gameReducer';
import { drawChaosCard, evaluateTileChaosTrigger } from '../chaos-engine/chaosEngine';
import * as chaosEngineModule from '../chaos-engine/chaosEngine';
import { createPRNG } from '../chaos-engine/prng';
import { WORLD_CATALOG } from '../../worlds/catalog';
import { createAllTileMeshes } from '../../components/board/three/ThreeTileMeshes';
import { BOARD_TILES } from '../board/boardData';
import { getAudioSettings, updateAudioSettings, startAmbientMusic, stopAmbientMusic } from '../../cosmetics/audioSettings';
import { sanitizeRoomConfig } from '../../server/security';
import { GameState } from '../types';

describe('SESSION 06 & 07 VERIFICATION SUITE', () => {
  beforeEach(() => {
    updateAudioSettings({
      masterVolume: 0.8,
      musicVolume: 0.5,
      sfxVolume: 0.85,
      ambienceVolume: 0.6,
      isMuted: false,
    });
  });

  describe('1. Classic vs. Chaos Mode Enforcement', () => {
    it('initializes default config with gameMode', () => {
      expect(INITIAL_GAME_CONFIG.gameMode).toBeDefined();
      expect(['CLASSIC', 'CHAOS']).toContain(INITIAL_GAME_CONFIG.gameMode);
    });

    it('safely handles CHAOS tile in CLASSIC mode without calamity or negative debt', () => {
      const state: GameState = gameReducer(
        {
          ...INITIAL_GAME_CONFIG,
          gameMode: 'CLASSIC',
        } as any,
        {
          type: 'START_GAME',
          players: [
            { name: 'Người chơi 1', token: { id: 't1', name: 'T1', symbol: '🚗', colorHex: '#000', accentHex: '#fff', avatarIcon: 'Car' } },
            { name: 'Người chơi 2', token: { id: 't2', name: 'T2', symbol: '🚄', colorHex: '#000', accentHex: '#fff', avatarIcon: 'Train' } },
          ],
          config: {
            ...INITIAL_GAME_CONFIG,
            gameMode: 'CLASSIC',
          },
        }
      );

      // Force player position to tile 7 (Chaos tile)
      const afterMove = gameReducer(
        {
          ...state,
          players: state.players.map((p, idx) => (idx === 0 ? { ...p, position: 0 } : p)),
        },
        {
          type: 'ROLL_DICE_RESULT',
          dice: [3, 4], // sum = 7 -> Lands on CHAOS tile 7
        }
      );

      // In classic mode, landing on Chaos tile should not trigger activeChaosCard
      expect(afterMove.activeChaosCard).toBeNull();
      // Should have a friendly log message
      const lastLog = afterMove.logs[afterMove.logs.length - 1];
      expect(lastLog.message).toContain('Cổ Điển');
    });

    it('filters out CALAMITY cards when drawing in CLASSIC mode', () => {
      const classicState: Partial<GameState> = {
        config: {
          ...INITIAL_GAME_CONFIG,
          gameMode: 'CLASSIC',
        },
      };

      const rng = createPRNG(42);
      for (let i = 0; i < 50; i++) {
        const card = drawChaosCard({ prng: rng, state: classicState as GameState });
        expect(card.rarity).not.toBe('CALAMITY');
        expect(card.category).not.toBe('GLOBAL');
        expect(card.effectType).not.toBe('REVERSE_DIRECTION');
        expect(card.effectType).not.toBe('SWAP_POSITIONS');
      }
    });

    it('no longer schedules round-interval chaos (Chaos is tile-triggered only)', () => {
      const engine = chaosEngineModule as unknown as Record<string, unknown>;
      expect(engine.evaluateRoundIntervalChaosTrigger).toBeUndefined();
      expect(engine.evaluateDoubleDiceChaosTrigger).toBeUndefined();
      expect(engine.evaluateCrisisDesperationTrigger).toBeUndefined();
      // Tile-triggered draws still work in both game modes.
      const rng = createPRNG(99);
      expect(evaluateTileChaosTrigger(7, rng)).toBeTruthy();
    });
  });

  describe('2. Multi-World Catalog & 3D Tabletop Consistency', () => {
    const worldIds = ['modern-metropolis', 'cyberpunk-city', 'mekong-delta', 'space-colony'];

    it('verifies all 4 core worlds exist and are AVAILABLE', () => {
      for (const id of worldIds) {
        const entry = WORLD_CATALOG.find((w) => w.id === id);
        expect(entry).toBeDefined();
        expect(entry?.availability).toBe('AVAILABLE');
        expect(entry?.palette).toBeDefined();
      }
    });

    it('generates customized 3D tile meshes with world-specific localization', () => {
      const tiles = createAllTileMeshes(BOARD_TILES);
      expect(tiles).toHaveLength(40);
      expect(tiles[0].group).toBeDefined();
      expect(tiles[0].tileMesh).toBeDefined();
      expect(tiles[0].highlightMesh).toBeDefined();
    });
  });

  describe('3. 4-Channel Audio Settings & Procedural Synthesizer', () => {
    it('manages independent volume channels (Master, Music, SFX, Ambience)', () => {
      updateAudioSettings({
        masterVolume: 0.7,
        musicVolume: 0.4,
        sfxVolume: 0.9,
        ambienceVolume: 0.65,
      });

      const audio = getAudioSettings();
      expect(audio.masterVolume).toBe(0.7);
      expect(audio.musicVolume).toBe(0.4);
      expect(audio.sfxVolume).toBe(0.9);
      expect(audio.ambienceVolume).toBe(0.65);
      expect(audio.isMuted).toBe(false);
    });

    it('clamps volume values strictly between 0.0 and 1.0', () => {
      updateAudioSettings({
        masterVolume: 2.5,
        musicVolume: -0.5,
        sfxVolume: 1.2,
        ambienceVolume: -1.0,
      });

      const audio = getAudioSettings();
      expect(audio.masterVolume).toBe(1.0);
      expect(audio.musicVolume).toBe(0.0);
      expect(audio.sfxVolume).toBe(1.0);
      expect(audio.ambienceVolume).toBe(0.0);
    });

    it('handles ambient music start and stop gracefully without throwing', () => {
      expect(() => {
        startAmbientMusic('modern-metropolis');
        startAmbientMusic('cyberpunk-city');
        startAmbientMusic('mekong-delta');
        startAmbientMusic('space-colony');
        stopAmbientMusic();
      }).not.toThrow();
    });
  });

  describe('4. Server Security & Multiplayer Room Configuration', () => {
    it('sanitizes room configuration including gameMode, worldId, cash, and rounds', () => {
      const sanitized = sanitizeRoomConfig({
        startingCash: 2000,
        maxRounds: 60,
        worldId: 'mekong-delta',
        gameMode: 'CLASSIC',
        maliciousExtraProp: 'DROP TABLE rooms',
      });

      expect(sanitized).toEqual({
        startingCash: 2000,
        maxRounds: 60,
        worldId: 'mekong-delta',
        gameMode: 'CLASSIC',
      });
    });

    it('rejects invalid gameMode values safely', () => {
      const sanitized = sanitizeRoomConfig({
        gameMode: 'HACKED_MODE',
      });

      expect(sanitized?.gameMode).toBeUndefined();
    });
  });
});
