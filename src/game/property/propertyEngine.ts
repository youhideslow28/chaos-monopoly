import { BoardTile, ChaosModifiers, DistrictColor, GameState, PlayerId, PropertyOwnership, TileId } from '../types';
import { formatMoney } from '../../utils/money';
import { BOARD_TILES_BY_ID, TILES_BY_DISTRICT } from '../board/boardData';
import {
  calculateEffectiveMortgageValue,
  calculateEffectiveUnmortgageCost,
  isMarketFrozen,
  DEFAULT_CHAOS_MODIFIERS,
} from '../economy/economicModifiers';
import {
  buildMultiplier,
  buyMultiplier,
  inflationRatePerRound,
  landMultiplier,
  landSellRate,
  maxRoundMultiplier,
  mortgageRate,
  sellRate,
} from '../world-rules/worldRules';

export type WorldEconomyContext = (Pick<GameState, 'config' | 'worldState'> & { roundNumber?: number }) | null | undefined;

function resolveRound(roundNumber?: number, world?: WorldEconomyContext): number {
  if (roundNumber !== undefined && Number.isFinite(roundNumber)) {
    return Math.max(1, Math.floor(roundNumber));
  }
  const wRound = world?.roundNumber;
  return typeof wRound === 'number' && Number.isFinite(wRound) ? Math.max(1, Math.floor(wRound)) : 1;
}

export function getTileById(tileId: TileId): BoardTile | undefined {
  return BOARD_TILES_BY_ID[tileId];
}

export function getTilesInDistrict(districtColor: DistrictColor): BoardTile[] {
  return TILES_BY_DISTRICT[districtColor] || [];
}

export function hasDistrictMonopoly(
  districtColor: DistrictColor,
  playerId: PlayerId,
  properties: Record<TileId, PropertyOwnership>
): boolean {
  const districtTiles = getTilesInDistrict(districtColor);
  if (districtTiles.length === 0) return false;
  return districtTiles.every(t => properties[t.id]?.ownerId === playerId);
}

export function hasAnyMortgagedInDistrict(
  districtColor: DistrictColor,
  properties: Record<TileId, PropertyOwnership>
): boolean {
  const districtTiles = getTilesInDistrict(districtColor);
  return districtTiles.some(t => properties[t.id]?.isMortgaged === true);
}

/**
 * Market land value scaled by round inflation (bounded by world cap) and permanent world land factor.
 * Intentionally unaffected by temporary seasonal build discounts (e.g. Quảng Trị Wet season).
 */
export function getMarketLandValue(
  tileId: TileId,
  roundNumber?: number,
  world?: WorldEconomyContext
): number {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  const r = resolveRound(roundNumber, world);
  return Math.round(tile.property.basePrice * getRoundPriceMultiplier(r, world) * landMultiplier(world));
}

export function getMortgageValue(
  tileId: TileId,
  modifiers?: ChaosModifiers,
  world?: WorldEconomyContext,
  roundNumber?: number
): number {
  const marketLand = getMarketLandValue(tileId, roundNumber, world);
  if (marketLand <= 0) return 0;
  return calculateEffectiveMortgageValue(marketLand, modifiers, mortgageRate(world));
}

export function getUnmortgageCost(
  tileId: TileId,
  modifiers?: ChaosModifiers,
  world?: WorldEconomyContext,
  roundNumber?: number
): number {
  const marketLand = getMarketLandValue(tileId, roundNumber, world);
  if (marketLand <= 0) return 0;
  const stdRate = mortgageRate(world);
  const standardPrincipal = calculateEffectiveMortgageValue(marketLand, undefined, stdRate);
  return calculateEffectiveUnmortgageCost(marketLand, modifiers, standardPrincipal, stdRate);
}

