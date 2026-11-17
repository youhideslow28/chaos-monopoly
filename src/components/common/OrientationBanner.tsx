/**
 * CHAOS MONOPOLY — Mobile Orientation Guidance Banner
 * Prompts players to rotate to Landscape during 3D gameplay for the best tabletop diorama view,
 * and suggests Portrait during Main Menu/Setup navigation.
 */

import React, { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { GAME_UI, useLocale } from '../../worlds/i18n';

interface OrientationBannerProps {
  isGameplay: boolean;
  isMainMenu: boolean;
}

export const OrientationBanner: React.FC<OrientationBannerProps> = ({ isGameplay, isMainMenu }) => {
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const portrait = height > width;
      const mobile = Math.min(width, height) < 768;

      setIsPortrait(portrait);
      setIsMobileScreen(mobile);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // The hint covers the header buttons on phones; it hides itself so it never blocks play.
  useEffect(() => {
    const timer = setTimeout(() => setIsDismissed(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Only show if on mobile and not dismissed
  if (!isMobileScreen || isDismissed) {
    return null;
  }

  // Case 1: Gameplay in Portrait -> suggest Landscape
  if (isGameplay && isPortrait) {
    return (
      <aside
        aria-label={t('orientationAria')}
        data-testid="orientation-banner"
        className="fixed bottom-36 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md px-3.5 py-2 rounded-2xl bg-[#fdfbf7]/95 backdrop-blur-md border border-amber-300 shadow-xl flex items-center justify-between gap-3 text-slate-800 animate-fadeIn"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
            <Smartphone className="w-4 h-4 rotate-90 animate-pulse" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-xs font-black text-slate-900 leading-tight">
              {t('orientation3dTitle')}
            </p>
            <p className="text-[11px] text-slate-600 truncate">
              {t('orientation3dHint')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold shrink-0 transition-all"
        >
          {t('gotIt')}
        </button>
      </aside>
    );
  }

  // Case 2: Main Menu in ultra-short Landscape -> suggest Portrait
  if (isMainMenu && !isPortrait && typeof window !== 'undefined' && window.innerHeight < 460) {
    return (
      <aside
        aria-label={t('orientationAria')}
        data-testid="orientation-banner-menu"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm px-3 py-1.5 rounded-2xl bg-[#fdfbf7]/95 backdrop-blur-md border border-[#e8e2d5] shadow-lg flex items-center justify-between gap-2.5 text-slate-800 animate-fadeIn"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Smartphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-700 truncate">
            {t('orientationMenuHint')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-slate-700 p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  return null;
};
