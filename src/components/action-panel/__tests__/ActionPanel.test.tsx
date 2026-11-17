import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionPanel } from '../ActionPanel';
import { INITIAL_GAME_STATE } from '../../../game/gameReducer';
import { GameState } from '../../../game/types';

vi.mock('../../fx/particleFX', () => ({
  particleFX: {
    celebrateDiceDouble: vi.fn(),
    celebratePropertyPurchase: vi.fn(),
    celebrateBuildingUpgrade: vi.fn(),
    celebrateSalaryReward: vi.fn(),
  },
}));

describe('ActionPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders roll dice CTA button with animate-pulse-subtle micro-animation', () => {
    const basePlayer = INITIAL_GAME_STATE.players[0] || {
      id: 'player-1',
      name: 'Kỳ Thủ 1',
      cash: 2000000,
      position: 0,
      token: { id: 'car', name: 'Xe Hơi', symbol: '🏎️', colorHex: '#10b981' },
      isAI: false,
      isBankrupt: false,
      inDetention: false,
      detentionTurns: 0,
      consecutiveDoubles: 0,
      stats: {
        rentPaid: 0,
        rentReceived: 0,
        propertiesBought: 0,
        upgradesCount: 0,
        doublesRolled: 0,
        timesInDetention: 0,
      },
    };

    const state: GameState = {
      ...INITIAL_GAME_STATE,
      status: 'PLAYING',
      turnPhase: 'WAITING_FOR_ROLL',
      activePlayerIndex: 0,
      players: [
        {
          ...basePlayer,
          id: 'player-1',
          name: 'Kỳ Thủ 1',
          cash: 2000000,
          position: 0,
          isAI: false,
          isBankrupt: false,
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <ActionPanel
        state={state}
        onRollDice={vi.fn()}
        onBuyProperty={vi.fn()}
        onUpgradeProperty={vi.fn()}
        onPayBail={vi.fn()}
        onEndTurn={vi.fn()}
        onDeclareBankruptcy={vi.fn()}
      />
    );

    // Roll dice CTA button includes animate-pulse-subtle micro-animation
    expect(markup).toContain('animate-pulse-subtle');
    expect(markup).toContain('bg-emerald-600');
  });

  it('renders end turn button with rollAgain highlight on doubles', () => {
    const basePlayer = INITIAL_GAME_STATE.players[0] || {
      id: 'player-1',
      name: 'Kỳ Thủ 1',
      cash: 2000000,
      position: 0,
      token: { id: 'car', name: 'Xe Hơi', symbol: '🏎️', colorHex: '#10b981' },
      isAI: false,
      isBankrupt: false,
      inDetention: false,
      detentionTurns: 0,
      consecutiveDoubles: 0,
      stats: {
        rentPaid: 0,
        rentReceived: 0,
        propertiesBought: 0,
        upgradesCount: 0,
        doublesRolled: 0,
        timesInDetention: 0,
      },
    };

    const state: GameState = {
      ...INITIAL_GAME_STATE,
      status: 'PLAYING',
      turnPhase: 'ACTION_MENU',
      isDouble: true,
      activePlayerIndex: 0,
      players: [
        {
          ...basePlayer,
          id: 'player-1',
          name: 'Kỳ Thủ 1',
          cash: 2000000,
          position: 1,
          isAI: false,
          isBankrupt: false,
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <ActionPanel
        state={state}
        onRollDice={vi.fn()}
        onBuyProperty={vi.fn()}
        onUpgradeProperty={vi.fn()}
        onPayBail={vi.fn()}
        onEndTurn={vi.fn()}
        onDeclareBankruptcy={vi.fn()}
      />
    );

    // Should indicate double roll again
    expect(markup).toContain('ring-amber-400');
  });
});
