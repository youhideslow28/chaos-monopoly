import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { calculateNewPosition } from '../dice/diceEngine';
import { canBuyProperty, getTileById } from '../property/propertyEngine';
import {
  calculatePlayerNetWorth,
  executeCashTransaction,
  transferCash,
} from '../economy/economyEngine';
import { advanceTurn } from '../turn-manager/turnManager';
import { evaluateWinCondition } from '../win-condition/winCondition';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { PlayerState, PropertyOwnership } from '../types';

describe('Tier 2: Boundary Conditions & Edge Cases', () => {
  describe('1. Cash Thresholds & Invariants', () => {
    it('handles exact cash purchase with 0 remaining balance without going bankrupt', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      const tile1 = getTileById(1);
      const price = tile1!.property!.basePrice; // 60

      // Set Alice cash to exactly basePrice
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: price },
          state.players[1],
        ],
      };

      const check = canBuyProperty(1, state.players[0].cash, state.properties);
      expect(check.canBuy).toBe(true);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].isBankrupt).toBe(false);
      expect(state.properties[1]?.ownerId).toBe('player-1');
    });

    it('rejects purchase when cash is exactly 1 unit below price', () => {
      const tile1 = getTileById(1);
      const price = tile1!.property!.basePrice; // 60

      const checkInsufficient = canBuyProperty(1, price - 1, {});
      expect(checkInsufficient.canBuy).toBe(false);
      expect(checkInsufficient.reason).toContain('Số dư không đủ');
    });

    it('enforces non-negative cash invariant when rent exceeds player cash', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Debtor',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 35, // Only 35 cash
        position: 1,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
      };

      const p2: PlayerState = {
        ...p1,
        id: 'p2',
        name: 'Landlord',
        cash: 500,
      };

      // Landlord charges 100 rent
      const transfer = transferCash(p1, p2, 100);
      expect(transfer.actualPaid).toBe(35); // Can only collect available cash
      expect(transfer.fromPlayerUpdated.cash).toBe(0); // Clamped at 0, NEVER negative
      expect(transfer.toPlayerUpdated.cash).toBe(535);
      expect(transfer.fromPlayerUpdated.stats.rentPaid).toBe(35);
      expect(transfer.toPlayerUpdated.stats.rentCollected).toBe(35);
    });

    it('detects boundary insolvency on cash transactions', () => {
      const p: PlayerState = {
        id: 'p1',
        name: 'Tester',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 50,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
      };

      // Exactly 0 remaining
      const zeroCheck = executeCashTransaction(p, -50);
      expect(zeroCheck.updatedPlayer.cash).toBe(0);
      expect(zeroCheck.isSolvent).toBe(true);

      // Deficit of 1
      const negativeCheck = executeCashTransaction(p, -51);
      expect(negativeCheck.updatedPlayer.cash).toBe(-1);
      expect(negativeCheck.isSolvent).toBe(false);
    });
  });

  describe('2. Consecutive Doubles Rule & Penalty', () => {
    it('tracks consecutive doubles and allows re-roll for 1st and 2nd double', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Roller', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Watcher', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // 1st Double: [3, 3]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.isDouble).toBe(true);
      expect(state.players[0].consecutiveDoubles).toBe(1);
      expect(state.players[0].inDetention).toBe(false);

      // End turn triggers extra roll
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0); // Still Roller's turn!
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      // 2nd Double: [5, 5]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [5, 5] });
      expect(state.isDouble).toBe(true);
      expect(state.players[0].consecutiveDoubles).toBe(2);
      expect(state.players[0].inDetention).toBe(false);
    });

    it('sends player immediately to Detention on 3rd consecutive double and denies extra roll', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Roller', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Watcher', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Manually set 2 consecutive doubles
      state = {
        ...state,
        players: [
          { ...state.players[0], consecutiveDoubles: 2 },
          state.players[1],
        ],
      };

      // 3rd Double: [2, 2]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].consecutiveDoubles).toBe(0); // reset
      expect(state.isDouble).toBe(false); // denied extra turn!
      expect(state.logs[0].message).toContain('3 lần đôi liên tiếp');
    });

    it('resets consecutive doubles counter when non-double is rolled', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Roller', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Watcher', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // 1st Double
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[0].consecutiveDoubles).toBe(1);

      state = gameReducer(state, { type: 'END_TURN' });

      // Non-double roll: [2, 3]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.isDouble).toBe(false);
    });
  });

  describe('3. Max Rounds Hard Cap & Net Worth Evaluation', () => {
    it('does not end game before reaching max rounds limit', () => {
      const players: PlayerState[] = [
        {
          id: 'p1',
          name: 'P1',
          token: DEFAULT_PLAYER_TOKENS[0],
          cash: 1000,
          position: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          consecutiveDoubles: 0,
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
        },
        {
          id: 'p2',
          name: 'P2',
          token: DEFAULT_PLAYER_TOKENS[1],
          cash: 1000,
          position: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          consecutiveDoubles: 0,
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
        },
      ];

      const check = evaluateWinCondition(players, {}, 29, 30);
      expect(check.isGameOver).toBe(false);
      expect(check.winner).toBeNull();
    });

    it('ends game and selects highest net worth winner when max rounds reached', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Wealthy Player',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 800,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 2 },
      };
      const p2: PlayerState = {
        id: 'p2',
        name: 'Modest Player',
        token: DEFAULT_PLAYER_TOKENS[1],
        cash: 500,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
      };

      // Tile 1: basePrice 60, upgradeCost 50
      // P1 net worth: 800 + 60 + (1 * 50) = 910
      // P2 net worth: 500
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 1 },
      };

      const check = evaluateWinCondition([p1, p2], properties, 30, 30);
      expect(check.isGameOver).toBe(true);
      expect(check.reason).toBe('MAX_ROUNDS_REACHED');
      expect(check.winner?.id).toBe('p1');
    });

    it('resolves net worth ties using cash balance as tie-breaker', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Cash King',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 1000,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
      };
      const p2: PlayerState = {
        id: 'p2',
        name: 'Property Baron',
        token: DEFAULT_PLAYER_TOKENS[1],
        cash: 896,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };

      // Tile 1: basePrice 60, Round 30 market value = round(60 * 1.725) = 104 -> P2 total net worth = 896 + 104 = 1000
      // Both net worth = 1000, but P1 cash (1000) > P2 cash (896)
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p2', level: 0 },
      };

      const check = evaluateWinCondition([p1, p2], properties, 30, 30);
      expect(check.isGameOver).toBe(true);
      expect(check.winner?.id).toBe('p1');
    });

    it('evaluates bankrupt player net worth as strictly 0', () => {
      const bankruptP: PlayerState = {
        id: 'p1',
        name: 'Broke',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 1000, // even if cash artifact exists
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: true,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };

      expect(calculatePlayerNetWorth(bankruptP, { 1: { ownerId: 'p1', level: 3 } })).toBe(0);
    });
  });

  describe('4. Movement Boundary Precision', () => {
    it('correctly calculates step transitions around wrap boundary', () => {
      // From tile 39 on 40-tile board with 1 step -> 0 (passedStart: true)
      expect(calculateNewPosition(39, 1, 40)).toEqual({ newPosition: 0, passedStart: true });

      // From tile 39 with 2 steps -> 1 (passedStart: true)
      expect(calculateNewPosition(39, 2, 40)).toEqual({ newPosition: 1, passedStart: true });

      // From tile 0 with 39 steps -> 39 (passedStart: false)
      expect(calculateNewPosition(0, 39, 40)).toEqual({ newPosition: 39, passedStart: false });

      // From tile 20 with 20 steps -> 0 (passedStart: true)
      expect(calculateNewPosition(20, 20, 40)).toEqual({ newPosition: 0, passedStart: true });
    });
  });

  describe('5. Detention Auto-Release Countdown', () => {
    it('automatically releases player when detention countdown reaches 0 via turn progression', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Prisoner', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Guarantor', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Prisoner has detentionTurns = 0 (final attempt)
      state = {
        ...state,
        players: [
          {
            ...state.players[0],
            inDetention: true,
            detentionTurns: 0,
          },
          state.players[1],
        ],
        activePlayerIndex: 1, // Currently Guarantor's turn
      };

      // Guarantor ends turn -> advances to Prisoner
      state = advanceTurn(state);
      expect(state.activePlayerIndex).toBe(0);

      // On final failed attempt (detentionTurns = 0), rolling non-double forces bail and releases prisoner
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
    });
  });
});
