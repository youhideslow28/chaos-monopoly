/**
 * CHAOS MONOPOLY — Debt Settlement & Liquidation Modal (Warm Premium Edition)
 * Explicit Bankruptcy Safety:
 * 1. Shows amount owed, cash available, and shortfall.
 * 2. Presents legally available liquidation options (downgrade buildings, mortgage properties).
 * 3. Two-step explicit bankruptcy confirmation: "Bạn có chắc chắn muốn xác nhận phá sản?"
 */

import React, { useState } from 'react';
import { GameState, TileId } from '../../game/types';
import { formatMoney } from '../../utils/money';
import {
  getTileById,
  canDowngradeProperty,
  canMortgageProperty,
  canSellProperty,
} from '../../game/property/propertyEngine';
import { calculateMaxLiquidationValue } from '../../game/economy/economyEngine';
import { displayTileName } from '../../worlds/runtime';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import { useModalDismiss } from '../common/useModalDismiss';
import { AlertTriangle, DollarSign, Skull } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface DebtSettlementModalProps {
  state: GameState;
  onDowngradeProperty: (tileId: TileId) => void;
  onSellProperty?: (tileId: TileId) => void;
  onMortgageProperty: (tileId: TileId) => void;
  onSettleDebt: () => void;
  onSettlePartialDebt: (amount?: number) => void;
  onDeclareBankruptcy: () => void;
}

