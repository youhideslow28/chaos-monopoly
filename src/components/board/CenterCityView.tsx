import React from 'react';
import { GameState } from '../../game/types';
import { formatMoney } from '../../utils/money';
import { WorldConfig } from '../../worlds/types';
import { getLocale } from '../../worlds/i18n';
import { VolumetricDice3D } from '../dice/VolumetricDice3D';
import { Sparkles, Dices, ArrowRight, ShieldAlert, Zap, Globe2 } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface CenterCityViewProps {
  state: GameState;
  worldConfig?: WorldConfig | null;
  diceSkinId?: string;
  onRollDice: () => void;
  onEndTurn: () => void;
}

const CenterCityViewInner: React.FC<CenterCityViewProps> = ({
  state,
  worldConfig,
  diceSkinId,
  onRollDice,
  onEndTurn,
}) => {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer) return null;

  const isRolling = state.turnPhase === 'ROLLING';
  const canRoll = state.turnPhase === 'WAITING_FOR_ROLL' && !activePlayer.isBankrupt;
  const canEndTurn = state.turnPhase === 'ACTION_MENU';
  const locale = getLocale();
  const worldName = worldConfig?.name[locale];
  const worldTagline = worldConfig?.tagline[locale];

  // Identify any active global chaos modifiers
  const activeModifiers = state.chaosModifiers
    ? Object.entries(state.chaosModifiers).filter(([, turns]) => turns > 0)
    : [];

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-between p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100 border border-slate-200/90 shadow-sm relative overflow-visible"
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Top Banner: Active Player Card */}
      <div className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm shadow-sm ring-2 ring-black/10 shrink-0 text-white font-bold"
            style={{ backgroundColor: activePlayer.token.colorHex }}
          >
            {activePlayer.token.symbol}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                {activePlayer.name}
              </span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shrink-0">
                Lượt #{state.roundNumber}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-700">
              Tiền mặt: {formatMoney(activePlayer.cash)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {worldName && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-slate-50 text-slate-700 border-slate-200"
              data-testid="center-world-badge"
              title={worldTagline}
            >
              <Globe2 className="w-2.5 h-2.5 text-emerald-600" />
              <span>{worldName}</span>
            </span>
          )}
          {activePlayer.inDetention && (
            <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 animate-pulse flex items-center gap-1 shrink-0">
              <ShieldAlert className="w-3 h-3 text-red-600" />
              TẠM GIAM ({activePlayer.detentionTurns} lượt)
            </span>
          )}
        </div>
      </div>

      {/* Center Stage: Animated Dice & Roller */}
      <div className="my-auto flex flex-col items-center justify-center gap-2 sm:gap-3 z-10 py-1">
        <VolumetricDice3D
          dice={state.dice}
          isRolling={isRolling}
          isDouble={state.isDouble}
          diceSkinId={diceSkinId}
        />

        {/* Quick action in center */}
        {canRoll && (
          <button
            onClick={() => {
              soundEffects.click();
              onRollDice();
            }}
            disabled={isRolling}
            className="min-h-[44px] px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Dices className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span>LẮC XÚC XẮC</span>
          </button>
        )}

        {canEndTurn && (
          <button
            onClick={() => {
              soundEffects.click();
              onEndTurn();
            }}
            className="min-h-[44px] px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{state.isDouble ? 'LẮC TIẾP (ĐÔI)' : 'KẾT THÚC LƯỢT'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        )}
      </div>

      {/* Active Chaos Announcement / Global Modifiers Banner */}
      {activeModifiers.length > 0 && (
        <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-[10px] text-purple-700 z-10 mb-1">
          <Zap className="w-3 h-3 text-purple-600 animate-pulse" />
          <span className="font-bold truncate">
            {activeModifiers.map(([k, t]) => `${k} (${t} lượt)`).join(' • ')}
          </span>
        </div>
      )}

      {/* Bottom Status Ticker */}
      <div className="w-full text-center z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] sm:text-[11px] text-slate-600 shadow-sm max-w-full">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="truncate max-w-[200px] sm:max-w-[320px]">
            {state.logs[0]?.message || 'Chào mừng đến với Metropolis!'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const CenterCityView = React.memo(CenterCityViewInner);


