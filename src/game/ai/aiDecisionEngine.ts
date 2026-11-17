import { formatMoney } from '../../utils/money';
import {
  AIDecisionReason,
  GameAction,
  GameState,
  PlayerState,
} from '../types';
import {
  canBuyProperty,
  canDowngradeProperty,
  canMortgageProperty,
  canSellProperty,
  canUnmortgageProperty,
  canUpgradeProperty,
  getBuyPrice,
  getUpgradeCost,
  getTileById,
} from '../property/propertyEngine';
import { MIN_BID_INCREMENT } from '../auction/auctionEngine';
import { getTradeResponderId } from '../trade/tradeEngine';
import { getAIDifficultyConfig, getAIPersonalityProfile } from './aiPersonalities';
import {
  calculateRequiredSafetyReserve,
  evaluatePropertyForPlayer,
  shouldEscapeDetentionImmediately,
} from './aiValuation';
import {
  evaluateIncomingTradeForAI,
  generateOutboundTradeForAI,
} from './aiNegotiationEngine';
import type { BoardNode, SpatialBoardGraph } from '../graph/spatialGraphTypes';
import type { ChaosPhase } from '../chaos-engine/chaosMeter';
import type { BusinessDefinition } from '../business/businessTypes';
import { BUSINESS_CATALOG } from '../business/businessCatalog';
import { canPlaceTrap } from '../chaos-engine/trapEngine';
import { getAdjacentNodeIds } from '../business/businessSynergyEngine';

export interface AIDecisionOutput {
  action: GameAction;
  reason: AIDecisionReason;
}

/**
 * Evaluates branch utility at a 3D spatial graph intersection:
 * U = V_reward - alpha_risk * H_hazard - C_toll
 */
export function evaluateAIBranchChoice(options: {
  branches: BoardNode[];
  playerCash: number;
  opponentProperties: Record<string, number>; // nodeId -> rent
  trapsOnNodes: Record<string, boolean>;
  riskTolerance: number; // 0.0 to 1.0 (Survivor = 0.2, Tycoon = 0.8)
}): { chosenNodeId: string; utilities: Record<string, number> } {
  const { branches, opponentProperties, trapsOnNodes, riskTolerance } = options;
  const utilities: Record<string, number> = {};

  let bestNodeId = branches[0]?.id ?? '';
  let highestUtility = -Infinity;

  for (const node of branches) {
    const reward = node.property?.baseRent ?? 20;
    const opponentRent = opponentProperties[node.id] ?? 0;
    const hasTrap = trapsOnNodes[node.id] ? 100 : 0;
    const hazard = opponentRent + hasTrap;
    const toll = node.type === 'TRANSPORT' ? 50 : 0;

    // U = V_reward - alpha_risk * H_hazard - C_toll
    const alphaRisk = 1.2 - riskTolerance;
    const utility = reward - alphaRisk * hazard - toll;

    utilities[node.id] = Math.round(utility * 100) / 100;

    if (utility > highestUtility) {
      highestUtility = utility;
      bestNodeId = node.id;
    }
  }

  return { chosenNodeId: bestNodeId, utilities };
}

/**
 * Ranks available graph nodes by choke-point value (elevators, stairwells, intersections).
 */
export function evaluateAIChokePointTrap(
  graph: SpatialBoardGraph,
  availableNodeIds: string[]
): string {
  let bestNodeId = availableNodeIds[0] ?? '';
  let maxScore = -1;

  for (const nodeId of availableNodeIds) {
    const node = graph.nodes[nodeId];
    if (!node) continue;

    let score = 0;
    if (node.id.includes('ELEV') || node.type === 'TRANSPORT') score += 50;
    if (node.id.includes('STAIR')) score += 40;
    if (node.isIntersection) score += 30;
    score += node.connectedNodeIds.length * 5;

    if (score > maxScore) {
      maxScore = score;
      bestNodeId = nodeId;
    }
  }

  return bestNodeId;
}

/**
 * Selects optimal business archetype based on current Chaos phase and adjacent businesses.
 */
