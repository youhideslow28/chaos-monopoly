import { useSyncExternalStore } from 'react';
import { COSMETICS_CATALOG, sanitizePlayerCosmetics } from './catalog';
import {
  CosmeticCategory,
  DEFAULT_PLAYER_COSMETICS,
  PlayerCosmetics,
} from './types';

export interface PlayerStats {
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  bestWinStreak: number;
  totalCashEarned: number;
  propertiesBought: number;
  upgradesConstructed: number;
  auctionsWon: number;
  tradesCompleted: number;
  chaosEventsSurvived: number;
  bankruptciesInflicted: number;
  highestNetWorth: number;
}

export interface PlayerProfile {
  id: string; // guest session id, e.g. "guest-a8f3b2"
  displayName: string;
  level: number; // 1 .. 50
  xp: number; // Current XP in level
  chaosCoins: number; // In-game cosmetic currency earned via matches
  cosmetics: PlayerCosmetics;
  inventory: string[]; // Set of unlocked cosmetic IDs
  stats: PlayerStats;
  unlockedAchievements: string[];
}

const STORAGE_KEY = 'chaos_player_profile_v1';

export function getXpRequiredForLevel(level: number): number {
  return Math.max(100, level * 250);
}

const DEFAULT_INVENTORY = COSMETICS_CATALOG.filter(c => c.isDefault || c.price === 0).map(
  c => c.id
);

export function createInitialProfile(): PlayerProfile {
  const guestHex =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);

  return {
    id: `guest-${guestHex}`,
    displayName: 'Tài Phiệt Tân Thủ',
    level: 1,
    xp: 0,
    chaosCoins: 500, // Starter bonus coins to allow trying out the cosmetic shop immediately
    cosmetics: { ...DEFAULT_PLAYER_COSMETICS },
    inventory: [...DEFAULT_INVENTORY],
    stats: {
      matchesPlayed: 0,
      matchesWon: 0,
      winStreak: 0,
      bestWinStreak: 0,
      totalCashEarned: 0,
      propertiesBought: 0,
      upgradesConstructed: 0,
      auctionsWon: 0,
      tradesCompleted: 0,
      chaosEventsSurvived: 0,
      bankruptciesInflicted: 0,
      highestNetWorth: 1500,
    },
    unlockedAchievements: [],
  };
}

let cachedProfile: PlayerProfile | null = null;
const profileListeners = new Set<() => void>();

function notifyProfileListeners(): void {
  profileListeners.forEach(listener => listener());
}

function getStorage(): Storage | undefined {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return undefined;
}

export function getPlayerProfile(): PlayerProfile {
  if (!cachedProfile) {
    cachedProfile = loadPlayerProfileFromStorage();
  }
  return cachedProfile;
}

export const loadPlayerProfile = loadPlayerProfileFromStorage;

export function loadPlayerProfileFromStorage(): PlayerProfile {
  const storage = getStorage();
  if (!storage) {
    const initial = createInitialProfile();
    cachedProfile = initial;
    return initial;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialProfile();
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(initial));
      } catch {}
      cachedProfile = initial;
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const base = createInitialProfile();

    const profile: PlayerProfile = {
      id: typeof parsed.id === 'string' && parsed.id.startsWith('guest-') ? parsed.id : base.id,
      displayName:
        typeof parsed.displayName === 'string' && parsed.displayName.trim()
          ? parsed.displayName.trim().slice(0, 24)
          : base.displayName,
      level: Math.max(1, Math.min(50, Number(parsed.level) || 1)),
      xp: Math.max(0, Math.min(500_000, Number(parsed.xp) || 0)),
      chaosCoins: Math.max(0, Math.min(1_000_000, Number(parsed.chaosCoins) || 0)),
      cosmetics: sanitizePlayerCosmetics(parsed.cosmetics),
      inventory: Array.from(
        new Set([...DEFAULT_INVENTORY, ...(Array.isArray(parsed.inventory) ? parsed.inventory : [])])
      ),
      stats: {
        matchesPlayed: Number(parsed.stats?.matchesPlayed) || 0,
        matchesWon: Number(parsed.stats?.matchesWon) || 0,
        winStreak: Number(parsed.stats?.winStreak) || 0,
        bestWinStreak: Number(parsed.stats?.bestWinStreak) || 0,
        totalCashEarned: Number(parsed.stats?.totalCashEarned) || 0,
        propertiesBought: Number(parsed.stats?.propertiesBought) || 0,
        upgradesConstructed: Number(parsed.stats?.upgradesConstructed) || 0,
        auctionsWon: Number(parsed.stats?.auctionsWon) || 0,
        tradesCompleted: Number(parsed.stats?.tradesCompleted) || 0,
        chaosEventsSurvived: Number(parsed.stats?.chaosEventsSurvived) || 0,
        bankruptciesInflicted: Number(parsed.stats?.bankruptciesInflicted) || 0,
        highestNetWorth: Number(parsed.stats?.highestNetWorth) || 1500,
      },
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
    };

    cachedProfile = profile;
    return profile;
  } catch {
    const fallback = createInitialProfile();
    cachedProfile = fallback;
    return fallback;
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  cachedProfile = profile;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Storage quota safe fallback
    }
  }
  notifyProfileListeners();
}

