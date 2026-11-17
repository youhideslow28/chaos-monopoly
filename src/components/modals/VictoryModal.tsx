import React, { useEffect } from 'react';
import { formatMoney } from '../../utils/money';
import { GameState, PlayerState, PropertyOwnership } from '../../game/types';
import { calculatePlayerNetWorth } from '../../game/economy/economyEngine';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import { useModalDismiss } from '../common/useModalDismiss';
import confetti from 'canvas-confetti';
import { Trophy, Award, Building, DollarSign, RotateCcw, Crown, Medal } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface VictoryModalProps {
  winner: PlayerState | null;
  players?: PlayerState[];
  properties: Record<number, PropertyOwnership>;
  roundNumber?: number;
  worldState?: Pick<GameState, 'config' | 'worldState' | 'roundNumber' | 'chaosModifiers'>;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  players = [],
  properties,
  roundNumber,
  worldState,
  onRestart,
}) => {
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];
  const { backdropProps } = useModalDismiss({
    isOpen: Boolean(winner),
    onClose: onRestart,
    disableBackdropClick: true,
  });

  useEffect(() => {
    soundEffects.victory();

    // Canvas Confetti fireworks
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;
    let animId: number | null = null;

    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isReduced) {
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          colors: ['#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'],
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          colors: ['#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'],
        });

        if (Date.now() < end) {
          animId = requestAnimationFrame(frame);
        }
      };
      animId = requestAnimationFrame(frame);
    }

    return () => {
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, []);

  if (!winner) return null;

  const winnerNetWorth = calculatePlayerNetWorth(
    winner,
    properties,
    worldState?.chaosModifiers,
    roundNumber ?? worldState?.roundNumber,
    worldState
  );
  const propertiesOwned = Object.values(properties).filter(
    (p) => p.ownerId === winner.id
  ).length;

  // Rank all players by net worth (descending)
  const rankedPlayers = [...players].sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1;
    if (!a.isBankrupt && b.isBankrupt) return -1;
    const nwA = calculatePlayerNetWorth(
      a,
      properties,
      worldState?.chaosModifiers,
      roundNumber ?? worldState?.roundNumber,
      worldState
    );
    const nwB = calculatePlayerNetWorth(
      b,
      properties,
      worldState?.chaosModifiers,
      roundNumber ?? worldState?.roundNumber,
      worldState
    );
    return nwB - nwA;
  });

  const getRankBadge = (rankIdx: number) => {
    switch (rankIdx) {
      case 0:
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
            <Trophy className="w-3 h-3 text-amber-500 fill-amber-400 inline shrink-0" />
            <span>{t('rankChampion')}</span>
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-bold">
            <Medal className="w-3 h-3 text-slate-400 fill-slate-300 inline shrink-0" />
            <span>{t('rankRunnerUp')}</span>
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 text-amber-900 font-bold">
            <Medal className="w-3 h-3 text-amber-700 fill-amber-600 inline shrink-0" />
            <span>{t('rankThird')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
            <Award className="w-3 h-3 text-slate-400 inline shrink-0" />
            <span>{t('rankWord')} {rankIdx + 1}</span>
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      {...backdropProps}
      data-testid="victory-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-[#fdfbf7] border-2 border-amber-300 shadow-2xl p-5 sm:p-6 text-slate-900 text-center flex flex-col items-center gap-4 relative overflow-hidden my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Warm Celebratory Header Halo */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-100/70 to-transparent pointer-events-none rounded-t-3xl"></div>

        {/* Trophy Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 flex items-center justify-center text-amber-950 shadow-lg ring-4 ring-amber-200/70 z-10 animate-bounce">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-950" />
        </div>

        {/* Winner Announcement */}
        <div className="space-y-1 z-10">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-700 flex items-center justify-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-600 fill-current" />
            {t('victoryGlory')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wide font-serif">
            {winner.name} {t('victoryWins')}
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            {t('victorySubtitle')}
          </p>
        </div>

        {/* Winner Highlight Card */}
        <div className="w-full grid grid-cols-2 gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#e8e2d5] text-left text-xs z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold block">{t('cashLabel')}</span>
              <strong className="text-emerald-700 font-black text-sm sm:text-base">
                {formatMoney(winner.cash)}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold block">{t('netWorthLabel')}</span>
              <strong className="text-sky-700 font-black text-sm sm:text-base">
                {formatMoney(winnerNetWorth)}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
              <Building className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold block">{t('propertiesOwnedLabel')}</span>
              <strong className="text-slate-900 font-bold text-xs sm:text-sm">
                {propertiesOwned} {t('buildingsCountSuffix')}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold block">{t('rentCollectedLabel')}</span>
              <strong className="text-amber-700 font-bold text-xs sm:text-sm">
                {formatMoney(winner.stats?.rentCollected ?? 0)}
              </strong>
            </div>
          </div>
        </div>

        {/* Final Ranking Leaderboard */}
        {rankedPlayers.length > 0 && (
          <div className="w-full space-y-1.5 z-10 text-left">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
              {t('finalRanking')}
            </span>
            <div className="space-y-1.5">
              {rankedPlayers.map((player, idx) => {
                const nw = calculatePlayerNetWorth(
                  player,
                  properties,
                  worldState?.chaosModifiers,
                  roundNumber ?? worldState?.roundNumber,
                  worldState
                );
                const isWin = player.id === winner.id;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-xs transition-all ${
                      isWin
                        ? 'bg-amber-50/90 border-amber-300 shadow-sm'
                        : 'bg-white border-[#e8e2d5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-black w-5 text-slate-500 text-center">
                        #{idx + 1}
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shadow-sm ring-1 ring-black/10 text-white shrink-0"
                        style={{ backgroundColor: player.token.colorHex }}
                      >
                        {player.token.symbol}
                      </div>
                      <div className="truncate">
                        <span className="font-extrabold text-slate-900 block truncate">
                          {player.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {player.isBankrupt ? (
                            <span className="text-red-600 font-bold">{t('bankrupt')}</span>
                          ) : (
                            getRankBadge(idx)
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-emerald-700 font-black text-xs sm:text-sm block">
                        {formatMoney(nw)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {t('cashPrefix')} {formatMoney(player.cash)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Play Again Button */}
        <button
          type="button"
          onClick={() => {
            soundEffects.click();
            onRestart();
          }}
          className="w-full min-h-[48px] py-3.5 sm:py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/15 active:scale-95 transition-all flex items-center justify-center gap-2 z-10"
        >
          <RotateCcw className="w-4 h-4 text-white" />
          <span>{t('startNewMatch')}</span>
        </button>
      </div>
    </div>
  );
};

