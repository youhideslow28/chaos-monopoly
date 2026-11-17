/**
 * CHAOS MONOPOLY — Action Panel (flat, sequential turn flow)
 * Sequential turn flow:
 * 1. "Lượt của bạn"
 * 2. Primary action: "ĐỔ XÚC XẮC"
 * 3. Landing context (Buy, Auction, Upgrade)
 * 4. "KẾT THÚC LƯỢT"
 * Safe bankruptcy flow with two-step confirmation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameState, TileId, TrapType } from '../../game/types';
import { displayTileName } from '../../worlds/runtime';
import {
  getTileById,
  canBuyProperty,
  canUpgradeProperty,
  canSellProperty,
  getBuyPrice,
  getMortgageValue,
  getUnmortgageCost,
  getUpgradeCost,
} from '../../game/property/propertyEngine';
import { formatMoney } from '../../utils/money';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import {
  Dices,
  ShoppingCart,
  ArrowUpCircle,
  CheckCircle,
  Shield,
  AlertTriangle,
  CreditCard,
  DollarSign,
  Gavel,
  ArrowLeftRight,
  KeyRound,
} from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';
import { particleFX } from '../fx/particleFX';
import { TurnClock } from './TurnClock';
import { roundsToMarket, roundsToSeasonChange } from '../../game/world-rules/worldRules';

interface ActionPanelProps {
  state: GameState;
  controlledPlayerId?: string | null;
  onRollDice: () => void;
  onBuyProperty: (tileId: TileId) => void;
  onStartAuction?: (tileId: TileId) => void;
  onOpenTradeModal?: () => void;
  onUpgradeProperty: (tileId: TileId) => void;
  onDowngradeProperty?: (tileId: TileId) => void;
  onSellProperty?: (tileId: TileId) => void;
  onMortgageProperty?: (tileId: TileId) => void;
  onUnmortgageProperty?: (tileId: TileId) => void;
  onResolveDebt?: () => void;
  onPayBail: () => void;
  onUseDetentionCard?: () => void;
  onEndTurn: () => void;
  onDeclareBankruptcy: () => void;
  onOpenTileDetail?: (tileId: TileId) => void;
  onChooseBranchPath?: (targetNodeId: string) => void;
  onPlaceTrap?: (nodeId: string, trapType: TrapType) => void;
  onSelectBusinessType?: (tileId: TileId, businessId: string) => void;
  turnDeadlineAt?: number | null;
}

const BTN_PRIMARY =
  'h-12 px-6 sm:px-8 rounded-xl font-black text-sm tracking-wide text-white flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-60';
const BTN_SECONDARY =
  'h-11 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors active:scale-[0.98]';

const ActionPanelInner: React.FC<ActionPanelProps> = ({
  state,
  controlledPlayerId,
  onRollDice,
  onBuyProperty,
  onStartAuction,
  onOpenTradeModal,
  onUpgradeProperty,
  onSellProperty,
  onMortgageProperty,
  onUnmortgageProperty,
  onResolveDebt,
  onPayBail,
  onUseDetentionCard,
  onEndTurn,
  onDeclareBankruptcy,
  onOpenTileDetail: _onOpenTileDetail,
  onChooseBranchPath,
  onPlaceTrap,
  onSelectBusinessType,
  turnDeadlineAt,
}) => {
  const [showMortgageDrawer, setShowMortgageDrawer] = useState<boolean>(false);
  const [showBuildDrawer, setShowBuildDrawer] = useState<boolean>(false);
  const [showBankruptcyModal, setShowBankruptcyModal] = useState<boolean>(false);
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.isBankrupt) return null;

  // Rolling doubles -> celebrateDiceDouble()
  const prevDoubleStateRef = useRef<{ isDouble: boolean; turnPhase: string }>({
    isDouble: state.isDouble,
    turnPhase: state.turnPhase,
  });
  useEffect(() => {
    if (
      state.isDouble &&
      (!prevDoubleStateRef.current.isDouble || prevDoubleStateRef.current.turnPhase === 'ROLLING') &&
      state.turnPhase === 'ACTION_MENU'
    ) {
      particleFX.celebrateDiceDouble();
    }
    prevDoubleStateRef.current = {
      isDouble: state.isDouble,
      turnPhase: state.turnPhase,
    };
  }, [state.isDouble, state.turnPhase]);

  // Passing GO / Salary reward -> celebrateSalaryReward()
  const lastLedgerLengthRef = useRef<number>(state.ledger?.length ?? 0);
  useEffect(() => {
    const ledger = state.ledger || [];
    if (ledger.length > lastLedgerLengthRef.current) {
      const newEntries = ledger.slice(lastLedgerLengthRef.current);
      for (const entry of newEntries) {
        if (entry.category === 'SALARY_START' && entry.toPlayerId === activePlayer.id) {
          const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
          particleFX.celebrateSalaryReward(isGoldenHour);
        }
      }
      lastLedgerLengthRef.current = ledger.length;
    }
  }, [state.ledger, activePlayer.id, state.chaosModifiers?.goldenHourTurns]);

  const isOnlineNotMyTurn =
    Boolean(controlledPlayerId) && activePlayer.id !== controlledPlayerId;

  const currentTile = getTileById(activePlayer.position);
  const isRolling = state.turnPhase === 'ROLLING';
  const canRoll = state.turnPhase === 'WAITING_FOR_ROLL';
  const isBranchDecision = state.turnPhase === 'BRANCH_DECISION';
  const isActionMenu = state.turnPhase === 'ACTION_MENU';
  const branchOptions = state.movementState?.availableNextNodes || [];
  const worldStateLabel =
    state.config.worldId === 'quang-tri-highlands' && state.worldState?.seasonPhase
      ? state.worldState.seasonPhase === 'DRY'
        ? `${t('seasonDry')} ${roundsToSeasonChange(state.roundNumber)} ${t('seasonChangeIn')}`
        : `${t('seasonWet')} ${roundsToSeasonChange(state.roundNumber)} ${t('seasonChangeIn')}`
      : state.config.worldId === 'northwest-vietnam'
        ? state.worldState?.marketOpen
          ? t('marketOpenToday')
          : `${t('marketClosed')} ${roundsToMarket(state.roundNumber)} ${t('marketIn')}`
        : null;
  const isDebtPhase =
    state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION';

  // Buy property check for current tile (prices grow per round)
  const buyCheck =
    currentTile?.property && state.properties[currentTile.id]?.ownerId === null
      ? canBuyProperty(currentTile.id, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state)
      : { canBuy: false };

  // Upgrade property check for current tile
  const upgradeCheck =
    currentTile?.property && state.properties[currentTile.id]?.ownerId === activePlayer.id
      ? canUpgradeProperty(currentTile.id, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state)
      : { canUpgrade: false };

  // Owned & mortgageable properties
  const ownedTiles = Object.keys(state.properties)
    .map(Number)
    .filter((tid) => state.properties[tid]?.ownerId === activePlayer.id);

  // Build drawer: every owned property with its upgrade status this round (not only the tile you stand on)
  const buildOptions = ownedTiles
    .map((tid) => ({
      tid,
      check: canUpgradeProperty(tid, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state),
    }))
    .filter(({ tid }) => getTileById(tid)?.property && (state.properties[tid]?.level ?? 0) < (getTileById(tid)?.property?.maxLevel ?? 0));
  const buildableCount = buildOptions.filter(({ check }) => check.canUpgrade).length;

  const canBail = activePlayer.inDetention && activePlayer.cash >= state.config.detentionBailCost;
  const canResolveDebt =
    isDebtPhase && state.pendingDebt && activePlayer.cash >= state.pendingDebt.amount;

  return (
    <div className="w-full shrink-0 bg-white border-t border-slate-200 px-3 sm:px-5 py-2.5 [@media(max-height:480px)]:py-1.5 text-slate-900">
      {/* Build Drawer: upgrade any owned property once per round */}
      {showBuildDrawer && buildOptions.length > 0 && (
        <div className="max-w-5xl mx-auto mb-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpCircle className="w-4 h-4 text-amber-600" />
              {t('buildTitle')}
            </span>
            <button
              onClick={() => setShowBuildDrawer(false)}
              className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 font-bold transition-colors"
            >
              ✕ {t('close')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {buildOptions.map(({ tid, check }) => {
              const tile = getTileById(tid);
              const prop = state.properties[tid];
              if (!tile || !prop) return null;
              const cost = getUpgradeCost(tid, state.roundNumber, state);
              return (
                <div key={tid} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 text-xs">
                  <div className="truncate mr-2">
                    <span className="font-bold text-slate-900 block truncate">#{tid} {displayTileName(tile, 'short')}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {t('level')} {prop.level}/{tile.property?.maxLevel} · {formatMoney(cost)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      soundEffects.upgradeProperty();
                      const nextLevel = (prop.level ?? 0) + 1;
                      particleFX.celebrateBuildingUpgrade(nextLevel);
                      onUpgradeProperty(tid);
                    }}
                    disabled={!check.canUpgrade}
                    title={check.canUpgrade ? undefined : check.reason}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border shrink-0 transition-colors ${
                      check.canUpgrade
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {check.canUpgrade ? t('upgrade') : t('notEligible')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Property Mortgage Management Drawer */}
      {showMortgageDrawer && ownedTiles.length > 0 && (
        <div className="max-w-5xl mx-auto mb-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-slate-500" />
              {t('mortgageTitle')} ({ownedTiles.length} {t('assets')})
            </span>
            <button
              onClick={() => setShowMortgageDrawer(false)}
              className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 font-bold transition-colors"
            >
              ✕ {t('close')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {ownedTiles.map((tid) => {
              const tile = getTileById(tid);
              const prop = state.properties[tid];
              if (!tile || !prop) return null;
              const isMortgaged = prop.isMortgaged;
              const mortgageVal = getMortgageValue(tid, state.chaosModifiers, state, state.roundNumber);
              const unmortgageCost = getUnmortgageCost(tid, state.chaosModifiers, state, state.roundNumber);
              const sellCheck = canSellProperty(
                tid,
                activePlayer.id,
                state.properties,
                state.chaosModifiers,
                state.roundNumber,
                state
              );

              return (
                <div
                  key={tid}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <div className="truncate mr-1">
                    <span className="font-bold text-slate-900 block truncate">
                      #{tid} {displayTileName(tile, 'short')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {isMortgaged ? (
                        <span className="text-red-600 font-bold">{t('mortgaged')}</span>
                      ) : (
                        `${t('mortgageValue')}: +${formatMoney(mortgageVal)}`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isMortgaged ? (
                      <button
                        onClick={() => {
                          soundEffects.click();
                          onMortgageProperty?.(tid);
                        }}
                        className="px-2 py-1 rounded-lg font-bold text-[10px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors"
                      >
                        {t('mortgage')} (+{formatMoney(mortgageVal)})
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          soundEffects.click();
                          onUnmortgageProperty?.(tid);
                        }}
                        disabled={activePlayer.cash < unmortgageCost}
                        className={`px-2 py-1 rounded-lg font-bold text-[10px] border transition-colors ${
                          activePlayer.cash >= unmortgageCost
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        {t('redeem')} (-{formatMoney(unmortgageCost)})
                      </button>
                    )}

                    {onSellProperty && sellCheck.canSell && sellCheck.sellValue > 0 && (
                      <button
                        onClick={() => {
                          soundEffects.click();
                          onSellProperty(tid);
                        }}
                        title={`${t('sellLandThisTile')} (+${formatMoney(sellCheck.sellValue)})`}
                        className="px-2 py-1 rounded-lg font-bold text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                      >
                        {t('sellLandBtn')} (+{formatMoney(sellCheck.sellValue)})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-2.5 [@media(max-height:480px)]:flex-row [@media(max-height:480px)]:items-center [@media(max-height:480px)]:justify-between [@media(max-height:480px)]:gap-2">
        {/* Turn Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-black/10"
              style={{ backgroundColor: activePlayer.token.colorHex }}
            />
            <span className="t-title text-xs sm:text-sm text-slate-900 truncate">
              {activePlayer.isAI
                ? `${t('machine')} [${activePlayer.name}]`
                : `${t('yourTurn')} (${activePlayer.name})`}
            </span>
            {!activePlayer.isAI && <TurnClock deadlineAt={turnDeadlineAt} />}
            {worldStateLabel && (
              <span
                data-testid="world-state-hud"
                className="t-label px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
              >
                {worldStateLabel}
              </span>
            )}
            {state.chaosMeter && (
              <span
                data-testid="chaos-meter-hud"
                className={`t-label px-2 py-0.5 rounded-md border shrink-0 font-bold ${
                  state.chaosMeter.phase === 'CHAOS'
                    ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    : state.chaosMeter.phase === 'INSTABILITY'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                ⚡ {t('chaosMeterHudLabel')}: {state.chaosMeter.value}% ({state.chaosMeter.phase})
              </span>
            )}
            <span className="text-xs text-slate-500 truncate hidden sm:inline">
              · {t('tileWord')} <strong className="text-slate-800 font-bold">{currentTile ? displayTileName(currentTile, 'full') : activePlayer.position}</strong>
            </span>
          </div>

          {/* AI Thinking Indicator */}
          {activePlayer.isAI && (
            <div
              data-testid="ai-decision-banner"
              className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
              <span>{t('aiThinking')}</span>
            </div>
          )}
        </div>

        {/* Sequential Action Controls */}
        {/* Permissions: only the human who owns the turn sees action buttons. AI turns and other players' turns show status only. */}
        {activePlayer.isAI ? (
          <div className="h-12 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
            {t('aiActing')}
          </div>
        ) : isOnlineNotMyTurn ? (
          <div className="h-12 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
            ⏳ {t('waitingForTurn')} <span className="text-slate-900 font-black ml-1">{activePlayer.name}</span>...
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            {/* STEP 1: ROLL DICE */}
            {canRoll && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.click();
                  onRollDice();
                }}
                disabled={isRolling}
                className={`${BTN_PRIMARY} flex-1 sm:flex-none sm:min-w-[220px] bg-emerald-600 hover:bg-emerald-700 animate-pulse-subtle shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400/40 hover:scale-[1.02] transform-gpu`}
              >
                <Dices className="w-5 h-5" />
                <span>{t('rollDice')}</span>
              </button>
            )}

            {/* ROLLING STATE */}
            {isRolling && (
              <div className="h-12 px-6 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2">
                <Dices className="w-4 h-4 animate-spin" />
                <span>{t('rolling')}</span>
              </div>
            )}

            {/* STEP 1.5: 3D SPATIAL GRAPH BRANCH DECISION */}
            {isBranchDecision && branchOptions.length > 0 && (
              <div
                data-testid="branch-decision-controls"
                className="flex items-center gap-2 flex-wrap"
              >
                <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                  🔀 {t('chooseBranchLabel')} ({state.movementState?.remainingSteps ?? 0} {t('stepsRemainingLabel')}):
                </span>
                {branchOptions.map((targetNodeId) => {
                  const targetNode = state.spatialGraph?.nodes[targetNodeId];
                  const edge = Object.values(state.spatialGraph?.edges || {}).find(
                    (e) =>
                      e.fromNodeId === state.movementState?.currentNodeId &&
                      e.toNodeId === targetNodeId
                  );
                  const tollCost = edge?.toll?.amount || 0;
                  const label = targetNode
                    ? `${targetNode.shortName || targetNode.name} (${t('floorWord')} ${(targetNode.floor ?? 0) + 1}${tollCost > 0 ? ` · -$${tollCost}` : ''})`
                    : targetNodeId;
                  return (
                    <button
                      key={targetNodeId}
                      type="button"
                      data-testid={`choose-branch-${targetNodeId}`}
                      onClick={() => {
                        soundEffects.click();
                        onChooseBranchPath?.(targetNodeId);
                      }}
                      className={`${BTN_SECONDARY} border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950`}
                    >
                      <span>➡️ {label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* DETENTION BAIL / FREE CARD */}
            {activePlayer.inDetention && canRoll && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    onPayBail();
                  }}
                  disabled={!canBail}
                  className={`${BTN_SECONDARY} ${canBail ? '' : 'text-slate-400 cursor-not-allowed hover:bg-white'}`}
                >
                  <Shield className="w-4 h-4" />
                  <span>
                    {t('bail')} ({formatMoney(state.config.detentionBailCost)})
                  </span>
                </button>
                {(activePlayer.jailFreeCards || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      onUseDetentionCard?.();
                    }}
                    className={BTN_SECONDARY}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {t('jailCard')} ({activePlayer.jailFreeCards})
                    </span>
                  </button>
                )}
              </>
            )}

            {/* STEP 2: CONTEXTUAL LANDING ACTIONS */}
            {buyCheck.canBuy && currentTile && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.buyProperty();
                    particleFX.celebratePropertyPurchase(activePlayer.token.colorHex || '#10b981');
                    onBuyProperty(currentTile.id);
                  }}
                  className={`${BTN_PRIMARY} bg-emerald-600 hover:bg-emerald-700 animate-pulse-subtle shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400/40 hover:scale-[1.02] transform-gpu`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>
                    {t('buyLand')} ({formatMoney(getBuyPrice(currentTile.id, state.roundNumber, state))})
                  </span>
                </button>

                {onStartAuction && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      onStartAuction(currentTile.id);
                    }}
                    className={BTN_SECONDARY}
                  >
                    <Gavel className="w-4 h-4" />
                    <span>{t('auction')}</span>
                  </button>
                )}
              </>
            )}

            {/* UPGRADE PROPERTY ON CURRENT TILE */}
            {upgradeCheck.canUpgrade && currentTile && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.upgradeProperty();
                  const nextLevel = (state.properties[currentTile.id]?.level ?? 0) + 1;
                  particleFX.celebrateBuildingUpgrade(nextLevel);
                  onUpgradeProperty(currentTile.id);
                }}
                className={`${BTN_PRIMARY} bg-amber-600 hover:bg-amber-700 animate-pulse-subtle shadow-lg shadow-amber-600/25 ring-2 ring-amber-400/40 hover:scale-[1.02] transform-gpu`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>
                  {t('upgrade')} ({formatMoney(getUpgradeCost(currentTile.id, state.roundNumber, state))})
                </span>
              </button>
            )}

            {/* BUILD: upgrade owned properties from anywhere on the board */}
            {(canRoll || isActionMenu) && buildOptions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBuildDrawer(!showBuildDrawer)}
                className={BTN_SECONDARY}
                title={t('buildTitle')}
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {t('build')}
                  {buildableCount > 0 ? ` (${buildableCount})` : ''}
                </span>
              </button>
            )}

            {/* STEP 3: ACTION_MENU (END TURN & UTILITIES) */}
            {isActionMenu && (
              <>
                {/* Secondary: Mortgage Management */}
                {ownedTiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMortgageDrawer(!showMortgageDrawer)}
                    className={BTN_SECONDARY}
                    title={t('mortgageTitle')}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('mortgage')}</span>
                  </button>
                )}

                {/* Secondary: Trade Negotiation */}
                {onOpenTradeModal && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      onOpenTradeModal();
                    }}
                    data-testid="open-trade-btn"
                    className={BTN_SECONDARY}
                    title={t('tradeTitle')}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('trade')}</span>
                  </button>
                )}

                {/* Secondary: Select Business Type on current owned property */}
                {onSelectBusinessType &&
                  currentTile &&
                  state.properties[currentTile.id]?.ownerId === activePlayer.id &&
                  !state.properties[currentTile.id]?.businessTypeId && (
                    <button
                      type="button"
                      data-testid="select-business-btn"
                      onClick={() => {
                        soundEffects.click();
                        const biz =
                          state.chaosMeter?.phase === 'CHAOS'
                            ? 'pawn_shop'
                            : 'night_bar';
                        onSelectBusinessType(currentTile.id, biz);
                      }}
                      className={BTN_SECONDARY}
                      title={t('openBusinessTitle')}
                    >
                      <span>🏪 {t('openBusinessBtn')}</span>
                    </button>
                  )}

                {/* Secondary: Place Sabotage Trap */}
                {onPlaceTrap && activePlayer.cash >= 100 && (
                  <button
                    type="button"
                    data-testid="place-trap-btn"
                    onClick={() => {
                      soundEffects.click();
                      const nodeId =
                        activePlayer.positionNodeId || `node_${activePlayer.position}`;
                      onPlaceTrap(nodeId, 'ROBBERY');
                    }}
                    className={BTN_SECONDARY}
                    title={t('placeTrapTitle')}
                  >
                    <span>🪤 {t('placeTrapBtn')} ($100)</span>
                  </button>
                )}

                {/* Primary: End Turn */}
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    onEndTurn();
                  }}
                  className={`${BTN_PRIMARY} flex-1 sm:flex-none sm:min-w-[220px] bg-slate-900 hover:bg-slate-800 shadow-md hover:shadow-lg hover:scale-[1.01] transform-gpu ${
                    state.isDouble ? 'animate-pulse-subtle ring-2 ring-amber-400/50 shadow-amber-500/20' : ''
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{state.isDouble ? t('rollAgain') : t('endTurn')}</span>
                </button>

                {/* Surrender / Bankruptcy explicit safety trigger */}
                <button
                  type="button"
                  onClick={() => setShowBankruptcyModal(true)}
                  className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                  title={t('surrender')}
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </>
            )}

            {/* DEBT SETTLEMENT PHASE */}
            {isDebtPhase && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.click();
                  onResolveDebt?.();
                }}
                disabled={!canResolveDebt}
                className={`${BTN_PRIMARY} uppercase ${
                  canResolveDebt
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>
                  {canResolveDebt
                    ? `${t('payDebt')} (${formatMoney(state.pendingDebt?.amount ?? 0)})`
                    : t('raiseCash')}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Explicit Bankruptcy Safety Confirmation Modal */}
      {showBankruptcyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 animate-fadeIn"
          onClick={() => setShowBankruptcyModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="t-title text-base text-slate-900">{t('confirmBankruptcy')}</h3>
              <p className="t-body text-xs text-slate-500 mt-1">{t('confirmBankruptcyHint')}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBankruptcyModal(false)}
                className="flex-1 h-11 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors"
              >
                {t('back')}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.payRent();
                  setShowBankruptcyModal(false);
                  onDeclareBankruptcy();
                }}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase transition-colors"
              >
                {t('confirmBankrupt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ActionPanel = React.memo(ActionPanelInner);