export function updateDisplayName(name: string): boolean {
  const clean = name.trim().slice(0, 24);
  if (!clean) return false;
  const current = getPlayerProfile();
  savePlayerProfile({
    ...current,
    displayName: clean,
  });
  return true;
}

export function addXP(amount: number): { newLevel: number; leveledUp: boolean } {
  const current = getPlayerProfile();
  if (amount <= 0) return { newLevel: current.level, leveledUp: false };

  let currentLevel = current.level;
  let currentXp = current.xp + amount;
  let leveledUp = false;

  while (currentLevel < 50 && currentXp >= getXpRequiredForLevel(currentLevel)) {
    currentXp -= getXpRequiredForLevel(currentLevel);
    currentLevel += 1;
    leveledUp = true;
  }

  savePlayerProfile({
    ...current,
    level: currentLevel,
    xp: currentXp,
  });

  return { newLevel: currentLevel, leveledUp };
}

export function addCoins(amount: number): number {
  const current = getPlayerProfile();
  if (amount <= 0) return current.chaosCoins;
  const next = current.chaosCoins + amount;
  savePlayerProfile({
    ...current,
    chaosCoins: next,
  });
  return next;
}

export function spendCoins(amount: number): boolean {
  if (amount <= 0) return true;
  const current = getPlayerProfile();
  if (current.chaosCoins < amount) return false;
  savePlayerProfile({
    ...current,
    chaosCoins: current.chaosCoins - amount,
  });
  return true;
}

export function unlockCosmetic(itemId: string): boolean {
  const current = getPlayerProfile();
  if (current.inventory.includes(itemId)) return false;
  savePlayerProfile({
    ...current,
    inventory: [...current.inventory, itemId],
  });
  return true;
}

export function equipCosmetic(category: CosmeticCategory, itemId: string): boolean {
  const item = COSMETICS_CATALOG.find(c => c.id === itemId);
  if (!item || item.category !== category) return false;
  const current = getPlayerProfile();
  if (!current.inventory.includes(itemId)) return false;

  const currentCosmetics = { ...current.cosmetics };

  switch (category) {
    case 'CHARACTER':
      currentCosmetics.characterId = itemId;
      break;
    case 'OUTFIT':
      currentCosmetics.outfitId = itemId;
      break;
    case 'PET':
      currentCosmetics.petId = itemId;
      break;
    case 'DICE':
      currentCosmetics.diceSkinId = itemId;
      break;
    case 'TOKEN':
      currentCosmetics.tokenId = itemId;
      break;
    case 'EFFECT':
      currentCosmetics.effectId = itemId;
      break;
    default:
      return false;
  }

  savePlayerProfile({
    ...current,
    cosmetics: currentCosmetics,
  });

  return true;
}

