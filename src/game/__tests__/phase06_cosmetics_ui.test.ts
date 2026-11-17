import { describe, it, expect, beforeEach } from 'vitest';
import {
  COSMETICS_CATALOG,
  getCosmeticItem,
  getCosmeticsByCategory,
  isValidCosmeticId,
  sanitizePlayerCosmetics,
} from '../../cosmetics/catalog';
import {
  CosmeticCategory,
  CosmeticRarity,
  DEFAULT_PLAYER_COSMETICS,
  PlayerCosmetics,
} from '../../cosmetics/types';
import {
  createInitialProfile,
  equipCosmetic,
  getXpRequiredForLevel,
  loadPlayerProfileFromStorage,
  recordMatchResult,
  savePlayerProfile,
  unlockCosmetic,
  updateDisplayName,
} from '../../cosmetics/storage';
import { buyCosmetic, canAffordCosmetic } from '../../cosmetics/shop';
import {
  DEFAULT_AUDIO_SETTINGS,
  getAudioSettings,
  updateAudioSettings,
} from '../../cosmetics/audioSettings';
import { COSMETIC_UI } from '../../worlds/i18n';
import {
  ClientToServerMessage,
  PROTOCOL_VERSION,
} from '../../multiplayer/protocol';
import { parseAndValidateClientMessage } from '../../server/security';
import { RoomManager } from '../../server/roomManager';

