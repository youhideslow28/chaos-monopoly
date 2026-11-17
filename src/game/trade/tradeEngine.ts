import { formatMoney } from '../../utils/money';
import { GameState, PlayerId, TileId, TradeProposal } from '../types';
import { getTileById, getTilesInDistrict } from '../property/propertyEngine';
import { executeLedgerTransaction } from '../economy/ledgerEngine';
import { emitSound } from '../sound/soundEmitter';

export interface TradeValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateTradeProposal(
  state: GameState,
  proposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'>
): TradeValidationResult {
  if (state.status !== 'PLAYING') {
    return { valid: false, reason: 'Trận đấu chưa bắt đầu hoặc đã kết thúc.' };
  }

  const {
    senderPlayerId,
    targetPlayerId,
    offeredCash,
    offeredPropertyIds,
    offeredJailCards,
    requestedCash,
    requestedPropertyIds,
    requestedJailCards,
  } = proposal;

  if (!senderPlayerId || !targetPlayerId || senderPlayerId === targetPlayerId) {
    return { valid: false, reason: 'Người gửi và người nhận giao dịch phải là 2 người chơi khác nhau.' };
  }

  const sender = state.players.find(p => p.id === senderPlayerId);
  const target = state.players.find(p => p.id === targetPlayerId);

  if (!sender || !target || sender.isBankrupt || target.isBankrupt) {
    return { valid: false, reason: 'Không thể giao dịch với người chơi không hợp lệ hoặc đã phá sản.' };
  }

  // Validate non-negative integer amounts
  if (
    !Number.isFinite(offeredCash) ||
    !Number.isInteger(offeredCash) ||
    offeredCash < 0 ||
    !Number.isFinite(requestedCash) ||
    !Number.isInteger(requestedCash) ||
    requestedCash < 0
  ) {
    return { valid: false, reason: 'Số tiền giao dịch phải là số nguyên không âm.' };
  }

  if (
    !Number.isFinite(offeredJailCards) ||
    !Number.isInteger(offeredJailCards) ||
    offeredJailCards < 0 ||
    !Number.isFinite(requestedJailCards) ||
    !Number.isInteger(requestedJailCards) ||
    requestedJailCards < 0
  ) {
    return { valid: false, reason: 'Số thẻ miễn giam giao dịch không hợp lệ.' };
  }

  // Must not be completely empty on both sides
  const hasOfferedAnything =
    offeredCash > 0 || offeredPropertyIds.length > 0 || offeredJailCards > 0;
  const hasRequestedAnything =
    requestedCash > 0 || requestedPropertyIds.length > 0 || requestedJailCards > 0;

  if (!hasOfferedAnything && !hasRequestedAnything) {
    return { valid: false, reason: 'Giao dịch phải bao gồm ít nhất tiền mặt, bất động sản hoặc thẻ miễn giam.' };
  }

  // Validate cash & jail card affordability
  if (sender.cash < offeredCash) {
    return {
      valid: false,
      reason: `${sender.name} không đủ tiền mặt để đề xuất (${formatMoney(offeredCash)} > ${formatMoney(sender.cash)}).`,
    };
  }

  if (target.cash < requestedCash) {
    return {
      valid: false,
      reason: `${target.name} không đủ tiền mặt để đáp ứng (${formatMoney(requestedCash)} > ${formatMoney(target.cash)}).`,
    };
  }

  if ((sender.jailFreeCards || 0) < offeredJailCards) {
    return { valid: false, reason: `${sender.name} không có đủ Thẻ Miễn Giam.` };
  }

  if ((target.jailFreeCards || 0) < requestedJailCards) {
    return { valid: false, reason: `${target.name} không có đủ Thẻ Miễn Giam.` };
  }

  // Check duplicate property IDs
  const uniqueOffered = new Set(offeredPropertyIds);
  const uniqueRequested = new Set(requestedPropertyIds);
  if (
    uniqueOffered.size !== offeredPropertyIds.length ||
    uniqueRequested.size !== requestedPropertyIds.length
  ) {
    return { valid: false, reason: 'Danh sách bất động sản giao dịch bị trùng lặp.' };
  }

  for (const id of offeredPropertyIds) {
    if (uniqueRequested.has(id)) {
      return { valid: false, reason: 'Một bất động sản không thể vừa đưa vừa nhận.' };
    }
  }

  // Validate ownership & Unimproved District Rule for offered properties
  const senderPropCheck = validatePropertiesForTrade(
    state,
    senderPlayerId,
    offeredPropertyIds,
    sender.name
  );
  if (!senderPropCheck.valid) {
    return senderPropCheck;
  }

  // Validate ownership & Unimproved District Rule for requested properties
  const targetPropCheck = validatePropertiesForTrade(
    state,
    targetPlayerId,
    requestedPropertyIds,
    target.name
  );
  if (!targetPropCheck.valid) {
    return targetPropCheck;
  }

  return { valid: true };
}

