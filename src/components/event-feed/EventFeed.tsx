import React from 'react';
import { GameLogEntry } from '../../game/types';
import { localizeMoneyText } from '../../utils/money';
import { GAME_UI, useLocale } from '../../worlds/i18n';

interface EventFeedProps {
  logs: GameLogEntry[];
}

const DOT_COLOR: Record<GameLogEntry['type'], string> = {
  INFO: 'bg-slate-300',
  DICE: 'bg-slate-900',
  PURCHASE: 'bg-emerald-500',
  RENT: 'bg-amber-500',
  CHAOS: 'bg-purple-500',
  BANKRUPT: 'bg-red-500',
  WARNING: 'bg-orange-500',
  VICTORY: 'bg-yellow-500',
};

/** Strips the engine's "[TAG]" prefixes so the log reads like plain sentences. */
function cleanMessage(message: string): string {
  return localizeMoneyText(message.replace(/^(\s*[^\w\s\[]{0,3}\s*)?\[[^\]]{1,40}\]\s*/u, '$1'));
}

const EventFeedInner: React.FC<EventFeedProps> = ({ logs }) => {
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];
  return (
    <section
      aria-label={t('feedTitle')}
      className="w-full h-full flex flex-col rounded-2xl bg-white border border-[#e5e0d3] overflow-hidden"
    >
      <h2 className="t-label px-4 py-3 text-xs text-slate-500 border-b border-[#eee9dc]">
        {t('feedTitle')}
      </h2>
      <ol className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5" aria-live="polite">
        {logs.length === 0 && <li className="t-body text-sm text-slate-400">{t('feedEmpty')}</li>}
        {logs.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[entry.type] || DOT_COLOR.INFO}`}
              aria-hidden="true"
            />
            <p className="t-body text-[13px] text-slate-700 break-words">{cleanMessage(entry.message)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

export const EventFeed = React.memo(EventFeedInner);