describe('Phase 06 — UI/UX, Cosmetics, Player Identity & Monetization', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStore[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    (globalThis as any).localStorage = mockStorage;
    if (typeof window !== 'undefined') {
      (window as any).localStorage = mockStorage;
    }
  });

  describe('1. Cosmetic Catalog & Category Coverage', () => {
    const requiredCategories: CosmeticCategory[] = [
      'CHARACTER',
      'OUTFIT',
      'PET',
      'DICE',
      'TOKEN',
      'EFFECT',
      'EMOTE',
    ];

    it('contains at least 35 distinct cosmetic items', () => {
      expect(COSMETICS_CATALOG.length).toBeGreaterThanOrEqual(35);
    });

    it('has items covering all 7 declared categories', () => {
      for (const cat of requiredCategories) {
        const items = getCosmeticsByCategory(cat);
        expect(items.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('verifies that every catalog item adheres to the strict CosmeticItem schema', () => {
      const validRarities: CosmeticRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

      for (const item of COSMETICS_CATALOG) {
        expect(item.id).toBeTruthy();
        expect(requiredCategories).toContain(item.category);
        expect(validRarities).toContain(item.rarity);
        expect(item.name.vi).toBeTruthy();
        expect(item.name.en).toBeTruthy();
        expect(item.description.vi).toBeTruthy();
        expect(item.description.en).toBeTruthy();
        expect(item.iconName).toBeTruthy();
        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(item.unlockCondition.vi).toBeTruthy();
      }
    });

    it('correctly resolves items by id and handles unknown ids gracefully', () => {
      const char = getCosmeticItem('char-tycoon');
      expect(char).toBeDefined();
      expect(char?.category).toBe('CHARACTER');

      const unknown = getCosmeticItem('non-existent-skin-999');
      expect(unknown).toBeUndefined();
      expect(isValidCosmeticId('char-tycoon')).toBe(true);
      expect(isValidCosmeticId('unknown-item-xyz')).toBe(false);
    });

    it('sanitizes corrupted or partial PlayerCosmetics back to valid defaults', () => {
      const corrupted: Partial<PlayerCosmetics> = {
        characterId: 'invalid-char-hack',
        diceSkinId: 'dice-cyber-gold',
      };

      const sanitized = sanitizePlayerCosmetics(corrupted);
      expect(sanitized.characterId).toBe(DEFAULT_PLAYER_COSMETICS.characterId);
      expect(sanitized.diceSkinId).toBe('dice-cyber-gold');
      expect(sanitized.outfitId).toBe(DEFAULT_PLAYER_COSMETICS.outfitId);
      expect(sanitized.petId).toBe(DEFAULT_PLAYER_COSMETICS.petId);
      expect(sanitized.tokenId).toBe(DEFAULT_PLAYER_COSMETICS.tokenId);
      expect(sanitized.effectId).toBe(DEFAULT_PLAYER_COSMETICS.effectId);
    });
  });

  describe('2. Guest Player Identity & LocalStorage Profile', () => {
    it('generates a fresh guest profile with valid initial state and starter bonus', () => {
      const profile = createInitialProfile();
      expect(profile.id).toMatch(/^guest-[a-f0-9]+$/);
      expect(profile.level).toBe(1);
      expect(profile.xp).toBe(0);
      expect(profile.chaosCoins).toBe(500); // 500 starter coins
      expect(profile.inventory.length).toBeGreaterThanOrEqual(5);
      expect(profile.cosmetics).toEqual(DEFAULT_PLAYER_COSMETICS);
      expect(profile.stats.matchesPlayed).toBe(0);
      expect(profile.stats.matchesWon).toBe(0);
    });

    it('persists and retrieves profile from localStorage correctly', () => {
      const initial = createInitialProfile();
      initial.displayName = 'Đại Gia Sài Gòn';
      initial.level = 5;
      initial.chaosCoins = 1200;
      savePlayerProfile(initial);

      const loaded = loadPlayerProfileFromStorage();
      expect(loaded.displayName).toBe('Đại Gia Sài Gòn');
      expect(loaded.level).toBe(5);
      expect(loaded.chaosCoins).toBe(1200);
    });

    it('updates guest display name and trims excessive whitespace', () => {
      const updated = updateDisplayName('   Tài Phiệt Bến Thành   ');
      expect(updated).toBe(true);
      const current = loadPlayerProfileFromStorage();
      expect(current.displayName).toBe('Tài Phiệt Bến Thành');
    });

    it('rejects empty or whitespace-only display names', () => {
      const updated = updateDisplayName('    ');
      expect(updated).toBe(false);
    });
  });

  describe('3. Equipment & Inventory System', () => {
    it('allows unlocking a new cosmetic item into the player inventory', () => {
      const profile = createInitialProfile();
      savePlayerProfile(profile);

      const unlocked = unlockCosmetic('dice-cyber-gold');
      expect(unlocked).toBe(true);

      const reloaded = loadPlayerProfileFromStorage();
      expect(reloaded.inventory).toContain('dice-cyber-gold');

      // Duplicate unlock returns false
      const reUnlocked = unlockCosmetic('dice-cyber-gold');
      expect(reUnlocked).toBe(false);
    });

    it('equips owned cosmetics across categories and rejects unowned items', () => {
      const profile = createInitialProfile();
      savePlayerProfile(profile);

      // Attempting to equip an unowned item must fail
      const equipUnowned = equipCosmetic('DICE', 'dice-cyber-gold');
      expect(equipUnowned).toBe(false);

      // Unlock item first, then equip
      unlockCosmetic('dice-cyber-gold');
      const equipSuccess = equipCosmetic('DICE', 'dice-cyber-gold');
      expect(equipSuccess).toBe(true);

      const reloaded = loadPlayerProfileFromStorage();
      expect(reloaded.cosmetics.diceSkinId).toBe('dice-cyber-gold');
    });

    it('rejects equipping an item into the wrong category', () => {
      unlockCosmetic('dice-cyber-gold');
      // dice-cyber-gold is a DICE, attempting to equip as CHARACTER must fail
      const invalidCategoryEquip = equipCosmetic('CHARACTER', 'dice-cyber-gold');
      expect(invalidCategoryEquip).toBe(false);
    });
  });

  describe('4. XP Progression & Achievements System', () => {
    it('calculates XP required per level with progressive difficulty scaling', () => {
      expect(getXpRequiredForLevel(1)).toBe(250);
      expect(getXpRequiredForLevel(2)).toBe(500);
      expect(getXpRequiredForLevel(10)).toBe(2500);
    });

    it('awards XP and Chaos Coins upon match completion', () => {
      const initial = createInitialProfile();
      savePlayerProfile(initial);

      const result = recordMatchResult({
        won: true,
        netWorth: 3500,
        propertiesBought: 5,
        upgradesConstructed: 3,
        auctionsWon: 2,
        tradesCompleted: 1,
        chaosEventsSurvived: 4,
        bankruptciesInflicted: 1,
      });

      expect(result.earnedXp).toBeGreaterThan(300);
      expect(result.earnedCoins).toBeGreaterThan(150);

      const updated = loadPlayerProfileFromStorage();
      expect(updated.stats.matchesPlayed).toBe(1);
      expect(updated.stats.matchesWon).toBe(1);
      expect(updated.stats.propertiesBought).toBe(5);
      expect(updated.stats.winStreak).toBe(1);
      expect(updated.stats.bestWinStreak).toBe(1);
    });

    it('triggers level-up when accumulated XP exceeds requirement', () => {
      const initial = createInitialProfile();
      initial.level = 1;
      initial.xp = 200; // 50 XP to level 2
      savePlayerProfile(initial);

      const result = recordMatchResult({
        won: true,
        netWorth: 2000,
        propertiesBought: 2,
        upgradesConstructed: 1,
        auctionsWon: 0,
        tradesCompleted: 0,
        chaosEventsSurvived: 2,
      });

      expect(result.leveledUp).toBe(true);
      const updated = loadPlayerProfileFromStorage();
      expect(updated.level).toBeGreaterThanOrEqual(2);
    });

    it('unlocks career achievements upon reaching milestones', () => {
      const initial = createInitialProfile();
      savePlayerProfile(initial);

      recordMatchResult({
        won: true,
        netWorth: 2500,
        propertiesBought: 1,
        upgradesConstructed: 0,
        auctionsWon: 0,
        tradesCompleted: 0,
        chaosEventsSurvived: 1,
      });

      const updated = loadPlayerProfileFromStorage();
      expect(updated.unlockedAchievements).toContain('ach-first-win');
    });
  });

  describe('5. Non-Pay-To-Win Cosmetic Shop', () => {
    it('correctly checks whether player can afford an item', () => {
      const profile = createInitialProfile();
      profile.chaosCoins = 600;
      savePlayerProfile(profile);

      const affordableItem = COSMETICS_CATALOG.find(c => c.price > 0 && c.price <= 600)!;
      const expensiveItem = COSMETICS_CATALOG.find(c => c.price > 600)!;

      expect(canAffordCosmetic(affordableItem.id)).toBe(true);
      expect(canAffordCosmetic(expensiveItem.id)).toBe(false);
    });

    it('purchases a cosmetic item with earnable Chaos Coins and deducts balance', () => {
      const profile = createInitialProfile();
      profile.chaosCoins = 1000;
      savePlayerProfile(profile);

      const itemToBuy = COSMETICS_CATALOG.find(
        c => c.price > 0 && c.price <= 800 && !profile.inventory.includes(c.id)
      )!;

      const purchase = buyCosmetic(itemToBuy.id);
      expect(purchase.success).toBe(true);
      expect(purchase.remainingCoins).toBe(1000 - itemToBuy.price);

      const updated = loadPlayerProfileFromStorage();
      expect(updated.inventory).toContain(itemToBuy.id);
      expect(updated.chaosCoins).toBe(1000 - itemToBuy.price);
    });

    it('strictly rejects duplicate purchases of already-owned items', () => {
      const profile = createInitialProfile();
      profile.chaosCoins = 1000;
      savePlayerProfile(profile);

      const itemToBuy = COSMETICS_CATALOG.find(
        c => c.price > 0 && !profile.inventory.includes(c.id)
      )!;

      buyCosmetic(itemToBuy.id);
      const duplicatePurchase = buyCosmetic(itemToBuy.id);
      expect(duplicatePurchase.success).toBe(false);
    });

    it('strictly rejects purchases when Chaos Coins balance is insufficient', () => {
      const profile = createInitialProfile();
      profile.chaosCoins = 50; // Insufficient for high-tier item
      savePlayerProfile(profile);

      const expensiveItem = COSMETICS_CATALOG.find(c => c.price >= 500)!;
      const purchase = buyCosmetic(expensiveItem.id);
      expect(purchase.success).toBe(false);
    });
  });

  describe('6. Audio System Settings & Procedural Music', () => {
    it('provides sensible default audio settings', () => {
      const settings = getAudioSettings();
      expect(settings.masterVolume).toBe(DEFAULT_AUDIO_SETTINGS.masterVolume);
      expect(settings.musicVolume).toBe(DEFAULT_AUDIO_SETTINGS.musicVolume);
      expect(settings.sfxVolume).toBe(DEFAULT_AUDIO_SETTINGS.sfxVolume);
      expect(settings.isMuted).toBe(false);
    });

    it('updates and clamps audio volume settings between 0 and 1', () => {
      updateAudioSettings({ masterVolume: 0.65, musicVolume: 1.5, sfxVolume: -0.2 });
      const current = getAudioSettings();
      expect(current.masterVolume).toBe(0.65);
      expect(current.musicVolume).toBe(1.0); // Clamped max
      expect(current.sfxVolume).toBe(0.0); // Clamped min
    });

    it('toggles mute setting and persists in localStorage', () => {
      updateAudioSettings({ isMuted: true });
      expect(getAudioSettings().isMuted).toBe(true);

      updateAudioSettings({ isMuted: false });
      expect(getAudioSettings().isMuted).toBe(false);
    });
  });

  describe('7. VI/EN Localization Coverage', () => {
    it('provides complete bilingual UI dictionary for cosmetics and profile', () => {
      expect(COSMETIC_UI.shop.vi).toBeTruthy();
      expect(COSMETIC_UI.shop.en).toBeTruthy();
      expect(COSMETIC_UI.collection.vi).toBeTruthy();
      expect(COSMETIC_UI.collection.en).toBeTruthy();
      expect(COSMETIC_UI.menuTitle.vi).toBeTruthy();
      expect(COSMETIC_UI.menuTitle.en).toBeTruthy();
      expect(COSMETIC_UI.nonPayToWinNotice.vi).toContain('100%');
      expect(COSMETIC_UI.nonPayToWinNotice.en).toContain('100%');
    });
  });

  describe('8. Multiplayer Cosmetic & Emote Synchronization', () => {
    it('sanitizes client room creation message with player cosmetics', () => {
      const rawMsg: ClientToServerMessage = {
        version: PROTOCOL_VERSION,
        type: 'CREATE_ROOM',
        requestId: 'req-1',
        playerName: 'Chủ Tịch Cyber',
        cosmetics: {
          characterId: 'char-cyberpunk',
          outfitId: 'outfit-street-neon',
          petId: 'pet-shiba',
          diceSkinId: 'dice-cyber-gold',
          tokenId: 'token-vinfast',
          effectId: 'effect-none',
        },
      };

      const result = parseAndValidateClientMessage(JSON.stringify(rawMsg));
      expect(result.ok).toBe(true);
      if (result.ok && result.value && result.value.type === 'CREATE_ROOM') {
        const createMsg = result.value as Extract<ClientToServerMessage, { type: 'CREATE_ROOM' }>;
        expect(createMsg.cosmetics?.characterId).toBe('char-cyberpunk');
        expect(createMsg.cosmetics?.diceSkinId).toBe('dice-cyber-gold');
      }
    });

    it('stores and broadcasts equipped player cosmetics in room seats', () => {
      const roomManager = new RoomManager({
        repository: {
          saveRoom: () => {},
          loadRoom: () => null,
          deleteRoom: () => {},
          loadAllActiveRooms: () => [],
        } as any,
        onBroadcastToRoom: () => {},
      });

      const created = roomManager.createRoom({
        sessionPlayerId: 'p1',
        playerName: 'Chủ Tịch Cyber',
        capacity: 4,
        cosmetics: {
          characterId: 'char-cyberpunk',
          outfitId: 'outfit-street-neon',
          petId: 'pet-shiba',
          diceSkinId: 'dice-cyber-gold',
          tokenId: 'token-vinfast',
          effectId: 'effect-none',
        },
      });

      expect(created.ok).toBe(true);
      if (created.ok && created.data) {
        const seat = created.data.room.seats[0];
        expect(seat.cosmetics).toBeDefined();
        expect(seat.cosmetics?.characterId).toBe('char-cyberpunk');
        expect(seat.cosmetics?.petId).toBe('pet-shiba');
      }
    });

    it('sanitizes and validates SEND_EMOTE client message', () => {
      const validEmoteMsg: ClientToServerMessage = {
        version: PROTOCOL_VERSION,
        type: 'SEND_EMOTE',
        requestId: 'req-emote-1',
        roomCode: 'ABCD',
        emoteId: 'emote-laugh',
      };

      const result = parseAndValidateClientMessage(JSON.stringify(validEmoteMsg));
      expect(result.ok).toBe(true);

      const invalidEmoteMsg: ClientToServerMessage = {
        version: PROTOCOL_VERSION,
        type: 'SEND_EMOTE',
        requestId: 'req-emote-2',
        roomCode: 'ABCD',
        emoteId: 'malicious-injected-script-emote',
      };

      const invalidResult = parseAndValidateClientMessage(JSON.stringify(invalidEmoteMsg));
      expect(invalidResult.ok).toBe(false);
    });
  });
});