function validatePropertiesForTrade(
  state: GameState,
  ownerId: PlayerId,
  propertyIds: TileId[],
  ownerName: string
): TradeValidationResult {
  for (const tileId of propertyIds) {
    const tile = getTileById(tileId);
    if (!tile || !tile.property) {
      return { valid: false, reason: `Ô #${tileId} không phải là bất động sản hợp lệ.` };
    }

    const ownership = state.properties[tileId];
    if (!ownership || ownership.ownerId !== ownerId) {
      return {
        valid: false,
        reason: `${ownerName} không còn sở hữu bất động sản [${tile.name}].`,
      };
    }

    if (ownership.level > 0) {
      return {
        valid: false,
        reason: `Không thể giao dịch [${tile.name}] vì đang có công trình xây dựng (Cấp ${ownership.level}★). Phải bán hết công trình về đất trống trước!`,
      };
    }

    // Unimproved District Rule: No tile in the same color district can have buildings (level > 0)
    const districtTiles = getTilesInDistrict(tile.property.districtColor);
    const builtSibling = districtTiles.find(t => (state.properties[t.id]?.level ?? 0) > 0);
    if (builtSibling) {
      return {
        valid: false,
        reason: `Quy tắc Phân Khu Trống: Không thể giao dịch [${tile.name}] khi [${builtSibling.name}] cùng phân khu vẫn còn công trình xây dựng.`,
      };
    }
  }

  return { valid: true };
}

