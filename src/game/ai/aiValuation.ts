import {
  AIDifficulty,
  AIPersonalityId,
  GameState,
  PlayerId,
  PlayerState,
  TileId,
} from '../types';
import { BOARD_SIZE, BOARD_TILES } from '../board/boardData';
import {
  calculateRent,
  getBuyPrice,
  getRentEscalationMultiplier,
  getTileById,
  getTilesInDistrict,
  getUpgradeCost,
  hasDistrictMonopoly,
} from '../property/propertyEngine';
import { rentMultiplier } from '../world-rules/worldRules';
import { calculatePlayerNetWorth } from '../economy/economyEngine';
import { getAIDifficultyConfig, getAIPersonalityProfile } from './aiPersonalities';

/**
 * Exact 2d6 probability distribution for sums 2..12
 */
const TWO_DICE_PROBABILITY: Record<number, number> = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  7: 6 / 36,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36,
};

export interface PropertyStrategicValuation {
  tileId: TileId;
  basePrice: number;
  intrinsicValue: number;
  completesOwnMonopoly: boolean;
  blocksOpponentMonopoly: boolean;
  blockedOpponentId: PlayerId | null;
  expectedRentPerRound: number;
  strategicScore: number; // Ratio of intrinsicValue / basePrice (1.0 = fair list price)
}

/**
 * Computes the expected cash drain (danger exposure) an AI faces on its next roll
 * from its current board position.
 */
