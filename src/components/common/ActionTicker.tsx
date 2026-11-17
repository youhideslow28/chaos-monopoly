import React, { useEffect, useState } from 'react';
import { GameLogEntry } from '../../game/types';
import { localizeMoneyText } from '../../utils/money';

interface ActionTickerProps {
  logs: GameLogEntry[];
}

/** Strips the engine's "[TAG]" prefixes so the ticker reads as a plain sentence. */
function cleanMessage(message: string): string {
  return localizeMoneyText(message.replace(/^(\s*[^\w\s\[]{0,3}\s*)?\[[^\]]{1,40}\]\s*/u, '$1'));
}

/**
 * One-line banner that pops the newest event above the board and fades after a few seconds,
 * so a player never misses what an opponent just did.
 */
export const ActionTicker: React.FC<ActionTickerProps> = ({ logs }) => {
  const newest = logs[0] ?? null;
  const [visibleId, setVisibleId] = useState<string | null>(null);

  useEffect(() => {
    if (!newest) return;
    setVisibleId(newest.id);
    const timer = setTimeout(() => setVisibleId((current) => (current === newest.id ? null : current)), 4500);
    return () => clearTimeout(timer);
  }, [newest?.id]);

  if (!newest || visibleId !== newest.id) return null;

  return (
    <div
      data-testid="action-ticker"
      aria-live="polite"
      className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-[92%] px-3.5 py-1.5 rounded-full bg-[#fdfbf7]/95 text-slate-900 border border-[#e8e2d5] shadow-md backdrop-blur-sm animate-fadeIn"
    >
      <p className="t-body text-xs font-semibold leading-snug truncate">{cleanMessage(newest.message)}</p>
    </div>
  );
};
