import { formatMoney } from '../../utils/money';
import React, { useState } from 'react';
import { ACHIEVEMENTS_CATALOG } from '../../cosmetics/progression';
import { getCosmeticItem } from '../../cosmetics/catalog';
import {
  getXpRequiredForLevel,
  updateDisplayName,
  usePlayerProfile,
} from '../../cosmetics/storage';
import { useModalDismiss } from '../common/useModalDismiss';
import { soundEffects } from '../../game/sound/soundEngine';
import { getLocale, COSMETIC_UI } from '../../worlds/i18n';
import {
  User,
  X,
  Trophy,
  BarChart3,
  Award,
  Edit2,
  Check,
  Sparkles,
  Shield,
  Dices,
  Flame,
  Coins,
} from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
  onOpenCollection?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  onClose,
  onOpenCollection,
}) => {
  const profile = usePlayerProfile();
  const locale = getLocale();
  const t = (key: keyof typeof COSMETIC_UI) => COSMETIC_UI[key][locale];
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STATS' | 'ACHIEVEMENTS'>('OVERVIEW');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);

  const xpRequired = getXpRequiredForLevel(profile.level);
  const xpPercent = Math.min(100, Math.round((profile.xp / xpRequired) * 100));

  const winRate =
    profile.stats.matchesPlayed > 0
      ? Math.round((profile.stats.matchesWon / profile.stats.matchesPlayed) * 100)
      : 0;

  const equippedChar = getCosmeticItem(profile.cosmetics.characterId);
  const equippedOutfit = getCosmeticItem(profile.cosmetics.outfitId);
  const equippedPet = getCosmeticItem(profile.cosmetics.petId);
  const equippedDice = getCosmeticItem(profile.cosmetics.diceSkinId);
  const equippedToken = getCosmeticItem(profile.cosmetics.tokenId);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      soundEffects.click();
      updateDisplayName(nameInput);
      setEditingName(false);
    }
  };

  const { backdropProps } = useModalDismiss({
    isOpen: true,
    onClose,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      {...backdropProps}
      data-testid="profile-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-5 sm:p-6 flex flex-col gap-4 relative z-10 my-auto max-h-[92vh] overflow-y-auto text-slate-900"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8e2d5]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-black shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
                {COSMETIC_UI.profile[locale]}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {profile.id} • {COSMETIC_UI.guestSession[locale]}
              </span>
            </div>
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

        {/* Player Identity Summary Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-black/10 shrink-0"
              style={{ backgroundColor: equippedChar?.previewColor || '#f59e0b' }}
            >
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      maxLength={24}
                      className="bg-[#faf8f5] border border-[#e8e2d5] rounded-lg px-2.5 py-1 text-sm font-black text-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">{profile.displayName}</span>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="p-1 min-w-[32px] min-h-[32px] rounded-md text-slate-400 hover:text-amber-700 flex items-center justify-center"
                      title={t('renameTitle')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                  {COSMETIC_UI.level[locale]} {profile.level}
                </span>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full sm:w-64 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>
                    XP: {profile.xp} / {xpRequired}
                  </span>
                  <span>{xpPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-[#e8e2d5]">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#e8e2d5] text-center shadow-sm">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">
                Chaos Coins
              </span>
              <span className="text-base font-black text-amber-700 flex items-center justify-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{profile.chaosCoins.toLocaleString()}</span>
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#faf8f5] border border-[#e8e2d5] text-center shadow-sm">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">{t('winRate')}</span>
              <span className="text-base font-black text-emerald-700">{winRate}%</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-[#f0eae1] border border-[#e8e2d5]">
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setActiveTab('OVERVIEW');
            }}
            className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-slate-900 font-black shadow-sm border border-[#e8e2d5]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t('currentLoadout')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setActiveTab('STATS');
            }}
            className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'STATS'
                ? 'bg-white text-slate-900 font-black shadow-sm border border-[#e8e2d5]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{COSMETIC_UI.careerStats[locale]}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setActiveTab('ACHIEVEMENTS');
            }}
            className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ACHIEVEMENTS'
                ? 'bg-white text-slate-900 font-black shadow-sm border border-[#e8e2d5]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>
              {COSMETIC_UI.achievements[locale]} ({profile.unlockedAchievements.length}/
              {ACHIEVEMENTS_CATALOG.length})
            </span>
          </button>
        </div>

        {/* Tab 1: Equipped Loadout Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: t('characters'), item: equippedChar, icon: <User className="w-4 h-4 text-blue-600" /> },
                { label: t('outfits'), item: equippedOutfit, icon: <Sparkles className="w-4 h-4 text-purple-600" /> },
                { label: t('pets'), item: equippedPet, icon: <Flame className="w-4 h-4 text-amber-600" /> },
                { label: t('diceSkins'), item: equippedDice, icon: <Dices className="w-4 h-4 text-emerald-600" /> },
                { label: t('tokens'), item: equippedToken, icon: <Shield className="w-4 h-4 text-indigo-600" /> },
              ].map(({ label, item, icon }, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white border border-[#e8e2d5] space-y-1 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                    {icon}
                    <span>{label}</span>
                  </div>
                  <span className="font-black text-xs text-slate-900 block truncate">
                    {item?.name[locale] || t('defaultWord')}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold block truncate">
                    {item?.rarity || 'COMMON'}
                  </span>
                </div>
              ))}
            </div>

            {onOpenCollection && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.click();
                  onOpenCollection();
                }}
                className="w-full min-h-[44px] py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-slate-50 text-slate-800 border border-[#e8e2d5] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>{t('editWardrobe')} →</span>
              </button>
            )}
          </div>
        )}

        {/* Tab 2: Career Statistics */}
        {activeTab === 'STATS' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {[
              { label: COSMETIC_UI.matchesPlayed[locale], val: profile.stats.matchesPlayed },
              { label: COSMETIC_UI.matchesWon[locale], val: profile.stats.matchesWon },
              { label: COSMETIC_UI.winRate[locale], val: `${winRate}%` },
              { label: COSMETIC_UI.winStreak[locale], val: profile.stats.winStreak },
              { label: COSMETIC_UI.bestStreak[locale], val: profile.stats.bestWinStreak },
              { label: COSMETIC_UI.propertiesBought[locale], val: profile.stats.propertiesBought },
              { label: COSMETIC_UI.upgradesConstructed[locale], val: profile.stats.upgradesConstructed },
              { label: COSMETIC_UI.auctionsWon[locale], val: profile.stats.auctionsWon },
              { label: COSMETIC_UI.tradesCompleted[locale], val: profile.stats.tradesCompleted },
              { label: COSMETIC_UI.chaosSurvived[locale], val: profile.stats.chaosEventsSurvived },
              { label: COSMETIC_UI.highestNetWorth[locale], val: formatMoney(profile.stats.highestNetWorth) },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white border border-[#e8e2d5] text-center shadow-sm"
              >
                <span className="text-[10px] text-slate-500 block font-bold truncate">
                  {stat.label}
                </span>
                <span className="text-base font-black text-slate-900 block mt-0.5">
                  {stat.val}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Achievements */}
        {activeTab === 'ACHIEVEMENTS' && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {ACHIEVEMENTS_CATALOG.map(ach => {
              const isUnlocked = profile.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isUnlocked
                      ? 'bg-white border-amber-300 shadow-sm'
                      : 'bg-[#faf8f5] border-[#e8e2d5] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                        isUnlocked
                          ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">
                          {ach.name[locale]}
                        </span>
                        {isUnlocked && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold">
                            {t('equipped')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {ach.description[locale]}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-blue-700 block font-bold">
                      +{ach.xpReward} XP
                    </span>
                    <span className="text-[10px] text-amber-700 flex items-center justify-end gap-1 font-bold">
                      +{ach.coinReward} <Coins className="w-3 h-3 text-amber-600 inline shrink-0" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
