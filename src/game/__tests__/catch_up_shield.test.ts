import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { verifyLedgerAudit } from '../economy/ledgerEngine';
import { CATCH_UP_SHIELD_AMOUNT } from '../turn-manager/turnManager';
import { GameState } from '../types';

function createMatch(): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players: [{ name: 'An' }, { name: 'Bình' }, { name: 'Cường' }],
    config: { startingCash: 1500, maxRounds: 0 },
  });
}

/** Ends turns until the round counter reaches `targetRound`. */
function advanceToRound(state: GameState, targetRound: number): GameState {
  let guard = 0;
  while (state.roundNumber < targetRound && state.status === 'PLAYING' && guard < 400) {
    guard++;
    state = gameReducer(state, { type: 'END_TURN' });
  }
  return state;
}

const shieldEntries = (state: GameState) =>
  (state.ledger || []).filter((e) => e.memo?.includes('Khiên chống dẫn đầu'));

describe('Catch-up shield', () => {
  it('pays the poorest player once at the round-5 milestone', () => {
    const before = advanceToRound(createMatch(), 4);
    expect(before.roundNumber).toBe(4);
    expect(shieldEntries(before)).toHaveLength(0); // no payout before the milestone

    const atMilestone = advanceToRound(createMatch(), 6);
    const entries = shieldEntries(atMilestone);
    expect(entries).toHaveLength(1); // one payout at round 5, next one is round 10

    const paid = atMilestone.players.find((p) => p.id === entries[0].toPlayerId)!;
    expect(entries[0].amount).toBe(CATCH_UP_SHIELD_AMOUNT);
    expect(paid.isBankrupt).toBe(false);
    expect(atMilestone.logs.some((l) => l.message.includes('KHIÊN CHỐNG DẪN ĐẦU'))).toBe(true);
  });

  it('exports the amount used in the log line', () => {
    const atMilestone = advanceToRound(createMatch(), 6);
    const log = atMilestone.logs.find((l) => l.message.includes('KHIÊN CHỐNG DẪN ĐẦU'))!;
    expect(log.message).toContain(`$${CATCH_UP_SHIELD_AMOUNT}`);
  });

  it('keeps the ledger audit valid across several milestones', () => {
    const after = advanceToRound(createMatch(), 11);
    expect(shieldEntries(after).length).toBeGreaterThanOrEqual(2);
    const audit = verifyLedgerAudit(1500, after.players, after.ledger || []);
    expect(audit.isValid).toBe(true);
  });
});
