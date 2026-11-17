import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../../gameReducer';
import { calculateNewPosition } from '../../dice/diceEngine';
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
import {
  calculatePlayerNetWorth,
  transferCash,
  calculateMaxLiquidationValue,
  liquidateBankruptPlayer,
} from '../../economy/economyEngine';
import { evaluateWinCondition } from '../../win-condition/winCondition';
import { BOARD_SIZE, DEFAULT_PLAYER_TOKENS } from '../../board/boardData';
import { GameState, PlayerState, PropertyOwnership } from '../../types';

describe('Tier 2: Boundary Conditions & Edge Cases', () => {
  function create2PGame(configOverrides = {}): GameState {
    return gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
        { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
      ],
      config: configOverrides,
    });
  }

  function create4PGame(configOverrides = {}): GameState {
    return gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0] },
        { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1] },
        { name: 'P3', token: DEFAULT_PLAYER_TOKENS[2] },
        { name: 'P4', token: DEFAULT_PLAYER_TOKENS[3] },
      ],
      config: configOverrides,
    });
  }

  // -------------------------------------------------------------------------
  // B01: Exact $0 Balance & Cash Threshold Limits
  // -------------------------------------------------------------------------
  describe('B01: Exact $0 Balance & Cash Threshold Limits', () => {
    it('1.1: handles exact cash purchase with $0 remaining balance without going bankrupt', () => {
      let state = create2PGame();
      const price = getTileById(1)!.property!.basePrice; // 60
      state.players[0].cash = price;

      const check = canBuyProperty(1, state.players[0].cash, state.properties);
      expect(check.canBuy).toBe(true);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].isBankrupt).toBe(false);
      expect(state.properties[1]?.ownerId).toBe('player-1');
    });

    it('1.2: rejects purchase when cash is exactly 1 unit below basePrice', () => {
      const price = getTileById(1)!.property!.basePrice; // 60
      const check = canBuyProperty(1, price - 1, {});
      expect(check.canBuy).toBe(false);
      expect(check.reason).toContain('Số dư không đủ');
    });

    it('1.3: handles exact cash upgrade with $0 remaining balance without going bankrupt', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 0 };
      state.properties[3] = { ownerId: 'player-1', level: 0 };
      const upgradeCost = getTileById(1)!.property!.upgradeCost; // 50
      state.players[0].cash = upgradeCost;

      const check = canUpgradeProperty(1, 'player-1', state.players[0].cash, state.properties);
      expect(check.canUpgrade).toBe(true);

      state = gameReducer(state, { type: 'UPGRADE_PROPERTY', tileId: 1 });
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].isBankrupt).toBe(false);
      expect(state.properties[1]?.level).toBe(1);
    });

    it('1.4: rejects upgrade when cash is exactly 1 unit below upgradeCost', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
        3: { ownerId: 'player-1', level: 0 },
      };
      const upgradeCost = getTileById(1)!.property!.upgradeCost; // 50
      const check = canUpgradeProperty(1, 'player-1', upgradeCost - 1, properties);
      expect(check.canUpgrade).toBe(false);
      expect(check.reason).toContain('Số dư không đủ');
    });

    it('1.5: handles exact cash unmortgage with $0 remaining balance without going bankrupt', () => {
      let state = create2PGame();
      state.properties[1] = { ownerId: 'player-1', level: 0, isMortgaged: true };
      const unmortgageCost = getUnmortgageCost(1); // 33
      state.players[0].cash = unmortgageCost;

      const check = canUnmortgageProperty(1, 'player-1', state.players[0].cash, state.properties);
      expect(check.canUnmortgage).toBe(true);

      state = gameReducer(state, { type: 'UNMORTGAGE_PROPERTY', tileId: 1 });
      expect(state.players[0].cash).toBe(0);
      expect(state.properties[1]?.isMortgaged).toBe(false);
      expect(state.players[0].isBankrupt).toBe(false);
    });

    it('1.6: rejects unmortgage when cash is exactly 1 unit below unmortgageCost', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: true },
      };
      const unmortgageCost = getUnmortgageCost(1); // 33
      const check = canUnmortgageProperty(1, 'player-1', unmortgageCost - 1, properties);
      expect(check.canUnmortgage).toBe(false);
      expect(check.reason).toContain('Số dư không đủ');
    });
  });

  // -------------------------------------------------------------------------
  // B02: Boundary Steps, Dice Extremes & Movement Limits
  // -------------------------------------------------------------------------
  describe('B02: Boundary Steps, Dice Extremes & Movement Limits', () => {
    it('2.1: minimum possible dice roll [1, 1] sum = 2 moves exactly 2 steps', () => {
      const move = calculateNewPosition(0, 2, BOARD_SIZE);
      expect(move.newPosition).toBe(2);
      expect(move.passedStart).toBe(false);
    });

    it('2.2: maximum possible dice roll [6, 6] sum = 12 moves exactly 12 steps', () => {
      const move = calculateNewPosition(0, 12, BOARD_SIZE);
      expect(move.newPosition).toBe(12);
      expect(move.passedStart).toBe(false);
    });

    it('2.3: boundary movement landing exactly on tile 39 (last tile before START)', () => {
      const move = calculateNewPosition(30, 9, BOARD_SIZE);
      expect(move.newPosition).toBe(39);
      expect(move.passedStart).toBe(false);
    });

    it('2.4: boundary movement from tile 39 with roll 1 landing exactly on tile 0 (START)', () => {
      const move = calculateNewPosition(39, 1, BOARD_SIZE);
      expect(move.newPosition).toBe(0);
      expect(move.passedStart).toBe(true);
    });

    it('2.5: boundary movement from tile 39 with roll 2 landing on tile 1 (crossing START)', () => {
      const move = calculateNewPosition(39, 2, BOARD_SIZE);
      expect(move.newPosition).toBe(1);
      expect(move.passedStart).toBe(true);
    });

    it('2.6: full 40-step circuit returns to origin tile and flags passedStart', () => {
      const move = calculateNewPosition(5, 40, BOARD_SIZE);
      expect(move.newPosition).toBe(5);
      expect(move.passedStart).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // B03: Boundary Start Tile & Multi-Lap Salary Thresholds
  // -------------------------------------------------------------------------
  describe('B03: Boundary Start Tile & Multi-Lap Salary Thresholds', () => {
    it('3.1: starting on tile 0 and moving 40 steps awards salary and lands on tile 0', () => {
      const move = calculateNewPosition(0, 40, BOARD_SIZE);
      expect(move.newPosition).toBe(0);
      expect(move.passedStart).toBe(true);
    });

    it('3.2: starting on tile 39 and moving 1 step to tile 0 triggers passedStart salary', () => {
      const move = calculateNewPosition(39, 1, BOARD_SIZE);
      expect(move.newPosition).toBe(0);
      expect(move.passedStart).toBe(true);
    });

    it('3.3: moving from tile 0 to tile 39 (39 steps forward) does NOT trigger passedStart', () => {
      const move = calculateNewPosition(0, 39, BOARD_SIZE);
      expect(move.newPosition).toBe(39);
      expect(move.passedStart).toBe(false);
    });

    it('3.4: player with 0 cash receiving START salary becomes solvent ($200k)', () => {
      let state = create2PGame();
      state.players[0].cash = 0;
      state.players[0].position = 38;

      // Move 3 steps -> lands on tile 1 (unowned property)
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.players[0].position).toBe(1);
      expect(state.players[0].cash).toBe(200);
      expect(state.players[0].cash).toBeGreaterThan(0);
    });

    it('3.5: start salary with custom config salaryOnStart = 0 grants $0', () => {
      let state = create2PGame({ salaryOnStart: 0 });
      state.players[0].cash = 100;
      state.players[0].position = 38;

      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.players[0].position).toBe(1);
      expect(state.players[0].cash).toBe(100); // 0 salary granted
    });

    it('3.6: multiple sequential turns crossing START accumulate salary linearly', () => {
      let state = create2PGame();
      let cash = state.players[0].cash; // 1500

      // Lap 1: 35 -> 1 (+200)
      state.players[0].position = 35;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] }); // lands on tile 1
      cash += 200;
      expect(state.players[0].cash).toBe(cash);

      // Finish extra turn and reset position
      state = { ...state, turnPhase: 'ACTION_MENU', isDouble: false };
      state = gameReducer(state, { type: 'END_TURN' });

      // Lap 2 (Player 2): 37 -> 2 (tile 2 is CHEST, let's use 37 -> 1 with [2, 2] = 4)
      state.players[1].position = 37;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] }); // sum 4 -> lands on 1
      expect(state.players[1].cash).toBe(1500 + 200);
    });
  });

  // -------------------------------------------------------------------------
  // B04: Boundary Property Purchase & Deed Constraints
  // -------------------------------------------------------------------------
  describe('B04: Boundary Property Purchase & Deed Constraints', () => {
    it('4.1: purchasing property when player cash is 0 is strictly rejected', () => {
      const check = canBuyProperty(1, 0, {});
      expect(check.canBuy).toBe(false);
      expect(check.reason).toContain('Số dư không đủ');
    });

    it('4.2: purchasing property when player is in detention visiting (position 10) is allowed if sufficient cash', () => {
      let state = create2PGame();
      state.players[0].position = 10;
      state.players[0].inDetention = false; // Just visiting
      // Buying tile 1 is valid
      const check = canBuyProperty(1, state.players[0].cash, state.properties);
      expect(check.canBuy).toBe(true);
    });

    it('4.3: purchasing property does not affect other players cash or ownership', () => {
      let state = create2PGame();
      const p2InitialCash = state.players[1].cash;

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.players[1].cash).toBe(p2InitialCash);
      expect(state.players[1].stats.propertiesOwned).toBe(0);
    });

    it('4.4: purchasing all 4 transport hubs updates rent correctly for all hubs to max $200k', () => {
      const properties: Record<number, PropertyOwnership> = {
        5: { ownerId: 'player-1', level: 0 },
        15: { ownerId: 'player-1', level: 0 },
        25: { ownerId: 'player-1', level: 0 },
        35: { ownerId: 'player-1', level: 0 },
      };
      [5, 15, 25, 35].forEach(hubId => {
        const rent = calculateRent(hubId, properties, 1);
        expect(rent.rentAmount).toBe(200);
        expect(rent.isMonopoly).toBe(true);
      });
    });

    it('4.5: purchasing both utilities activates 10x dice multiplier for both', () => {
      const properties: Record<number, PropertyOwnership> = {
        12: { ownerId: 'player-1', level: 0 },
        28: { ownerId: 'player-1', level: 0 },
      };
      expect(calculateRent(12, properties, 1, 6).rentAmount).toBe(60);
      expect(calculateRent(28, properties, 1, 6).rentAmount).toBe(60);
    });

    it('4.6: purchasing a property immediately after another player was liquidated to bank', () => {
      let properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-2', level: 2, isMortgaged: true },
      };
      // Bankrupt to bank (null creditor) resets tile 1 to unowned, level 0, unmortgaged
      properties = liquidateBankruptPlayer('player-2', properties, null);
      expect(properties[1].ownerId).toBeNull();
      expect(properties[1].level).toBe(0);
      expect(properties[1].isMortgaged).toBe(false);

      const check = canBuyProperty(1, 1500, properties);
      expect(check.canBuy).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // B05: Boundary Rent Charges & Insolvent Rent Scenarios
  // -------------------------------------------------------------------------
  describe('B05: Boundary Rent Charges & Insolvent Rent Scenarios', () => {
    it('5.1: rent payment when debtor has exactly the rent amount leaves debtor with $0 and solvent', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Debtor',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 100,
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

      const transfer = transferCash(p1, p2, 100);
      expect(transfer.fromPlayerUpdated.cash).toBe(0);
      expect(transfer.toPlayerUpdated.cash).toBe(600);
      expect(transfer.actualPaid).toBe(100);
    });

    it('5.2: rent payment when debtor has less cash than rent clamps debtor cash to 0 and creates exact pendingDebt', () => {
      let state = create2PGame();
      state.players[0].cash = 40;
      // Tile 1 with level 3 has houseRent[2] = 90
      state.properties[1] = { ownerId: 'player-2', level: 3 };

      state.players[0].position = 0;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] });
      expect(state.players[0].cash).toBe(0);
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt?.amount).toBe(90 - 40); // 50 remaining debt
      expect(state.pendingDebt?.creditorPlayerId).toBe('player-2');
    });

    it('5.3: rent payment when debtor has 0 cash creates pendingDebt for full rent amount', () => {
      let state = create2PGame();
      state.players[0].cash = 0;
      state.properties[1] = { ownerId: 'player-2', level: 1 }; // Rent = 10

      state.players[0].position = 0;
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 0] });
      expect(state.players[0].cash).toBe(0);
      expect(state.pendingDebt?.amount).toBe(10);
    });

    it('5.4: rent payment on mortgaged property generates 0 rent even with full monopoly', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-2', level: 0, isMortgaged: true },
        3: { ownerId: 'player-2', level: 0, isMortgaged: false },
      };
      const rent = calculateRent(1, properties, 1);
      expect(rent.rentAmount).toBe(0);
      expect(rent.ownerId).toBe('player-2');
    });

    it('5.5: utility rent with minimum roll [1, 1] sum = 2', () => {
      const properties: Record<number, PropertyOwnership> = {
        12: { ownerId: 'player-1', level: 0 },
      };
      // 1 utility: 4 * 2 = 8
      expect(calculateRent(12, properties, 1, 2).rentAmount).toBe(8);

      // 2 utilities: 10 * 2 = 20
      properties[28] = { ownerId: 'player-1', level: 0 };
      expect(calculateRent(12, properties, 1, 2).rentAmount).toBe(20);
    });

    it('5.6: utility rent with maximum roll [6, 6] sum = 12', () => {
      const properties: Record<number, PropertyOwnership> = {
        12: { ownerId: 'player-1', level: 0 },
        28: { ownerId: 'player-1', level: 0 },
      };
      // 10 * 12 = 120
      expect(calculateRent(12, properties, 1, 12).rentAmount).toBe(120);
    });
  });

  // -------------------------------------------------------------------------
  // B06: Boundary Upgrades, Max Level Caps & Even-Building Edges
  // -------------------------------------------------------------------------
  describe('B06: Boundary Upgrades, Max Level Caps & Even-Building Edges', () => {
    it('6.1: upgrading already at Level 5 (Landmark 5★) is strictly rejected', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 5 },
        3: { ownerId: 'player-1', level: 5 },
      };
      const check = canUpgradeProperty(1, 'player-1', 1000, properties);
      expect(check.canUpgrade).toBe(false);
      expect(check.reason).toContain('cấp cao nhất');
    });

    it('6.2: downgrading at Level 0 (bare land) is strictly rejected', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0 },
      };
      const check = canDowngradeProperty(1, 'player-1', properties);
      expect(check.canDowngrade).toBe(false);
      expect(check.reason).toContain('không có công trình');
    });

    it('6.3: sibling level no longer blocks upgrading (even-building rule removed)', () => {
      const properties: Record<number, PropertyOwnership> = {
        6: { ownerId: 'player-1', level: 2 }, // Vũng Tàu
        8: { ownerId: 'player-1', level: 1 }, // Nha Trang
        9: { ownerId: 'player-1', level: 1 }, // Quy Nhơn
      };
      const check = canUpgradeProperty(6, 'player-1', 1000, properties);
      expect(check.canUpgrade).toBe(true);
    });

    it('6.4: even building rule allows upgrading once all properties in district reach the same level', () => {
      const properties: Record<number, PropertyOwnership> = {
        6: { ownerId: 'player-1', level: 2 },
        8: { ownerId: 'player-1', level: 2 },
        9: { ownerId: 'player-1', level: 2 },
      };
      const check = canUpgradeProperty(6, 'player-1', 1000, properties);
      expect(check.canUpgrade).toBe(true);
    });

    it('6.5: downgrading refund handles odd upgrade costs by flooring refund (Math.floor)', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 1 },
      };
      // Tile 1 upgradeCost = 50 -> refund = 25
      const check = canDowngradeProperty(1, 'player-1', properties);
      expect(check.canDowngrade).toBe(true);
      expect(Number.isInteger(check.refundAmount)).toBe(true);
    });

    it('6.6: maximum upgrade across entire color district calculates maximum possible rent', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 5 },
        3: { ownerId: 'player-1', level: 5 },
      };
      const rent1 = calculateRent(1, properties, 1);
      const rent3 = calculateRent(3, properties, 1);
      expect(rent1.rentAmount).toBe(250);
      expect(rent3.rentAmount).toBe(450);
    });
  });

  // -------------------------------------------------------------------------
  // B07: Boundary Mortgage Limits & Unmortgage Invariants
  // -------------------------------------------------------------------------
  describe('B07: Boundary Mortgage Limits & Unmortgage Invariants', () => {
    it('7.1: mortgaging already mortgaged property is strictly rejected', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: true },
      };
      const check = canMortgageProperty(1, 'player-1', properties);
      expect(check.canMortgage).toBe(false);
      expect(check.reason).toContain('đã bị cầm cố');
    });

    it('7.2: unmortgaging unmortgaged property is strictly rejected', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: false },
      };
      const check = canUnmortgageProperty(1, 'player-1', 1000, properties);
      expect(check.canUnmortgage).toBe(false);
      expect(check.reason).toContain('không bị cầm cố');
    });

    it('7.3: mortgaging unowned tile or non-property tile is strictly rejected', () => {
      // Unowned
      const checkUnowned = canMortgageProperty(1, 'player-1', {});
      expect(checkUnowned.canMortgage).toBe(false);

      // Non-property tile 0 (START)
      const checkStart = canMortgageProperty(0, 'player-1', {});
      expect(checkStart.canMortgage).toBe(false);
    });

    it('7.4: mortgaging property in district where sibling property has Level 1 building is strictly rejected', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: false },
        3: { ownerId: 'player-1', level: 1, isMortgaged: false },
      };
      // Tile 1 has level 0, but tile 3 has level 1 -> must sell buildings in district first
      const check = canMortgageProperty(1, 'player-1', properties);
      expect(check.canMortgage).toBe(false);
      expect(check.reason).toContain('Phải bán toàn bộ công trình');
    });

    it('7.5: unmortgaging is allowed even if debtor has other properties mortgaged', () => {
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: true },
        3: { ownerId: 'player-1', level: 0, isMortgaged: true },
      };
      const check = canUnmortgageProperty(1, 'player-1', 1000, properties);
      expect(check.canUnmortgage).toBe(true);
    });

    it('7.6: liquidation calculation counts max(mortgage 60%, bank sale 75%) for unmortgaged and net equity for mortgaged properties', () => {
      const player: PlayerState = {
        id: 'player-1',
        name: 'Tester',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 100,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 2 },
      };

      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 0, isMortgaged: false }, // basePrice 60 -> bank sale 45 (> mortgage 36)
        3: { ownerId: 'player-1', level: 0, isMortgaged: true },  // already mortgaged -> net equity max(0, 45 - 39) = 6
      };

      const maxLiquidation = calculateMaxLiquidationValue(player, properties);
      expect(maxLiquidation).toBe(100 + 45 + 6); // 151
    });
  });

  // -------------------------------------------------------------------------
  // B08: Double Jail Transitions, Turn Counters & Bail Limits
  // -------------------------------------------------------------------------
  describe('B08: Double Jail Transitions, Turn Counters & Bail Limits', () => {
    it('8.1: landing on tile 10 (Detention) by normal movement without detention status is just visiting', () => {
      let state = create2PGame();
      state.players[0].position = 5;

      // Roll 5 -> lands on tile 10
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
    });

    it('8.2: player with 2 consecutive doubles rolls a non-double: resets consecutiveDoubles to 0 with no detention', () => {
      let state = create2PGame();
      state.players[0].consecutiveDoubles = 2;

      // Roll non-double [2, 3]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.players[0].inDetention).toBe(false);
    });

    it('8.3: bail payment when player cash is exactly bailCost leaves player with $0 and free', () => {
      let state = create2PGame();
      state.players[0].cash = 100;
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;

      state = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].isBankrupt).toBe(false);
    });

    it('8.4: bail payment rejected when player cash is bailCost - 1', () => {
      let state = create2PGame();
      state.players[0].cash = 99; // 1 unit below 100
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;

      const unchanged = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(unchanged.players[0].cash).toBe(99);
      expect(unchanged.players[0].inDetention).toBe(true);
    });

    it('8.5: bail payment rejected when player is not in detention', () => {
      let state = create2PGame();
      state.players[0].inDetention = false;

      const unchanged = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(unchanged.players[0].cash).toBe(1500); // No deduction
    });

    it('8.6: in detention with 1 turn remaining: non-double roll decrements detentionTurns to 0', () => {
      let state = create2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 1;

      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(0);
    });

    it('8.7: double roll escape releases player from detention without paying bail', () => {
      let state = create2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 1;
      const initialCash = state.players[0].cash;

      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].cash).toBe(initialCash);
    });
  });

  // -------------------------------------------------------------------------
  // B09: Extreme Debt Settlement, Insolvency Clamping & Net Worth
  // -------------------------------------------------------------------------
  describe('B09: Extreme Debt Settlement, Insolvency Clamping & Net Worth', () => {
    it('9.1: debt resolution with exact cash clears debt completely and transitions to ACTION_MENU', () => {
      let state = create2PGame();
      state.turnPhase = 'BANKRUPTCY_CHECK';
      state.pendingDebt = {
        creditorPlayerId: 'player-2',
        amount: 250,
        reason: 'Tiền thuê',
      };
      state.players[0].cash = 250;

      state = gameReducer(state, { type: 'RESOLVE_DEBT' });
      expect(state.players[0].cash).toBe(0);
      expect(state.pendingDebt).toBeNull();
      expect(state.turnPhase).toBe('ACTION_MENU');
    });

    it('9.2: attempting RESOLVE_DEBT when cash is 1 unit below debt is rejected', () => {
      let state = create2PGame();
      state.turnPhase = 'BANKRUPTCY_CHECK';
      state.pendingDebt = {
        creditorPlayerId: 'player-2',
        amount: 300,
        reason: 'Nợ lớn',
      };
      state.players[0].cash = 299;

      const unchanged = gameReducer(state, { type: 'RESOLVE_DEBT' });
      expect(unchanged.players[0].cash).toBe(299);
      expect(unchanged.pendingDebt).not.toBeNull();
      expect(unchanged.turnPhase).toBe('BANKRUPTCY_CHECK');
    });

    it('9.3: net worth calculation for bankrupt player returns strictly 0', () => {
      const bankruptPlayer: PlayerState = {
        id: 'p1',
        name: 'Bankrupt',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 1000,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: true,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 2 },
      };
      expect(calculatePlayerNetWorth(bankruptPlayer, properties)).toBe(0);
    });

    it('9.4: net worth calculation for player with mortgaged properties subtracts mortgage debt correctly', () => {
      const player: PlayerState = {
        id: 'p1',
        name: 'Player',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 500,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };
      // Tile 1: basePrice 60, mortgageVal 36 (60%)
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: true },
      };
      // Net worth = cash (500) + propertyVal (60) - mortgageDebt (36) = 524
      expect(calculatePlayerNetWorth(player, properties)).toBe(524);
    });

    it('9.5: liquidation value calculation accurately sums cash + 75% building refund + 75% land bank sale', () => {
      const player: PlayerState = {
        id: 'p1',
        name: 'Player',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 100,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };
      // Tile 1: basePrice 60 (bank sale 45 > mortgageVal 36), upgradeCost 50, level 2 (building value = 2 * round(50 * 0.75) = 76)
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 2, isMortgaged: false },
      };
      // Liquidation cash = 100 (cash) + 76 (buildings) + 45 (bank sale) = 221
      expect(calculateMaxLiquidationValue(player, properties)).toBe(221);
    });

    it('9.6: double-entry transferCash never creates or destroys phantom cash', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'P1',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 77,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
      };
      const p2: PlayerState = { ...p1, id: 'p2', name: 'P2', cash: 133 };

      const totalBefore = p1.cash + p2.cash;
      const result = transferCash(p1, p2, 500); // Charges more than p1 has
      const totalAfter = result.fromPlayerUpdated.cash + result.toPlayerUpdated.cash;

      expect(totalAfter).toBe(totalBefore); // Exact conservation of cash
      expect(result.actualPaid).toBe(77);
      expect(result.fromPlayerUpdated.cash).toBe(0);
      expect(result.toPlayerUpdated.cash).toBe(133 + 77);
    });
  });

  // -------------------------------------------------------------------------
  // B10: Boundary Bankruptcy & End-Game State Transitions
  // -------------------------------------------------------------------------
  describe('B10: Boundary Bankruptcy & End-Game State Transitions', () => {
    it('10.1: declaring bankruptcy on an already bankrupt player does not corrupt state', () => {
      let state = create2PGame();
      state.players[0].isBankrupt = true;

      const next = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      expect(next.players[0].isBankrupt).toBe(true);
    });

    it('10.2: bankrupt player cannot take turns, roll dice, or buy properties', () => {
      let state = create2PGame();
      state.players[0].isBankrupt = true;
      state.activePlayerIndex = 0;

      // ROLL_DICE_RESULT on bankrupt player returns unchanged state
      const next = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 4] });
      expect(next.players[0].position).toBe(0);
    });

    it('10.3: game status ENDED rejects any further game actions except RESTART_GAME', () => {
      let state = create2PGame();
      state.status = 'ENDED';
      state.turnPhase = 'GAME_OVER';

      // BUY_PROPERTY should be rejected
      const nextBuy = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(nextBuy).toEqual(state);

      // ROLL_DICE_START should be rejected
      const nextRoll = gameReducer(state, { type: 'ROLL_DICE_START' });
      expect(nextRoll).toEqual(state);
    });

    it('10.4: RESTART_GAME resets all state back to clean INITIAL_GAME_STATE', () => {
      let state = create2PGame();
      state.roundNumber = 40;
      state.status = 'ENDED';

      const restarted = gameReducer(state, { type: 'RESTART_GAME' });
      expect(restarted.status).toBe('SETUP');
      expect(restarted.players.length).toBe(0);
      expect(restarted.roundNumber).toBe(1);
    });

    it('10.5: in 4-player game, 3 bankruptcies sequentially leave exactly 1 winner', () => {
      let state = create4PGame();
      expect(state.status).toBe('PLAYING');

      // P1 bankrupt
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });
      expect(state.status).toBe('PLAYING');

      // P2 bankrupt
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.status).toBe('PLAYING');

      // P3 bankrupt -> only P4 remains
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-3' });
      expect(state.status).toBe('ENDED');
      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.winner?.id).toBe('player-4');
    });

    it('10.6: game over evaluated at round 60 when players have tied cash ranks correctly by property valuation', () => {
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
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
        },
        {
          id: 'p2',
          name: 'P2',
          token: DEFAULT_PLAYER_TOKENS[1],
          cash: 1000, // Same cash as P1
          position: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          consecutiveDoubles: 0,
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 2 },
        },
      ];
      // P2 has properties 1 and 3 (basePrice 60 + 60 = 120), P1 has no properties
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p2', level: 0 },
        3: { ownerId: 'p2', level: 0 },
      };

      const winCondition = evaluateWinCondition(players, properties, 60, 60);
      expect(winCondition.isGameOver).toBe(true);
      expect(winCondition.winner?.id).toBe('p2'); // P2 wins on net worth!
    });
  });
});
