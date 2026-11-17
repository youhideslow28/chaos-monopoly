import { LocalizedText } from '../worlds/types';

export type CosmeticCategory =
  | 'CHARACTER'
  | 'OUTFIT'
  | 'PET'
  | 'DICE'
  | 'TOKEN'
  | 'EFFECT'
  | 'EMOTE';

export type CosmeticRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY';

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: LocalizedText;
  description: LocalizedText;
  rarity: CosmeticRarity;
  iconName: string;
  previewColor?: string;
  worldTheme?: string;
  unlockCondition: LocalizedText;
  price: number; // Chaos Coins price (0 = free / default)
  isDefault?: boolean;
}

export interface PlayerCosmetics {
  characterId: string;
  outfitId: string;
  petId: string;
  diceSkinId: string;
  tokenId: string;
  effectId: string;
}

export const DEFAULT_PLAYER_COSMETICS: PlayerCosmetics = {
  characterId: 'char-tycoon',
  outfitId: 'outfit-classic-suit',
  petId: 'pet-none',
  diceSkinId: 'dice-neon-cyan',
  tokenId: 'token-vinfast',
  effectId: 'effect-none',
};

export const COSMETIC_RARITY_THEMES: Record<
  CosmeticRarity,
  {
    border: string;
    badge: string;
    glow: string;
    text: string;
    bg: string;
  }
> = {
  COMMON: {
    border: 'border-slate-600',
    badge: 'bg-slate-700/50 text-slate-300 border-slate-500/40',
    glow: 'shadow-slate-500/10',
    text: 'text-slate-300',
    bg: 'bg-slate-900/60',
  },
  UNCOMMON: {
    border: 'border-emerald-500/60',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
    text: 'text-emerald-400',
    bg: 'bg-emerald-950/30',
  },
  RARE: {
    border: 'border-cyan-500/70',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    glow: 'shadow-cyan-500/25',
    text: 'text-cyan-400',
    bg: 'bg-cyan-950/35',
  },
  EPIC: {
    border: 'border-fuchsia-500/80',
    badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    glow: 'shadow-fuchsia-500/30',
    text: 'text-fuchsia-400',
    bg: 'bg-fuchsia-950/40',
  },
  LEGENDARY: {
    border: 'border-amber-400',
    badge: 'bg-amber-500/25 text-amber-300 border-amber-400/50 animate-pulse',
    glow: 'shadow-amber-500/40',
    text: 'text-amber-400',
    bg: 'bg-amber-950/45',
  },
};
