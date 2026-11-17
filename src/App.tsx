import React, { useMemo, useReducer, useState, useEffect, useRef } from 'react';
import { gameReducer, INITIAL_GAME_STATE } from './game/gameReducer';
import { getTileById } from './game/property/propertyEngine';
import {
  saveMatchToStorage,
  loadMatchFromStorage,
  clearMatchFromStorage,
  SavedMatchData,
} from './game/storage/matchStorage';
import { computeNextAIDecision, getActiveAIActor } from './game/ai/aiDecisionEngine';
import {
  ChaosMultiplayerClient,
  ConnectionStatus,
  loadStoredOnlineCredentials,
  clearStoredOnlineCredentials,
  StoredOnlineCredentials,
} from './multiplayer/client';
import { ClientIntentPayload, RoomPublicSummary } from './multiplayer/protocol';
import { HeaderBar, AISpeedPreset } from './components/common/HeaderBar';
import { BoardView } from './components/board/BoardView';
import { CameraState, DEFAULT_CAMERA } from './components/board/spatialMath';
import { ActionPanel } from './components/action-panel/ActionPanel';
import { PlayerLeaderboard } from './components/player-panel/PlayerLeaderboard';
import { EventFeed } from './components/event-feed/EventFeed';
import { rollTwoDice } from './game/dice/diceEngine';
import { formatMoney } from './utils/money';
import { soundEffects } from './game/sound/soundEngine';
import { setSoundListener } from './game/sound/soundEmitter';
import { GameState, PlayerId, AIDifficulty, AIPersonalityId } from './game/types';
import { DEFAULT_WORLD_ID } from './worlds/types';
import { GAME_UI, useLocale, WORLD_UI } from './worlds/i18n';
import { setActiveWorldNames, useWorldConfig } from './worlds/runtime';
import { WorldEnvironment, WorldIntroOverlay } from './components/worlds/WorldEnvironment';
import { MainMenu } from './components/menu/MainMenu';
import { EmoteBar, EmoteOverlay, FloatingEmote } from './components/emotes/EmoteBar';
import { QuickChatBar } from './components/emotes/QuickChatBar';
import { getQuickChatText } from './game/social/quickChat';
import { usePlayerProfile, recordMatchResult } from './cosmetics/storage';
import { startAmbientMusic, stopAmbientMusic } from './cosmetics/audioSettings';
import { getCosmeticItem } from './cosmetics/catalog';
import { DEFAULT_PLAYER_TOKENS } from './game/board/boardData';
import type { SetupModeTab } from './components/setup/GameSetupModal';
import { Wifi, WifiOff, LogOut } from 'lucide-react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ActionTicker } from './components/common/ActionTicker';
import { LiveAnnouncer } from './components/common/LiveAnnouncer';
import { ScreenShakeBox } from './components/fx/ScreenShakeBox';
import { shake } from './game/fx/screenShake';
import { setMusicIntensity } from './cosmetics/audioSettings';
import { DailyQuestsPanel } from './components/quests/DailyQuestsPanel';
import { recordQuestEvent } from './game/quests/dailyQuests';
import { OrientationBanner } from './components/common/OrientationBanner';
import { TurnTransitionBanner } from './components/common/TurnTransitionBanner';

