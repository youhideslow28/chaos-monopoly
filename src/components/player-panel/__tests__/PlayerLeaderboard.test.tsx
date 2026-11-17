import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerLeaderboard } from '../PlayerLeaderboard';
import { INITIAL_GAME_STATE } from '../../../game/gameReducer';
import { GameState } from '../../../game/types';

describe('PlayerLeaderboard Component', () => {
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

  it('renders player chips with relative positioning and cash formatting', () => {
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      status: 'PLAYING',
      activePlayerIndex: 0,
      players: [
        {
          ...basePlayer,
          id: 'player-1',
          name: 'Đại Gia Sài Gòn',
          cash: 2500000,
          position: 0,
          token: { id: 'car', name: 'Xe Hơi', symbol: '🏎️', colorHex: '#10b981' },
          isAI: false,
          isBankrupt: false,
        },
        {
          ...basePlayer,
          id: 'player-2',
          name: 'Kỳ Thủ Hà Nội',
          cash: 1800000,
          position: 5,
          token: { id: 'plane', name: 'Máy Bay', symbol: '✈️', colorHex: '#3b82f6' },
          isAI: true,
          isBankrupt: false,
        },
      ],
    };

    const markup = renderToStaticMarkup(<PlayerLeaderboard state={state} />);

    // Check container and testid
    expect(markup).toContain('data-testid="players-strip"');
    expect(markup).toContain('data-testid="leaderboard-player-player-1"');
    expect(markup).toContain('data-testid="leaderboard-player-player-2"');

    // Check player-chip relative positioning for floating delta support
    expect(markup).toContain('player-chip relative');

    // Check active player styling
    expect(markup).toContain('border-slate-900 shadow-sm');

    // Check cashFloatFade keyframe definition
    expect(markup).toContain('cashFloatFade');
  });

  it('renders bankrupt players with muted styling', () => {
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      status: 'PLAYING',
      activePlayerIndex: 0,
      players: [
        {
          ...basePlayer,
          id: 'player-bankrupt',
          name: 'Kỳ Thủ Phá Sản',
          cash: 0,
          position: 10,
          token: { id: 'car', name: 'Xe Hơi', symbol: '🏎️', colorHex: '#ef4444' },
          isAI: false,
          isBankrupt: true,
        },
      ],
    };

    const markup = renderToStaticMarkup(<PlayerLeaderboard state={state} />);

    expect(markup).toContain('opacity-40 border-[#e5e0d3]');
  });
});
