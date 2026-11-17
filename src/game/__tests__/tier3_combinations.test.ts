import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { calculateRent } from '../property/propertyEngine';
import { liquidateBankruptPlayer } from '../economy/economyEngine';
import { applyChaosCard } from '../chaos-engine/chaosEngine';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { ChaosCard, PropertyOwnership } from '../types';

describe('Tier 3: Cross-Feature Combinations & Complex Interactions', () => {
  describe('1. Rent Payment Triggering Debt Crisis & Bankruptcy Check', () => {
    it('transitions to BANKRUPTCY_CHECK when tenant cannot afford full rent', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Tenant', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Landlord', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Landlord owns tile 1 with level 3 (rent: 90)
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-2', level: 3 },
        },
        players: [
          { ...state.players[0], cash: 50, position: 0 }, // Tenant only has $50M (< 90 rent)
          { ...state.players[1], cash: 1000 },
        ],
        activePlayerIndex: 0,
      };

      // Tenant rolls 1 -> lands on tile 1 (rent 90 > cash 50)
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] as any });

      // Landlord received all remaining $50M available
      expect(state.players[1].cash).toBe(1050);
      expect(state.players[0].cash).toBe(0);
      // State enters BANKRUPTCY_CHECK phase!
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');

      // Tenant declares bankruptcy
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      expect(state.status).toBe('ENDED');
      expect(state.winner?.id).toBe('player-2');
    });
  });

  describe('2. Doubles Roll Escaping Detention vs Non-Doubles Imprisonment', () => {
    it('escapes detention immediately when rolling doubles without granting extra turn', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Inmate', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Guard', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Put Inmate in detention
      state = {
        ...state,
        players: [
          { ...state.players[0], inDetention: true, detentionTurns: 2, position: 10 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      // Roll double [4, 4] while in detention
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.players[0].position).toBe(18); // 10 + 8
      expect(state.isDouble).toBe(false); // Double escape does NOT give extra roll
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.logs[0].message).toContain('[THOÁT GIAM]');
    });

    it('decrements detentionTurns and remains in detention when rolling non-doubles', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Inmate', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Guard', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      state = {
        ...state,
        players: [
          { ...state.players[0], inDetention: true, detentionTurns: 2, position: 10 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      // Roll non-double [2, 5]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 5] });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(1);
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.logs[0].message).toContain('tiếp tục ở lại Khu Cách Ly');
    });
  });

  describe('3. Cascading Bankruptcies Across Multiple Players', () => {
    it('correctly advances turn skipping bankrupt players and declares last survivor winner', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Survivor', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Victim1', token: DEFAULT_PLAYER_TOKENS[1] },
          { name: 'Victim2', token: DEFAULT_PLAYER_TOKENS[2] },
          { name: 'Victim3', token: DEFAULT_PLAYER_TOKENS[3] },
        ],
      });

      expect(state.players.length).toBe(4);

      // Victim1 goes bankrupt
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.status).toBe('PLAYING');
      expect(state.players[1].isBankrupt).toBe(true);

      // Victim2 goes bankrupt
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-3' });
      expect(state.status).toBe('PLAYING');
      expect(state.players[2].isBankrupt).toBe(true);

      // Victim3 goes bankrupt -> Only Survivor remains!
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-4' });
      expect(state.status).toBe('ENDED');
      expect(state.winner?.id).toBe('player-1');
      expect(state.winner?.name).toBe('Survivor');
      expect(state.turnPhase).toBe('GAME_OVER');
    });
  });

  describe('4. Chaos Engine Cross-System Mutations', () => {
    it('applies CASH_STEAL taking only available funds from opponents without negative cash', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Thief', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'RichOpponent', token: DEFAULT_PLAYER_TOKENS[1] },
          { name: 'PoorOpponent', token: DEFAULT_PLAYER_TOKENS[2] },
          { name: 'BankruptOpponent', token: DEFAULT_PLAYER_TOKENS[3] },
        ],
      });

      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 200 },
          { ...state.players[1], cash: 500 },
          { ...state.players[2], cash: 30 }, // only 30 cash available
          { ...state.players[3], cash: 0, isBankrupt: true }, // Bankrupt
        ],
        activePlayerIndex: 0,
      };

      const stealCard: ChaosCard = {
        id: 'cyber-heist-test',
        title: 'Cyber Heist',
        tagline: 'Steal',
        flavorText: 'Steal 80 from each',
        rarity: 'RARE',
        effectType: 'CASH_STEAL',
        value: 80,
        iconName: 'Skull',
      };

      state = applyChaosCard(state, stealCard);

      // RichOpponent lost 80 (500 -> 420): within the 25% cap (125)
      expect(state.players[1].cash).toBe(420);
      // PoorOpponent has 30: the 25% cap limits the loss to 7 (30 -> 23), never negative
      // (roadmap C damage cap; previously the whole 30 was taken)
      expect(state.players[2].cash).toBe(23);
      // Bankrupt opponent skipped
      expect(state.players[3].cash).toBe(0);
      // Thief collected 80 + 7 = 87 (200 + 87 = 287)
      expect(state.players[0].cash).toBe(287);
    });

    it('multiplies rent with RENT_MULTIPLIER chaos card and resets on turn end', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      const card: ChaosCard = {
        id: 'inflation-test',
        title: 'Hyperinflation',
        tagline: 'Rent 2x',
        flavorText: 'Rent doubled',
        rarity: 'CALAMITY',
        effectType: 'RENT_MULTIPLIER',
        value: 2,
        iconName: 'TrendingUp',
      };

      state = applyChaosCard(state, card);
      expect(state.rentModifier).toBe(2);

      // Tile 1 baseRent is 2. With rentModifier = 2 -> rent is 4
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
      };
      const rentCalc = calculateRent(1, properties, state.rentModifier);
      expect(rentCalc.rentAmount).toBe(4);

      // Ending turn resets rentModifier to 1
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.rentModifier).toBe(1);
    });

    it('teleports player to START (tile 0) and awards salary bonus', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Teleporter', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Other', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Start Teleporter at tile 15 with $1500M cash
      state = {
        ...state,
        players: [
          { ...state.players[0], position: 15, cash: 1500 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      const teleportCard: ChaosCard = {
        id: 'teleport-start',
        title: 'Quantum Warp',
        tagline: 'To START',
        flavorText: 'Teleport to START',
        rarity: 'UNCOMMON',
        effectType: 'TELEPORT',
        targetTileId: 0,
        value: 0,
        iconName: 'Navigation',
      };

      state = applyChaosCard(state, teleportCard);
      expect(state.players[0].position).toBe(0);
      expect(state.players[0].cash).toBe(1700); // 1500 + 200 salary
    });

    it('taxes player per property and level with PROPERTY_TAX', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Taxpayer', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Other', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Taxpayer owns tile 1 (level 2) and tile 3 (level 0)
      // Total count = (1 + 2) + (1 + 0) = 4 units
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 2 },
          3: { ownerId: 'player-1', level: 0 },
        },
        players: [
          { ...state.players[0], cash: 1000 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      const taxCard: ChaosCard = {
        id: 'property-tax-test',
        title: 'Audit',
        tagline: 'Audit',
        flavorText: 'Pay 50 per unit',
        rarity: 'UNCOMMON',
        effectType: 'PROPERTY_TAX',
        value: 50,
        iconName: 'Receipt',
      };

      state = applyChaosCard(state, taxCard);
      // Tax = 4 * 50 = 200. Cash = 1000 - 200 = 800
      expect(state.players[0].cash).toBe(800);
    });
  });

  describe('5. Creditor Liquidation & Subsequent Rent Collection', () => {
    it('transfers all debtor properties to creditor upon liquidation', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'debtor', level: 2 },
        3: { ownerId: 'debtor', level: 1 },
        6: { ownerId: 'bystander', level: 0 },
      };

      const transferred = liquidateBankruptPlayer('debtor', properties, 'creditor');

      expect(transferred[1].ownerId).toBe('creditor');
      expect(transferred[1].level).toBe(2); // level preserved
      expect(transferred[3].ownerId).toBe('creditor');
      expect(transferred[6].ownerId).toBe('bystander'); // untouched

      // Creditor can now collect rent on the inherited property
      // Tile 1 houseRent: [10, 30, 90, 160, 250]. Level 2 -> 30
      const rent = calculateRent(1, transferred, 1);
      expect(rent.ownerId).toBe('creditor');
      expect(rent.rentAmount).toBe(30);
    });
  });
});