export function calculateRent(
  tileId: TileId,
  properties: Record<TileId, PropertyOwnership>,
  rentModifier: number = 1,
  diceSum: number = 7,
  modifiers?: ChaosModifiers
): {
  rentAmount: number;
  isMonopoly: boolean;
  ownerId: PlayerId | null;
} {
  const tile = getTileById(tileId);
  const ownership = properties[tileId];

  if (!tile || !tile.property || !ownership || !ownership.ownerId) {
    return { rentAmount: 0, isMonopoly: false, ownerId: null };
  }

  // If property is mortgaged, rent is 0
  if (ownership.isMortgaged) {
    return { rentAmount: 0, isMonopoly: false, ownerId: ownership.ownerId };
  }

  const ownerId = ownership.ownerId;
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;

  // Alien Mothership (Tile 39) blocks rent completely
  if (tileId === 39 && mods.alienMothershipTurns > 0) {
    return { rentAmount: 0, isMonopoly: false, ownerId };
  }

  // Handle Transport Hubs (Tiles 5, 15, 25, 35)
  if (tile.type === 'TRANSPORT' || tile.property.districtColor === 'district-transport') {
    const transportTiles = getTilesInDistrict('district-transport');
    const ownedTransportCount = transportTiles.filter(t => properties[t.id]?.ownerId === ownerId).length;
    // Transport Hub scaling: 1 hub: $25k, 2 hubs: $50k, 3 hubs: $100k, 4 hubs: $200k
    const transportRentScale = [0, 25, 50, 100, 200];
    let rent = transportRentScale[Math.min(ownedTransportCount, 4)] || 25;
    if (mods.transportBoomTurns > 0) {
      rent *= 2;
    }
    const finalRent = Math.max(1, Math.round(rent * rentModifier));
    return {
      rentAmount: finalRent,
      isMonopoly: ownedTransportCount === transportTiles.length,
      ownerId,
    };
  }

  // Handle Utilities (Tiles 12 SAWACO, 28 EVN)
  if (tile.type === 'UTILITY' || tile.property.districtColor === 'district-utility') {
    const utilityTiles = getTilesInDistrict('district-utility');
    const ownedUtilityCount = utilityTiles.filter(t => properties[t.id]?.ownerId === ownerId).length;
    // 1 utility: 4x dice roll, 2 utilities: 10x dice roll
    const multiplier = ownedUtilityCount >= 2 ? 10 : 4;
    let rent = multiplier * diceSum;
    if (mods.utilityBoomTurns > 0) {
      rent *= 2;
    }
    const finalRent = Math.max(1, Math.round(rent * rentModifier));
    return {
      rentAmount: finalRent,
      isMonopoly: ownedUtilityCount === utilityTiles.length,
      ownerId,
    };
  }

  // Regular Color District Properties
  const { baseRent, houseRent, districtColor } = tile.property;
  const isMonopoly = hasDistrictMonopoly(districtColor, ownerId, properties);

  let rent = baseRent;
  if (ownership.level > 0) {
    // 1★ -> houseRent[0], 2★ -> houseRent[1], 3★ -> houseRent[2], 4★ -> houseRent[3], 5★ Landmark -> houseRent[4]
    const idx = Math.min(ownership.level - 1, houseRent.length - 1);
    rent = houseRent[idx];
  } else if (isMonopoly) {
    // Unimproved land with full color monopoly gets x2 rent!
    rent = baseRent * 2;
  }

  // District Boom: 1.5x on Hanoi (district-green) and HCMC (district-darkblue)
  if (
    mods.districtBoomTurns > 0 &&
    (districtColor === 'district-green' || districtColor === 'district-darkblue')
  ) {
    rent = Math.round(rent * 1.5);
  }

  const finalRent = Math.max(1, Math.round(rent * rentModifier));
  return {
    rentAmount: finalRent,
    isMonopoly,
    ownerId,
  };
}

/** Baseline property inflation rate per round (world-specific profiles override via inflationRatePerRound). */
export const PROPERTY_PRICE_GROWTH_PER_ROUND = 0.025;
export const ROUND_PRICE_MULTIPLIER_MAX = 2.4;

/**
 * Rent pressure: rent grows 9% per round after round 25, up to 8x.
 * Without this, two cautious players can trade small rents forever and a no-round-limit
 * match never ends (observed: still going after 272 rounds).
 */
export const RENT_ESCALATION_START_ROUND = 25;
export const RENT_ESCALATION_PER_ROUND = 0.09;
export const RENT_ESCALATION_MAX = 8;

export function getRentEscalationMultiplier(roundNumber: number = 1): number {
  if (!Number.isFinite(roundNumber) || roundNumber <= RENT_ESCALATION_START_ROUND) return 1;
  const steps = roundNumber - RENT_ESCALATION_START_ROUND;
  return Math.min(RENT_ESCALATION_MAX, 1 + RENT_ESCALATION_PER_ROUND * steps);
}

export function getRoundPriceMultiplier(
  roundNumber: number = 1,
  world?: WorldEconomyContext
): number {
  const r = Number.isFinite(roundNumber) && roundNumber > 1 ? Math.floor(roundNumber) : 1;
  const rate = inflationRatePerRound(world);
  const cap = maxRoundMultiplier(world);
  return Math.min(cap, Number((1 + rate * (r - 1)).toFixed(4)));
}

