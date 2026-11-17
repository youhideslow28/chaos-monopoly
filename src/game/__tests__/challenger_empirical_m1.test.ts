import { describe, it, expect } from 'vitest';
import { BOARD_TILES, BOARD_SIZE, TILE_GRID_POSITIONS_40 } from '../board/boardData';
import {
  calculateRent,
  canBuyProperty,
  canUpgradeProperty,
  canDowngradeProperty,
  canMortgageProperty,
  canUnmortgageProperty,
  getMortgageValue,
  getUnmortgageCost,
} from '../property/propertyEngine';
import {
  calculateNewPosition,
  rollTwoDice,
} from '../dice/diceEngine';
import {
  calculatePlayerNetWorth,
  calculateMaxLiquidationValue,
  liquidateBankruptPlayer,
} from '../economy/economyEngine';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { evaluateWinCondition } from '../win-condition/winCondition';
import { PlayerState, PropertyOwnership } from '../types';

/**
 * Ground Truth Table from Section 2.1 of game_and_chaos_spec.md
 */
interface GroundTruthTile {
  id: number;
  nameSubstring: string;
  type: string;
  districtColor?: string;
  basePrice?: number;
  upgradeCost?: number;
  baseRent?: number;
  houseRent?: [number, number, number, number, number];
  mortgageValue?: number;
}

