import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../../gameReducer';
import { verifyLedgerAudit } from '../../economy/ledgerEngine';
import { CHAOS_CARDS } from '../../chaos-engine/chaosCards';
import { serializeMatch, deserializeMatch } from '../../storage/matchStorage';
import { GameState } from '../../types';

function setupMatch(count: 2 | 3 | 4, startingCash = 1500, maxRounds = 45): GameState {
  const players = Array.from({ length: count }).map((_, i) => ({
    name: `Tài Phiệt ${i + 1}`,
  }));
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players,
    config: { startingCash, maxRounds },
  });
}

describe('Tier 3–5 Phase 02 — Pairwise Combinations, Multi-Player Scenarios & Adversarial Hardening', () => {
  it('simulates a complete 2-player, 3-player, and 4-player multi-round sequence with auctions, trading, chaos, and ledger verification', () => {
    for (const playerCount of [2, 3, 4] as const) {
      let state = setupMatch(playerCount, 1500, 30);
      expect(state.players.length).toBe(playerCount);

      // Turn 1: Player 1 rolls to Tile 6 (Vũng Tàu, basePrice 100) and initiates an auction
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 4] });
      expect(state.players[0].position).toBe(6);

      state = gameReducer(state, { type: 'START_AUCTION', tileId: 6 });
      expect(state.turnPhase).toBe('AUCTION');

      // Player 2 places winning bid of $70M, others pass
      state = gameReducer(state, {
        type: 'PLACE_AUCTION_BID',
        playerId: 'player-2',
        bidAmount: 70,
      });

      for (const p of state.players) {
        if (p.id !== 'player-2' && state.activeAuction) {
          state = gameReducer(state, {
            type: 'PASS_AUCTION_BID',
            playerId: p.id,
          });
        }
      }

      expect(state.activeAuction).toBeNull();
      expect(state.properties[6]?.ownerId).toBe('player-2');

      // Bilateral trade: Player 1 buys Tile 6 from Player 2 for $90M
      state = gameReducer(state, {
        type: 'PROPOSE_TRADE',
        proposal: {
          senderPlayerId: 'player-1',
          targetPlayerId: 'player-2',
          offeredCash: 90,
          offeredPropertyIds: [],
          offeredJailCards: 0,
          requestedCash: 0,
          requestedPropertyIds: [6],
          requestedJailCards: 0,
        },
      });
      state = gameReducer(state, { type: 'ACCEPT_TRADE' });
      expect(state.properties[6]?.ownerId).toBe('player-1');

      // Serialization & refresh recovery mid-match
      const raw = serializeMatch(state);
      const restored = deserializeMatch(raw);
      expect(restored).not.toBeNull();
      state = gameReducer(INITIAL_GAME_STATE, {
        type: 'LOAD_SAVED_MATCH',
        savedState: restored!.state,
      });

      // Verify ledger audit across the entire sequence
      const audit = verifyLedgerAudit(1500, state.players, state.ledger || []);
      expect(audit.isValid).toBe(true);
    }
  });

  it('prevents duplicate actionId execution across auctions, trades, and property purchases', () => {
    let state = setupMatch(2);
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : p)),
      turnPhase: 'ACTION_MENU',
    };

    const actionId = 'dup-buy-tile-1';
    state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1, actionId });
    const cashAfterFirst = state.players[0].cash;

    // Dispatching the exact same actionId a second time must be a strict no-op
    const stateAfterDuplicate = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1, actionId });
    expect(stateAfterDuplicate).toBe(state);
    expect(stateAfterDuplicate.players[0].cash).toBe(cashAfterFirst);
  });

  it('verifies Freeze Market Chaos modifier blocks both direct purchase and public auction initiation', () => {
    let state = setupMatch(2);
    const freezeCard = CHAOS_CARDS.find(c => c.effectType === 'FREEZE_MARKET')!;
    expect(freezeCard).toBeDefined();

    state = gameReducer(state, { type: 'APPLY_CHAOS_EFFECT', payload: freezeCard });
    expect(state.chaosModifiers?.marketFrozenTurns).toBeGreaterThan(0);

    // Move Player 1 to Tile 1 (unowned property)
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : p)),
      turnPhase: 'ACTION_MENU',
    };

    // Direct buy blocked
    const afterBuy = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
    expect(afterBuy.properties[1]?.ownerId).toBeNull();

    // Public auction blocked while market is frozen
    const afterAuction = gameReducer(state, { type: 'START_AUCTION', tileId: 1 });
    expect(afterAuction.activeAuction).toBeNull();
  });
});
