import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { verifyLedgerAudit } from '../economy/ledgerEngine';
import {
  deserializeMatch,
  saveMatchToStorage,
  loadMatchFromStorage,
  clearMatchFromStorage,
  STORAGE_KEY,
} from '../storage/matchStorage';
import { GameState } from '../types';

function createMatch(playerCount: 2 | 3 | 4 = 3): GameState {
  const players = Array.from({ length: playerCount }).map((_, idx) => ({
    name: `Tài Phiệt ${idx + 1}`,
  }));
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players,
    config: { startingCash: 1500, maxRounds: 45 },
  });
}

describe('Phase 02 — Auction Engine, Bilateral Trading & Match Persistence', () => {
  describe('1. Property Auction System', () => {
    it('initiates auction on unowned property with 50% opening bid and eligible solvent participants', () => {
      let state = createMatch(3);
      // Move player 1 to Tile 1 (Chợ Nổi Cái Răng, basePrice = 60 -> openingBid = 30)
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] as any });
      // Position player at tile 1 explicitly
      state = {
        ...state,
        players: state.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : p)),
        turnPhase: 'ACTION_MENU',
      };

      state = gameReducer(state, { type: 'START_AUCTION', tileId: 1 });
      expect(state.turnPhase).toBe('AUCTION');
      expect(state.activeAuction).not.toBeNull();
      expect(state.activeAuction?.propertyId).toBe(1);
      expect(state.activeAuction?.openingBid).toBe(30);
      expect(state.activeAuction?.activeBidderIds).toEqual(['player-1', 'player-2', 'player-3']);
    });

    it('rejects bids below minimum increment or exceeding bidder cash, and resolves winner accurately', () => {
      let state = createMatch(3);
      state = gameReducer(state, { type: 'START_AUCTION', tileId: 6 }); // Tile 6 Vũng Tàu, basePrice = 100, openingBid = 50
      expect(state.activeAuction?.openingBid).toBe(50);

      // Invalid bid below openingBid (40 < 50) -> ignored
      const afterLowBid = gameReducer(state, {
        type: 'PLACE_AUCTION_BID',
        playerId: 'player-1',
        bidAmount: 40,
      });
      expect(afterLowBid.activeAuction?.highestBid).toBe(0);

      // Valid opening bid by player-1 ($50M)
      state = gameReducer(state, {
        type: 'PLACE_AUCTION_BID',
        playerId: 'player-1',
        bidAmount: 50,
      });
      expect(state.activeAuction?.highestBid).toBe(50);
      expect(state.activeAuction?.highestBidderId).toBe('player-1');

      // Invalid increment < +10M ($55M < $60M) -> ignored
      const afterSmallInc = gameReducer(state, {
        type: 'PLACE_AUCTION_BID',
        playerId: 'player-2',
        bidAmount: 55,
      });
      expect(afterSmallInc.activeAuction?.highestBid).toBe(50);

      // Player-2 bids $80M
      state = gameReducer(state, {
        type: 'PLACE_AUCTION_BID',
        playerId: 'player-2',
        bidAmount: 80,
      });
      expect(state.activeAuction?.highestBid).toBe(80);
      expect(state.activeAuction?.highestBidderId).toBe('player-2');

      // Player-3 passes
      state = gameReducer(state, {
        type: 'PASS_AUCTION_BID',
        playerId: 'player-3',
      });
      expect(state.activeAuction).not.toBeNull();

      // Player-1 passes -> Only Player-2 remains and holds highest bid -> Auto-resolves!
      state = gameReducer(state, {
        type: 'PASS_AUCTION_BID',
        playerId: 'player-1',
      });

      expect(state.activeAuction).toBeNull();
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.properties[6]?.ownerId).toBe('player-2');
      const p2 = state.players.find(p => p.id === 'player-2')!;
      expect(p2.cash).toBe(1500 - 80);
      expect(p2.stats.propertiesOwned).toBe(1);

      const audit = verifyLedgerAudit(1500, state.players, state.ledger || []);
      expect(audit.isValid).toBe(true);
    });

    it('handles no-bid auction gracefully leaving property unowned with Bank', () => {
      let state = createMatch(2);
      state = gameReducer(state, { type: 'START_AUCTION', tileId: 1 });
      expect(state.activeAuction).not.toBeNull();

      state = gameReducer(state, { type: 'PASS_AUCTION_BID', playerId: 'player-1' });
      state = gameReducer(state, { type: 'PASS_AUCTION_BID', playerId: 'player-2' });

      expect(state.activeAuction).toBeNull();
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.properties[1]?.ownerId).toBeNull();
    });

    it('blocks END_TURN while an auction is active', () => {
      let state = createMatch(2);
      state = gameReducer(state, { type: 'START_AUCTION', tileId: 1 });
      const afterEndTurn = gameReducer(state, { type: 'END_TURN' });
      expect(afterEndTurn.turnPhase).toBe('AUCTION');
      expect(afterEndTurn.activePlayerIndex).toBe(0);
    });
  });

  describe('2. Bilateral Player-to-Player Trading System', () => {
    it('executes cash-for-property, property-for-property, and cash+property+jailCards trades atomically', () => {
      let state = createMatch(2);
      // Give player-1 tile 1 (Cái Răng) and 1 jail card; give player-2 tile 6 (Vũng Tàu)
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1' ? { ...p, jailFreeCards: 1, stats: { ...p.stats, propertiesOwned: 1 } } :
          p.id === 'player-2' ? { ...p, stats: { ...p.stats, propertiesOwned: 1 } } : p
        ),
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 0, isMortgaged: false },
          6: { ownerId: 'player-2', level: 0, isMortgaged: false },
        },
      };

      // Propose trade: Player-1 offers Tile 1 + $100M + 1 Jail Card for Player-2's Tile 6 + $20M
      state = gameReducer(state, {
        type: 'PROPOSE_TRADE',
        proposal: {
          senderPlayerId: 'player-1',
          targetPlayerId: 'player-2',
          offeredCash: 100,
          offeredPropertyIds: [1],
          offeredJailCards: 1,
          requestedCash: 20,
          requestedPropertyIds: [6],
          requestedJailCards: 0,
        },
      });

      expect(state.activeTrade).not.toBeNull();
      expect(state.activeTrade?.status).toBe('PENDING');

      // Accept trade
      state = gameReducer(state, {
        type: 'ACCEPT_TRADE',
        tradeId: state.activeTrade?.id,
      });

      expect(state.activeTrade).toBeNull();
      expect(state.properties[1]?.ownerId).toBe('player-2');
      expect(state.properties[6]?.ownerId).toBe('player-1');

      const p1 = state.players.find(p => p.id === 'player-1')!;
      const p2 = state.players.find(p => p.id === 'player-2')!;
      expect(p1.cash).toBe(1500 - 100 + 20);
      expect(p2.cash).toBe(1500 + 100 - 20);
      expect(p1.jailFreeCards).toBe(0);
      expect(p2.jailFreeCards).toBe(1);

      const audit = verifyLedgerAudit(1500, state.players, state.ledger || []);
      expect(audit.isValid).toBe(true);
    });

    it('enforces Unimproved District Rule: prevents trading any property in a district with buildings', () => {
      let state = createMatch(2);
      // Player-1 owns Brown Monopoly (Tiles 1 and 3), with Tile 3 built to level 1
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 0, isMortgaged: false },
          3: { ownerId: 'player-1', level: 1, isMortgaged: false },
        },
      };

      // Attempt to trade unbuilt Tile 1 while sibling Tile 3 has level 1 -> Rejected!
      const afterPropose = gameReducer(state, {
        type: 'PROPOSE_TRADE',
        proposal: {
          senderPlayerId: 'player-1',
          targetPlayerId: 'player-2',
          offeredCash: 0,
          offeredPropertyIds: [1],
          offeredJailCards: 0,
          requestedCash: 150,
          requestedPropertyIds: [],
          requestedJailCards: 0,
        },
      });

      expect(afterPropose.activeTrade).toBeNull();
    });

    it('prevents stale or invalidated offers from executing at acceptance time', () => {
      let state = createMatch(2);
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 0, isMortgaged: false },
        },
      };

      state = gameReducer(state, {
        type: 'PROPOSE_TRADE',
        proposal: {
          senderPlayerId: 'player-1',
          targetPlayerId: 'player-2',
          offeredCash: 0,
          offeredPropertyIds: [1],
          offeredJailCards: 0,
          requestedCash: 500,
          requestedPropertyIds: [],
          requestedJailCards: 0,
        },
      });
      expect(state.activeTrade).not.toBeNull();

      // Simulate target losing cash before accepting (e.g. Chaos event reduced cash to $100M)
      state = {
        ...state,
        players: state.players.map(p => (p.id === 'player-2' ? { ...p, cash: 100 } : p)),
      };

      // Attempt to accept stale trade -> Cancelled safely without transferring property or causing negative cash
      state = gameReducer(state, { type: 'ACCEPT_TRADE' });
      expect(state.activeTrade).toBeNull();
      expect(state.properties[1]?.ownerId).toBe('player-1');
      expect(state.players.find(p => p.id === 'player-2')?.cash).toBe(100);
    });
  });

  describe('3. Match State Serialization, Persistence & Refresh Recovery', () => {
    const store: Record<string, string> = {};
    beforeEach(() => {
      Object.keys(store).forEach(k => delete store[k]);
      Object.defineProperty(globalThis, 'window', {
        value: {
          localStorage: {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, val: string) => {
              store[key] = val;
            },
            removeItem: (key: string) => {
              delete store[key];
            },
          },
        },
        writable: true,
      });
    });

    it('serializes, saves, loads, and restores active match state across refresh', () => {
      let state = createMatch(4);
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 4] });

      const savedOk = saveMatchToStorage(state);
      expect(savedOk).toBe(true);

      const loaded = loadMatchFromStorage();
      expect(loaded).not.toBeNull();
      expect(loaded?.state.players.length).toBe(4);
      expect(loaded?.state.roundNumber).toBe(state.roundNumber);

      // Dispatch LOAD_SAVED_MATCH into a fresh reducer state
      const restored = gameReducer(INITIAL_GAME_STATE, {
        type: 'LOAD_SAVED_MATCH',
        savedState: loaded!.state,
      });
      expect(restored.status).toBe('PLAYING');
      expect(restored.players[0].position).toBe(state.players[0].position);
    });

    it('handles corrupted JSON or mismatched schema versions gracefully', () => {
      store[STORAGE_KEY] = '{corrupted_json: true';
      expect(loadMatchFromStorage()).toBeNull();
      expect(store[STORAGE_KEY]).toBeUndefined();

      store[STORAGE_KEY] = JSON.stringify({ schemaVersion: 999, state: {} });
      expect(deserializeMatch(store[STORAGE_KEY])).toBeNull();

      clearMatchFromStorage();
      expect(loadMatchFromStorage()).toBeNull();
    });
  });
});
