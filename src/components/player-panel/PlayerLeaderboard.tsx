/**
 * CHAOS MONOPOLY — Player strip (classic / minimal).
 * One compact chip per player: token, name, cash, number of properties. The active player
 * is outlined. Tapping a chip opens a simple sheet with that player's properties.
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameState } from '../../game/types';
import { getTileById } from '../../game/property/propertyEngine';
import { displayTileName } from '../../worlds/runtime';
import { ShieldAlert, X } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';
import { formatMoney } from '../../utils/money';
import { GAME_UI, useLocale } from '../../worlds/i18n';

interface PlayerLeaderboardProps {
  state: GameState;
}

interface CashDelta {
  amount: number;
  key: number;
}

const PlayerLeaderboardInner: React.FC<PlayerLeaderboardProps> = ({ state }) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const expanded = state.players.find((p) => p.id === expandedPlayerId) || null;
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  // Floating cash delta indicators (+ in emerald, - in crimson)
  const prevCashRef = useRef<Record<string, number>>({});
  const [cashDeltas, setCashDeltas] = useState<Record<string, CashDelta>>({});

  useEffect(() => {
    const newDeltas: Record<string, CashDelta> = {};
    let hasChange = false;

    state.players.forEach((p) => {
      const prevCash = prevCashRef.current[p.id];
      if (prevCash !== undefined && prevCash !== p.cash) {
        const diff = p.cash - prevCash;
        if (diff !== 0) {
          newDeltas[p.id] = {
            amount: diff,
            key: Date.now() + Math.random(),
          };
          hasChange = true;
        }
      }
      prevCashRef.current[p.id] = p.cash;
    });

    if (hasChange) {
      setCashDeltas((prev) => ({ ...prev, ...newDeltas }));

      const timer = setTimeout(() => {
        setCashDeltas((prev) => {
          const next = { ...prev };
          Object.keys(newDeltas).forEach((id) => {
            if (next[id]?.key === newDeltas[id].key) {
              delete next[id];
            }
          });
          return next;
        });
      }, 1400);

      return () => clearTimeout(timer);
    }
  }, [state.players]);

  return (
    <>
      <style>{`
        @keyframes cashFloatFade {
          0% {
            opacity: 0;
            transform: translate3d(0, 4px, 0) scale(0.85);
          }
          20% {
            opacity: 1;
            transform: translate3d(0, 0px, 0) scale(1.04);
          }
          75% {
            opacity: 0.95;
            transform: translate3d(0, -3px, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -6px, 0) scale(0.92);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cash-float-delta {
            animation: none !important;
          }
        }
      `}</style>
      <div
        className="players-strip flex items-stretch gap-2 px-2 sm:px-4 py-2 [@media(max-height:480px)]:py-1 overflow-x-auto no-scrollbar"
        data-testid="players-strip"
      >
        {state.players.map((player, idx) => {
          const isActive = idx === state.activePlayerIndex && !player.isBankrupt;
          const owned = Object.values(state.properties).filter((p) => p.ownerId === player.id).length;

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => {
                soundEffects.click();
                setExpandedPlayerId(player.id);
              }}
              data-testid={`leaderboard-player-${player.id}`}
              aria-label={`${player.name}, ${t('cash')} ${formatMoney(player.cash)}, ${owned} ${t('propertiesShort')}${
                isActive ? `, ${t('currentTurn')}` : ''
              }`}
              className={`player-chip relative flex-1 min-w-[158px] sm:min-w-[172px] flex items-center gap-2.5 px-3 py-2 [@media(max-height:480px)]:py-1 rounded-xl border-2 bg-white text-left transition ${
                player.isBankrupt
                  ? 'opacity-40 border-[#e5e0d3]'
                  : isActive
                  ? 'border-slate-900 shadow-sm'
                  : 'border-[#e5e0d3] hover:border-slate-300'
              }`}
            >
              {cashDeltas[player.id] && (
                <span
                  key={cashDeltas[player.id].key}
                  data-testid={`cash-delta-${player.id}`}
                  className={`cash-float-delta absolute top-1 right-2 pointer-events-none z-30 px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-tight tabular-nums shadow-sm border ${
                    cashDeltas[player.id].amount > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                  style={{
                    animation: 'cashFloatFade 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    willChange: 'transform, opacity',
                  }}
                >
                  {cashDeltas[player.id].amount > 0
                    ? `+${formatMoney(cashDeltas[player.id].amount)}`
                    : `-${formatMoney(Math.abs(cashDeltas[player.id].amount))}`}
                </span>
              )}
              <span
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-base text-white shadow-inner"
                style={{ backgroundColor: player.token.colorHex }}
                aria-hidden="true"
              >
                {player.token.symbol}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="t-title text-xs text-slate-900 truncate">{player.name}</span>
                  {isActive && (
                    <span className="t-label shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">
                      {t('currentTurn')}
                    </span>
                  )}
                </span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="t-title text-sm text-emerald-700 tabular-nums">
                    {player.isBankrupt ? t('bankrupt') : formatMoney(player.cash)}
                  </span>
                  <span className="t-body text-[10px] text-slate-500 whitespace-nowrap">
                    {owned} {t('propertiesShort')}
                  </span>
                </span>
                {player.inDetention && !player.isBankrupt && (
                  <span className="t-body mt-0.5 flex items-center gap-1 text-[10px] font-bold text-red-600">
                    <ShieldAlert className="w-3 h-3" />
                    {t('inDetention')} ({player.detentionTurns})
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40"
          onClick={() => setExpandedPlayerId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`${expanded.name}`}
            className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl p-5 space-y-4 text-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg text-white"
                  style={{ backgroundColor: expanded.token.colorHex }}
                >
                  {expanded.token.symbol}
                </span>
                <div className="min-w-0">
                  <h3 className="t-title text-base truncate">{expanded.name}</h3>
                  <p className="t-body text-xs text-slate-500">
                    {expanded.isAI ? t('machine') : t('playerWordShort')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedPlayerId(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#f6f3ec] p-3">
              <span className="t-label text-[11px] text-slate-500 block">{t('cash')}</span>
              <span className="t-title text-2xl text-emerald-700 tabular-nums">
                {formatMoney(expanded.cash)}
              </span>
            </div>

            <div>
              <span className="t-label text-xs text-slate-600 block mb-2">
                {t('ownedTiles')}
              </span>
              {(() => {
                const owned = Object.keys(state.properties)
                  .map(Number)
                  .filter((tid) => state.properties[tid]?.ownerId === expanded.id);
                if (owned.length === 0) {
                  return (
                    <p className="t-body text-sm text-slate-500">
                      {t('noTilesYet')}
                    </p>
                  );
                }
                return (
                  <ul className="space-y-1.5">
                    {owned.map((tid) => {
                      const tile = getTileById(tid);
                      const prop = state.properties[tid];
                      if (!tile || !prop) return null;
                      return (
                        <li
                          key={tid}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[#e5e0d3] px-3 py-2 text-sm"
                        >
                          <span className="font-semibold truncate">{displayTileName(tile, 'short')}</span>
                          <span className="t-body text-xs font-bold text-slate-500 whitespace-nowrap">
                            {prop.isMortgaged
                              ? t('mortgaged')
                              : prop.level === 5
                              ? t('hotelWord')
                              : prop.level > 0
                              ? `${t('level')} ${prop.level}`
                              : t('vacantLand')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PlayerLeaderboard = React.memo(PlayerLeaderboardInner);
