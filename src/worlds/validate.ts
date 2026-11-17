import { BOARD_TILES } from '../game/board/boardData';
import { WORLD_EVENTS } from './worldEvents';
import { WORLD_CATALOG } from './catalog';
import {
  WORLD_SCHEMA_VERSION,
  WorldCatalogEntry,
  WorldConfig,
  WorldEventDef,
  WorldEventEffectType,
  WorldPack,
} from './types';

const HEX = /^#[0-9a-fA-F]{6}$/;
const COLOR = /^(#[0-9a-fA-F]{6}|rgba?\([0-9.,\s]+\))$/;
const ID = /^[a-z][a-z0-9-]{2,40}$/;

/** Hard economic bounds for world events: worlds can never change rules, only apply bounded effects. */
export const EVENT_BOUNDS: Record<WorldEventEffectType, { min: number; max: number; maxDuration: number }> = {
  CASH_ALL: { min: -100, max: 100, maxDuration: 0 },
  TRANSPORT_BOOM: { min: 1.5, max: 2, maxDuration: 3 },
  UTILITY_BOOM: { min: 1.5, max: 2, maxDuration: 3 },
  DISTRICT_BOOM: { min: 1.25, max: 1.5, maxDuration: 3 },
  CURFEW: { min: 3, max: 6, maxDuration: 1 },
  GOLDEN_HOUR: { min: 200, max: 400, maxDuration: 1 },
  INTEREST_HIKE: { min: 10, max: 20, maxDuration: 3 },
  SUBSIDIZED_MORTGAGE: { min: 60, max: 75, maxDuration: 3 },
  FREEZE_MARKET: { min: 0, max: 1, maxDuration: 1 },
};

const ownableIds = BOARD_TILES.filter(
  t => t.type === 'PROPERTY' || t.type === 'TRANSPORT' || t.type === 'UTILITY'
).map(t => t.id);

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0 && s.length <= 120;

export function validateCatalog(): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const w of WORLD_CATALOG) errs.push(...validateCatalogEntry(w, ids));
  if (WORLD_CATALOG.length !== 8) errs.push(`catalog must define 8 worlds, found ${WORLD_CATALOG.length}`);
  return errs;
}

export function validateCatalogEntry(w: WorldCatalogEntry, seen: Set<string> = new Set()): string[] {
  const e: string[] = [];
  const p = `[${w.id}]`;
  if (!ID.test(w.id)) e.push(`${p} invalid id`);
  if (seen.has(w.id)) e.push(`${p} duplicate id`);
  seen.add(w.id);
  if (w.schemaVersion !== WORLD_SCHEMA_VERSION) e.push(`${p} unsupported schemaVersion`);
  for (const k of ['name', 'tagline', 'description'] as const) {
    if (!nonEmpty(w[k]?.vi) && k !== 'description') e.push(`${p} ${k}.vi missing`);
    if (!nonEmpty(w[k]?.en) && k !== 'description') e.push(`${p} ${k}.en missing`);
    if (k === 'description' && (!w.description?.vi?.trim() || !w.description?.en?.trim())) e.push(`${p} description missing`);
  }
  for (const [k, v] of Object.entries(w.palette)) if (!COLOR.test(v)) e.push(`${p} palette.${k} invalid colour`);
  if (w.availability !== 'AVAILABLE' && w.availability !== 'COMING_SOON') e.push(`${p} bad availability`);
  return e;
}

export function validateEvents(events: WorldEventDef[], label = 'events'): string[] {
  const e: string[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    const p = `[${label}:${ev.id}]`;
    if (!ID.test(ev.id) && !/^[a-z]{2}-[a-z0-9-]+$/.test(ev.id)) e.push(`${p} bad id`);
    if (seen.has(ev.id)) e.push(`${p} duplicate`);
    seen.add(ev.id);
    if (!nonEmpty(ev.name?.vi) || !nonEmpty(ev.name?.en)) e.push(`${p} name missing`);
    if (!nonEmpty(ev.description?.vi) || !nonEmpty(ev.description?.en)) e.push(`${p} description missing`);
    if (ev.trigger?.tileType !== 'CHAOS') e.push(`${p} trigger.tileType must be CHAOS`);
    if (!(ev.trigger?.minRound >= 1)) e.push(`${p} trigger.minRound must be >= 1`);
    const b = EVENT_BOUNDS[ev.effect?.type as WorldEventEffectType];
    if (!b) {
      e.push(`${p} effect type "${ev.effect?.type}" not allowed`);
      continue;
    }
    if (!(ev.effect.value >= b.min && ev.effect.value <= b.max)) e.push(`${p} value out of bounds [${b.min},${b.max}]`);
    if (!(ev.effect.durationInTurns >= 0 && ev.effect.durationInTurns <= b.maxDuration)) e.push(`${p} duration out of bounds`);
  }
  return e;
}

export function validatePack(pack: WorldPack): string[] {
  const e: string[] = [];
  const p = `[pack:${pack?.id}]`;
  if (!pack || pack.schemaVersion !== WORLD_SCHEMA_VERSION) return [`${p} unsupported schemaVersion`];
  if (pack.boardLayout?.id !== 'ring-40') e.push(`${p} unsupported boardLayout`);
  for (const key of Object.keys(pack.tileNames)) {
    if (!ownableIds.includes(Number(key))) e.push(`${p} tileNames has non-ownable/unknown tile ${key}`);
  }
  for (const id of ownableIds) {
    const n = pack.tileNames[id];
    if (!n || !nonEmpty(n.vi) || !nonEmpty(n.en)) e.push(`${p} tile ${id} missing localized name`);
  }
  for (const [k, v] of Object.entries(pack.tileVisuals?.districtColors ?? {})) if (!HEX.test(v)) e.push(`${p} district colour ${k} invalid`);
  if (!HEX.test(pack.tileVisuals?.frame ?? '')) e.push(`${p} frame colour invalid`);
  if (!(pack.environment?.intensity >= 0 && pack.environment.intensity <= 1)) e.push(`${p} environment.intensity must be 0..1`);
  if (!(pack.animations?.introMs >= 0 && pack.animations.introMs <= 3000)) e.push(`${p} animations.introMs must be 0..3000`);
  if (!pack.localization?.supported?.includes('vi') || !pack.localization.supported.includes('en')) e.push(`${p} must support vi+en`);
  if (!HEX.test(pack.chaosPresentation?.accent ?? '')) e.push(`${p} chaosPresentation.accent invalid`);
  return e;
}

export function validateWorld(config: WorldConfig): string[] {
  const e = [
    ...validateCatalogEntry(config),
    ...validatePack(config.pack),
    ...validateEvents(config.mapEvents, config.id),
  ];
  if (config.pack.id !== config.id) e.push(`[${config.id}] pack id mismatch (${config.pack.id})`);
  if (config.availability === 'AVAILABLE' && config.completeness !== 'FULL') e.push(`[${config.id}] AVAILABLE world must be FULL`);
  if (config.completeness === 'FULL' && config.mapEvents.length < 2) e.push(`[${config.id}] FULL world needs >= 2 map events`);
  return e;
}

export function validateAllEventData(): string[] {
  const e: string[] = [];
  for (const [id, evs] of Object.entries(WORLD_EVENTS)) e.push(...validateEvents(evs ?? [], id));
  return e;
}
