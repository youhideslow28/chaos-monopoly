/**
 * src/game/business/businessCatalog.ts
 * Multi-tier Business Archetype Catalog for CHAOS MONOPOLY.
 */

import { BusinessCategory, BusinessDefinition } from './businessTypes';

export const BUSINESS_CATALOG: Record<string, BusinessDefinition> = {
  underground_bar: {
    id: 'underground_bar',
    category: 'NIGHTLIFE',
    name: 'Underground Bar',
    baseRent: 35,
    buildCost: 100,
    synergyTags: ['NIGHTLIFE', 'BAR', 'ALCOHOL'],
    description: 'Quán bar ngầm náo nhiệt, hưởng lợi cùng tiệm cầm đồ và sòng bạc lân cận.',
  },
  pawn_shop: {
    id: 'pawn_shop',
    category: 'FINANCE',
    name: 'Pawn Shop',
    baseRent: 30,
    buildCost: 90,
    synergyTags: ['FINANCE', 'SHADY', 'VALUABLES'],
    description: 'Tiệm cầm đồ tài chính ngầm, tương hỗ với quán bar nhưng bị cảnh sát siết chặt.',
  },
  underground_casino: {
    id: 'underground_casino',
    category: 'NIGHTLIFE',
    name: 'Underground Casino',
    baseRent: 90,
    buildCost: 200,
    synergyTags: ['NIGHTLIFE', 'GAMBLING', 'ILLEGAL'],
    description: 'Sòng bạc chui siêu lợi nhuận, nhưng bị vô hiệu hóa hoàn toàn ($0) nếu gần chốt cảnh sát.',
  },
  street_food_stall: {
    id: 'street_food_stall',
    category: 'COMMERCIAL',
    name: 'Street Food Stall',
    baseRent: 25,
    buildCost: 60,
    synergyTags: ['COMMERCIAL', 'FOOD', 'INFORMAL'],
    description: 'Quầy ẩm thực đường phố, tăng doanh thu mạnh khi nằm cạnh các cụm nhà lồng hộp.',
  },
  clinic_pharmacy: {
    id: 'clinic_pharmacy',
    category: 'CIVIC',
    name: 'Pharmacy / Clinic',
    baseRent: 50,
    buildCost: 140,
    synergyTags: ['CIVIC', 'HEALTH', 'ESSENTIAL'],
    description: 'Phòng khám & nhà thuốc dân sinh, tạo cụm y tế cộng hưởng gia tăng giá trị.',
  },
  luxury_boutique: {
    id: 'luxury_boutique',
    category: 'COMMERCIAL',
    name: 'Luxury Boutique',
    baseRent: 80,
    buildCost: 180,
    synergyTags: ['COMMERCIAL', 'LUXURY', 'RETAIL'],
    description: 'Cửa hàng xa xỉ phẩm cao cấp, bị suy giảm khách khi nằm gần khu nhà hộp.',
  },
  police_checkpoint: {
    id: 'police_checkpoint',
    category: 'CIVIC',
    name: 'Police Checkpoint',
    baseRent: 40,
    buildCost: 120,
    synergyTags: ['CIVIC', 'LAW_ENFORCEMENT', 'AUTHORITY'],
    description: 'Chốt an ninh kiểm soát, vô hiệu hóa sòng bạc chui ($0) và giảm 50% tiệm cầm đồ.',
  },
  security_hq: {
    id: 'security_hq',
    category: 'CIVIC',
    name: 'Security HQ',
    baseRent: 65,
    buildCost: 160,
    synergyTags: ['CIVIC', 'SECURITY', 'DEFENSE'],
    description: 'Trụ sở bảo an kiên cố, điểm tựa phòng ngự trong các đợt bùng nổ khủng hoảng.',
  },
  coffin_home_units: {
    id: 'coffin_home_units',
    category: 'RESIDENTIAL',
    name: 'Coffin Home Units',
    baseRent: 45,
    buildCost: 110,
    synergyTags: ['RESIDENTIAL', 'DENSITY', 'LOW_INCOME'],
    description: 'Cụm nhà lồng hộp siêu mật độ, thúc đẩy hàng quán ăn vặt nhưng kéo giảm hàng hiệu.',
  },
  tenement_complex: {
    id: 'tenement_complex',
    category: 'RESIDENTIAL',
    name: 'Tenement Complex',
    baseRent: 75,
    buildCost: 170,
    synergyTags: ['RESIDENTIAL', 'HOUSING', 'MID_INCOME'],
    description: 'Khu chung cư thu nhập trung bình, tạo dòng tiền thuê ổn định và bền vững.',
  },
};

export function getBusinessById(id: string): BusinessDefinition | undefined {
  return BUSINESS_CATALOG[id];
}

export function isValidBusinessId(id: string): boolean {
  return Boolean(BUSINESS_CATALOG[id]);
}

export function getBusinessesByCategory(category: BusinessCategory): BusinessDefinition[] {
  return Object.values(BUSINESS_CATALOG).filter(b => b.category === category);
}
