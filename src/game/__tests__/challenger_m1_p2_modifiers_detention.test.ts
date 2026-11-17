/**
 * src/game/__tests__/challenger_m1_p2_modifiers_detention.test.ts
 *
 * Empirical Challenger M1-2 Stress Test Suite for Phase 02 Milestone 1:
 * - Extreme combinations of active Chaos Modifiers
 * - Edge case: Landing on Tile 39 (Landmark 81) with Alien Mothership
 * - Detention stress testing: 100 simulated detention entries (doubles, bail, card, 3 failed turns)
 * - Comprehensive board wrap-around under forward, reverse, and curfew movement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { advanceTurn } from '../turn-manager/turnManager';
import {
  calculateEffectiveMovement,
  calculateSalary,
  calculateEffectiveMortgageValue,
  calculateEffectiveUnmortgageCost,
  isMarketFrozen,
  getEffectiveEconomicReport,
  DEFAULT_CHAOS_MODIFIERS,
} from '../economy/economicModifiers';
import {
  calculateRent,
  canBuyProperty,
  canUpgradeProperty,
} from '../property/propertyEngine';
import { resetLedgerSequence } from '../economy/ledgerEngine';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { GameState, ChaosModifiers, PropertyOwnership } from '../types';

// Roadmap C: the expanded deck can move a player after a chest/chaos landing, which would
// blur the detention rules under test. Landings draw a neutral visual-only card here.
vi.mock('../chaos-engine/chaosEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../chaos-engine/chaosEngine')>();
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

/**
 * Deterministic PRNG for 100% reproducible stress testing.
 */
function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setup2PGame(): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players: [
      { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
      { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
    ],
  });
}

