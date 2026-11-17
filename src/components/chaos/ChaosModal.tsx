import React, { useEffect } from 'react';
import { ChaosCard } from '../../game/types';
import { localizeMoneyText } from '../../utils/money';
import { getCatalogEntry } from '../../worlds/catalog';
import { GAME_UI, useLocale } from '../../worlds/i18n';
import { useModalDismiss } from '../common/useModalDismiss';
import {
  Sparkles,
  Zap,
  Gift,
  Coins,
  TrendingUp,
  Skull,
  Navigation,
  Receipt,
  Wine,
  Radio,
  ArrowUpCircle,
  AlertTriangle,
  Building,
  Shield,
  Shuffle,
  Flame,
} from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';

interface ChaosModalProps {
  card: ChaosCard | null;
  onResolve: () => void;
  /** Only the player whose turn it is may confirm the event; everyone else reads it. */
  canResolve?: boolean;
  /** Name shown in the waiting line when this viewer cannot confirm. */
  waitingForName?: string;
}

const RARITY_THEMES: Record<
  ChaosCard['rarity'],
  { badge: string; border: string; glow: string; text: string }
> = {
  COMMON: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-blue-300',
    glow: 'shadow-md',
    text: 'text-blue-700',
  },
  UNCOMMON: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-400',
    glow: 'shadow-md',
    text: 'text-emerald-700',
  },
  RARE: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    border: 'border-amber-400',
    glow: 'shadow-md',
    text: 'text-amber-800',
  },
  CALAMITY: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    border: 'border-rose-400',
    glow: 'shadow-lg',
    text: 'text-rose-700',
  },
  LEGENDARY: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse',
    border: 'border-purple-400',
    glow: 'shadow-lg',
    text: 'text-purple-700',
  },
};

const CARD_ICONS: Record<string, React.ReactNode> = {
  Gift: <Gift className="w-10 h-10 text-cyan-400" />,
  Sparkles: <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />,
  Skull: <Skull className="w-10 h-10 text-rose-500 animate-bounce" />,
  Navigation: <Navigation className="w-10 h-10 text-cyan-400" />,
  TrendingUp: <TrendingUp className="w-10 h-10 text-emerald-400" />,
  Receipt: <Receipt className="w-10 h-10 text-orange-400" />,
  Coins: <Coins className="w-10 h-10 text-amber-400" />,
  ZapOff: <Zap className="w-10 h-10 text-red-500" />,
  Zap: <Zap className="w-10 h-10 text-yellow-400" />,
  Wine: <Wine className="w-10 h-10 text-pink-400" />,
  Radio: <Radio className="w-10 h-10 text-blue-400" />,
  ArrowUpCircle: <ArrowUpCircle className="w-10 h-10 text-emerald-400" />,
  AlertTriangle: <AlertTriangle className="w-10 h-10 text-amber-400" />,
  Building: <Building className="w-10 h-10 text-indigo-400" />,
  Shield: <Shield className="w-10 h-10 text-cyan-400" />,
  Shuffle: <Shuffle className="w-10 h-10 text-fuchsia-400" />,
  Flame: <Flame className="w-10 h-10 text-rose-500" />,
};

export const ChaosModal: React.FC<ChaosModalProps> = ({
  card,
  onResolve,
  canResolve = true,
  waitingForName,
}) => {
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];

  useEffect(() => {
    if (card) {
      soundEffects.chaosTrigger();
    }
  }, [card]);

  const { backdropProps } = useModalDismiss({
    isOpen: Boolean(card),
    onClose: canResolve ? onResolve : () => {},
  });

  if (!card) return null;

  const theme = RARITY_THEMES[card.rarity] || RARITY_THEMES.COMMON;
  const isCalamity = card.rarity === 'CALAMITY' || card.rarity === 'LEGENDARY';

  const title = locale === 'en' && card.nameEn ? card.nameEn : localizeMoneyText(card.nameVi || card.title);
  const tagline = locale === 'en' && card.taglineEn ? card.taglineEn : card.taglineVi || card.tagline;
  const description =
    locale === 'en' && card.descriptionEn
      ? card.descriptionEn
      : localizeMoneyText(card.descriptionVi || card.flavorText);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
      {...backdropProps}
      data-testid="chaos-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md p-6 rounded-3xl bg-white border-2 ${
          theme.border
        } ${theme.glow} shadow-2xl relative overflow-hidden text-center flex flex-col items-center gap-4 text-slate-900 ${
          isCalamity ? 'animate-shake-subtle' : ''
        }`}
      >
        {/* Rarity Header Badge */}
        <div className="flex flex-col items-center gap-1.5 z-10">
          {card.worldId && (
            <span
              className="text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300"
              data-testid="chaos-world-event-badge"
            >
              🌏 {t('chaosWorldBadge')} • {getCatalogEntry(card.worldId)?.name[locale] || card.worldId}
            </span>
          )}
          <span
            className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-3.5 py-1 rounded-full border ${theme.badge}`}
          >
            {t('chaosEventBadge')} • {card.category || t('chaosEventFallback')} • {card.rarity}
          </span>
        </div>

        {/* Icon Circle */}
        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-inner relative z-10">
          {CARD_ICONS[card.iconName] || <Sparkles className="w-10 h-10 text-emerald-600" />}
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide">
            {title}
          </h2>
          {tagline && (
            <p className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
              {tagline}
            </p>
          )}
        </div>

        {/* Description & Flavor Box */}
        <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-inner relative z-10">
          <p className="font-semibold text-slate-900 mb-2">
            {description}
          </p>
          {card.flavorText && card.descriptionVi && (
            <p className="italic text-slate-500 text-[11px] border-t border-slate-200 pt-2">
              "{locale === 'en' && card.flavorTextEn ? card.flavorTextEn : localizeMoneyText(card.flavorText)}"
            </p>
          )}
        </div>

        {/* Accept Button (only for the player whose turn it is) */}
        {canResolve ? (
          <button
            onClick={() => {
              soundEffects.click();
              onResolve();
            }}
            className="w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all relative z-10"
          >
            {t('chaosContinue')}
          </button>
        ) : (
          <p className="text-xs font-bold text-slate-500 relative z-10">
            {t('chaosWaitingConfirm')} {waitingForName ?? t('chaosWaitingFallback')} {t('chaosWaitingSuffix')}
          </p>
        )}
      </div>
    </div>
  );
};

