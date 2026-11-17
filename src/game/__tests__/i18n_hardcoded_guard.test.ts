import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Roadmap D: guard converted components against reintroducing hardcoded Vietnamese copy.
 * Every user-visible string in these files must come from GAME_UI / WORLD_UI / COSMETIC_UI.
 * Comments are ignored; a Vietnamese letter anywhere else fails the check.
 */
const CONVERTED_COMPONENTS = [
  'src/components/menu/MainMenu.tsx',
  'src/components/setup/GameSetupModal.tsx',
  'src/components/multiplayer/OnlineLobbyModal.tsx',
  'src/components/action-panel/ActionPanel.tsx',
  'src/components/action-panel/TurnClock.tsx',
  'src/components/chaos/ChaosModal.tsx',
  'src/components/modals/AuctionModal.tsx',
  'src/components/modals/DebtSettlementModal.tsx',
  'src/components/modals/VictoryModal.tsx',
  'src/components/modals/RulesModal.tsx',
  'src/components/modals/PropertyDetailModal.tsx',
  'src/components/modals/TradeModal.tsx',
  'src/components/profile/ProfileModal.tsx',
  'src/components/cosmetics/ShopModal.tsx',
  'src/components/cosmetics/CollectionModal.tsx',
  'src/components/player-panel/PlayerLeaderboard.tsx',
  'src/components/settings/SettingsModal.tsx',
  'src/components/common/ErrorBoundary.tsx',
  'src/components/common/OrientationBanner.tsx',
  'src/components/quests/DailyQuestsPanel.tsx',
  'src/components/camera/CameraControls.tsx',
];

const VIETNAMESE_LETTER = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/;

function offendingLines(relativePath: string): string[] {
  const absolute = path.resolve(process.cwd(), relativePath);
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  const offenders: string[] = [];
  lines.forEach((line, idx) => {
    if (!VIETNAMESE_LETTER.test(line)) return;
    const trimmed = line.trim();
    // Skip comments: line (`//`), block (`*`, `/*`) and JSX (`{/* ... */}`).
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('{/*')) {
      return;
    }
    offenders.push(`${relativePath}:${idx + 1}: ${trimmed}`);
  });
  return offenders;
}

describe('i18n guard (roadmap D5) — converted components carry no hardcoded Vietnamese', () => {
  it('finds no Vietnamese copy outside comments in converted components', () => {
    const offenders = CONVERTED_COMPONENTS.flatMap(offendingLines);
    expect(offenders).toEqual([]);
  });
});
