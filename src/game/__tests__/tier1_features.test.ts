import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { rollSingleDie, rollTwoDice, calculateNewPosition } from '../dice/diceEngine';
import {
  canBuyProperty,
  canUpgradeProperty,
  calculateRent,
  hasDistrictMonopoly,
  getTileById,
  getTilesInDistrict,
} from '../property/propertyEngine';
import {
  calculatePlayerNetWorth,
  transferCash,
  liquidateBankruptPlayer,
} from '../economy/economyEngine';
import { BOARD_SIZE, DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { PlayerState, PropertyOwnership } from '../types';

describe('Tier 1: Feature Coverage (Core Engine Happy Paths)', () => {
  describe('1. Dice Engine', () => {
    it('generates random single die roll between 1 and 6', () => {
      for (let i = 0; i < 50; i++) {
        const roll = rollSingleDie();
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
        expect(Number.isInteger(roll)).toBe(true);
      }
    });

    it('generates two dice roll with accurate sum and double detection', () => {
      // Test deterministic values
      const doubleRoll = rollTwoDice([4, 4]);
      expect(doubleRoll.dice).toEqual([4, 4]);
      expect(doubleRoll.sum).toBe(8);
      expect(doubleRoll.isDouble).toBe(true);

      const nonDoubleRoll = rollTwoDice([2, 5]);
      expect(nonDoubleRoll.dice).toEqual([2, 5]);
      expect(nonDoubleRoll.sum).toBe(7);
      expect(nonDoubleRoll.isDouble).toBe(false);

      // Test randomized rolls stay within bounds [2..12]
      for (let i = 0; i < 20; i++) {
        const result = rollTwoDice();
        expect(result.sum).toBeGreaterThanOrEqual(2);
        expect(result.sum).toBeLessThanOrEqual(12);
        expect(result.isDouble).toBe(result.dice[0] === result.dice[1]);
      }
    });
  });

  describe('2. Piece Movement & Board Wrap-around', () => {
    it('advances player position normally within board limits', () => {
      const move = calculateNewPosition(0, 5, BOARD_SIZE);
      expect(move.newPosition).toBe(5);
      expect(move.passedStart).toBe(false);
    });

    it('wraps around the 40-tile board correctly and flags passedStart', () => {
      // Moving from tile 38 by 4 steps on a 40-tile board -> lands on tile 2
      const wrap = calculateNewPosition(38, 4, BOARD_SIZE);
      expect(wrap.newPosition).toBe(2);
      expect(wrap.passedStart).toBe(true);
    });

    it('handles landing precisely on START (tile 0)', () => {
      // Moving from tile 35 by 5 steps -> lands on tile 0
      const landOnStart = calculateNewPosition(35, 5, BOARD_SIZE);
      expect(landOnStart.newPosition).toBe(0);
      expect(landOnStart.passedStart).toBe(true);
    });
  });

  describe('3. Game Setup & Player Initialization', () => {
    it('initializes game for 2, 3, or 4 players with default cash and zero position', () => {
      const state2P = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });
      expect(state2P.players.length).toBe(2);
      expect(state2P.players[0].cash).toBe(1500);
      expect(state2P.players[1].cash).toBe(1500);
      expect(state2P.status).toBe('PLAYING');
      expect(state2P.roundNumber).toBe(1);

      const state4P = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: DEFAULT_PLAYER_TOKENS.map((token, idx) => ({
          name: `Player ${idx + 1}`,
          token,
        })),
      });
      expect(state4P.players.length).toBe(4);
      expect(state4P.players.every(p => p.position === 0)).toBe(true);
      expect(state4P.players.every(p => !p.isBankrupt)).toBe(true);
    });
  });

  describe('4. Property Acquisition', () => {
    it('allows purchasing unowned property when player has sufficient funds', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      const tile1 = getTileById(1);
      const price = tile1!.property!.basePrice; // 60

      const canBuy = canBuyProperty(1, state.players[0].cash, state.properties);
      expect(canBuy.canBuy).toBe(true);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.properties[1]?.ownerId).toBe('player-1');
      expect(state.properties[1]?.level).toBe(0);
      expect(state.players[0].cash).toBe(1500 - price);
      expect(state.players[0].stats.propertiesOwned).toBe(1);
    });

    it('rejects buying already owned property or non-property tile', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
      };

      const ownedCheck = canBuyProperty(1, 1500, properties);
      expect(ownedCheck.canBuy).toBe(false);
      expect(ownedCheck.reason).toContain('đã có chủ sở hữu');

      // Tile 0 is START, not PROPERTY
      const startCheck = canBuyProperty(0, 1500, properties);
      expect(startCheck.canBuy).toBe(false);
    });
  });

  describe('5. Rent Calculation & Monopoly Doubling', () => {
    it('calculates base rent for non-monopoly un-upgraded property', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
      };

      const tile1 = getTileById(1);
      const baseRent = tile1!.property!.baseRent; // 2
      const rent = calculateRent(1, properties, 1);
      expect(rent.rentAmount).toBe(baseRent);
      expect(rent.isMonopoly).toBe(false);
      expect(rent.ownerId).toBe('player-1');
    });

    it('doubles base rent when player holds complete district monopoly', () => {
      // District Brown contains tiles 1 and 3 (Cần Thơ)
      const brownTiles = getTilesInDistrict('district-brown');
      expect(brownTiles.length).toBe(2);

      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
        3: { ownerId: 'player-1', level: 0 },
      };

      expect(hasDistrictMonopoly('district-brown', 'player-1', properties)).toBe(true);
      expect(hasDistrictMonopoly('district-brown', 'player-2', properties)).toBe(false);

      const tile1 = getTileById(1)!;
      const tile3 = getTileById(3)!;

      // Rent for tile 1 (baseRent = 2) doubled to 4
      const rent1 = calculateRent(1, properties, 1);
      expect(rent1.isMonopoly).toBe(true);
      expect(rent1.rentAmount).toBe(tile1.property!.baseRent * 2);

      // Rent for tile 3 (baseRent = 4) doubled to 8
      const rent3 = calculateRent(3, properties, 1);
      expect(rent3.isMonopoly).toBe(true);
      expect(rent3.rentAmount).toBe(tile3.property!.baseRent * 2);
    });
  });

  describe('6. 5-Tier / Multi-Level Property Upgrades', () => {
    it('allows upgrades for any owned property with enough cash (no monopoly needed)', () => {
      // Simplified by client request: the monopoly requirement was removed.
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
        3: { ownerId: 'player-1', level: 0 },
      };
      expect(canUpgradeProperty(1, 'player-1', 500, properties).canUpgrade).toBe(true);

      // Owning just this tile is enough now.
      const singleTile: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
        3: { ownerId: 'player-2', level: 0 },
      };
      expect(canUpgradeProperty(1, 'player-1', 500, singleTile).canUpgrade).toBe(true);

      // Cash is the remaining gate.
      expect(canUpgradeProperty(1, 'player-1', 10, singleTile).canUpgrade).toBe(false);
    });

    it('scales rent progressively across upgrade levels up to Sky Tower', () => {
      const tile1 = getTileById(1);
      const houseRent = tile1!.property!.houseRent; // [10, 30, 90, 160, 250]
      expect(houseRent).toEqual([10, 30, 90, 160, 250]);

      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 1 },
        3: { ownerId: 'player-1', level: 0 },
      };

      // Level 1: houseRent[0] = 10
      expect(calculateRent(1, properties, 1).rentAmount).toBe(houseRent[0]);

      // Level 2: houseRent[1] = 30
      properties[1].level = 2;
      expect(calculateRent(1, properties, 1).rentAmount).toBe(houseRent[1]);

      // Level 3: houseRent[2] = 90
      properties[1].level = 3;
      expect(calculateRent(1, properties, 1).rentAmount).toBe(houseRent[2]);

      // Level 4: houseRent[3] = 160
      properties[1].level = 4;
      expect(calculateRent(1, properties, 1).rentAmount).toBe(houseRent[3]);

      // Level 5 (Landmark / Sky Tower): houseRent[4] = 250
      properties[1].level = 5;
      expect(calculateRent(1, properties, 1).rentAmount).toBe(houseRent[4]);
    });
  });

  describe('7. Cash Transfer & Net Worth Valuation', () => {
    it('transfers cash between players accurately and updates statistics', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Alice',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 500,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
      };
      const p2: PlayerState = {
        ...p1,
        id: 'p2',
        name: 'Bob',
        cash: 300,
      };

      const result = transferCash(p1, p2, 100);
      expect(result.actualPaid).toBe(100);
      expect(result.fromPlayerUpdated.cash).toBe(400);
      expect(result.toPlayerUpdated.cash).toBe(400);
      expect(result.fromPlayerUpdated.stats.rentPaid).toBe(100);
      expect(result.toPlayerUpdated.stats.rentCollected).toBe(100);
    });

    it('calculates total net worth including cash and improved properties', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Alice',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 1000,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };
      // Tile 1: basePrice 60, upgradeCost 50
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 2 },
      };

      // Net worth = 1000 cash + 60 base + (2 * 50 upgrade) = 1160
      const netWorth = calculatePlayerNetWorth(p1, properties);
      expect(netWorth).toBe(1160);
    });
  });

  describe('8. Jail / Detention Bail Payment & Release', () => {
    it('releases player from detention upon paying bail', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Put Alice in detention
      state = {
        ...state,
        players: [
          {
            ...state.players[0],
            inDetention: true,
            detentionTurns: 2,
            position: 10,
          },
          state.players[1],
        ],
      };

      // Pay bail ($100M)
      state = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].cash).toBe(1500 - state.config.detentionBailCost); // 1500 - 50 = 1450
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });
  });

  describe('9. Bankruptcy & Victory Condition', () => {
    it('liquidates properties to bank and eliminates bankrupt player', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 2 },
        3: { ownerId: 'p2', level: 1 },
      };

      const liquidated = liquidateBankruptPlayer('p1', properties, null);
      expect(liquidated[1].ownerId).toBeNull();
      expect(liquidated[1].level).toBe(0);
      expect(liquidated[3].ownerId).toBe('p2'); // untouched
    });

    it('declares single solvent survivor as winner', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Champion', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Defeated', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.status).toBe('ENDED');
      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.winner?.id).toBe('player-1');
      expect(state.winner?.name).toBe('Champion');
    });
  });
});
