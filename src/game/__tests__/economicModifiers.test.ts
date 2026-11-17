import { describe, it, expect } from 'vitest';
import {
  calculateSalary,
  calculateEffectiveMovement,
  calculateEffectiveMortgageValue,
  calculateEffectiveUnmortgageCost,
  isMarketFrozen,
  DEFAULT_CHAOS_MODIFIERS,
} from '../economy/economicModifiers';
import {
  calculateRent,
  canBuyProperty,
  canUpgradeProperty,
  canMortgageProperty,
} from '../property/propertyEngine';
import { ChaosModifiers, PropertyOwnership } from '../types';

describe('Economic Modifiers Pipeline (Phase 02 Milestone 1)', () => {
  const baseModifiers = (): ChaosModifiers => ({ ...DEFAULT_CHAOS_MODIFIERS });

  // -------------------------------------------------------------------------
  // 1. Transport Boom (2x on Transport Hubs)
  // -------------------------------------------------------------------------
  describe('1. transportBoomTurns (2x Transport Rent)', () => {
    it('doubles transport hub rent when transportBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        5: { ownerId: 'p1', level: 0, isMortgaged: false },
        15: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      // 2 hubs owned: normal rent = 50. With boom = 100.
      const mods = { ...baseModifiers(), transportBoomTurns: 3 };
      const rentNormal = calculateRent(5, props, 1, 7, baseModifiers());
      const rentBoom = calculateRent(5, props, 1, 7, mods);

      expect(rentNormal.rentAmount).toBe(50);
      expect(rentBoom.rentAmount).toBe(100);
    });

    it('does not double rent on non-transport properties during transport boom', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), transportBoomTurns: 3 };
      const rentCanTho = calculateRent(1, props, 1, 7, mods);
      expect(rentCanTho.rentAmount).toBe(2); // baseRent = 2
    });
  });

  // -------------------------------------------------------------------------
  // 2. Utility Boom (2x on Utilities)
  // -------------------------------------------------------------------------
  describe('2. utilityBoomTurns (2x Utility Rent)', () => {
    it('doubles utility rent when utilityBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        12: { ownerId: 'p1', level: 0, isMortgaged: false }, // SAWACO
      };
      // 1 utility owned: multiplier = 4. DiceSum = 8 -> 32. With boom = 64.
      const mods = { ...baseModifiers(), utilityBoomTurns: 2 };
      const rentNormal = calculateRent(12, props, 1, 8, baseModifiers());
      const rentBoom = calculateRent(12, props, 1, 8, mods);

      expect(rentNormal.rentAmount).toBe(32);
      expect(rentBoom.rentAmount).toBe(64);
    });
  });

  // -------------------------------------------------------------------------
  // 3. District Boom (1.5x on Hanoi & HCMC)
  // -------------------------------------------------------------------------
  describe('3. districtBoomTurns (1.5x on Hanoi & HCMC)', () => {
    it('multiplies Hanoi (district-green) rent by 1.5x when districtBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        31: { ownerId: 'p1', level: 1, isMortgaged: false }, // Phố Tạ Hiện, 1★ houseRent = 130
      };
      const mods = { ...baseModifiers(), districtBoomTurns: 3 };
      const rentNormal = calculateRent(31, props, 1, 7, baseModifiers());
      const rentBoom = calculateRent(31, props, 1, 7, mods);

      expect(rentNormal.rentAmount).toBe(130);
      expect(rentBoom.rentAmount).toBe(Math.round(130 * 1.5)); // 195
    });

    it('multiplies HCMC (district-darkblue) rent by 1.5x when districtBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        37: { ownerId: 'p1', level: 0, isMortgaged: false }, // Nguyễn Huệ, baseRent = 35
      };
      const mods = { ...baseModifiers(), districtBoomTurns: 3 };
      const rentBoom = calculateRent(37, props, 1, 7, mods);
      expect(rentBoom.rentAmount).toBe(Math.round(35 * 1.5)); // 53
    });

    it('does not affect other districts like Can Tho (district-brown)', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), districtBoomTurns: 3 };
      const rent = calculateRent(1, props, 1, 7, mods);
      expect(rent.rentAmount).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Alien Mothership (0 rent on Landmark 81)
  // -------------------------------------------------------------------------
  describe('4. alienMothershipTurns (0 rent on Landmark 81)', () => {
    it('sets Landmark 81 (Tile 39) rent to 0 when alienMothershipTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        39: { ownerId: 'p1', level: 5, isMortgaged: false }, // Landmark 5★ normal rent = 2000
      };
      const mods = { ...baseModifiers(), alienMothershipTurns: 5 };
      const rent = calculateRent(39, props, 1, 7, mods);
      expect(rent.rentAmount).toBe(0);
    });

    it('overrides district boom on Tile 39 if alien mothership is active', () => {
      const props: Record<number, PropertyOwnership> = {
        39: { ownerId: 'p1', level: 2, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), alienMothershipTurns: 2, districtBoomTurns: 3 };
      const rent = calculateRent(39, props, 1, 7, mods);
      expect(rent.rentAmount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Golden Hour (2x Salary on Start)
  // -------------------------------------------------------------------------
  describe('5. goldenHourTurns (2x Start Salary)', () => {
    it('doubles salary from 200 to 400 when goldenHourTurns > 0', () => {
      const normalSalary = calculateSalary(200, baseModifiers());
      const goldenSalary = calculateSalary(200, { ...baseModifiers(), goldenHourTurns: 1 });

      expect(normalSalary).toBe(200);
      expect(goldenSalary).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Curfew (max 4 steps)
  // -------------------------------------------------------------------------
  describe('6. curfewTurns (Max 4 Steps)', () => {
    it('caps dice roll steps to 4 when curfewTurns > 0 and roll > 4', () => {
      const mods = { ...baseModifiers(), curfewTurns: 1 };
      const move9 = calculateEffectiveMovement(0, 9, mods);
      expect(move9.effectiveSteps).toBe(4);
      expect(move9.newPosition).toBe(4);
      expect(move9.isCapped).toBe(true);

      const move12 = calculateEffectiveMovement(10, 12, mods);
      expect(move12.effectiveSteps).toBe(4);
      expect(move12.newPosition).toBe(14);
      expect(move12.isCapped).toBe(true);
    });

    it('does not cap dice rolls <= 4', () => {
      const mods = { ...baseModifiers(), curfewTurns: 1 };
      const move3 = calculateEffectiveMovement(0, 3, mods);
      expect(move3.effectiveSteps).toBe(3);
      expect(move3.newPosition).toBe(3);
      expect(move3.isCapped).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Reverse Direction (Backwards Movement)
  // -------------------------------------------------------------------------
  describe('7. reverseDirectionTurns (Backwards Movement)', () => {
    it('moves counter-clockwise around 40-tile board', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3 };
      const move = calculateEffectiveMovement(10, 6, mods);
      expect(move.newPosition).toBe(4);
      expect(move.isReverse).toBe(true);
      expect(move.passedStart).toBe(false);
    });

    it('wraps past tile 0 without granting passing start salary', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3 };
      const move = calculateEffectiveMovement(2, 5, mods);
      // 2 - 5 = -3 -> tile 37
      expect(move.newPosition).toBe(37);
      expect(move.passedStart).toBe(false);
    });

    it('correctly lands on tile 0 moving backwards', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3 };
      const move = calculateEffectiveMovement(3, 3, mods);
      expect(move.newPosition).toBe(0);
    });

    it('combines curfew and reverse direction: roll 9 -> capped to 4 backwards', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3, curfewTurns: 1 };
      const move = calculateEffectiveMovement(10, 9, mods);
      expect(move.effectiveSteps).toBe(4);
      expect(move.newPosition).toBe(6);
      expect(move.isCapped).toBe(true);
      expect(move.isReverse).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Interest Hike (+10% unmortgage fee, total 20%)
  // -------------------------------------------------------------------------
  describe('8. interestHikeTurns (+10% Unmortgage Fee)', () => {
    it('increases unmortgage fee to 20% (multiplier 1.20) when interestHikeTurns > 0', () => {
      // Tile 1 basePrice = 60, mortgageValue (60%) = 36.
      // Normal: floor(36 * 1.10) = 39.
      // With Hike: floor(36 * 1.20) = 43.
      const normalCost = calculateEffectiveUnmortgageCost(60, baseModifiers());
      const hikedCost = calculateEffectiveUnmortgageCost(60, { ...baseModifiers(), interestHikeTurns: 3 });

      expect(normalCost).toBe(39);
      expect(hikedCost).toBe(43);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Subsidized Mortgage (75% mortgage value)
  // -------------------------------------------------------------------------
  describe('9. subsidizedMortgageTurns (75% Mortgage Value)', () => {
    it('provides 75% of base price upon mortgage when subsidizedMortgageTurns > 0', () => {
      // Tile 1 basePrice = 60.
      // Normal: 60 * 0.60 = 36.
      // Subsidized: 60 * 0.75 = 45.
      const normalVal = calculateEffectiveMortgageValue(60, baseModifiers());
      const subsidizedVal = calculateEffectiveMortgageValue(60, { ...baseModifiers(), subsidizedMortgageTurns: 2 });

      expect(normalVal).toBe(36);
      expect(subsidizedVal).toBe(45);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Market Frozen (Block Buy and Upgrade)
  // -------------------------------------------------------------------------
  describe('10. marketFrozenTurns (Freeze Market)', () => {
    it('blocks canBuyProperty when marketFrozenTurns > 0', () => {
      const mods = { ...baseModifiers(), marketFrozenTurns: 1 };
      const check = canBuyProperty(1, 1500, {}, mods);
      expect(check.canBuy).toBe(false);
      expect(check.reason).toContain('đóng băng');
    });

    it('blocks canUpgradeProperty when marketFrozenTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
        3: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), marketFrozenTurns: 1 };
      const check = canUpgradeProperty(1, 'p1', 1500, props, mods);
      expect(check.canUpgrade).toBe(false);
      expect(check.reason).toContain('đóng băng');
    });

    it('allows mortgaging during market freeze (emergency liquidation)', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
        3: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), marketFrozenTurns: 1 };
      const mortgageCheck = canMortgageProperty(1, 'p1', props, mods);
      expect(mortgageCheck.canMortgage).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 11. Zero Regression & Invariants
  // -------------------------------------------------------------------------
  describe('11. Backward Compatibility & Invariant Audit', () => {
    it('produces 100% identical outputs when modifiers are omitted (default all zeros)', () => {
      expect(calculateEffectiveMortgageValue(100)).toBe(60);
      expect(calculateEffectiveUnmortgageCost(100)).toBe(66);
      expect(calculateSalary(200)).toBe(200);
      expect(isMarketFrozen()).toBe(false);
      expect(calculateEffectiveMovement(5, 7)).toEqual({
        effectiveSteps: 7,
        newPosition: 12,
        passedStart: false,
        isCapped: false,
        isReverse: false,
      });
    });
  });
});
