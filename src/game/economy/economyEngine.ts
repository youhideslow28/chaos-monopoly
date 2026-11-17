import { ChaosModifiers, PlayerId, PlayerState, PropertyOwnership, TileId } from '../types';
import {
  getLandSellValue,
  getMarketLandValue,
  getMortgageValue,
  getTileById,
  getUpgradeCost,
  WorldEconomyContext,
} from '../property/propertyEngine';
import { sellRate } from '../world-rules/worldRules';

export function calculatePlayerNetWorth(
  player: PlayerState,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers,
  roundNumber?: number,
  world?: WorldEconomyContext
): number {
  if (player.isBankrupt) return 0;

  let totalPropertyVal = 0;
  let totalMortgageDebt = 0;

  for (const [tileIdStr, ownership] of Object.entries(properties)) {
    if (ownership.ownerId === player.id) {
      const tileId = Number(tileIdStr);
      const tile = getTileById(tileId);
      if (tile && tile.property) {
        const base = getMarketLandValue(tileId, roundNumber, world);
        const upgradeVal = ownership.level * getUpgradeCost(tileId, roundNumber, world);
        totalPropertyVal += base + upgradeVal;

        if (ownership.isMortgaged) {
          totalMortgageDebt += getMortgageValue(tileId, modifiers, world, roundNumber);
        }
      }
    }
  }

  return Math.max(0, player.cash + totalPropertyVal - totalMortgageDebt);
}

export function executeCashTransaction(
  player: PlayerState,
  amount: number
): {
  updatedPlayer: PlayerState;
  isSolvent: boolean;
} {
  const newCash = player.cash + amount;
  return {
    updatedPlayer: {
      ...player,
      cash: newCash,
    },
    isSolvent: newCash >= 0,
  };
}

export function transferCash(
  fromPlayer: PlayerState,
  toPlayer: PlayerState,
  amount: number
): {
  fromPlayerUpdated: PlayerState;
  toPlayerUpdated: PlayerState;
  actualPaid: number;
} {
  const actualPaid = Math.min(fromPlayer.cash, amount);
  return {
    fromPlayerUpdated: {
      ...fromPlayer,
      cash: Math.max(0, fromPlayer.cash - amount),
      stats: {
        ...fromPlayer.stats,
        rentPaid: fromPlayer.stats.rentPaid + actualPaid,
      },
    },
    toPlayerUpdated: {
      ...toPlayer,
      cash: toPlayer.cash + actualPaid,
      stats: {
        ...toPlayer.stats,
        rentCollected: toPlayer.stats.rentCollected + actualPaid,
      },
    },
    actualPaid,
  };
}

export function calculateMaxLiquidationValue(
  player: PlayerState,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers,
  roundNumber?: number,
  world?: WorldEconomyContext
): number {
  if (player.isBankrupt) return 0;

  let liquidationCash = player.cash;
  const worldSellRate = sellRate(world);

  for (const [tileIdStr, ownership] of Object.entries(properties)) {
    if (ownership.ownerId === player.id) {
      const tileId = Number(tileIdStr);
      const tile = getTileById(tileId);
      if (tile && tile.property) {
        // Value from selling existing buildings (current market upgrade cost * world sellRate)
        if (ownership.level > 0) {
          liquidationCash +=
            ownership.level * Math.round(getUpgradeCost(tileId, roundNumber, world) * worldSellRate);
        }
        // Value from selling land to Bank or mortgaging (higher of the two if unmortgaged; net equity if mortgaged)
        const sellVal = getLandSellValue(tileId, properties, roundNumber, world, modifiers);
        if (!ownership.isMortgaged) {
          const mortVal = getMortgageValue(tileId, modifiers, world, roundNumber);
          liquidationCash += Math.max(mortVal, sellVal);
        } else {
          liquidationCash += sellVal;
        }
      }
    }
  }

  return liquidationCash;
}

export function liquidateBankruptPlayer(
  bankruptPlayerId: PlayerId,
  properties: Record<TileId, PropertyOwnership>,
  creditorPlayerId?: PlayerId | null
): Record<TileId, PropertyOwnership> {
  const updatedProperties = { ...properties };

  for (const [tileIdStr, ownership] of Object.entries(updatedProperties)) {
    if (ownership.ownerId === bankruptPlayerId) {
      const tileId = Number(tileIdStr);
      if (creditorPlayerId) {
        // Transfer to creditor with mortgage status retained
        updatedProperties[tileId] = {
          ...ownership,
          ownerId: creditorPlayerId,
        };
      } else {
        // Return to bank: unowned, unimproved, cleared mortgage
        updatedProperties[tileId] = {
          ownerId: null,
          level: 0,
          isMortgaged: false,
        };
      }
    }
  }

  return updatedProperties;
}
