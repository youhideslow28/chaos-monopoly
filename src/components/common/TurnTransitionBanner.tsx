/**
 * CHAOS MONOPOLY — Turn Transition Fanfare Banner
 * Cheerful 1.2s turn entrance fanfare banner announcing active player turn.
 * Uses composited GPU transforms (translate3d, scale, opacity) for 60 FPS performance without layout thrashing.
 */

import React, { useEffect, useState, useRef } from 'react';
import { GameState } from '../../game/types';
import { useLocale, GAME_UI } from '../../worlds/i18n';

interface TurnTransitionBannerProps {
  state: GameState;
  controlledPlayerId?: string | null;
}

interface BannerAnnouncement {
  playerName: string;
  isMyTurn: boolean;
  tokenSymbol: string;
  tokenColorHex: string;
  key: number;
}

export const TurnTransitionBanner: React.FC<TurnTransitionBannerProps> = ({
  state,
  controlledPlayerId,
}) => {
  const initialPlayer =
    state.status === 'PLAYING' ? state.players[state.activePlayerIndex] : null;

  const [announcement, setAnnouncement] = useState<BannerAnnouncement | null>(() => {
    if (!initialPlayer || initialPlayer.isBankrupt) return null;
    const isMyTurn = controlledPlayerId
      ? initialPlayer.id === controlledPlayerId
      : !initialPlayer.isAI;
    return {
      playerName: initialPlayer.name,
      isMyTurn,
      tokenSymbol: initialPlayer.token.symbol || '🎲',
      tokenColorHex: initialPlayer.token.colorHex || '#10b981',
      key: Date.now(),
    };
  });

  const [visible, setVisible] = useState<boolean>(() =>
    Boolean(initialPlayer && !initialPlayer.isBankrupt)
  );

  const prevActiveIndexRef = useRef<number | null>(
    state.status === 'PLAYING' ? state.activePlayerIndex : null
  );
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  const activePlayer =
    state.status === 'PLAYING' ? state.players[state.activePlayerIndex] : null;
  const activePlayerId = activePlayer?.id ?? null;
  const activePlayerName = activePlayer?.name ?? '';
  const activePlayerIsAI = Boolean(activePlayer?.isAI);
  const activePlayerIsBankrupt = Boolean(activePlayer?.isBankrupt);
  const activeTokenSymbol = activePlayer?.token.symbol || '🎲';
  const activeTokenColorHex = activePlayer?.token.colorHex || '#10b981';

  useEffect(() => {
    if (state.status !== 'PLAYING') {
      prevActiveIndexRef.current = null;
      setVisible(false);
      return;
    }

    if (!activePlayerId || activePlayerIsBankrupt) {
      return;
    }

    // Trigger whenever activePlayerIndex transitions
    if (prevActiveIndexRef.current !== state.activePlayerIndex) {
      prevActiveIndexRef.current = state.activePlayerIndex;

      const isMyTurn = controlledPlayerId
        ? activePlayerId === controlledPlayerId
        : !activePlayerIsAI;

      setAnnouncement({
        playerName: activePlayerName,
        isMyTurn,
        tokenSymbol: activeTokenSymbol,
        tokenColorHex: activeTokenColorHex,
        key: Date.now() + Math.random(),
      });
      setVisible(true);
    }
  }, [
    state.status,
    state.activePlayerIndex,
    activePlayerId,
    activePlayerName,
    activePlayerIsAI,
    activePlayerIsBankrupt,
    activeTokenSymbol,
    activeTokenColorHex,
    controlledPlayerId,
  ]);

  // Independent auto-dismiss timer keyed strictly on visibility + announcement instance
  // so React StrictMode remounts or mid-turn player updates never cancel auto-hide.
  useEffect(() => {
    if (!visible || !announcement) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [visible, announcement?.key]);

  if (!visible || !announcement) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes turnFanfareEntrance {
          0% {
            opacity: 0;
            transform: translate3d(0, -16px, 0) scale(0.9);
          }
          20% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1.04);
          }
          80% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -12px, 0) scale(0.95);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .turn-fanfare-banner {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      <aside
        role="status"
        aria-live="polite"
        aria-label={announcement.isMyTurn ? t('currentTurn') : announcement.playerName}
        data-testid="turn-transition-banner"
        className="turn-fanfare-banner absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none flex flex-col items-center"
        style={{
          animation: 'turnFanfareEntrance 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          willChange: 'transform, opacity',
        }}
      >
        <div
          className="flex items-center gap-2.5 sm:gap-3 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-white/95 backdrop-blur-md shadow-2xl border-2 transition-all"
          style={{
            borderColor: announcement.tokenColorHex,
            boxShadow: `0 10px 25px -5px ${announcement.tokenColorHex}40, 0 8px 10px -6px rgba(0, 0, 0, 0.1)`,
          }}
        >
          <span
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center text-base sm:text-lg text-white shadow-inner font-bold"
            style={{ backgroundColor: announcement.tokenColorHex }}
            aria-hidden="true"
          >
            {announcement.tokenSymbol}
          </span>

          <div className="flex items-center gap-2">
            {announcement.isMyTurn ? (
              <>
                <span className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
                  🎯 {t('currentTurn')}!
                </span>
                <span
                  className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: announcement.tokenColorHex }}
                >
                  {announcement.playerName}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm sm:text-base font-black tracking-wide text-slate-900">
                  {announcement.playerName}
                </span>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                  {t('currentTurn')}
                </span>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default TurnTransitionBanner;