describe('Challenger M1-2: Economic Modifiers & Core Rules / Detention Stress Testing', () => {
  beforeEach(() => {
    resetLedgerSequence(1);
  });

  // =========================================================================
  // 1. Extreme Combinations of Chaos Modifiers Active at Once
  // =========================================================================
  describe('1. Extreme Chaos Modifiers Combinations', () => {
    const ALL_ACTIVE_MODIFIERS: ChaosModifiers = {
      reverseDirectionTurns: 3,
      marketFrozenTurns: 3,
      goldenHourTurns: 3,
      curfewTurns: 3,
      transportBoomTurns: 3,
      utilityBoomTurns: 3,
      districtBoomTurns: 3,
      alienMothershipTurns: 3,
      interestHikeTurns: 3,
      subsidizedMortgageTurns: 3,
    };

    it('simultaneously enforces reverse movement and curfew cap', () => {
      // Roll 6 + 6 = 12
      const mov12 = calculateEffectiveMovement(2, 12, ALL_ACTIVE_MODIFIERS);
      expect(mov12.isCapped).toBe(true);
      expect(mov12.effectiveSteps).toBe(4); // curfew capped at 4
      expect(mov12.isReverse).toBe(true);
      // Moving backwards from 2 by 4 steps: (2 - 4) = -2 => 38
      expect(mov12.newPosition).toBe(38);
      expect(mov12.passedStart).toBe(false);

      // Roll 1 + 2 = 3 (under curfew cap of 4)
      const mov3 = calculateEffectiveMovement(2, 3, ALL_ACTIVE_MODIFIERS);
      expect(mov3.isCapped).toBe(false);
      expect(mov3.effectiveSteps).toBe(3);
      expect(mov3.isReverse).toBe(true);
      // (2 - 3) = -1 => 39
      expect(mov3.newPosition).toBe(39);
      expect(mov3.passedStart).toBe(false);
    });

    it('simultaneously enforces market freeze on purchases and upgrades', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: null, level: 0, isMortgaged: false },
        3: { ownerId: 'player-1', level: 0, isMortgaged: false },
      };

      expect(isMarketFrozen(ALL_ACTIVE_MODIFIERS)).toBe(true);
      // Property buy blocked
      const buyCheck = canBuyProperty(1, 10000, props, ALL_ACTIVE_MODIFIERS);
      expect(buyCheck.canBuy).toBe(false);
      expect(buyCheck.reason).toContain('đóng băng');

      // Property upgrade blocked
      const upCheck = canUpgradeProperty(3, 'player-1', 10000, props, ALL_ACTIVE_MODIFIERS);
      expect(upCheck.canUpgrade).toBe(false);
      expect(upCheck.reason).toContain('đóng băng');
    });

    it('simultaneously enforces subsidized mortgage (75%) and interest hike (20%)', () => {
      // Landmark 81 (Tile 39) basePrice = 400
      const mortVal = calculateEffectiveMortgageValue(400, ALL_ACTIVE_MODIFIERS);
      expect(mortVal).toBe(300); // 75% of 400 = 300

      // Unmortgage cost: principal 240 (std 60%) * 1.20 = 288
      const unmortCost = calculateEffectiveUnmortgageCost(400, ALL_ACTIVE_MODIFIERS);
      expect(unmortCost).toBe(288); // 240 * 1.20 = 288
    });

    it('simultaneously applies Golden Hour 2x salary multiplier', () => {
      expect(calculateSalary(200, ALL_ACTIVE_MODIFIERS)).toBe(400);
      expect(calculateSalary(400, ALL_ACTIVE_MODIFIERS)).toBe(800);
    });

    it('correctly reports all diagnostic multipliers in getEffectiveEconomicReport', () => {
      const state = setup2PGame();
      state.chaosModifiers = ALL_ACTIVE_MODIFIERS;

      const report39 = getEffectiveEconomicReport(39, state, 12);
      expect(report39.rent.effectiveRent).toBe(0);
      expect(report39.rent.multipliers.alienMothershipBlocked).toBe(true);
      expect(report39.rent.multipliers.districtBoomMultiplier).toBe(1.5);
      expect(report39.mortgage.mortgageRatio).toBe(0.75);
      expect(report39.mortgage.interestRate).toBe(0.20);
      expect(report39.salary.effectiveSalary).toBe(400);
      expect(report39.movement.isCapped).toBe(true);
      expect(report39.movement.isReverse).toBe(true);
      expect(report39.market.isFrozen).toBe(true);
    });

    it('decrements all 10 active modifiers in lockstep on round completion', () => {
      let state = setup2PGame();
      state.chaosModifiers = { ...ALL_ACTIVE_MODIFIERS };
      state.activePlayerIndex = 1; // Bob's turn (last player in 2P game)

      // End turn triggers completedRound
      state = advanceTurn(state);
      expect(state.roundNumber).toBe(2);

      const mods = state.chaosModifiers!;
      expect(mods.reverseDirectionTurns).toBe(2);
      expect(mods.marketFrozenTurns).toBe(2);
      expect(mods.goldenHourTurns).toBe(2);
      expect(mods.curfewTurns).toBe(2);
      expect(mods.transportBoomTurns).toBe(2);
      expect(mods.utilityBoomTurns).toBe(2);
      expect(mods.districtBoomTurns).toBe(2);
      expect(mods.alienMothershipTurns).toBe(2);
      expect(mods.interestHikeTurns).toBe(2);
      expect(mods.subsidizedMortgageTurns).toBe(2);
    });

    it('executes a full turn in gameReducer under ALL 10 active modifiers simultaneously', () => {
      let state = setup2PGame();
      state.chaosModifiers = { ...ALL_ACTIVE_MODIFIERS };
      state.players[0].position = 2;
      const initialCash = state.players[0].cash;

      // Roll [6, 6] = 12 (double)
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [6, 6] });

      // Capped by curfew (4 steps) and reversed (counter-clockwise)
      // 2 - 4 = -2 => 38
      expect(state.players[0].position).toBe(38);
      // Lands on Tile 38 (Thuế Tài Sản, tax = 100)
      expect(state.players[0].cash).toBe(initialCash - 100);
      // Double was rolled -> gets extra turn
      expect(state.isDouble).toBe(true);
      expect(state.players[0].consecutiveDoubles).toBe(1);

      // Verify tax payment transaction on ledger
      const taxTx = state.ledger?.find(tx => tx.category === 'TAX_PAYMENT' && tx.fromPlayerId === 'player-1');
      expect(taxTx).toBeDefined();
      expect(taxTx?.amount).toBe(100);
    });
  });

  // =========================================================================
  // 2. Tile 39 (Landmark 81) Alien Mothership 0-Rent Edge Case
  // =========================================================================
  describe('2. Tile 39 (Landmark 81) Alien Mothership 0-Rent Edge Case', () => {
    it('forces rent to strictly 0 on Tile 39 regardless of upgrade level (0 to 5) when Alien Mothership is active', () => {
      const ownerId = 'player-2';
      const alienMods: ChaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        alienMothershipTurns: 2,
        districtBoomTurns: 2, // Even with districtBoom +50%!
      };

      // Test all levels 0 through 5
      for (let level = 0; level <= 5; level++) {
        const props: Record<number, PropertyOwnership> = {
          37: { ownerId, level: 0, isMortgaged: false },
          39: { ownerId, level, isMortgaged: false },
        };

        const rent = calculateRent(39, props, 1, 7, alienMods);
        expect(rent.rentAmount, `Level ${level} must yield 0 rent`).toBe(0);
        expect(rent.ownerId).toBe(ownerId);
      }
    });

    it('restores full rent on Tile 39 immediately when Alien Mothership expires (turns = 0)', () => {
      const ownerId = 'player-2';
      const expiredMods: ChaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        alienMothershipTurns: 0,
        districtBoomTurns: 0,
      };

      const props: Record<number, PropertyOwnership> = {
        37: { ownerId, level: 5, isMortgaged: false },
        39: { ownerId, level: 5, isMortgaged: false }, // Landmark 5★ base rent = 2,000k
      };

      const rent = calculateRent(39, props, 1, 7, expiredMods);
      expect(rent.rentAmount).toBe(2000);
    });

    it('does NOT block rent on sibling dark blue property Tile 37 (Nguyễn Huệ)', () => {
      const ownerId = 'player-2';
      const alienMods: ChaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        alienMothershipTurns: 2,
        districtBoomTurns: 0,
      };

      const props: Record<number, PropertyOwnership> = {
        37: { ownerId, level: 5, isMortgaged: false }, // Landmark 5★ base rent = 1,500k
        39: { ownerId, level: 5, isMortgaged: false },
      };

      const rent37 = calculateRent(37, props, 1, 7, alienMods);
      expect(rent37.rentAmount).toBe(1500); // Fully collectible!
    });

    it('protects an insolvent player ($10 cash) from bankruptcy when landing on Tile 39 with Alien Mothership', () => {
      let state = setup2PGame();
      state.chaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        alienMothershipTurns: 2,
      };

      // Player 2 owns Tile 39 with 5★ Landmark ($2,000k rent)
      state.properties[39] = { ownerId: 'player-2', level: 5, isMortgaged: false };
      state.properties[37] = { ownerId: 'player-2', level: 5, isMortgaged: false };

      // Player 1 has only $10 cash, positioned at Tile 35
      state.players[0].cash = 10;
      state.players[0].position = 35;
      const initialBobCash = state.players[1].cash;

      // Roll 2 + 2 = 4 -> lands on Tile 39
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });

      // Invariant: Player 1 MUST NOT be bankrupt, MUST NOT have cash deducted
      expect(state.players[0].position).toBe(39);
      expect(state.players[0].cash).toBe(10);
      expect(state.players[1].cash).toBe(initialBobCash); // No rent paid
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.pendingDebt).toBeNull();
      expect(state.players[0].isBankrupt).toBe(false);
    });
  });

  // =========================================================================
  // 3. Detention Stress Test: 100 Simulated Entries
  // =========================================================================
  describe('3. Detention Stress Testing: 100 Simulated Entries', () => {
    it('100 Monte Carlo simulations: verifies no player is ever stuck in jail or escapes early', () => {
      const rng = createMulberry32(424242);

      for (let run = 0; run < 100; run++) {
        let state = setup2PGame();
        const initialCash = 1500;
        state.players[0].cash = initialCash;
        state.players[0].inDetention = true;
        state.players[0].detentionTurns = 2; // Fresh detention
        state.players[0].position = 10;

        // Choose a randomized strategy:
        // 0: try rolling doubles (up to 3 turns)
        // 1: pay bail immediately via PAY_DETENTION_BAIL
        // 2: use jailFreeCard via USE_DETENTION_CARD
        const strategy = run % 3;

        if (strategy === 1) {
          // PAY BAIL STRATEGY
          state = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
          expect(state.players[0].inDetention).toBe(false);
          expect(state.players[0].detentionTurns).toBe(0);
          expect(state.players[0].cash).toBe(initialCash - state.config.detentionBailCost);
          expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
        } else if (strategy === 2) {
          // JAIL FREE CARD STRATEGY
          state.players[0].jailFreeCards = 1;
          state = gameReducer(state, { type: 'USE_DETENTION_CARD' });
          expect(state.players[0].inDetention).toBe(false);
          expect(state.players[0].detentionTurns).toBe(0);
          expect(state.players[0].jailFreeCards).toBe(0);
          expect(state.players[0].cash).toBe(initialCash); // No bail paid
          expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
        } else {
          // ROLL DOUBLES STRATEGY (UP TO 3 ROLLS)
          let escaped = false;

          for (let attempt = 1; attempt <= 3; attempt++) {
            // Generate dice roll
            const d1 = Math.floor(rng() * 6) + 1;
            const d2 = Math.floor(rng() * 6) + 1;
            const isDouble = d1 === d2;
            const sum = d1 + d2;

            const expectedTurnsBefore = attempt === 1 ? 2 : attempt === 2 ? 1 : 0;
            expect(state.players[0].detentionTurns).toBe(expectedTurnsBefore);

            state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [d1, d2] });

            if (isDouble) {
              // Escaped on doubles!
              expect(state.players[0].inDetention).toBe(false);
              expect(state.players[0].detentionTurns).toBe(0);
              expect(state.players[0].position).toBe((10 + sum) % 40);
              expect(state.isDouble).toBe(false); // No extra turn
              // Verify no bail was paid on free doubles escape
              expect(
                state.ledger?.some(tx => tx.category === 'BAIL_PAYMENT' && tx.fromPlayerId === 'player-1')
              ).toBe(false);
              escaped = true;
              break;
            } else {
              // Failed roll
              if (attempt < 3) {
                // Must still be in detention!
                expect(state.players[0].inDetention).toBe(true);
                expect(state.players[0].position).toBe(10);
                expect(state.players[0].detentionTurns).toBe(2 - attempt);
              } else {
                // Attempt 3 failed -> Free release after serving full sentence
                expect(state.players[0].inDetention).toBe(false);
                expect(state.players[0].detentionTurns).toBe(0);
                expect(state.players[0].position).toBe((10 + sum) % 40);
                escaped = true;
                break;
              }
            }
          }

          // Invariant: Player MUST be free by end of Attempt 3
          expect(escaped).toBe(true);
          expect(state.players[0].inDetention).toBe(false);
        }
      }
    });

    it('rejects PAY_DETENTION_BAIL if player has insufficient cash', () => {
      let state = setup2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;
      state.players[0].cash = 50; // Bail is 100

      state = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].cash).toBe(50);
    });

    it('rejects USE_DETENTION_CARD if player has 0 cards', () => {
      let state = setup2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2;
      state.players[0].jailFreeCards = 0;

      state = gameReducer(state, { type: 'USE_DETENTION_CARD' });
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(2);
    });

    it('releases player freely on 3rd failed roll even if insolvent without forced bankruptcy', () => {
      let state = setup2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 0; // Final attempt
      state.players[0].cash = 30; // Insolvent if bail were mandatory
      state.players[0].position = 10;

      // Roll non-doubles [1, 2] = 3
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });

      // Player must be released from detention without debt
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].cash).toBe(30);
      expect(state.players[0].position).toBe(13);
      expect(state.turnPhase).toBe('ACTION_MENU');
    });

    it('tracks 3 distinct roll attempts across multi-turn game cycles (with END_TURN)', () => {
      let state = setup2PGame();
      state.players[0].inDetention = true;
      state.players[0].detentionTurns = 2; // Fresh detention (Attempt 1 ahead)
      state.players[0].position = 10;
      state.activePlayerIndex = 0;

      // --- TURN 1 (Attempt 1 of 3) ---
      expect(state.players[0].detentionTurns).toBe(2);
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] }); // non-double
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(1);

      // End Player 0 turn -> advances to Player 1
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);

      // Player 1 takes quick turn and ends
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);

      // --- TURN 2 (Attempt 2 of 3) ---
      // At start of Attempt 2, player must still have 1 turn remaining before final attempt!
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(1);

      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] }); // non-double
      // On failing attempt 2, must STILL be in detention, with detentionTurns decremented to 0
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(0);

      // End Player 0 turn -> advances to Player 1
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);

      // Player 1 takes turn and ends
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);

      // --- TURN 3 (Attempt 3 of 3: FINAL ATTEMPT) ---
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(0);

      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] }); // non-double
      // On failing attempt 3, FREE RELEASE triggers!
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.players[0].position).toBe(13); // 10 + 3
    });
  });

  // =========================================================================
  // 4. Board Wrap-Around under Reverse Movement and Boundary Steps
  // =========================================================================
  describe('4. Board Wrap-Around under Reverse Movement & Boundary Steps', () => {
    it('exhaustively validates reverse movement wrapping for all 40 tiles x all 2d6 sums (2 to 12)', () => {
      const revMods: ChaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        reverseDirectionTurns: 1,
        curfewTurns: 0,
      };

      for (let pos = 0; pos < 40; pos++) {
        for (let sum = 2; sum <= 12; sum++) {
          const res = calculateEffectiveMovement(pos, sum, revMods);
          const expectedTarget = ((pos - sum) % 40 + 40) % 40;

          expect(res.newPosition, `Pos ${pos} - ${sum}`).toBe(expectedTarget);
          expect(res.newPosition).toBeGreaterThanOrEqual(0);
          expect(res.newPosition).toBeLessThan(40);
          expect(res.passedStart).toBe(false); // Reverse movement never triggers passedStart
          expect(res.isReverse).toBe(true);
          expect(res.isCapped).toBe(false);
        }
      }
    });

    it('exhaustively validates reverse movement with curfew (cap 4) for all 40 tiles x all sums', () => {
      const curfewRevMods: ChaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        reverseDirectionTurns: 1,
        curfewTurns: 1,
      };

      for (let pos = 0; pos < 40; pos++) {
        for (let sum = 2; sum <= 12; sum++) {
          const res = calculateEffectiveMovement(pos, sum, curfewRevMods);
          const cappedSteps = Math.min(sum, 4);
          const expectedTarget = ((pos - cappedSteps) % 40 + 40) % 40;

          expect(res.effectiveSteps).toBe(cappedSteps);
          expect(res.newPosition).toBe(expectedTarget);
          expect(res.isCapped).toBe(sum > 4);
          expect(res.passedStart).toBe(false);
        }
      }
    });

    it('validates critical boundary steps in reverse movement', () => {
      const revMods: ChaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        reverseDirectionTurns: 1,
      };

      // Boundary 1: Tile 0 stepping back 1 -> Tile 39
      expect(calculateEffectiveMovement(0, 1, revMods).newPosition).toBe(39);

      // Boundary 2: Tile 0 stepping back 4 -> Tile 36
      expect(calculateEffectiveMovement(0, 4, revMods).newPosition).toBe(36);

      // Boundary 3: Tile 1 stepping back 2 -> Tile 39
      expect(calculateEffectiveMovement(1, 2, revMods).newPosition).toBe(39);

      // Boundary 4: Tile 3 stepping back 4 -> Tile 39
      expect(calculateEffectiveMovement(3, 4, revMods).newPosition).toBe(39);

      // Boundary 5: Tile 39 stepping back 1 -> Tile 38
      expect(calculateEffectiveMovement(39, 1, revMods).newPosition).toBe(38);
    });

    it('does NOT award passing salary when reversing across Tile 0', () => {
      let state = setup2PGame();
      const initialCash = state.players[0].cash;
      state.players[0].position = 2;
      state.chaosModifiers = {
        ...DEFAULT_CHAOS_MODIFIERS,
        reverseDirectionTurns: 2,
      };

      // Roll [2, 3] = 5 in reverse -> moves from Tile 2 to Tile 37 (unowned property, wraps across 0)
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });

      expect(state.players[0].position).toBe(37);
      // Invariant: Must NOT receive $200k passing salary when moving backwards!
      expect(state.players[0].cash).toBe(initialCash);
      expect(state.ledger?.some(tx => tx.category === 'SALARY_START')).toBe(false);
    });
  });
});
