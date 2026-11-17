import { formatMoney } from '../../utils/money';
import {
  GameState,
  PlayerState,
  TileId,
  TradeProposal,
} from '../types';
import { getTileById, getTilesInDistrict } from '../property/propertyEngine';
import { validateTradeProposal } from '../trade/tradeEngine';
import { getAIDifficultyConfig, getAIPersonalityProfile } from './aiPersonalities';
import {
  calculateRequiredSafetyReserve,
  evaluatePropertyForPlayer,
  getNetWorthStandings,
} from './aiValuation';

export interface TradeEvaluationDecision {
  decision: 'ACCEPT' | 'REJECT' | 'COUNTER';
  netUtilityForTarget: number;
  netUtilityForSender: number;
  reasonVi: string;
  counterProposal?: Omit<TradeProposal, 'id' | 'status' | 'createdAt'>;
}

/**
 * Evaluates an incoming TradeProposal from the perspective of the target AI player.
 * Inspects:
 * - Intrinsic value of offered vs requested properties
 * - Whether the trade hands the sender a new District Monopoly
 * - Whether the trade completes a District Monopoly for the target AI
 * - Cash safety reserve after paying requestedCash
 * - Standings awareness (avoiding feeding the match leader unless heavily compensated)
 */
export function evaluateIncomingTradeForAI(
  state: GameState,
  targetAI: PlayerState,
  trade: TradeProposal
): TradeEvaluationDecision {
  const validation = validateTradeProposal(state, trade);
  if (!validation.valid) {
    return {
      decision: 'REJECT',
      netUtilityForTarget: -999,
      netUtilityForSender: 0,
      reasonVi: `Hợp đồng không hợp lệ: ${validation.reason}`,
    };
  }

  const sender = state.players.find(p => p.id === trade.senderPlayerId);
  if (!sender || sender.isBankrupt) {
    return {
      decision: 'REJECT',
      netUtilityForTarget: -999,
      netUtilityForSender: 0,
      reasonVi: 'Đối tác giao dịch không hợp lệ.',
    };
  }

  const profile = getAIPersonalityProfile(targetAI.aiPersonality);
  const diff = getAIDifficultyConfig(targetAI.aiDifficulty);
  const safetyReserve = calculateRequiredSafetyReserve(state, targetAI);

  // 1. Check post-trade liquidity risk for target AI
  const cashAfterTrade = targetAI.cash - trade.requestedCash + trade.offeredCash;
  if (trade.requestedCash > 0 && cashAfterTrade < safetyReserve * 0.75) {
    return {
      decision: 'REJECT',
      netUtilityForTarget: -500,
      netUtilityForSender: 0,
      reasonVi: `${targetAI.name} từ chối vì chi trả ${formatMoney(trade.requestedCash)} sẽ làm thủng quỹ dự phòng an toàn (${formatMoney(safetyReserve)}).`,
    };
  }

  // 2. Compute value received by Target AI
  let valueReceivedByTarget = trade.offeredCash + trade.offeredJailCards * 75;
  let targetGainsMonopoly = false;

  for (const propId of trade.offeredPropertyIds) {
    const val = evaluatePropertyForPlayer(
      state,
      targetAI,
      propId,
      targetAI.aiPersonality,
      targetAI.aiDifficulty
    );
    valueReceivedByTarget += val.intrinsicValue;
    if (val.completesOwnMonopoly) {
      targetGainsMonopoly = true;
    }
  }

  // 3. Compute value given up by Target AI
  let valueGivenByTarget = trade.requestedCash + trade.requestedJailCards * 75;
  let senderGainsMonopoly = false;

  for (const propId of trade.requestedPropertyIds) {
    const valForTarget = evaluatePropertyForPlayer(
      state,
      targetAI,
      propId,
      targetAI.aiPersonality,
      targetAI.aiDifficulty
    );
    const valForSender = evaluatePropertyForPlayer(
      state,
      sender,
      propId,
      'STRATEGIST',
      'HARD'
    );
    valueGivenByTarget += valForTarget.intrinsicValue;
    if (valForSender.completesOwnMonopoly) {
      senderGainsMonopoly = true;
    }
  }

  // 4. Monopoly & Leader Danger Penalties (Opponent Modeling)
  const standings = getNetWorthStandings(state);
  const senderRank = standings.find(s => s.playerId === sender.id)?.rank || 2;
  const targetRank = standings.find(s => s.playerId === targetAI.id)?.rank || 2;

  if (diff.enableOpponentModeling && senderGainsMonopoly && !targetGainsMonopoly) {
    // Handing an opponent a monopoly without getting one back requires a significant premium
    const monopolyPenalty = diff.id === 'HARD' ? 180 : 110;
    valueGivenByTarget += monopolyPenalty;
  }

  if (diff.enableOpponentModeling && senderRank === 1 && targetRank > 1) {
    // Reluctant to help the #1 leader unless Diplomat/Chaotic or heavily paid
    const leaderPenalty = profile.id === 'SHARK' || profile.id === 'STRATEGIST' ? 70 : 35;
    valueGivenByTarget += leaderPenalty;
  }

  const netUtilityForTarget = Math.round(valueReceivedByTarget - valueGivenByTarget);
  const baselineScale = Math.max(100, valueGivenByTarget);
  const relativeSurplus = netUtilityForTarget / baselineScale;

  // Compute sender utility estimate
  const netUtilityForSender = Math.round(valueGivenByTarget - valueReceivedByTarget);

  if (relativeSurplus >= profile.tradeFairnessTolerance) {
    return {
      decision: 'ACCEPT',
      netUtilityForTarget,
      netUtilityForSender,
      reasonVi: `${targetAI.name} (${profile.titleVi}) đồng ý thương vụ (Lợi ích ròng ước tính: +${formatMoney(netUtilityForTarget)}).`,
    };
  }

  // 5. Smart Counteroffer Generation (if enabled and deficit is bridgeable via cash)
  if (
    diff.enableSmartNegotiation &&
    netUtilityForTarget < 0 &&
    netUtilityForTarget >= -260 &&
    (trade.offeredPropertyIds.length > 0 || trade.requestedPropertyIds.length > 0)
  ) {
    const requiredExtraCash = Math.ceil((Math.abs(netUtilityForTarget) + 30) / 10) * 10;
    const newRequestedFromSender = trade.offeredCash + requiredExtraCash;

    if (sender.cash >= newRequestedFromSender && trade.requestedCash === 0) {
      // One-time adjustment in the original orientation: only the cash the proposer pays changes.
      const counterProposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'> = {
        senderPlayerId: trade.senderPlayerId,
        targetPlayerId: trade.targetPlayerId,
        offeredCash: newRequestedFromSender,
        offeredPropertyIds: trade.offeredPropertyIds,
        offeredJailCards: trade.offeredJailCards,
        requestedCash: trade.requestedCash,
        requestedPropertyIds: trade.requestedPropertyIds,
        requestedJailCards: trade.requestedJailCards,
      };

      if (validateTradeProposal(state, counterProposal).valid) {
        return {
          decision: 'COUNTER',
          netUtilityForTarget,
          netUtilityForSender,
          counterProposal,
          reasonVi: `${targetAI.name} (${profile.titleVi}) đề xuất phảnồi: yêu cầu nâng mức tiền bù lên ${formatMoney(newRequestedFromSender)}.`,
        };
      }
    }
  }

  return {
    decision: 'REJECT',
    netUtilityForTarget,
    netUtilityForSender,
    reasonVi: `${targetAI.name} (${profile.titleVi}) từ chối vì giá trị trao đổi bất lợi (${netUtilityForTarget}M).`,
  };
}

