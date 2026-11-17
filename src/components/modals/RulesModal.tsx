import React from 'react';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import { useModalDismiss } from '../common/useModalDismiss';
import {
  X,
  BookOpen,
  Sparkles,
  Building,
  ShieldAlert,
  Award,
  CreditCard,
  Keyboard,
  Compass,
} from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  const { backdropProps } = useModalDismiss({
    isOpen: true,
    onClose,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      {...backdropProps}
      data-testid="rules-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden my-auto text-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 font-black shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold mb-0.5">
                <BookOpen className="w-3 h-3 text-amber-700" />
                <span>{locale === 'vi' ? 'CẨM NANG LUẬT' : 'RULEBOOK'}</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-wide font-serif">
                {t('rulesTitle')}
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundEffects.click();
              onClose();
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-[#e8e2d5] transition-all shadow-sm flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Section 1: Overview & Victory */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 font-bold mb-1.5">
              <Award className="w-4 h-4" />
              <span>{t('rulesSec1Title')}</span>
            </div>
            <p>{t('rulesSec1Body')}</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mt-1">
              <li>{t('rulesSec1Li1')}</li>
              <li>{t('rulesSec1Li2')}</li>
            </ul>
          </div>

          {/* Section 2: Board & Districts */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 font-bold mb-1.5">
              <Compass className="w-4 h-4" />
              <span>{t('rulesSec2Title')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>{t('rulesSec2Li1')}</li>
              <li>{t('rulesSec2Li2')}</li>
              <li>{t('rulesSec2Li3')}</li>
              <li>{t('rulesSec2Li4')}</li>
            </ul>
          </div>

          {/* Section 3: Properties & Upgrades */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-1.5">
              <Building className="w-4 h-4" />
              <span>{t('rulesSec3Title')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>{t('rulesSec3Li1')}</li>
              <li>{t('rulesSec3Li2')}</li>
              <li>{t('rulesSec3Li3')}</li>
              <li>{t('rulesSec3Li4')}</li>
            </ul>
          </div>

          {/* Section 4: Mortgages */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 font-bold mb-1.5">
              <CreditCard className="w-4 h-4" />
              <span>{t('rulesSec4Title')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>{t('rulesSec4Li1')}</li>
              <li>{t('rulesSec4Li2')}</li>
              <li>{t('rulesSec4Li3')}</li>
            </ul>
          </div>

          {/* Section 5: Chaos Cards */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm">
            <div className="flex items-center gap-2 text-purple-700 font-bold mb-1.5">
              <Sparkles className="w-4 h-4" />
              <span>{t('rulesSec5Title')}</span>
            </div>
            <p>{t('rulesSec5Body')}</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mt-1">
              <li>{t('rulesSec5Li1')}</li>
              <li>{t('rulesSec5Li2')}</li>
              <li>{t('rulesSec5Li3')}</li>
              <li>{t('rulesSec5Li4')}</li>
            </ul>
          </div>

          {/* Section 6: Jail */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 font-bold mb-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>{t('rulesSec6Title')}</span>
            </div>
            <p>{t('rulesSec6Body')}</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mt-1">
              <li>{t('rulesSec6Li1')}</li>
              <li>{t('rulesSec6Li2')}</li>
              <li>{t('rulesSec6Li3')}</li>
            </ul>
          </div>

          {/* Section 7: Shortcuts */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm">
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-1.5">
              <Keyboard className="w-4 h-4 text-slate-700" />
              <span>{t('rulesSec7Title')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#faf8f5] border border-[#e8e2d5] flex items-center">
                <kbd className="px-2 py-0.5 rounded bg-white text-slate-800 font-mono font-bold mr-1.5 border border-[#e8e2d5] shadow-sm">Space</kbd>
                <span className="text-slate-700">{t('rulesKbRoll')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#faf8f5] border border-[#e8e2d5] flex items-center">
                <kbd className="px-2 py-0.5 rounded bg-white text-slate-800 font-mono font-bold mr-1.5 border border-[#e8e2d5] shadow-sm">Enter</kbd>
                <span className="text-slate-700">{t('rulesKbEnd')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#faf8f5] border border-[#e8e2d5] flex items-center">
                <kbd className="px-2 py-0.5 rounded bg-white text-slate-800 font-mono font-bold mr-1.5 border border-[#e8e2d5] shadow-sm">Esc</kbd>
                <span className="text-slate-700">{t('rulesKbClose')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={() => {
            soundEffects.click();
            onClose();
          }}
          className="w-full min-h-[44px] py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm transition-all active:scale-[0.99] flex items-center justify-center"
        >
          {t('rulesGotIt')}
        </button>
      </div>
    </div>
  );
};
