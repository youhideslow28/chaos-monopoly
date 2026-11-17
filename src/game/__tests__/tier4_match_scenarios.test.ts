import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

describe('Tier 4: End-to-End Match Scenarios & Simulations', () => {
  describe('1. 2-Player Full Match Simulation (Setup to Elimination Victory)', () => {
    it('simulates complete 2-player match through rolling, purchasing, extra doubles turn, and bankruptcy', () => {
      // 1. Setup Game
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      expect(state.status).toBe('PLAYING');
      expect(state.activePlayerIndex).toBe(0);
      expect(state.roundNumber).toBe(1);

      // Turn 1: Alice rolls [0, 1] = 1 step -> lands on tile 1 (Bến Ninh Kiều, PROPERTY, basePrice 60)
      state = gameReducer(state, { type: 'ROLL_DICE_START' });
      expect(state.turnPhase).toBe('ROLLING');

      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [0, 1] as any });
      expect(state.players[0].position).toBe(1);
      expect(state.turnPhase).toBe('ACTION_MENU');

      // Alice buys tile 1 (basePrice: 60)
      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.properties[1]?.ownerId).toBe('player-1');
      expect(state.players[0].cash).toBe(1440); // 1500 - 60

      // Alice ends turn -> advances to Bob
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      // Turn 2: Bob rolls [1, 2] = 3 steps -> lands on tile 3 (Chợ Nổi Cái Răng, PROPERTY, basePrice 60)
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.players[1].position).toBe(3);

      // Bob buys tile 3 (basePrice: 60)
      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 3 });
      expect(state.properties[3]?.ownerId).toBe('player-2');
      expect(state.players[1].cash).toBe(1440); // 1500 - 60

      // Bob ends turn -> advances to Alice, round 2
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0);
      expect(state.roundNumber).toBe(2);

      // Turn 3: Alice rolls DOUBLE [3, 3] = 6 steps -> lands on tile 1 + 6 = 7 (Chaos α)
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
      expect(state.players[0].position).toBe(7);
      expect(state.isDouble).toBe(true);

      // Alice dismisses Chaos modal
      state = gameReducer(state, { type: 'RESOLVE_CHAOS' });
      expect(state.activeChaosCard).toBeNull();

      // Alice ends turn -> receives EXTRA TURN because of doubles!
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(0); // Still Alice!
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');

      // Alice takes extra turn roll: [1, 1] = 2 steps -> lands on tile 9 (Tháp Trầm Hương)
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
      expect(state.players[0].position).toBe(9);
      state = gameReducer(state, { type: 'END_TURN' });
      // 2nd double in a row also allows another turn, or advance if not double
      // If we roll [1, 2] = 3 steps -> lands on tile 12
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.isDouble).toBe(false);
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1); // Now Bob's turn

      // Simulate Bob suffering decisive loss: Bob's cash reduced, lands on Alice's property, declares bankruptcy
      state = {
        ...state,
        players: [
          state.players[0],
          { ...state.players[1], cash: 10 },
        ],
      };

      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.status).toBe('ENDED');
      expect(state.winner?.id).toBe('player-1');
      expect(state.winner?.name).toBe('Alice');
      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.logs.some(l => l.type === 'VICTORY')).toBe(true);
    });
  });

  describe('2. 3-Player Full Match Simulation (Skipping Bankrupt Players)', () => {
    it('simulates 3-player game with mid-match elimination and turn rotation skipping', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alpha', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Beta', token: DEFAULT_PLAYER_TOKENS[1] },
          { name: 'Gamma', token: DEFAULT_PLAYER_TOKENS[2] },
        ],
      });

      expect(state.players.length).toBe(3);

      // Turn 1: Alpha ends turn -> Beta
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(1); // Beta

      // Turn 2: Beta suffers bankruptcy during their turn
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.players[1].isBankrupt).toBe(true);
      // Turn advances to Gamma!
      expect(state.activePlayerIndex).toBe(2);

      // Turn 3: Gamma rolls and ends turn
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
      state = gameReducer(state, { type: 'END_TURN' });

      // Turn must skip bankrupt Beta (index 1) and return directly to Alpha (index 0)!
      expect(state.activePlayerIndex).toBe(0);
      expect(state.players[state.activePlayerIndex].name).toBe('Alpha');

      // Alpha ends turn -> must jump directly to Gamma (index 2)!
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 3] });
      state = gameReducer(state, { type: 'END_TURN' });
      expect(state.activePlayerIndex).toBe(2);
      expect(state.players[state.activePlayerIndex].name).toBe('Gamma');

      // Gamma declares bankruptcy -> Alpha wins!
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-3' });
      expect(state.status).toBe('ENDED');
      expect(state.winner?.id).toBe('player-1');
      expect(state.winner?.name).toBe('Alpha');
    });
  });

  describe('3. 4-Player Match Simulation & Max-Rounds Victory Condition', () => {
    it('runs 4-player game to configured round limit and decides winner by highest net worth', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: DEFAULT_PLAYER_TOKENS.map((token, i) => ({
          name: `Tycoon ${i + 1}`,
          token,
        })),
        config: {
          maxRounds: 3, // Fast 3-round cap for simulation
        },
      });

      expect(state.players.length).toBe(4);
      expect(state.config.maxRounds).toBe(3);

      // Give Tycoon 2 a property portfolio to guarantee highest net worth
      // Tile 1: basePrice 60, upgradeCost 50, level 2 -> Property value = 60 + 100 = 160
      // Tycoon 2 net worth = 1500 + 160 = 1660
      state = {
        ...state,
        properties: {
          ...state.properties,
          1: { ownerId: 'player-2', level: 2 },
        },
      };

      // Advance rounds 1 -> 2 -> 3
      // Round 1: P1, P2, P3, P4 play
      for (let p = 0; p < 4; p++) {
        state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
        state = gameReducer(state, { type: 'END_TURN' });
      }
      expect(state.roundNumber).toBe(2);

      // Round 2: P1, P2, P3, P4 play
      for (let p = 0; p < 4; p++) {
        state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
        state = gameReducer(state, { type: 'END_TURN' });
      }
      expect(state.roundNumber).toBe(3);

      // Round 3: At the end of round 3, maxRounds (3) is reached!
      for (let p = 0; p < 3; p++) {
        state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
        state = gameReducer(state, { type: 'END_TURN' });
      }

      // 4th player plays the final turn of round 3
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      state = gameReducer(state, { type: 'END_TURN' });

      // Game must transition to ENDED with highest net worth player declared winner!
      expect(state.status).toBe('ENDED');
      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.winner?.id).toBe('player-2');
      expect(state.winner?.name).toBe('Tycoon 2');
    });
  });

  describe('4. Match Restart & Clean State Reset', () => {
    it('completely resets game state to initial clean setup upon RESTART_GAME action', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Modify game state with properties, logs, etc.
      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      state = gameReducer(state, { type: 'DECLARE_BANKRUPTCY', playerId: 'player-2' });
      expect(state.status).toBe('ENDED');

      // Dispatch RESTART_GAME
      state = gameReducer(state, { type: 'RESTART_GAME' });

      expect(state.status).toBe('SETUP');
      expect(state.players).toEqual([]);
      expect(state.properties).toEqual({});
      expect(state.winner).toBeNull();
      expect(state.logs).toEqual([]);
      expect(state.roundNumber).toBe(1);
      expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    });
  });

  describe('5. Turn Progression & Illegal Action Rejection', () => {
    it('rejects ROLL_DICE_START when not in WAITING_FOR_ROLL phase', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Advance to ACTION_MENU
      state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
      expect(state.turnPhase).toBe('ACTION_MENU');

      // Attempting to ROLL_DICE_START while in ACTION_MENU should be a no-op
      const stateBefore = state;
      const stateAfter = gameReducer(state, { type: 'ROLL_DICE_START' });
      expect(stateAfter.turnPhase).toBe('ACTION_MENU');
      expect(stateAfter).toBe(stateBefore);
    });

    it('rejects BUY_PROPERTY when already owned or when insufficient funds', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Buy tile 1
      state = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(state.properties[1]?.ownerId).toBe('player-1');

      // Try buying tile 1 again -> should be rejected and state unchanged
      const stateBefore = state;
      const stateAfter = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 1 });
      expect(stateAfter).toBe(stateBefore);

      // Try buying property with 0 cash
      state = {
        ...state,
        players: [
          { ...state.players[0], cash: 0 },
          state.players[1],
        ],
      };
      const statePoor = gameReducer(state, { type: 'BUY_PROPERTY', tileId: 3 });
      expect(statePoor.properties[3]?.ownerId).toBeNull();
    });

    it('rejects PAY_DETENTION_BAIL when player is not in detention', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'FreePlayer', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Other', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      expect(state.players[0].inDetention).toBe(false);

      const stateBefore = state;
      const stateAfter = gameReducer(state, { type: 'PAY_DETENTION_BAIL' });
      // Should reject and make no state change
      expect(stateAfter).toBe(stateBefore);
      expect(stateAfter.players[0].cash).toBe(1500);
    });
  });
});
