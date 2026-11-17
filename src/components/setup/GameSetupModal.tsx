import { formatMoney } from '../../utils/money';
/**
 * CHAOS MONOPOLY — Game Setup Modal (Warm Premium Edition)
 * Simple, intuitive setup: Classic/Chaos mode, 4 Playable Worlds,
 * 2-4 Players (Human/AI with difficulty), and Online Room Management.
 */

import React, { useState } from 'react';
import { DEFAULT_PLAYER_TOKENS } from '../../game/board/boardData';
import {
  AIDifficulty,
  AIPersonalityId,
  GameState,
  PlayerToken,
} from '../../game/types';
import { SavedMatchData } from '../../game/storage/matchStorage';
import { StoredOnlineCredentials } from '../../multiplayer/client';
import { DEFAULT_WORLD_ID, WorldCatalogEntry } from '../../worlds/types';
import { WORLD_CATALOG } from '../../worlds/catalog';
import { useModalDismiss } from '../common/useModalDismiss';
import { COSMETIC_UI, getLocale } from '../../worlds/i18n';
import {
  Sparkles,
  Users,
  Play,
  Bot,
  User,
  PlusCircle,
  KeyRound,
  Shield,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

export type SetupModeTab = 'LOCAL' | 'CREATE_ONLINE' | 'JOIN_ONLINE';

interface GameSetupModalProps {
  initialTab?: SetupModeTab;
  onClose?: () => void;
  savedMatch?: SavedMatchData | null;
  storedOnlineSession?: StoredOnlineCredentials | null;
  onlineError?: string | null;
  onResumeMatch?: (savedState: GameState) => void;
  onDiscardSavedMatch?: () => void;
  onReconnectOnlineSession?: (creds: StoredOnlineCredentials) => void;
  onDiscardOnlineSession?: () => void;
  onCreateOnlineRoom?: (params: {
    playerName: string;
    roomName: string;
    capacity: number;
    token: PlayerToken;
    config: { startingCash: number; maxRounds: number; worldId?: string; gameMode?: 'CLASSIC' | 'CHAOS' };
  }) => void;
  onJoinOnlineRoom?: (params: {
    roomCode: string;
    playerName: string;
    token: PlayerToken;
  }) => void;
  onStartGame: (
    players: {
      name: string;
      token: PlayerToken;
      isAI?: boolean;
      aiPersonality?: AIPersonalityId;
      aiDifficulty?: AIDifficulty;
    }[],
    config: { startingCash: number; maxRounds: number; worldId?: string; gameMode?: 'CLASSIC' | 'CHAOS' }
  ) => void;
}

const VIETNAMESE_TOKENS: PlayerToken[] = [
  {
    id: 'token-vinfast',
    name: 'Xe VinFast',
    symbol: '🚗',
    colorHex: '#0284c7',
    accentHex: '#38bdf8',
    avatarIcon: 'Car',
  },
  {
    id: 'token-metro',
    name: 'Metro Train',
    symbol: '🚄',
    colorHex: '#d97706',
    accentHex: '#f59e0b',
    avatarIcon: 'Train',
  },
  {
    id: 'token-meo-than-tai',
    name: 'Lucky Cat',
    symbol: '🐱',
    colorHex: '#16a34a',
    accentHex: '#4ade80',
    avatarIcon: 'Sparkles',
  },
  {
    id: 'token-vinasat',
    name: 'Satellite',
    symbol: '🚀',
    colorHex: '#dc2626',
    accentHex: '#f87171',
    avatarIcon: 'Rocket',
  },
];

/**
 * Server room codes look like `CHAOS-AB12` (or `CHAOS-` + 6 hex on collision fallback).
 * Players may type just the suffix; returns the full code, or null while the input is incomplete.
 */
export function normalizeJoinRoomCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const suffix = cleaned.startsWith('CHAOS-') ? cleaned.slice('CHAOS-'.length) : cleaned;
  if (!/^[A-Z0-9]{4,6}$/.test(suffix)) return null;
  return `CHAOS-${suffix}`;
}