const GROUND_TRUTH_TILES: GroundTruthTile[] = [
  { id: 0, nameSubstring: 'Cổng Khởi Hành', type: 'START' },
  { id: 1, nameSubstring: 'Ninh Kiều', type: 'PROPERTY', districtColor: 'district-brown', basePrice: 60, upgradeCost: 50, baseRent: 2, houseRent: [10, 30, 90, 160, 250], mortgageValue: 30 },
  { id: 2, nameSubstring: 'Lễ Hội Sông Nước', type: 'CHEST' },
  { id: 3, nameSubstring: 'Cái Răng', type: 'PROPERTY', districtColor: 'district-brown', basePrice: 60, upgradeCost: 50, baseRent: 4, houseRent: [20, 60, 180, 320, 450], mortgageValue: 30 },
  { id: 4, nameSubstring: 'Thuế Thu Nhập Đô Thị', type: 'TAX' },
  { id: 5, nameSubstring: 'Ga Hà Nội', type: 'TRANSPORT', districtColor: 'district-transport', basePrice: 200, baseRent: 25, mortgageValue: 100 },
  { id: 6, nameSubstring: 'Vũng Tàu', type: 'PROPERTY', districtColor: 'district-lightblue', basePrice: 100, upgradeCost: 50, baseRent: 6, houseRent: [30, 90, 270, 400, 550], mortgageValue: 50 },
  { id: 7, nameSubstring: 'Hỗn Loạn Alpha', type: 'CHAOS' },
  { id: 8, nameSubstring: 'Trần Phú', type: 'PROPERTY', districtColor: 'district-lightblue', basePrice: 100, upgradeCost: 50, baseRent: 6, houseRent: [30, 90, 270, 400, 550], mortgageValue: 50 },
  { id: 9, nameSubstring: 'Trầm Hương', type: 'PROPERTY', districtColor: 'district-lightblue', basePrice: 120, upgradeCost: 50, baseRent: 8, houseRent: [40, 100, 300, 450, 600], mortgageValue: 60 },
  { id: 10, nameSubstring: 'Tạm Giam', type: 'DETENTION' },
  { id: 11, nameSubstring: 'Đại Nội', type: 'PROPERTY', districtColor: 'district-pink', basePrice: 140, upgradeCost: 100, baseRent: 10, houseRent: [50, 150, 450, 625, 750], mortgageValue: 70 },
  { id: 12, nameSubstring: 'Cấp Nước', type: 'UTILITY', districtColor: 'district-utility', basePrice: 150, mortgageValue: 75 },
  { id: 13, nameSubstring: 'Tràng Tiền', type: 'PROPERTY', districtColor: 'district-pink', basePrice: 140, upgradeCost: 100, baseRent: 10, houseRent: [50, 150, 450, 625, 750], mortgageValue: 70 },
  { id: 14, nameSubstring: 'Hội An', type: 'PROPERTY', districtColor: 'district-pink', basePrice: 160, upgradeCost: 100, baseRent: 12, houseRent: [60, 180, 500, 700, 900], mortgageValue: 80 },
  { id: 15, nameSubstring: 'Hải Phòng', type: 'TRANSPORT', districtColor: 'district-transport', basePrice: 200, baseRent: 25, mortgageValue: 100 },
  { id: 16, nameSubstring: 'Lạch Tray', type: 'PROPERTY', districtColor: 'district-orange', basePrice: 180, upgradeCost: 100, baseRent: 14, houseRent: [70, 200, 550, 750, 950], mortgageValue: 90 },
  { id: 17, nameSubstring: 'Khí Vận', type: 'CHANCE' },
  { id: 18, nameSubstring: 'Đồ Sơn', type: 'PROPERTY', districtColor: 'district-orange', basePrice: 180, upgradeCost: 100, baseRent: 14, houseRent: [70, 200, 550, 750, 950], mortgageValue: 90 },
  { id: 19, nameSubstring: 'Tuần Châu', type: 'PROPERTY', districtColor: 'district-orange', basePrice: 200, upgradeCost: 100, baseRent: 16, houseRent: [80, 220, 600, 800, 1000], mortgageValue: 100 },
  { id: 20, nameSubstring: 'Nghỉ Chân', type: 'REST_ZONE' },
  { id: 21, nameSubstring: 'Mỹ Khê', type: 'PROPERTY', districtColor: 'district-red', basePrice: 220, upgradeCost: 150, baseRent: 18, houseRent: [90, 250, 700, 875, 1050], mortgageValue: 110 },
  { id: 22, nameSubstring: 'Hỗn Loạn Beta', type: 'CHAOS' },
  { id: 23, nameSubstring: 'Sơn Trà', type: 'PROPERTY', districtColor: 'district-red', basePrice: 220, upgradeCost: 150, baseRent: 18, houseRent: [90, 250, 700, 875, 1050], mortgageValue: 110 },
  { id: 24, nameSubstring: 'Cầu Vàng', type: 'PROPERTY', districtColor: 'district-red', basePrice: 240, upgradeCost: 150, baseRent: 20, houseRent: [100, 300, 750, 925, 1100], mortgageValue: 120 },
  { id: 25, nameSubstring: 'Cảng Quốc Tế Sài Gòn', type: 'TRANSPORT', districtColor: 'district-transport', basePrice: 200, baseRent: 25, mortgageValue: 100 },
  { id: 26, nameSubstring: 'Bãi Sao', type: 'PROPERTY', districtColor: 'district-yellow', basePrice: 260, upgradeCost: 150, baseRent: 22, houseRent: [110, 330, 800, 975, 1150], mortgageValue: 130 },
  { id: 27, nameSubstring: 'Hoàng Hôn', type: 'PROPERTY', districtColor: 'district-yellow', basePrice: 260, upgradeCost: 150, baseRent: 22, houseRent: [110, 330, 800, 975, 1150], mortgageValue: 130 },
  { id: 28, nameSubstring: 'EVN', type: 'UTILITY', districtColor: 'district-utility', basePrice: 150, mortgageValue: 75 },
  { id: 29, nameSubstring: 'Grand World', type: 'PROPERTY', districtColor: 'district-yellow', basePrice: 280, upgradeCost: 150, baseRent: 24, houseRent: [120, 360, 850, 1025, 1200], mortgageValue: 140 },
  { id: 30, nameSubstring: 'Vào Tù', type: 'GO_TO_JAIL' },
  { id: 31, nameSubstring: 'Tạ Hiện', type: 'PROPERTY', districtColor: 'district-green', basePrice: 300, upgradeCost: 200, baseRent: 26, houseRent: [130, 390, 900, 1100, 1275], mortgageValue: 150 },
  { id: 32, nameSubstring: 'Hoàn Kiếm', type: 'PROPERTY', districtColor: 'district-green', basePrice: 300, upgradeCost: 200, baseRent: 26, houseRent: [130, 390, 900, 1100, 1275], mortgageValue: 150 },
  { id: 33, nameSubstring: 'Thăng Long', type: 'CHEST' },
  { id: 34, nameSubstring: 'Tây Hồ', type: 'PROPERTY', districtColor: 'district-green', basePrice: 320, upgradeCost: 200, baseRent: 28, houseRent: [150, 450, 1000, 1200, 1400], mortgageValue: 160 },
  { id: 35, nameSubstring: 'Sân Bay', type: 'TRANSPORT', districtColor: 'district-transport', basePrice: 200, baseRent: 25, mortgageValue: 100 },
  { id: 36, nameSubstring: 'Hỗn Loạn Omega', type: 'CHAOS' },
  { id: 37, nameSubstring: 'Nguyễn Huệ', type: 'PROPERTY', districtColor: 'district-darkblue', basePrice: 350, upgradeCost: 200, baseRent: 35, houseRent: [175, 500, 1100, 1300, 1500], mortgageValue: 175 },
  { id: 38, nameSubstring: 'Thuế Tài Sản', type: 'TAX' },
  { id: 39, nameSubstring: 'Landmark 81', type: 'PROPERTY', districtColor: 'district-darkblue', basePrice: 400, upgradeCost: 200, baseRent: 50, houseRent: [200, 600, 1400, 1700, 2000], mortgageValue: 200 },
];

