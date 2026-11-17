/**
 * Daily quests: three simple goals picked deterministically from the date, so every session
 * on the same day sees the same set. Progress lives in localStorage; rewards are Chaos Coins.
 */
import { useEffect, useState } from 'react';
import { addCoins } from '../../cosmetics/storage';

export type QuestMetric = 'play' | 'win' | 'buy' | 'upgrade' | 'rounds';

export interface QuestDefinition {
  id: string;
  metric: QuestMetric;
  target: number;
  coins: number;
  text: { vi: string; en: string };
}

export const QUEST_POOL: QuestDefinition[] = [
  { id: 'play-2', metric: 'play', target: 2, coins: 80, text: { vi: 'Chơi 2 ván đấu', en: 'Play 2 matches' } },
  { id: 'win-1', metric: 'win', target: 1, coins: 120, text: { vi: 'Thắng 1 ván đấu', en: 'Win 1 match' } },
  { id: 'buy-8', metric: 'buy', target: 8, coins: 60, text: { vi: 'Mua 8 ô đất', en: 'Buy 8 tiles' } },
  { id: 'upgrade-2', metric: 'upgrade', target: 2, coins: 80, text: { vi: 'Nâng cấp 2 công trình', en: 'Build 2 upgrades' } },
  { id: 'rounds-15', metric: 'rounds', target: 15, coins: 60, text: { vi: 'Trụ qua 15 vòng trong một ván', en: 'Survive 15 rounds in one match' } },
];

const STORAGE_KEY = 'chaos_daily_quests_v1';

interface QuestState {
  day: string;
  progress: Record<string, number>;
  claimed: string[];
}

export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Deterministic pick: the same day always yields the same three quests. */
export function getDailyQuests(day: string = dayKey()): QuestDefinition[] {
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) % 100_000;
  const picked: QuestDefinition[] = [];
  for (let i = 0; i < 3; i++) picked.push(QUEST_POOL[(seed + i * 2) % QUEST_POOL.length]);
  // Guard against duplicates from the modulo step.
  const unique = [...new Map(picked.map((q) => [q.id, q])).values()];
  for (const q of QUEST_POOL) {
    if (unique.length >= 3) break;
    if (!unique.some((u) => u.id === q.id)) unique.push(q);
  }
  return unique.slice(0, 3);
}

function loadState(day: string): QuestState {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as QuestState;
      if (parsed.day === day) {
        return { day, progress: parsed.progress || {}, claimed: parsed.claimed || [] };
      }
    }
  } catch {
    /* corrupted state starts fresh */
  }
  return { day, progress: {}, claimed: [] };
}

let state: QuestState = loadState(dayKey());
const listeners = new Set<() => void>();

function persist(): void {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota/privacy errors are non-fatal */
  }
  listeners.forEach((l) => l());
}

function ensureToday(): void {
  const today = dayKey();
  if (state.day !== today) {
    state = { day: today, progress: {}, claimed: [] };
    persist();
  }
}

/** Called at the end of a match with that match's numbers. */
export function recordQuestEvent(metric: QuestMetric, amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  ensureToday();
  let changed = false;
  for (const quest of getDailyQuests(state.day)) {
    if (quest.metric !== metric) continue;
    const current = state.progress[quest.id] || 0;
    if (current >= quest.target) continue;
    const next = metric === 'rounds' ? Math.max(current, Math.round(amount)) : current + Math.round(amount);
    state.progress[quest.id] = Math.min(quest.target, next);
    changed = true;
  }
  if (changed) persist();
}

export function claimQuest(id: string): boolean {
  ensureToday();
  const quest = getDailyQuests(state.day).find((q) => q.id === id);
  if (!quest) return false;
  if (state.claimed.includes(id)) return false;
  if ((state.progress[id] || 0) < quest.target) return false;
  state.claimed = [...state.claimed, id];
  persist();
  addCoins(quest.coins);
  return true;
}

export function getQuestSnapshot(): { quests: QuestDefinition[]; progress: Record<string, number>; claimed: string[] } {
  return { quests: getDailyQuests(state.day), progress: { ...state.progress }, claimed: [...state.claimed] };
}

export function useDailyQuests(): { quests: QuestDefinition[]; progress: Record<string, number>; claimed: string[] } {
  const [snap, setSnap] = useState(getQuestSnapshot);
  useEffect(() => {
    const listener = () => setSnap(getQuestSnapshot());
    listeners.add(listener);
    ensureToday();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snap;
}