// Phase 07: Performance Optimization - Code-split heavy modals to minimize initial bundle
const GameSetupModal = React.lazy(() =>
  import('./components/setup/GameSetupModal').then((m) => ({ default: m.GameSetupModal }))
);
const OnlineLobbyModal = React.lazy(() =>
  import('./components/multiplayer/OnlineLobbyModal').then((m) => ({ default: m.OnlineLobbyModal }))
);
const ChaosModal = React.lazy(() =>
  import('./components/chaos/ChaosModal').then((m) => ({ default: m.ChaosModal }))
);
const PropertyDetailModal = React.lazy(() =>
  import('./components/modals/PropertyDetailModal').then((m) => ({ default: m.PropertyDetailModal }))
);
const RulesModal = React.lazy(() =>
  import('./components/modals/RulesModal').then((m) => ({ default: m.RulesModal }))
);
const VictoryModal = React.lazy(() =>
  import('./components/modals/VictoryModal').then((m) => ({ default: m.VictoryModal }))
);
const AuctionModal = React.lazy(() =>
  import('./components/modals/AuctionModal').then((m) => ({ default: m.AuctionModal }))
);
const TradeModal = React.lazy(() =>
  import('./components/modals/TradeModal').then((m) => ({ default: m.TradeModal }))
);
const DebtSettlementModal = React.lazy(() =>
  import('./components/modals/DebtSettlementModal').then((m) => ({ default: m.DebtSettlementModal }))
);
const CollectionModal = React.lazy(() =>
  import('./components/cosmetics/CollectionModal').then((m) => ({ default: m.CollectionModal }))
);
const ShopModal = React.lazy(() =>
  import('./components/cosmetics/ShopModal').then((m) => ({ default: m.ShopModal }))
);
const ProfileModal = React.lazy(() =>
  import('./components/profile/ProfileModal').then((m) => ({ default: m.ProfileModal }))
);
const SettingsModal = React.lazy(() =>
  import('./components/settings/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);

const AI_DELAY_MS: Record<AISpeedPreset, number> = {
  NORMAL: 550,
  FAST: 280,
  TURBO: 110,
};

const LOCAL_TURN_MS = 60_000;
const LOCAL_POSTPONE_MS = 30_000;

export const App: React.FC = () => {
  const [localState, dispatchLocal] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [localTurnDeadline, setLocalTurnDeadline] = useState<number | null>(null);
  /**
   * Tile detail is a per-viewer action (roadmap fix): online, opening a tile must never open
   * it for everyone else, so the selection lives here instead of in the shared game state.
   */
  const [viewerSelectedTile, setViewerSelectedTile] = useState<number | null>(null);
  const [is3DView, setIs3DView] = useState<boolean>(true);
  const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA);
  const [aiSpeed, setAiSpeed] = useState<AISpeedPreset>('NORMAL');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showTradeModal, setShowTradeModal] = useState<boolean>(false);
  const [savedMatch, setSavedMatch] = useState<SavedMatchData | null>(() =>
    loadMatchFromStorage()
  );

  // Helper to determine if stored online session is still valid (< 2 hours old)
  const isRecentOnlineSession = (creds: StoredOnlineCredentials | null): boolean => {
    return Boolean(creds && Date.now() - (creds.savedAt || 0) < 2 * 60 * 60 * 1000);
  };

  // Player Profile & Cosmetic System (Phase 06)
  const profile = usePlayerProfile();
  const [storedOnlineSession, setStoredOnlineSession] = useState<StoredOnlineCredentials | null>(
    () => loadStoredOnlineCredentials()
  );
  const [isAutoReconnecting, setIsAutoReconnecting] = useState<boolean>(() => {
    return isRecentOnlineSession(loadStoredOnlineCredentials());
  });
  const [showMainMenu, setShowMainMenu] = useState<boolean>(() => {
    const creds = loadStoredOnlineCredentials();
    if (isRecentOnlineSession(creds)) {
      return false;
    }
    return localState.status === 'SETUP';
  });
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [setupInitialTab, setSetupInitialTab] = useState<SetupModeTab>('LOCAL');
  const [showCollectionModal, setShowCollectionModal] = useState<boolean>(false);
  const [showShopModal, setShowShopModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [activeEmotes, setActiveEmotes] = useState<FloatingEmote[]>([]);
  const recordedMatchRef = useRef<boolean>(false);

  // Online Multiplayer State
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);
  const [onlineRoom, setOnlineRoom] = useState<RoomPublicSummary | null>(null);
  const [onlineGameState, setOnlineGameState] = useState<GameState | null>(null);
  const [myOnlinePlayerId, setMyOnlinePlayerId] = useState<PlayerId | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineNotification, setOnlineNotification] = useState<string | null>(null);

  const mpClientRef = useRef<ChaosMultiplayerClient | null>(null);
  const aiStepCountRef = useRef<number>(0);
  const lastActivePlayerIdRef = useRef<string | null>(null);
  const diceRollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state: GameState = isOnlineMode && onlineGameState ? onlineGameState : localState;

  // Phase 05: Active World Runtime & Localization
  const [locale] = useLocale();
  const activeWorldId =
    state.config.worldId || onlineRoom?.config.worldId || DEFAULT_WORLD_ID;
  const worldRuntime = useWorldConfig(activeWorldId);
  const [showWorldIntro, setShowWorldIntro] = useState<boolean>(false);
  const prevStatusRef = useRef<GameState['status']>(state.status);

  useEffect(() => {
    setActiveWorldNames(worldRuntime.config?.pack.tileNames ?? {}, locale);
  }, [worldRuntime.config, locale]);

  // An online match starting (from the lobby opened on top of the main menu) must reveal the board.
  const prevOnlineStatusRef = useRef<GameState['status'] | null>(null);
  useEffect(() => {
    const status = onlineGameState?.status ?? null;
    if (isOnlineMode && status === 'PLAYING' && prevOnlineStatusRef.current !== 'PLAYING') {
      setShowMainMenu(false);
      setShowSetupModal(false);
    }
    prevOnlineStatusRef.current = status;
  }, [isOnlineMode, onlineGameState?.status]);

  useEffect(() => {
    if (prevStatusRef.current !== 'PLAYING' && state.status === 'PLAYING') {
      setShowWorldIntro(true);
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    setSoundListener((effect) => {
      if ((soundEffects as any)[effect]) {
        (soundEffects as any)[effect]();
      }
    });
    return () => setSoundListener(null);
  }, []);

  // Adaptive music (roadmap 8.4): calm → tense → climax, crossfaded over 2 s.
  useEffect(() => {
    if (state.status !== 'PLAYING') {
      setMusicIntensity('CALM');
      return;
    }
    const anyNearBankruptcy = state.players.some(p => !p.isBankrupt && p.cash < 100);
    if (state.pendingDebt || state.activeAuction || anyNearBankruptcy) {
      setMusicIntensity('CLIMAX');
      return;
    }
    if (state.activeChaosCard || state.activeTrade) {
      setMusicIntensity('TENSE');
      return;
    }
    setMusicIntensity('CALM');
  }, [state.status, state.pendingDebt, state.activeAuction, state.activeChaosCard, state.activeTrade, state.players]);

  // Screen shake (roadmap 8.2): heavy on an elimination, medium on a new fine/debt, light on my purchase.
  const prevShakeStateRef = useRef<{ bankrupt: number; debt: boolean; myTiles: number } | null>(null);
  useEffect(() => {
    if (state.status !== 'PLAYING') {
      prevShakeStateRef.current = null;
      return;
    }
    const bankruptCount = state.players.filter(p => p.isBankrupt).length;
    const hasDebt = Boolean(state.pendingDebt);
    const myId = isOnlineMode ? myOnlinePlayerId : state.players[state.activePlayerIndex]?.id ?? null;
    const myTiles = myId
      ? Object.values(state.properties).filter(prop => prop.ownerId === myId).length
      : 0;

    const prev = prevShakeStateRef.current;
    prevShakeStateRef.current = { bankrupt: bankruptCount, debt: hasDebt, myTiles };
    if (!prev) return;

    if (bankruptCount > prev.bankrupt) {
      shake('HEAVY');
      return;
    }
    if (hasDebt && !prev.debt) {
      shake('MEDIUM');
      return;
    }
    if (myTiles > prev.myTiles) {
      shake('LIGHT');
    }
  }, [state, isOnlineMode, myOnlinePlayerId]);

  // Initialize Multiplayer Client handler
  const getOrCreateMpClient = (): ChaosMultiplayerClient => {
    if (!mpClientRef.current) {
      mpClientRef.current = new ChaosMultiplayerClient({
        onConnectionStatusChange: (status) => {
          setConnectionStatus(status);
        },
        onRoomUpdated: (room, assignedPlayerId) => {
          setIsOnlineMode(true);
          setOnlineRoom(room);
          setMyOnlinePlayerId(assignedPlayerId);
          setOnlineError(null);
          setIsAutoReconnecting(false);
          setShowMainMenu(false);
          setStoredOnlineSession(loadStoredOnlineCredentials());
        },
        onGameStateSync: (syncedState, _version, room) => {
          setIsOnlineMode(true);
          setOnlineRoom(room);
          setOnlineGameState(syncedState);
          setOnlineError(null);
          setIsAutoReconnecting(false);
          setShowMainMenu(false);
        },
        onError: (code, messageVi) => {
          setOnlineError(messageVi);
          if (
            code === 'INVALID_RECONNECT_TOKEN' ||
            code === 'ROOM_EXPIRED' ||
            code === 'ROOM_NOT_FOUND' ||
            code === 'NOT_ROOM_MEMBER' ||
            code === 'RECONNECT_FAILED'
          ) {
            clearStoredOnlineCredentials();
            setStoredOnlineSession(null);
            setIsAutoReconnecting(false);
            setIsOnlineMode(false);
            setShowMainMenu(true);
            setOnlineNotification(`Không thể kết nối lại phòng chơi (${messageVi}). Đã trở về menu chính.`);
          }
        },
        onNotification: (messageVi) => {
          setOnlineNotification(messageVi);
        },
        onEmoteReceived: (playerId, playerName, emoteId) => {
          handleDisplayEmote(playerId, playerName, emoteId);
        },
      });
    }
    return mpClientRef.current;
  };

  const handleCancelAutoReconnect = () => {
    mpClientRef.current?.disconnect();
    clearStoredOnlineCredentials();
    setStoredOnlineSession(null);
    setIsAutoReconnecting(false);
    setIsOnlineMode(false);
    setShowMainMenu(true);
  };

  // R3-F02: Auto-reconnect to active online session on page load/refresh
  useEffect(() => {
    const creds = loadStoredOnlineCredentials();
    if (creds && isRecentOnlineSession(creds)) {
      setIsAutoReconnecting(true);
      setShowMainMenu(false);
      const client = getOrCreateMpClient();
      client.sendReconnect(creds.roomCode, creds.playerId, creds.reconnectToken);
    } else if (creds) {
      clearStoredOnlineCredentials();
      setStoredOnlineSession(null);
    }
  }, []);

  const handleDisplayEmote = (_playerId: string, playerName: string, emoteId: string) => {
    soundEffects.click();
    const quickChat = getQuickChatText(emoteId, locale);
    const item = quickChat ? null : getCosmeticItem(emoteId);
    const emoteSymbol = quickChat ?? (item ? item.name.vi.split(' ').pop() || '✨' : '✨');
    const newBubble: FloatingEmote = {
      id: `emote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderName: playerName,
      emoteSymbol,
      timestamp: Date.now(),
    };
    setActiveEmotes(prev => [...prev.slice(-4), newBubble]);
    setTimeout(() => {
      setActiveEmotes(prev => prev.filter(b => b.id !== newBubble.id));
    }, 3200);
  };

  const handleSendEmote = (emoteId: string) => {
    const myName = isOnlineMode
      ? (onlineRoom?.seats.find(s => s.playerId === myOnlinePlayerId)?.name || profile.displayName)
      : profile.displayName;
    const myId = isOnlineMode ? (myOnlinePlayerId || 'p1') : (state.players[state.activePlayerIndex]?.id || 'p1');
    handleDisplayEmote(myId, myName, emoteId);
    if (isOnlineMode) {
      mpClientRef.current?.sendEmote(emoteId);
    }
  };

  const handleQuickPlay = (chosenWorldId?: string) => {
    clearMatchFromStorage();
    setSavedMatch(null);
    const targetWorld = chosenWorldId || activeWorldId;

    const players = [
      {
        name: profile.displayName || 'Tài Phiệt Alpha',
        token: DEFAULT_PLAYER_TOKENS[0],
        isAI: false,
      },
      {
        name: 'AI Cá Mập Cyber',
        token: DEFAULT_PLAYER_TOKENS[1],
        isAI: true,
        aiPersonality: 'SHARK' as AIPersonalityId,
        aiDifficulty: 'NORMAL' as AIDifficulty,
      },
      {
        name: 'AI Chiến Lược Gia',
        token: DEFAULT_PLAYER_TOKENS[2],
        isAI: true,
        aiPersonality: 'STRATEGIST' as AIPersonalityId,
        aiDifficulty: 'HARD' as AIDifficulty,
      },
    ];

    dispatchLocal({
      type: 'START_GAME',
      players,
      config: {
        startingCash: 1500,
        maxRounds: 0,
        worldId: targetWorld,
      },
    });
    setShowMainMenu(false);
    setShowSetupModal(false);
  };

  // Ambient procedural background audio & Match result recording
  useEffect(() => {
    if (state.status === 'PLAYING') {
      recordedMatchRef.current = false;
      startAmbientMusic(activeWorldId);
    } else if (state.status === 'ENDED') {
      stopAmbientMusic();
      if (!recordedMatchRef.current) {
        recordedMatchRef.current = true;
        const humanPlayer = state.players.find(p => !p.isAI) || state.players[0];
        const won = state.winner ? state.winner.id === humanPlayer?.id : false;
        const boughtCount = Object.values(state.properties).filter(
          pr => pr.ownerId === humanPlayer?.id
        ).length;
        const upgradedCount = Object.values(state.properties).filter(
          pr => pr.ownerId === humanPlayer?.id && (pr.level ?? 0) > 0
        ).length;
        recordQuestEvent('play', 1);
        if (won) recordQuestEvent('win', 1);
        recordQuestEvent('buy', boughtCount);
        recordQuestEvent('upgrade', upgradedCount);
        recordQuestEvent('rounds', state.roundNumber);
        recordMatchResult({
          won,
          netWorth: humanPlayer?.cash ?? 1500,
          propertiesBought: boughtCount,
          upgradesConstructed: upgradedCount,
          auctionsWon: 0,
          tradesCompleted: 0,
          chaosEventsSurvived: state.roundNumber,
          bankruptciesInflicted: 0,
        });
      }
    } else {
      stopAmbientMusic();
    }
    return () => {
      stopAmbientMusic();
    };
  }, [state.status, state.winner, state.roundNumber, state.properties, state.players, activeWorldId]);

  useEffect(() => {
    return () => {
      if (diceRollTimerRef.current) {
        clearTimeout(diceRollTimerRef.current);
      }
      mpClientRef.current?.disconnect();
    };
  }, []);

  // Auto-save active local match state to LocalStorage; clear on match completion
  useEffect(() => {
    if (isOnlineMode) return;
    if (localState.status === 'PLAYING') {
      saveMatchToStorage(localState);
    } else if (localState.status === 'ENDED') {
      clearMatchFromStorage();
      setSavedMatch(null);
    }
  }, [localState, isOnlineMode]);

  // Autonomous AI Turn & Multi-Actor Execution Loop (LOCAL MODE ONLY — Online AI runs on authoritative server)
  useEffect(() => {
    if (isOnlineMode) return;
    if (localState.status !== 'PLAYING' || localState.turnPhase === 'GAME_OVER') {
      return;
    }

    const activePlayer = localState.players[localState.activePlayerIndex];
    if (activePlayer?.id !== lastActivePlayerIdRef.current) {
      lastActivePlayerIdRef.current = activePlayer?.id || null;
      aiStepCountRef.current = 0;
    }

    const aiActor = getActiveAIActor(localState);
    if (!aiActor) {
      return;
    }

    let cancelled = false;
    const delayMs = AI_DELAY_MS[aiSpeed] || 500;

    const timer = setTimeout(() => {
      if (cancelled) return;

      // If AI is currently rolling dice, complete the dice roll result
      if (localState.turnPhase === 'ROLLING' && activePlayer?.id === aiActor.id) {
        const result = rollTwoDice();
        dispatchLocal({
          type: 'ROLL_DICE_RESULT',
          dice: result.dice,
          senderPlayerId: aiActor.id,
        });
        aiStepCountRef.current = 0;
        return;
      }

      const decision = computeNextAIDecision(localState, aiStepCountRef.current);
      if (!decision) return;

      dispatchLocal({ type: 'RECORD_AI_DECISION', decision: decision.reason });

      if (decision.action.type === 'ROLL_DICE_START') {
        dispatchLocal(decision.action);
        soundEffects.diceRoll();
        return;
      }

      if (
        decision.action.type !== 'PLACE_AUCTION_BID' &&
        decision.action.type !== 'PASS_AUCTION_BID' &&
        decision.action.type !== 'ACCEPT_TRADE' &&
        decision.action.type !== 'REJECT_TRADE'
      ) {
        aiStepCountRef.current += 1;
      }

      dispatchLocal(decision.action);
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isOnlineMode,
    localState.status,
    localState.turnPhase,
    localState.activePlayerIndex,
    localState.activeAuction,
    localState.activeTrade,
    localState.activeChaosCard,
    localState.pendingDebt,
    localState.players,
    localState.properties,
    aiSpeed,
  ]);

  // Unified Action Helper: routes to Server in Online Mode, or Local Reducer in Local Mode
  const sendIntentOrLocal = (intent: ClientIntentPayload) => {
    if (isOnlineMode) {
      mpClientRef.current?.submitAction(intent);
      return;
    }

    switch (intent.type) {
      case 'ROLL_DICE':
        handleRollDiceLocal();
        break;
      case 'PLACE_AUCTION_BID': {
        const currentBidderId = localState.activeAuction?.currentTurnBidderId;
        if (currentBidderId) {
          dispatchLocal({
            type: 'PLACE_AUCTION_BID',
            playerId: currentBidderId,
            bidAmount: intent.bidAmount,
          });
        }
        break;
      }
      case 'PASS_AUCTION_BID': {
        const currentBidderId = localState.activeAuction?.currentTurnBidderId;
        if (currentBidderId) {
          dispatchLocal({
            type: 'PASS_AUCTION_BID',
            playerId: currentBidderId,
          });
        }
        break;
      }
      case 'DECLARE_BANKRUPTCY': {
        const activePlayer = localState.players[localState.activePlayerIndex];
        if (activePlayer) {
          dispatchLocal({ type: 'DECLARE_BANKRUPTCY', playerId: activePlayer.id });
        }
        break;
      }
      default:
        dispatchLocal(intent as any);
        break;
    }
  };

  // Roll dice locally with realistic 700ms animation
  const handleRollDiceLocal = () => {
    if (localState.turnPhase !== 'WAITING_FOR_ROLL') return;

    if (diceRollTimerRef.current) {
      clearTimeout(diceRollTimerRef.current);
    }
    dispatchLocal({ type: 'ROLL_DICE_START' });
    soundEffects.diceRoll();

    diceRollTimerRef.current = setTimeout(() => {
      const result = rollTwoDice();
      dispatchLocal({ type: 'ROLL_DICE_RESULT', dice: result.dice });
      diceRollTimerRef.current = null;
    }, 700);
  };

  const handleRollDice = () => {
    if (isOnlineMode) {
      soundEffects.diceRoll();
      mpClientRef.current?.submitAction({ type: 'ROLL_DICE' });
    } else {
      handleRollDiceLocal();
    }
  };

  const handleLeaveOnlineRoom = () => {
    mpClientRef.current?.leaveRoom();
    setIsOnlineMode(false);
    setOnlineRoom(null);
    setOnlineGameState(null);
    setMyOnlinePlayerId(null);
    setOnlineError(null);
    setStoredOnlineSession(null);
  };

  const handleRestart = () => {
    if (isOnlineMode) {
      if (window.confirm('Bạn có muốn rời khỏi phòng trực tuyến hiện tại?')) {
        handleLeaveOnlineRoom();
      }
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn bỏ dở ván đấu hiện tại và bắt đầu lại?')) {
      clearMatchFromStorage();
      setSavedMatch(null);
      dispatchLocal({ type: 'RESTART_GAME' });
    }
  };

  // Hot-seat turn clock: only when 2+ human players share this device, same rules as the server.
  useEffect(() => {
    if (isOnlineMode || localState.status !== 'PLAYING') {
      setLocalTurnDeadline(null);
      return;
    }
    const active = localState.players[localState.activePlayerIndex];
    const humanCount = localState.players.filter(p => !p.isAI && !p.isBankrupt).length;
    if (!active || active.isAI || humanCount < 2) {
      setLocalTurnDeadline(null);
      return;
    }
    setLocalTurnDeadline(Date.now() + LOCAL_TURN_MS);
  }, [localState, isOnlineMode]);

  useEffect(() => {
    if (localTurnDeadline === null) return;
    const id = window.setInterval(() => {
      if (Date.now() < localTurnDeadline) return;
      if (localState.turnPhase === 'WAITING_FOR_ROLL') {
        handleRollDiceLocal();
      } else if (localState.turnPhase === 'ACTION_MENU') {
        dispatchLocal({ type: 'END_TURN' });
      } else {
        setLocalTurnDeadline(Date.now() + LOCAL_POSTPONE_MS);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [localTurnDeadline, localState.turnPhase]);

  // Keyboard Shortcuts: Space to roll, Enter to end turn, Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const activePlayer = state.players[state.activePlayerIndex];
      if (activePlayer?.isAI) return;
      if (isOnlineMode && activePlayer?.id !== myOnlinePlayerId) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.status === 'PLAYING' && state.turnPhase === 'WAITING_FOR_ROLL') {
          handleRollDice();
        }
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (state.status === 'PLAYING' && state.turnPhase === 'ACTION_MENU') {
          sendIntentOrLocal({ type: 'END_TURN' });
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (showRulesModal) {
          setShowRulesModal(false);
        }
        if (showTradeModal) {
          setShowTradeModal(false);
        }
        if (isOnlineMode) {
          setViewerSelectedTile(null);
        } else if (state.selectedTileForDetail !== null) {
          dispatchLocal({ type: 'SELECT_TILE_DETAIL', tileId: null });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOnlineMode,
    myOnlinePlayerId,
    state.status,
    state.turnPhase,
    state.activePlayerIndex,
    state.players,
    state.selectedTileForDetail,
    showRulesModal,
    showTradeModal,
  ]);

  // Turn notification: ping the player when it becomes their turn while the tab is hidden
  // (online matches only, so local hot-seat play is not interrupted).
  const prevMyTurnRef = useRef(false);
  useEffect(() => {
    const isMyTurn =
      isOnlineMode &&
      state.status === 'PLAYING' &&
      Boolean(myOnlinePlayerId) &&
      state.players[state.activePlayerIndex]?.id === myOnlinePlayerId;
    if (isMyTurn && !prevMyTurnRef.current && typeof document !== 'undefined' && document.hidden) {
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('CHAOS MONOPOLY', {
            body: locale === 'en' ? 'Your turn!' : 'Tới lượt bạn!',
          });
        }
      } catch {
        /* notifications are best-effort */
      }
      soundEffects.click();
    }
    prevMyTurnRef.current = isMyTurn;
  }, [isOnlineMode, state.status, state.activePlayerIndex, state.players, myOnlinePlayerId, locale]);

  /**
   * Online: the board shows *my* tile selection, ignoring any selection that may sit in the
   * shared state. Local hot-seat keeps using the reducer field.
   */
  const boardState = useMemo(
    () =>
      isOnlineMode
        ? { ...state, selectedTileForDetail: viewerSelectedTile }
        : state,
    [state, isOnlineMode, viewerSelectedTile]
  );

  const handleSelectTile = (tileId: number) => {
    if (isOnlineMode) {
      setViewerSelectedTile(tileId);
      return;
    }
    dispatchLocal({ type: 'SELECT_TILE_DETAIL', tileId });
  };

  const selectedTile =
    boardState.selectedTileForDetail !== null
      ? getTileById(boardState.selectedTileForDetail) || null
      : null;

  // Screen-reader announcement (roadmap 8.3): turn changes and eliminations.
  const announcement = (() => {
    if (state.status !== 'PLAYING') return null;
    const bankruptNames = state.players.filter(p => p.isBankrupt).map(p => p.name);
    const active = state.players[state.activePlayerIndex];
    if (bankruptNames.length > 0) {
      return `${GAME_UI.announceBankrupt[locale]} ${bankruptNames.join(', ')}`;
    }
    if (!active) return null;
    if (isOnlineMode && active.id === myOnlinePlayerId) return GAME_UI.announceYourTurn[locale];
    return `${GAME_UI.announceTurnOf[locale]} ${active.name}`;
  })();

  // Who may act right now: the human whose turn it is (online: only that seat's client; AI turns: nobody).
  const activePlayer = state.players[state.activePlayerIndex];
  const humanActs =
    Boolean(activePlayer) && !activePlayer.isAI && (!isOnlineMode || activePlayer.id === myOnlinePlayerId);

  // Session 02: Fully decoupled Main Menu screen
  if (showMainMenu) {
    return (
      <div
        className="min-h-screen bg-[#faf8f5] text-slate-900 flex flex-col justify-between selection:bg-amber-600 selection:text-white relative"
        data-active-world={activeWorldId}
      >
        <OrientationBanner isGameplay={false} isMainMenu={true} />
        <MainMenu
          selectedWorldId={activeWorldId}
          savedMatch={savedMatch}
          storedOnlineSession={storedOnlineSession}
          isPlayingActive={state.status === 'PLAYING'}
          questsSlot={<DailyQuestsPanel />}
          onBackToGame={() => setShowMainMenu(false)}
          onQuickPlay={() => {
            setShowMainMenu(false);
            handleQuickPlay();
          }}
          onPlayVsAI={() => {
            setSetupInitialTab('LOCAL');
            setShowSetupModal(true);
          }}
          onPlayLocal={() => {
            setSetupInitialTab('LOCAL');
            setShowSetupModal(true);
          }}
          onCreateOnlineRoom={() => {
            setSetupInitialTab('CREATE_ONLINE');
            setShowSetupModal(true);
          }}
          onJoinOnlineRoom={() => {
            setSetupInitialTab('JOIN_ONLINE');
            setShowSetupModal(true);
          }}
          onOpenWorldSelection={() => {
            setSetupInitialTab('LOCAL');
            setShowSetupModal(true);
          }}
          onOpenCollection={() => setShowCollectionModal(true)}
          onOpenShop={() => setShowShopModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onResumeMatch={() => {
            if (savedMatch) {
              dispatchLocal({ type: 'LOAD_SAVED_MATCH', savedState: savedMatch.state });
              setShowMainMenu(false);
            }
          }}
          onReconnectOnline={() => {
            if (storedOnlineSession) {
              const client = getOrCreateMpClient();
              client.sendReconnect(
                storedOnlineSession.roomCode,
                storedOnlineSession.playerId,
                storedOnlineSession.reconnectToken
              );
              setShowMainMenu(false);
            }
          }}
        />

        <ErrorBoundary>
          <React.Suspense fallback={null}>
            {/* Online Lobby Modal (when waiting in online room that hasn't started) */}
            {isOnlineMode &&
              onlineRoom &&
              (onlineRoom.status === 'WAITING' ||
                onlineRoom.status === 'READY' ||
                onlineRoom.status === 'STARTING') && (
                <OnlineLobbyModal
                  room={onlineRoom}
                  myPlayerId={myOnlinePlayerId}
                  connectionStatus={connectionStatus}
                  errorMessage={onlineError}
                  notification={onlineNotification}
                  onSetReady={(isReady) => mpClientRef.current?.setReady(isReady)}
                  onSelectToken={(token, playerName) =>
                    mpClientRef.current?.selectToken(token, playerName)
                  }
                  onConfigureRoom={(params) => mpClientRef.current?.configureRoom(params)}
                  onConfigureSeatAI={(params) => mpClientRef.current?.configureSeatAI(params)}
                  onStartMatch={() => mpClientRef.current?.startMatch()}
                  onLeaveRoom={handleLeaveOnlineRoom}
                />
              )}

            {/* Game Setup Modal */}
            {showSetupModal && (
              <GameSetupModal
                initialTab={setupInitialTab}
                onClose={() => setShowSetupModal(false)}
                savedMatch={savedMatch}
                storedOnlineSession={storedOnlineSession}
                onlineError={onlineError}
                onResumeMatch={(savedState) => {
                  dispatchLocal({ type: 'LOAD_SAVED_MATCH', savedState });
                  setShowSetupModal(false);
                  setShowMainMenu(false);
                }}
                onDiscardSavedMatch={() => {
                  clearMatchFromStorage();
                  setSavedMatch(null);
                }}
                onReconnectOnlineSession={(creds) => {
                  const client = getOrCreateMpClient();
                  client.sendReconnect(creds.roomCode, creds.playerId, creds.reconnectToken);
                  setShowSetupModal(false);
                  setShowMainMenu(false);
                }}
                onDiscardOnlineSession={() => {
                  clearStoredOnlineCredentials();
                  setStoredOnlineSession(null);
                }}
                onCreateOnlineRoom={(params) => {
                  const client = getOrCreateMpClient();
                  client.createRoom(params);
                  setShowSetupModal(false);
                }}
                onJoinOnlineRoom={(params) => {
                  const client = getOrCreateMpClient();
                  client.joinRoom(params);
                  setShowSetupModal(false);
                }}
                onStartGame={(players, config) => {
                  clearMatchFromStorage();
                  setSavedMatch(null);
                  dispatchLocal({
                    type: 'START_GAME',
                    players,
                    config,
                  });
                  setShowSetupModal(false);
                  setShowMainMenu(false);
                }}
              />
            )}

            {/* Secondary Modals accessible from Main Menu */}
            {showCollectionModal && (
              <CollectionModal
                onClose={() => setShowCollectionModal(false)}
                onOpenShop={() => {
                  setShowCollectionModal(false);
                  setShowShopModal(true);
                }}
              />
            )}

            {showShopModal && (
              <ShopModal
                onClose={() => setShowShopModal(false)}
                onOpenCollection={() => {
                  setShowShopModal(false);
                  setShowCollectionModal(true);
                }}
              />
            )}

            {showProfileModal && (
              <ProfileModal
                onClose={() => setShowProfileModal(false)}
                onOpenCollection={() => {
                  setShowProfileModal(false);
                  setShowCollectionModal(true);
                }}
              />
            )}

            {showSettingsModal && (
              <SettingsModal
                onClose={() => setShowSettingsModal(false)}
                is3DView={is3DView}
                onToggle3D={() => setIs3DView((prev) => !prev)}
              />
            )}

            {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] overflow-hidden bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white relative tabletop-bg"
      data-active-world={activeWorldId}
    >
      {/* R3-F02: Auto-reconnect Session Overlay */}
      {isAutoReconnecting && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-slate-900 text-center"
          data-testid="reconnecting-overlay"
        >
          <div className="bg-[#fdfbf7] border border-[#e8e2d5] p-8 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center gap-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center animate-spin">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-wide">
                Đang kết nối lại trận đấu online...
              </h2>
              {storedOnlineSession && (
                <p className="text-sm text-slate-600">
                  Phòng: <span className="font-mono font-bold text-emerald-700">{storedOnlineSession.roomCode}</span> • Người chơi: <span className="font-bold text-slate-900">{storedOnlineSession.playerName || storedOnlineSession.playerId}</span>
                </p>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hệ thống đang phục hồi đồng bộ bàn cờ và lượt chơi của bạn từ máy chủ.
            </p>
            <button
              type="button"
              onClick={handleCancelAutoReconnect}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-slate-900 border border-[#e8e2d5] shadow-sm transition min-h-[44px]"
            >
              Hủy kết nối & Về Menu Chính
            </button>
          </div>
        </div>
      )}

      <OrientationBanner isGameplay={state.status === 'PLAYING'} isMainMenu={false} />

      <LiveAnnouncer message={announcement} />

      {/* Ambient World Environment Layer */}
      <WorldEnvironment config={worldRuntime.config} camera={cameraState} />

      {/* Skippable World Intro Overlay */}
      {showWorldIntro && state.status === 'PLAYING' && (
        <WorldIntroOverlay
          config={worldRuntime.config}
          onDone={() => setShowWorldIntro(false)}
        />
      )}

      {/* Top Header */}
      <HeaderBar
        roundNumber={state.roundNumber}
        maxRounds={state.config.maxRounds}
        onOpenRules={() => setShowRulesModal(true)}
        onRestart={handleRestart}
        onOpenMenu={() => setShowMainMenu(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Online Multiplayer Presence & Connection Status Ribbon */}
      {isOnlineMode && onlineRoom && state.status === 'PLAYING' && (
        <div
          className="w-full bg-white/95 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs z-20 shadow-sm"
          data-testid="online-status-ribbon"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
              PHÒNG: {onlineRoom.roomCode}
            </span>
            <span className="text-slate-600">
              Bạn là:{' '}
              <strong className="text-slate-900">
                {onlineRoom.seats.find(s => s.playerId === myOnlinePlayerId)?.name || myOnlinePlayerId}
              </strong>
            </span>
            <div className="flex items-center gap-1.5">
              {onlineRoom.seats.map(seat => (
                <span
                  key={seat.playerId}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    seat.connected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      seat.connected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{seat.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connectionStatus !== 'CONNECTED' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold flex items-center gap-1 animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Đang tự động kết nối lại...</span>
              </span>
            )}
            {connectionStatus === 'CONNECTED' && (
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" />
                <span>Đồng bộ v{onlineRoom.stateVersion}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleLeaveOnlineRoom}
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold flex items-center gap-1 transition-all"
            >
              <LogOut className="w-3 h-3" />
              <span>Rời phòng</span>
            </button>
          </div>
        </div>
      )}

      {/* Online Error Toast */}
      {isOnlineMode && onlineError && state.status === 'PLAYING' && (
        <div className="max-w-xl mx-auto mt-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center justify-between gap-3 shadow-sm">
          <span>⚠️ {onlineError}</span>
          <button
            type="button"
            onClick={() => setOnlineError(null)}
            className="text-[10px] underline text-red-600 font-bold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* World Asset Fallback Notice */}
      {worldRuntime.fallbackUsed && state.status === 'PLAYING' && (
        <div
          className="max-w-xl mx-auto mt-2 px-4 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 text-center z-20 shadow-sm"
          data-testid="world-fallback-banner"
        >
          ⚠️ {WORLD_UI.fallback[locale]}
        </div>
      )}

      {/* Player Leaderboard Ribbon */}
      {state.status === 'PLAYING' && <PlayerLeaderboard state={state} />}

      {/* Main Play Area */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-3 p-2 sm:p-3 max-w-[1680px] mx-auto w-full relative z-20">
        {/* Board View */}
        <ScreenShakeBox className="flex-1 min-h-0 min-w-0 w-full flex items-stretch justify-center relative">
          {state.status === 'PLAYING' && !showWorldIntro && (
            <TurnTransitionBanner
              state={state}
              controlledPlayerId={isOnlineMode ? myOnlinePlayerId : null}
            />
          )}
          {state.status === 'PLAYING' && !showWorldIntro && <ActionTicker logs={state.logs} />}
          <BoardView
            state={boardState}
            worldConfig={worldRuntime.config}
            is3DView={is3DView}
            diceSkinId={profile.cosmetics.diceSkinId}
            equippedPetId={profile.cosmetics.petId}
            onRollDice={handleRollDice}
            onEndTurn={() => sendIntentOrLocal({ type: 'END_TURN' })}
            onSelectTile={handleSelectTile}
            onCameraChange={setCameraState}
            minimal={false}
            fill
            followPlayerId={
              isOnlineMode ? myOnlinePlayerId : humanActs ? activePlayer?.id ?? null : null
            }
          />
        </ScreenShakeBox>

        {/* Side Event Feed (Desktop side, mobile underneath) */}
        {state.status === 'PLAYING' && (
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 h-36 sm:h-44 lg:h-full min-h-0 flex flex-col">
            <EventFeed logs={state.logs} />
          </aside>
        )}
      </main>

      {/* Bottom Sticky Action Dock */}
      {state.status === 'PLAYING' && (
        <ActionPanel
          state={state}
          controlledPlayerId={isOnlineMode ? myOnlinePlayerId : null}
          turnDeadlineAt={isOnlineMode ? onlineRoom?.turnDeadlineAt ?? null : localTurnDeadline}
          onRollDice={handleRollDice}
          onBuyProperty={(tileId) => sendIntentOrLocal({ type: 'BUY_PROPERTY', tileId })}
          onStartAuction={(tileId) => sendIntentOrLocal({ type: 'START_AUCTION', tileId })}
          onOpenTradeModal={() => setShowTradeModal(true)}
          onUpgradeProperty={(tileId) => sendIntentOrLocal({ type: 'UPGRADE_PROPERTY', tileId })}
          onDowngradeProperty={(tileId) => sendIntentOrLocal({ type: 'DOWNGRADE_PROPERTY', tileId })}
          onSellProperty={(tileId) => sendIntentOrLocal({ type: 'SELL_PROPERTY', tileId })}
          onMortgageProperty={(tileId) => sendIntentOrLocal({ type: 'MORTGAGE_PROPERTY', tileId })}
          onUnmortgageProperty={(tileId) => sendIntentOrLocal({ type: 'UNMORTGAGE_PROPERTY', tileId })}
          onResolveDebt={() => sendIntentOrLocal({ type: 'RESOLVE_DEBT' })}
          onPayBail={() => sendIntentOrLocal({ type: 'PAY_DETENTION_BAIL' })}
          onUseDetentionCard={() => sendIntentOrLocal({ type: 'USE_DETENTION_CARD' })}
          onEndTurn={() => sendIntentOrLocal({ type: 'END_TURN' })}
          onDeclareBankruptcy={() => sendIntentOrLocal({ type: 'DECLARE_BANKRUPTCY' })}
          onOpenTileDetail={handleSelectTile}
          onChooseBranchPath={(targetNodeId) =>
            sendIntentOrLocal({ type: 'CHOOSE_BRANCH_PATH', targetNodeId })
          }
          onPlaceTrap={(nodeId, trapType) =>
            sendIntentOrLocal({ type: 'PLACE_TRAP', nodeId, trapType })
          }
          onSelectBusinessType={(tileId, businessId) =>
            sendIntentOrLocal({ type: 'SELECT_BUSINESS_TYPE', tileId, businessId })
          }
        />
      )}

      {/* Modals & Dialogs (Lazy Loaded with Suspense + Error Boundary) */}
      <ErrorBoundary>
        <React.Suspense fallback={null}>
          {/* Online Lobby Modal (when inside an online room that hasn't started yet) */}
        {isOnlineMode &&
          onlineRoom &&
          (onlineRoom.status === 'WAITING' ||
            onlineRoom.status === 'READY' ||
            onlineRoom.status === 'STARTING') && (
            <OnlineLobbyModal
              room={onlineRoom}
              myPlayerId={myOnlinePlayerId}
              connectionStatus={connectionStatus}
              errorMessage={onlineError}
              notification={onlineNotification}
              onSetReady={(isReady) => mpClientRef.current?.setReady(isReady)}
              onSelectToken={(token, playerName) =>
                mpClientRef.current?.selectToken(token, playerName)
              }
              onConfigureRoom={(params) => mpClientRef.current?.configureRoom(params)}
              onConfigureSeatAI={(params) => mpClientRef.current?.configureSeatAI(params)}
              onStartMatch={() => mpClientRef.current?.startMatch()}
              onLeaveRoom={handleLeaveOnlineRoom}
            />
          )}

        {/* Setup Modal (when triggered from Menu or setup button) */}
        {showSetupModal && (
          <GameSetupModal
            initialTab={setupInitialTab}
            onClose={() => {
              setShowSetupModal(false);
              if (state.status !== 'PLAYING') {
                setShowMainMenu(true);
              }
            }}
            savedMatch={savedMatch}
            storedOnlineSession={storedOnlineSession}
            onlineError={onlineError}
            onResumeMatch={(savedState) => {
              dispatchLocal({ type: 'LOAD_SAVED_MATCH', savedState });
              setShowSetupModal(false);
              setShowMainMenu(false);
            }}
            onDiscardSavedMatch={() => {
              clearMatchFromStorage();
              setSavedMatch(null);
            }}
            onReconnectOnlineSession={(creds) => {
              const client = getOrCreateMpClient();
              client.sendReconnect(creds.roomCode, creds.playerId, creds.reconnectToken);
              setShowSetupModal(false);
              setShowMainMenu(false);
            }}
            onDiscardOnlineSession={() => {
              clearStoredOnlineCredentials();
              setStoredOnlineSession(null);
            }}
            onCreateOnlineRoom={(params) => {
              const client = getOrCreateMpClient();
              client.createRoom(params);
              setShowSetupModal(false);
              setShowMainMenu(false);
            }}
            onJoinOnlineRoom={(params) => {
              const client = getOrCreateMpClient();
              client.joinRoom(params);
              setShowSetupModal(false);
              setShowMainMenu(false);
            }}
            onStartGame={(players, config) => {
              clearMatchFromStorage();
              setSavedMatch(null);
              dispatchLocal({
                type: 'START_GAME',
                players,
                config,
              });
              setShowSetupModal(false);
              setShowMainMenu(false);
            }}
          />
        )}

        {/* Public Property Auction Modal */}
        {state.activeAuction && (
          <AuctionModal
            state={state}
            onPlaceBid={(playerId, bidAmount) => {
              if (isOnlineMode) {
                mpClientRef.current?.submitAction({ type: 'PLACE_AUCTION_BID', bidAmount });
              } else {
                dispatchLocal({ type: 'PLACE_AUCTION_BID', playerId, bidAmount });
              }
            }}
            onPassBid={(playerId) => {
              if (isOnlineMode) {
                mpClientRef.current?.submitAction({ type: 'PASS_AUCTION_BID' });
              } else {
                dispatchLocal({ type: 'PASS_AUCTION_BID', playerId });
              }
            }}
          />
        )}

        {/* Bilateral Trade Modal */}
        {(showTradeModal || state.activeTrade) && (
          <TradeModal
            state={state}
            isOpen={showTradeModal}
            onClose={() => setShowTradeModal(false)}
            onProposeTrade={(proposal) => {
              sendIntentOrLocal({ type: 'PROPOSE_TRADE', proposal });
            }}
            onAcceptTrade={(tradeId) => {
              sendIntentOrLocal({ type: 'ACCEPT_TRADE', tradeId });
              setShowTradeModal(false);
            }}
            onRejectTrade={(tradeId) => {
              sendIntentOrLocal({ type: 'REJECT_TRADE', tradeId });
            }}
            onCounterTrade={(proposal) => {
              sendIntentOrLocal({ type: 'COUNTER_TRADE', proposal });
            }}
            viewerPlayerId={isOnlineMode ? myOnlinePlayerId : null}
            onCancelTrade={(tradeId) => {
              sendIntentOrLocal({ type: 'CANCEL_TRADE', tradeId });
            }}
          />
        )}

        {/* Emergency Debt Liquidation Modal: only the player whose turn it is settles their own debt */}
        {(state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION') &&
          state.pendingDebt &&
          !humanActs && (
            <div
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-lg text-xs font-bold text-slate-700"
              data-testid="debt-waiting-banner"
            >
              Đang chờ {activePlayer?.name} xử lý khoản nợ {formatMoney(state.pendingDebt.amount)}...
            </div>
          )}
        {(state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION') &&
          state.pendingDebt &&
          humanActs && (
            <DebtSettlementModal
              state={state}
              onDowngradeProperty={(tileId) =>
                sendIntentOrLocal({ type: 'DOWNGRADE_PROPERTY', tileId })
              }
              onSellProperty={(tileId) =>
                sendIntentOrLocal({ type: 'SELL_PROPERTY', tileId })
              }
              onMortgageProperty={(tileId) =>
                sendIntentOrLocal({ type: 'MORTGAGE_PROPERTY', tileId })
              }
              onSettleDebt={() => sendIntentOrLocal({ type: 'RESOLVE_DEBT' })}
              onSettlePartialDebt={(amount) =>
                sendIntentOrLocal({ type: 'SETTLE_PARTIAL_DEBT', amount })
              }
              onDeclareBankruptcy={() => sendIntentOrLocal({ type: 'DECLARE_BANKRUPTCY' })}
            />
          )}

        {/* Chaos Event Modal */}
        {state.activeChaosCard && (
          <ChaosModal
            card={state.activeChaosCard}
            onResolve={() => sendIntentOrLocal({ type: 'RESOLVE_CHAOS' })}
            canResolve={humanActs}
            waitingForName={activePlayer?.name}
          />
        )}

        {/* Property Details Modal */}
        {selectedTile && (
          <PropertyDetailModal
            tile={selectedTile}
            state={state}
            onClose={() => {
              if (isOnlineMode) setViewerSelectedTile(null);
              else dispatchLocal({ type: 'SELECT_TILE_DETAIL', tileId: null });
            }}
            onBuy={(tileId) => sendIntentOrLocal({ type: 'BUY_PROPERTY', tileId })}
            onUpgrade={(tileId) => sendIntentOrLocal({ type: 'UPGRADE_PROPERTY', tileId })}
            onDowngrade={(tileId) => sendIntentOrLocal({ type: 'DOWNGRADE_PROPERTY', tileId })}
            onSell={(tileId) => sendIntentOrLocal({ type: 'SELL_PROPERTY', tileId })}
            onMortgage={(tileId) => sendIntentOrLocal({ type: 'MORTGAGE_PROPERTY', tileId })}
            onUnmortgage={(tileId) => sendIntentOrLocal({ type: 'UNMORTGAGE_PROPERTY', tileId })}
          />
        )}

        {/* Rules Modal */}
        {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}

        {/* Floating In-Game Emote Reactions Overlay */}
        <EmoteOverlay emotes={activeEmotes} />

        {/* In-Game Emote Picker (bottom right above dock) */}
        {state.status === 'PLAYING' && (
          <div className="fixed bottom-24 right-4 z-40 flex items-center gap-2">
            <QuickChatBar onSend={handleSendEmote} />
            <EmoteBar onSendEmote={handleSendEmote} />
          </div>
        )}

        {/* Wardrobe & Cosmetic Collection Modal */}
        {showCollectionModal && (
          <CollectionModal
            onClose={() => setShowCollectionModal(false)}
            onOpenShop={() => {
              setShowCollectionModal(false);
              setShowShopModal(true);
            }}
          />
        )}

        {/* Non-Pay-To-Win Cosmetic Shop Modal */}
        {showShopModal && (
          <ShopModal
            onClose={() => setShowShopModal(false)}
            onOpenCollection={() => {
              setShowShopModal(false);
              setShowCollectionModal(true);
            }}
          />
        )}

        {/* Guest Player Profile & Progression Modal */}
        {showProfileModal && (
          <ProfileModal
            onClose={() => setShowProfileModal(false)}
            onOpenCollection={() => {
              setShowProfileModal(false);
              setShowCollectionModal(true);
            }}
          />
        )}

        {/* Audio & Display Settings Modal */}
        {showSettingsModal && (
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            is3DView={is3DView}
            onToggle3D={() => setIs3DView((prev) => !prev)}
            aiSpeed={aiSpeed}
            onChangeAISpeed={isOnlineMode ? undefined : setAiSpeed}
          />
        )}

        {/* Victory Modal */}
        {state.status === 'ENDED' && (
          <VictoryModal
            winner={state.winner}
            players={state.players}
            properties={state.properties}
            roundNumber={state.roundNumber}
            worldState={state}
            onRestart={() => {
              if (isOnlineMode) {
                handleLeaveOnlineRoom();
              } else {
                clearMatchFromStorage();
                setSavedMatch(null);
                dispatchLocal({ type: 'RESTART_GAME' });
              }
              setShowMainMenu(true);
            }}
          />
        )}
      </React.Suspense>
    </ErrorBoundary>
  </div>
);
};
