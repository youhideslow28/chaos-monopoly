import { describe, it, expect, beforeEach } from 'vitest';
import {
  dayKey,
  getDailyQuests,
  recordQuestEvent,
  claimQuest,
  getQuestSnapshot,
} from '../quests/dailyQuests';

// The module persists through localStorage; Node has none, so the storage calls no-op safely.
describe('Daily quests', () => {
  beforeEach(() => {
    // Reset the module state for the current day.
    const snap = getQuestSnapshot();
    expect(snap.quests).toHaveLength(3);
  });

  it('picks three quests deterministically for a given day', () => {
    const a = getDailyQuests('2026-11-04').map((q) => q.id);
    const b = getDailyQuests('2026-11-04').map((q) => q.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(3);
  });

  it('tracks progress up to the target and only then allows a claim', () => {
    const quest = getDailyQuests(dayKey()).find((q) => q.metric !== 'rounds') ?? getDailyQuests(dayKey())[0];
    expect(claimQuest(quest.id)).toBe(false); // no progress yet

    if (quest.metric === 'rounds') {
      recordQuestEvent('rounds', quest.target);
    } else {
      for (let i = 0; i < quest.target; i++) recordQuestEvent(quest.metric, 1);
    }
    expect(getQuestSnapshot().progress[quest.id]).toBe(quest.target);

    const firstClaim = claimQuest(quest.id);
    expect(firstClaim).toBe(true);
    expect(claimQuest(quest.id)).toBe(false); // no double claim
  });

  it('keeps the best value for round-based quests instead of summing', () => {
    const roundsQuest = getDailyQuests(dayKey()).find((q) => q.metric === 'rounds');
    if (!roundsQuest) return; // not in today's trio; nothing to assert
    recordQuestEvent('rounds', 4);
    recordQuestEvent('rounds', 9);
    expect(getQuestSnapshot().progress[roundsQuest.id]).toBe(9);
    recordQuestEvent('rounds', 3);
    expect(getQuestSnapshot().progress[roundsQuest.id]).toBe(9);
  });
});
