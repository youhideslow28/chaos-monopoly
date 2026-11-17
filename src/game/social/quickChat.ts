/**
 * Quick chat: twelve preset phrases that travel over the existing emote channel, so online
 * play needs no protocol change. Both clients share this table and render the text locally
 * in their own language.
 */

export interface QuickChatPhrase {
  id: string;
  text: { vi: string; en: string };
}

export const QUICK_CHAT: QuickChatPhrase[] = [
  { id: 'qc-1', text: { vi: 'Chúc may mắn!', en: 'Good luck!' } },
  { id: 'qc-2', text: { vi: 'Hay lắm!', en: 'Nice one!' } },
  { id: 'qc-3', text: { vi: 'Ôi không!', en: 'Oh no!' } },
  { id: 'qc-4', text: { vi: 'Chờ chút nhé', en: 'One moment' } },
  { id: 'qc-5', text: { vi: 'Đổi không?', en: 'Trade?' } },
  { id: 'qc-6', text: { vi: 'Tôi muốn ô đó', en: 'I want that tile' } },
  { id: 'qc-7', text: { vi: 'Đừng xây nhà nhé', en: 'No houses, deal?' } },
  { id: 'qc-8', text: { vi: 'Nhanh lên nào', en: 'Hurry up' } },
  { id: 'qc-9', text: { vi: 'Tôi sắp phá sản', en: "I'm nearly broke" } },
  { id: 'qc-10', text: { vi: 'Căng quá!', en: 'So tense!' } },
  { id: 'qc-11', text: { vi: 'Cảm ơn nhé', en: 'Thanks!' } },
  { id: 'qc-12', text: { vi: 'Ván hay đấy', en: 'Great game' } },
];

const QUICK_CHAT_IDS = new Set(QUICK_CHAT.map((p) => p.id));

export function isQuickChatId(id: unknown): boolean {
  return typeof id === 'string' && QUICK_CHAT_IDS.has(id);
}

export function getQuickChatText(id: string, locale: 'vi' | 'en'): string | null {
  const phrase = QUICK_CHAT.find((p) => p.id === id);
  return phrase ? phrase.text[locale] : null;
}
