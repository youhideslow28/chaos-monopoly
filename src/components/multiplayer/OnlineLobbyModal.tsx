/**
 * CHAOS MONOPOLY — Online Lobby Modal (Warm Premium Edition)
 * Warm ivory cardstock, elegant typography, clear player seat list,
 * readiness states, shareable room code, and authoritative host controls.
 */

import React, { useState } from 'react';
import { AI_DIFFICULTIES, AI_PERSONALITY_LIST } from '../../game/ai/aiPersonalities';
import { DEFAULT_PLAYER_TOKENS } from '../../game/board/boardData';
import { AIDifficulty, AIPersonalityId, PlayerId, PlayerToken } from '../../game/types';
import { ConnectionStatus } from '../../multiplayer/client';
import { RoomPublicSummary } from '../../multiplayer/protocol';
import { WorldPicker } from '../worlds/WorldPicker';
import { useModalDismiss } from '../common/useModalDismiss';
import { COSMETIC_UI, getLocale } from '../../worlds/i18n';
import {
  Bot,
  CheckCircle2,
  Copy,
  Crown,
  LogOut,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface OnlineLobbyModalProps {
  room: RoomPublicSummary;
  myPlayerId: PlayerId | null;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  notification: string | null;
  onSetReady: (isReady: boolean) => void;
  onSelectToken: (token: PlayerToken, playerName?: string) => void;
  onConfigureRoom: (params: {
    capacity?: number;
    config?: { startingCash?: number; maxRounds?: number; worldId?: string; gameMode?: 'CLASSIC' | 'CHAOS' };
  }) => void;
  onConfigureSeatAI: (params: {
    seatIndex: number;
    isAI: boolean;
    aiPersonality?: AIPersonalityId;
    aiDifficulty?: AIDifficulty;
    name?: string;
  }) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  room,
  myPlayerId,
  connectionStatus,
  errorMessage,
  notification,
  onSetReady,
  onSelectToken,
  onConfigureRoom,
  onConfigureSeatAI,
  onStartMatch,
  onLeaveRoom,
}) => {
  const locale = getLocale();
  const t = (key: keyof typeof COSMETIC_UI) => COSMETIC_UI[key][locale];
  const [copied, setCopied] = useState(false);

  const mySeat = room.seats.find((s) => s.playerId === myPlayerId);
  const isHost = myPlayerId !== null && room.hostPlayerId === myPlayerId;
  const canStart =
    isHost &&
    room.seats.length >= 2 &&
    room.seats.every((s) => s.isAI || s.isReady);

  const handleCopyCode = () => {
    soundEffects.click();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(room.roomCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { backdropProps } = useModalDismiss({
    isOpen: true,
    onClose: onLeaveRoom,
    disableBackdropClick: true,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
      {...backdropProps}
      data-testid="online-lobby-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-5 sm:p-6 flex flex-col gap-4 relative z-10 my-auto text-slate-900"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e8e2d5]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold mb-1">
              <Crown className="w-3 h-3 text-amber-600" />
              <span>{t('lobbyBadge')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900">{room.roomName}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
              }`}
            >
              {connectionStatus === 'CONNECTED' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{connectionStatus === 'CONNECTED' ? t('connected') : t('connecting')}</span>
            </div>

            <button
              type="button"
              onClick={onLeaveRoom}
              data-testid="leave-room-btn"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-red-50 text-red-700 border border-[#e8e2d5] flex items-center gap-1 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('leaveRoom')}</span>
            </button>
          </div>
        </div>

        {/* Shareable Room Code Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase block">
              {t('roomCodeLabel')}
            </span>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span
                className="text-2xl sm:text-3xl font-black tracking-widest text-amber-800 font-mono"
                data-testid="lobby-room-code"
              >
                {room.roomCode}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#faf8f5] border border-[#e8e2d5] text-slate-700 text-xs font-bold">
                {room.seats.length}/{room.capacity} {t('peopleWord')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            data-testid="copy-room-code-btn"
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? t('copiedCode') : t('copyCode')}</span>
          </button>
        </div>

        {/* Error / Status Notification */}
        {errorMessage && (
          <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
            ⚠️ {errorMessage}
          </div>
        )}
        {notification && !errorMessage && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            ✦ {notification}
          </div>
        )}

        {/* Seat List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-600" />
              {t('memberList')} ({room.seats.length}/{room.capacity})
            </span>
            {isHost && room.seats.length < room.capacity && (
              <button
                type="button"
                onClick={() => {
                  const usedIndices = new Set(room.seats.map((s) => s.seatIndex));
                  let freeIdx = 0;
                  while (usedIndices.has(freeIdx) && freeIdx < room.capacity) freeIdx++;
                  onConfigureSeatAI({
                    seatIndex: freeIdx,
                    isAI: true,
                    aiPersonality: 'STRATEGIST',
                    aiDifficulty: 'NORMAL',
                  });
                }}
                data-testid="lobby-add-ai-btn"
                className="px-3 py-1 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-[#e8e2d5] text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addAiBtn')}</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {room.seats.map((seat) => {
              const isMe = seat.playerId === myPlayerId;
              return (
                <div
                  key={seat.playerId}
                  className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all ${
                    isMe
                      ? 'bg-white border-amber-600 ring-2 ring-amber-500/15 shadow-sm'
                      : 'bg-white border-[#e8e2d5]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm ring-1 ring-black/10 shrink-0 text-white font-bold"
                        style={{ backgroundColor: seat.token.colorHex }}
                      >
                        <span>{seat.token.symbol}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-slate-900">{seat.name}</span>
                          {isMe && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              {t('youLabel')} ({seat.playerId})
                            </span>
                          )}
                          {seat.isHost && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-700" />
                              {t('hostLabel')}
                            </span>
                          )}
                          {seat.isAI ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              AI • {seat.aiPersonality} • {seat.aiDifficulty}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {t('playerWordLobby')}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {t('tokenLabel')}: {seat.token.name} •{' '}
                          {seat.connected ? (
                            <span className="text-emerald-700 font-bold">{t('onlineWord')}</span>
                          ) : (
                            <span className="text-amber-700 font-bold">{t('offlineWord')}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {/* Token Picker for current player */}
                      {isMe && !seat.isAI && (
                        <div className="flex items-center gap-1 mr-1">
                          {DEFAULT_PLAYER_TOKENS.map((tok) => (
                            <button
                              key={tok.id}
                              type="button"
                              onClick={() => onSelectToken(tok)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${
                                seat.token.id === tok.id
                                  ? 'ring-2 ring-slate-900 scale-110 shadow-sm'
                                  : 'opacity-40 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: tok.colorHex }}
                              title={tok.name}
                            >
                              {tok.symbol}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Host AI Seat Controls */}
                      {isHost && seat.isAI && (
                        <>
                          <select
                            value={seat.aiPersonality || 'STRATEGIST'}
                            onChange={(e) =>
                              onConfigureSeatAI({
                                seatIndex: seat.seatIndex,
                                isAI: true,
                                aiPersonality: e.target.value as AIPersonalityId,
                                aiDifficulty: seat.aiDifficulty,
                              })
                            }
                            className="bg-white border border-[#e8e2d5] rounded-xl px-2 py-1 text-[11px] text-slate-800 font-semibold"
                          >
                            {AI_PERSONALITY_LIST.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.titleVi}
                              </option>
                            ))}
                          </select>
                          <select
                            value={seat.aiDifficulty || 'NORMAL'}
                            onChange={(e) =>
                              onConfigureSeatAI({
                                seatIndex: seat.seatIndex,
                                isAI: true,
                                aiPersonality: seat.aiPersonality,
                                aiDifficulty: e.target.value as AIDifficulty,
                              })
                            }
                            className="bg-white border border-[#e8e2d5] rounded-xl px-2 py-1 text-[11px] text-slate-800 font-semibold"
                          >
                            {Object.values(AI_DIFFICULTIES).map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.id}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              onConfigureSeatAI({
                                seatIndex: seat.seatIndex,
                                isAI: false,
                              })
                            }
                            className="p-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-[#e8e2d5]"
                            title={t('removeAi')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Ready Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border ${
                          seat.isReady || seat.isAI
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{seat.isReady || seat.isAI ? t('readyWord') : t('notReadyWord')}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* World Selection */}
        <WorldPicker
          worldId={room.config.worldId}
          canChange={isHost}
          onChange={(worldId) => onConfigureRoom({ config: { worldId } })}
        />

        {/* Host Match Configuration */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#e8e2d5]">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {t('modeLabelLobby')}
            </label>
            <select
              disabled={!isHost}
              value={room.config.gameMode || 'CHAOS'}
              onChange={(e) =>
                onConfigureRoom({
                  config: { gameMode: e.target.value as 'CLASSIC' | 'CHAOS' },
                })
              }
              className="w-full bg-white border border-[#e8e2d5] rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold disabled:opacity-60"
            >
              <option value="CHAOS">{t('chaosModeOpt')}</option>
              <option value="CLASSIC">{t('classicModeOpt')}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {t('capacityLabel')}
            </label>
            <select
              disabled={!isHost}
              value={room.capacity}
              onChange={(e) => onConfigureRoom({ capacity: Number(e.target.value) })}
              className="w-full bg-white border border-[#e8e2d5] rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold disabled:opacity-60"
            >
              <option value={2}>2 {t('playersWord')}</option>
              <option value={3}>3 {t('playersWord')}</option>
              <option value={4}>4 {t('playersWord')}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {t('startingCashLabelLobby')}
            </label>
            <select
              disabled={!isHost}
              value={room.config.startingCash}
              onChange={(e) =>
                onConfigureRoom({ config: { startingCash: Number(e.target.value) } })
              }
              className="w-full bg-white border border-[#e8e2d5] rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold disabled:opacity-60"
            >
              <option value={1000}>{t('cashQuick')}</option>
              <option value={1500}>{t('cashStandard')}</option>
              <option value={2000}>{t('cashTycoon')}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {t('maxRoundsLabel')}
            </label>
            <select
              disabled
              value={0}
              className="w-full bg-white border border-[#e8e2d5] rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold disabled:opacity-60"
            >
              <option value={0}>{t('noRoundCapLobby')}</option>
            </select>
          </div>
        </div>

        {/* Ready & Start Match Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          {mySeat && !mySeat.isAI && (
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                onSetReady(!mySeat.isReady);
              }}
              data-testid="lobby-ready-btn"
              className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase border transition-all flex items-center justify-center gap-2 ${
                mySeat.isReady
                  ? 'bg-white text-slate-700 border-[#e8e2d5] hover:bg-slate-100'
                  : 'bg-emerald-600 text-white border-emerald-500 shadow-md active:scale-95'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{mySeat.isReady ? t('cancelReady') : t('readyUp')}</span>
            </button>
          )}

          {isHost ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={() => {
                soundEffects.buyProperty();
                onStartMatch();
              }}
              data-testid="lobby-start-match-btn"
              className={`flex-1 w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                canStart
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t('lobbyStartBtn')} ({room.seats.length} {t('playersWord')})</span>
            </button>
          ) : (
            <div className="flex-1 w-full py-3 px-4 rounded-2xl bg-white border border-[#e8e2d5] text-center text-xs text-slate-500 font-semibold">
              {t('waitingForHost')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
