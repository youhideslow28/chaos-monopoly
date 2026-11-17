import { GameState } from '../types';
import { INITIAL_GAME_CONFIG, INITIAL_GAME_STATE } from '../gameReducer';

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'chaos_monopoly_saved_match_v2';

export interface SavedMatchData {
  schemaVersion: number;
  savedAt: number;
  state: GameState;
}

export function serializeMatch(state: GameState): string {
  const payload: SavedMatchData = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: Date.now(),
    state: {
      ...state,
      // Trim excessive logs/ledger entries if needed while keeping audit trail intact
      logs: (state.logs || []).slice(0, 120),
    },
  };
  return JSON.stringify(payload);
}

export function deserializeMatch(raw: string): SavedMatchData | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SavedMatchData>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return null;
    }

    const state = parsed.state;
    if (!state || typeof state !== 'object') {
      return null;
    }

    // Validate required GameState invariants
    if (
      (state.status !== 'PLAYING' && state.status !== 'ENDED') ||
      !Array.isArray(state.players) ||
      state.players.length < 2 ||
      typeof state.activePlayerIndex !== 'number' ||
      state.activePlayerIndex < 0 ||
      state.activePlayerIndex >= state.players.length ||
      typeof state.roundNumber !== 'number' ||
      !state.properties ||
      typeof state.properties !== 'object'
    ) {
      return null;
    }

    // Ensure every player has non-negative finite cash and valid position
    for (const p of state.players) {
      if (
        !p ||
        typeof p.id !== 'string' ||
        typeof p.name !== 'string' ||
        typeof p.cash !== 'number' ||
        !Number.isFinite(p.cash) ||
        p.cash < 0
      ) {
        return null;
      }
    }

    const hydratedState: GameState = {
      ...INITIAL_GAME_STATE,
      ...state,
      config: {
        ...INITIAL_GAME_CONFIG,
        ...(state.config || {}),
      },
      chaosModifiers: {
        ...INITIAL_GAME_STATE.chaosModifiers!,
        ...(state.chaosModifiers || {}),
      },
      ledger: Array.isArray(state.ledger) ? state.ledger : [],
      ledgerHistory: Array.isArray(state.ledgerHistory) ? state.ledgerHistory : [],
      processedActionIds: Array.isArray(state.processedActionIds)
        ? state.processedActionIds.slice(-50)
        : [],
      activeAuction: state.activeAuction || null,
      activeTrade: state.activeTrade || null,
      pendingDebt: state.pendingDebt || null,
    };

    return {
      schemaVersion: SCHEMA_VERSION,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      state: hydratedState,
    };
  } catch {
    return null;
  }
}

export function saveMatchToStorage(state: GameState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  if (state.status !== 'PLAYING' || state.players.length < 2) {
    return false;
  }

  try {
    const serialized = serializeMatch(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function loadMatchFromStorage(): SavedMatchData | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = deserializeMatch(raw);
    if (!data) {
      // Corrupted or outdated schema: clean up gracefully
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearMatchFromStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}
