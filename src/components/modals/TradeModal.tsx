import React, { useState } from 'react';
import { formatMoney } from '../../utils/money';
import { GameState, PlayerId, PlayerState, TileId, TradeProposal } from '../../game/types';
import { getTileById, getTilesInDistrict } from '../../game/property/propertyEngine';
import { validateTradeProposal, getTradeResponderId } from '../../game/trade/tradeEngine';
import { useModalDismiss } from '../common/useModalDismiss';
import { displayTileName } from '../../worlds/runtime';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import { ArrowLeftRight, CheckCircle2, XCircle, Shield, RotateCcw, Check } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

type Proposal = Omit<TradeProposal, 'id' | 'status' | 'createdAt'>;

interface TradeModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onProposeTrade: (proposal: Proposal) => void;
  onAcceptTrade: (tradeId?: string) => void;
  onRejectTrade: (tradeId?: string) => void;
  onCancelTrade: (tradeId?: string) => void;
  /** The receiver's single cash adjustment. */
  onCounterTrade?: (proposal: Proposal) => void;
  /** Online: the player looking at the screen. Local play: omitted. */
  viewerPlayerId?: string | null;
}

const CASH_STEPS = [50, 100, 500] as const;

/** Plain-language list of what one side hands over, e.g. "$100 + 2 tiles + 1 jail card". */
function describeGive(
  cash: number,
  tileIds: TileId[],
  jailCards: number,
  locale: 'vi' | 'en'
): string {
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];
  const parts: string[] = [];
  if (cash > 0) parts.push(formatMoney(cash));
  if (tileIds.length > 0) {
    const names = tileIds.map(id => {
      const tile = getTileById(id);
      return tile ? displayTileName(tile, 'short') : `#${id}`;
    });
    parts.push(names.join(', '));
  }
  if (jailCards > 0) parts.push(`${jailCards} ${t('jailCardCount')}`);
  return parts.length > 0 ? parts.join(' + ') : t('youGiveNothing');
}