export const DebtSettlementModal: React.FC<DebtSettlementModalProps> = ({
  state,
  onDowngradeProperty,
  onSellProperty,
  onMortgageProperty,
  onSettleDebt,
  onSettlePartialDebt,
  onDeclareBankruptcy,
}) => {
  const [confirmingBankruptcy, setConfirmingBankruptcy] = useState<boolean>(false);
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  const isDebtPhase =
    state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION';
  const debt = state.pendingDebt;

  if (!isDebtPhase || !debt) return null;

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.isBankrupt) return null;

  const creditor = debt.creditorPlayerId
    ? state.players.find((p) => p.id === debt.creditorPlayerId)
    : null;

  const ownedTileIds = Object.keys(state.properties)
    .map(Number)
    .filter((tid) => state.properties[tid]?.ownerId === activePlayer.id);

  const shortfall = Math.max(0, debt.amount - activePlayer.cash);
  const canPayFull = activePlayer.cash >= debt.amount;
  const canPayPartial = !canPayFull && activePlayer.cash > 0;

  // Calculate potential cash that could be raised from remaining valid options (synced with world & round rules)
  const totalLiquidationPotential = Math.max(
    0,
    calculateMaxLiquidationValue(
      activePlayer,
      state.properties,
      state.chaosModifiers,
      state.roundNumber,
      state
    ) - activePlayer.cash
  );

  const hasLiquidationOptions = totalLiquidationPotential > 0;

  const { backdropProps } = useModalDismiss({
    isOpen: Boolean(isDebtPhase && debt),
    disableBackdropClick: true,
    disableEscape: true,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      {...backdropProps}
      data-testid="debt-settlement-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl overflow-hidden flex flex-col text-slate-900"
      >
        {/* Alert Header */}
        <div className="bg-red-700 px-5 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">
              {t('debtTitle')}
            </h2>
          </div>
          <span className="text-xs font-black bg-white/20 px-2.5 py-0.5 rounded-full">
            {activePlayer.name}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Debt Summary Box with Shortfall */}
          <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-red-700 uppercase">{t('mandatoryDebt')}:</span>
              <p className="text-sm font-black text-slate-900">{debt.reason}</p>
              <span className="text-xs text-slate-500 block">
                {t('creditorLabel')}: <strong className="text-slate-800">{creditor ? creditor.name : t('centralBank')}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <div className="text-right bg-[#faf8f5] px-3 py-1.5 rounded-xl border border-[#e8e2d5]">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">{t('needToPay')}</span>
                <span className="text-base font-black text-red-700" data-testid="debt-amount">
                  {formatMoney(debt.amount)}
                </span>
              </div>
              <div className="text-right bg-[#faf8f5] px-3 py-1.5 rounded-xl border border-[#e8e2d5]">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">{t('cashOnHand')}</span>
                <span className="text-base font-black text-emerald-800" data-testid="debt-player-cash">
                  {formatMoney(activePlayer.cash)}
                </span>
              </div>
              {shortfall > 0 && (
                <div className="text-right bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-300">
                  <span className="text-[10px] text-amber-800 uppercase block font-bold">{t('shortfallLabel')}</span>
                  <span className="text-base font-black text-amber-900">
                    {formatMoney(shortfall)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Asset Liquidation Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                {t('raiseCashWays')}:
              </span>
              <span className="text-[11px] text-slate-500">
                {t('payoutPotential')}: <strong className="text-amber-800">{formatMoney(totalLiquidationPotential)}</strong>
              </span>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {ownedTileIds.length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-[#e8e2d5] text-center text-xs text-slate-500">
                  {t('noAssetsToLiquidate')}
                </div>
              ) : (
                ownedTileIds.map((tid) => {
                  const tile = getTileById(tid);
                  const prop = state.properties[tid];
                  if (!tile || !prop) return null;

                  const downgradeCheck = canDowngradeProperty(
                    tid,
                    activePlayer.id,
                    state.properties,
                    state.roundNumber,
                    state
                  );
                  const mortgageCheck = canMortgageProperty(
                    tid,
                    activePlayer.id,
                    state.properties,
                    state.chaosModifiers,
                    state,
                    state.roundNumber
                  );
                  const sellCheck = canSellProperty(
                    tid,
                    activePlayer.id,
                    state.properties,
                    state.chaosModifiers,
                    state.roundNumber,
                    state
                  );
                  const canDown = downgradeCheck.canDowngrade;
                  const canMort = mortgageCheck.canMortgage;
                  const canSell = Boolean(onSellProperty) && sellCheck.canSell && sellCheck.sellValue > 0;
                  const refundAmount = downgradeCheck.refundAmount;
                  const mortgageVal = mortgageCheck.mortgageValue;
                  const sellVal = sellCheck.sellValue;

                  return (
                    <div
                      key={tid}
                      className="p-3 rounded-2xl bg-white border border-[#e8e2d5] flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block truncate">
                          #{tid} {displayTileName(tile, 'full')}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {prop.level > 0 ? (
                            `${t('level')} ${prop.level} (${prop.level === 5 ? t('hotelWord') : t('houseWord')})`
                          ) : prop.isMortgaged ? (
                            <span className="text-red-600 font-bold">{t('mortgaged')}</span>
                          ) : (
                            t('vacantLand')
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                        {canDown && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.click();
                              onDowngradeProperty(tid);
                            }}
                            className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all"
                          >
                            {t('sellOneLevel')} (+{formatMoney(refundAmount)})
                          </button>
                        )}

                        {canMort && !prop.isMortgaged && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.click();
                              onMortgageProperty(tid);
                            }}
                            className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all"
                          >
                            {t('mortgage')} (+{formatMoney(mortgageVal)})
                          </button>
                        )}

                        {canSell && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.click();
                              onSellProperty?.(tid);
                            }}
                            className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-all"
                          >
                            {t('sellLandBtn')} (+{formatMoney(sellVal)})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#e8e2d5]">
            {/* Bankruptcy Button (Opens explicit 2-step confirmation) */}
            <button
              type="button"
              data-testid="debt-bankrupt-btn"
              onClick={() => setConfirmingBankruptcy(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-red-50 text-red-700 border border-[#e8e2d5] hover:border-red-300 flex items-center gap-1.5 transition-all"
            >
              <Skull className="w-4 h-4 text-red-600" />
              <span>{t('declareBankruptcyBtn')}</span>
            </button>

            <div className="flex items-center gap-2">
              {canPayPartial && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    onSettlePartialDebt(activePlayer.cash);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-amber-50 text-amber-900 border border-[#e8e2d5] transition-all"
                >
                  {t('payPartial')} ({formatMoney(activePlayer.cash)})
                </button>
              )}

              <button
                type="button"
                disabled={!canPayFull}
                data-testid="debt-pay-full-btn"
                onClick={() => {
                  soundEffects.buyProperty();
                  onSettleDebt();
                }}
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                  canPayFull
                    ? 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>{t('payFull')} ({formatMoney(debt.amount)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Explicit 2-Step Bankruptcy Confirmation Dialog */}
        {confirmingBankruptcy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-5 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  {t('confirmBankruptcy')}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {hasLiquidationOptions ? (
                    <strong className="text-amber-800 flex items-center justify-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 inline" />
                      <span>
                        {t('stillHaveAssets')} ({formatMoney(totalLiquidationPotential)}) {t('mortgagableToPay')}
                      </span>
                    </strong>
                  ) : null}
                  {t('bankruptcyTransfer')}{' '}
                  <strong>{creditor ? creditor.name : t('bankWord')}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingBankruptcy(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-[#e8e2d5] font-bold text-xs text-slate-700 hover:bg-slate-100 transition-all"
                >
                  {t('back')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.payRent();
                    setConfirmingBankruptcy(false);
                    onDeclareBankruptcy();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase shadow-md transition-all"
                >
                  {t('confirmBankrupt')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
