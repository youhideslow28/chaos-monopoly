import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import {
  WORLD_CATALOG,
  getCatalogEntry,
  isWorldSelectable,
  resolveWorldId,
} from '../../worlds/catalog';
import {
  DEFAULT_WORLD_ID,
  WORLD_SCHEMA_VERSION,
  WorldId,
} from '../../worlds/types';
import {
  WORLD_EVENTS,
  getWorldEvents,
  pickWorldEventCard,
  worldEventToChaosCard,
} from '../../worlds/worldEvents';
import {
  EVENT_BOUNDS,
  validateAllEventData,
  validateCatalog,
  validateCatalogEntry,
  validateEvents,
  validateWorld,
} from '../../worlds/validate';
import {
  loadWorldConfig,
  __overrideWorldLoader,
} from '../../worlds/registry';
import {
  displayTileName,
  setActiveWorldNames,
} from '../../worlds/runtime';
import { getLocale, setLocale, WORLD_UI } from '../../worlds/i18n';
import { OWNABLE_TILE_IDS } from '../../worlds/packs/shared';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { BOARD_TILES, DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { verifyLedgerAudit } from '../economy/ledgerEngine';
import { SeededPRNG } from '../chaos-engine/prng';
import { computeNextAIDecision, getActiveAIActor } from '../ai/aiDecisionEngine';
import { rollTwoDice } from '../dice/diceEngine';
import { ChaosMultiplayerServer } from '../../server/multiplayerServer';
import {
  ClientToServerMessage,
  PROTOCOL_VERSION,
  ServerToClientMessage,
} from '../../multiplayer/protocol';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Helper for WebSocket multiplayer tests
interface TestWsClient {
  ws: WebSocket;
  messages: ServerToClientMessage[];
  send: (msg: ClientToServerMessage) => void;
  waitFor: <T extends ServerToClientMessage['type']>(
    type: T,
    predicate?: (msg: Extract<ServerToClientMessage, { type: T }>) => boolean,
    timeoutMs?: number
  ) => Promise<Extract<ServerToClientMessage, { type: T }>>;
  close: () => Promise<void>;
}

async function createTestWsClient(port: number): Promise<TestWsClient> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const messages: ServerToClientMessage[] = [];
  const waiters: Array<{
    type: string;
    predicate?: (msg: any) => boolean;
    resolve: (msg: any) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  ws.on('message', raw => {
    const parsed = JSON.parse(raw.toString()) as ServerToClientMessage;
    messages.push(parsed);
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if (parsed.type === w.type && (!w.predicate || w.predicate(parsed))) {
        clearTimeout(w.timer);
        waiters.splice(i, 1);
        w.resolve(parsed);
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', err => reject(err));
  });

  return {
    ws,
    messages,
    send: msg => ws.send(JSON.stringify(msg)),
    waitFor: (type, predicate, timeoutMs = 4000) => {
      const existingIdx = messages.findIndex(
        m => m.type === type && (!predicate || predicate(m as any))
      );
      if (existingIdx !== -1) {
        const [found] = messages.splice(existingIdx, 1);
        return Promise.resolve(found as any);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timed out waiting for ${type}`));
        }, timeoutMs);
        waiters.push({ type, predicate, resolve, reject, timer });
      });
    },
    close: () =>
      new Promise(resolve => {
        if (ws.readyState === WebSocket.CLOSED) {
          resolve();
          return;
        }
        ws.once('close', () => resolve());
        ws.close();
      }),
  };
}

describe('Phase 05 — Worlds, Maps & Content Expansion', () => {
  beforeEach(() => {
    __overrideWorldLoader('modern-metropolis', null);
    __overrideWorldLoader('cyberpunk-city', null);
    __overrideWorldLoader('mekong-delta', null);
    __overrideWorldLoader('space-colony', null);
    setLocale('vi');
  });

  afterEach(() => {
    __overrideWorldLoader('modern-metropolis', null);
    __overrideWorldLoader('cyberpunk-city', null);
    __overrideWorldLoader('mekong-delta', null);
    __overrideWorldLoader('space-colony', null);
    setActiveWorldNames({}, 'vi');
  });

  // =========================================================================
  // 1 & 2. Selecting valid worlds & rejecting invalid / COMING_SOON worlds
  // =========================================================================
  describe('1 & 2. World Selection & Availability Guards', () => {
    it('recognizes all 8 worlds in WORLD_CATALOG with explicit availability and completeness', () => {
      expect(WORLD_CATALOG).toHaveLength(8);
      const ids = WORLD_CATALOG.map(w => w.id);
      expect(ids).toEqual([
        'modern-metropolis',
        'cyberpunk-city',
        'mekong-delta',
        'quang-tri-highlands',
        'northwest-vietnam',
        'fantasy-kingdom',
        'tropical-island',
        'space-colony',
      ]);

      const availableWorlds = WORLD_CATALOG.filter(w => w.availability === 'AVAILABLE');
      const comingSoonWorlds = WORLD_CATALOG.filter(w => w.availability === 'COMING_SOON');

      // Updated for roadmap B (M2): quang-tri-highlands and northwest-vietnam are now AVAILABLE.
      expect(availableWorlds.map(w => w.id)).toEqual([
        'modern-metropolis',
        'cyberpunk-city',
        'mekong-delta',
        'quang-tri-highlands',
        'northwest-vietnam',
        'space-colony',
      ]);
      expect(comingSoonWorlds.map(w => w.id)).toEqual([
        'fantasy-kingdom',
        'tropical-island',
      ]);

      for (const w of availableWorlds) {
        expect(w.completeness).toBe('FULL');
        expect(isWorldSelectable(w.id)).toBe(true);
      }
      for (const w of comingSoonWorlds) {
        expect(w.completeness).toBe('CONFIG_ONLY');
        expect(isWorldSelectable(w.id)).toBe(false);
      }
    });

    it('allows START_GAME with each of the 4 AVAILABLE worlds', () => {
      const selectableIds: WorldId[] = [
        'modern-metropolis',
        'cyberpunk-city',
        'mekong-delta',
        'space-colony',
      ];

      for (const worldId of selectableIds) {
        const state = gameReducer(INITIAL_GAME_STATE, {
          type: 'START_GAME',
          players: [
            { name: 'Player 1', token: DEFAULT_PLAYER_TOKENS[0] },
            { name: 'Player 2', token: DEFAULT_PLAYER_TOKENS[1] },
          ],
          config: { startingCash: 1500, maxRounds: 30, worldId },
        });

        expect(state.status).toBe('PLAYING');
        expect(state.config.worldId).toBe(worldId);
        expect(state.config.worldVersion).toBe(WORLD_SCHEMA_VERSION);
      }
    });

    it('rejects START_GAME when worldId is non-existent or COMING_SOON', () => {
      // Updated for roadmap B (M2): quang-tri-highlands and northwest-vietnam are AVAILABLE now.
      const invalidWorldIds = [
        'fantasy-kingdom',
        'tropical-island',
        'atlantis-unknown-world',
        '',
      ];

      for (const badId of invalidWorldIds) {
        const next = gameReducer(INITIAL_GAME_STATE, {
          type: 'START_GAME',
          players: [
            { name: 'Player 1', token: DEFAULT_PLAYER_TOKENS[0] },
            { name: 'Player 2', token: DEFAULT_PLAYER_TOKENS[1] },
          ],
          config: { startingCash: 1500, maxRounds: 30, worldId: badId },
        });

        expect(next.status).toBe('SETUP');
      }
    });

    it('resolves unknown or COMING_SOON worldId to DEFAULT_WORLD_ID via resolveWorldId', () => {
      expect(resolveWorldId('cyberpunk-city')).toBe('cyberpunk-city');
      // Updated for roadmap B (M2): quang-tri-highlands is AVAILABLE now.
      expect(resolveWorldId('quang-tri-highlands')).toBe('quang-tri-highlands');
      expect(resolveWorldId('fantasy-kingdom')).toBe(DEFAULT_WORLD_ID);
      expect(resolveWorldId('non-existent')).toBe(DEFAULT_WORLD_ID);
      expect(resolveWorldId(undefined)).toBe(DEFAULT_WORLD_ID);
    });
  });

  // =========================================================================
  // 3. Validating World Config Schema, Pack & Event Bounds
  // =========================================================================
  describe('3. World Configuration Schema & Validation', () => {
    it('validates the entire 8-world catalog with zero errors', () => {
      const errors = validateCatalog();
      expect(errors).toEqual([]);
    });

    it('validates all map events across all worlds against EVENT_BOUNDS', () => {
      const errors = validateAllEventData();
      expect(errors).toEqual([]);
    });

    it('validates each loaded FULL world pack and config', async () => {
      const fullWorlds: WorldId[] = [
        'modern-metropolis',
        'cyberpunk-city',
        'mekong-delta',
        'space-colony',
      ];

      for (const id of fullWorlds) {
        const loaded = await loadWorldConfig(id);
        expect(loaded.fallbackUsed).toBe(false);
        const errs = validateWorld(loaded.config);
        expect(errs).toEqual([]);
      }
    });

    it('catches invalid catalog entries and out-of-bounds event values', () => {
      const validEntry = getCatalogEntry('modern-metropolis')!;
      const brokenEntry = {
        ...validEntry,
        schemaVersion: 999,
      };
      const entryErrs = validateCatalogEntry(brokenEntry as any);
      expect(entryErrs.length).toBeGreaterThan(0);

      const brokenEvents = [
        {
          id: 'mm-bad-event',
          name: { vi: 'Lỗi', en: 'Broken' },
          description: { vi: 'Desc', en: 'Desc' },
          trigger: { tileType: 'CHAOS' as const, minRound: 1 },
          effect: {
            type: 'CASH_ALL' as const,
            value: EVENT_BOUNDS.CASH_ALL.max + 999,
            durationInTurns: 0,
          },
          rarity: 'RARE' as const,
          iconName: 'Coins',
        },
      ];
      const evErrs = validateEvents(brokenEvents, 'modern-metropolis');
      expect(evErrs.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 4 & 14. Mapping 40 Board Tiles + VI/EN Localization
  // =========================================================================
  describe('4 & 14. 40-Tile Mapping & VI/EN Localization', () => {
    it('maps all 28 ownable tiles with distinct localized VI and EN names in every FULL world', async () => {
      expect(OWNABLE_TILE_IDS).toHaveLength(28);
      const fullWorlds: WorldId[] = [
        'modern-metropolis',
        'cyberpunk-city',
        'mekong-delta',
        'space-colony',
      ];

      for (const wid of fullWorlds) {
        const { config } = await loadWorldConfig(wid);
        for (const tid of OWNABLE_TILE_IDS) {
          const entry = config.pack.tileNames[tid];
          expect(entry, `${wid} missing tile ${tid}`).toBeDefined();
          expect(entry.vi.length).toBeGreaterThan(1);
          expect(entry.en.length).toBeGreaterThan(1);
        }
      }
    });

    it('switches displayTileName dynamically between worlds and between VI and EN locales', async () => {
      const tile1 = BOARD_TILES[1]; // First brown property
      const cyber = await loadWorldConfig('cyberpunk-city');
      const mekong = await loadWorldConfig('mekong-delta');

      setActiveWorldNames(cyber.config.pack.tileNames, 'vi');
      const cyberVi = displayTileName(tile1, 'full');
      setActiveWorldNames(cyber.config.pack.tileNames, 'en');
      const cyberEn = displayTileName(tile1, 'full');

      setActiveWorldNames(mekong.config.pack.tileNames, 'vi');
      const mekongVi = displayTileName(tile1, 'full');
      setActiveWorldNames(mekong.config.pack.tileNames, 'en');
      const mekongEn = displayTileName(tile1, 'full');

      expect(cyberVi).not.toBe(mekongVi);
      expect(cyberEn).not.toBe(mekongEn);
      expect(cyberVi).not.toBe(cyberEn);
      expect(mekongVi).not.toBe(mekongEn);
    });

    it('updates global locale via setLocale/getLocale and provides complete VI/EN UI strings', () => {
      setLocale('vi');
      expect(getLocale()).toBe('vi');
      setLocale('en');
      expect(getLocale()).toBe('en');

      for (const [key, text] of Object.entries(WORLD_UI)) {
        expect(text.vi.length, `Missing VI for ${key}`).toBeGreaterThan(0);
        expect(text.en.length, `Missing EN for ${key}`).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // 5, 6 & 7. World Map Events, Ledger Conservation & Canonical Chaos Compatibility
  // =========================================================================
  describe('5, 6 & 7. World Map Events & Chaos Engine Integration', () => {
    it('triggers world-specific map events under round conditions and converts to canonical ChaosCard', () => {
      const events = getWorldEvents('mekong-delta');
      expect(events.length).toBeGreaterThanOrEqual(2);

      const card = worldEventToChaosCard('mekong-delta', events[0]);
      expect(card.worldId).toBe('mekong-delta');
      expect(card.worldEventId).toBe(events[0].id);
      expect(card.nameVi).toBe(events[0].name.vi);

      const baseState = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
        config: { startingCash: 1500, maxRounds: 30, worldId: 'cyberpunk-city' },
      });
      const stateAtRound10 = { ...baseState, roundNumber: 10 };

      let pickedCount = 0;
      for (let seed = 1; seed <= 50; seed++) {
        const testRng = new SeededPRNG(seed);
        const picked = pickWorldEventCard(stateAtRound10, testRng);
        if (picked) {
          pickedCount++;
          expect(picked.worldId).toBe('cyberpunk-city');
          expect(picked.worldEventId).toBeDefined();
        }
      }
      expect(pickedCount).toBeGreaterThan(5);
      expect(pickedCount).toBeLessThan(45); // mixes with canonical Chaos deck
    });

    it('respects minRound conditions on world events', () => {
      const baseState = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
        config: { startingCash: 1500, maxRounds: 30, worldId: 'space-colony' },
      });
      // Round 1: sc-hull-breach has minRound: 6, so it must never be picked in round 1
      for (let seed = 1; seed <= 60; seed++) {
        const testRng = new SeededPRNG(seed);
        const pickedRound1 = pickWorldEventCard(baseState, testRng);
        if (pickedRound1) {
          expect(pickedRound1.worldEventId).not.toBe('sc-hull-breach');
        }
      }
    });

    it('preserves ledger conservation and state invariants when resolving every world event across all 4 worlds', () => {
      const fullWorlds: WorldId[] = [
        'modern-metropolis',
        'cyberpunk-city',
        'mekong-delta',
        'space-colony',
      ];

      for (const wid of fullWorlds) {
        const events = WORLD_EVENTS[wid] || [];
        for (const ev of events) {
          let state = gameReducer(INITIAL_GAME_STATE, {
            type: 'START_GAME',
            players: [
              { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0] },
              { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1] },
              { name: 'P3', token: DEFAULT_PLAYER_TOKENS[2] },
            ],
            config: { startingCash: 1500, maxRounds: 30, worldId: wid } as any,
          });

          state = {
            ...state,
            properties: {
              ...state.properties,
              1: { ownerId: 'player-1', level: 2, isMortgaged: false },
            },
            turnPhase: 'CHAOS_EVENT',
            activeChaosCard: worldEventToChaosCard(wid, ev),
          };

          const resolved = gameReducer(state, { type: 'RESOLVE_CHAOS' });
          const integrity = verifyLedgerAudit(
            resolved.config.startingCash,
            resolved.players,
            resolved.ledger || []
          );
          expect(
            integrity.isValid,
            `${wid}:${ev.id} broke ledger: ${integrity.discrepancies.join(', ')}`
          ).toBe(true);
          expect(resolved.activeChaosCard).toBeNull();
        }
      }
    });

    it('consumes zero PRNG calls when config.worldId is undefined (preserving Phase 01-04 determinism)', () => {
      const rng = new SeededPRNG(42);
      const stateNoWorld = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
        config: { startingCash: 1500, maxRounds: 30 },
      });
      const res = pickWorldEventCard(stateNoWorld, rng);
      expect(res).toBeNull();
      expect(rng.getState()).toBe(new SeededPRNG(42).getState());
    });
  });

  // =========================================================================
  // 8 & 9. AI Player Compatibility & Local Hot-Seat Match Flow Across Worlds
  // =========================================================================
  describe('8 & 9. AI Compatibility & Local Hot-Seat Match Flow Across Worlds', () => {
    it('runs deterministic AI vs AI turns cleanly on all 4 AVAILABLE worlds with 100% ledger integrity', () => {
      const worlds: WorldId[] = [
        'modern-metropolis',
        'cyberpunk-city',
        'mekong-delta',
        'space-colony',
      ];

      for (const wid of worlds) {
        let state = gameReducer(INITIAL_GAME_STATE, {
          type: 'START_GAME',
          players: [
            {
              name: 'AI Shark',
              token: DEFAULT_PLAYER_TOKENS[0],
              isAI: true,
              aiPersonality: 'SHARK',
              aiDifficulty: 'NORMAL',
            },
            {
              name: 'AI Strategist',
              token: DEFAULT_PLAYER_TOKENS[1],
              isAI: true,
              aiPersonality: 'STRATEGIST',
              aiDifficulty: 'HARD',
            },
          ],
          config: { startingCash: 1500, maxRounds: 25, worldId: wid } as any,
        });

        const diceRng = new SeededPRNG(777);
        let stepCount = 0;

        for (let tick = 0; tick < 80 && state.status === 'PLAYING'; tick++) {
          const activePlayer = state.players[state.activePlayerIndex];
          if (state.turnPhase === 'ROLLING') {
            const roll = rollTwoDice([
              diceRng.nextInt(1, 6),
              diceRng.nextInt(1, 6),
            ]);
            state = gameReducer(state, {
              type: 'ROLL_DICE_RESULT',
              dice: roll.dice,
              senderPlayerId: activePlayer.id,
            });
            stepCount = 0;
            continue;
          }

          const actor = getActiveAIActor(state);
          if (!actor) break;
          const decision = computeNextAIDecision(state, stepCount);
          if (!decision) break;
          stepCount++;
          state = gameReducer(state, decision.action);
        }

        expect(state.config.worldId).toBe(wid);
        const check = verifyLedgerAudit(
          state.config.startingCash,
          state.players,
          state.ledger || []
        );
        expect(check.isValid).toBe(true);
      }
    });

    it('executes a local hot-seat match flow (roll, buy property, end turn) with worldId preserved', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Human A', token: DEFAULT_PLAYER_TOKENS[0], isAI: false },
          { name: 'Human B', token: DEFAULT_PLAYER_TOKENS[1], isAI: false },
        ],
        config: { startingCash: 1500, maxRounds: 30, worldId: 'mekong-delta' } as any,
      });

      expect(state.config.worldId).toBe('mekong-delta');
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] }); // Lands on tile 3 (Property)
      expect(state.players[0].position).toBe(3);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 3 });
      expect(state.properties[3].ownerId).toBe('player-1');

      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.config.worldId).toBe('mekong-delta');
    });
  });

  // =========================================================================
  // 10, 11 & 12. Online Multiplayer World Sync, Reconnect & Server Restart
  // =========================================================================
  describe('10, 11 & 12. Online Multiplayer World Selection, Sync, Reconnect & Persistence', () => {
    let server: ChaosMultiplayerServer | null = null;
    let port = 0;
    let tmpDbPath = '';

    beforeEach(async () => {
      tmpDbPath = path.join(
        os.tmpdir(),
        `chaos-phase05-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`
      );
      server = new ChaosMultiplayerServer({
        port: 0,
        host: '127.0.0.1',
        dbFilePath: tmpDbPath,
        aiActionDelayMs: 30,
        silentLogs: true,
      });
      port = await server.listen(0, '127.0.0.1');
    });

    afterEach(async () => {
      if (server) {
        await server.close();
        server = null;
      }
      try {
        if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
        if (fs.existsSync(`${tmpDbPath}-wal`)) fs.unlinkSync(`${tmpDbPath}-wal`);
        if (fs.existsSync(`${tmpDbPath}-shm`)) fs.unlinkSync(`${tmpDbPath}-shm`);
      } catch {
        /* ignore cleanup */
      }
    });

    it('synchronizes world selection across host and joined clients, and rejects non-host or COMING_SOON worlds', async () => {
      const host = await createTestWsClient(port);
      const guest = await createTestWsClient(port);

      try {
        // Host attempts to create a room with a COMING_SOON world -> rejected with INVALID_WORLD
        host.send({
          version: PROTOCOL_VERSION,
          type: 'CREATE_ROOM',
          requestId: 'req-bad-create',
          playerName: 'Host Alpha',
          roomName: 'Room Test',
          capacity: 2,
          config: { startingCash: 1500, maxRounds: 30, worldId: 'fantasy-kingdom' },
        });
        const badCreateErr = await host.waitFor('ERROR');
        expect(badCreateErr.code).toBe('INVALID_WORLD');

        // Host creates room with valid 'cyberpunk-city'
        host.send({
          version: PROTOCOL_VERSION,
          type: 'CREATE_ROOM',
          requestId: 'req-good-create',
          playerName: 'Host Alpha',
          roomName: 'Neo Room',
          capacity: 2,
          config: { startingCash: 1500, maxRounds: 30, worldId: 'cyberpunk-city' },
        });
        const hostJoined = await host.waitFor('ROOM_JOINED');
        expect(hostJoined.room.config.worldId).toBe('cyberpunk-city');
        const roomCode = hostJoined.room.roomCode;

        // Guest joins room and sees 'cyberpunk-city'
        guest.send({
          version: PROTOCOL_VERSION,
          type: 'JOIN_ROOM',
          requestId: 'req-join',
          roomCode,
          playerName: 'Guest Beta',
        });
        const guestJoined = await guest.waitFor('ROOM_JOINED');
        expect(guestJoined.room.config.worldId).toBe('cyberpunk-city');

        // Guest tries to change world -> rejected with NOT_HOST
        guest.send({
          version: PROTOCOL_VERSION,
          type: 'CONFIGURE_ROOM',
          requestId: 'req-guest-cfg',
          roomCode,
          config: { worldId: 'space-colony' },
        });
        const notHostErr = await guest.waitFor('ERROR');
        expect(notHostErr.code).toBe('NOT_ROOM_HOST');

        // Host changes world to 'space-colony' -> both host and guest receive ROOM_UPDATED with 'space-colony'
        host.send({
          version: PROTOCOL_VERSION,
          type: 'CONFIGURE_ROOM',
          requestId: 'req-host-cfg',
          roomCode,
          config: { worldId: 'space-colony' },
        });
        const guestUpdated = await guest.waitFor(
          'ROOM_UPDATED',
          m => m.room.config.worldId === 'space-colony'
        );
        expect(guestUpdated.room.config.worldId).toBe('space-colony');

        // Host tries to change world to COMING_SOON 'fantasy-kingdom' -> rejected with INVALID_WORLD
        host.send({
          version: PROTOCOL_VERSION,
          type: 'CONFIGURE_ROOM',
          requestId: 'req-host-bad-world',
          roomCode,
          config: { worldId: 'fantasy-kingdom' },
        });
        const badCfgErr = await host.waitFor('ERROR');
        expect(badCfgErr.code).toBe('INVALID_WORLD');
      } finally {
        await host.close();
        await guest.close();
      }
    });

    it('preserves the active worldId across match start, player disconnect/reconnect, and SQLite server restart', async () => {
      const host = await createTestWsClient(port);
      const guest = await createTestWsClient(port);

      try {
        host.send({
          version: PROTOCOL_VERSION,
          type: 'CREATE_ROOM',
          requestId: 'c1',
          playerName: 'Host',
          roomName: 'Mekong Match',
          capacity: 2,
          config: { startingCash: 1500, maxRounds: 30, worldId: 'mekong-delta' },
        });
        const hostJoined = await host.waitFor('ROOM_JOINED');
        const roomCode = hostJoined.room.roomCode;

        guest.send({
          version: PROTOCOL_VERSION,
          type: 'JOIN_ROOM',
          requestId: 'j1',
          roomCode,
          playerName: 'Guest',
        });
        const guestJoined = await guest.waitFor('ROOM_JOINED');

        guest.send({
          version: PROTOCOL_VERSION,
          type: 'SET_READY',
          requestId: 'r1',
          roomCode,
          isReady: true,
        });
        await host.waitFor('ROOM_UPDATED', m => m.room.status === 'READY');

        host.send({
          version: PROTOCOL_VERSION,
          type: 'START_MATCH',
          requestId: 's1',
          roomCode,
        });
        const started = await host.waitFor('MATCH_STARTED');
        expect(started.gameState.config.worldId).toBe('mekong-delta');
        expect(started.room.config.worldId).toBe('mekong-delta');

        // Guest disconnects and reconnects during active match -> receives exact 'mekong-delta' worldId
        await guest.close();
        const guestReconn = await createTestWsClient(port);
        guestReconn.send({
          version: PROTOCOL_VERSION,
          type: 'RECONNECT_ROOM',
          requestId: 'rec-1',
          roomCode,
          playerId: guestJoined.assignedPlayerId,
          reconnectToken: guestJoined.reconnectToken,
        });
        const reconnMsg = await guestReconn.waitFor('ROOM_JOINED');
        expect(reconnMsg.room.config.worldId).toBe('mekong-delta');
        expect(reconnMsg.gameState?.config.worldId).toBe('mekong-delta');
        await guestReconn.close();
        await host.close();

        // Stop server and restart with same SQLite DB -> room and gameState still have 'mekong-delta'
        await server!.close();
        server = new ChaosMultiplayerServer({
          port: 0,
          host: '127.0.0.1',
          dbFilePath: tmpDbPath,
          aiActionDelayMs: 30,
          silentLogs: true,
        });
        port = await server.listen(0, '127.0.0.1');

        const hostAfterRestart = await createTestWsClient(port);
        hostAfterRestart.send({
          version: PROTOCOL_VERSION,
          type: 'RECONNECT_ROOM',
          requestId: 'rec-after-restart',
          roomCode,
          playerId: hostJoined.assignedPlayerId,
          reconnectToken: hostJoined.reconnectToken,
        });
        const restored = await hostAfterRestart.waitFor('ROOM_JOINED');
        expect(restored.room.config.worldId).toBe('mekong-delta');
        expect(restored.gameState?.config.worldId).toBe('mekong-delta');
        await hostAfterRestart.close();
      } finally {
        await host.close();
        await guest.close();
      }
    });
  });

  // =========================================================================
  // 13. Asset / Pack Load Failure Fallback
  // =========================================================================
  describe('13. World Pack Load Failure & Safe Fallback', () => {
    it('recovers with FALLBACK_PACK and fallbackUsed=true when a world pack loader throws or returns invalid data', async () => {
      __overrideWorldLoader('space-colony', async () => {
        throw new Error('Simulated network chunk load error');
      });

      const res = await loadWorldConfig('space-colony');
      expect(res.fallbackUsed).toBe(true);
      expect(res.error).toContain('Simulated network chunk load error');
      expect(res.config.id).toBe('modern-metropolis');
    });
  });
});