export function evaluateAIAdaptiveBusiness(
  chaosPhase: ChaosPhase,
  adjacentBusinesses: BusinessDefinition[]
): BusinessDefinition {
  // Under Peace, maximize high-rent Nightlife/Casino
  if (chaosPhase === 'PEACEFUL') {
    return BUSINESS_CATALOG['underground_casino'];
  }
  // Under Instability, prefer essential services or defensive civic counter
  if (chaosPhase === 'INSTABILITY') {
    const hasCasino = adjacentBusinesses.some(b => b.id === 'underground_casino');
    return hasCasino ? BUSINESS_CATALOG['police_checkpoint'] : BUSINESS_CATALOG['clinic_pharmacy'];
  }
  // Under Chaos, prefer high density survivability or Security HQ
  return BUSINESS_CATALOG['security_hq'];
}

/**
 * Determines which player (if any) is currently responsible for making an AI decision.
 * Handles:
 * 1. Pending Trade Proposal where targetPlayerId is an AI player.
 * 2. Active Public Auction where currentTurnBidderId is an AI player.
 * 3. Active Turn where state.players[state.activePlayerIndex] is an AI player.
 */
export function getActiveAIActor(state: GameState): PlayerState | null {
  if (state.status !== 'PLAYING' || state.turnPhase === 'GAME_OVER') {
    return null;
  }

  // 1. If a trade is pending and the target player is an AI, that AI must respond!
  if (state.activeTrade && state.activeTrade.status === 'PENDING') {
    const target = state.players.find(p => p.id === getTradeResponderId(state.activeTrade!));
    if (target && target.isAI && !target.isBankrupt) {
      return target;
    }
    return null;
  }

  // 2. If an auction is active and the current bidder is an AI, that AI must bid or pass!
  if (
    state.turnPhase === 'AUCTION' &&
    state.activeAuction &&
    state.activeAuction.status === 'ACTIVE'
  ) {
    const bidder = state.players.find(
      p => p.id === state.activeAuction?.currentTurnBidderId
    );
    if (bidder && bidder.isAI && !bidder.isBankrupt) {
      return bidder;
    }
    return null;
  }

  // 3. Otherwise, check if the current turn's active player is an AI
  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer && activePlayer.isAI && !activePlayer.isBankrupt) {
    return activePlayer;
  }

  return null;
}

/**
 * Pure, deterministic strategic decision function for any AI player.
 * Returns a single validated GameAction and an explainable Vietnamese reason.
 * Never mutates GameState or bypasses the economy ledger.
 */
