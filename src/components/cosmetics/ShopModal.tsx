import React, { useState } from 'react';
import { COSMETICS_CATALOG } from '../../cosmetics/catalog';
import { purchaseCosmeticItem } from '../../cosmetics/shop';
import { usePlayerProfile } from '../../cosmetics/storage';
import { useModalDismiss } from '../common/useModalDismiss';
import {
  CosmeticCategory,
  CosmeticItem,
} from '../../cosmetics/types';
import { soundEffects } from '../../game/sound/soundEngine';
import { getLocale, COSMETIC_UI } from '../../worlds/i18n';
import {
  ShoppingBag,
  X,
  Check,
  Sparkles,
  Coins,
  ShieldCheck,
  AlertCircle,
  Lightbulb,
  User,
  Shirt,
  Dog,
  Dices,
  Car,
  Zap,
  Smile,
} from 'lucide-react';

interface ShopModalProps {
  onClose: () => void;
  onOpenCollection?: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  onClose,
  onOpenCollection,
}) => {
  const profile = usePlayerProfile();
  const locale = getLocale();
  const t = (key: keyof typeof COSMETIC_UI) => COSMETIC_UI[key][locale];
  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory | 'ALL'>('ALL');
  const [purchaseMessage, setPurchaseMessage] = useState<{
    text: string;
    type: 'SUCCESS' | 'ERROR';
  } | null>(null);

  const shopItems = COSMETICS_CATALOG.filter(c => !c.isDefault && c.price > 0).filter(
    c => selectedCategory === 'ALL' || c.category === selectedCategory
  );

  const handleBuy = (item: CosmeticItem) => {
    soundEffects.click();
    const result = purchaseCosmeticItem(item.id);
    if (result.success) {
      soundEffects.buyProperty();
      setPurchaseMessage({
        text: `${COSMETIC_UI.buySuccess[locale]} [${item.name[locale]}]`,
        type: 'SUCCESS',
      });
    } else {
      setPurchaseMessage({
        text: result.error || t('shopErrorGeneric'),
        type: 'ERROR',
      });
    }
  };

  const { backdropProps } = useModalDismiss({
    isOpen: true,
    onClose,
  });

  const WARM_RARITY_BADGES: Record<string, string> = {
    COMMON: 'bg-slate-100 text-slate-700 border-[#e8e2d5]',
    UNCOMMON: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    RARE: 'bg-blue-50 text-blue-800 border-blue-300',
    EPIC: 'bg-purple-50 text-purple-800 border-purple-300',
    LEGENDARY: 'bg-amber-50 text-amber-900 border-amber-300',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      {...backdropProps}
      data-testid="shop-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-4 sm:p-6 flex flex-col gap-4 relative z-10 my-auto max-h-[92vh] overflow-y-auto text-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8e2d5]">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
              <span>{COSMETIC_UI.shop[locale]}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
              {COSMETIC_UI.shop[locale]}
            </h2>
            <p className="text-xs text-slate-500">
              {COSMETIC_UI.shopSubtitle[locale]}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#e8e2d5] text-amber-700 font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>{profile.chaosCoins.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-normal">Xu</span>
            </div>

            <button
              onClick={() => {
                soundEffects.click();
                onClose();
              }}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-[#e8e2d5] transition-all shadow-sm flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Non-Pay-To-Win Explicit Policy Banner */}
        <div className="p-3 rounded-2xl bg-white border border-[#e8e2d5] text-xs text-slate-700 flex items-start gap-2.5 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {COSMETIC_UI.nonPayToWinNotice[locale]}
          </p>
        </div>

        {/* Feedback Alert Toast */}
        {purchaseMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
              purchaseMessage.type === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-red-50 border-red-300 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {purchaseMessage.type === 'SUCCESS' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{purchaseMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setPurchaseMessage(null)}
              className="text-[10px] underline text-slate-500 hover:text-slate-800"
            >
              {t('closeX')}
            </button>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setSelectedCategory('ALL');
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white font-black shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e8e2d5]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('allWord')}</span>
          </button>
          {(
            [
              ['CHARACTER', 'characters', <User key="user" className="w-3.5 h-3.5" />],
              ['OUTFIT', 'outfits', <Shirt key="shirt" className="w-3.5 h-3.5" />],
              ['PET', 'pets', <Dog key="dog" className="w-3.5 h-3.5" />],
              ['DICE', 'diceSkins', <Dices key="dices" className="w-3.5 h-3.5" />],
              ['TOKEN', 'tokens', <Car key="car" className="w-3.5 h-3.5" />],
              ['EFFECT', 'effects', <Zap key="zap" className="w-3.5 h-3.5" />],
              ['EMOTE', 'emotes', <Smile key="smile" className="w-3.5 h-3.5" />],
            ] as const
          ).map(([cat, key, icon]) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                soundEffects.click();
                setSelectedCategory(cat);
              }}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e8e2d5]'
              }`}
            >
              {icon}
              <span>{COSMETIC_UI[key][locale]}</span>
            </button>
          ))}
        </div>

        {/* Shop Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {shopItems.map(item => {
            const isOwned = profile.inventory.includes(item.id);
            const canAfford = profile.chaosCoins >= item.price;
            const badgeClass = WARM_RARITY_BADGES[item.rarity] || 'bg-slate-100 text-slate-700 border-[#e8e2d5]';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 bg-white border-[#e8e2d5] shadow-sm hover:-translate-y-0.5 hover:shadow-md duration-200 ${
                  isOwned ? 'opacity-70' : 'hover:border-slate-400'
                }`}
                data-testid={`shop-card-${item.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      {item.rarity}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      {item.category}
                    </span>
                  </div>

                  <div className="text-center py-2">
                    <div
                      className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-black/10"
                      style={{ backgroundColor: item.previewColor || '#f1eee7' }}
                    >
                      <Sparkles className="w-7 h-7 text-white drop-shadow-sm" />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 mt-2 truncate">
                      {item.name[locale]}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {item.description[locale]}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#e8e2d5]">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-500">{t('priceLabel')}</span>
                    <span className="text-amber-700 flex items-center gap-1.5 text-sm font-black">
                      <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{item.price.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 font-normal">Xu</span>
                    </span>
                  </div>

                  {isOwned ? (
                    <button
                      type="button"
                      disabled
                      className="w-full min-h-[44px] py-2.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-500 border border-[#e8e2d5] flex items-center justify-center gap-1.5 cursor-default"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{COSMETIC_UI.owned[locale]}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleBuy(item)}
                      data-testid={`buy-btn-${item.id}`}
                      className={`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm active:scale-95'
                          : 'bg-slate-100 text-slate-400 border border-[#e8e2d5] cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>
                        {canAfford
                          ? `${COSMETIC_UI.buy[locale]} (${item.price.toLocaleString()} Xu)`
                          : `${t('notEnoughCoins')} (${item.price.toLocaleString()} Xu)`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e8e2d5] text-xs">
          <span className="text-slate-500 italic flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />
            <span>{t('earnCoinsHint')}</span>
          </span>
          {onOpenCollection && (
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                onOpenCollection();
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold border border-[#e8e2d5] shadow-sm flex items-center justify-center transition-all"
            >
              {t('openWardrobe')} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
