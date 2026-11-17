import React, { useEffect, useState } from 'react';
import { GAME_UI, useLocale } from '../../worlds/i18n';

interface TurnClockProps {
  /** Server clock deadline (ms). Null hides the clock. */
  deadlineAt: number | null | undefined;
}

const WARNING_THRESHOLD_SECONDS = 10;

export const TurnClock: React.FC<TurnClockProps> = ({ deadlineAt }) => {
  const [locale] = useLocale();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (deadlineAt === null || deadlineAt === undefined) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  if (deadlineAt === null || deadlineAt === undefined) return null;

  const secondsLeft = Math.max(0, Math.ceil((deadlineAt - now) / 1000));
  const warning = secondsLeft <= WARNING_THRESHOLD_SECONDS;

  return (
    <span
      role="timer"
      aria-label={`${GAME_UI.turnClockLabel[locale]}: ${secondsLeft}s`}
      data-testid="turn-clock"
      className={`t-label px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
        warning ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
      }`}
    >
      {secondsLeft}s
    </span>
  );
};
