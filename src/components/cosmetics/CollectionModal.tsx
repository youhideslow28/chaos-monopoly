import React, { useState } from 'react';
import { COSMETICS_CATALOG } from '../../cosmetics/catalog';
import {
  equipCosmetic,
  usePlayerProfile,
} from '../../cosmetics/storage';
import { useModalDismiss } from '../common/useModalDismiss';
import {
  CosmeticCategory,
  CosmeticItem,
} from '../../cosmetics/types';
import { soundEffects } from '../../game/sound/soundEngine';
import { getLocale, COSMETIC_UI } from '../../worlds/i18n';
import {
  Sparkles,
  X,
  Check,
  Lock,
  User,
  Shirt,
  Dog,
  Dices,
  Car,
  Zap,
  Smile,
  ChevronRight,
  Palette,
  Coins,
} from 'lucide-react';

interface CollectionModalProps {
  onClose: () => void;
  onOpenShop?: () => void;
}

const CATEGORY_TABS: Array<{
  id: CosmeticCategory;
  nameKey: keyof typeof COSMETIC_UI;
  icon: React.ReactNode;
}> = [
  { id: 'CHARACTER', nameKey: 'characters', icon: <User className="w-4 h-4" /> },
  { id: 'OUTFIT', nameKey: 'outfits', icon: <Shirt className="w-4 h-4" /> },
  { id: 'PET', nameKey: 'pets', icon: <Dog className="w-4 h-4" /> },
  { id: 'DICE', nameKey: 'diceSkins', icon: <Dices className="w-4 h-4" /> },
  { id: 'TOKEN', nameKey: 'tokens', icon: <Car className="w-4 h-4" /> },
  { id: 'EFFECT', nameKey: 'effects', icon: <Zap className="w-4 h-4" /> },
  { id: 'EMOTE', nameKey: 'emotes', icon: <Smile className="w-4 h-4" /> },
];

export const CollectionModal: React.FC<CollectionModalProps> = ({
  onClose,
  onOpenShop,
}) => {
  const profile = usePlayerProfile();
  const locale = getLocale();
  const t = (key: keyof typeof COSMETIC_UI) => COSMETIC_UI[key][locale];
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory>('CHARACTER');
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);

  const itemsInCategory = COSMETICS_CATALOG.filter(c => c.category === activeCategory);

  const getEquippedIdForCategory = (cat: CosmeticCategory): string => {
    switch (cat) {
      case 'CHARACTER':
        return profile.cosmetics.characterId;
      case 'OUTFIT':
        return profile.cosmetics.outfitId;
      case 'PET':
        return profile.cosmetics.petId;
      case 'DICE':
        return profile.cosmetics.diceSkinId;
      case 'TOKEN':
        return profile.cosmetics.tokenId;
      case 'EFFECT':
        return profile.cosmetics.effectId;
      default:
        return '';
    }
  };

  const equippedId = getEquippedIdForCategory(activeCategory);
  const activeDetailItem = selectedItem || itemsInCategory[0] || null;
  const isDetailOwned = activeDetailItem ? profile.inventory.includes(activeDetailItem.id) : false;
  const isDetailEquipped = activeDetailItem ? equippedId === activeDetailItem.id : false;

  const handleEquip = (item: CosmeticItem) => {
    soundEffects.click();
    equipCosmetic(item.category, item.id);
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
      data-testid="collection-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-4 sm:p-6 flex flex-col gap-4 relative z-10 my-auto max-h-[92vh] overflow-y-auto text-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8e2d5]">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold">
              <Palette className="w-3.5 h-3.5 text-amber-700" />
              <span>{COSMETIC_UI.collection[locale]}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
              {COSMETIC_UI.collection[locale]}
            </h2>
            <p className="text-xs text-slate-500">
              {COSMETIC_UI.collectionSubtitle[locale]}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#e8e2d5] text-amber-700 font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
              <Coins className="w-4 h-4 text-amber-600 shrink-0" />
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

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map(tab => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEffects.click();
                  setActiveCategory(tab.id);
                  setSelectedItem(null);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm font-black'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e8e2d5]'
                }`}
              >
                {tab.icon}
                <span>{COSMETIC_UI[tab.nameKey][locale]}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content: Items Grid & Detail Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Grid (2 Columns) */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {itemsInCategory.map(item => {
              const isOwned = profile.inventory.includes(item.id);
              const isEquipped = equippedId === item.id;
              const isSelected = activeDetailItem?.id === item.id;
              const badgeClass = WARM_RARITY_BADGES[item.rarity] || 'bg-slate-100 text-slate-700 border-[#e8e2d5]';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    soundEffects.click();
                    setSelectedItem(item);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 text-left bg-white shadow-sm ${
                    isSelected
                      ? 'ring-2 ring-amber-500 scale-[1.02] border-amber-400'
                      : 'border-[#e8e2d5] hover:border-slate-400'
                  }`}
                  data-testid={`cosmetic-card-${item.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      {item.rarity}
                    </span>
                    {isEquipped && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    {!isOwned && (
                      <span className="p-1 rounded-md bg-[#faf8f5] text-slate-400 border border-[#e8e2d5]">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="py-2 text-center">
                    <div
                      className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-xl shadow-inner border border-black/10"
                      style={{ backgroundColor: item.previewColor || '#f1eee7' }}
                    >
                      <Sparkles className="w-6 h-6 text-white drop-shadow-sm" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 block mt-2 truncate">
                      {item.name[locale]}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-[#e8e2d5]">
                    <span>{isEquipped ? t('inUse') : isOwned ? t('owned') : `${item.price.toLocaleString()} Xu`}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detail Panel */}
          {activeDetailItem && (
            <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] flex flex-col justify-between gap-3 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      WARM_RARITY_BADGES[activeDetailItem.rarity] || 'bg-slate-100 text-slate-700 border-[#e8e2d5]'
                    }`}
                  >
                    {activeDetailItem.rarity}
                  </span>
                  {activeDetailItem.worldTheme && (
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {t('worldLabel')}: {activeDetailItem.worldTheme}
                    </span>
                  )}
                </div>

                <div
                  className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-3xl shadow-inner border border-black/10 my-2"
                  style={{ backgroundColor: activeDetailItem.previewColor || '#f1eee7' }}
                >
                  <Sparkles className="w-10 h-10 text-white drop-shadow-sm" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-black text-slate-900">
                    {activeDetailItem.name[locale]}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeDetailItem.description[locale]}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#faf8f5] border border-[#e8e2d5] text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block">{t('unlockCondition')}</span>
                  <p className="text-amber-800 font-medium">{activeDetailItem.unlockCondition[locale]}</p>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isDetailOwned ? (
                  <button
                    type="button"
                    disabled={isDetailEquipped}
                    onClick={() => handleEquip(activeDetailItem)}
                    data-testid="equip-cosmetic-btn"
                    className={`w-full min-h-[44px] py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      isDetailEquipped
                        ? 'bg-slate-100 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isDetailEquipped
                        ? COSMETIC_UI.equipped[locale]
                        : COSMETIC_UI.equip[locale]}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      onOpenShop?.();
                    }}
                    className="w-full min-h-[44px] py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-white shadow-sm active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{t('unlockInShop')} ({activeDetailItem.price.toLocaleString()} Xu)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
