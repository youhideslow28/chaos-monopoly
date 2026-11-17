import { WORLD_SCHEMA_VERSION, WorldPack, LocalizedText } from '../types';

/** Ownable tile ids on the shared 40-tile ring (properties, transport, utilities). */
export const OWNABLE_TILE_IDS = [
  1, 3, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 21, 23, 24, 25, 26, 27, 28, 29, 31, 32, 34, 35, 37, 39,
] as const;

export type NameRow = readonly [id: number, vi: string, en: string];

export function buildTileNames(rows: readonly NameRow[]): Record<number, LocalizedText> {
  const out: Record<number, LocalizedText> = {};
  for (const [id, vi, en] of rows) out[id] = { vi, en };
  return out;
}

export function makePack(
  p: Omit<WorldPack, 'schemaVersion' | 'version' | 'boardLayout' | 'audio' | 'localization'>
): WorldPack {
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    version: 1,
    boardLayout: { id: 'ring-40' },
    audio: { profile: 'shared' },
    localization: { defaultLocale: 'vi', supported: ['vi', 'en'] },
    ...p,
  };
}

/** Base district colour hexes (same order of hue as the original Tailwind classes). */
export const BASE_DISTRICT_HEX: Record<string, string> = {
  'district-brown': '#92400e',
  'district-lightblue': '#38bdf8',
  'district-pink': '#ec4899',
  'district-orange': '#f97316',
  'district-red': '#ef4444',
  'district-yellow': '#eab308',
  'district-green': '#22c55e',
  'district-darkblue': '#1d4ed8',
  'district-transport': '#64748b',
  'district-utility': '#94a3b8',
};