export function getBuyPrice(tileId: TileId, roundNumber?: number, world?: WorldEconomyContext): number {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  const r = resolveRound(roundNumber, world);
  return Math.round(tile.property.basePrice * getRoundPriceMultiplier(r, world) * buyMultiplier(world));
}

export function getUpgradeCost(tileId: TileId, roundNumber?: number, world?: WorldEconomyContext): number {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  const r = resolveRound(roundNumber, world);
  return Math.round(tile.property.upgradeCost * getRoundPriceMultiplier(r, world) * buildMultiplier(world));
}

export function canBuyProperty(
  tileId: TileId,
  playerCash: number,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers,
  roundNumber: number = 1,
  world?: Parameters<typeof buildMultiplier>[0]
): { canBuy: boolean; reason?: string } {
  if (isMarketFrozen(modifiers)) {
    return {
      canBuy: false,
      reason: 'Thị trường bất động sản đang bị đóng băng (Freeze Market)! Không thể mua đất trong vòng này.',
    };
  }

  const tile = getTileById(tileId);
  const buyableTypes = ['PROPERTY', 'TRANSPORT', 'UTILITY'];
  if (!tile || !buyableTypes.includes(tile.type) || !tile.property) {
    return { canBuy: false, reason: 'Ô này không phải bất động sản có thể mua.' };
  }

  const ownership = properties[tileId];
  if (ownership && ownership.ownerId !== null) {
    return { canBuy: false, reason: 'Bất động sản này đã có chủ sở hữu.' };
  }

  const price = getBuyPrice(tileId, roundNumber, world);
  if (playerCash < price) {
    return {
      canBuy: false,
      reason: `Số dư không đủ. Cần ${formatMoney(price)} (Bạn có ${formatMoney(playerCash)}).`,
    };
  }

  return { canBuy: true };
}

export function canUpgradeProperty(
  tileId: TileId,
  playerId: PlayerId,
  playerCash: number,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers,
  roundNumber?: number,
  world?: Parameters<typeof buildMultiplier>[0]
): { canUpgrade: boolean; reason?: string } {
  if (isMarketFrozen(modifiers)) {
    return {
      canUpgrade: false,
      reason: 'Thị trường bất động sản đang bị đóng băng (Freeze Market)! Không thể xây dựng hoặc nâng cấp công trình trong vòng này.',
    };
  }

  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canUpgrade: false, reason: 'Không có dữ liệu công trình.' };
  }

  if (tile.property.maxLevel <= 0) {
    return { canUpgrade: false, reason: 'Khu vực này (Vận tải/Tiện ích) không thể xây công trình nâng cấp.' };
  }

  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canUpgrade: false, reason: 'Bạn không sở hữu bất động sản này.' };
  }

  if (ownership.level >= tile.property.maxLevel) {
    return { canUpgrade: false, reason: 'Công trình đã đạt cấp cao nhất (Landmark 5★).' };
  }

  if (roundNumber !== undefined && ownership.lastUpgradeRound === roundNumber) {
    return { canUpgrade: false, reason: 'Công trình này đã được nâng cấp trong vòng này. Mỗi vòng chỉ nâng cấp một lần.' };
  }

  // Simplified upgrade rules (client request): owning the tile is enough. The former
  // monopoly requirement, the district-mortgage block and the even-building rule were
  // removed because they made upgrading feel unreachable in practice.
  // Still enforced: ownership, max level, cash, one upgrade per tile per round, market open.

  const upgradeCost = getUpgradeCost(tileId, roundNumber ?? 1, world);
  if (playerCash < upgradeCost) {
    return {
      canUpgrade: false,
      reason: `Số dư không đủ. Phí nâng cấp là ${formatMoney(upgradeCost)}.`,
    };
  }

  return { canUpgrade: true };
}

export function canDowngradeProperty(
  tileId: TileId,
  playerId: PlayerId,
  properties: Record<TileId, PropertyOwnership>,
  roundNumber?: number,
  world?: WorldEconomyContext
): { canDowngrade: boolean; refundAmount: number; reason?: string } {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canDowngrade: false, refundAmount: 0, reason: 'Không có dữ liệu công trình.' };
  }

  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canDowngrade: false, refundAmount: 0, reason: 'Bạn không sở hữu bất động sản này.' };
  }

  if (ownership.level <= 0) {
    return { canDowngrade: false, refundAmount: 0, reason: 'Đất trống, không có công trình để bán.' };
  }

  // Synchronized with current market upgrade cost & world sellRate (75%–100%).
  const r = resolveRound(roundNumber, world);
  const currentUpgradeCost = getUpgradeCost(tileId, r, world);
  const refundAmount = Math.round(currentUpgradeCost * sellRate(world));
  return { canDowngrade: true, refundAmount };
}