export function recordMatchResult(params: {
  won: boolean;
  netWorth: number;
  propertiesBought: number;
  upgradesConstructed: number;
  auctionsWon: number;
  tradesCompleted: number;
  chaosEventsSurvived: number;
  bankruptciesInflicted?: number;
}): { earnedXp: number; earnedCoins: number; leveledUp: boolean } {
  const current = getPlayerProfile();
  const newWinStreak = params.won ? current.stats.winStreak + 1 : 0;
  const newBestWinStreak = Math.max(current.stats.bestWinStreak, newWinStreak);

  // Compute reward progression
  const baseMatchXp = 100;
  const winBonusXp = params.won ? 200 : 0;
  const actionXp =
    params.propertiesBought * 10 +
    params.upgradesConstructed * 20 +
    params.auctionsWon * 15 +
    params.tradesCompleted * 15 +
    params.chaosEventsSurvived * 10;
  const totalEarnedXp = baseMatchXp + winBonusXp + actionXp;

  // Coins earned
  const baseCoins = 50;
  const winCoins = params.won ? 150 : 0;
  const totalEarnedCoins = baseCoins + winCoins + Math.floor(actionXp / 5);

  const updatedStats: PlayerStats = {
    matchesPlayed: current.stats.matchesPlayed + 1,
    matchesWon: current.stats.matchesWon + (params.won ? 1 : 0),
    winStreak: newWinStreak,
    bestWinStreak: newBestWinStreak,
    totalCashEarned: current.stats.totalCashEarned + params.netWorth,
    propertiesBought: current.stats.propertiesBought + params.propertiesBought,
    upgradesConstructed: current.stats.upgradesConstructed + params.upgradesConstructed,
    auctionsWon: current.stats.auctionsWon + params.auctionsWon,
    tradesCompleted: current.stats.tradesCompleted + params.tradesCompleted,
    chaosEventsSurvived: current.stats.chaosEventsSurvived + params.chaosEventsSurvived,
    bankruptciesInflicted:
      current.stats.bankruptciesInflicted + (params.bankruptciesInflicted || 0),
    highestNetWorth: Math.max(current.stats.highestNetWorth, params.netWorth),
  };

  // Check achievements
  const newAchievements = [...current.unlockedAchievements];
  if (params.won && !newAchievements.includes('ach-first-win')) {
    newAchievements.push('ach-first-win');
  }
  if (params.propertiesBought >= 5 && !newAchievements.includes('ach-property-tycoon')) {
    newAchievements.push('ach-property-tycoon');
  }
  if (params.upgradesConstructed >= 3 && !newAchievements.includes('ach-apex-architect')) {
    newAchievements.push('ach-apex-architect');
  }
  if (updatedStats.auctionsWon >= 3 && !newAchievements.includes('ach-auction-sniper')) {
    newAchievements.push('ach-auction-sniper');
  }
  if (updatedStats.tradesCompleted >= 3 && !newAchievements.includes('ach-trade-diplomat')) {
    newAchievements.push('ach-trade-diplomat');
  }
  if (params.chaosEventsSurvived >= 5 && !newAchievements.includes('ach-chaos-survivor')) {
    newAchievements.push('ach-chaos-survivor');
  }
  if (params.netWorth >= 4000 && !newAchievements.includes('ach-wealth-titan')) {
    newAchievements.push('ach-wealth-titan');
  }
  if (updatedStats.matchesPlayed >= 10 && !newAchievements.includes('ach-veteran-roller')) {
    newAchievements.push('ach-veteran-roller');
  }

  // Apply XP and coins
  let newLevel = current.level;
  let newXp = current.xp + totalEarnedXp;
  let leveledUp = false;

  while (newLevel < 50 && newXp >= getXpRequiredForLevel(newLevel)) {
    newXp -= getXpRequiredForLevel(newLevel);
    newLevel += 1;
    leveledUp = true;
  }

  savePlayerProfile({
    ...current,
    level: newLevel,
    xp: newXp,
    chaosCoins: current.chaosCoins + totalEarnedCoins,
    stats: updatedStats,
    unlockedAchievements: newAchievements,
  });

  return {
    earnedXp: totalEarnedXp,
    earnedCoins: totalEarnedCoins,
    leveledUp,
  };
}

export function usePlayerProfile(): PlayerProfile {
  return useSyncExternalStore(
    cb => {
      profileListeners.add(cb);
      return () => profileListeners.delete(cb);
    },
    () => getPlayerProfile(),
    () => createInitialProfile()
  );
}

export function resetPlayerProfileForTesting(): void {
  savePlayerProfile(createInitialProfile());
}
