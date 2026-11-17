import { ChaosCard, GameState } from '../game/types';
import { SeededPRNG, defaultPRNG } from '../game/chaos-engine/prng';
import { DEFAULT_WORLD_ID, WorldEventDef, WorldId } from './types';
import { getCatalogEntry } from './catalog';

const L = (vi: string, en: string) => ({ vi, en });

/**
 * World map events (gameplay-side data, intentionally small and statically bundled so the
 * pure reducer and the authoritative server can use them synchronously).
 * All effects are symmetric/global and reuse the single canonical Chaos Engine appliers.
 */
export const WORLD_EVENTS: Partial<Record<WorldId, WorldEventDef[]>> = {
  'modern-metropolis': [
    {
      id: 'mm-market-rally', name: L('Thị Trường Hưng Phấn', 'Market Rally'),
      description: L('Chỉ số chứng khoán bứt phá. Mọi nhà đầu tư nhận $60M.', 'Stocks surge. Every investor receives $60M.'),
      trigger: { tileType: 'CHAOS', minRound: 1 }, effect: { type: 'CASH_ALL', value: 60, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'Gift',
    },
    {
      id: 'mm-credit-squeeze', name: L('Siết Tín Dụng', 'Credit Squeeze'),
      description: L('Ngân hàng nâng lãi suất: phí chuộc thế chấp tăng trong 2 lượt.', 'Banks raise rates: unmortgage fees increase for 2 turns.'),
      trigger: { tileType: 'CHAOS', minRound: 5 }, effect: { type: 'INTEREST_HIKE', value: 20, durationInTurns: 2 },
      rarity: 'UNCOMMON', iconName: 'Percent',
    },
    {
      id: 'mm-trade-expo', name: L('Hội Chợ Thương Mại', 'Trade Expo'),
      description: L('Khu thương mại sầm uất: tiền thuê khu cao cấp tăng 1.5x trong 2 lượt.', 'Commercial districts boom: premium-district rent x1.5 for 2 turns.'),
      trigger: { tileType: 'CHAOS', minRound: 3 }, effect: { type: 'DISTRICT_BOOM', value: 1.5, durationInTurns: 2 },
      rarity: 'RARE', iconName: 'Building2',
    },
  ],
  'cyberpunk-city': [
    {
      id: 'cp-grid-surge', name: L('Quá Tải Lưới Điện', 'Grid Overload'),
      description: L('Giá điện tăng vọt: tiền thuê tiện ích gấp đôi trong 2 lượt.', 'Power prices spike: utility rent doubles for 2 turns.'),
      trigger: { tileType: 'CHAOS', minRound: 1 }, effect: { type: 'UTILITY_BOOM', value: 2, durationInTurns: 2 },
      rarity: 'UNCOMMON', iconName: 'Lightbulb',
    },
    {
      id: 'cp-cyber-levy', name: L('Phí An Ninh Mạng', 'Cybersecurity Levy'),
      description: L('Sau vụ tấn công dữ liệu, mọi người đóng $40M vào quỹ an ninh.', 'After a data breach, everyone pays $40M into the security fund.'),
      trigger: { tileType: 'CHAOS', minRound: 4 }, effect: { type: 'CASH_ALL', value: -40, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'Shield',
    },
    {
      id: 'cp-ai-credit', name: L('Quỹ Tín Dụng AI', 'AI Credit Fund'),
      description: L('Quỹ AI trợ giá thế chấp: giá trị thế chấp 75% trong 2 lượt.', 'An AI fund subsidises mortgages: 75% loan value for 2 turns.'),
      trigger: { tileType: 'CHAOS', minRound: 3 }, effect: { type: 'SUBSIDIZED_MORTGAGE', value: 75, durationInTurns: 2 },
      rarity: 'UNCOMMON', iconName: 'Landmark',
    },
  ],
  'mekong-delta': [
    {
      id: 'mk-bumper-harvest', name: L('Trúng Mùa Lúa', 'Bumper Harvest'),
      description: L('Mùa vụ bội thu. Mọi người nhận $50M.', 'A bumper harvest. Everyone receives $50M.'),
      trigger: { tileType: 'CHAOS', minRound: 1 }, effect: { type: 'CASH_ALL', value: 50, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'Gift',
    },
    {
      id: 'mk-river-freight', name: L('Mùa Vận Tải Đường Thủy', 'River Freight Rush'),
      description: L('Ghe thuyền tấp nập: tiền thuê bến/ga gấp đôi trong 3 lượt.', 'Boats everywhere: transport rent doubles for 3 turns.'),
      trigger: { tileType: 'CHAOS', minRound: 2 }, effect: { type: 'TRANSPORT_BOOM', value: 2, durationInTurns: 3 },
      rarity: 'UNCOMMON', iconName: 'TrainTrack',
    },
    {
      id: 'mk-flood-season', name: L('Mùa Nước Nổi', 'Flood Season'),
      description: L('Nước lên cao: mỗi người chi $40M gia cố bờ bao.', 'Rising water: everyone pays $40M to reinforce embankments.'),
      trigger: { tileType: 'CHAOS', minRound: 4 }, effect: { type: 'CASH_ALL', value: -40, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'CloudRain',
    },
  ],
  'quang-tri-highlands': [
    {
      id: 'qt-drought', name: L('Hạn Hán Mùa Khô', 'Dry Season Drought'),
      description: L('Hạn hán kéo dài: mỗi người chi $40M đào giếng.', 'Drought deepens: everyone pays $40M to dig wells.'),
      trigger: { tileType: 'CHAOS', minRound: 2 }, effect: { type: 'CASH_ALL', value: -40, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'CloudRain',
    },
    {
      id: 'qt-coffee-price', name: L('Giá Cà Phê Tăng Vọt', 'Coffee Price Spike'),
      description: L('Giá cà phê xuất khẩu tăng vọt. Mọi người nhận $60M.', 'Coffee export prices soar. Everyone receives $60M.'),
      trigger: { tileType: 'CHAOS', minRound: 1 }, effect: { type: 'CASH_ALL', value: 60, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'Gift',
    },
    {
      id: 'qt-storm', name: L('Bão Lũ Miền Trung', 'Central Coast Storm'),
      description: L('Bão đổ bộ: thị trường tạm đóng trong 1 vòng.', 'A storm hits: the market closes for 1 round.'),
      trigger: { tileType: 'CHAOS', minRound: 3 }, effect: { type: 'FREEZE_MARKET', value: 0, durationInTurns: 1 },
      rarity: 'UNCOMMON', iconName: 'Shield',
    },
  ],
  'northwest-vietnam': [
    {
      id: 'nw-hail', name: L('Mưa Đá Vùng Cao', 'Highland Hailstorm'),
      description: L('Mưa đá phá mùa vụ: mỗi người chi $40M.', 'Hail ruins crops: everyone pays $40M.'),
      trigger: { tileType: 'CHAOS', minRound: 2 }, effect: { type: 'CASH_ALL', value: -40, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'CloudRain',
    },
    {
      id: 'nw-tourism-boom', name: L('Khách Du Lịch Bùng Nổ', 'Tourism Boom'),
      description: L('Du khách đổ về các bản làng: tiền thuê khu cao cấp tăng 1.5x trong 2 lượt.', 'Visitors flood the villages: premium rent x1.5 for 2 turns.'),
      trigger: { tileType: 'CHAOS', minRound: 1 }, effect: { type: 'DISTRICT_BOOM', value: 1.5, durationInTurns: 2 },
      rarity: 'UNCOMMON', iconName: 'Building2',
    },
    {
      id: 'nw-mountain-haze', name: L('Sương Muối Đèo Cao', 'Frost on the Pass'),
      description: L('Sương muối phủ đèo: giới nghiêm 1 lượt.', 'Frost covers the pass: curfew for 1 turn.'),
      trigger: { tileType: 'CHAOS', minRound: 3 }, effect: { type: 'CURFEW', value: 4, durationInTurns: 1 },
      rarity: 'UNCOMMON', iconName: 'Shield',
    },
  ],
  'space-colony': [
    {
      id: 'sc-solar-flare', name: L('Bão Mặt Trời', 'Solar Flare'),
      description: L('Giới nghiêm trạm: mỗi lượt chỉ được đi tối đa 4 bước trong 1 lượt.', 'Station lockdown: movement capped at 4 steps for 1 turn.'),
      trigger: { tileType: 'CHAOS', minRound: 2 }, effect: { type: 'CURFEW', value: 4, durationInTurns: 1 },
      rarity: 'RARE', iconName: 'Shield',
    },
    {
      id: 'sc-energy-surge', name: L('Đột Biến Năng Lượng', 'Energy Surge'),
      description: L('Giá năng lượng tăng: tiền thuê tiện ích gấp đôi trong 2 lượt.', 'Energy prices climb: utility rent doubles for 2 turns.'),
      trigger: { tileType: 'CHAOS', minRound: 1 }, effect: { type: 'UTILITY_BOOM', value: 2, durationInTurns: 2 },
      rarity: 'UNCOMMON', iconName: 'Lightbulb',
    },
    {
      id: 'sc-supply-drop', name: L('Tiếp Tế Từ Trái Đất', 'Earth Supply Drop'),
      description: L('Tàu tiếp tế cập bến. Mọi người nhận $60M.', 'A supply ship docks. Everyone receives $60M.'),
      trigger: { tileType: 'CHAOS', minRound: 1 }, effect: { type: 'CASH_ALL', value: 60, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'Gift',
    },
    {
      id: 'sc-hull-breach', name: L('Rò Rỉ Vỏ Trạm', 'Hull Breach'),
      description: L('Sửa chữa khẩn cấp: mỗi người chi $50M.', 'Emergency repairs: everyone pays $50M.'),
      trigger: { tileType: 'CHAOS', minRound: 6 }, effect: { type: 'CASH_ALL', value: -50, durationInTurns: 0 },
      rarity: 'COMMON', iconName: 'Flame',
    },
  ],
};

/** Probability a CHAOS-tile draw is replaced by an eligible world event. */
export const WORLD_EVENT_SHARE = 0.3;

export function getWorldEvents(worldId: unknown): WorldEventDef[] {
  const id = typeof worldId === 'string' ? worldId : DEFAULT_WORLD_ID;
  if (!getCatalogEntry(id)) return [];
  return WORLD_EVENTS[id as WorldId] ?? [];
}

export function worldEventToChaosCard(worldId: string, ev: WorldEventDef): ChaosCard {
  const { type, value, durationInTurns } = ev.effect;
  return {
    id: `world-${ev.id}`,
    title: ev.name.en,
    nameVi: ev.name.vi,
    tagline: ev.name.en,
    taglineVi: ev.name.vi,
    flavorText: ev.description.en,
    descriptionVi: ev.description.vi,
    category: type === 'CASH_ALL' ? (value >= 0 ? 'POSITIVE' : 'NEGATIVE') : 'ECONOMIC',
    rarity: ev.rarity,
    effectType: type,
    value,
    magnitude: value,
    durationInTurns,
    iconName: ev.iconName,
    triggerType: 'TILE_LANDED',
    worldId,
    worldEventId: ev.id,
  };
}

/**
 * Picks a world event for a CHAOS-tile landing, or null to let the canonical Chaos Engine draw.
 * Consumes NO randomness when the world has no eligible events (keeps legacy determinism).
 * Skips the event that fired most recently (anti-repeat).
 */
export function pickWorldEventCard(state: GameState, rng?: SeededPRNG): ChaosCard | null {
  const worldId = state.config.worldId;
  if (!worldId) return null;
  const eligible = getWorldEvents(worldId).filter(
    e =>
      state.roundNumber >= e.trigger.minRound &&
      (e.trigger.maxRound === undefined || state.roundNumber <= e.trigger.maxRound) &&
      state.chaosHistory?.[0]?.cardId !== `world-${e.id}`
  );
  if (eligible.length === 0) return null;
  const r = rng ?? defaultPRNG;
  if (r.nextFloat() >= WORLD_EVENT_SHARE) return null;
  return worldEventToChaosCard(worldId, eligible[r.nextInt(0, eligible.length - 1)]);
}
