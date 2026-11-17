import React from 'react';
import { formatMoney } from '../../utils/money';
import { BoardTile, GameState } from '../../game/types';
import { displayTileName } from '../../worlds/runtime';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import { useModalDismiss } from '../common/useModalDismiss';
import {
  canBuyProperty,
  canDowngradeProperty,
  canSellProperty,
  canUpgradeProperty,
  getBuyPrice,
  getLandSellValue,
  getUpgradeCost,
  getRentEscalationMultiplier,
  canMortgageProperty,
  canUnmortgageProperty,
  hasDistrictMonopoly,
  getTilesInDistrict,
  getMortgageValue,
  getUnmortgageCost,
} from '../../game/property/propertyEngine';
import {
  X,
  ShoppingCart,
  ArrowUpCircle,
  ArrowDownCircle,
  Banknote,
  CreditCard,
  Building,
  Sparkles,
} from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface PropertyDetailModalProps {
  tile: BoardTile | null;
  state: GameState;
  onClose: () => void;
  onBuy: (tileId: number) => void;
  onUpgrade: (tileId: number) => void;
  onDowngrade?: (tileId: number) => void;
  onSell?: (tileId: number) => void;
  onMortgage?: (tileId: number) => void;
  onUnmortgage?: (tileId: number) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  tile,
  state,
  onClose,
  onBuy,
  onUpgrade,
  onDowngrade,
  onSell,
  onMortgage,
  onUnmortgage,
}) => {
  const [confirmingSell, setConfirmingSell] = React.useState(false);
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  React.useEffect(() => {
    setConfirmingSell(false);
  }, [tile?.id]);

  if (!tile) return null;

  const isProperty =
    (tile.type === 'PROPERTY' || tile.type === 'TRANSPORT' || tile.type === 'UTILITY') &&
    !!tile.property;

  const ownership = isProperty ? state.properties[tile.id] : undefined;
  const owner = ownership?.ownerId ? state.players.find((p) => p.id === ownership.ownerId) : null;
  const activePlayer = state.players[state.activePlayerIndex];
  const isStandingHere = activePlayer?.position === tile.id;
  const isOwner = activePlayer && owner?.id === activePlayer.id;

  const buyCheck = isProperty
    ? canBuyProperty(tile.id, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state)
    : { canBuy: false };

  const upgradeCheck = isProperty
    ? canUpgradeProperty(tile.id, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state)
    : { canUpgrade: false };

  const downgradeCheck = isProperty
    ? canDowngradeProperty(tile.id, activePlayer.id, state.properties, state.roundNumber, state)
    : { canDowngrade: false, refundAmount: 0 };

  const sellCheck = isProperty
    ? canSellProperty(tile.id, activePlayer.id, state.properties, state.chaosModifiers, state.roundNumber, state)
    : { canSell: false, sellValue: 0 };

  const mortgageCheck = isProperty
    ? canMortgageProperty(tile.id, activePlayer.id, state.properties, state.chaosModifiers, state, state.roundNumber)
    : { canMortgage: false };

  const unmortgageCheck = isProperty
    ? canUnmortgageProperty(tile.id, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state, state.roundNumber)
    : { canUnmortgage: false };

  // District monopoly breakdown
  const districtTiles = isProperty && tile.property ? getTilesInDistrict(tile.property.districtColor) : [];
  const isMonopoly =
    isProperty && owner && tile.property
      ? hasDistrictMonopoly(tile.property.districtColor, owner.id, state.properties)
      : false;

  const marketBuyPrice = isProperty ? getBuyPrice(tile.id, state.roundNumber, state) : 0;
  const marketUpgradeCost = isProperty ? getUpgradeCost(tile.id, state.roundNumber, state) : 0;
  const mortgageVal = isProperty ? getMortgageValue(tile.id, state.chaosModifiers, state, state.roundNumber) : 0;
  const rentEscalation = getRentEscalationMultiplier(state.roundNumber);
  const unmortgageCost = isProperty ? getUnmortgageCost(tile.id, state.chaosModifiers, state, state.roundNumber) : 0;
  const sellLandVal = isProperty ? getLandSellValue(tile.id, state.properties, state.roundNumber, state, state.chaosModifiers) : 0;

  const currentLevel = ownership?.level ?? 0;
  const isMortgaged = ownership?.isMortgaged ?? false;

  const { backdropProps } = useModalDismiss({
    isOpen: Boolean(tile),
    onClose,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      {...backdropProps}
      data-testid="property-detail-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 relative my-auto max-h-[90vh] overflow-y-auto text-slate-900"
      >
        {/* Close Button */}
        <button
          onClick={() => {
            soundEffects.click();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tile Header */}
        <div className="flex flex-col items-center text-center pt-1">
          {isProperty && tile.property && (
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2 shadow-sm">
              {tile.property.district}
            </span>
          )}
          <h3 className="text-lg sm:text-xl font-black text-slate-900">{displayTileName(tile, 'full')}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">{tile.description}</p>
        </div>

        {/* Property Specific Details */}
        {isProperty && tile.property && (
          <div className="space-y-3">
            {/* Price & Owner Status */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">{t('listedPriceLabel')}</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">
                  {formatMoney(marketBuyPrice)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">{t('ownerLabel')}</span>
                <span className="text-sm font-bold text-slate-900 truncate block flex items-center gap-1.5 mt-0.5">
                  {owner ? (
                    <>
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0 ring-1 ring-black/10"
                        style={{ backgroundColor: owner.token.colorHex }}
                      ></span>
                      <span className="truncate">{owner.name}</span>
                    </>
                  ) : (
                    <span className="text-slate-400 italic">{t('unownedBank')}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Monopoly & District Status */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-bold flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-600" />
                  {t('districtLabel')} {tile.property.district}
                </span>
                {isMonopoly ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-black text-[10px] animate-pulse">
                    ✨ {t('monopolyBadge')}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">{t('noMonopolyYet')}</span>
                )}
              </div>

              {/* District properties ownership status chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {districtTiles.map((dt) => {
                  const dtOwner = state.properties[dt.id]?.ownerId
                    ? state.players.find((p) => p.id === state.properties[dt.id]?.ownerId)
                    : null;
                  return (
                    <span
                      key={dt.id}
                      className={`text-[9px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        dt.id === tile.id ? 'ring-1 ring-emerald-500 bg-white font-bold' : ''
                      } ${
                        dtOwner
                          ? 'bg-white text-slate-800 border-slate-300 shadow-sm'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {displayTileName(dt, 'short')}
                      {dtOwner && (
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: dtOwner.token.colorHex }}
                        ></span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Full 5-Tier Rent Breakdown */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-slate-800 font-extrabold uppercase text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {t('rentTableTitle')} ({tile.property.district})
                </span>
                {isMortgaged && (
                  <span className="text-[10px] font-black text-red-600 px-1.5 py-0.5 rounded bg-red-50 border border-red-200">
                    {t('mortgagedNoRent')}
                  </span>
                )}
              </div>

              {/* Base Rent */}
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  currentLevel === 0 && !isMonopoly && !isMortgaged ? 'bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-300' : 'text-slate-700'
                }`}
              >
                <span>{t('vacantBaseRent')}</span>
                <span className="font-extrabold text-emerald-700">{formatMoney(tile.property.baseRent)}</span>
              </div>

              {/* Monopoly 2x */}
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  currentLevel === 0 && isMonopoly && !isMortgaged ? 'bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-300' : 'text-slate-700'
                }`}
              >
                <span>{t('districtMonopolyX2')}</span>
                <span className="font-extrabold text-amber-800">{formatMoney(tile.property.baseRent * 2)}</span>
              </div>

              {/* House Rent Tiers (Up to 5) */}
              {tile.property.houseRent.map((rent, idx) => {
                const levelNum = idx + 1;
                const isCurrent = currentLevel === levelNum && !isMortgaged;
                const label =
                  levelNum === 5
                    ? `🏙️ ${t('apexLandmarkLevel')}`
                    : `${'⭐'.repeat(levelNum)} ${t('level')} ${levelNum}`;

                return (
                  <div
                    key={idx}
                    className={`flex justify-between py-0.5 px-1.5 rounded ${
                      isCurrent ? 'bg-indigo-50 text-indigo-900 font-bold ring-1 ring-indigo-300' : 'text-slate-700'
                    }`}
                  >
                    <span>{label}:</span>
                    <span className="font-extrabold text-indigo-700">{formatMoney(rent)}</span>
                  </div>
                );
              })}

              {tile.property.upgradeCost > 0 && (
                <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                  <span>{t('costPerUpgrade')}</span>
                  <span className="font-bold text-amber-700">{formatMoney(marketUpgradeCost)}</span>
                </div>
              )}

              {rentEscalation > 1 && (
                <div className="pt-1 text-[11px] text-amber-700 font-semibold" data-testid="rent-escalation-note">
                  {t('rentEscalating')}{rentEscalation.toFixed(2)} {t('rentEscalatingTail')} {state.roundNumber}. {t('rentEscalatingNote')}
                </div>
              )}
            </div>

            {/* Mortgage & Value Info */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-500 block font-medium">{t('mortgageValueLabel')}</span>
                <span className="font-extrabold text-amber-800 text-xs">+{formatMoney(mortgageVal)}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">{t('unmortgageFeeLabel')}</span>
                <span className="font-extrabold text-slate-700 text-xs">-{formatMoney(unmortgageCost)}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">{t('sellLandValueLabel')}</span>
                <span className="font-extrabold text-emerald-700 text-xs">+{formatMoney(sellLandVal)}</span>
              </div>
            </div>

            {/* In-modal Direct Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* Buy Button */}
              {isStandingHere && !owner && state.turnPhase === 'ACTION_MENU' && (
                <button
                  onClick={() => {
                    soundEffects.click();
                    onBuy(tile.id);
                    onClose();
                  }}
                  disabled={!buyCheck.canBuy}
                  className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    buyCheck.canBuy
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-600/20 active:scale-95'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{t('buyThisProperty')} ({formatMoney(marketBuyPrice)})</span>
                </button>
              )}

              {/* Upgrade Button */}
              {isOwner && currentLevel < (tile.property.maxLevel || 5) && !isMortgaged && (
                <button
                  onClick={() => {
                    soundEffects.click();
                    onUpgrade(tile.id);
                  }}
                  disabled={!upgradeCheck.canUpgrade}
                  className={`w-full py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    upgradeCheck.canUpgrade
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md active:scale-95'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                  title={upgradeCheck.reason}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>{t('upgradeThisProperty')} ({formatMoney(marketUpgradeCost)})</span>
                </button>
              )}

              {/* Downgrade Building Button */}
              {isOwner && downgradeCheck.canDowngrade && onDowngrade && (
                <button
                  onClick={() => {
                    soundEffects.click();
                    onDowngrade(tile.id);
                  }}
                  className="w-full py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 active:scale-95 transition-all"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>{t('downgradeThisProperty')} (+{formatMoney(downgradeCheck.refundAmount)})</span>
                </button>
              )}

              {/* Mortgage / Unmortgage Button */}
              {isOwner && !isMortgaged && (
                <button
                  onClick={() => {
                    soundEffects.click();
                    onMortgage?.(tile.id);
                  }}
                  disabled={!mortgageCheck.canMortgage}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    mortgageCheck.canMortgage
                      ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 active:scale-95'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                  title={'reason' in mortgageCheck ? mortgageCheck.reason : undefined}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t('mortgageThisTile')} (+{formatMoney(mortgageVal)})</span>
                </button>
              )}

              {isOwner && isMortgaged && (
                <button
                  onClick={() => {
                    soundEffects.click();
                    onUnmortgage?.(tile.id);
                  }}
                  disabled={!unmortgageCheck.canUnmortgage}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    unmortgageCheck.canUnmortgage
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 active:scale-95'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                  title={'reason' in unmortgageCheck ? unmortgageCheck.reason : undefined}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t('redeemThisTile')} (-{formatMoney(unmortgageCost)})</span>
                </button>
              )}

              {/* Sell Vacant Land Back to Bank (2-click safety confirm) */}
              {isOwner && onSell && sellCheck.canSell && sellCheck.sellValue > 0 && (
                !confirmingSell ? (
                  <button
                    type="button"
                    data-testid="property-sell-land-btn"
                    onClick={() => {
                      soundEffects.click();
                      setConfirmingSell(true);
                    }}
                    className="w-full py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 active:scale-95 transition-all"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>{t('sellLandThisTile')} (+{formatMoney(sellCheck.sellValue)})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingSell(false)}
                      className="flex-1 py-2.5 rounded-2xl font-bold text-xs uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
                    >
                      {t('back')}
                    </button>
                    <button
                      type="button"
                      data-testid="property-sell-land-confirm-btn"
                      onClick={() => {
                        soundEffects.click();
                        onSell(tile.id);
                        setConfirmingSell(false);
                        onClose();
                      }}
                      className="flex-[2] py-2.5 rounded-2xl font-black text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-md active:scale-95 transition-all"
                    >
                      {t('confirmSellLand')} (+{formatMoney(sellCheck.sellValue)})
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Non-property tile info */}
        {!isProperty && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <span className="font-bold text-slate-900 block">{t('tileTypeLabel')} {tile.type}</span>
            <p>{tile.description}</p>
          </div>
        )}

        <button
          onClick={() => {
            soundEffects.click();
            onClose();
          }}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase border border-slate-200 transition-all shadow-sm"
        >
          {t('closeUpperCase')}
        </button>
      </div>
    </div>
  );
};