export const GameSetupModal: React.FC<GameSetupModalProps> = ({
  initialTab = 'LOCAL',
  onClose,
  savedMatch: _savedMatch,
  storedOnlineSession: _storedOnlineSession,
  onlineError,
  onResumeMatch: _onResumeMatch,
  onDiscardSavedMatch: _onDiscardSavedMatch,
  onReconnectOnlineSession: _onReconnectOnlineSession,
  onDiscardOnlineSession: _onDiscardOnlineSession,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onStartGame,
}) => {
  const locale = getLocale();
  const t = (key: keyof typeof COSMETIC_UI) => COSMETIC_UI[key][locale];
  /** Token names are display-only; keep the stored token data untouched. */
  const tokenDisplayName = (tokenId: string): string => {
    switch (tokenId) {
      case 'token-vinfast':
        return t('tokenVinfast');
      case 'token-metro':
        return t('tokenMetro');
      case 'token-meo-than-tai':
        return t('tokenLuckyCat');
      case 'token-vinasat':
        return t('tokenSatellite');
      default:
        return tokenId;
    }
  };
  const [activeTab, setActiveTab] = useState<SetupModeTab>(initialTab);

  // Game Mode: Classic vs Chaos
  const [isChaosMode, setIsChaosMode] = useState<boolean>(true);

  // Local Match Configuration
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [playerNames, setPlayerNames] = useState<string[]>([
    t('setupDefaultAlpha'),
    t('setupDefaultBeta'),
    t('setupDefaultGamma'),
    t('setupDefaultOmega'),
  ]);
  const [isAIFlags, setIsAIFlags] = useState<boolean[]>([false, true, true, true]);
  const [aiPersonalities] = useState<AIPersonalityId[]>([
    'STRATEGIST',
    'SHARK',
    'STRATEGIST',
    'TYCOON',
  ]);
  const [aiDifficulties, setAiDifficulties] = useState<AIDifficulty[]>([
    'NORMAL',
    'NORMAL',
    'HARD',
    'NORMAL',
  ]);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([
    VIETNAMESE_TOKENS[0].id,
    VIETNAMESE_TOKENS[1].id,
    VIETNAMESE_TOKENS[2].id,
    VIETNAMESE_TOKENS[3].id,
  ]);
  const [worldId, setWorldId] = useState<string>(DEFAULT_WORLD_ID);
  const [startingCash, setStartingCash] = useState<number>(1500);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Online Mode Inputs
  const [onlinePlayerName, setOnlinePlayerName] = useState<string>('');
  const [onlineRoomName, setOnlineRoomName] = useState<string>(t('defaultLobbyName'));
  const [onlineRoomCodeInput, setOnlineRoomCodeInput] = useState<string>('');
  const normalizedJoinCode = normalizeJoinRoomCode(onlineRoomCodeInput);
  const [onlineCapacity, setOnlineCapacity] = useState<number>(4);
  const [onlineTokenId, setOnlineTokenId] = useState<string>(VIETNAMESE_TOKENS[0].id);

  const handleNameChange = (index: number, newName: string) => {
    const updated = [...playerNames];
    updated[index] = newName;
    setPlayerNames(updated);
  };

  const handleToggleAI = (index: number, isAI: boolean) => {
    soundEffects.click();
    const updated = [...isAIFlags];
    updated[index] = isAI;
    setIsAIFlags(updated);
  };

  const handleDifficultyChange = (index: number, diff: AIDifficulty) => {
    soundEffects.click();
    const updated = [...aiDifficulties];
    updated[index] = diff;
    setAiDifficulties(updated);
  };

  const handleTokenSelect = (playerIdx: number, tokenId: string) => {
    soundEffects.click();
    const updated = [...selectedTokenIds];
    updated[playerIdx] = tokenId;
    setSelectedTokenIds(updated);
  };

  const handleStartLocal = () => {
    soundEffects.buyProperty();
    const selectedPlayers = Array.from({ length: playerCount }).map((_, idx) => {
      const tokenId = selectedTokenIds[idx];
      const token =
        VIETNAMESE_TOKENS.find((t) => t.id === tokenId) ||
        DEFAULT_PLAYER_TOKENS[idx % DEFAULT_PLAYER_TOKENS.length];

      const isAI = isAIFlags[idx];
      return {
        name: playerNames[idx]?.trim() || `${t('playerFallbackName')} ${idx + 1}`,
        token,
        isAI,
        aiPersonality: isAI ? aiPersonalities[idx] : undefined,
        aiDifficulty: isAI ? aiDifficulties[idx] : undefined,
      };
    });

    onStartGame(selectedPlayers, {
      startingCash,
      maxRounds: 0,
      worldId,
      gameMode: isChaosMode ? 'CHAOS' : 'CLASSIC',
    });
  };

  const selectedOnlineToken =
    VIETNAMESE_TOKENS.find((t) => t.id === onlineTokenId) || VIETNAMESE_TOKENS[0];

  const availableWorlds = WORLD_CATALOG.filter((w: WorldCatalogEntry) => w.availability === 'AVAILABLE');

  const { backdropProps } = useModalDismiss({
    isOpen: true,
    onClose,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
      {...backdropProps}
      data-testid="game-setup-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-5 sm:p-6 flex flex-col gap-4 relative z-10 my-auto text-slate-900"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8e2d5]">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black font-serif text-slate-900 uppercase">
              {t('setupTitle')}
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-600 border border-[#e8e2d5] transition-all"
            >
              ✕ {t('closeX')}
            </button>
          )}
        </div>

        {/* Setup Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#e8e2d5]">
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setActiveTab('LOCAL');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'LOCAL'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('setupTabLocal')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setActiveTab('CREATE_ONLINE');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'CREATE_ONLINE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('setupTabCreate')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              setActiveTab('JOIN_ONLINE');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'JOIN_ONLINE'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t('setupTabJoin')}</span>
          </button>
        </div>

        {/* TAB 1: LOCAL / VS AI */}
        {activeTab === 'LOCAL' && (
          <div className="space-y-4">
            {/* 1. Mode Selector: Classic vs Chaos */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                {t('setupModeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    setIsChaosMode(false);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    !isChaosMode
                      ? 'bg-white border-amber-600 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-white/60 border-[#e8e2d5] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">{t('setupModeClassic')}</span>
                    <span className="text-[10px] text-slate-500">{t('setupModeClassicDesc')}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    setIsChaosMode(true);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    isChaosMode
                      ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-white/60 border-[#e8e2d5] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">{t('setupModeChaos')}</span>
                    <span className="text-[10px] text-slate-500">{t('setupModeChaosDesc')}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. World Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                {t('setupWorldLabel')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableWorlds.map((world) => {
                  const isSelected = world.id === worldId;
                  return (
                    <button
                      key={world.id}
                      type="button"
                      onClick={() => {
                        soundEffects.click();
                        setWorldId(world.id);
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'bg-white border-amber-600 shadow-md ring-2 ring-amber-500/20 scale-[1.02]'
                          : 'bg-white/70 border-[#e8e2d5] hover:bg-white'
                      }`}
                    >
                      <span className="text-xs font-black text-slate-900 block truncate">
                        {world.name[locale]}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {world.tagline[locale].split('•')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Player Count & Configuration */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {t('setupPlayerCount')}
                </label>
                <div className="flex items-center gap-1">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        soundEffects.click();
                        setPlayerCount(count);
                      }}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                        playerCount === count
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-[#e8e2d5]'
                      }`}
                    >
                      {count}P
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Slots */}
              <div className="space-y-2">
                {Array.from({ length: playerCount }).map((_, idx) => {
                  const isAI = isAIFlags[idx];
                  const currentTokenId = selectedTokenIds[idx];
                  const currentToken =
                    VIETNAMESE_TOKENS.find((t) => t.id === currentTokenId) || VIETNAMESE_TOKENS[idx % 4];

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl bg-white border border-[#e8e2d5] flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {/* Token Selector Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextIdx = (VIETNAMESE_TOKENS.findIndex((t) => t.id === currentTokenId) + 1) % VIETNAMESE_TOKENS.length;
                            handleTokenSelect(idx, VIETNAMESE_TOKENS[nextIdx].id);
                          }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-sm ring-1 ring-black/10 shrink-0 text-white font-bold"
                          style={{ backgroundColor: currentToken.colorHex }}
                          title={t('changeToken')}
                        >
                          {currentToken.symbol}
                        </button>

                        {/* Name Input */}
                        <input
                          type="text"
                          value={playerNames[idx] || ''}
                          onChange={(e) => handleNameChange(idx, e.target.value)}
                          className="w-full text-xs font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-amber-600 outline-none px-1 py-0.5"
                          placeholder={`${t('playerFallbackName')} ${idx + 1}`}
                        />
                      </div>

                      {/* AI vs Human Toggle */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAI(idx, !isAI)}
                          className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${
                            isAI
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isAI ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          <span>{isAI ? t('aiWord') : t('humanWord')}</span>
                        </button>

                        {/* AI Difficulty Selector */}
                        {isAI && (
                          <select
                            value={aiDifficulties[idx] || 'NORMAL'}
                            onChange={(e) => handleDifficultyChange(idx, e.target.value as AIDifficulty)}
                            className="text-[11px] font-bold bg-[#faf8f5] border border-[#e8e2d5] text-slate-800 rounded-xl px-1.5 py-1 outline-none"
                          >
                            <option value="EASY">{t('diffEasy')}</option>
                            <option value="NORMAL">{t('diffNormal')}</option>
                            <option value="HARD">{t('diffHard')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Advanced Settings Accordion */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{t('setupAdvanced')}</span>
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showAdvanced && (
                <div className="mt-2 p-3 rounded-2xl bg-white border border-[#e8e2d5] grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      {t('setupStartingCash')} {formatMoney(startingCash)}
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max="3000"
                      step="250"
                      value={startingCash}
                      onChange={(e) => setStartingCash(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-slate-500">
                    {t('setupNoRoundCap')}
                  </p>
                </div>
              )}
            </div>

            {/* Start Game Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartLocal}
                className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/15 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t('setupStartBtn')}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE ONLINE ROOM */}
        {activeTab === 'CREATE_ONLINE' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                {t('setupHostName')}
              </label>
              <input
                type="text"
                value={onlinePlayerName}
                onChange={(e) => setOnlinePlayerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                placeholder={t('yourNamePlaceholder')}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                {t('setupRoomName')}
              </label>
              <input
                type="text"
                value={onlineRoomName}
                onChange={(e) => setOnlineRoomName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                placeholder={t('setupRoomNamePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  {t('setupCapacity')}
                </label>
                <select
                  value={onlineCapacity}
                  onChange={(e) => setOnlineCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-900 outline-none"
                >
                  <option value={2}>2 {t('playersWord')}</option>
                  <option value={3}>3 {t('playersWord')}</option>
                  <option value={4}>4 {t('playersWord')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  {t('setupWorldSelect')}
                </label>
                <select
                  value={worldId}
                  onChange={(e) => setWorldId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-900 outline-none"
                >
                  {availableWorlds.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name[locale]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Token Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                {t('setupChooseToken')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {VIETNAMESE_TOKENS.map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      setOnlineTokenId(token.id);
                    }}
                    className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      onlineTokenId === token.id
                        ? 'bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-white/70 border-[#e8e2d5]'
                    }`}
                  >
                    <span className="text-xl">{token.symbol}</span>
                    <span className="text-[10px] font-bold text-slate-800">{tokenDisplayName(token.id)}</span>
                  </button>
                ))}
              </div>
            </div>

            {onlineError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                ⚠️ {onlineError}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                soundEffects.buyProperty();
                onCreateOnlineRoom?.({
                  playerName: onlinePlayerName.trim() || t('defaultTycoonName'),
                  roomName: onlineRoomName.trim() || t('defaultRoomName'),
                  capacity: onlineCapacity,
                  token: selectedOnlineToken,
                  config: { startingCash: 1500, maxRounds: 0, worldId, gameMode: isChaosMode ? 'CHAOS' : 'CLASSIC' },
                });
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('setupCreateBtn')}</span>
            </button>
          </div>
        )}

        {/* TAB 3: JOIN ONLINE ROOM */}
        {activeTab === 'JOIN_ONLINE' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                {t('setupPlayerName')}
              </label>
              <input
                type="text"
                value={onlinePlayerName}
                onChange={(e) => setOnlinePlayerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e8e2d5] text-xs font-bold text-slate-900 outline-none focus:border-sky-600"
                placeholder={t('yourNamePlaceholder')}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                {t('setupRoomCode')}
              </label>
              <input
                type="text"
                maxLength={12}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={onlineRoomCodeInput}
                onChange={(e) => setOnlineRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                className="w-full px-3.5 py-3 rounded-xl bg-white border border-[#e8e2d5] text-center font-mono text-lg font-black tracking-widest text-slate-900 outline-none focus:border-sky-600 uppercase"
                placeholder="CHAOS-AB12"
              />
            </div>

            {/* Token Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                {t('setupChooseToken')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {VIETNAMESE_TOKENS.map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      setOnlineTokenId(token.id);
                    }}
                    className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      onlineTokenId === token.id
                        ? 'bg-white border-sky-600 shadow-sm ring-2 ring-sky-500/20'
                        : 'bg-white/70 border-[#e8e2d5]'
                    }`}
                  >
                    <span className="text-xl">{token.symbol}</span>
                    <span className="text-[10px] font-bold text-slate-800">{tokenDisplayName(token.id)}</span>
                  </button>
                ))}
              </div>
            </div>

            {onlineError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                ⚠️ {onlineError}
              </div>
            )}

            <button
              type="button"
              disabled={!normalizedJoinCode}
              onClick={() => {
                if (!normalizedJoinCode) return;
                soundEffects.buyProperty();
                onJoinOnlineRoom?.({
                  roomCode: normalizedJoinCode,
                  playerName: onlinePlayerName.trim() || t('playerFallbackName'),
                  token: selectedOnlineToken,
                });
              }}
              className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                normalizedJoinCode
                  ? 'bg-sky-700 hover:bg-sky-600 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{t('joinRoomBtn')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