export const TradeModal: React.FC<TradeModalProps> = ({
  state,
  isOpen,
  onClose,
  onProposeTrade,
  onAcceptTrade,
  onRejectTrade,
  onCancelTrade,
  onCounterTrade,
  viewerPlayerId,
}) => {
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];
  const activePlayer = state.players[state.activePlayerIndex];
  const opponents = state.players.filter(p => p.id !== activePlayer?.id && !p.isBankrupt);

  const [partnerId, setPartnerId] = useState<PlayerId>(opponents[0]?.id || '');
  const [giveCash, setGiveCash] = useState<number>(0);
  const [getCash, setGetCash] = useState<number>(0);
  const [givePropertyIds, setGivePropertyIds] = useState<TileId[]>([]);
  const [getPropertyIds, setGetPropertyIds] = useState<TileId[]>([]);
  const [giveJailCards, setGiveJailCards] = useState<number>(0);
  const [getJailCards, setGetJailCards] = useState<number>(0);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const [adjustPay, setAdjustPay] = useState<number>(0);
  const [adjustReceive, setAdjustReceive] = useState<number>(0);

  const isPendingReview = Boolean(state.activeTrade && state.activeTrade.status === 'PENDING');
  const { backdropProps } = useModalDismiss({
    isOpen: Boolean(isOpen || isPendingReview),
    onClose: !isPendingReview ? onClose : undefined,
    disableBackdropClick: isPendingReview,
  });

  if (!isOpen && !state.activeTrade) return null;

  // ---------------------------------------------------------------------------
  // Mode 1: a proposal is waiting. Everything is written from the point of view of
  // the person reading it ("Bạn đưa ra" / "Bạn nhận về"), and only the person who must
  // answer sees answer buttons.
  // ---------------------------------------------------------------------------
  if (state.activeTrade && state.activeTrade.status === 'PENDING') {
    const trade = state.activeTrade;
    const sender = state.players.find(p => p.id === trade.senderPlayerId);
    const receiver = state.players.find(p => p.id === trade.targetPlayerId);
    const responderId = getTradeResponderId(trade);
    const responder = state.players.find(p => p.id === responderId);

    const responderIsHuman = Boolean(responder && !responder.isAI);
    const senderIsHuman = Boolean(sender && !sender.isAI);
    const canRespond = responderIsHuman && (!viewerPlayerId || viewerPlayerId === responderId);
    const canWithdraw = senderIsHuman && (!viewerPlayerId || viewerPlayerId === trade.senderPlayerId);
    const canAdjust = canRespond && !trade.countered && Boolean(onCounterTrade);

    // Viewpoint: the online viewer, or in hot-seat play the human who has to answer.
    const perspective: PlayerState | undefined =
      state.players.find(p => p.id === (viewerPlayerId ?? (responderIsHuman ? responderId : trade.senderPlayerId)));
    const viewerIsSender = perspective?.id === trade.senderPlayerId;
    // "You" for an online viewer; in hot-seat play the name of whoever is answering.
    const you = viewerPlayerId ? t('youWord') : perspective?.name ?? t('youWord');

    // Map the two cash fields onto "what I hand over" and "what I receive".
    const iGiveCash = viewerIsSender ? trade.offeredCash : trade.requestedCash;
    const iGiveTiles = viewerIsSender ? trade.offeredPropertyIds : trade.requestedPropertyIds;
    const iGiveCards = viewerIsSender ? trade.offeredJailCards : trade.requestedJailCards;
    const iGetCash = viewerIsSender ? trade.requestedCash : trade.offeredCash;
    const iGetTiles = viewerIsSender ? trade.requestedPropertyIds : trade.offeredPropertyIds;
    const iGetCards = viewerIsSender ? trade.requestedJailCards : trade.offeredJailCards;

    // Adjustment is only offered to the receiver (the target), so "I pay" is the target's side.
    const adjustedProposal: Proposal = {
      senderPlayerId: trade.senderPlayerId,
      targetPlayerId: trade.targetPlayerId,
      offeredCash: Math.max(0, Math.floor(adjustReceive)),
      offeredPropertyIds: trade.offeredPropertyIds,
      offeredJailCards: trade.offeredJailCards,
      requestedCash: Math.max(0, Math.floor(adjustPay)),
      requestedPropertyIds: trade.requestedPropertyIds,
      requestedJailCards: trade.requestedJailCards,
    };
    const adjustValidation = validateTradeProposal(state, adjustedProposal);
    const adjustUnchanged =
      adjustedProposal.offeredCash === trade.offeredCash && adjustedProposal.requestedCash === trade.requestedCash;

    const title = canRespond
      ? `${sender?.name ?? t('tradePartnerWord')} ${t('tradeOfferToYouSuffix')}`
      : canWithdraw
      ? `${t('tradeYouSentOfferTo')} ${receiver?.name ?? t('tradePartnerWord')}`
      : `${sender?.name ?? t('playerWordShort')} ${t('tradeOfferBetweenSuffix')} ${receiver?.name ?? t('tradePartnerWord')}`;

    const statusLine = !canRespond && !canWithdraw
      ? `${t('tradeWaitingFor')} ${responder?.name ?? t('tradePartnerWord')} ${t('tradeReplyDot')}`
      : canRespond && !trade.countered
      ? t('tradeChooseRespond')
      : trade.countered && canWithdraw
      ? `${receiver?.name ?? t('tradePartnerWord')} ${t('tradeTheyAdjustedChoose')}`
      : trade.countered
      ? t('tradeYouAdjustedWaiting')
      : `${t('tradeWaitingFor')} ${responder?.name ?? t('tradePartnerWord')} ${t('tradeReplyCanWithdraw')}`;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
        {...backdropProps}
        data-testid="trade-review-modal"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl overflow-hidden flex flex-col text-slate-900"
        >
          <div className="px-5 py-3.5 border-b border-[#e8e2d5] flex items-center gap-2 bg-[#faf8f5]">
            <ArrowLeftRight className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm sm:text-base font-black text-slate-900" data-testid="trade-title">{title}</h2>
          </div>

          <div className="p-5 space-y-4">
            {/* What each side hands over, from the reader's point of view */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] space-y-1.5 shadow-sm">
                <p className="text-xs font-black text-rose-700">{you} {t('tradeYouGiveVerb')}</p>
                <p className="text-sm font-bold text-slate-900" data-testid="trade-give-summary">
                  {describeGive(iGiveCash, iGiveTiles, iGiveCards, locale)}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] space-y-1.5 shadow-sm">
                <p className="text-xs font-black text-emerald-700">{you} {t('tradeYouGetVerb')}</p>
                <p className="text-sm font-bold text-slate-900" data-testid="trade-get-summary">
                  {describeGive(iGetCash, iGetTiles, iGetCards, locale)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600" data-testid="trade-status">{statusLine}</p>

            {isAdjusting && canAdjust && (
              <div className="p-3.5 rounded-2xl bg-[#faf8f5] border border-amber-300 space-y-3" data-testid="trade-adjust-panel">
                <p className="text-xs font-bold text-amber-900">
                  {t('adjustCashTitle')}
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                  <label className="space-y-1">
                    <span className="block font-medium">{t('youPay')}</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={adjustPay}
                      onChange={e => setAdjustPay(Math.max(0, Number(e.target.value)))}
                      data-testid="trade-adjust-offered"
                      className="w-full bg-white border border-[#e8e2d5] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block font-medium">{t('youReceive')}</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={adjustReceive}
                      onChange={e => setAdjustReceive(Math.max(0, Number(e.target.value)))}
                      data-testid="trade-adjust-requested"
                      className="w-full bg-white border border-[#e8e2d5] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-[11px] font-semibold ${adjustValidation.valid && !adjustUnchanged ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {adjustUnchanged
                      ? t('changeFirst')
                      : adjustValidation.valid
                      ? t('afterAdjust')
                      : adjustValidation.reason}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAdjusting(false)}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-[#e8e2d5]"
                    >
                      {t('tradeCancel')}
                    </button>
                    <button
                      type="button"
                      disabled={!adjustValidation.valid || adjustUnchanged}
                      data-testid="trade-adjust-submit"
                      onClick={() => {
                        soundEffects.click();
                        onCounterTrade?.(adjustedProposal);
                        setIsAdjusting(false);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black transition-all ${
                        adjustValidation.valid && !adjustUnchanged
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 border border-[#e8e2d5] cursor-not-allowed'
                      }`}
                    >
                      {t('sendNewAmount')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {canWithdraw && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    onCancelTrade(trade.id);
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-[#e8e2d5] flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('withdraw')}</span>
                </button>
              )}

              {canRespond && canAdjust && !isAdjusting && (
                <button
                  type="button"
                  data-testid="trade-adjust-btn"
                  onClick={() => {
                    soundEffects.click();
                    setAdjustPay(trade.requestedCash);
                    setAdjustReceive(trade.offeredCash);
                    setIsAdjusting(true);
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
                >
                  {t('adjustCash')}
                </button>
              )}

              {canRespond && (
                <>
                  <button
                    type="button"
                    data-testid="trade-reject-btn"
                    onClick={() => {
                      soundEffects.click();
                      onRejectTrade(trade.id);
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t('reject')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="trade-accept-btn"
                    onClick={() => {
                      soundEffects.buyProperty();
                      onAcceptTrade(trade.id);
                      onClose();
                    }}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('accept')}</span>
                  </button>
                </>
              )}

              {!canRespond && !canWithdraw && <span className="text-xs text-slate-500">{t('tradeWaitingReplyShort')}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Mode 2: build a new proposal. Left = what you give, right = what you get.
  // ---------------------------------------------------------------------------
  if (!activePlayer) return null;
  const partner = opponents.find(p => p.id === partnerId) ?? opponents[0];
  const effectivePartnerId = partner?.id ?? '';

  const isTradable = (tileId: TileId): boolean => {
    const tile = getTileById(tileId);
    if (!tile || !tile.property) return false;
    const districtTiles = getTilesInDistrict(tile.property.districtColor);
    return !districtTiles.some(t => (state.properties[t.id]?.level ?? 0) > 0);
  };

  const myTiles = Object.keys(state.properties)
    .map(Number)
    .filter(tid => state.properties[tid]?.ownerId === activePlayer.id && isTradable(tid));
  const partnerTiles = Object.keys(state.properties)
    .map(Number)
    .filter(tid => partner && state.properties[tid]?.ownerId === partner.id && isTradable(tid));

  const toggle = (tileId: TileId, list: TileId[], setList: (ids: TileId[]) => void) => {
    soundEffects.click();
    setList(list.includes(tileId) ? list.filter(id => id !== tileId) : [...list, tileId]);
  };

  const draft: Proposal = {
    senderPlayerId: activePlayer.id,
    targetPlayerId: effectivePartnerId,
    offeredCash: Math.max(0, Math.floor(giveCash)),
    offeredPropertyIds: givePropertyIds,
    offeredJailCards: giveJailCards,
    requestedCash: Math.max(0, Math.floor(getCash)),
    requestedPropertyIds: getPropertyIds,
    requestedJailCards: getJailCards,
  };
  const validation = validateTradeProposal(state, draft);

  const summary = `${t('tradeSummaryGive')} ${describeGive(draft.offeredCash, draft.offeredPropertyIds, draft.offeredJailCards, locale)} ${t('tradeSummaryGet')} ${describeGive(
    draft.requestedCash,
    draft.requestedPropertyIds,
    draft.requestedJailCards,
    locale
  )}`;

  const cashControls = (value: number, setValue: (v: number) => void, max: number, testId: string) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={max}
        step={10}
        value={value}
        onChange={e => setValue(Math.max(0, Number(e.target.value)))}
        data-testid={testId}
        className="w-28 bg-[#faf8f5] border border-[#e8e2d5] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
      />
      {CASH_STEPS.map(step => (
        <button
          key={step}
          type="button"
          onClick={() => {
            soundEffects.click();
            setValue(Math.min(max, value + step));
          }}
          className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold bg-[#faf8f5] hover:bg-slate-100 text-slate-700 border border-[#e8e2d5]"
        >
          +{step}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setValue(0)}
        className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold bg-white text-slate-500 hover:text-slate-800 border border-[#e8e2d5]"
      >
        {t('clearShort')}
      </button>
    </div>
  );

  const propertyList = (ids: TileId[], selected: TileId[], setSelected: (ids: TileId[]) => void) =>
    ids.length === 0 ? (
      <p className="text-[11px] text-slate-500 italic">{t('noEmptyTiles')}</p>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {ids.map(tid => {
          const tile = getTileById(tid);
          const on = selected.includes(tid);
          return (
            <button
              key={tid}
              type="button"
              onClick={() => toggle(tid, selected, setSelected)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all inline-flex items-center gap-1 ${
                on
                  ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                  : 'bg-[#faf8f5] border-[#e8e2d5] text-slate-700 hover:border-slate-400'
              }`}
            >
              {on && <Check className="w-3 h-3 text-amber-900 inline shrink-0" />}
              <span>{tile ? displayTileName(tile, 'short') : `#${tid}`}</span>
            </button>
          );
        })}
      </div>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      {...backdropProps}
      data-testid="trade-create-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl flex flex-col my-auto text-slate-900"
      >
        <div className="px-5 py-3.5 border-b border-[#e8e2d5] flex items-center justify-between bg-[#faf8f5]">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm sm:text-base font-black text-slate-900">{t('tradeTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl bg-white hover:bg-slate-100 border border-[#e8e2d5] flex items-center justify-center transition-all shadow-sm"
          >
            {t('close')}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 1. Partner */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">{t('tradeStepPartner')}</p>
            <div className="flex flex-wrap gap-2">
              {opponents.map(opp => (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    setPartnerId(opp.id);
                    setGetPropertyIds([]);
                    setGetCash(0);
                    setGetJailCards(0);
                  }}
                  className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    effectivePartnerId === opp.id
                      ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-sm'
                      : 'bg-white text-slate-700 border-[#e8e2d5] hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opp.token.colorHex }} />
                  {opp.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Two sides */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] space-y-3 shadow-sm">
              <p className="text-xs font-black text-rose-700">{t('tradeStepGiveLabel')}</p>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500">{t('cashYouHave')} {formatMoney(activePlayer.cash)})</span>
                {cashControls(giveCash, setGiveCash, activePlayer.cash, 'trade-offered-cash')}
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500">{t('emptyTilesYou')}</span>
                {propertyList(myTiles, givePropertyIds, setGivePropertyIds)}
              </div>
              {(activePlayer.jailFreeCards || 0) > 0 && (
                <label className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    {t('jailCardsYou')} {activePlayer.jailFreeCards})
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={activePlayer.jailFreeCards || 0}
                    value={giveJailCards}
                    onChange={e => setGiveJailCards(Math.max(0, Number(e.target.value)))}
                    className="w-16 bg-[#faf8f5] border border-[#e8e2d5] rounded-lg px-2 py-1 text-center font-bold text-slate-900"
                  />
                </label>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] space-y-3 shadow-sm">
              <p className="text-xs font-black text-amber-800">{t('tradeStepGetLabel')} {partner?.name ?? t('tradePartnerWord')}</p>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500">
                  {t('cashTheyHave')} {formatMoney(partner?.cash ?? 0)})
                </span>
                {cashControls(getCash, setGetCash, partner?.cash ?? 0, 'trade-requested-cash')}
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500">{t('emptyTilesTheirs')}</span>
                {propertyList(partnerTiles, getPropertyIds, setGetPropertyIds)}
              </div>
              {(partner?.jailFreeCards || 0) > 0 && (
                <label className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    {t('jailCardsTheirs')} {partner?.jailFreeCards})
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={partner?.jailFreeCards || 0}
                    value={getJailCards}
                    onChange={e => setGetJailCards(Math.max(0, Number(e.target.value)))}
                    className="w-16 bg-[#faf8f5] border border-[#e8e2d5] rounded-lg px-2 py-1 text-center font-bold text-slate-900"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 3. Summary + submit */}
          <div className="p-3.5 rounded-2xl bg-[#faf8f5] border border-[#e8e2d5] space-y-2">
            <p className="text-xs text-slate-800 font-medium" data-testid="trade-summary">{summary}</p>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className={`text-[11px] font-semibold ${validation.valid ? 'text-emerald-700' : 'text-amber-800'}`}>
                {validation.valid
                  ? t('validTrade')
                  : validation.reason}
              </span>
              <button
                type="button"
                disabled={!validation.valid}
                data-testid="trade-submit-btn"
                onClick={() => {
                  if (validation.valid) {
                    soundEffects.click();
                    onProposeTrade(draft);
                  }
                }}
                className={`min-h-[44px] px-5 py-2.5 rounded-xl font-black text-xs tracking-wide shrink-0 transition-all ${
                  validation.valid
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-[#e8e2d5] cursor-not-allowed'
                }`}
              >
                {t('sendOffer')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
