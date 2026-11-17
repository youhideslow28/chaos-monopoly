/**
 * World Engine data model (Phase 05).
 *
 * Architecture: One Game Engine — Multiple Worlds — Data-Driven Content.
 * Worlds only describe presentation, naming, and bounded map events. They can NEVER
 * change prices, rents, dice, ledger or turn rules (enforced by validateWorld).
 */
export const WORLD_SCHEMA_VERSION = 1 as const;
export const DEFAULT_WORLD_ID = 'modern-metropolis';

export type Locale = 'vi' | 'en';
export interface LocalizedText {
  vi: string;
  en: string;
}

export type WorldId =
  | 'modern-metropolis'
  | 'cyberpunk-city'
  | 'mekong-delta'
  | 'quang-tri-highlands'
  | 'northwest-vietnam'
  | 'fantasy-kingdom'
  | 'tropical-island'
  | 'space-colony';

export type WorldAvailability = 'AVAILABLE' | 'COMING_SOON';
/** FULL = names + visuals + events + environment implemented. CONFIG_ONLY = catalog entry only. */
export type WorldCompleteness = 'FULL' | 'CONFIG_ONLY';

export interface WorldPalette {
  bg: string;
  bgAlt: string;
  surface: string;
  border: string;
  accent: string;
  accent2: string;
  text: string;
  glow: string;
}

export interface WorldCatalogEntry {
  schemaVersion: typeof WORLD_SCHEMA_VERSION;
  id: WorldId;
  version: number;
  order: number;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  styleTags: LocalizedText[];
  availability: WorldAvailability;
  completeness: WorldCompleteness;
  palette: WorldPalette;
}

export type EnvironmentKind = 'none' | 'rain' | 'stars' | 'fireflies' | 'drift' | 'embers';

/** Effects a world event may use. Restricted to symmetric / global effects (fair for every seat). */
export type WorldEventEffectType =
  | 'CASH_ALL'
  | 'TRANSPORT_BOOM'
  | 'UTILITY_BOOM'
  | 'DISTRICT_BOOM'
  | 'CURFEW'
  | 'GOLDEN_HOUR'
  | 'INTEREST_HIKE'
  | 'SUBSIDIZED_MORTGAGE'
  | 'FREEZE_MARKET';

export interface WorldEventDef {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Explicit trigger: only drawn when landing on a CHAOS tile within this round window. */
  trigger: { tileType: 'CHAOS'; minRound: number; maxRound?: number };
  effect: { type: WorldEventEffectType; value: number; durationInTurns: number };
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE';
  iconName: string;
}

export interface WorldPack {
  schemaVersion: typeof WORLD_SCHEMA_VERSION;
  id: WorldId;
  version: number;
  typography: { display: string; body: string };
  boardLayout: { id: 'ring-40' };
  /** Names for ownable tiles (properties, transport, utilities). Missing ids fall back to base board. */
  tileNames: Record<number, LocalizedText>;
  tileVisuals: { districtColors: Record<string, string>; frame: string };
  background: { gradient: string; boardGradient: string };
  environment: { kind: EnvironmentKind; intensity: number };
  audio: { profile: 'shared' };
  animations: { introMs: number; tileLiftPx: number };
  chaosPresentation: { label: LocalizedText; accent: string };
  features: LocalizedText[];
  localization: { defaultLocale: 'vi'; supported: Locale[] };
}

export interface WorldConfig extends WorldCatalogEntry {
  pack: WorldPack;
  mapEvents: WorldEventDef[];
}