/**
 * Generates an outbound strategic trade proposal for the active AI player if a
 * high-value opportunity exists (e.g., acquiring the final piece of a color district
 * or executing a mutually beneficial swap).
 */
export function generateOutboundTradeForAI(
  state: GameState,
  aiPlayer: PlayerState
): {
  proposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'>;
  reasonVi: string;
} | null {
  if (state.activeTrade) return null;

  const profile = getAIPersonalityProfile(aiPlayer.aiPersonality);
  const diff = getAIDifficultyConfig(aiPlayer.aiDifficulty);
  const safetyReserve = calculateRequiredSafetyReserve(state, aiPlayer);

  // Easy AI rarely initiates complex trades
  if (diff.id === 'EASY' && profile.id !== 'DIPLOMAT' && profile.id !== 'SHARK') {
    return null;
  }

  const isTradable = (tileId: TileId): boolean => {
    const tile = getTileById(tileId);
    if (!tile || !tile.property) return false;
    const districtTiles = getTilesInDistrict(tile.property.districtColor);
    return !districtTiles.some(t => (state.properties[t.id]?.level ?? 0) > 0);
  };

  // Find all properties owned by AI that are isolated (1 of N in district) and tradable
  const aiOwnedIds = Object.keys(state.properties)
    .map(Number)
    .filter(tid => state.properties[tid]?.ownerId === aiPlayer.id && isTradable(tid));

  const aiSparePropertyIds = aiOwnedIds.filter(tid => {
    const tile = getTileById(tid);
    if (!tile?.property) return false;
    const siblings = getTilesInDistrict(tile.property.districtColor);
    const ownedCount = siblings.filter(t => state.properties[t.id]?.ownerId === aiPlayer.id).length;
    return ownedCount === 1 && siblings.length >= 2;
  });

  // Look for a missing property owned by an opponent that would complete or advance AI's district
  for (const tidStr of Object.keys(state.properties)) {
    const targetTileId = Number(tidStr);
    const ownership = state.properties[targetTileId];
    if (!ownership || !ownership.ownerId || ownership.ownerId === aiPlayer.id) continue;
    if (!isTradable(targetTileId)) continue;

    const owner = state.players.find(p => p.id === ownership.ownerId);
    if (!owner || owner.isBankrupt) continue;

    const tile = getTileById(targetTileId);
    if (!tile || !tile.property) continue;

    const districtTiles = getTilesInDistrict(tile.property.districtColor);
    const aiOwnedInDistrict = districtTiles.filter(
      t => state.properties[t.id]?.ownerId === aiPlayer.id
    ).length;

    // Focus on completing a district where AI already owns at least 1 property
    if (aiOwnedInDistrict === 0) continue;

    const valuation = evaluatePropertyForPlayer(
      state,
      aiPlayer,
      targetTileId,
      aiPlayer.aiPersonality,
      aiPlayer.aiDifficulty
    );

    // Strategy A: Property-for-Property (+ optional cash balancer) if AI has a spare property the opponent might like
    const matchingSpare = aiSparePropertyIds.find(spareId => {
      const spareTile = getTileById(spareId);
      if (!spareTile?.property) return false;
      const oppSiblings = getTilesInDistrict(spareTile.property.districtColor);
      const oppOwnedCount = oppSiblings.filter(
        t => state.properties[t.id]?.ownerId === owner.id
      ).length;
      return oppOwnedCount >= 1 || profile.id === 'DIPLOMAT';
    });

    if (matchingSpare !== undefined) {
      const spareTile = getTileById(matchingSpare)!;
      const priceDiff = (tile.property.basePrice || 100) - (spareTile.property?.basePrice || 100);
      const offeredCash =
        priceDiff > 0 && aiPlayer.cash - priceDiff >= safetyReserve
          ? Math.max(0, Math.round(priceDiff))
          : 0;

      const proposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'> = {
        senderPlayerId: aiPlayer.id,
        targetPlayerId: owner.id,
        offeredCash,
        offeredPropertyIds: [matchingSpare],
        offeredJailCards: 0,
        requestedCash: 0,
        requestedPropertyIds: [targetTileId],
        requestedJailCards: 0,
      };

      if (validateTradeProposal(state, proposal).valid) {
        return {
          proposal,
          reasonVi: `${aiPlayer.name} (${profile.titleVi}) đề nghị đổi [${spareTile.shortName}]${
            offeredCash > 0 ? ` + ${formatMoney(offeredCash)}` : ''
          } lấy [${tile.shortName}] của ${owner.name} để gom nhóm phân khu.`,
        };
      }
    }

    // Strategy B: Cash-for-Property offer (especially if opponent is low on cash or AI is Tycoon/Shark/Strategist)
    const disposableCash = aiPlayer.cash - safetyReserve;
    const basePrice = tile.property.basePrice;
    const isOwnerDistressed = owner.cash < 180;
    const offerMultiple =
      isOwnerDistressed && profile.id === 'SHARK'
        ? 0.95
        : valuation.completesOwnMonopoly
        ? 1.3
        : 1.15;

    const cashOffer = Math.round((basePrice * offerMultiple) / 10) * 10;

    if (disposableCash >= cashOffer && cashOffer >= 40) {
      const proposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'> = {
        senderPlayerId: aiPlayer.id,
        targetPlayerId: owner.id,
        offeredCash: cashOffer,
        offeredPropertyIds: [],
        offeredJailCards: 0,
        requestedCash: 0,
        requestedPropertyIds: [targetTileId],
        requestedJailCards: 0,
      };

      if (validateTradeProposal(state, proposal).valid) {
        // If Opponent Modeling is enabled (NORMAL/HARD), simulate whether the target will likely accept
        // or adjust cashOffer up to disposable ceiling so we only send viable or strategically sound offers
        if (diff.enableOpponentModeling) {
          const preview = evaluateIncomingTradeForAI(state, owner, {
            ...proposal,
            id: 'preview',
            status: 'PENDING',
            createdAt: 0,
          });
          if (preview.decision === 'REJECT') {
            continue;
          }
        }

        return {
          proposal,
          reasonVi: `${aiPlayer.name} (${profile.titleVi}) đề nghị mua lại [${tile.shortName}] từ ${owner.name} với giá ${formatMoney(cashOffer)}.`,
        };
      }
    }
  }

  return null;
}
