import { COSMETICS_CATALOG, getCosmeticItem } from './catalog';
import {
  getPlayerProfile,
  spendCoins,
  unlockCosmetic,
} from './storage';
import { CosmeticItem } from './types';

export interface ShopPurchaseResult {
  success: boolean;
  error?: string;
  item?: CosmeticItem;
  remainingCoins?: number;
}

export interface ShopTransactionRecord {
  id: string;
  itemId: string;
  itemName: string;
  price: number;
  timestamp: number;
}

const transactionHistory: ShopTransactionRecord[] = [];

/**
 * Executes a purchase in the cosmetic shop using in-game Chaos Coins.
 * STRICT NON-PAY-TO-WIN POLICY:
 * - 100% of items are visual customizations only (no stat changes, no rent bonuses, no dice tampering).
 * - All coins are earned through gameplay and match completion.
 * - No real-money payment gateways are connected.
 */
export function purchaseCosmeticItem(itemId: string): ShopPurchaseResult {
  const item = getCosmeticItem(itemId);
  if (!item) {
    return { success: false, error: 'Vật phẩm không tồn tại trong danh mục cửa hàng.' };
  }

  const profile = getPlayerProfile();
  if (profile.inventory.includes(itemId)) {
    return { success: false, error: 'Bạn đã sở hữu vật phẩm này rồi.' };
  }

  if (item.price > 0 && profile.chaosCoins < item.price) {
    return {
      success: false,
      error: `Không đủ Chaos Coins! Bạn cần ${item.price.toLocaleString()} Xu nhưng chỉ có ${profile.chaosCoins.toLocaleString()} Xu. Hãy thi đấu thêm các trận để tích lũy xu!`,
    };
  }

  if (item.price > 0) {
    const spent = spendCoins(item.price);
    if (!spent) {
      return { success: false, error: 'Giao dịch không thành công.' };
    }
  }

  unlockCosmetic(itemId);

  const record: ShopTransactionRecord = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: item.id,
    itemName: item.name.vi,
    price: item.price,
    timestamp: Date.now(),
  };
  transactionHistory.unshift(record);

  const updatedProfile = getPlayerProfile();
  return {
    success: true,
    item,
    remainingCoins: updatedProfile.chaosCoins,
  };
}

export function canAffordCosmetic(itemId: string): boolean {
  const item = getCosmeticItem(itemId);
  if (!item) return false;
  const profile = getPlayerProfile();
  return profile.chaosCoins >= item.price;
}

export const buyCosmetic = purchaseCosmeticItem;

export function getShopTransactionHistory(): ShopTransactionRecord[] {
  return [...transactionHistory];
}

export function getShopFeaturedItems(): CosmeticItem[] {
  return COSMETICS_CATALOG.filter(
    item => !item.isDefault && (item.rarity === 'LEGENDARY' || item.rarity === 'EPIC')
  );
}
