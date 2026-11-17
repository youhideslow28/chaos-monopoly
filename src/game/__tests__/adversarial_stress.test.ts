import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { calculatePlayerNetWorth } from '../economy/economyEngine';
import { evaluateWinCondition } from '../win-condition/winCondition';
import { applyChaosCard } from '../chaos-engine/chaosEngine';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { GameState, PlayerState, PropertyOwnership } from '../types';

describe('Adversarial Empirical Stress Suite — Milestone 1', () => {
  // Helper to create fresh multi-player state
  function createTestState(playerCount: number = 2, maxRounds: number = 60): GameState {
    const players = DEFAULT_PLAYER_TOKENS.slice(0, playerCount).map((token, i) => ({
      name: `Player ${i + 1}`,
      token,
    }));
    return gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players,
      config: { maxRounds, startingCash: 1500 },
    });
  }

  // =========================================================================
  // SECTION 1: 3 Consecutive Doubles Jail Transition & Doubles Mechanics
  // =========================================================================
  describe('1. 3 Consecutive Doubles Jail Transition & Jail Escape Mechanics', () => {
    it('sends player to Detention on 3rd double without advancing board position on 3rd roll', () => {
      let state = createTestState(2);
      expect(state.players[0].position).toBe(0);
      expect(state.players[0].consecutiveDoubles).toBe(0);

      // Roll 1: [2, 2] -> sum = 4, moves from 0 to 4
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
      expect(state.players[0].position).toBe(4);
      expect(state.players[0].consecutiveDoubles).toBe(1);
      expect(state.isDouble).toBe(true);

      // Player ends turn -> receives extra turn
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      // Roll 2: [3, 3] -> sum = 6, moves from 4 to 10 (visiting jail)
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].consecutiveDoubles).toBe(2);
      expect(state.isDouble).toBe(true);

      // Player ends turn -> receives second extra turn
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);

      // Roll 3: [4, 4] -> 3rd CONSECUTIVE DOUBLE!
      // Must NOT move 8 steps to tile 18. Must be sent directly to tile 10 in Detention!
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].inDetention).toBe(true);
      expect(state.players[0].detentionTurns).toBe(2);
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.isDouble).toBe(false); // isDouble revoked!

      // Player ends turn -> must NOT receive an extra turn; turn passes to Player 2
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });

    it('resets consecutive doubles counter when a non-double is rolled after doubles', () => {
      let state = createTestState(2);

      // Roll 1: double [1, 1]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
      expect(state.players[0].consecutiveDoubles).toBe(1);
      state = gameReducer(state, { type: 'END_TURN' });

      // Roll 2: non-double [2, 3]
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.isDouble).toBe(false);

      // End turn -> advances to next player
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.players[0].consecutiveDoubles).toBe(0);
      expect(state.players[1].consecutiveDoubles).toBe(0);
    });

    it('releases player from detention when rolling doubles while imprisoned', () => {
      let state = createTestState(2);
      // Place player 1 in detention
      state.players[0].inDetention = true;
      state.players[0].position = 10;
      state.players[0].detentionTurns = 2;

      // Player 1 rolls double [3, 3] while in detention
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });

      // Should be released from detention immediately
      expect(state.players[0].inDetention).toBe(false);
      expect(state.players[0].detentionTurns).toBe(0);
      expect(state.isDouble).toBe(false); // No extra turn granted on escape
    });
  });

  // =========================================================================
  // SECTION 2: Debt Liquidation Under Creditor Claims
  // =========================================================================
  describe('2. Debt Liquidation Under Creditor Claims', () => {
    it('strictly preserves non-negative cash invariant when debt exceeds available cash', () => {
      let state = createTestState(2);

      // Player 2 owns Landmark 81 (Tile 39, baseRent 50, houseRent level 5 = 2000)
      state = {
        ...state,
        properties: {
          ...state.properties,
          39: { ownerId: 'player-2', level: 5, isMortgaged: false },
        },
        players: [
          { ...state.players[0], cash: 300, position: 35 }, // Player 1 has only $300k
          state.players[1],
        ],
      };

      // Player 1 rolls 4 -> lands on Tile 39. Rent is 2000k.
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });

      // Cash must NEVER be negative in state!
      expect(state.players[0].cash).toBe(0);
      expect(state.players[0].cash).toBeGreaterThanOrEqual(0);

      // Creditor (Player 2) received all available $300k
      expect(state.players[1].cash).toBe(1500 + 300);

      // State entered debt check with structured pendingDebt
      expect(state.turnPhase).toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt).not.toBeNull();
      expect(state.pendingDebt?.creditorPlayerId).toBe('player-2');
      expect(state.pendingDebt?.amount).toBe(1700); // 2000 - 300
    });

    it('tests whether RESOLVE_DEBT can be executed when in BANKRUPTCY_CHECK phase after raising funds', () => {
      let state = createTestState(2);

      // Setup Player 1 with low cash and pending debt
      state = {
        ...state,
        turnPhase: 'BANKRUPTCY_CHECK',
        pendingDebt: {
          creditorPlayerId: 'player-2',
          amount: 100,
          reason: 'Rent debt',
        },
        players: [
          { ...state.players[0], cash: 200 }, // Player 1 has enough cash now
          state.players[1],
        ],
      };

      // Attempt to resolve debt
      const resolvedState = gameReducer(state, { type: 'RESOLVE_DEBT' });

      // Invariant: When cash >= debt amount, RESOLVE_DEBT must clear pendingDebt and transition phase
      expect(resolvedState.pendingDebt).toBeNull();
      expect(resolvedState.turnPhase).toBe('ACTION_MENU');
      expect(resolvedState.players[0].cash).toBe(100); // 200 - 100
      expect(resolvedState.players[1].cash).toBe(1600); // 1500 + 100
    });

    it('transfers all properties to creditor with mortgage flags intact upon bankruptcy', () => {
      let state = createTestState(2);

      // Player 1 owns Tile 1 (level 2) and Tile 3 (mortgaged level 0)
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 2, isMortgaged: false },
          3: { ownerId: 'player-1', level: 0, isMortgaged: true },
        },
        pendingDebt: {
          creditorPlayerId: 'player-2',
          amount: 500,
          reason: 'Unpayable rent',
        },
      };

      // Player 1 declares bankruptcy to creditor Player 2
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });

      // Player 1 is bankrupt
      expect(state.players[0].isBankrupt).toBe(true);
      expect(state.players[0].cash).toBe(0);

      // Properties transferred to Player 2
      expect(state.properties[1]?.ownerId).toBe('player-2');
      expect(state.properties[1]?.level).toBe(2); // Level preserved
      expect(state.properties[3]?.ownerId).toBe('player-2');
      expect(state.properties[3]?.isMortgaged).toBe(true); // Mortgage flag preserved
    });

    it('returns properties to bank with cleared levels and mortgage when bankrupt to bank', () => {
      let state = createTestState(2);

      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-1', level: 2, isMortgaged: false },
          3: { ownerId: 'player-1', level: 0, isMortgaged: true },
        },
        pendingDebt: {
          creditorPlayerId: null, // Debt to bank
          amount: 500,
          reason: 'Tax penalty',
        },
      };

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });

      expect(state.properties[1]?.ownerId).toBeNull();
      expect(state.properties[1]?.level).toBe(0);
      expect(state.properties[3]?.ownerId).toBeNull();
      expect(state.properties[3]?.isMortgaged).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 3: Turn Progression Across 2, 3, and 4 Players
  // =========================================================================
  describe('3. Turn Progression Across 2, 3, and 4 Players', () => {
    it('correctly rotates turns across 2 players and increments round number', () => {
      let state = createTestState(2);
      expect(state.activePlayerIndex).toBe(0);
      expect(state.roundNumber).toBe(1);

      // P1 finishes turn -> P2, round 1
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.roundNumber).toBe(1);

      // P2 finishes turn -> P1, round 2
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);
      expect(state.roundNumber).toBe(2);
    });

    it('correctly rotates turns across 3 players and skips bankrupt player cleanly', () => {
      let state = createTestState(3);
      expect(state.players.length).toBe(3);

      // P1 turn
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1); // P2

      // P2 declares bankruptcy during turn
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.activePlayerIndex).toBe(2); // Automatically advanced to P3!

      // P3 finishes turn
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });

      // Must cycle back to P1, skipping bankrupt P2
      expect(state.activePlayerIndex).toBe(0);
      expect(state.roundNumber).toBe(2);

      // Next turn from P1 must skip P2 and jump straight to P3
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(2);
    });

    it('correctly rotates turns across 4 players with multiple bankruptcies', () => {
      let state = createTestState(4);
      expect(state.players.length).toBe(4);

      // Eliminate P1 and P3
      state = {
        ...state,
        players: [
          { ...state.players[0], isBankrupt: true },
          state.players[1],
          { ...state.players[2], isBankrupt: true },
          state.players[3],
        ],
        activePlayerIndex: 1, // Start on P2
      };

      // P2 finishes turn -> must skip P3 and go to P4
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(3); // P4

      // P4 finishes turn -> must skip P1 and go back to P2, completing round
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1); // P2
      expect(state.roundNumber).toBe(2);
    });
  });

  // =========================================================================
  // SECTION 4: 60-Round Match Conclusion and Net Worth Tie-Breaker
  // =========================================================================
  describe('4. 60-Round Match Conclusion and Net Worth Tie-Breaker', () => {
    it('evaluates highest Net Worth accurately using formula: Cash + Base + Upgrades - Mortgages', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Player 1',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 1000,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 2 },
      };

      // Tile 1: basePrice 60, upgradeCost 50, level 3 -> 60 + 150 = 210
      // Tile 3: basePrice 60, upgradeCost 50, level 0, mortgaged -> base 60 - mortgage 36 (60%) = 24
      // Total net worth = 1000 + 210 + 24 = 1234
      const properties: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 3, isMortgaged: false },
        3: { ownerId: 'p1', level: 0, isMortgaged: true },
      };

      const netWorth = calculatePlayerNetWorth(p1, properties);
      expect(netWorth).toBe(1234);
    });

    it('breaks Net Worth tie using Cash balance as secondary metric', () => {
      const p1: PlayerState = {
        id: 'p1',
        name: 'Player 1',
        token: DEFAULT_PLAYER_TOKENS[0],
        cash: 1200,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
      };

      const p2: PlayerState = {
        id: 'p2',
        name: 'Player 2',
        token: DEFAULT_PLAYER_TOKENS[1],
        cash: 960, // Lower cash so round-60 market land (100 * 2.4 = 240) brings total net worth to 1200
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        isBankrupt: false,
        consecutiveDoubles: 0,
        stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 1 },
      };

      // P2 owns Tile 6: basePrice 100, Round 60 capped market value 240 -> P2 net worth = 960 + 240 = 1200
      // Both have identical Net Worth = 1200
      const properties: Record<number, PropertyOwnership> = {
        6: { ownerId: 'p2', level: 0, isMortgaged: false },
      };

      const result = evaluateWinCondition([p1, p2], properties, 60, 60);
      expect(result.isGameOver).toBe(true);
      expect(result.reason).toBe('MAX_ROUNDS_REACHED');
      // P1 wins because P1 has higher cash (1200 vs 1100)
      expect(result.winner?.id).toBe('p1');
    });

    it('proves whether exactly 60 rounds are played when maxRounds = 60', () => {
      // Let's trace how many completed rounds occur before evaluateWinCondition triggers
      let state = createTestState(2, 60);
      expect(state.roundNumber).toBe(1);

      // Fast-forward to round 59
      state = { ...state, roundNumber: 59, activePlayerIndex: 1 }; // Player 2 about to end turn in round 59

      // Player 2 ends turn in round 59 -> completedRound is true, newRound becomes 60
      state = gameReducer(state, { type: 'END_TURN' });

      // Verification: Round 60 must be playable and not prematurely ended!
      expect(state.status).not.toBe('ENDED');
      expect(state.roundNumber).toBe(60);

      // Player 1 plays turn in round 60
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.status).not.toBe('ENDED');
      expect(state.activePlayerIndex).toBe(1);

      // Player 2 plays turn in round 60 -> completes round 60!
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });

      // Proves that all 60 rounds were fully played before match concludes
      expect(state.status).toBe('ENDED');
      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.roundNumber).toBe(60);
    });

    it('tests state immutability and guard against actions after GAME_OVER', () => {
      let state = createTestState(2);
      // Trigger game over by bankruptcy
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.status).toBe('ENDED');
      expect(state.turnPhase).toBe('GAME_OVER');

      // Attempt actions after game over:
      const stateAfterRoll = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      // Invariant: Game state should be immutable when status is ENDED
      const posBefore = state.players[0].position;
      const posAfter = stateAfterRoll.players[0].position;
      
      expect(posAfter).toBe(posBefore);
    });

    it('tests whether bankrupt player remaining cash is transferred to creditor', () => {
      let state = createTestState(2);
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 350 }, // Player 1 raised 350k but still cannot pay
          { ...state.players[1], cash: 1500 },
        ],
        pendingDebt: {
          creditorPlayerId: 'player-2',
          amount: 1000,
          reason: 'Rent on Landmark',
        },
      };

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' });

      // Spec 3.6: All remaining cash must be transferred to creditor
      expect(state.players[1].cash).toBe(1500 + 350);
    });
  });

  describe('5. Chaos Engine Tile Mapping & Flakiness Oracles', () => {
    it('verifies GO_TO_DETENTION chaos card sends player to Tile 10, not Tile 6', () => {
      let state = createTestState(2);
      const detentionCard = {
        id: 'detention-warrant',
        title: 'Lệnh Tạm Giữ Điều Tra',
        tagline: 'Vào khu cách ly',
        flavorText: 'Tạm giam',
        rarity: 'UNCOMMON' as const,
        effectType: 'GO_TO_DETENTION' as const,
        targetTileId: 10,
        value: 0,
        iconName: 'ShieldAlert',
      };

      // Call applyChaosCard directly to test isolated effect
      const updated = applyChaosCard(state, detentionCard);

      // On 40-tile board, Detention is Tile 10 (Tile 6 is Vũng Tàu!)
      expect(updated.players[0].position).toBe(10);
    });
  });
});
