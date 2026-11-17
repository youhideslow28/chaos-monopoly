import React, { useState } from 'react';
import { COSMETICS_CATALOG } from '../../cosmetics/catalog';
import { soundEffects } from '../../game/sound/soundEngine';
import { Smile, X } from 'lucide-react';

interface EmoteBarProps {
  onSendEmote: (emoteId: string) => void;
  disabled?: boolean;
}

export const EmoteBar: React.FC<EmoteBarProps> = ({ onSendEmote, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  const emotes = COSMETICS_CATALOG.filter(c => c.category === 'EMOTE');

  const handleSelectEmote = (emoteId: string) => {
    soundEffects.click();
    onSendEmote(emoteId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" data-testid="emote-bar">
      {/* Floating Popover Picker */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 p-2 rounded-2xl bg-[#fdfbf7]/95 border border-[#e8e2d5] shadow-xl backdrop-blur-md z-50 flex items-center gap-1.5 animate-fadeIn">
          {emotes.map(em => (
            <button
              key={em.id}
              type="button"
              onClick={() => handleSelectEmote(em.id)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-white hover:bg-amber-50 border border-[#e8e2d5] hover:border-amber-400 text-lg flex items-center justify-center transition-all active:scale-90 shadow-sm"
              title={em.name.vi}
              data-testid={`emote-btn-${em.id}`}
            >
              <span>{em.name.vi.split(' ').pop()}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center ml-0.5 transition-colors"
            aria-label="Close emotes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          soundEffects.click();
          setIsOpen(prev => !prev);
        }}
        data-testid="emote-trigger-btn"
        className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white hover:bg-amber-50 text-amber-600 border border-[#e5e0d3] hover:border-amber-400 shadow-md flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
        title="Gửi biểu cảm nhanh (Quick Emote Reaction)"
      >
        <Smile className="w-5 h-5" />
      </button>
    </div>
  );
};

export interface FloatingEmote {
  id: string;
  senderName: string;
  emoteSymbol: string;
  timestamp: number;
}

export type EmoteBubble = FloatingEmote;

export const EmoteOverlay: React.FC<{ emotes: FloatingEmote[] }> = ({ emotes }) => {
  if (emotes.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 pointer-events-none z-40 flex flex-col items-center gap-2">
      {emotes.map(em => (
        <div
          key={em.id}
          className="px-4 py-1.5 rounded-full bg-[#fdfbf7]/95 border-2 border-amber-300 text-slate-900 text-xs font-black shadow-lg animate-bounce flex items-center gap-2"
        >
          <span className="text-xl">{em.emoteSymbol}</span>
          <span>{em.senderName}</span>
        </div>
      ))}
    </div>
  );
};