/**
 * Cash payout when selling vacant land back to the Bank at market rate (`landSellRate`, 75%–100%).
 * If the tile is currently mortgaged, unmortgage payoff is deducted cleanly to prevent any loop.
 */
export function getLandSellValue(
  tileId: TileId,
  properties?: Record<TileId, PropertyOwnership>,
  roundNumber?: number,
  world?: WorldEconomyContext,
  modifiers?: ChaosModifiers
): number {
  const r = resolveRound(roundNumber, world);
  const marketLand = getMarketLandValue(tileId, r, world);
  if (marketLand <= 0) return 0;
  const gross = Math.round(marketLand * landSellRate(world));
  const ownership = properties?.[tileId];
  if (ownership?.isMortgaged) {
    const payoff = getUnmortgageCost(tileId, modifiers, world, r);
    return Math.max(0, gross - payoff);
  }
  return gross;
}

export function canSellProperty(
  tileId: TileId,
  playerId: PlayerId,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers,
  roundNumber?: number,
  world?: WorldEconomyContext
): { canSell: boolean; sellValue: number; reason?: string } {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canSell: false, sellValue: 0, reason: 'Không có dữ liệu bất động sản.' };
  }

  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canSell: false, sellValue: 0, reason: 'Bạn không sở hữu bất động sản này.' };
  }

  const districtTiles = getTilesInDistrict(tile.property.districtColor);
  const hasBuildings = districtTiles.some(t => (properties[t.id]?.level ?? 0) > 0);
  if (hasBuildings) {
    return {
      canSell: false,
      sellValue: 0,
      reason: 'Phải bán hết công trình trong phân khu trước khi bán lại đất cho Ngân hàng.',
    };
  }

  const r = resolveRound(roundNumber, world);
  const sellValue = getLandSellValue(tileId, properties, r, world, modifiers);
  return { canSell: true, sellValue };
}

export function canMortgageProperty(
  tileId: TileId,
  playerId: PlayerId,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers,
  world?: WorldEconomyContext,
  roundNumber?: number
): { canMortgage: boolean; mortgageValue: number; reason?: string } {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canMortgage: false, mortgageValue: 0, reason: 'Không có dữ liệu bất động sản.' };
  }

  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canMortgage: false, mortgageValue: 0, reason: 'Bạn không sở hữu bất động sản này.' };
  }

  if (ownership.isMortgaged) {
    return { canMortgage: false, mortgageValue: 0, reason: 'Bất động sản này đã bị cầm cố trước đó.' };
  }

  // All properties in the color district must have level 0 (all buildings sold)
  const districtTiles = getTilesInDistrict(tile.property.districtColor);
  const hasBuildings = districtTiles.some(t => (properties[t.id]?.level ?? 0) > 0);
  if (hasBuildings) {
    return {
      canMortgage: false,
      mortgageValue: 0,
      reason: 'Phải bán toàn bộ công trình trong phân khu về đất trống trước khi cầm cố.',
    };
  }

  const mortgageValue = getMortgageValue(tileId, modifiers, world, roundNumber);
  return { canMortgage: true, mortgageValue };
}

export function canUnmortgageProperty(
  tileId: TileId,
  playerId: PlayerId,
  playerCash: number,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers,
  world?: WorldEconomyContext,
  roundNumber?: number
): { canUnmortgage: boolean; unmortgageCost: number; reason?: string } {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canUnmortgage: false, unmortgageCost: 0, reason: 'Không có dữ liệu bất động sản.' };
  }

  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canUnmortgage: false, unmortgageCost: 0, reason: 'Bạn không sở hữu bất động sản này.' };
  }

  if (!ownership.isMortgaged) {
    return { canUnmortgage: false, unmortgageCost: 0, reason: 'Bất động sản này không bị cầm cố.' };
  }

  const unmortgageCost = getUnmortgageCost(tileId, modifiers, world, roundNumber);
  if (playerCash < unmortgageCost) {
    return {
      canUnmortgage: false,
      unmortgageCost,
      reason: `Số dư không đủ để giải chấp. Cần ${formatMoney(unmortgageCost)} (Bạn có ${formatMoney(playerCash)}).`,
    };
  }

  return { canUnmortgage: true, unmortgageCost };
}
