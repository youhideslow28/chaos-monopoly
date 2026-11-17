import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { calculateNewPosition, rollTwoDice } from '../dice/diceEngine';
import {
  canBuyProperty,
  canUpgradeProperty,
  canDowngradeProperty,
  canMortgageProperty,
  canUnmortgageProperty,
  calculateRent,
  getTileById,
  getMortgageValue,
  getUnmortgageCost,
} from '../property/propertyEngine';
import { calculatePlayerNetWorth, calculateMaxLiquidationValue, liquidateBankruptPlayer } from '../economy/economyEngine';
import { evaluateWinCondition } from '../win-condition/winCondition';
import { advanceTurn } from '../turn-manager/turnManager';
import { BOARD_SIZE, BOARD_TILES, DEFAULT_PLAYER_TOKENS, TILE_GRID_POSITIONS_40 } from '../board/boardData';
import { applyChaosCard } from '../chaos-engine/chaosEngine';
import { ChaosCard, PropertyOwnership } from '../types';

describe('CHAOS MONOPOLY — Milestone 1 Core Engine & 40-Tile Board', () => {
  describe('1. 40-Tile Vietnamese Board Structure & Layout', () => {
    it('contains exactly 40 perimeter tiles with valid IDs from 0 to 39', () => {
      expect(BOARD_SIZE).toBe(40);
      expect(BOARD_TILES.length).toBe(40);
      expect(TILE_GRID_POSITIONS_40[0]).toEqual({ col: 11, row: 11 });
      expect(getTileById(1)?.shortName).toBe('Bến Ninh Kiều');
      BOARD_TILES.forEach((tile, index) => {
        expect(tile.id).toBe(index);
        expect(tile.name).toBeDefined();
        expect(tile.shortName).toBeDefined();
        expect(tile.type).toBeDefined();
        expect(tile.iconName).toBeDefined();
        expect(tile.gridPosition).toBeDefined();
        expect(tile.gridPosition?.col).toBeGreaterThanOrEqual(1);
        expect(tile.gridPosition?.col).toBeLessThanOrEqual(11);
        expect(tile.gridPosition?.row).toBeGreaterThanOrEqual(1);
        expect(tile.gridPosition?.row).toBeLessThanOrEqual(11);
      });
    });

    it('has all 4 corner anchor tiles correctly mapped', () => {
      expect(BOARD_TILES[0].type).toBe('START');
      expect(BOARD_TILES[10].type).toBe('DETENTION');
      expect(BOARD_TILES[20].type).toBe('REST_ZONE');
      expect(BOARD_TILES[30].type).toBe('GO_TO_JAIL');
    });

    it('contains 4 transport hubs and 2 utilities with proper configurations', () => {
      const transportIds = [5, 15, 25, 35];
      transportIds.forEach(id => {
        const tile = BOARD_TILES[id];
        expect(tile.type).toBe('TRANSPORT');
        expect(tile.property?.districtColor).toBe('district-transport');
        expect(tile.property?.basePrice).toBe(200);
      });

      const utilityIds = [12, 28];
      utilityIds.forEach(id => {
        const tile = BOARD_TILES[id];
        expect(tile.type).toBe('UTILITY');
        expect(tile.property?.districtColor).toBe('district-utility');
        expect(tile.property?.basePrice).toBe(150);
      });
    });

    it('contains 8 color districts representing modern Vietnam', () => {
      const districtColors = [
        'district-brown',
        'district-lightblue',
        'district-pink',
        'district-orange',
        'district-red',
        'district-yellow',
        'district-green',
        'district-darkblue',
      ];

      districtColors.forEach(color => {
        const tiles = BOARD_TILES.filter(t => t.property?.districtColor === color);
        expect(tiles.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('2. Dice Engine & 40-Tile Wrap-Around Movement', () => {
    it('correctly calculates position wrap-around on 40-tile board and detects passedStart', () => {
      // Starting from Tile 38, rolling 4 -> lands on Tile 2, passedStart = true
      const wrapResult = calculateNewPosition(38, 4, 40);
      expect(wrapResult.newPosition).toBe(2);
      expect(wrapResult.passedStart).toBe(true);

      // Normal movement without wrap-around
      const normalResult = calculateNewPosition(5, 7, 40);
      expect(normalResult.newPosition).toBe(12);
      expect(normalResult.passedStart).toBe(false);

      // Landing exactly on START (Tile 0)
      const exactStartResult = calculateNewPosition(35, 5, 40);
      expect(exactStartResult.newPosition).toBe(0);
      expect(exactStartResult.passedStart).toBe(true);
    });

    it('rolls 2d6 dice, calculates sum, and accurately detects doubles', () => {
      const result = rollTwoDice([3, 4]);
      expect(result.sum).toBe(7);
      expect(result.isDouble).toBe(false);

      const doubleResult = rollTwoDice([5, 5]);
      expect(doubleResult.sum).toBe(10);
      expect(doubleResult.isDouble).toBe(true);
    });
  });

  describe('3. Game Setup & Initial State', () => {
    it('initializes game state with 40-tile properties and starting capital', () => {
      const state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      expect(state.status).toBe('PLAYING');
      expect(state.players.length).toBe(2);
      expect(state.players[0].cash).toBe(1500);
      expect(state.players[0].position).toBe(0);
      expect(state.activePlayerIndex).toBe(0);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      // Properties initialized
      expect(state.properties[1]).toBeDefined();
      expect(state.properties[1].ownerId).toBeNull();
      expect(state.properties[1].level).toBe(0);
      expect(state.properties[1].isMortgaged).toBe(false);
    });
  });

  describe('4. Property Acquisition & Purchasing', () => {
    it('allows buying unowned property and deducts exact base price', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Player 1', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Player 2', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Tile 1: Bến Ninh Kiều (basePrice: 60)
      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.players[0].cash).toBe(1440); // 1500 - 60
      expect(state.properties[1]?.ownerId).toBe('player-1');
      expect(state.properties[1]?.level).toBe(0);
      expect(state.properties[1]?.isMortgaged).toBe(false);

      // Player 2 cannot buy already owned property
      const checkCanBuy = canBuyProperty(1, 1500, state.properties);
      expect(checkCanBuy.canBuy).toBe(false);
    });
  });

  describe('5. 5-Tier Property Upgrades & Rent Calculations', () => {
    it('doubles base rent on unimproved properties when full color set is owned', () => {
      // District Cần Thơ (Đồng Bằng) has tiles 1 & 3
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: false },
        3: { ownerId: 'player-1', level: 0, isMortgaged: false },
      };

      // Base rent of Tile 1 is 2. With monopoly doubling -> 4
      const rentResult = calculateRent(1, properties, 1);
      expect(rentResult.isMonopoly).toBe(true);
      expect(rentResult.rentAmount).toBe(4);
    });

    it('scales rent across all 5 upgrade tiers (Base, 1★, 2★, 3★, 4★, Landmark 5★)', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: false },
        3: { ownerId: 'player-1', level: 0, isMortgaged: false },
      };

      // Tile 1 houseRent: [10, 30, 90, 160, 250]
      const expectedRents = [10, 30, 90, 160, 250];

      for (let level = 1; level <= 5; level++) {
        properties[1].level = level;
        const rent = calculateRent(1, properties, 1);
        expect(rent.rentAmount).toBe(expectedRents[level - 1]);
      }
    });

    it('upgrades and downgrades freely on owned tiles (even-building rules removed)', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: false },
        3: { ownerId: 'player-1', level: 0, isMortgaged: false },
      };

      // Player 1 can upgrade Tile 1 to Level 1
      const checkUpgrade1 = canUpgradeProperty(1, 'player-1', 1000, properties);
      expect(checkUpgrade1.canUpgrade).toBe(true);

      properties[1].level = 1;
      // Even Building Rule was removed (client request): level 2 is allowed immediately.
      const checkUpgrade2 = canUpgradeProperty(1, 'player-1', 1000, properties);
      expect(checkUpgrade2.canUpgrade).toBe(true);

      // Sibling level no longer gates this tile either.
      properties[1].level = 1;
      // Now Tile 1 can be upgraded to Level 2
      const checkUpgrade3 = canUpgradeProperty(1, 'player-1', 1000, properties);
      expect(checkUpgrade3.canUpgrade).toBe(true);

      // Downgrade check: Can downgrade Tile 1 (75% refund at Round 1)
      const checkDowngrade = canDowngradeProperty(1, 'player-1', properties);
      expect(checkDowngrade.canDowngrade).toBe(true);
      expect(checkDowngrade.refundAmount).toBe(38); // 75% of 50k upgradeCost
    });
  });

  describe('6. Transport Hubs & Utility Rent Scaling', () => {
    it('scales transport hub rent from $25k to $200k based on owned hub count', () => {
      const properties: Record<number, PropertyOwnership> = {
        5: { ownerId: 'player-1', level: 0, isMortgaged: false },
        15: { ownerId: 'player-2', level: 0, isMortgaged: false },
        25: { ownerId: 'player-2', level: 0, isMortgaged: false },
        35: { ownerId: 'player-2', level: 0, isMortgaged: false },
      };

      // Player 1 owns 1 hub (Tile 5) -> $25k
      expect(calculateRent(5, properties, 1).rentAmount).toBe(25);

      // Player 2 owns 3 hubs (Tiles 15, 25, 35) -> $100k
      expect(calculateRent(15, properties, 1).rentAmount).toBe(100);

      // Player 2 buys all 4 hubs -> $200k
      properties[5].ownerId = 'player-2';
      expect(calculateRent(5, properties, 1).rentAmount).toBe(200);
    });

    it('calculates utility rent based on dice roll (4x for 1 utility, 10x for 2 utilities)', () => {
      const properties: Record<number, PropertyOwnership> = {
        12: { ownerId: 'player-1', level: 0, isMortgaged: false },
        28: { ownerId: 'player-2', level: 0, isMortgaged: false },
      };

      // Player 1 owns 1 utility (Tile 12 SAWACO), dice roll sum 8 -> 4 * 8 = 32k
      expect(calculateRent(12, properties, 1, 8).rentAmount).toBe(32);

      // Player 1 owns both utilities (Tiles 12 & 28), dice roll sum 8 -> 10 * 8 = 80k
      properties[28].ownerId = 'player-1';
      expect(calculateRent(12, properties, 1, 8).rentAmount).toBe(80);
    });
  });

  describe('7. Mortgage, Unmortgage & Solvency', () => {
    it('calculates mortgage value at 60% and unmortgage cost with +10% interest', () => {
      // Tile 1: basePrice = 60 -> 60% = 36 -> floor(36 * 1.10) = 39
      expect(getMortgageValue(1)).toBe(36);
      expect(getUnmortgageCost(1)).toBe(39);
    });

    it('prohibits rent collection on mortgaged properties and validates eligibility', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: false },
      };
      expect(canMortgageProperty(1, 'player-1', properties).canMortgage).toBe(true);

      properties[1].isMortgaged = true;
      expect(canUnmortgageProperty(1, 'player-1', 1000, properties).canUnmortgage).toBe(true);
      const rent = calculateRent(1, properties, 1);
      expect(rent.rentAmount).toBe(0);
    });

    it('allows mortgaging and unmortgaging via game actions', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Investor', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Rival', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Buy Tile 1 (cost 60 -> cash 1440)
      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.players[0].cash).toBe(1440);

      // Mortgage Tile 1 (+36 -> cash 1476)
      state = gameReducer(state, { type: 'MORTGAGE_PROPERTY', tileId: 1 });
      expect(state.properties[1]?.isMortgaged).toBe(true);
      expect(state.players[0].cash).toBe(1476);

      // Unmortgage Tile 1 (-39 -> cash 1437)
      state = gameReducer(state, { type: 'UNMORTGAGE_PROPERTY', tileId: 1 });
      expect(state.properties[1]?.isMortgaged).toBe(false);
      expect(state.players[0].cash).toBe(1437);
    });
  });

  describe('8. Jail / Detention & Doubles Mechanics', () => {
    it('sends player directly to Detention on 3rd consecutive doubles', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Roller', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Waiter', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Roll double 1
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[0].consecutiveDoubles).toBe(1);

      // Roll double 2
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.players[0].consecutiveDoubles).toBe(2);

      // Roll double 3 -> Detention!
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.isDouble).toBe(false);
    });

    it('sends player directly to Detention when landing on Tile 30 (GO_TO_JAIL)', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Walker', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Observer', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      state.players[0].position = 25;
      // Rolls 5 -> lands on Tile 30
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].position).toBe(10);
    });

    it('releases player from detention upon paying bail', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Inmate', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Guard', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;

      state = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].cash).toBe(1400); // 1500 - 100
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });
  });

  describe('9. Solvency, Debt Liquidation & Bankruptcy', () => {
    it('calculates player net worth taking into account properties and mortgage debts', () => {
      const player = {
        id: 'player-1',
        name: 'Tycoon',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 1000,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };

      // Owns Tile 1 (base: 60, upgrade: 50 * level 2 = 100) -> 160. Total net worth = 1000 + 160 = 1160
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 2, isMortgaged: false },
      };

      expect(calculatePlayerNetWorth(player, properties)).toBe(1160);

      // If mortgaged, subtracts mortgage debt (36)
      properties[1].isMortgaged = true;
      expect(calculatePlayerNetWorth(player, properties)).toBe(1124);
      expect(calculateMaxLiquidationValue(player, properties)).toBeGreaterThan(0);
    });

    it('liquidates bankrupt player properties to creditor or bank', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 2, isMortgaged: false },
        3: { ownerId: 'p1', level: 0, isMortgaged: true },
      };

      // Liquidate to bank
      const bankLiquidation = liquidateBankruptPlayer('p1', properties, null);
      expect(bankLiquidation[1].ownerId).toBeNull();
      expect(bankLiquidation[1].level).toBe(0);
      expect(bankLiquidation[1].isMortgaged).toBe(false);

      // Liquidate to creditor
      const creditorLiquidation = liquidateBankruptPlayer('p1', properties, 'p2');
      expect(creditorLiquidation[1].ownerId).toBe('p2');
      expect(creditorLiquidation[3].ownerId).toBe('p2');
      expect(creditorLiquidation[3].isMortgaged).toBe(true);
    });
  });

  describe('10. Victory Conditions: Last Man Standing & 60-Round Cap', () => {
    it('declares single solvent survivor as winner when opponents go bankrupt', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Survivor', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bankrupt', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.status).toBe('ENDED');
      expect(state.winner?.id).toBe('player-1');
      expect(state.turnPhase).toBe('GAME_OVER');
    });

    it('triggers game over at round 60 and awards victory to highest Net Worth player', () => {
      const players = [
        {
          id: 'p1',
          name: 'Player 1',
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
          name: 'Player 2',
          token: DEFAULT_PLAYER_TOKENS[1],
          cash: 2500, // Higher Net Worth
          position: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          consecutiveDoubles: 0,
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
        },
      ];

      const winResult = evaluateWinCondition(players, {}, 60, 60);
      expect(winResult.isGameOver).toBe(true);
      expect(winResult.reason).toBe('MAX_ROUNDS_REACHED');
      expect(winResult.winner?.id).toBe('p2');
    });

    it('advances turn cleanly across active players', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });
      const nextState = advanceTurn(state);
      expect(nextState.activePlayerIndex).toBe(1);
    });
  });

  describe('11. Chaos Card Integration', () => {
    it('correctly applies Chaos cards and changes state', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Hacker', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Victim', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      const testCard: ChaosCard = {
        id: 'test-jackpot',
        title: 'Kho báu bất ngờ',
        tagline: 'Tiền thưởng',
        flavorText: 'Nhận $300k VND',
        rarity: 'COMMON',
        effectType: 'CASH_SELF',
        value: 300,
        iconName: 'Coins',
      };

      state = applyChaosCard(state, testCard);
      expect(state.players[0].cash).toBe(1800);
      expect(state.activeChaosCard?.id).toBe('test-jackpot');
    });
  });
});
