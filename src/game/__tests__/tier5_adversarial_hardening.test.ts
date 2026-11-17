import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { applyChaosCard } from '../chaos-engine/chaosEngine';
import { getChaosCardById } from '../chaos-engine/chaosCards';
import {
  canBuyProperty,
  canUnmortgageProperty,
  getMortgageValue,
  getUnmortgageCost,
  getTileById,
} from '../property/propertyEngine';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { GameState, PropertyOwnership } from '../types';

describe('Tier 5: Adversarial Coverage Hardening & Empirical Invariants', () => {
  // Helper to initialize a clean multi-player game state
  function createTestState(playerCount: number = 4, startingCash: number = 1500, maxRounds: number = 60): GameState {
    const players = DEFAULT_PLAYER_TOKENS.slice(0, playerCount).map((token, i) => ({
      name: `Player ${i + 1}`,
      token,
    }));
    return gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players,
      config: { maxRounds, startingCash },
    });
  }

  // =========================================================================
  // SECTION 1: CASCADING TRIPLE BANKRUPTCY & CREDITOR ASSET PROPAGATION
  // =========================================================================
  describe('1. Cascading Triple Bankruptcy & Creditor Asset Propagation', () => {
    it('executes full 4-player cascading triple bankruptcy chain (P4 -> P3 -> P2 -> P1 sole winner)', () => {
      let state = createTestState(4, 1000);

      // Setup property ownership across players:
      // P4 owns Tile 1 (unmortgaged) and Tile 3 (mortgaged)
      // P3 owns Tile 6 (Level 5 Landmark)
      // P2 owns Tile 37 (unmortgaged) and Tile 39 (Level 5 Landmark 81)
      // P1 owns Tile 11 and Tile 13
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-4', level: 0, isMortgaged: false },
          3: { ownerId: 'player-4', level: 0, isMortgaged: true },
          6: { ownerId: 'player-3', level: 5, isMortgaged: false },
          37: { ownerId: 'player-2', level: 0, isMortgaged: false },
          39: { ownerId: 'player-2', level: 5, isMortgaged: false },
          11: { ownerId: 'player-1', level: 2, isMortgaged: false },
          13: { ownerId: 'player-1', level: 2, isMortgaged: false },
        },
        players: [
          { ...state.players[0], cash: 1500, position: 0 },
          { ...state.players[1], cash: 400, position: 0 },
          { ...state.players[2], cash: 200, position: 0 },
          { ...state.players[3], cash: 80, position: 0 },
        ],
      };

      // --- STEP 1: P4 bankrupts to P3 ---
      // P4 lands on P3's Tile 6. Rent at Level 5 is $450 (or higher).
      // P4 has only $80 cash.
      state = { ...state, activePlayerIndex: 3 }; // P4 active
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] }); // Move to tile 6 (sum=6)
      expect(state.players[3].position).toBe(6);

      // P4 paid all $80 to P3, cash is clamped at 0
      expect(state.players[3].cash).toBe(0);
      expect(state.players[2].cash).toBe(280); // 200 + 80
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt?.creditorPlayerId).toBe('player-3');

      // P4 declares bankruptcy
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-4' });
      expect(state.players[3].isBankrupt).toBe(true);
      expect(state.status).toBe('PLAYING'); // 3 players still solvent

      // Verify P4's properties transferred to P3, retaining mortgage status
      expect(state.properties[1]?.ownerId).toBe('player-3');
      expect(state.properties[1]?.isMortgaged).toBe(false);
      expect(state.properties[3]?.ownerId).toBe('player-3');
      expect(state.properties[3]?.isMortgaged).toBe(true);

      // --- STEP 2: P3 bankrupts to P2 ---
      // P3 now owns Tile 1, Tile 3, Tile 6, with $280 cash.
      // Set P3 active, position at 33, rolling [3, 3] = 6 steps lands on Tile 39 (Landmark 81, owned by P2)
      state = { ...state, activePlayerIndex: 2 }; // P3 active
      state = {
        ...state,
        players: state.players.map(p => (p.id === 'player-3' ? { ...p, position: 33 } : p)),
      };
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.players[2].position).toBe(39);

      // Landmark 81 Level 5 rent is $2000, P3 only has $280 cash
      expect(state.players[2].cash).toBe(0);
      expect(state.players[1].cash).toBe(680); // 400 + 280
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt?.creditorPlayerId).toBe('player-2');

      // P3 declares bankruptcy
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-3' });
      expect(state.players[2].isBankrupt).toBe(true);
      expect(state.status).toBe('PLAYING'); // 2 players still solvent (P1, P2)

      // Verify P2 now owns P3's original properties AND properties inherited from P4
      expect(state.properties[6]?.ownerId).toBe('player-2');
      expect(state.properties[1]?.ownerId).toBe('player-2');
      expect(state.properties[3]?.ownerId).toBe('player-2');
      expect(state.properties[3]?.isMortgaged).toBe(true); // Retained mortgage

      // --- STEP 3: P2 bankrupts to P1 ---
      // P2 now owns Tiles 1, 3, 6, 37, 39, with $680 cash.
      // Set P2 active at position 7, rolling [2, 2] = 4 steps lands on Tile 11 (owned by P1)
      state = { ...state, activePlayerIndex: 1 }; // P2 active
      state = {
        ...state,
        players: state.players.map(p => (p.id === 'player-2' ? { ...p, position: 7 } : p)),
        // Set tile 11 to huge rent level
        properties: {
          ...state.properties,
          11: { ownerId: 'player-1', level: 5, isMortgaged: false },
        },
      };
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[1].position).toBe(11);

      // P2 pays all available cash to P1
      expect(state.players[1].cash).toBe(0);
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt?.creditorPlayerId).toBe('player-1');

      // P2 declares bankruptcy
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });

      // FINAL VERIFICATION: P1 is sole survivor
      expect(state.players[1].isBankrupt).toBe(true);
      expect(state.status).toBe('ENDED');
      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.winner?.id).toBe('player-1');

      // Verify P1 has inherited the ENTIRE chain of properties (from P2, P3, and P4)
      expect(state.properties[1]?.ownerId).toBe('player-1');
      expect(state.properties[3]?.ownerId).toBe('player-1');
      expect(state.properties[6]?.ownerId).toBe('player-1');
      expect(state.properties[37]?.ownerId).toBe('player-1');
      expect(state.properties[39]?.ownerId).toBe('player-1');
      expect(state.properties[11]?.ownerId).toBe('player-1');
      expect(state.properties[13]?.ownerId).toBe('player-1');

      // Invariant: Cash of all bankrupt players is exactly 0, none is negative
      expect(state.players[1].cash).toBe(0);
      expect(state.players[2].cash).toBe(0);
      expect(state.players[3].cash).toBe(0);
      expect(state.players[0].cash).toBeGreaterThan(1500);
    });

    it('transfers debtor unspent cash directly to creditor upon bankruptcy', () => {
      let state = createTestState(2, 1000);
      // P1 has 200 cash, owes 500 rent to P2.
      // But suppose P1 declares bankruptcy while holding 150 cash (e.g. before full transfer or via debt phase)
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 150 },
          { ...state.players[1], cash: 500 },
        ],
        pendingDebt: {
          creditorPlayerId: 'player-2',
          amount: 500,
          reason: 'Unpayable rent',
        },
      };

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });

      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].isBankrupt).toBe(true);
      // P2 should receive P1's remaining 150 cash: 500 + 150 = 650
      expect(state.players[1].cash).toBe(650);
      expect(state.status).toBe('ENDED');
      expect(state.winner?.id).toBe('player-2');
    });

    it('resets properties to bank when bankrupting to bank (no creditor)', () => {
      let state = createTestState(3, 1000);
      // P1 owns tile 1 with level 3, mortgaged tile 3
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 3, isMortgaged: false },
          3: { ownerId: 'player-1', level: 0, isMortgaged: true },
        },
        pendingDebt: {
          creditorPlayerId: null, // Bank debt (Tax/Chaos)
          amount: 800,
          reason: 'Severe Tax Evasion Penalty',
        },
      };

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });

      // Properties must return to bank: unowned, 0 level, unmortgaged
      expect(state.properties[1]?.ownerId).toBeNull();
      expect(state.properties[1]?.level).toBe(0);
      expect(state.properties[1]?.isMortgaged).toBe(false);

      expect(state.properties[3]?.ownerId).toBeNull();
      expect(state.properties[3]?.level).toBe(0);
      expect(state.properties[3]?.isMortgaged).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 2: RARE LEGENDARY CHAOS EVENTS EXECUTION & STRESS TESTING
  // =========================================================================
  describe('2. Rare Legendary Chaos Events Execution & Stress Testing', () => {
    it('executes Wealth Equalization (leg-robin-hood) transferring 25% cash from richest to poorest', () => {
      let state = createTestState(4, 1000);
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 4000 }, // Richest Net Worth
          { ...state.players[1], cash: 1200 },
          { ...state.players[2], cash: 800 },
          { ...state.players[3], cash: 200 },  // Poorest Net Worth
        ],
        activePlayerIndex: 0,
      };

      const card = getChaosCardById('leg-robin-hood');
      expect(card).toBeDefined();
      expect(card?.effectType).toBe('REDISTRIBUTE_WEALTH');

      state = applyChaosCard(state, card!);

      // Richest (P1) transfers 25% of 4000 = 1000 to Poorest (P4)
      expect(state.players[0].cash).toBe(3000);
      expect(state.players[3].cash).toBe(1200); // 200 + 1000
      expect(state.players[1].cash).toBe(1200); // Unchanged
      expect(state.players[2].cash).toBe(800);  // Unchanged
    });

    it('safely handles Wealth Equalization when richest player has $0 cash', () => {
      let state = createTestState(3, 1000);
      // P1 has 0 cash but owns expensive properties (highest net worth)
      state = {
        ...state,
        properties: {
          ...state.properties,
          39: { ownerId: 'player-1', level: 5, isMortgaged: false },
        },
        players: [
          { ...state.players[0], cash: 0 },
          { ...state.players[1], cash: 500 },
          { ...state.players[2], cash: 100 },
        ],
        activePlayerIndex: 1,
      };

      const card = getChaosCardById('leg-robin-hood')!;
      state = applyChaosCard(state, card);

      // Richest has 0 cash -> transfer is Math.floor(0 * 0.25) = 0
      expect(state.players[0].cash).toBe(0);
      expect(state.players[2].cash).toBe(100);
    });

    it('skips bankrupt players during Wealth Equalization', () => {
      let state = createTestState(3, 1000);
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 2000 },
          { ...state.players[1], cash: 500 },
          { ...state.players[2], cash: 0, isBankrupt: true }, // Bankrupt
        ],
        activePlayerIndex: 0,
      };

      const card = getChaosCardById('leg-robin-hood')!;
      state = applyChaosCard(state, card);

      // Poorest solvent is P2, not P3
      expect(state.players[0].cash).toBe(1500); // 2000 - 500
      expect(state.players[1].cash).toBe(1000); // 500 + 500
      expect(state.players[2].cash).toBe(0);
      expect(state.players[2].isBankrupt).toBe(true);
    });

    it('executes Cosmic Black Hole Warp (leg-black-hole-warp) teleporting all players to highest upgrade tile', () => {
      let state = createTestState(4, 1000);
      state = {
        ...state,
        properties: {
          ...state.properties,
          24: { ownerId: 'player-2', level: 4, isMortgaged: false }, // Highest level = 4
          1: { ownerId: 'player-1', level: 2, isMortgaged: false },
        },
        players: [
          { ...state.players[0], position: 0 },
          { ...state.players[1], position: 10 },
          { ...state.players[2], position: 20 },
          { ...state.players[3], position: 5, isBankrupt: true }, // Bankrupt player
        ],
        activePlayerIndex: 0,
      };

      const card = getChaosCardById('leg-black-hole-warp');
      expect(card).toBeDefined();
      expect(card?.effectType).toBe('TELEPORT_ALL');

      state = applyChaosCard(state, card!);

      // All solvent players must be teleported to Tile 24
      expect(state.players[0].position).toBe(24);
      expect(state.players[1].position).toBe(24);
      expect(state.players[2].position).toBe(24);
      // Bankrupt player position untouched
      expect(state.players[3].position).toBe(5);
    });

    it('executes Mega Earthquake (leg-mega-earthquake) degrading all upgraded properties by 1 star', () => {
      let state = createTestState(3, 1000);
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 5, isMortgaged: false }, // Landmark
          3: { ownerId: 'player-1', level: 2, isMortgaged: false },
          6: { ownerId: 'player-2', level: 1, isMortgaged: false },
          8: { ownerId: 'player-2', level: 0, isMortgaged: false }, // Bare land
        },
        activePlayerIndex: 0,
      };

      const card = getChaosCardById('leg-mega-earthquake');
      expect(card).toBeDefined();

      state = applyChaosCard(state, card!);

      expect(state.properties[1]?.level).toBe(4);
      expect(state.properties[3]?.level).toBe(1);
      expect(state.properties[6]?.level).toBe(0);
      expect(state.properties[8]?.level).toBe(0); // Level never drops below 0
    });

    it('executes Deathmatch Duel (leg-deathmatch-duel) stealing cash without driving opponents negative', () => {
      let state = createTestState(4, 1000);
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 500 }, // Active attacker
          { ...state.players[1], cash: 400 }, // Has > 300
          { ...state.players[2], cash: 120 }, // Has < 300
          { ...state.players[3], cash: 0, isBankrupt: true }, // Bankrupt
        ],
        activePlayerIndex: 0,
      };

      const card = getChaosCardById('leg-deathmatch-duel');
      expect(card).toBeDefined();
      expect(card?.value).toBe(300);

      state = applyChaosCard(state, card!);

      // Roadmap C damage cap: each victim loses at most 25% of its cash.
      // P2 has 400 -> loses 100 (cap), not 300 -> cash 300
      expect(state.players[1].cash).toBe(300);
      // P3 has 120 -> loses 30 (cap), never negative -> cash 90
      expect(state.players[2].cash).toBe(90);
      // P4 bankrupt is untouched
      expect(state.players[3].cash).toBe(0);
      // P1 gains 100 + 30 = 130 -> 500 + 130 = 630
      expect(state.players[0].cash).toBe(630);
    });

    it('executes National Debt Jubilee (leg-national-jubilee) clearing all mortgages across the board', () => {
      let state = createTestState(3, 1000);
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 0, isMortgaged: true },
          6: { ownerId: 'player-2', level: 0, isMortgaged: true },
          8: { ownerId: 'player-2', level: 0, isMortgaged: false },
        },
        activePlayerIndex: 0,
      };

      const card = getChaosCardById('leg-national-jubilee');
      expect(card).toBeDefined();

      state = applyChaosCard(state, card!);

      expect(state.properties[1]?.isMortgaged).toBe(false);
      expect(state.properties[6]?.isMortgaged).toBe(false);
      expect(state.properties[8]?.isMortgaged).toBe(false);
    });

    it('activates Alien Mothership (leg-alien-mothership) setting active turn modifier to 5', () => {
      let state = createTestState(2, 1000);
      const card = getChaosCardById('leg-alien-mothership');
      expect(card).toBeDefined();

      state = applyChaosCard(state, card!);
      expect(state.chaosModifiers?.alienMothershipTurns).toBe(5);
    });
  });

  // =========================================================================
  // SECTION 3: EXTREME RAPID-FIRE DICE ROLLING & CONSECUTIVE DOUBLES JAIL
  // =========================================================================
  describe('3. Extreme Rapid-Fire Dice Rolling & 3-Consecutive Doubles Jail Transitions', () => {
    it('sends player to Detention on 3rd consecutive double and revokes extra turn', () => {
      let state = createTestState(2, 1500);
      expect(state.players[0].consecutiveDoubles).toBe(0);

      // 1st Double [2, 2]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[0].consecutiveDoubles).toBe(1);
      expect(state.isDouble).toBe(true);

      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0); // Extra turn granted
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      // 2nd Double [4, 4]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });
      expect(state.players[0].consecutiveDoubles).toBe(2);
      expect(state.isDouble).toBe(true);

      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0); // 2nd extra turn granted
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      // 3rd Double [6, 6] -> Must trigger jail immediately!
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [6, 6] });

      // Player must be at Tile 10 (Detention), NOT advanced by 12 steps
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(2);
      expect(state.players[0].consecutiveDoubles).toBe(0); // Reset
      expect(state.isDouble).toBe(false); // Extra turn revoked

      // Ending turn now must pass to Player 2
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });

    it('resets consecutive doubles counter when interrupted by a non-double roll', () => {
      let state = createTestState(2, 1500);

      // Roll [3, 3] -> 1 double
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.players[0].consecutiveDoubles).toBe(1);
      state = gameReducer(state, { type: 'END_TURN' });

      // Roll [1, 2] -> Single
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.isDouble).toBe(false);

      // End turn passes to next player
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.players[0].consecutiveDoubles).toBe(0);
    });

    it('escapes detention immediately when rolling doubles while imprisoned', () => {
      let state = createTestState(2, 1500);
      // Place player 1 in detention
      state = {
        ...state,
        players: [
          { ...state.players[0], inDetention: true, detentionTurns: 2, position: 10 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      // Roll double [5, 5] while in detention
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [5, 5] });

      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.players[0].position).toBe(20); // 10 + 10
      // Invariant: Escaping via doubles does NOT grant an extra roll
      expect(state.isDouble).toBe(false);
      expect(state.turnPhase).toBe('ACTION_MENU');
    });

    it('rejects illegal actions when game is over or in wrong phase', () => {
      let state = createTestState(2, 1500);
      state = {
        ...state,
        status: 'ENDED',
        turnPhase: 'GAME_OVER',
        winner: state.players[0],
      };

      // Any gameplay action dispatched on ended match must return identical state
      const stateAfterRoll = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 4] });
      expect(stateAfterRoll).toBe(state);

      const stateAfterBuy = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(stateAfterBuy).toBe(state);

      const stateAfterEnd = gameReducer(state, { type: 'END_TURN' });
      expect(stateAfterEnd).toBe(state);
    });
  });

  // =========================================================================
  // SECTION 4: SOLVENCY INVARIANTS & DEBT RESOLUTION
  // =========================================================================
  describe('4. Solvency Invariants & Clean Debt Resolution', () => {
    it('blocks END_TURN during BANKRUPTCY_CHECK until debt is paid or bankrupt', () => {
      let state = createTestState(2, 1500);
      state = {
        ...state,
        turnPhase: 'BANKRUPTCY_CHECK',
        pendingDebt: {
          creditorPlayerId: 'player-2',
          amount: 250,
          reason: 'Rent crisis',
        },
        activePlayerIndex: 0,
      };

      // Player 1 tries to skip turn without paying
      const stateAfterAttempt = gameReducer(state, { type: 'END_TURN' });
      expect(stateAfterAttempt).toBe(state); // Blocked!
      expect(stateAfterAttempt.turnPhase).toBe('BANKRUPTCY_CHECK');
    });

    it('allows mortgaging property to raise cash, resolves debt, and cleanly returns to ACTION_MENU', () => {
      let state = createTestState(2, 1500);
      // P1 has 50 cash, owes 200 rent to P2. Owns Tile 1 (basePrice 60 -> mortgage 30) and Tile 6 (basePrice 100 -> mortgage 50) and Tile 11 (basePrice 140 -> mortgage 70) and Tile 13 (basePrice 140 -> mortgage 70)
      state = {
        ...state,
        properties: {
          ...state.properties,
          11: { ownerId: 'player-1', level: 0, isMortgaged: false },
          13: { ownerId: 'player-1', level: 0, isMortgaged: false },
        },
        players: [
          { ...state.players[0], cash: 50 },
          { ...state.players[1], cash: 1000 },
        ],
        activePlayerIndex: 0,
        turnPhase: 'BANKRUPTCY_CHECK',
        pendingDebt: {
          creditorPlayerId: 'player-2',
          amount: 150,
          reason: 'Rent debt',
        },
      };

      // P1 mortgages Tile 11 (mortgage value = 84)
      state = gameReducer(state, { type: 'MORTGAGE_PROPERTY', tileId: 11 });
      expect(state.players[0].cash).toBe(134); // 50 + 84 = 134 (still < 150)
      expect(state.properties[11]?.isMortgaged).toBe(true);

      // Attempting to resolve debt when cash < amount still fails
      const stateFail = gameReducer(state, { type: 'RESOLVE_DEBT' });
      expect(stateFail.pendingDebt).not.toBeNull();

      // P1 mortgages Tile 13 (mortgage value = 84)
      state = gameReducer(state, { type: 'MORTGAGE_PROPERTY', tileId: 13 });
      expect(state.players[0].cash).toBe(218); // 134 + 84 = 218 (now >= 150!)

      // P1 resolves debt!
      state = gameReducer(state, { type: 'RESOLVE_DEBT' });
      expect(state.pendingDebt).toBeNull();
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.players[0].cash).toBe(68); // 218 - 150
      expect(state.players[1].cash).toBe(1150); // 1000 + 150

      // Now P1 can safely end turn!
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
    });

    it('resolves bank debt (tax) cleanly and updates player cash balance', () => {
      let state = createTestState(2, 1500);
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 200 },
          state.players[1],
        ],
        activePlayerIndex: 0,
        turnPhase: 'BANKRUPTCY_CHECK',
        pendingDebt: {
          creditorPlayerId: null, // Bank
          amount: 150,
          reason: 'City Wealth Tax',
        },
      };

      state = gameReducer(state, { type: 'RESOLVE_DEBT' });
      expect(state.pendingDebt).toBeNull();
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.players[0].cash).toBe(50); // 200 - 150
    });

    it('guarantees cash never drops below 0 when negative chaos fine exceeds cash balance', () => {
      let state = createTestState(2, 1000);
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 30 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      // Cyber heist penalty: -150k VND
      const card = getChaosCardById('neg-cyber-scam')!;
      state = applyChaosCard(state, card);

      // Roadmap C damage cap: a single card takes at most 25% of cash (30 -> 7),
      // so it no longer forces bankruptcy; cash stays non-negative.
      expect(state.players[0].cash).toBe(23);
      expect(state.turnPhase).not.toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt).toBeFalsy();
    });
  });

  // =========================================================================
  // SECTION 5: EXACT MONEY BOUNDARIES ($0, EXACT BAIL, EXACT MORTGAGE)
  // =========================================================================
  describe('5. Exact Money Boundaries', () => {
    it('allows buying property when cash equals exact base price, leaving exactly $0 cash', () => {
      let state = createTestState(2, 1000);
      const tile1 = getTileById(1)!;
      const basePrice = tile1.property!.basePrice; // 60

      state = {
        ...state,
        players: [
          { ...state.players[0], cash: basePrice },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      const check = canBuyProperty(1, basePrice, state.properties);
      expect(check.canBuy).toBe(true);

      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].isBankrupt).toBe(false);
      expect(state.properties[1]?.ownerId).toBe('player-1');
    });

    it('rejects buying property when cash is exactly 1 unit below price', () => {
      const tile1 = getTileById(1)!;
      const price = tile1.property!.basePrice; // 60

      const check = canBuyProperty(1, price - 1, {});
      expect(check.canBuy).toBe(false);
    });

    it('allows paying detention bail with exact cash balance ($100), leaving exactly $0 cash', () => {
      let state = createTestState(2, 1000);
      const bailCost = state.config.detentionBailCost; // 100

      state = {
        ...state,
        players: [
          { ...state.players[0], inDetention: true, detentionTurns: 2, cash: bailCost },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      state = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].isBankrupt).toBe(false);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });

    it('rejects paying detention bail when cash is 1 unit below bail cost ($99)', () => {
      let state = createTestState(2, 1000);
      const bailCost = state.config.detentionBailCost; // 100

      state = {
        ...state,
        players: [
          { ...state.players[0], inDetention: true, detentionTurns: 2, cash: bailCost - 1 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      const stateAttempt = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      expect(stateAttempt).toBe(state); // Unchanged
      expect(stateAttempt.players[0].inDetention).toBe(true);
      expect(stateAttempt.players[0].cash).toBe(99);
    });

    it('calculates exact unmortgage cost with 10% interest and tests exact cash boundary', () => {
      const tileId = 1; // Bến Ninh Kiều: basePrice = 60
      const mortgageVal = getMortgageValue(tileId); // 36
      const unmortgageCost = getUnmortgageCost(tileId); // Math.floor(36 * 1.10) = 39

      expect(mortgageVal).toBe(36);
      expect(unmortgageCost).toBe(39);

      const properties: Record<number, PropertyOwnership> = {
        [tileId]: { ownerId: 'player-1', level: 0, isMortgaged: true },
      };

      // Test exact cost = 39: eligible!
      const checkExact = canUnmortgageProperty(tileId, 'player-1', 39, properties);
      expect(checkExact.canUnmortgage).toBe(true);

      // Test 38 (1 unit below): rejected!
      const checkBelow = canUnmortgageProperty(tileId, 'player-1', 38, properties);
      expect(checkBelow.canUnmortgage).toBe(false);

      // Test reducer execution with exact 39 cash
      let state = createTestState(2, 1000);
      state = {
        ...state,
        properties: {
          ...state.properties,
          ...properties,
        },
        players: [
          { ...state.players[0], cash: 39 },
          state.players[1],
        ],
        activePlayerIndex: 0,
      };

      state = gameReducer(state, { type: 'UNMORTGAGE_PROPERTY', tileId });
      expect(state.properties[tileId]?.isMortgaged).toBe(false);
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].isBankrupt).toBe(false);
    });

    it('pays exact rent leaving exactly $0 cash without triggering debt crisis', () => {
      let state = createTestState(2, 1000);
      // P2 owns Tile 1 (baseRent = 2, monopoly = 4)
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-2', level: 0, isMortgaged: false },
          3: { ownerId: 'player-2', level: 0, isMortgaged: false }, // Monopoly set -> rent = 4
        },
        players: [
          { ...state.players[0], cash: 4, position: 0 }, // Exact cash = 4
          { ...state.players[1], cash: 1000 },
        ],
        activePlayerIndex: 0,
      };

      // Roll [0, 1] -> step 1 lands on Tile 1
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [0, 1] as any });

      // P1 pays exact 4 rent
      expect(state.players[0].cash).toBe(0);
      expect(state.players[1].cash).toBe(1004);
      // Because exact rent was satisfied, NO BANKRUPTCY_CHECK is triggered!
      expect(state.turnPhase).toBe('ACTION_MENU');
      expect(state.pendingDebt).toBeNull();
    });
  });
});
