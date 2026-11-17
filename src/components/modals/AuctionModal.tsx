import React, { useState } from 'react';
import { GameState, PlayerId } from '../../game/types';
import { formatMoney } from '../../utils/money';
import { getTileById } from '../../game/property/propertyEngine';
import { MIN_BID_INCREMENT } from '../../game/auction/auctionEngine';
import { displayTileName } from '../../worlds/runtime';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import { Gavel, DollarSign, XCircle, Building2, TrendingUp } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface AuctionModalProps {
  state: GameState;
  onPlaceBid: (playerId: PlayerId, bidAmount: number) => void;
  onPassBid: (playerId: PlayerId) => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  state,
  onPlaceBid,
  onPassBid,
}) => {
  const auction = state.activeAuction;
  const [customIncrement, setCustomIncrement] = useState<number>(MIN_BID_INCREMENT);
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  if (!auction || auction.status !== 'ACTIVE') return null;

  const tile = getTileById(auction.propertyId);
  if (!tile || !tile.property) return null;

  const currentBidder = state.players.find(p => p.id === auction.currentTurnBidderId);
  const highestBidder = state.players.find(p => p.id === auction.highestBidderId);

  const minNextBid =
    auction.highestBidderId === null
      ? auction.openingBid
      : auction.highestBid + MIN_BID_INCREMENT;

  const canCurrentBidderAffordMin = (currentBidder?.cash || 0) >= minNextBid;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      data-testid="auction-modal"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Gavel className="w-5 h-5 text-white animate-bounce" />
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              {t('auctionTitle')}
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
            {t('tileWord')} #{tile.id}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Property Card Info */}
          <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] flex items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {tile.property.district}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">{displayTileName(tile, 'full')}</h3>
              <p className="text-xs text-slate-500">
                {t('listedPrice')}: <strong className="text-slate-800">{formatMoney(tile.property.basePrice)}</strong> • {t('baseRentShort')}:{' '}
                <strong className="text-emerald-700">{formatMoney(tile.property.baseRent)}</strong>
              </p>
            </div>
            <div className="text-right shrink-0 bg-[#faf8f5] px-3.5 py-2.5 rounded-xl border border-[#e8e2d5]">
              <span className="text-[10px] uppercase text-slate-500 block font-bold">{t('currentHighestBid')}</span>
              <span className="text-xl sm:text-2xl font-black text-amber-700" data-testid="auction-highest-bid">
                {formatMoney(auction.highestBid > 0 ? auction.highestBid : auction.openingBid)}
              </span>
              <span className="text-[10px] text-slate-600 block truncate max-w-[120px]">
                {highestBidder ? `${t('bidBy')}: ${highestBidder.name}` : t('openingBidHalf')}
              </span>
            </div>
          </div>

          {/* Participants Status Bar */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {t('biddersIn')} ({auction.activeBidderIds.length} {t('stillInSuffix')}):
            </span>
            <div className="grid grid-cols-2 gap-2">
              {state.players
                .filter(p => !p.isBankrupt)
                .map(p => {
                  const isPassed = auction.passedBidderIds.includes(p.id);
                  const isTurn = auction.currentTurnBidderId === p.id;
                  const isLeading = auction.highestBidderId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        isTurn
                          ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                          : isPassed
                          ? 'bg-[#faf8f5] border-[#e8e2d5] opacity-50'
                          : 'bg-white border-[#e8e2d5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.token.colorHex }}
                        />
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">{formatMoney(p.cash)}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isPassed ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                            {t('bidPassed')}
                          </span>
                        ) : isLeading ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                            {t('bidLeading')}
                          </span>
                        ) : isTurn ? (
                          <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-black">
                            {t('bidToBid')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Current Bidder Controls */}
          {currentBidder && (
            <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-400"
                    style={{ backgroundColor: currentBidder.token.colorHex }}
                  />
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    {t('bidTurnOf')}: <span className="text-amber-700">{currentBidder.name}</span>
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  {t('balance')}: {formatMoney(currentBidder.cash)}
                </span>
              </div>

              {/* Quick Bid Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[10, 25, 50].map(inc => {
                  const targetBid =
                    auction.highestBidderId === null
                      ? auction.openingBid + (inc === 10 ? 0 : inc)
                      : auction.highestBid + inc;
                  const canAfford = currentBidder.cash >= targetBid;

                  return (
                    <button
                      key={inc}
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        soundEffects.click();
                        onPlaceBid(currentBidder.id, targetBid);
                      }}
                      data-testid={`auction-bid-${inc}`}
                      className={`min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs flex flex-col items-center justify-center border transition-all ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700 shadow-sm active:scale-95'
                          : 'bg-slate-100 text-slate-400 border-[#e8e2d5] cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {auction.highestBidderId === null && inc === 10
                          ? t('openingBidBtn')
                          : `+${formatMoney(inc)}`}
                      </span>
                      <span className="text-[11px] opacity-90">({formatMoney(targetBid)})</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Bid & Pass Row */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 min-h-[44px] flex items-center gap-1.5 bg-[#faf8f5] border border-[#e8e2d5] rounded-xl px-3 py-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
                  <input
                    type="number"
                    min={minNextBid}
                    step={10}
                    value={Math.max(minNextBid, customIncrement)}
                    onChange={e => setCustomIncrement(Number(e.target.value))}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!canCurrentBidderAffordMin || currentBidder.cash < Math.max(minNextBid, customIncrement)}
                    onClick={() => {
                      const amount = Math.max(minNextBid, Math.floor(customIncrement));
                      if (currentBidder.cash >= amount) {
                        soundEffects.click();
                        onPlaceBid(currentBidder.id, amount);
                      }
                    }}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs shrink-0 transition-all"
                  >
                    {t('placeBid')}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    onPassBid(currentBidder.id);
                  }}
                  data-testid="auction-pass-btn"
                  className="min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t('passBid')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
