import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TurnTransitionBanner } from '../TurnTransitionBanner';
import { INITIAL_GAME_STATE } from '../../../game/gameReducer';
import { GameState } from '../../../game/types';

describe('TurnTransitionBanner Component', () => {
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

  it('renders turn fanfare banner when game status is PLAYING', () => {
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      status: 'PLAYING',
      activePlayerIndex: 0,
      players: [
        {
          ...basePlayer,
          id: 'player-1',
          name: 'Kỳ Thủ 1',
          cash: 2000000,
          position: 0,
          token: { id: 'car', name: 'Xe Hơi', symbol: '🏎️', colorHex: '#10b981' },
          isAI: false,
          isBankrupt: false,
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <TurnTransitionBanner state={state} controlledPlayerId="player-1" />
    );

    expect(markup).toContain('data-testid="turn-transition-banner"');
    expect(markup).toContain('Kỳ Thủ 1');
    expect(markup).toContain('🏎️');
    expect(markup).toContain('turnFanfareEntrance');
  });

  it('suppresses rendering when game is not PLAYING', () => {
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      status: 'SETUP',
    };

    const markup = renderToStaticMarkup(
      <TurnTransitionBanner state={state} controlledPlayerId="player-1" />
    );

    expect(markup).toBe('');
  });

  it('renders banner with active player name for AI turns', () => {
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      status: 'PLAYING',
      activePlayerIndex: 0,
      players: [
        {
          ...basePlayer,
          id: 'ai-bot-1',
          name: 'AI Cá Mập',
          cash: 2000000,
          position: 0,
          token: { id: 'robot', name: 'Người Máy', symbol: '🤖', colorHex: '#f59e0b' },
          isAI: true,
          isBankrupt: false,
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <TurnTransitionBanner state={state} controlledPlayerId="human-player" />
    );

    expect(markup).toContain('data-testid="turn-transition-banner"');
    expect(markup).toContain('AI Cá Mập');
    expect(markup).toContain('🤖');
  });
});
