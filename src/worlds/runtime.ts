import { useEffect, useState } from 'react';
import { Locale, LocalizedText, WorldConfig } from './types';
import { loadWorldConfig } from './registry';

let activeNames: Record<number, LocalizedText> = {};
let activeLocale: Locale = 'vi';

const SPECIAL_EN: Record<number, string> = {
  0: 'Start', 2: 'Festival 1', 4: 'Income Tax', 7: 'Chaos α', 10: 'Detention', 17: 'Fortune 1',
  20: 'Rest Stop', 22: 'Chaos β', 30: 'Go to Jail', 33: 'Festival 2', 36: 'Chaos Ω', 38: 'Property Tax',
};

export function setActiveWorldNames(names: Record<number, LocalizedText>, locale: Locale): void {
  activeNames = names;
  activeLocale = locale;
}

/** Resolves a tile's display name from the active World (falls back to the base board names). */
export function displayTileName(
  tile: { id: number; name: string; shortName?: string },
  mode: 'short' | 'full' = 'short'
): string {
  const o = activeNames[tile.id];
  if (o) return o[activeLocale];
  if (activeLocale === 'en' && SPECIAL_EN[tile.id]) return SPECIAL_EN[tile.id];
  return mode === 'short' ? tile.shortName || tile.name : tile.name;
}

export interface WorldRuntime {
  config: WorldConfig | null;
  loading: boolean;
  fallbackUsed: boolean;
  error?: string;
}

/** Lazily loads (and validates) the visual pack for a world id. Never throws: falls back visually. */
export function useWorldConfig(worldId: string | undefined): WorldRuntime {
  const [state, setState] = useState<WorldRuntime>({ config: null, loading: !!worldId, fallbackUsed: false });
  useEffect(() => {
    let cancelled = false;
    if (!worldId) {
      setState({ config: null, loading: false, fallbackUsed: false });
      return;
    }
    setState(s => ({ ...s, loading: true }));
    loadWorldConfig(worldId).then(r => {
      if (!cancelled) setState({ config: r.config, loading: false, fallbackUsed: r.fallbackUsed, error: r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [worldId]);
  return state;
}