export function calculateNextRollDangerExposure(
  state: GameState,
  player: PlayerState
): { expectedRentLoss: number; maxSingleHit: number } {
  if (player.inDetention) {
    return { expectedRentLoss: 0, maxSingleHit: 0 };
  }

  const isReverse = (state.chaosModifiers?.reverseDirectionTurns || 0) > 0;
  const isCurfew = (state.chaosModifiers?.curfewTurns || 0) > 0;

  let expectedRentLoss = 0;
  let maxSingleHit = 0;

  for (let sum = 2; sum <= 12; sum++) {
    const prob = TWO_DICE_PROBABILITY[sum] || 0;
    const effectiveSteps = isCurfew ? Math.min(sum, 4) : sum;
    const rawPos = isReverse
      ? player.position - effectiveSteps
      : player.position + effectiveSteps;
    const landingPos = ((rawPos % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;

    const tile = getTileById(landingPos);
    if (!tile) continue;

    let hit = 0;
    if (tile.type === 'TAX') {
      hit = tile.taxAmount || (tile.id === 4 ? 200 : 100);
    } else if (
      tile.type === 'PROPERTY' ||
      tile.type === 'TRANSPORT' ||
      tile.type === 'UTILITY'
    ) {
      const ownership = state.properties[landingPos];
      if (
        ownership &&
        ownership.ownerId &&
        ownership.ownerId !== player.id &&
        !ownership.isMortgaged
      ) {
        const rentInfo = calculateRent(
          landingPos,
          state.properties,
          state.rentModifier *
            getRentEscalationMultiplier(state.roundNumber) *
            rentMultiplier(state, ownership.level, tile.type),
          sum,
          state.chaosModifiers
        );
        hit = rentInfo.rentAmount;
      }
    }

    expectedRentLoss += prob * hit;
    if (hit > maxSingleHit) {
      maxSingleHit = hit;
    }
  }

  return {
    expectedRentLoss: Math.round(expectedRentLoss),
    maxSingleHit,
  };
}

/**
 * Calculates the dynamic minimum cash reserve an AI player wants to keep
 * based on personality, difficulty, board danger, and active Chaos modifiers.
 */
export function calculateRequiredSafetyReserve(
  state: GameState,
  player: PlayerState,
  personalityId?: AIPersonalityId,
  difficultyId?: AIDifficulty
): number {
  const profile = getAIPersonalityProfile(personalityId || player.aiPersonality);
  const diff = getAIDifficultyConfig(difficultyId || player.aiDifficulty);

  const baseReserve = state.config.startingCash * profile.minReserveRatio;

  if (diff.lookaheadDepth === 0) {
    // EASY AI only uses a static fraction of base reserve
    return Math.round(baseReserve * 0.75);
  }

  const danger = calculateNextRollDangerExposure(state, player);
  const dangerBuffer =
    diff.lookaheadDepth >= 2
      ? Math.min(baseReserve * 0.85, Math.max(danger.expectedRentLoss * 0.85, danger.maxSingleHit * 0.14))
      : Math.min(baseReserve * 0.9, danger.expectedRentLoss * 0.95);

  // Chaos modifier adaptation
  let chaosReserveMultiplier = 1.0;
  if ((state.chaosModifiers?.interestHikeTurns || 0) > 0) {
    chaosReserveMultiplier += 0.15 * profile.chaosAdaptability;
  }
  if (state.rentModifier > 1) {
    chaosReserveMultiplier += 0.25 * profile.chaosAdaptability;
  }

  return Math.round((baseReserve + dangerBuffer) * chaosReserveMultiplier);
}

/**
 * Evaluates the strategic worth of a property tile for a given AI player.
 * Considers:
 * - Remaining rounds in the match
 * - District synergy & monopoly completion
 * - Blocking an opponent from completing a monopoly
 * - Active Chaos economic booms (Transport, Utility, District Boom)
 * - Personality district preferences & difficulty lookahead
 */
export function evaluatePropertyForPlayer(
  state: GameState,
  player: PlayerState,
  tileId: TileId,
  personalityId?: AIPersonalityId,
  difficultyId?: AIDifficulty
): PropertyStrategicValuation {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return {
      tileId,
      basePrice: 0,
      intrinsicValue: 0,
      completesOwnMonopoly: false,
      blocksOpponentMonopoly: false,
      blockedOpponentId: null,
      expectedRentPerRound: 0,
      strategicScore: 0,
    };
  }

  const profile = getAIPersonalityProfile(personalityId || player.aiPersonality);
  const diff = getAIDifficultyConfig(difficultyId || player.aiDifficulty);
  const { baseRent, districtColor } = tile.property;
  const basePrice = getBuyPrice(tileId, state.roundNumber, state) || tile.property.basePrice;
  const currentUpgradeCost = getUpgradeCost(tileId, state.roundNumber, state) || tile.property.upgradeCost;

  const districtTiles = getTilesInDistrict(districtColor);
  const totalInDistrict = districtTiles.length;
  const ownedBySelf = districtTiles.filter(
    t => t.id !== tileId && state.properties[t.id]?.ownerId === player.id
  ).length;

  const completesOwnMonopoly = totalInDistrict > 1 && ownedBySelf === totalInDistrict - 1;

  // Check if any solvent opponent already owns all other tiles in this district
  let blocksOpponentMonopoly = false;
  let blockedOpponentId: PlayerId | null = null;

  if (totalInDistrict > 1) {
    for (const opp of state.players) {
      if (opp.id === player.id || opp.isBankrupt) continue;
      const ownedByOpp = districtTiles.filter(
        t => t.id !== tileId && state.properties[t.id]?.ownerId === opp.id
      ).length;
      if (ownedByOpp === totalInDistrict - 1) {
        blocksOpponentMonopoly = true;
        blockedOpponentId = opp.id;
        break;
      }
    }
  }

  // No round cap (maxRounds 0): plan over a fixed horizon instead.
  const planningEndRound = state.config.maxRounds > 0 ? state.config.maxRounds : state.roundNumber + 30;
  const remainingRounds = Math.max(3, planningEndRound - state.roundNumber);
  const activeOpponents = Math.max(
    1,
    state.players.filter(p => !p.isBankrupt && p.id !== player.id).length
  );

  // Average probability a given opponent lands on a specific tile per round is ~1/6.5 (~0.15)
  const expectedLandingsPerRound = activeOpponents * 0.14;
  let effectiveRent = baseRent;

  if (tile.type === 'TRANSPORT') {
    const transportScale = [25, 50, 100, 200];
    effectiveRent = transportScale[Math.min(ownedBySelf, 3)];
    if ((state.chaosModifiers?.transportBoomTurns || 0) > 0) {
      effectiveRent *= 1.5 * profile.chaosAdaptability;
    }
  } else if (tile.type === 'UTILITY') {
    effectiveRent = (ownedBySelf >= 1 ? 10 : 4) * 7;
    if ((state.chaosModifiers?.utilityBoomTurns || 0) > 0) {
      effectiveRent *= 1.4 * profile.chaosAdaptability;
    }
  } else {
    if (completesOwnMonopoly) {
      // Factor in potential 1★-2★ building rent if player has capital
      const potentialRent =
        player.cash >= basePrice + currentUpgradeCost * 2
          ? tile.property.houseRent[1] || baseRent * 3
          : baseRent * 2;
      effectiveRent = potentialRent;
    } else if (ownedBySelf > 0) {
      effectiveRent = baseRent * 1.45;
    }

    if (
      (state.chaosModifiers?.districtBoomTurns || 0) > 0 &&
      (districtColor === 'district-green' || districtColor === 'district-darkblue')
    ) {
      effectiveRent *= 1.35 * profile.chaosAdaptability;
    }
  }

  effectiveRent *= rentMultiplier(state, completesOwnMonopoly ? 2 : 0, tile.type);

  const expectedRentPerRound = expectedLandingsPerRound * effectiveRent;
  const horizonRounds = Math.min(remainingRounds, 22);
  let intrinsicValue = basePrice * 0.65 + expectedRentPerRound * horizonRounds;

  // Synergy & Monopoly Completion multipliers
  if (completesOwnMonopoly) {
    intrinsicValue *= 1.65;
  } else if (ownedBySelf > 0) {
    intrinsicValue *= 1.25;
  }

  // Opponent Blocking multiplier (only active when opponent modeling is enabled or NORMAL/HARD)
  if (blocksOpponentMonopoly && diff.enableOpponentModeling) {
    intrinsicValue *= profile.monopolyBlockWeight;
  }

  // Personality District Preference
  if (profile.preferredDistricts.includes(districtColor)) {
    intrinsicValue *= 1.18;
  }

  // Easy difficulty dampens strategic foresight and ignores district synergy / monopoly potential
  if (diff.id === 'EASY') {
    intrinsicValue = basePrice * 0.72;
  } else if (diff.id === 'HARD') {
    intrinsicValue *= 1.12;
  }

  const roundedIntrinsic = Math.max(10, Math.round(intrinsicValue));
  const strategicScore = Number((roundedIntrinsic / Math.max(1, basePrice)).toFixed(2));

  return {
    tileId,
    basePrice,
    intrinsicValue: roundedIntrinsic,
    completesOwnMonopoly,
    blocksOpponentMonopoly,
    blockedOpponentId,
    expectedRentPerRound: Math.round(expectedRentPerRound),
    strategicScore,
  };
}

/**
 * Ranks all players by Net Worth to support leader-targeting and alliance heuristics.
 */
export function getNetWorthStandings(state: GameState): {
  playerId: PlayerId;
  netWorth: number;
  rank: number; // 1 = Leader
}[] {
  const scored = state.players
    .filter(p => !p.isBankrupt)
    .map(p => ({
      playerId: p.id,
      netWorth: calculatePlayerNetWorth(p, state.properties, state.chaosModifiers, state.roundNumber, state),
    }))
    .sort((a, b) => b.netWorth - a.netWorth);

  return scored.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Checks whether a player is strategic in Detention (late game with high board danger)
 * vs early game when acquiring unowned properties is critical.
 */
export function shouldEscapeDetentionImmediately(
  state: GameState,
  player: PlayerState
): { shouldEscape: boolean; reasonVi: string } {
  const unownedCount = Object.values(state.properties).filter(
    p => p.ownerId === null
  ).length;
  const profile = getAIPersonalityProfile(player.aiPersonality);
  const diff = getAIDifficultyConfig(player.aiDifficulty);

  // Early/Mid game: many unowned properties -> escape immediately to acquire land!
  if (unownedCount >= 6 || profile.id === 'TYCOON' || profile.id === 'CHAOTIC') {
    return {
      shouldEscape: true,
      reasonVi: `Còn ${unownedCount} lô đất trống trên bàn cờ, ưu tiên thoát giam sớm để chiếm đất.`,
    };
  }

  // Late game on HARD/NORMAL: if board has high rent danger and player is SURVIVOR/STRATEGIST, stay in detention!
  if (diff.lookaheadDepth >= 1 && (profile.id === 'SURVIVOR' || profile.id === 'STRATEGIST')) {
    const maxedOutDistricts = new Set<string>();
    for (const opp of state.players) {
      if (opp.id === player.id || opp.isBankrupt) continue;
      for (const tile of BOARD_TILES) {
        if (
          tile.property &&
          tile.property.districtColor !== 'district-transport' &&
          tile.property.districtColor !== 'district-utility' &&
          hasDistrictMonopoly(tile.property.districtColor, opp.id, state.properties)
        ) {
          maxedOutDistricts.add(tile.property.districtColor);
        }
      }
    }
    if (maxedOutDistricts.size >= 2) {
      return {
        shouldEscape: false,
        reasonVi: `Bàn cờ có nhiều khu độc quyền nguy hiểm của đối thủ, tạm trú trong Khu Cách Ly để bảo toàn vốn.`,
      };
    }
  }

  return {
    shouldEscape: true,
    reasonVi: `Chủ động nộp bảo lãnh/dùng thẻ để tiếp tục chu kỳ kinh doanh.`,
  };
}
