import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { advanceTurn } from '../turn-manager/turnManager';
import { GameState } from '../types';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

function setup2PGame(): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players: [
      { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
      { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
    ],
  });
}

describe('M1-3: Jail & Detention Overhaul', () => {
  it('initializes detentionTurns to exactly 3 when sent to detention', () => {
    let state = setup2PGame();
    // Speeding: 3 doubles
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
    state = gameReducer(state, { type: 'END_TURN' });
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
    state = gameReducer(state, { type: 'END_TURN' });
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });

    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(2);
    expect(state.players[0].position).toBe(10);
  });

  it('preserves detentionTurns across advanceTurn (no double-decrement bug)', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 2;
    state.activePlayerIndex = 1; // Bob's turn

    state = advanceTurn(state);
    expect(state.activePlayerIndex).toBe(0);
    // Alice's detentionTurns must still be 2, not decremented by advanceTurn
    expect(state.players[0].detentionTurns).toBe(2);
    expect(state.players[0].inDetention).toBe(true);
  });

  it('moves player by rolled dice sum and frees them when escaping via doubles', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 2;
    state.players[0].position = 10;

    // Roll double [4, 4] = 8
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });

    expect(state.players[0].inDetention).toBe(false);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].position).toBe(18); // 10 + 8
    expect(state.isDouble).toBe(false); // No extra roll
    expect(state.turnPhase).toBe('ACTION_MENU');
  });

  it('decrements detentionTurns sequentially on non-doubles across turns', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 2;
    state.players[0].position = 10;

    // Turn 1: roll non-doubles [1, 2]
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(1);
    expect(state.players[0].position).toBe(10);

    // Turn 2: roll non-doubles [2, 3]
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].position).toBe(10);
  });

  it('releases player freely after serving 3 failed turns in detention and moves player', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 0; // 3rd and final attempt
    state.players[0].position = 10;

    // Turn 3: roll non-doubles [2, 4] = 6
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 4] });

    expect(state.players[0].inDetention).toBe(false);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].cash).toBe(initialCash); // free release after 3 turns served
    expect(state.players[0].position).toBe(16); // 10 + 6
    expect(state.turnPhase).toBe('ACTION_MENU');
  });

  it('allows consuming a jailFreeCard via USE_DETENTION_CARD to walk free', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 2;
    state.players[0].jailFreeCards = 1;

    state = gameReducer(state, { type: 'USE_DETENTION_CARD' });
    expect(state.players[0].inDetention).toBe(false);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].jailFreeCards).toBe(0);
    expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
  });
});

describe('M1-3: Start Tile Rewards (Passing vs Landing)', () => {
  it('awards standard $200k salary when passing tile 0', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;

    // Roll [1, 2] = 3 -> lands on Tile 1 (passed tile 0)
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
    expect(state.players[0].position).toBe(1);
    expect(state.players[0].cash).toBe(initialCash + 200);
  });

  it('awards double salary ($400k) when passing tile 0 during Golden Hour', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;
    state.chaosModifiers = { ...state.chaosModifiers!, goldenHourTurns: 1 };

    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
    expect(state.players[0].position).toBe(1);
    expect(state.players[0].cash).toBe(initialCash + 400);
  });

  it('awards salary ($200k) when landing directly on tile 0', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;

    // Roll [1, 1] = 2 -> lands directly on Tile 0
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
    expect(state.players[0].position).toBe(0);
    expect(state.players[0].cash).toBe(initialCash + 200);
  });

  it('awards double salary ($400k) when landing directly on tile 0 during Golden Hour', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;
    state.chaosModifiers = { ...state.chaosModifiers!, goldenHourTurns: 1 };

    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
    expect(state.players[0].position).toBe(0);
    expect(state.players[0].cash).toBe(initialCash + 400);
  });
});

describe('M1-3: Turn Authorization & FSM Guards', () => {
  it('rejects action when senderPlayerId does not match active player', () => {
    let state = setup2PGame();
    expect(state.activePlayerIndex).toBe(0); // Alice's turn

    // Bob tries to roll dice
    const stateAttempt = gameReducer(state, {
      type: 'ROLL_DICE_START',
      senderPlayerId: state.players[1].id,
    });

    expect(stateAttempt).toBe(state); // Rejected
  });

  it('rejects actions from bankrupt players', () => {
    let state = setup2PGame();
    state.players[0].isBankrupt = true;

    const stateAttempt = gameReducer(state, {
      type: 'ROLL_DICE_START',
      senderPlayerId: state.players[0].id,
    });

    expect(stateAttempt).toBe(state);
  });

  it('drops duplicate actions with the same actionId (Idempotency Guard)', () => {
    let state = setup2PGame();
    const actionId = 'action-uuid-12345';

    // First dispatch
    state = gameReducer(state, {
      type: 'BUY_PROPERTY',
      tileId: 1,
      actionId,
    });
    expect(state.processedActionIds).toContain(actionId);
    const cashAfterFirstBuy = state.players[0].cash;

    // Duplicate dispatch
    state = gameReducer(state, {
      type: 'BUY_PROPERTY',
      tileId: 1,
      actionId,
    });
    // Cash must remain unchanged (not deducted again)
    expect(state.players[0].cash).toBe(cashAfterFirstBuy);
  });

  it('limits processedActionIds ring buffer to maximum 50 entries', () => {
    let state = setup2PGame();
    for (let i = 0; i < 60; i++) {
      state = gameReducer(state, {
        type: 'SELECT_TILE_DETAIL',
        tileId: (i % 40) as any,
        actionId: `action-${i}`,
      });
    }

    expect(state.processedActionIds?.length).toBe(50);
    expect(state.processedActionIds).not.toContain('action-0'); // Oldest evicted
    expect(state.processedActionIds).toContain('action-59'); // Newest retained
  });
});
