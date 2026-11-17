import { formatMoney } from '../../utils/money';
import { AuctionState, GameState, PlayerId, TileId } from '../types';
import { getTileById } from '../property/propertyEngine';
import { executeLedgerTransaction } from '../economy/ledgerEngine';
import { isMarketFrozen } from '../economy/economicModifiers';
import { emitSound } from '../sound/soundEmitter';

export const MIN_BID_INCREMENT = 10;

export function initiateAuction(state: GameState, propertyId?: TileId): GameState {
  if (state.status !== 'PLAYING' || state.activeAuction) {
    return state;
  }

  if (isMarketFrozen(state.chaosModifiers)) {
    return state;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const targetTileId = propertyId !== undefined ? propertyId : activePlayer?.position;
  if (targetTileId === undefined) return state;

  const tile = getTileById(targetTileId);
  const buyableTypes = ['PROPERTY', 'TRANSPORT', 'UTILITY'];
  if (!tile || !buyableTypes.includes(tile.type) || !tile.property) {
    return state;
  }

  const ownership = state.properties[targetTileId];
  if (ownership && ownership.ownerId !== null) {
    return state;
  }

  const openingBid = Math.max(10, Math.floor(tile.property.basePrice * 0.5));

  // Eligible participants: all non-bankrupt players ordered starting from activePlayerIndex
  const orderedPlayers = [
    ...state.players.slice(state.activePlayerIndex),
    ...state.players.slice(0, state.activePlayerIndex),
  ].filter(p => !p.isBankrupt);

  const activeBidderIds = orderedPlayers.map(p => p.id);
  if (activeBidderIds.length === 0) {
    return state;
  }

  const auction: AuctionState = {
    propertyId: targetTileId,
    openingBid,
    highestBid: 0,
    highestBidderId: null,
    currentTurnBidderId: activeBidderIds[0],
    activeBidderIds,
    passedBidderIds: [],
    status: 'ACTIVE',
  };

  emitSound('diceRoll');

  return {
    ...state,
    turnPhase: 'AUCTION',
    activeAuction: auction,
    lastSoundEffect: 'diceRoll',
    logs: [
      {
        id: `auction-start-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer?.id,
        playerName: activePlayer?.name,
        message: `[ĐẤU GIÁ CÔNG KHAI] Mở phiên đấu giá bất động sản [${tile.name}] với giá khởi điểm ${formatMoney(openingBid)}!`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };
}

export function placeAuctionBid(
  state: GameState,
  playerId: PlayerId,
  bidAmount: number
): GameState {
  const auction = state.activeAuction;
  if (!auction || auction.status !== 'ACTIVE' || state.turnPhase !== 'AUCTION') {
    return state;
  }

  // Must be an eligible active bidder (has not passed and is not bankrupt)
  if (!auction.activeBidderIds.includes(playerId)) {
    return state;
  }

  const bidder = state.players.find(p => p.id === playerId);
  if (!bidder || bidder.isBankrupt) {
    return state;
  }

  if (!Number.isFinite(bidAmount) || !Number.isInteger(bidAmount)) {
    return state;
  }

  const minRequiredBid = auction.highestBidderId === null
    ? auction.openingBid
    : auction.highestBid + MIN_BID_INCREMENT;

  if (bidAmount < minRequiredBid) {
    return state;
  }

  if (bidder.cash < bidAmount) {
    return state;
  }

  const currentIdx = auction.activeBidderIds.indexOf(playerId);
  const nextIdx = (currentIdx + 1) % auction.activeBidderIds.length;
  const nextBidderId = auction.activeBidderIds[nextIdx];

  const tile = getTileById(auction.propertyId);
  const updatedAuction: AuctionState = {
    ...auction,
    highestBid: bidAmount,
    highestBidderId: playerId,
    currentTurnBidderId: nextBidderId,
  };

  const stateWithBid: GameState = {
    ...state,
    activeAuction: updatedAuction,
    logs: [
      {
        id: `auction-bid-${Date.now()}-${playerId}`,
        timestamp: Date.now(),
        playerId: bidder.id,
        playerName: bidder.name,
        message: `[ĐẤU GIÁ] ${bidder.name} trả giá ${formatMoney(bidAmount)} cho [${tile?.name || auction.propertyId}].`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };

  // If only 1 active bidder remains and they just placed the highest bid, resolve immediately
  if (updatedAuction.activeBidderIds.length === 1 && updatedAuction.highestBidderId === playerId) {
    return resolveAuction(stateWithBid);
  }

  return stateWithBid;
}

export function passAuctionBid(state: GameState, playerId: PlayerId): GameState {
  const auction = state.activeAuction;
  if (!auction || auction.status !== 'ACTIVE' || state.turnPhase !== 'AUCTION') {
    return state;
  }

  if (!auction.activeBidderIds.includes(playerId)) {
    return state;
  }

  const player = state.players.find(p => p.id === playerId);
  const tile = getTileById(auction.propertyId);

  const currentIdx = auction.activeBidderIds.indexOf(playerId);
  const remainingBidders = auction.activeBidderIds.filter(id => id !== playerId);
  const updatedPassedBidders = [...auction.passedBidderIds, playerId];

  const passLog = {
    id: `auction-pass-${Date.now()}-${playerId}`,
    timestamp: Date.now(),
    playerId: player?.id,
    playerName: player?.name,
    message: `[ĐẤU GIÁ] ${player?.name || playerId} bỏ lượt đấu giá [${tile?.name || auction.propertyId}].`,
    type: 'INFO' as const,
  };

  // Case 1: All players have passed
  if (remainingBidders.length === 0) {
    if (auction.highestBidderId !== null && auction.highestBid > 0) {
      return resolveAuction({
        ...state,
        activeAuction: {
          ...auction,
          activeBidderIds: [],
          passedBidderIds: updatedPassedBidders,
        },
        logs: [passLog, ...state.logs],
      });
    }

    // No bids placed at all -> Property remains unowned with the Bank
    return {
      ...state,
      turnPhase: 'ACTION_MENU',
      activeAuction: null,
      logs: [
        {
          id: `auction-nobid-${Date.now()}`,
          timestamp: Date.now(),
          message: `[KẾT THÚC ĐẤU GIÁ] Không có ai trả giá cho [${tile?.name || auction.propertyId}]. Bất động sản vẫn thuộc về Ngân Hàng.`,
          type: 'INFO',
        },
        passLog,
        ...state.logs,
      ],
    };
  }

  // Case 2: Only 1 bidder left AND that bidder already holds the highest bid -> Win immediately!
  if (remainingBidders.length === 1 && auction.highestBidderId === remainingBidders[0]) {
    return resolveAuction({
      ...state,
      activeAuction: {
        ...auction,
        activeBidderIds: remainingBidders,
        passedBidderIds: updatedPassedBidders,
        currentTurnBidderId: remainingBidders[0],
      },
      logs: [passLog, ...state.logs],
    });
  }

  // Otherwise, advance turn to the next remaining active bidder
  const nextBidderIdx = currentIdx % remainingBidders.length;
  const nextTurnBidderId = remainingBidders[nextBidderIdx];

  return {
    ...state,
    activeAuction: {
      ...auction,
      activeBidderIds: remainingBidders,
      passedBidderIds: updatedPassedBidders,
      currentTurnBidderId: nextTurnBidderId,
    },
    logs: [passLog, ...state.logs],
  };
}

export function resolveAuction(state: GameState): GameState {
  const auction = state.activeAuction;
  if (!auction || !auction.highestBidderId || auction.highestBid <= 0) {
    return {
      ...state,
      turnPhase: 'ACTION_MENU',
      activeAuction: null,
    };
  }

  const winnerId = auction.highestBidderId;
  const winningBid = auction.highestBid;
  const propertyId = auction.propertyId;
  const tile = getTileById(propertyId);
  const winner = state.players.find(p => p.id === winnerId);

  // Guard against duplicate ownership or invalid winner
  const currentOwnership = state.properties[propertyId];
  if (!winner || winner.isBankrupt || (currentOwnership && currentOwnership.ownerId !== null)) {
    return {
      ...state,
      turnPhase: 'ACTION_MENU',
      activeAuction: null,
    };
  }

  const ledgerRes = executeLedgerTransaction(
    state.players,
    {
      category: 'AUCTION_WIN',
      from: winnerId,
      to: 'BANK',
      amount: winningBid,
      roundNumber: state.roundNumber,
      tileId: propertyId,
      memo: `Thắng đấu giá bất động sản [${tile?.name || propertyId}]`,
    },
    state.ledger || []
  );

  if (!ledgerRes.success) {
    return {
      ...state,
      turnPhase: 'ACTION_MENU',
      activeAuction: null,
    };
  }

  const updatedPlayers = ledgerRes.newPlayers.map(p =>
    p.id === winnerId
      ? { ...p, stats: { ...p.stats, propertiesOwned: p.stats.propertiesOwned + 1 } }
      : p
  );

  const updatedLedger = ledgerRes.entry
    ? [...(state.ledger || []), ledgerRes.entry]
    : state.ledger || [];

  const updatedProperties = {
    ...state.properties,
    [propertyId]: {
      ownerId: winnerId,
      level: 0,
      isMortgaged: false,
    },
  };

  emitSound('buyProperty');

  return {
    ...state,
    players: updatedPlayers,
    properties: updatedProperties,
    turnPhase: 'ACTION_MENU',
    activeAuction: null,
    ledger: updatedLedger,
    ledgerHistory: updatedLedger,
    lastSoundEffect: 'buyProperty',
    logs: [
      {
        id: `auction-win-${Date.now()}`,
        timestamp: Date.now(),
        playerId: winner.id,
        playerName: winner.name,
        message: `🔨 [THẮNG ĐẤU GIÁ] ${winner.name} đã sở hữu [${tile?.name || propertyId}] với mức giá ${formatMoney(winningBid)}!`,
        type: 'PURCHASE',
      },
      ...state.logs,
    ],
  };
}