export function proposeTrade(
  state: GameState,
  proposalInput: Omit<TradeProposal, 'id' | 'status' | 'createdAt'>
): GameState {
  if (state.activeTrade && state.activeTrade.status === 'PENDING') {
    return state;
  }

  const validation = validateTradeProposal(state, proposalInput);
  if (!validation.valid) {
    return state;
  }

  const sender = state.players.find(p => p.id === proposalInput.senderPlayerId);
  const target = state.players.find(p => p.id === proposalInput.targetPlayerId);

  const proposal: TradeProposal = {
    ...proposalInput,
    id: `trade-${Date.now()}-${state.roundNumber}`,
    status: 'PENDING',
    createdAt: Date.now(),
  };

  return {
    ...state,
    activeTrade: proposal,
    logs: [
      {
        id: `log-trade-propose-${Date.now()}`,
        timestamp: Date.now(),
        playerId: sender?.id,
        playerName: sender?.name,
        message: `🤝 [ĐỀ XUẤT GIAO DỊCH] ${sender?.name} gửi lời mời thương lượng tài sản tới ${target?.name}.`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };
}

/**
 * Who must answer a pending proposal: the target first. After the target's single cash
 * adjustment, the original sender answers (accept / reject / withdraw) and cannot adjust again.
 */
export function getTradeResponderId(trade: TradeProposal): PlayerId {
  return trade.countered ? trade.senderPlayerId : trade.targetPlayerId;
}

/**
 * One-time cash adjustment by the target. Only the two cash amounts change; properties and
 * jail cards stay exactly as proposed. The adjusted terms are validated like any proposal.
 */
export function counterTrade(
  state: GameState,
  adjustment: Pick<TradeProposal, 'offeredCash' | 'requestedCash'>
): GameState {
  const trade = state.activeTrade;
  if (!trade || trade.status !== 'PENDING' || trade.countered) {
    return state;
  }

  const adjusted = {
    senderPlayerId: trade.senderPlayerId,
    targetPlayerId: trade.targetPlayerId,
    offeredCash: adjustment.offeredCash,
    offeredPropertyIds: trade.offeredPropertyIds,
    offeredJailCards: trade.offeredJailCards,
    requestedCash: adjustment.requestedCash,
    requestedPropertyIds: trade.requestedPropertyIds,
    requestedJailCards: trade.requestedJailCards,
  };

  if (adjusted.offeredCash === trade.offeredCash && adjusted.requestedCash === trade.requestedCash) {
    return state;
  }

  const validation = validateTradeProposal(state, adjusted);
  if (!validation.valid) {
    return state;
  }

  const target = state.players.find(p => p.id === trade.targetPlayerId);
  const sender = state.players.find(p => p.id === trade.senderPlayerId);

  return {
    ...state,
    activeTrade: {
      ...trade,
      offeredCash: adjusted.offeredCash,
      requestedCash: adjusted.requestedCash,
      countered: true,
    },
    logs: [
      {
        id: `log-trade-counter-${Date.now()}`,
        timestamp: Date.now(),
        playerId: target?.id,
        playerName: target?.name,
        message: `🔁 [ĐIỀU CHỈNH GIAO DỊCH] ${target?.name} điều chỉnh tiền mặt (${formatMoney(adjusted.offeredCash)} / ${formatMoney(adjusted.requestedCash)}). ${sender?.name} phản hồi một lần cuối.`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };
}

export function acceptTrade(state: GameState, tradeId?: string): GameState {
  const trade = state.activeTrade;
  if (!trade || trade.status !== 'PENDING') {
    return state;
  }

  if (tradeId && trade.id !== tradeId) {
    return state;
  }

  // Re-validate at resolution time to prevent stale or invalid offers from executing
  const validation = validateTradeProposal(state, trade);
  if (!validation.valid) {
    return {
      ...state,
      activeTrade: null,
      logs: [
        {
          id: `log-trade-invalid-${Date.now()}`,
          timestamp: Date.now(),
          message: `[GIAO DỊCH HỦY BỎ] Đề xuất giao dịch không còn hợp lệ: ${validation.reason}`,
          type: 'WARNING',
        },
        ...state.logs,
      ],
    };
  }

  let currentPlayers = [...state.players];
  let currentLedger = [...(state.ledger || [])];

  const sender = currentPlayers.find(p => p.id === trade.senderPlayerId)!;
  const target = currentPlayers.find(p => p.id === trade.targetPlayerId)!;

  // 1. Execute offeredCash transfer (Sender -> Target) via central ledger
  if (trade.offeredCash > 0) {
    const res1 = executeLedgerTransaction(
      currentPlayers,
      {
        category: 'TRADE_CASH',
        from: trade.senderPlayerId,
        to: trade.targetPlayerId,
        amount: trade.offeredCash,
        roundNumber: state.roundNumber,
        memo: `Chuyển tiền giao dịch thương mại từ ${sender.name} sang ${target.name}`,
      },
      currentLedger
    );
    if (!res1.success) {
      return { ...state, activeTrade: null };
    }
    currentPlayers = res1.newPlayers;
    if (res1.entry) currentLedger.push(res1.entry);
  }

  // 2. Execute requestedCash transfer (Target -> Sender) via central ledger
  if (trade.requestedCash > 0) {
    const res2 = executeLedgerTransaction(
      currentPlayers,
      {
        category: 'TRADE_CASH',
        from: trade.targetPlayerId,
        to: trade.senderPlayerId,
        amount: trade.requestedCash,
        roundNumber: state.roundNumber,
        memo: `Chuyển tiền giao dịch thương mại từ ${target.name} sang ${sender.name}`,
      },
      currentLedger
    );
    if (!res2.success) {
      return { ...state, activeTrade: null };
    }
    currentPlayers = res2.newPlayers;
    if (res2.entry) currentLedger.push(res2.entry);
  }

  // 3. Atomically swap property ownership (preserving mortgage state, level 0)
  const updatedProperties = { ...state.properties };
  for (const propId of trade.offeredPropertyIds) {
    updatedProperties[propId] = {
      ...updatedProperties[propId],
      ownerId: trade.targetPlayerId,
      level: 0,
    };
  }
  for (const propId of trade.requestedPropertyIds) {
    updatedProperties[propId] = {
      ...updatedProperties[propId],
      ownerId: trade.senderPlayerId,
      level: 0,
    };
  }

  // 4. Update jailFreeCards and propertiesOwned stats
  const netPropsForSender =
    trade.requestedPropertyIds.length - trade.offeredPropertyIds.length;
  const netPropsForTarget =
    trade.offeredPropertyIds.length - trade.requestedPropertyIds.length;

  const netCardsForSender = trade.requestedJailCards - trade.offeredJailCards;
  const netCardsForTarget = trade.offeredJailCards - trade.requestedJailCards;

  currentPlayers = currentPlayers.map(p => {
    if (p.id === trade.senderPlayerId) {
      return {
        ...p,
        jailFreeCards: Math.max(0, (p.jailFreeCards || 0) + netCardsForSender),
        stats: {
          ...p.stats,
          propertiesOwned: Math.max(0, p.stats.propertiesOwned + netPropsForSender),
        },
      };
    }
    if (p.id === trade.targetPlayerId) {
      return {
        ...p,
        jailFreeCards: Math.max(0, (p.jailFreeCards || 0) + netCardsForTarget),
        stats: {
          ...p.stats,
          propertiesOwned: Math.max(0, p.stats.propertiesOwned + netPropsForTarget),
        },
      };
    }
    return p;
  });

  emitSound('buyProperty');

  return {
    ...state,
    players: currentPlayers,
    properties: updatedProperties,
    activeTrade: null,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    lastSoundEffect: 'buyProperty',
    logs: [
      {
        id: `log-trade-accept-${Date.now()}`,
        timestamp: Date.now(),
        playerId: target.id,
        playerName: target.name,
        message: `✅ [GIAO DỊCH THÀNH CÔNG] ${sender.name} và ${target.name} đã hoàn tất hợp đồng trao đổi tài sản!`,
        type: 'PURCHASE',
      },
      ...state.logs,
    ],
  };
}

export function rejectTrade(state: GameState, tradeId?: string): GameState {
  const trade = state.activeTrade;
  if (!trade || trade.status !== 'PENDING') {
    return state;
  }
  if (tradeId && trade.id !== tradeId) {
    return state;
  }

  const target = state.players.find(p => p.id === trade.targetPlayerId);
  const sender = state.players.find(p => p.id === trade.senderPlayerId);

  return {
    ...state,
    activeTrade: null,
    logs: [
      {
        id: `log-trade-reject-${Date.now()}`,
        timestamp: Date.now(),
        playerId: target?.id,
        playerName: target?.name,
        message: `❌ [TỪ CHỐI GIAO DỊCH] ${target?.name} đã từ chối lời đề nghị thương lượng của ${sender?.name}.`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };
}

export function cancelTrade(state: GameState, tradeId?: string): GameState {
  const trade = state.activeTrade;
  if (!trade || trade.status !== 'PENDING') {
    return state;
  }
  if (tradeId && trade.id !== tradeId) {
    return state;
  }

  const sender = state.players.find(p => p.id === trade.senderPlayerId);

  return {
    ...state,
    activeTrade: null,
    logs: [
      {
        id: `log-trade-cancel-${Date.now()}`,
        timestamp: Date.now(),
        playerId: sender?.id,
        playerName: sender?.name,
        message: `[HỦY GIAO DỊCH] ${sender?.name} đã rút lại đề xuất thương lượng.`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };
}
