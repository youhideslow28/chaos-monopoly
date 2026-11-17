import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';
import { QUICK_CHAT } from '../../game/social/quickChat';
import { useLocale } from '../../worlds/i18n';

interface QuickChatBarProps {
  /** Sends one preset phrase by id (same channel as emotes). */
  onSend: (id: string) => void;
}

export const QuickChatBar: React.FC<QuickChatBarProps> = ({ onSend }) => {
  const [open, setOpen] = useState(false);
  const [locale] = useLocale();

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        data-testid="quick-chat-toggle"
        aria-expanded={open}
        aria-label={locale === 'en' ? 'Quick chat' : 'Chat nhanh'}
        title={locale === 'en' ? 'Quick chat' : 'Chat nhanh'}
        onClick={() => {
          soundEffects.click();
          setOpen((v) => !v);
        }}
        className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white border border-[#e5e0d3] shadow-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-95 transition"
      >
        {open ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
      </button>

      {open && (
        <div
          data-testid="quick-chat-panel"
          className="absolute bottom-14 right-0 w-64 p-2 rounded-2xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-xl grid grid-cols-1 gap-1"
        >
          {QUICK_CHAT.map((phrase) => (
            <button
              key={phrase.id}
              type="button"
              onClick={() => {
                soundEffects.click();
                onSend(phrase.id);
                setOpen(false);
              }}
              className="t-body text-left text-xs px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition"
            >
              {phrase.text[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
