/**
 * Display helpers for in-game money.
 *
 * The engine stores plain integers (1500 = $1,500). Older UI and engine log strings
 * rendered them as "$1500M"; the classic board-game look is "$1,500".
 */

/** Formats an integer amount as "$1,500" (negative: "-$200"). */
export function formatMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const body = Math.abs(safe).toLocaleString('en-US');
  return safe < 0 ? `-$${body}` : `$${body}`;
}

/**
 * Rewrites legacy "$1500M" amounts inside engine-generated text (logs, AI reasons, card text)
 * to the classic "$1,500" format. Text without such amounts is returned unchanged.
 */
export function localizeMoneyText(text: string): string {
  return text.replace(/(-?)\$(-?)(\d+)M\b/g, (_m, pre: string, neg: string, digits: string) =>
    `${pre || neg}${formatMoney(Number(digits))}`
  );
}