describe('CHALLENGER EMPIRICAL VERIFICATION — MILESTONE 1', () => {

  describe('1. Board Geometry & Spec Compliance Oracle', () => {
    it('must have strictly 40 tiles indexed 0 to 39 without gaps or duplicates', () => {
      expect(BOARD_SIZE).toBe(40);
      expect(BOARD_TILES.length).toBe(40);
      const seenIds = new Set<number>();
      for (let i = 0; i < 40; i++) {
        const tile = BOARD_TILES[i];
        expect(tile.id).toBe(i);
        expect(seenIds.has(tile.id)).toBe(false);
        seenIds.add(tile.id);
      }
      expect(seenIds.size).toBe(40);
    });

    it('matches exact ground truth specification for all 40 tiles', () => {
      for (const expected of GROUND_TRUTH_TILES) {
        const actual = BOARD_TILES.find(t => t.id === expected.id);
        expect(actual, `Tile ${expected.id} exists`).toBeDefined();
        if (!actual) continue;

        expect(actual.type).toBe(expected.type);
        expect(actual.name).toContain(expected.nameSubstring);

        if (expected.districtColor) {
          expect(actual.property?.districtColor).toBe(expected.districtColor);
        }
        if (expected.basePrice !== undefined) {
          expect(actual.property?.basePrice).toBe(expected.basePrice);
        }
        if (expected.upgradeCost !== undefined) {
          expect(actual.property?.upgradeCost).toBe(expected.upgradeCost);
        }
        if (expected.baseRent !== undefined) {
          expect(actual.property?.baseRent).toBe(expected.baseRent);
        }
        if (expected.houseRent !== undefined) {
          expect(actual.property?.houseRent).toEqual(expected.houseRent);
          expect(actual.property?.houseRent.length).toBe(5);
        }
        if (expected.mortgageValue !== undefined) {
          expect(actual.property?.mortgageValue).toBe(expected.mortgageValue);
          expect(getMortgageValue(actual.id)).toBe(Math.floor((expected.basePrice ?? 0) * 0.6));
        }
      }
    });

    it('validates 11x11 perimeter coordinate integrity', () => {
      for (let i = 0; i < 40; i++) {
        const pos = TILE_GRID_POSITIONS_40[i];
        expect(pos, `Coordinate for tile ${i} exists`).toBeDefined();
        expect(pos.col).toBeGreaterThanOrEqual(1);
        expect(pos.col).toBeLessThanOrEqual(11);
        expect(pos.row).toBeGreaterThanOrEqual(1);
        expect(pos.row).toBeLessThanOrEqual(11);

        // Verify perimeter: must be on boundary (row 1 or 11, or col 1 or 11)
        const isPerimeter = pos.row === 1 || pos.row === 11 || pos.col === 1 || pos.col === 11;
        expect(isPerimeter).toBe(true);
      }
    });
  });

  describe('2. Rent Calculation Stress Harness & Mathematical Oracle', () => {
    it('correctly calculates base rent and unimproved monopoly x2 for all 22 street properties', () => {
      const streetTiles = BOARD_TILES.filter(t => t.type === 'PROPERTY');
      expect(streetTiles.length).toBe(22);

      for (const tile of streetTiles) {
        const prop = tile.property!;
        const ownerId = 'player-1';

        // Case A: Single property owned (No monopoly)
        const singleProps: Record<number, PropertyOwnership> = {
          [tile.id]: { ownerId, level: 0, isMortgaged: false },
        };
        const singleRent = calculateRent(tile.id, singleProps);
        expect(singleRent.rentAmount).toBe(prop.baseRent);
        expect(singleRent.isMonopoly).toBe(false);

        // Case B: Mortgaged property yields 0 rent
        const mortgagedProps: Record<number, PropertyOwnership> = {
          [tile.id]: { ownerId, level: 0, isMortgaged: true },
        };
        const mRent = calculateRent(tile.id, mortgagedProps);
        expect(mRent.rentAmount).toBe(0);

        // Case C: Full district monopoly unimproved yields baseRent * 2
        const districtTiles = BOARD_TILES.filter(t => t.property?.districtColor === prop.districtColor);
        const monopolyProps: Record<number, PropertyOwnership> = {};
        for (const dt of districtTiles) {
          monopolyProps[dt.id] = { ownerId, level: 0, isMortgaged: false };
        }
        const monoRent = calculateRent(tile.id, monopolyProps);
        expect(monoRent.rentAmount).toBe(prop.baseRent * 2);
        expect(monoRent.isMonopoly).toBe(true);

        // Case D: Upgrade levels 1 to 5 match houseRent array exactly
        for (let lvl = 1; lvl <= 5; lvl++) {
          monopolyProps[tile.id] = { ownerId, level: lvl, isMortgaged: false };
          const upgradedRent = calculateRent(tile.id, monopolyProps);
          expect(upgradedRent.rentAmount).toBe(prop.houseRent[lvl - 1]);
        }
      }
    });

    it('correctly calculates transport hub rents (25k, 50k, 100k, 200k)', () => {
      const ownerId = 'player-1';

      // 1 hub
      const props1: Record<number, PropertyOwnership> = {
        5: { ownerId, level: 0, isMortgaged: false },
      };
      expect(calculateRent(5, props1).rentAmount).toBe(25);

      // 2 hubs
      const props2: Record<number, PropertyOwnership> = {
        5: { ownerId, level: 0, isMortgaged: false },
        15: { ownerId, level: 0, isMortgaged: false },
      };
      expect(calculateRent(5, props2).rentAmount).toBe(50);
      expect(calculateRent(15, props2).rentAmount).toBe(50);

      // 3 hubs
      const props3: Record<number, PropertyOwnership> = {
        5: { ownerId, level: 0, isMortgaged: false },
        15: { ownerId, level: 0, isMortgaged: false },
        25: { ownerId, level: 0, isMortgaged: false },
      };
      expect(calculateRent(5, props3).rentAmount).toBe(100);

      // 4 hubs
      const props4: Record<number, PropertyOwnership> = {
        5: { ownerId, level: 0, isMortgaged: false },
        15: { ownerId, level: 0, isMortgaged: false },
        25: { ownerId, level: 0, isMortgaged: false },
        35: { ownerId, level: 0, isMortgaged: false },
      };
      expect(calculateRent(5, props4).rentAmount).toBe(200);
      expect(calculateRent(35, props4).rentAmount).toBe(200);
      expect(calculateRent(35, props4).isMonopoly).toBe(true);
    });

    it('correctly calculates utility rents (4x and 10x dice sum)', () => {
      const ownerId = 'player-1';

      // Test all possible 2d6 sums from 2 to 12
      for (let diceSum = 2; diceSum <= 12; diceSum++) {
        // 1 Utility owned
        const props1: Record<number, PropertyOwnership> = {
          12: { ownerId, level: 0, isMortgaged: false },
        };
        const rent1 = calculateRent(12, props1, 1, diceSum);
        expect(rent1.rentAmount).toBe(4 * diceSum);
        expect(rent1.isMonopoly).toBe(false);

        // 2 Utilities owned
        const props2: Record<number, PropertyOwnership> = {
          12: { ownerId, level: 0, isMortgaged: false },
          28: { ownerId, level: 0, isMortgaged: false },
        };
        const rent2 = calculateRent(12, props2, 1, diceSum);
        expect(rent2.rentAmount).toBe(10 * diceSum);
        expect(rent2.isMonopoly).toBe(true);
      }
    });

    it('upgrades and downgrades freely on owned tiles (even-building rules removed)', () => {
      const ownerId = 'player-1';
      // Brown district: Tile 1 and Tile 3
      let props: Record<number, PropertyOwnership> = {
        1: { ownerId, level: 0, isMortgaged: false },
        3: { ownerId, level: 0, isMortgaged: false },
      };

      expect(canUpgradeProperty(1, ownerId, 1000, props).canUpgrade).toBe(true);

      // Sibling level no longer gates the next level (rule removed by client request).
      props[1].level = 1;
      expect(canUpgradeProperty(1, ownerId, 1000, props).canUpgrade).toBe(true);
      expect(canUpgradeProperty(3, ownerId, 1000, props).canUpgrade).toBe(true);

      props[1].level = 2;
      props[3].level = 1;
      // Reverse rule removed too: any owned building can be sold one level at a time.
      expect(canDowngradeProperty(3, ownerId, props).canDowngrade).toBe(true);
      const canDown1 = canDowngradeProperty(1, ownerId, props);
      expect(canDown1.canDowngrade).toBe(true);
      expect(canDown1.refundAmount).toBe(38); // 75% of 50k
    });

    it('enforces mortgage invariants: no mortgaging with buildings, 60% mortgage & 10% interest', () => {
      const ownerId = 'player-1';
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId, level: 1, isMortgaged: false },
        3: { ownerId, level: 0, isMortgaged: false },
      };

      // Cannot mortgage Tile 3 while Tile 1 has buildings
      expect(canMortgageProperty(3, ownerId, props).canMortgage).toBe(false);

      // Sell building on Tile 1
      props[1].level = 0;
      // Now can mortgage
      const mCheck = canMortgageProperty(3, ownerId, props);
      expect(mCheck.canMortgage).toBe(true);
      expect(mCheck.mortgageValue).toBe(36);

      // Mortgage Tile 3
      props[3].isMortgaged = true;

      // Upgrading no longer cares about mortgages elsewhere in the district.
      expect(canUpgradeProperty(1, ownerId, 1000, props).canUpgrade).toBe(true);

      // Base price 60 -> 60% mortgage = 36 -> unmortgage cost Math.floor(36 * 1.1) = 39
      expect(getUnmortgageCost(3)).toBe(39);
      expect(canUnmortgageProperty(3, ownerId, 10, props).canUnmortgage).toBe(false); // Insufficient cash
      expect(canUnmortgageProperty(3, ownerId, 50, props).canUnmortgage).toBe(true);
    });
  });

  describe('3. Dice Mechanics & Turn State Transitions', () => {
    it('tests all 36 combinations of 2d6 dice rolls', () => {
      let doubleCount = 0;
      for (let d1 = 1; d1 <= 6; d1++) {
        for (let d2 = 1; d2 <= 6; d2++) {
          const res = rollTwoDice([d1, d2]);
          expect(res.sum).toBe(d1 + d2);
          if (d1 === d2) {
            expect(res.isDouble).toBe(true);
            doubleCount++;
          } else {
            expect(res.isDouble).toBe(false);
          }
        }
      }
      expect(doubleCount).toBe(6);
    });

    it('calculates position wrap-around and pass-start salary correctly', () => {
      // Normal step
      expect(calculateNewPosition(0, 7, 40)).toEqual({ newPosition: 7, passedStart: false });
      // Exactly on GO
      expect(calculateNewPosition(35, 5, 40)).toEqual({ newPosition: 0, passedStart: true });
      // Wrap past GO
      expect(calculateNewPosition(38, 5, 40)).toEqual({ newPosition: 3, passedStart: true });
      // Multiple wrap
      expect(calculateNewPosition(10, 45, 40)).toEqual({ newPosition: 15, passedStart: true });
    });

    it('implements 3-consecutive-doubles detention penalty in gameReducer', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [{ name: 'Challenger' }, { name: 'Player 2' }],
      });

      // Roll 1: Double (2, 2)
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[0].consecutiveDoubles).toBe(1);
      expect(state.players[0].inDetention).toBe(false);
      expect(state.isDouble).toBe(true);

      // End turn triggers extra turn
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0); // Still player 0's turn!

      // Roll 2: Double (3, 3)
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.players[0].consecutiveDoubles).toBe(2);
      expect(state.players[0].inDetention).toBe(false);

      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);

      // Roll 3: Double (4, 4) -> 3rd double!
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });

      // Must be in detention immediately!
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.isDouble).toBe(false);
    });

    it('sends player landing on Tile 30 (GO_TO_JAIL) directly to Tile 10 without GO salary', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [{ name: 'Player 1' }, { name: 'Player 2' }],
      });

      // Position player at 28
      state.players[0].position = 28;
      const initialCash = state.players[0].cash;

      // Roll [1, 1] sum 2 -> lands on 30
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });

      expect(state.players[0].position).toBe(10);
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].cash).toBe(initialCash); // No GO salary awarded
    });
  });

  describe('4. Solvency Invariant & Financial Flow Verification', () => {
    it('guarantees player.cash >= 0 across rent and tax transfers without phantom funds', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [{ name: 'Debtor' }, { name: 'Landlord' }],
      });

      // Give Landlord Tile 39 (Landmark 81) with 5★ Landmark (Rent = 2,000k)
      state.properties[39] = {
        ownerId: 'player-2',
        level: 5,
        isMortgaged: false,
      };

      // Set Debtor cash to 150k
      state.players[0].cash = 150;
      state.players[0].position = 35;

      const landlordInitialCash = state.players[1].cash;

      // Debtor rolls 4 -> lands on Tile 39 (Rent 2000)
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });

      // Debtor must NOT have negative cash!
      expect(state.players[0].cash).toBe(0);
      // Landlord receives exactly what debtor had (150), not 2000!
      expect(state.players[1].cash).toBe(landlordInitialCash + 150);
      // State must be in BANKRUPTCY_CHECK with pending debt
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt).toBeDefined();
      expect(state.pendingDebt?.amount).toBe(2000 - 150);
      expect(state.pendingDebt?.creditorPlayerId).toBe('player-2');
    });

    it('transfers assets to creditor on player-induced bankruptcy and triggers victory', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [{ name: 'Debtor' }, { name: 'Landlord' }],
      });

      // Debtor owns Tile 1, Landlord owns Tile 39
      state.properties[1] = { ownerId: 'player-1', level: 0, isMortgaged: false };
      state.properties[39] = { ownerId: 'player-2', level: 5, isMortgaged: false };

      state.players[0].cash = 50;
      state.players[0].position = 35;

      // Land on Tile 39
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });

      // Debtor declares bankruptcy
      state = gameReducer(state, {
        type: 'DECLARE_BANKRUPTCY',
        playerId: 'player-1',
      });

      // Debtor is bankrupt and eliminated
      expect(state.players[0].isBankrupt).toBe(true);
      expect(state.players[0].cash).toBe(0);
      // Property 1 transferred to creditor (player-2)
      expect(state.properties[1].ownerId).toBe('player-2');
      // Only 1 solvent player left -> Game Over with LAST_MAN_STANDING!
      expect(state.status).toBe('ENDED');
      expect(state.winner?.id).toBe('player-2');
    });

    it('returns properties to bank and clears buildings/mortgages on tax/bank bankruptcy', () => {
      const initialProps: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 2, isMortgaged: true },
        3: { ownerId: 'player-1', level: 2, isMortgaged: false },
      };

      // Liquidate with NO creditor (Bank bankruptcy)
      const clearedProps = liquidateBankruptPlayer('player-1', initialProps, null);

      expect(clearedProps[1].ownerId).toBeNull();
      expect(clearedProps[1].level).toBe(0);
      expect(clearedProps[1].isMortgaged).toBe(false);

      expect(clearedProps[3].ownerId).toBeNull();
      expect(clearedProps[3].level).toBe(0);
      expect(clearedProps[3].isMortgaged).toBe(false);
    });

    it('correctly computes Net Worth and enforces 60-round cap win condition', () => {
      const players: PlayerState[] = [
        {
          id: 'player-1',
          name: 'Player 1',
          token: { id: 't1', name: 'T1', icon: 'Car', description: '' },
          cash: 1000,
          position: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          isAI: false,
          consecutiveDoubles: 0,
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 2 },
        },
        {
          id: 'player-2',
          name: 'Player 2',
          token: { id: 't2', name: 'T2', icon: 'Car', description: '' },
          cash: 500,
          position: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          isAI: false,
          consecutiveDoubles: 0,
          stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
        },
      ];

      // Player 1 owns Tile 1 (60k) with level 1 (50k upgrade), Player 2 owns Tile 39 (400k) with level 1 (200k)
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 1, isMortgaged: false },
        39: { ownerId: 'player-2', level: 1, isMortgaged: false },
      };

      // Player 1 Worth: 1000 + 60 + 50 = 1110
      expect(calculatePlayerNetWorth(players[0], props)).toBe(1110);
      // Player 2 Worth: 500 + 400 + 200 = 1100
      expect(calculatePlayerNetWorth(players[1], props)).toBe(1100);

      // At round 59: Game not over
      const eval59 = evaluateWinCondition(players, props, 59, 60);
      expect(eval59.isGameOver).toBe(false);

      // At round 60 with capped 2.4x inflation: P1 = 1000 + 264 = 1264, P2 = 500 + 1440 = 1940
      const eval60 = evaluateWinCondition(players, props, 60, 60);
      expect(eval60.isGameOver).toBe(true);
      expect(eval60.reason).toBe('MAX_ROUNDS_REACHED');
      expect(eval60.winner?.id).toBe('player-2');
    });
  });

  describe('5. Adversarial Edge Case & Invariant Stress Tests', () => {
    it('prevents illegal property purchases when funds are insufficient or tile is owned', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: null, level: 0, isMortgaged: false },
      };

      // Tile 1 costs 60k
      expect(canBuyProperty(1, 50, props).canBuy).toBe(false);
      expect(canBuyProperty(1, 60, props).canBuy).toBe(true);

      // Tile 1 already owned
      props[1].ownerId = 'player-2';
      expect(canBuyProperty(1, 1000, props).canBuy).toBe(false);

      // Cannot buy non-property (e.g. Tile 0 START, Tile 10 DETENTION, Tile 4 TAX)
      expect(canBuyProperty(0, 10000, props).canBuy).toBe(false);
      expect(canBuyProperty(10, 10000, props).canBuy).toBe(false);
      expect(canBuyProperty(4, 10000, props).canBuy).toBe(false);
    });

    it('prevents upgrading past level 5 (Landmark 5★)', () => {
      const ownerId = 'player-1';
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId, level: 5, isMortgaged: false },
        3: { ownerId, level: 5, isMortgaged: false },
      };
      const check = canUpgradeProperty(1, ownerId, 10000, props);
      expect(check.canUpgrade).toBe(false);
      expect(check.reason).toContain('cao nhất');
    });

    it('prevents downgrading land with level 0', () => {
      const ownerId = 'player-1';
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId, level: 0, isMortgaged: false },
        3: { ownerId, level: 0, isMortgaged: false },
      };
      const check = canDowngradeProperty(1, ownerId, props);
      expect(check.canDowngrade).toBe(false);
      expect(check.reason).toContain('Đất trống');
    });

    it('calculates total liquidation cash accurately in emergencies', () => {
      const player: PlayerState = {
        id: 'player-1',
        name: 'Player 1',
        token: { id: 't1', name: 'T1', icon: 'Car', description: '' },
        cash: 100,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        isAI: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 2 },
      };

      // Tile 1: Base 60 (Mortgage 30), Upgrade 50 (Level 2 = 100, 50% refund = 50)
      // Tile 3: Base 60 (Mortgage 30), Already Mortgaged, Level 0
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'player-1', level: 2, isMortgaged: false },
        3: { ownerId: 'player-1', level: 0, isMortgaged: true },
      };

      // Total liquidation (75% downgrade refund + 75% Bank land sale minus redemption if mortgaged):
      // Cash: 100
      // Tile 1 buildings: 2 * round(50 * 0.75) = 76
      // Tile 1 land sale: round(60 * 0.75) = 45
      // Tile 3 mortgaged net land equity: max(0, 45 - 39) = 6
      // Expected total: 100 + 76 + 45 + 6 = 227
      const maxLiq = calculateMaxLiquidationValue(player, props);
      expect(maxLiq).toBe(227);
    });
  });
});
