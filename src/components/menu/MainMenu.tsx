import { formatMoney } from '../../utils/money';
/**
 * CHAOS MONOPOLY — Main Menu (Warm Premium + Luxury Editorial Edition)
 * Hybrid 3D Diorama + Minimalist UI with high contrast, warm ivory cardstock,
 * natural wood accents, and clean typography.
 */

import React from 'react';
import { usePlayerProfile } from '../../cosmetics/storage';
import { getCosmeticItem } from '../../cosmetics/catalog';
import { getCatalogEntry } from '../../worlds/catalog';
import { getLocale, setLocale, COSMETIC_UI } from '../../worlds/i18n';
import { soundEffects } from '../../game/sound/soundEngine';
import { SavedMatchData } from '../../game/storage/matchStorage';
import { StoredOnlineCredentials } from '../../multiplayer/client';
import { Menu3DDiorama } from './Menu3DDiorama';
import {
  Play,
  Bot,
  Users,
  PlusCircle,
  Globe,
  Palette,
  User,
  Settings,
  RotateCcw,
  ChevronRight,
  Globe2,
  Crown,
  ShoppingBag,
  Coins,
} from 'lucide-react';

interface MainMenuProps {
  selectedWorldId: string;
  savedMatch?: SavedMatchData | null;
  storedOnlineSession?: StoredOnlineCredentials | null;
  isPlayingActive?: boolean;
  questsSlot?: React.ReactNode;
  onBackToGame?: () => void;
  onQuickPlay: () => void;
  onPlayVsAI: () => void;
  onPlayLocal: () => void;
  onCreateOnlineRoom: () => void;
  onJoinOnlineRoom: () => void;
  onOpenWorldSelection: () => void;
  onOpenCollection: () => void;
  onOpenShop: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onResumeMatch?: () => void;
  onReconnectOnline?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  selectedWorldId,
  savedMatch,
  storedOnlineSession,
  isPlayingActive,
  questsSlot,
  onBackToGame,
  onQuickPlay,
  onPlayVsAI,
  onPlayLocal,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onOpenWorldSelection,
  onOpenCollection,
  onOpenShop,
  onOpenProfile,
  onOpenSettings,
  onResumeMatch,
  onReconnectOnline,
}) => {
  const profile = usePlayerProfile();
  const locale = getLocale();
  const worldEntry = getCatalogEntry(selectedWorldId);
  const equippedChar = getCosmeticItem(profile.cosmetics.characterId);

  return (
    <div
      className="min-h-screen bg-[#faf8f5] text-slate-900 flex flex-col justify-between relative overflow-hidden select-none"
      data-testid="main-menu"
    >
      {/* 3D Diorama Stage Background (Center Ambient Showcase) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-75 z-0">
        <Menu3DDiorama className="w-full max-w-4xl h-[420px] sm:h-[540px] mt-16 sm:mt-20" />
      </div>

      {/* Top Editorial Navigation Bar */}
      <header className="w-full bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#e8e2d5] px-2.5 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-1.5 z-20 relative shadow-sm">
        {/* Brand Focal Point */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-amber-600 via-emerald-600 to-amber-700 p-0.5 shadow-sm">
            <div className="w-full h-full bg-[#fdfbf7] rounded-[14px] flex items-center justify-center">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-xl font-black tracking-wide text-slate-900 font-serif truncate">
                CHAOS MONOPOLY
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 hidden sm:inline-block shrink-0">
                PREMIUM 3D
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {worldEntry?.name[locale] || 'Metropolis'} • {COSMETIC_UI.boardTagline[locale]}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Guest Profile Shortcut */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onOpenProfile();
            }}
            data-testid="main-menu-profile-btn"
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-3.5 sm:py-1.5 min-h-[40px] rounded-xl sm:rounded-2xl bg-white hover:bg-amber-50/50 border border-[#e8e2d5] transition-all text-left shadow-sm group"
            title={profile.displayName}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-sm ring-1 ring-black/10 text-white font-bold group-hover:scale-105 transition-all"
              style={{ backgroundColor: equippedChar?.previewColor || '#059669' }}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-black text-slate-900 group-hover:text-amber-800 truncate max-w-[130px]">
                {profile.displayName}
              </div>
              <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                <span>{COSMETIC_UI.level[locale]} {profile.level} • {profile.chaosCoins.toLocaleString()}</span>
                <Coins className="w-3 h-3 text-amber-600 shrink-0" />
              </div>
            </div>
          </button>

          {/* Collection Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onOpenCollection();
            }}
            data-testid="main-menu-collection-btn"
            className="p-2 sm:px-3 sm:py-1.5 min-h-[40px] rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 shadow-sm hover:bg-amber-50/50 transition-all"
            title={COSMETIC_UI.collectionTooltip[locale]}
          >
            <Palette className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-600" />
            <span className="hidden md:inline">{COSMETIC_UI.collection[locale]}</span>
          </button>

          {/* Shop Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onOpenShop();
            }}
            data-testid="main-menu-shop-btn"
            className="p-2 sm:px-3 sm:py-1.5 min-h-[40px] rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 shadow-sm hover:bg-amber-50/50 transition-all"
            title={COSMETIC_UI.shopTooltip[locale]}
          >
            <ShoppingBag className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-600" />
            <span className="hidden md:inline">{COSMETIC_UI.shop[locale]}</span>
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setLocale(locale === 'vi' ? 'en' : 'vi');
            }}
            data-testid="main-menu-lang-btn"
            className="px-2 py-2 sm:px-2.5 sm:py-1.5 min-h-[40px] rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 shadow-sm hover:bg-slate-50 transition-all"
            title={COSMETIC_UI.languageTooltip[locale]}
          >
            <Globe2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
            <span className="uppercase font-mono">{locale}</span>
          </button>

          {/* Settings Modal Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onOpenSettings();
            }}
            data-testid="main-menu-settings-btn"
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-[#e8e2d5] transition-all shadow-sm"
            title={COSMETIC_UI.settingsTooltip[locale]}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Return to ongoing game if active */}
          {isPlayingActive && onBackToGame && (
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                onBackToGame();
              }}
              data-testid="main-menu-back-to-game-btn"
              className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span>{COSMETIC_UI.backToBoard[locale]}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Center Content Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 sm:py-6 flex flex-col justify-between gap-4 relative z-10">
        {/* Saved Match & Reconnect Alerts */}
        <div className="space-y-2">
          {savedMatch && onResumeMatch && (
            <div
              className="p-3 sm:p-4 rounded-2xl bg-amber-50/95 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fadeIn"
              data-testid="main-menu-resume-banner"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wide block">
                    {COSMETIC_UI.resumeFound[locale]} ({COSMETIC_UI.roundWord[locale]} {savedMatch.state.roundNumber}
                    {savedMatch.state.config.maxRounds > 0 ? `/${savedMatch.state.config.maxRounds}` : ''})
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {savedMatch.state.players.map((p) => `${p.name} (${formatMoney(p.cash)})`).join(' • ')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEffects.buyProperty();
                  onResumeMatch();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{COSMETIC_UI.resumeMatchBtn[locale]}</span>
              </button>
            </div>
          )}

          {storedOnlineSession && onReconnectOnline && (
            <div
              className="p-3 sm:p-4 rounded-2xl bg-sky-50/95 border border-sky-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fadeIn"
              data-testid="main-menu-reconnect-banner"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-200/70 text-sky-900 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-black text-sky-950 uppercase tracking-wide block">
                    {COSMETIC_UI.onlineRoomSession[locale]} [{storedOnlineSession.roomCode}]
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {COSMETIC_UI.tycoonLabel[locale]}: {storedOnlineSession.playerName} ({storedOnlineSession.playerId})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEffects.buyProperty();
                  onReconnectOnline();
                }}
                className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{COSMETIC_UI.reconnectBtn[locale]}</span>
              </button>
            </div>
          )}
        </div>

        {/* Hero Title & Identity */}
        <div className="text-center space-y-2 pt-1 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 border border-[#e8e2d5] text-slate-700 text-xs font-semibold shadow-sm">
            <Globe className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              {COSMETIC_UI.worldLabel[locale]}:{' '}
              <strong className="text-slate-900">{worldEntry?.name[locale] || 'Metropolis'}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                onOpenWorldSelection();
              }}
              className="underline text-amber-800 hover:text-amber-900 ml-1 font-bold text-[11px]"
            >
              {COSMETIC_UI.changeWord[locale]}
            </button>
          </div>

          <div className="px-4 sm:px-7 py-2 sm:py-3 rounded-3xl bg-[#faf8f5]/85 backdrop-blur-sm border border-[#e8e2d5]/60 shadow-sm">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 uppercase font-serif leading-tight">
              <span className="inline-block whitespace-nowrap">
                {COSMETIC_UI.heroTitleParts[locale][0]}
              </span>{' '}
              <span className="inline-block whitespace-nowrap">
                {COSMETIC_UI.heroTitleParts[locale][1]}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 max-w-md mx-auto font-medium leading-relaxed mt-1">
              {COSMETIC_UI.heroSubtitle[locale]}
            </p>
          </div>
        </div>

        {/* Primary CTA: 1-Click Quick Play */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => {
              soundEffects.buyProperty();
              onQuickPlay();
            }}
            data-testid="main-menu-quick-play-btn"
            className="w-full sm:w-auto px-10 sm:px-14 py-4 rounded-2xl font-black text-base uppercase tracking-wider bg-emerald-700 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-900/15 active:scale-95 transition-all flex items-center justify-center gap-3 border border-emerald-600"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{COSMETIC_UI.quickPlay[locale]} {COSMETIC_UI.quickPlaySuffix[locale]}</span>
          </button>
        </div>

        {/* Clean Mode Grid: 4 Core Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          {/* Card 1: Chơi Với AI */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onPlayVsAI();
            }}
            data-testid="main-menu-play-ai-btn"
            className="p-4 rounded-2xl bg-white/95 border border-[#e8e2d5] hover:border-amber-500/70 hover:shadow-md text-left transition-all group flex flex-col justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-all border border-amber-200">
                <Bot className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-900">
                {COSMETIC_UI.playVsAi[locale]}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {COSMETIC_UI.playVsAiDesc[locale]}
              </p>
            </div>
          </button>

          {/* Card 2: Chơi Tại Máy */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onPlayLocal();
            }}
            data-testid="main-menu-play-local-btn"
            className="p-4 rounded-2xl bg-white/95 border border-[#e8e2d5] hover:border-emerald-500/70 hover:shadow-md text-left transition-all group flex flex-col justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-all border border-emerald-200">
                <Users className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-900">
                {COSMETIC_UI.localPass[locale]}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {COSMETIC_UI.localPassDesc[locale]}
              </p>
            </div>
          </button>

          {/* Card 3: Tạo Phòng Online */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onCreateOnlineRoom();
            }}
            data-testid="main-menu-create-online-btn"
            className="p-4 rounded-2xl bg-white/95 border border-[#e8e2d5] hover:border-sky-500/70 hover:shadow-md text-left transition-all group flex flex-col justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center group-hover:scale-105 transition-all border border-sky-200">
                <PlusCircle className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-700" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-900">
                {COSMETIC_UI.createOnline[locale]}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {COSMETIC_UI.createOnlineDesc[locale]}
              </p>
            </div>
          </button>

          {/* Card 4: Vào Phòng Code */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onJoinOnlineRoom();
            }}
            data-testid="main-menu-join-online-btn"
            className="p-4 rounded-2xl bg-white/95 border border-[#e8e2d5] hover:border-indigo-500/70 hover:shadow-md text-left transition-all group flex flex-col justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center group-hover:scale-105 transition-all border border-indigo-200">
                <Globe className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-900">
                {COSMETIC_UI.joinOnline[locale]}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {COSMETIC_UI.joinOnlineDesc[locale]}
              </p>
            </div>
          </button>
        </div>

        {/* Daily Quests / Progression Slot in Flow */}
        {questsSlot && (
          <div className="hidden sm:block max-w-md w-full mx-auto">
            {questsSlot}
          </div>
        )}

        {/* Minimal Footer */}
        <footer className="text-center pt-2 pb-1 text-[11px] text-slate-500 border-t border-[#e8e2d5]/60 flex items-center justify-between flex-wrap gap-2">
          <span>{COSMETIC_UI.footerLine1[locale]}</span>
          <span>{COSMETIC_UI.footerLine2[locale]}</span>
        </footer>
      </main>
    </div>
  );
};
