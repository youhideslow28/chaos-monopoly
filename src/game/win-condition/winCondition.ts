import { PlayerState, PropertyOwnership, TileId } from '../types';
import { calculatePlayerNetWorth } from '../economy/economyEngine';
import { WorldEconomyContext } from '../property/propertyEngine';

export interface WinEvaluationResult {
  isGameOver: boolean;
  winner: PlayerState | null;
  reason: 'LAST_MAN_STANDING' | 'MAX_ROUNDS_REACHED' | 'SURRENDER' | null;
}

export function evaluateWinCondition(
  players: PlayerState[],
  properties: Record<TileId, PropertyOwnership>,
  currentRound: number,
  maxRounds: number = 0,
  world?: WorldEconomyContext
): WinEvaluationResult {
  const activePlayers = players.filter(p => !p.isBankrupt);

  // If only 1 player remains solvent
  if (activePlayers.length === 1 && players.length > 1) {
    return {
      isGameOver: true,
      winner: activePlayers[0],
      reason: 'LAST_MAN_STANDING',
    };
  }

  // If 0 players remain solvent (catastrophic mass bankruptcy)
  if (activePlayers.length === 0) {
    return {
      isGameOver: true,
      winner: null,
      reason: 'LAST_MAN_STANDING',
    };
  }

  // Round cap only applies when set (0 = no limit: the match ends on bankruptcy)
  if (maxRounds > 0 && currentRound >= maxRounds) {
    let topPlayer = activePlayers[0];
    let topWorth = calculatePlayerNetWorth(topPlayer, properties, undefined, currentRound, world);

    for (let i = 1; i < activePlayers.length; i++) {
      const p = activePlayers[i];
      const worth = calculatePlayerNetWorth(p, properties, undefined, currentRound, world);
      if (worth > topWorth || (worth === topWorth && p.cash > topPlayer.cash)) {
        topPlayer = p;
        topWorth = worth;
      }
    }

    return {
      isGameOver: true,
      winner: topPlayer,
      reason: 'MAX_ROUNDS_REACHED',
    };
  }

  return {
    isGameOver: false,
    winner: null,
    reason: null,
  };
}
