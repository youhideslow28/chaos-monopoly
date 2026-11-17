import { DEFAULT_WORLD_ID, WorldConfig, WorldId, WorldPack } from './types';
import { getCatalogEntry, isWorldSelectable, resolveWorldId } from './catalog';
import { getWorldEvents } from './worldEvents';
import { validateWorld } from './validate';
import { BASE_DISTRICT_HEX, makePack } from './packs/shared';

type PackLoader = () => Promise<{ pack: WorldPack }>;

/** Lazy per-world loaders: a world's visual pack is only downloaded when it is actually needed. */
const LOADERS: Partial<Record<WorldId, PackLoader>> = {
  'modern-metropolis': () => import('./packs/modern-metropolis'),
  'cyberpunk-city': () => import('./packs/cyberpunk-city'),
  'mekong-delta': () => import('./packs/mekong-delta'),
  'quang-tri-highlands': () => import('./packs/quang-tri-highlands'),
  'northwest-vietnam': () => import('./packs/northwest-vietnam'),
  'space-colony': () => import('./packs/space-colony'),
};

/** Built-in last-resort pack (no tile renames, neutral visuals) used when everything else fails. */
export const FALLBACK_PACK: WorldPack = makePack({
  id: 'modern-metropolis',
  typography: { display: 'system-ui,sans-serif', body: 'system-ui,sans-serif' },
  tileNames: {},
  tileVisuals: { districtColors: { ...BASE_DISTRICT_HEX }, frame: '#334155' },
  background: { gradient: '#080c14', boardGradient: '#0a0e17' },
  environment: { kind: 'none', intensity: 0 },
  animations: { introMs: 0, tileLiftPx: 0 },
  chaosPresentation: { label: { vi: 'Biến Cố', en: 'Chaos' }, accent: '#06b6d4' },
  features: [],
});

const cache = new Map<string, WorldConfig>();
const overrides = new Map<string, PackLoader>();

/** Test hook: simulate a missing/corrupt asset bundle. */
export function __overrideWorldLoader(id: WorldId, loader: PackLoader | null): void {
  if (loader) overrides.set(id, loader);
  else overrides.delete(id);
  cache.delete(id);
}

export interface WorldLoadResult {
  config: WorldConfig;
  requestedId: string;
  fallbackUsed: boolean;
  error?: string;
}

export async function loadWorldConfig(id: unknown): Promise<WorldLoadResult> {
  const requested = typeof id === 'string' ? id : DEFAULT_WORLD_ID;
  const wid = resolveWorldId(requested);
  const entry = getCatalogEntry(wid)!;
  const cached = cache.get(wid);
  if (cached) return { config: cached, requestedId: requested, fallbackUsed: false };

  const loader = overrides.get(wid) ?? LOADERS[wid];
  try {
    if (!loader) throw new Error(`No pack for world ${wid}`);
    const { pack } = await loader();
    const config: WorldConfig = { ...entry, pack, mapEvents: getWorldEvents(wid) };
    const errs = validateWorld(config);
    if (errs.length) throw new Error(`Invalid world config: ${errs.slice(0, 3).join('; ')}`);
    cache.set(wid, config);
    return { config, requestedId: requested, fallbackUsed: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const base = getCatalogEntry(DEFAULT_WORLD_ID)!;
    // Fallback is visual only: gameplay events remain the server/reducer-side data for the real world.
    return {
      config: { ...base, pack: FALLBACK_PACK, mapEvents: getWorldEvents(DEFAULT_WORLD_ID) },
      requestedId: requested,
      fallbackUsed: true,
      error: message,
    };
  }
}

export { isWorldSelectable };
