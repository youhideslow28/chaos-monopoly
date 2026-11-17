import { describe, it, expect, vi } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../../gameReducer';

// Roadmap C: chest/chaos landings draw from the expanded deck, which can move a player and
// blur the salary rule under test. Landings draw a neutral visual-only card in this file.
vi.mock('../../chaos-engine/chaosEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../chaos-engine/chaosEngine')>();
  return {
    ...actual,
    drawRandomChaosCard: () => ({
      id: 'env-river-cleanup',
      title: 'Neutral',
      tagline: '',
      flavorText: '',
      rarity: 'COMMON',
      effectType: 'VISION_SHIFT',
      value: 0,
      iconName: 'Leaf',
      category: 'ENVIRONMENT',
    }),
  };
});
import {
  canBuyProperty,
  canUpgradeProperty,
  canDowngradeProperty,
  canMortgageProperty,
  canUnmortgageProperty,
  calculateRent,
  getTileById,
  getUnmortgageCost,
} from '../../property/propertyEngine';
import { evaluateWinCondition } from '../../win-condition/winCondition';
import { DEFAULT_PLAYER_TOKENS } from '../../board/boardData';
import { GameState, PlayerState, PropertyOwnership } from '../../types';

describe('Tier 1: Feature Coverage (Core Systems Happy Paths)', () => {
  // Helper to construct a clean 2-player state
  function create2PGame(configOverrides = {}): GameState {
    return gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'Nguyễn Văn A', token: DEFAULT_PLAYER_TOKENS[0] },
        { name: 'Trần Thị B', token: DEFAULT_PLAYER_TOKENS[1] },
      ],
      config: configOverrides,
    });
  }

  // Helper to construct a clean 4-player state
  function create4PGame(configOverrides = {}): GameState {
    return gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'Player 1', token: DEFAULT_PLAYER_TOKENS[0] },
        { name: 'Player 2', token: DEFAULT_PLAYER_TOKENS[1] },
        { name: 'Player 3', token: DEFAULT_PLAYER_TOKENS[2] },
        { name: 'Player 4', token: DEFAULT_PLAYER_TOKENS[3] },
      ],
      config: configOverrides,
    });
  }

  // -------------------------------------------------------------------------
  // F01: Match Setup, Turn Lifecycle & State Transitions
  // -------------------------------------------------------------------------
  describe('F01: Match Setup, Turn Lifecycle & State Transitions', () => {
    it('1.1: initializes 2-player match with default starting cash ($1500k), 0 positions, and empty initial ownership', () => {
      const state = create2PGame();
      expect(state.status).toBe('PLAYING');
      expect(state.players.length).toBe(2);
      expect(state.players[0].cash).toBe(1500);
      expect(state.players[1].cash).toBe(1500);
      expect(state.players[0].position).toBe(0);
      expect(state.players[1].position).toBe(0);
      expect(state.activePlayerIndex).toBe(0);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
      expect(state.roundNumber).toBe(1);
      // All property tiles should be unowned
      expect(state.properties[1]?.ownerId).toBeNull();
      expect(state.properties[1]?.level).toBe(0);
    });

    it('1.2: initializes 3-player match with custom player names and assigned tokens', () => {
      const state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Hải Phòng', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Đà Nẵng', token: DEFAULT_PLAYER_TOKENS[1] },
          { name: 'Cần Thơ', token: DEFAULT_PLAYER_TOKENS[2] },
        ],
      });
      expect(state.players.length).toBe(3);
      expect(state.players[0].name).toBe('Hải Phòng');
      expect(state.players[1].name).toBe('Đà Nẵng');
      expect(state.players[2].name).toBe('Cần Thơ');
      expect(state.players.every(p => p.cash === 1500 && p.position === 0)).toBe(true);
    });

    it('1.3: initializes 4-player match with all initial parameters valid and status PLAYING', () => {
      const state = create4PGame();
      expect(state.players.length).toBe(4);
      expect(state.status).toBe('PLAYING');
      expect(state.roundNumber).toBe(1);
      expect(state.players.every(p => !p.isBankrupt && !p.inDetention)).toBe(true);
    });

    it('1.4: advances activePlayerIndex sequentially across players on END_TURN', () => {
      let state = create4PGame();
      expect(state.activePlayerIndex).toBe(0);

      // Simulate player 1 taking non-double turn and ending
      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(2);

      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(3);
    });

    it('1.5: increments roundNumber when turn wraps from last player to first player', () => {
      let state = create2PGame();
      expect(state.roundNumber).toBe(1);

      // Player 1 finishes turn
      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.roundNumber).toBe(1);

      // Player 2 finishes turn -> round wraps to Player 1, roundNumber becomes 2
      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);
      expect(state.roundNumber).toBe(2);
    });

    it('1.6: skips bankrupt players during turn advancement', () => {
      let state = create4PGame();
      // Mark player 2 (index 1) as bankrupt
      state.players[1].isBankrupt = true;

      // Player 1 finishes turn -> should skip Player 2 and advance straight to Player 3 (index 2)
      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // F02: 2d6 Movement, Doubles & Extra Turns
  // -------------------------------------------------------------------------
  describe('F02: 2d6 Movement, Doubles & Extra Turns', () => {
    it('2.1: calculates 2d6 dice rolls and advances active player position correctly', () => {
      let state = create2PGame();
      // Roll [3, 4] = 7 from position 0 -> lands on tile 7
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 4] });
      expect(state.players[0].position).toBe(7);
      expect(state.dice).toEqual([3, 4]);
      expect(state.isDouble).toBe(false);
      expect(state.players[0].stats.tilesTraveled).toBe(7);
    });

    it('2.2: handles board wrap-around modulo 40 when position + roll exceeds BOARD_SIZE', () => {
      let state = create2PGame();
      state.players[0].position = 36;
      // Roll [4, 5] = 9 from 36 -> (36 + 9) % 40 = 5
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 5] });
      expect(state.players[0].position).toBe(5);
    });

    it('2.3: identifies double dice rolls and sets isDouble to true', () => {
      let state = create2PGame();
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [5, 5] });
      expect(state.isDouble).toBe(true);
      expect(state.players[0].consecutiveDoubles).toBe(1);
    });

    it('2.4: grants extra turn (turnPhase WAITING_FOR_ROLL, same active player) when END_TURN is called after a double roll', () => {
      let state = create2PGame();
      // Player 1 rolls double [3, 3] -> position 6
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.isDouble).toBe(true);
      expect(state.activePlayerIndex).toBe(0);

      // Call END_TURN -> active player remains 0, turnPhase resets to WAITING_FOR_ROLL
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });

    it('2.5: tracks consecutive doubles in player state up to 2 without detention', () => {
      let state = create2PGame();
      // Roll 1: [2, 2]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[0].consecutiveDoubles).toBe(1);
      expect(state.players[0].inDetention).toBe(false);

      state = gameReducer(state, { type: 'END_TURN' }); // triggers extra turn
      // Roll 2: [4, 4]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });
      expect(state.players[0].consecutiveDoubles).toBe(2);
      expect(state.players[0].inDetention).toBe(false);
    });

    it('2.6: records tilesTraveled accurately in player statistics following movement', () => {
      let state = create2PGame();
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 5] }); // sum = 6
      expect(state.players[0].stats.tilesTraveled).toBe(6);

      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });

      // Player 2 rolls [6, 4] = 10
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [6, 4] });
      expect(state.players[1].stats.tilesTraveled).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // F03: Start Tile Rewards (Cổng Khởi Hành)
  // -------------------------------------------------------------------------
  describe('F03: Start Tile Rewards (Cổng Khởi Hành)', () => {
    it('3.1: awards passing salary ($200k) when player moves past tile 0', () => {
      let state = create2PGame();
      const initialCash = state.players[0].cash;
      state.players[0].position = 35;

      // Roll [3, 4] = 7 from 35 -> lands on tile 2, passes tile 0
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 4] });
      expect(state.players[0].position).toBe(2);
      expect(state.players[0].cash).toBe(initialCash + 200);
    });

    it('3.2: awards passing salary ($200k) when player lands exactly on tile 0', () => {
      let state = create2PGame();
      const initialCash = state.players[0].cash;
      state.players[0].position = 32;

      // Roll [4, 4] = 8 from 32 -> lands on 0
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });
      expect(state.players[0].position).toBe(0);
      expect(state.players[0].cash).toBe(initialCash + 200);
    });

    it('3.3: does not award salary when player moves within board without crossing tile 0', () => {
      let state = create2PGame();
      const initialCash = state.players[0].cash;
      state.players[0].position = 5;

      // Roll [2, 3] = 5 -> lands on tile 10 (Detention visiting)
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].cash).toBe(initialCash);
    });

    it('3.4: respects custom salaryOnStart configuration (e.g. $400k)', () => {
      let state = create2PGame({ salaryOnStart: 400 });
      const initialCash = state.players[0].cash;
      state.players[0].position = 38;

      // Roll [1, 2] = 3 -> lands on tile 1 (Bến Ninh Kiều, unowned property), passing tile 0
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.players[0].position).toBe(1);
      expect(state.players[0].cash).toBe(initialCash + 400);
    });

    it('3.5: logs salary receipt in game log entries with DICE type', () => {
      let state = create2PGame();
      state.players[0].position = 37;

      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      const diceLog = state.logs.find(l => l.type === 'DICE');
      expect(diceLog).toBeDefined();
      expect(diceLog?.message).toContain('trợ cấp');
    });
  });

  // -------------------------------------------------------------------------
  // F04: Property Acquisition & Deed Ownership
  // -------------------------------------------------------------------------
  describe('F04: Property Acquisition & Deed Ownership', () => {
    it('4.1: allows active player to buy unowned street property (tile 1) deducting exact basePrice', () => {
      let state = create2PGame();
      const tile1 = getTileById(1)!;
      const price = tile1.property!.basePrice; // 60

      const check = canBuyProperty(1, state.players[0].cash, state.properties);
      expect(check.canBuy).toBe(true);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.properties[1]?.ownerId).toBe('player-1');
      expect(state.properties[1]?.level).toBe(0);
      expect(state.players[0].cash).toBe(1500 - price);
      expect(state.players[0].stats.propertiesOwned).toBe(1);
    });

    it('4.2: allows purchasing Transport Hub (tile 5 Ga Sài Gòn) and registers ownership correctly', () => {
      let state = create2PGame();
      const tile5 = getTileById(5)!;
      expect(tile5.type).toBe('TRANSPORT');
      const price = tile5.property!.basePrice; // 200

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 5 });
      expect(state.properties[5]?.ownerId).toBe('player-1');
      expect(state.players[0].cash).toBe(1500 - price);
    });

    it('4.3: allows purchasing Utility company (tile 12 SAWACO) and registers ownership correctly', () => {
      let state = create2PGame();
      const tile12 = getTileById(12)!;
      expect(tile12.type).toBe('UTILITY');
      const price = tile12.property!.basePrice; // 150

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 12 });
      expect(state.properties[12]?.ownerId).toBe('player-1');
      expect(state.players[0].cash).toBe(1500 - price);
    });

    it('4.4: rejects purchasing already-owned property by another player', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-2', level: 0, isMortgaged: false };

      const check = canBuyProperty(1, state.players[0].cash, state.properties);
      expect(check.canBuy).toBe(false);
      expect(check.reason).toContain('đã có chủ sở hữu');

      const unchangedState = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(unchangedState.properties[1].ownerId).toBe('player-2');
      expect(unchangedState.players[0].cash).toBe(1500);
    });

    it('4.5: rejects purchasing non-purchasable tiles (START, Detention, Tax, Rest Zone)', () => {
      const state = create2PGame();
      // Tile 0: START
      expect(canBuyProperty(0, 1500, state.properties).canBuy).toBe(false);
      // Tile 4: TAX
      expect(canBuyProperty(4, 1500, state.properties).canBuy).toBe(false);
      // Tile 10: DETENTION
      expect(canBuyProperty(10, 1500, state.properties).canBuy).toBe(false);
      // Tile 20: REST_ZONE
      expect(canBuyProperty(20, 1500, state.properties).canBuy).toBe(false);
    });

    it('4.6: increments propertiesOwned statistic on successful purchase', () => {
      let state = create2PGame();
      expect(state.players[0].stats.propertiesOwned).toBe(0);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.players[0].stats.propertiesOwned).toBe(1);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 3 });
      expect(state.players[0].stats.propertiesOwned).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // F05: Rent Calculation, Monopolies & Transport/Utility Scaling
  // -------------------------------------------------------------------------
  describe('F05: Rent Calculation, Monopolies & Transport/Utility Scaling', () => {
    it('5.1: charges base rent for un-upgraded single property without monopoly', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-2', level: 0, isMortgaged: false },
      };
      const tile1 = getTileById(1)!;
      const rent = calculateRent(1, properties, 1);
      expect(rent.rentAmount).toBe(tile1.property!.baseRent);
      expect(rent.isMonopoly).toBe(false);
      expect(rent.ownerId).toBe('player-2');
    });

    it('5.2: doubles base rent when landlord owns complete color group monopoly (District Brown tiles 1 & 3)', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-2', level: 0, isMortgaged: false },
        3: { ownerId: 'player-2', level: 0, isMortgaged: false },
      };
      const tile1 = getTileById(1)!;
      const rent1 = calculateRent(1, properties, 1);
      expect(rent1.isMonopoly).toBe(true);
      expect(rent1.rentAmount).toBe(tile1.property!.baseRent * 2);

      const tile3 = getTileById(3)!;
      const rent3 = calculateRent(3, properties, 1);
      expect(rent3.isMonopoly).toBe(true);
      expect(rent3.rentAmount).toBe(tile3.property!.baseRent * 2);
    });

    it('5.3: scales transport hub rent progressively based on owned count (1 hub: $25k, 2 hubs: $50k, 3 hubs: $100k, 4 hubs: $200k)', () => {
      const properties: Record<number, PropertyOwnership> = {
        5: { ownerId: 'player-1', level: 0 },
      };
      // 1 transport hub
      expect(calculateRent(5, properties, 1).rentAmount).toBe(25);

      // 2 transport hubs (5 and 15)
      properties[15] = { ownerId: 'player-1', level: 0 };
      expect(calculateRent(5, properties, 1).rentAmount).toBe(50);

      // 3 transport hubs (5, 15, and 25)
      properties[25] = { ownerId: 'player-1', level: 0 };
      expect(calculateRent(5, properties, 1).rentAmount).toBe(100);

      // 4 transport hubs (5, 15, 25, and 35)
      properties[35] = { ownerId: 'player-1', level: 0 };
      expect(calculateRent(5, properties, 1).rentAmount).toBe(200);
      expect(calculateRent(5, properties, 1).isMonopoly).toBe(true);
    });

    it('5.4: calculates utility rent based on dice sum (4x dice sum for 1 utility, 10x dice sum for both utilities)', () => {
      const properties: Record<number, PropertyOwnership> = {
        12: { ownerId: 'player-2', level: 0 }, // SAWACO
      };
      // 1 utility with dice sum 7 -> 4 * 7 = 28
      expect(calculateRent(12, properties, 1, 7).rentAmount).toBe(28);

      // 2 utilities (SAWACO 12 + EVN 28) with dice sum 7 -> 10 * 7 = 70
      properties[28] = { ownerId: 'player-2', level: 0 };
      expect(calculateRent(12, properties, 1, 7).rentAmount).toBe(70);
      expect(calculateRent(28, properties, 1, 10).rentAmount).toBe(100);
    });

    it('5.5: transfers rent atomically from landing player to property owner', () => {
      let state = create2PGame();
      // Player 2 owns tile 1 (baseRent = 2)
      state.properties[1] = { ownerId: 'player-2', level: 0 };

      // Player 1 lands on tile 1
      state.players[0].position = 0;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] }); // sum = 1
      expect(state.players[0].position).toBe(1);
      // Rent paid: $2k
      expect(state.players[0].cash).toBe(1500 - 2);
      expect(state.players[1].cash).toBe(1500 + 2);
      expect(state.players[0].stats.rentPaid).toBe(2);
      expect(state.players[1].stats.rentCollected).toBe(2);
    });

    it('5.6: waives rent (charges $0) when landing on a mortgaged property', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-2', level: 0, isMortgaged: true },
      };
      const rent = calculateRent(1, properties, 1);
      expect(rent.rentAmount).toBe(0);
      expect(rent.ownerId).toBe('player-2');
    });
  });

  // -------------------------------------------------------------------------
  // F06: Multi-Tier Property Development (1★ to 5★ Landmark & Even Building)
  // -------------------------------------------------------------------------
  describe('F06: Multi-Tier Property Development (1★ to 5★ Landmark & Even Building)', () => {
    it('6.1: allows upgrade to Level 1 (Nhà Phố 1★) when landlord holds color monopoly and sufficient cash', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 0 };
      state.properties[3] = { ownerId: 'player-1', level: 0 };

      const check = canUpgradeProperty(1, 'player-1', state.players[0].cash, state.properties);
      expect(check.canUpgrade).toBe(true);

      const upgradeCost = getTileById(1)!.property!.upgradeCost; // 50
      state = gameReducer(state, { type: 'UPGRADE_PROPERTY', tileId: 1 });
      expect(state.properties[1].level).toBe(1);
      expect(state.players[0].cash).toBe(1500 - upgradeCost);
    });

    it('6.2: allows upgrading tile 1 straight to level 2 (even-building rule removed)', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 1 },
        3: { ownerId: 'player-1', level: 0 },
      };
      // Sibling level no longer blocks: owning the tile and having cash is enough.
      const check = canUpgradeProperty(1, 'player-1', 1000, properties);
      expect(check.canUpgrade).toBe(true);

      const checkSibling = canUpgradeProperty(3, 'player-1', 1000, properties);
      expect(checkSibling.canUpgrade).toBe(true);
    });

    it('6.3: allows progressive upgrades up to Level 5 (Landmark 5★ / Sky Tower)', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 4 };
      state.properties[3] = { ownerId: 'player-1', level: 4 };

      // Can upgrade from 4 to 5 (Landmark)
      const check = canUpgradeProperty(1, 'player-1', 1000, state.properties);
      expect(check.canUpgrade).toBe(true);

      state = gameReducer(state, { type: 'UPGRADE_PROPERTY', tileId: 1 });
      expect(state.properties[1].level).toBe(5);

      // Cannot upgrade beyond level 5 (maxLevel cap)
      const checkMax = canUpgradeProperty(1, 'player-1', 1000, state.properties);
      expect(checkMax.canUpgrade).toBe(false);
      expect(checkMax.reason).toContain('cấp cao nhất');
    });

    it('6.4: calculates tiered rent based on houseRent array corresponding to current upgrade level', () => {
      const tile1 = getTileById(1)!;
      const expectedHouseRents = tile1.property!.houseRent; // [10, 30, 90, 160, 250]
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 1 },
        3: { ownerId: 'player-1', level: 1 },
      };

      for (let level = 1; level <= 5; level++) {
        properties[1].level = level;
        const rent = calculateRent(1, properties, 1);
        expect(rent.rentAmount).toBe(expectedHouseRents[level - 1]);
      }
    });

    it('6.5: allows downgrade with 75% market-indexed upgradeCost refund', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 2 };
      state.properties[3] = { ownerId: 'player-1', level: 2 };

      const check = canDowngradeProperty(1, 'player-1', state.properties);
      expect(check.canDowngrade).toBe(true);
      expect(check.refundAmount).toBe(38); // round(50 * 0.75) = 38

      const initialCash = state.players[0].cash;
      state = gameReducer(state, { type: 'DOWNGRADE_PROPERTY', tileId: 1 });
      expect(state.properties[1].level).toBe(1);
      expect(state.players[0].cash).toBe(initialCash + 38);
    });

    it('6.6: allows downgrading tile 1 regardless of sibling levels (reverse rule removed)', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 1 },
        3: { ownerId: 'player-1', level: 2 },
      };
      const check = canDowngradeProperty(1, 'player-1', properties);
      expect(check.canDowngrade).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // F07: Mortgage & Financial Liquidation
  // -------------------------------------------------------------------------
  describe('F07: Mortgage & Financial Liquidation', () => {
    it('7.1: allows mortgaging unbuilt property receiving 60% of market basePrice in cash', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 0, isMortgaged: false };
      const tile1 = getTileById(1)!;
      const expectedMortgageVal = Math.floor(tile1.property!.basePrice * 0.6); // 36

      const check = canMortgageProperty(1, 'player-1', state.properties);
      expect(check.canMortgage).toBe(true);
      expect(check.mortgageValue).toBe(expectedMortgageVal);

      const initialCash = state.players[0].cash;
      state = gameReducer(state, { type: 'MORTGAGE_PROPERTY', tileId: 1 });
      expect(state.properties[1].isMortgaged).toBe(true);
      expect(state.players[0].cash).toBe(initialCash + expectedMortgageVal);
    });

    it('7.2: marks property isMortgaged true upon mortgage execution', () => {
      let state = create2PGame();
      state.properties[6] = { ownerId: 'player-1', level: 0, isMortgaged: false };
      state = gameReducer(state, { type: 'MORTGAGE_PROPERTY', tileId: 6 });
      expect(state.properties[6].isMortgaged).toBe(true);
    });

    it('7.3: rejects mortgaging property when buildings are still present in the district', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 1, isMortgaged: false },
        3: { ownerId: 'player-1', level: 1, isMortgaged: false },
      };
      // Buildings exist in District Brown -> cannot mortgage either
      const check = canMortgageProperty(1, 'player-1', properties);
      expect(check.canMortgage).toBe(false);
      expect(check.reason).toContain('Phải bán toàn bộ công trình');
    });

    it('7.4: allows unmortgaging property by paying mortgageValue + 10% interest (110%)', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 0, isMortgaged: true };
      const expectedCost = getUnmortgageCost(1); // 30 * 1.1 = 33

      const check = canUnmortgageProperty(1, 'player-1', state.players[0].cash, state.properties);
      expect(check.canUnmortgage).toBe(true);
      expect(check.unmortgageCost).toBe(expectedCost);

      const initialCash = state.players[0].cash;
      state = gameReducer(state, { type: 'UNMORTGAGE_PROPERTY', tileId: 1 });
      expect(state.properties[1].isMortgaged).toBe(false);
      expect(state.players[0].cash).toBe(initialCash - expectedCost);
    });

    it('7.5: restores unmortgaged status to isMortgaged false upon payment', () => {
      let state = create2PGame();
      state.properties[8] = { ownerId: 'player-1', level: 0, isMortgaged: true };
      state = gameReducer(state, { type: 'UNMORTGAGE_PROPERTY', tileId: 8 });
      expect(state.properties[8].isMortgaged).toBe(false);
    });

    it('7.6: allows upgrading even when a sibling tile in the district is mortgaged', () => {
      // The district-mortgage block was removed with the other upgrade restrictions.
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: true },
        3: { ownerId: 'player-1', level: 0, isMortgaged: false },
      };
      const check = canUpgradeProperty(3, 'player-1', 1000, properties);
      expect(check.canUpgrade).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // F08: Jail & Detention Mechanics
  // -------------------------------------------------------------------------
  describe('F08: Jail & Detention Mechanics', () => {
    it('8.1: sends player to Detention (tile 10) immediately upon landing on tile 30 (GO_TO_JAIL)', () => {
      let state = create2PGame();
      state.players[0].position = 25;
      // Roll [2, 3] = 5 -> lands on tile 30 GO_TO_JAIL
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(2);
    });

    it('8.2: sends player to Detention (tile 10) upon rolling 3 consecutive doubles', () => {
      let state = create2PGame();
      state.players[0].consecutiveDoubles = 2; // Already has 2 doubles

      // Roll 3rd double [1, 1]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].consecutiveDoubles).toBe(0);
    });

    it('8.3: allows player to leave Detention immediately by paying bail ($100k)', () => {
      let state = create2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;
      const initialCash = state.players[0].cash;

      state = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.players[0].cash).toBe(initialCash - 100);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });

    it('8.4: releases player from Detention when rolling doubles on their turn without charging bail', () => {
      let state = create2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;
      const initialCash = state.players[0].cash;

      // Roll doubles [4, 4] while in detention
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.players[0].cash).toBe(initialCash); // No bail charged
    });

    it('8.5: decrements detentionTurns when rolling non-doubles in detention without releasing', () => {
      let state = create2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;

      // Roll non-double [2, 5]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 5] });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(1);
    });

    it('8.6: does not grant an extra turn when escaping detention via doubles', () => {
      let state = create2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;

      // Roll doubles [3, 3] to escape
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.isDouble).toBe(false); // Extra turn explicitly suppressed
    });
  });

  // -------------------------------------------------------------------------
  // F09: Central Economy, Non-Negative Cash Invariants & Debt Settlement
  // -------------------------------------------------------------------------
  describe('F09: Central Economy, Non-Negative Cash Invariants & Debt Settlement', () => {
    it('9.1: enforces non-negative cash invariant: cash never drops below 0 when rent exceeds cash', () => {
      let state = create2PGame();
      state.players[0].cash = 30; // Debtor has only $30
      state.properties[39] = { ownerId: 'player-2', level: 5 }; // High rent Landmark

      // Land on tile 39
      state.players[0].position = 38;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] });
      expect(state.players[0].cash).toBe(0); // Clamped at 0
      expect(state.players[0].cash).toBeGreaterThanOrEqual(0);
    });

    it('9.2: transitions game state to BANKRUPTCY_CHECK and creates pendingDebt on insolvency', () => {
      let state = create2PGame();
      state.players[0].cash = 10;
      state.properties[1] = { ownerId: 'player-2', level: 4 }; // Rent = 160

      state.players[0].position = 0;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] });
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt).toBeDefined();
      expect(state.pendingDebt?.creditorPlayerId).toBe('player-2');
      expect(state.pendingDebt?.amount).toBe(160 - 10); // 150 remaining debt
    });

    it('9.3: allows player in pendingDebt to pay off debt via RESOLVE_DEBT once sufficient funds are obtained', () => {
      let state = create2PGame();
      state.turnPhase = 'BANKRUPTCY_CHECK';
      state.pendingDebt = {
        creditorPlayerId: 'player-2',
        amount: 100,
        reason: 'Tiền thuê',
      };
      // Player 1 obtains $200 (e.g. via mortgaging or un-downgrading)
      state.players[0].cash = 200;

      state = gameReducer(state, { type: 'RESOLVE_DEBT' });
      expect(state.players[0].cash).toBe(100);
      expect(state.players[1].cash).toBe(1500 + 100);
      expect(state.pendingDebt).toBeNull();
      expect(state.turnPhase).toBe('ACTION_MENU');
    });

    it('9.4: updates creditor cash and stats upon debt resolution', () => {
      let state = create2PGame();
      state.turnPhase = 'BANKRUPTCY_CHECK';
      state.pendingDebt = {
        creditorPlayerId: 'player-2',
        amount: 80,
        reason: 'Tiền nợ thuê',
      };
      state.players[0].cash = 100;
      const initialCreditorCash = state.players[1].cash;

      state = gameReducer(state, { type: 'RESOLVE_DEBT' });
      expect(state.players[1].cash).toBe(initialCreditorCash + 80);
      expect(state.players[1].stats.rentCollected).toBe(80);
    });

    it('9.5: prevents END_TURN while player has unresolved pendingDebt', () => {
      let state = create2PGame();
      state.turnPhase = 'BANKRUPTCY_CHECK';
      state.pendingDebt = {
        creditorPlayerId: 'player-2',
        amount: 50,
        reason: 'Tiền nợ thuế',
      };

      const unchanged = gameReducer(state, { type: 'END_TURN' });
      expect(unchanged.activePlayerIndex).toBe(0); // Did not advance turn
      expect(unchanged.pendingDebt).not.toBeNull();
    });

    it('9.6: tracks rentPaid and rentCollected accurately across transactions', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-2', level: 0 }; // Rent = 2
      state.players[0].position = 0;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] });
      expect(state.players[0].stats.rentPaid).toBe(2);
      expect(state.players[1].stats.rentCollected).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // F10: Bankruptcy Settlement & Victory Evaluation
  // -------------------------------------------------------------------------
  describe('F10: Bankruptcy Settlement & Victory Evaluation', () => {
    it('10.1: liquidates bankrupt player properties to creditor when debt was owed to another player', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 0, isMortgaged: false };
      state.properties[3] = { ownerId: 'player-1', level: 0, isMortgaged: true };
      state.pendingDebt = {
        creditorPlayerId: 'player-2',
        amount: 9999,
        reason: 'Nợ lớn',
      };

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      // Properties transferred to player-2 with mortgage flags intact
      expect(state.properties[1].ownerId).toBe('player-2');
      expect(state.properties[3].ownerId).toBe('player-2');
      expect(state.properties[3].isMortgaged).toBe(true);
    });

    it('10.2: resets bankrupt player properties to unowned and level 0 when debt was owed to the Bank/Tax', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 2, isMortgaged: true };
      state.pendingDebt = {
        creditorPlayerId: null, // Null indicates Bank / Tax creditor
        amount: 1000,
        reason: 'Nợ thuế ngân hàng',
      };

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      expect(state.properties[1].ownerId).toBeNull();
      expect(state.properties[1].level).toBe(0);
      expect(state.properties[1].isMortgaged).toBe(false);
    });

    it('10.3: marks player isBankrupt true and sets cash to 0 upon DECLARE_BANKRUPTCY', () => {
      let state = create2PGame();
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      expect(state.players[0].isBankrupt).toBe(true);
      expect(state.players[0].cash).toBe(0);
    });

    it('10.4: triggers GAME_OVER and declares remaining player winner in a 2-player match when one goes bankrupt', () => {
      let state = create2PGame();
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      expect(state.status).toBe('ENDED');
      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.winner?.id).toBe('player-2');
    });

    it('10.5: eliminates bankrupt player in a 3-player match allowing the remaining 2 players to continue playing', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1] },
          { name: 'P3', token: DEFAULT_PLAYER_TOKENS[2] },
        ],
      });

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      expect(state.status).toBe('PLAYING');
      expect(state.winner).toBeNull();
      expect(state.players[0].isBankrupt).toBe(true);
      expect(state.players[1].isBankrupt).toBe(false);
      expect(state.players[2].isBankrupt).toBe(false);
    });

    it('10.6: evaluates highest net worth as winner when maxRounds limit is reached', () => {
      const players: PlayerState[] = [
        {
          id: 'p1',
          name: 'P1',
          token: DEFAULT_PLAYER_TOKENS[0],
          cash: 2000,
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
          cash: 500,
          position: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          consecutiveDoubles: 0,
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
        },
      ];

      const winCondition = evaluateWinCondition(players, {}, 60, 60);
      expect(winCondition.isGameOver).toBe(true);
      expect(winCondition.winner?.id).toBe('p1');
    });
  });
});