export function computeNextAIDecision(
  state: GameState,
  aiActionStepCount: number = 0
): AIDecisionOutput | null {
  const actor = getActiveAIActor(state);
  if (!actor) return null;

  const profile = getAIPersonalityProfile(actor.aiPersonality);
  const diff = getAIDifficultyConfig(actor.aiDifficulty);

  const makeReason = (
    actionType: string,
    summaryVi: string,
    score?: number
  ): AIDecisionReason => ({
    playerId: actor.id,
    playerName: actor.name,
    personality: profile.id,
    difficulty: diff.id,
    actionType,
    summaryVi,
    score,
    timestamp: Date.now(),
  });

  // =========================================================================
  // CASE 1: RESPOND TO INCOMING TRADE PROPOSAL
  // =========================================================================
  if (
    state.activeTrade &&
    state.activeTrade.status === 'PENDING' &&
    getTradeResponderId(state.activeTrade) === actor.id
  ) {
    const trade = state.activeTrade;

    // After the other side's single adjustment, the AI proposer only accepts a small cash cost.
    if (trade.countered) {
      const cashCost = trade.offeredCash - trade.requestedCash;
      const accept = cashCost <= 150 && actor.cash >= trade.offeredCash;
      return {
        action: accept
          ? { type: 'ACCEPT_TRADE', tradeId: trade.id, senderPlayerId: actor.id }
          : { type: 'REJECT_TRADE', tradeId: trade.id, senderPlayerId: actor.id },
        reason: makeReason(
          accept ? 'ACCEPT_TRADE' : 'REJECT_TRADE',
          accept
            ? `${actor.name} đồng ý với điều chỉnh tiền (chi phí ròng ${formatMoney(cashCost)}).`
            : `${actor.name} từ chối điều chỉnh tiền (chi phí ròng ${formatMoney(cashCost)} quá cao).`,
          0
        ),
      };
    }

    const evalResult = evaluateIncomingTradeForAI(state, actor, trade);

    if (evalResult.decision === 'ACCEPT') {
      return {
        action: {
          type: 'ACCEPT_TRADE',
          tradeId: trade.id,
          senderPlayerId: actor.id,
        },
        reason: makeReason('ACCEPT_TRADE', evalResult.reasonVi, evalResult.netUtilityForTarget),
      };
    }

    if (evalResult.decision === 'COUNTER' && evalResult.counterProposal && aiActionStepCount < 2) {
      return {
        action: {
          type: 'COUNTER_TRADE',
          proposal: evalResult.counterProposal,
          senderPlayerId: actor.id,
        },
        reason: makeReason('COUNTER_TRADE', evalResult.reasonVi, evalResult.netUtilityForTarget),
      };
    }

    return {
      action: {
        type: 'REJECT_TRADE',
        tradeId: trade.id,
        senderPlayerId: actor.id,
      },
      reason: makeReason('REJECT_TRADE', evalResult.reasonVi, evalResult.netUtilityForTarget),
    };
  }

  // =========================================================================
  // CASE 2: PARTICIPATE IN ACTIVE PUBLIC AUCTION
  // =========================================================================
  if (
    state.turnPhase === 'AUCTION' &&
    state.activeAuction &&
    state.activeAuction.status === 'ACTIVE' &&
    state.activeAuction.currentTurnBidderId === actor.id
  ) {
    const auction = state.activeAuction;
    const minNextBid =
      auction.highestBidderId === null
        ? auction.openingBid
        : auction.highestBid + MIN_BID_INCREMENT;

    if (actor.cash < minNextBid) {
      return {
        action: {
          type: 'PASS_AUCTION_BID',
          playerId: actor.id,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'PASS_AUCTION_BID',
          `${actor.name} bỏ lượt đấu giá vì không đủ tiền mặt đặt mức tối thiểu ${formatMoney(minNextBid)}.`
        ),
      };
    }

    const valuation = evaluatePropertyForPlayer(
      state,
      actor,
      auction.propertyId,
      profile.id,
      diff.id
    );
    const safetyReserve = calculateRequiredSafetyReserve(state, actor, profile.id, diff.id);
    const maxAffordableBid = Math.max(0, actor.cash - Math.round(safetyReserve * 0.6));

    // Calculate ceiling bid based on intrinsic value & personality auction appetite
    const diffAuctionFactor = diff.id === 'EASY' ? 0.68 : diff.id === 'HARD' ? 1.04 : 1.0;
    let maxWillingBid = Math.round(
      Math.min(
        valuation.intrinsicValue * profile.auctionMaxMultiple * diffAuctionFactor,
        valuation.basePrice *
          profile.auctionMaxMultiple *
          diffAuctionFactor *
          (valuation.completesOwnMonopoly ? 1.35 : 1.0)
      )
    );

    // Shark / Hard AI drives up price if an opponent is about to get a monopoly cheaply
    if (valuation.blocksOpponentMonopoly && diff.enableOpponentModeling) {
      maxWillingBid = Math.max(
        maxWillingBid,
        Math.round(valuation.basePrice * profile.monopolyBlockWeight)
      );
    }

    const effectiveCeiling = Math.min(maxAffordableBid, maxWillingBid);

    if (minNextBid <= effectiveCeiling) {
      // Choose bid increment (Shark/Tycoon may jump +20M to intimidate; others bid minimum)
      const jump =
        (profile.id === 'SHARK' || profile.id === 'TYCOON') &&
        minNextBid + 10 <= effectiveCeiling
          ? 10
          : 0;
      const bidAmount = minNextBid + jump;

      const tile = getTileById(auction.propertyId);
      return {
        action: {
          type: 'PLACE_AUCTION_BID',
          playerId: actor.id,
          bidAmount,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'PLACE_AUCTION_BID',
          `${actor.name} (${profile.titleVi}) trả giá ${formatMoney(bidAmount)} cho [${
            tile?.shortName || auction.propertyId
          }] (Định giá nội tại: ${formatMoney(valuation.intrinsicValue)}).`,
          valuation.strategicScore
        ),
      };
    }

    return {
      action: {
        type: 'PASS_AUCTION_BID',
        playerId: actor.id,
        senderPlayerId: actor.id,
      },
      reason: makeReason(
        'PASS_AUCTION_BID',
        `${actor.name} (${profile.titleVi}) dừng trả giá tại ${formatMoney(minNextBid)} vì vượt ngưỡng an toàn (${formatMoney(effectiveCeiling)}).`,
        valuation.strategicScore
      ),
    };
  }

  // =========================================================================
  // CASE 3: RESOLVE ACTIVE CHAOS CARD MODAL
  // =========================================================================
  if (state.activeChaosCard) {
    return {
      action: {
        type: 'RESOLVE_CHAOS',
        senderPlayerId: actor.id,
      },
      reason: makeReason(
        'RESOLVE_CHAOS',
        `${actor.name} xác nhận hoàn tất hiệu ứng biến cố Chaos.`
      ),
    };
  }

  // =========================================================================
  // CASE 4: EMERGENCY DEBT LIQUIDATION & BANKRUPTCY CHECK
  // =========================================================================
  if (
    (state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION') &&
    state.pendingDebt
  ) {
    const debtAmount = state.pendingDebt.amount;

    // 4a. If AI already has enough cash to settle full debt, pay immediately!
    if (actor.cash >= debtAmount) {
      return {
        action: {
          type: 'RESOLVE_DEBT',
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'RESOLVE_DEBT',
          `${actor.name} thanh toán dứt điểm khoản nợ ${formatMoney(debtAmount)}.`
        ),
      };
    }

    const ownedTileIds = Object.keys(state.properties)
      .map(Number)
      .filter(tid => state.properties[tid]?.ownerId === actor.id);

    // 4b. Prefer mortgaging unbuilt non-monopoly properties first to preserve building income!
    const mortgageCandidates = ownedTileIds
      .filter(
        tid =>
          canMortgageProperty(tid, actor.id, state.properties, state.chaosModifiers, state, state.roundNumber).canMortgage
      )
      .sort((a, b) => {
        const valA = evaluatePropertyForPlayer(state, actor, a, profile.id, diff.id);
        const valB = evaluatePropertyForPlayer(state, actor, b, profile.id, diff.id);
        return valA.strategicScore - valB.strategicScore;
      });

    if (mortgageCandidates.length > 0) {
      const targetTileId = mortgageCandidates[0];
      const tile = getTileById(targetTileId);
      return {
        action: {
          type: 'MORTGAGE_PROPERTY',
          tileId: targetTileId,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'MORTGAGE_PROPERTY',
          `${actor.name} thế chấp khẩn cấp [${tile?.shortName || targetTileId}] để huy động tiền mặt trả nợ.`
        ),
      };
    }

    // 4c. Next, downgrade buildings starting from lowest strategic impact
    const downgradeCandidates = ownedTileIds.filter(
      tid => canDowngradeProperty(tid, actor.id, state.properties, state.roundNumber, state).canDowngrade
    );

    if (downgradeCandidates.length > 0) {
      const targetTileId = downgradeCandidates[0];
      const tile = getTileById(targetTileId);
      return {
        action: {
          type: 'DOWNGRADE_PROPERTY',
          tileId: targetTileId,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'DOWNGRADE_PROPERTY',
          `${actor.name} bán bớt 1 cấp công trình tại [${tile?.shortName || targetTileId}] để cứu thanh khoản.`
        ),
      };
    }

    // 4d. Next, sell vacant land back to the Bank (sorted by lowest strategic score) before bankruptcy
    const sellLandCandidates = ownedTileIds
      .filter(tid => {
        const check = canSellProperty(tid, actor.id, state.properties, state.chaosModifiers, state.roundNumber, state);
        return check.canSell && check.sellValue > 0;
      })
      .sort((a, b) => {
        const valA = evaluatePropertyForPlayer(state, actor, a, profile.id, diff.id);
        const valB = evaluatePropertyForPlayer(state, actor, b, profile.id, diff.id);
        return valA.strategicScore - valB.strategicScore;
      });

    if (sellLandCandidates.length > 0) {
      const targetTileId = sellLandCandidates[0];
      const tile = getTileById(targetTileId);
      return {
        action: {
          type: 'SELL_PROPERTY',
          tileId: targetTileId,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'SELL_PROPERTY',
          `${actor.name} bán lại ô đất [${tile?.shortName || targetTileId}] cho Ngân hàng để tránh phá sản.`
        ),
      };
    }

    // 4e. If AI has partial cash and still cannot raise more, pay partial first or declare bankruptcy
    if (actor.cash > 0) {
      return {
        action: {
          type: 'SETTLE_PARTIAL_DEBT',
          amount: actor.cash,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'SETTLE_PARTIAL_DEBT',
          `${actor.name} nộp toàn bộ ${formatMoney(actor.cash)} tiền mặt hiện có để giảm nợ.`
        ),
      };
    }

    return {
      action: {
        type: 'DECLARE_BANKRUPTCY',
        playerId: actor.id,
        senderPlayerId: actor.id,
      },
      reason: makeReason(
        'DECLARE_BANKRUPTCY',
        `${actor.name} đã cạn kiệt toàn bộ tài sản thanh khoản và buộc phải tuyên bố phá sản.`
      ),
    };
  }

  // =========================================================================
  // CASE 5: WAITING FOR ROLL (DETENTION ESCAPE OR ROLL DICE)
  // =========================================================================
  if (state.turnPhase === 'WAITING_FOR_ROLL') {
    if (actor.inDetention) {
      const escapeEval = shouldEscapeDetentionImmediately(state, actor);

      if (escapeEval.shouldEscape) {
        if ((actor.jailFreeCards || 0) > 0) {
          return {
            action: {
              type: 'USE_DETENTION_CARD',
              senderPlayerId: actor.id,
            },
            reason: makeReason('USE_DETENTION_CARD', `${actor.name}: ${escapeEval.reasonVi}`),
          };
        }

        const bailCost = state.config.detentionBailCost;
        const safetyReserve = calculateRequiredSafetyReserve(state, actor, profile.id, diff.id);
        if (actor.cash >= bailCost + safetyReserve * 0.6) {
          return {
            action: {
              type: 'PAY_DETENTION_BAIL',
              senderPlayerId: actor.id,
            },
            reason: makeReason('PAY_DETENTION_BAIL', `${actor.name}: ${escapeEval.reasonVi}`),
          };
        }
      }
    }

    return {
      action: {
        type: 'ROLL_DICE_START',
        senderPlayerId: actor.id,
      },
      reason: makeReason(
        'ROLL_DICE_START',
        `${actor.name} (${profile.titleVi}) tung xúc xắc bắt đầu lượt đi.`
      ),
    };
  }

  // =========================================================================
  // CASE 5.5: BRANCH DECISION AT 3D SPATIAL GRAPH INTERSECTIONS
  // =========================================================================
  if (state.turnPhase === 'BRANCH_DECISION' && state.movementState && state.spatialGraph) {
    const { availableNextNodes } = state.movementState;
    const graph = state.spatialGraph;
    const branches = availableNextNodes
      .map(nid => graph.nodes[nid])
      .filter((n): n is BoardNode => Boolean(n));

    if (branches.length > 0) {
      const opponentProperties: Record<string, number> = {};
      const trapsOnNodes: Record<string, boolean> = {};

      for (const node of branches) {
        const numId = node.numericId ?? -1;
        const propOwnership = numId >= 0 ? state.properties[numId] : undefined;
        if (propOwnership && propOwnership.ownerId && propOwnership.ownerId !== actor.id && !propOwnership.isMortgaged) {
          opponentProperties[node.id] = node.property?.baseRent ?? 40;
        }
        if (state.placedTraps?.some(t => t.nodeId === node.id && (t.revealed || t.ownerPlayerId === actor.id))) {
          trapsOnNodes[node.id] = true;
        }
      }

      const riskTolerance =
        profile.id === 'SURVIVOR'
          ? 0.2
          : profile.id === 'TYCOON' || profile.id === 'SHARK'
            ? 0.8
            : 0.5;

      const { chosenNodeId, utilities } = evaluateAIBranchChoice({
        branches,
        playerCash: actor.cash,
        opponentProperties,
        trapsOnNodes,
        riskTolerance,
      });

      const chosenNode = graph.nodes[chosenNodeId] || branches[0];
      return {
        action: {
          type: 'CHOOSE_BRANCH_PATH',
          targetNodeId: chosenNode.id,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'CHOOSE_BRANCH_PATH',
          `${actor.name} (${profile.titleVi}) chọn nhánh đi tới [${chosenNode.shortName || chosenNode.name}] (Điểm kỳ vọng: ${utilities[chosenNode.id] ?? 0}).`,
          utilities[chosenNode.id]
        ),
      };
    }
  }

  // =========================================================================
  // CASE 6: ACTION MENU (BUY, AUCTION, UPGRADE, UNMORTGAGE, TRADE, END TURN)
  // =========================================================================
  if (state.turnPhase === 'ACTION_MENU') {
    // Hard safety cap against excessive actions within a single turn
    if (aiActionStepCount >= 6) {
      return {
        action: {
          type: 'END_TURN',
          senderPlayerId: actor.id,
        },
        reason: makeReason('END_TURN', `${actor.name} kết thúc lượt sau khi hoàn tất điều phối tài sản.`),
      };
    }

    const currentTile = getTileById(actor.position);
    const safetyReserve = calculateRequiredSafetyReserve(state, actor, profile.id, diff.id);

    // 6a. Evaluate Unowned Property at Current Standing Position
    if (
      currentTile &&
      currentTile.property &&
      state.properties[currentTile.id]?.ownerId === null
    ) {
      const buyValidation = canBuyProperty(
        currentTile.id,
        actor.cash,
        state.properties,
        state.chaosModifiers,
        state.roundNumber,
        state
      );
      const valuation = evaluatePropertyForPlayer(
        state,
        actor,
        currentTile.id,
        profile.id,
        diff.id
      );

      if (buyValidation.canBuy) {
        const price = getBuyPrice(currentTile.id, state.roundNumber, state);
        const cashAfterBuy = actor.cash - price;
        // HARD converts cash into assets more readily; EASY/NORMAL keep the conservative reserve.
        const reserveRatio = diff.id === 'HARD' ? 0.45 : 0.7;
        const meetsReserve =
          cashAfterBuy >= safetyReserve * reserveRatio ||
          valuation.completesOwnMonopoly ||
          valuation.blocksOpponentMonopoly;

        const effectiveThreshold =
          diff.id === 'EASY'
            ? Math.max(0.76, profile.acquisitionThreshold + 0.35)
            : diff.id === 'HARD'
            ? profile.acquisitionThreshold * 0.78
            : profile.acquisitionThreshold;

        if (
          meetsReserve &&
          valuation.strategicScore >= effectiveThreshold
        ) {
          return {
            action: {
              type: 'BUY_PROPERTY',
              tileId: currentTile.id,
              senderPlayerId: actor.id,
            },
            reason: makeReason(
              'BUY_PROPERTY',
              `${actor.name} (${profile.titleVi}) mua [${currentTile.shortName}] giá ${formatMoney(price)} (Điểm chiến lược: ${valuation.strategicScore}x).`,
              valuation.strategicScore
            ),
          };
        }
      }

      // If AI declines direct purchase (or cannot afford full list price) and market is not frozen, trigger Public Auction!
      if ((state.chaosModifiers?.marketFrozenTurns || 0) === 0 && aiActionStepCount === 0) {
        return {
          action: {
            type: 'START_AUCTION',
            tileId: currentTile.id,
            senderPlayerId: actor.id,
          },
          reason: makeReason(
            'START_AUCTION',
            `${actor.name} (${profile.titleVi}) từ chối mua trực tiếp [${currentTile.shortName}] và mở phiên đấu giá công khai để tìm giá tốt hơn.`,
            valuation.strategicScore
          ),
        };
      }
    }

    // 6b. Proactive Liquidity Protection (Survivor / Strategist mortgages idle non-monopoly land if cash < safetyReserve * 0.5)
    if (
      (profile.id === 'SURVIVOR' || profile.id === 'STRATEGIST') &&
      actor.cash < safetyReserve * 0.5 &&
      aiActionStepCount < 3
    ) {
      const mortgageable = Object.keys(state.properties)
        .map(Number)
        .filter(
          tid =>
            state.properties[tid]?.ownerId === actor.id &&
            canMortgageProperty(tid, actor.id, state.properties, state.chaosModifiers, state, state.roundNumber).canMortgage
        );

      if (mortgageable.length > 0) {
        const tid = mortgageable[0];
        const tile = getTileById(tid);
        return {
          action: {
            type: 'MORTGAGE_PROPERTY',
            tileId: tid,
            senderPlayerId: actor.id,
          },
          reason: makeReason(
            'MORTGAGE_PROPERTY',
            `${actor.name} (${profile.titleVi}) chủ động thế chấp [${tile?.shortName || tid}] để củng cố quỹ dự phòng tiền mặt.`
          ),
        };
      }
    }

    // 6c. Unmortgage High-Value Properties when flush with cash (and no Interest Hike active)
    if ((state.chaosModifiers?.interestHikeTurns || 0) === 0 && aiActionStepCount < 4) {
      const mortgagedOwned = Object.keys(state.properties)
        .map(Number)
        .filter(tid => {
          const check = canUnmortgageProperty(
            tid,
            actor.id,
            actor.cash,
            state.properties,
            state.chaosModifiers,
            state,
            state.roundNumber
          );
          return check.canUnmortgage && actor.cash - check.unmortgageCost >= safetyReserve * 1.25;
        });

      if (mortgagedOwned.length > 0) {
        const tid = mortgagedOwned[0];
        const tile = getTileById(tid);
        return {
          action: {
            type: 'UNMORTGAGE_PROPERTY',
            tileId: tid,
            senderPlayerId: actor.id,
          },
          reason: makeReason(
            'UNMORTGAGE_PROPERTY',
            `${actor.name} (${profile.titleVi}) giải chấp [${tile?.shortName || tid}] để khôi phục quyền thu tiền thuê.`
          ),
        };
      }
    }

    // 6d. Evaluate Property Upgrades across Owned Monopolies
    const upgradeCandidates = Object.keys(state.properties)
      .map(Number)
      .filter(tid => {
        const check = canUpgradeProperty(
          tid,
          actor.id,
          actor.cash,
          state.properties,
          state.chaosModifiers,
          state.roundNumber,
          state
        );
        if (!check.canUpgrade) return false;
        const cost = getUpgradeCost(tid, state.roundNumber, state) || 100;
        const reserveFactor = diff.lookaheadDepth >= 2 ? 0.5 : 0.75;
        const requiredCash = cost * profile.upgradeBufferMultiplier + safetyReserve * reserveFactor;
        return actor.cash >= requiredCash;
      })
      .sort((a, b) => {
        const tileA = getTileById(a);
        const tileB = getTileById(b);
        return (tileB?.property?.baseRent || 0) - (tileA?.property?.baseRent || 0);
      });

    if (upgradeCandidates.length > 0 && aiActionStepCount < 4) {
      const bestUpgradeId = upgradeCandidates[0];
      const tile = getTileById(bestUpgradeId);
      const nextLevel = (state.properties[bestUpgradeId]?.level || 0) + 1;
      return {
        action: {
          type: 'UPGRADE_PROPERTY',
          tileId: bestUpgradeId,
          senderPlayerId: actor.id,
        },
        reason: makeReason(
          'UPGRADE_PROPERTY',
          `${actor.name} (${profile.titleVi}) đầu tư nâng cấp [${tile?.shortName || bestUpgradeId}] lên Cấp ${nextLevel}★.`
        ),
      };
    }

    // 6e. Evaluate Outbound Trade Proposal (at most once per turn when aiActionStepCount === 1 or 2)
    if (aiActionStepCount === 1) {
      const tradeOpportunity = generateOutboundTradeForAI(state, actor);
      if (tradeOpportunity) {
        return {
          action: {
            type: 'PROPOSE_TRADE',
            proposal: tradeOpportunity.proposal,
            senderPlayerId: actor.id,
          },
          reason: makeReason('PROPOSE_TRADE', tradeOpportunity.reasonVi),
        };
      }
    }

    // 6e-2. Evaluate Adaptive Business Selection on Owned Unassigned Property
    if (aiActionStepCount < 4 && state.spatialGraph) {
      const ownedWithoutBiz = Object.keys(state.properties)
        .map(Number)
        .filter(tid => {
          const own = state.properties[tid];
          return own && own.ownerId === actor.id && !own.isMortgaged && !own.businessTypeId;
        });

      if (ownedWithoutBiz.length > 0) {
        const targetTileId = ownedWithoutBiz[0];
        const targetNodeId =
          Object.values(state.spatialGraph.nodes).find(n => n.numericId === targetTileId)?.id ||
          `node-${targetTileId}`;
        const adjIds = getAdjacentNodeIds(state.spatialGraph, targetNodeId);
        const adjBusinesses: BusinessDefinition[] = [];
        for (const adjId of adjIds) {
          const bId = state.spatialGraph.nodes[adjId]?.currentBusiness?.businessId;
          if (bId && BUSINESS_CATALOG[bId]) {
            adjBusinesses.push(BUSINESS_CATALOG[bId]);
          }
        }
        const chaosPhase = state.chaosMeter?.phase ?? 'PEACEFUL';
        const chosenBiz = evaluateAIAdaptiveBusiness(chaosPhase, adjBusinesses);
        if (chosenBiz) {
          const tile = getTileById(targetTileId);
          return {
            action: {
              type: 'SELECT_BUSINESS_TYPE',
              tileId: targetTileId,
              nodeId: targetNodeId,
              businessId: chosenBiz.id,
              playerId: actor.id,
              senderPlayerId: actor.id,
            },
            reason: makeReason(
              'SELECT_BUSINESS_TYPE',
              `${actor.name} (${profile.titleVi}) triển khai mô hình kinh doanh [${chosenBiz.name}] tại [${tile?.shortName || targetTileId}] thích ứng pha ${chaosPhase}.`
            ),
          };
        }
      }
    }

    // 6e-3. Evaluate Choke-Point Sabotage Trap Placement (Shark / Chaotic / Strategist when active traps < 2)
    if (
      aiActionStepCount < 5 &&
      state.spatialGraph &&
      (profile.id === 'SHARK' || profile.id === 'CHAOTIC' || profile.id === 'STRATEGIST')
    ) {
      const candidateNodeIds = Object.keys(state.spatialGraph.nodes).filter(nid =>
        canPlaceTrap(state, actor.id, nid)
      );
      if (candidateNodeIds.length > 0) {
        const bestTrapNodeId = evaluateAIChokePointTrap(state.spatialGraph, candidateNodeIds);
        const bestNode = state.spatialGraph.nodes[bestTrapNodeId];
        if (bestNode && (bestNode.isIntersection || bestNode.type === 'TRANSPORT' || profile.id === 'CHAOTIC')) {
          const trapType = profile.id === 'SHARK' ? 'ROBBERY' : profile.id === 'CHAOTIC' ? 'TELEPORT_HAZARD' : 'LOCKDOWN';
          return {
            action: {
              type: 'PLACE_TRAP',
              nodeId: bestTrapNodeId,
              trapType,
              senderPlayerId: actor.id,
            },
            reason: makeReason(
              'PLACE_TRAP',
              `${actor.name} (${profile.titleVi}) bí mật gài bẫy ${trapType} tại điểm nghẽn [${bestNode.shortName || bestTrapNodeId}].`
            ),
          };
        }
      }
    }

    // 6f. End Turn
    return {
      action: {
        type: 'END_TURN',
        senderPlayerId: actor.id,
      },
      reason: makeReason(
        'END_TURN',
        `${actor.name} (${profile.titleVi}) hoàn tất lượt hành động.`
      ),
    };
  }

  return null;
}
