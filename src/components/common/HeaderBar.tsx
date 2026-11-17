/**
 * CHAOS MONOPOLY — In-game header (classic / minimal).
 * Home, title, round counter and four icon buttons. Nothing else.
 */

import React from 'react';
import { Volume2, VolumeX, BookOpen, RotateCcw, Home, Settings } from 'lucide-react';
import { isSoundEnabled, toggleSound, soundEffects } from '../../game/sound/soundEngine';
import { GAME_UI, useLocale } from '../../worlds/i18n';

interface HeaderBarProps {
  roundNumber: number;
  maxRounds?: number;
  onOpenRules: () => void;
  onRestart: () => void;
  onOpenMenu?: () => void;
  onOpenSettings?: () => void;
}

const ICON_BTN =
  'min-w-[44px] min-h-[44px] w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600';

const HeaderBarInner: React.FC<HeaderBarProps> = ({
  roundNumber,
  maxRounds,
  onOpenRules,
  onRestart,
  onOpenMenu,
  onOpenSettings,
}) => {
  const [soundOn, setSoundOn] = React.useState(isSoundEnabled());
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
    if (next) soundEffects.click();
  };

  return (
    <header className="w-full max-w-full bg-white border-b border-[#e5e0d3] px-2 sm:px-4 h-14 [@media(max-height:480px)]:h-11 flex items-center justify-between gap-1 sm:gap-2 box-border overflow-hidden select-none">
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
        {onOpenMenu && (
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onOpenMenu();
            }}
            className={ICON_BTN}
            aria-label={t('home')}
            title={t('home')}
          >
            <Home className="w-5 h-5" />
          </button>
        )}
        <span className="t-title tracking-wide text-slate-900 text-xs sm:text-base whitespace-nowrap truncate max-w-[95px] min-[400px]:max-w-[140px] sm:max-w-none">
          CHAOS MONOPOLY
        </span>
      </div>

      <div
        className="t-label text-[11px] sm:text-sm text-slate-500 whitespace-nowrap shrink-0 px-1"
        data-testid="round-indicator"
      >
        {t('round')} <span className="text-slate-900 font-bold">{roundNumber}</span>
        {maxRounds ? <span className="text-slate-400">/{maxRounds}</span> : null}
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            soundEffects.click();
            onOpenRules();
          }}
          className={ICON_BTN}
          aria-label={t('rules')}
          title={t('rules')}
        >
          <BookOpen className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleToggleSound}
          className={ICON_BTN}
          aria-label={soundOn ? t('soundOn') : t('soundOff')}
          title={soundOn ? t('soundOn') : t('soundOff')}
        >
          {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-500" />}
        </button>
        {onOpenSettings && (
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              onOpenSettings();
            }}
            className={ICON_BTN}
            aria-label={t('settings')}
            title={t('settings')}
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            soundEffects.click();
            onRestart();
          }}
          className={ICON_BTN}
          aria-label={t('newMatch')}
          title={t('newMatch')}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export const HeaderBar = React.memo(HeaderBarInner);
export type AISpeedPreset = 'NORMAL' | 'FAST' | 'TURBO';
