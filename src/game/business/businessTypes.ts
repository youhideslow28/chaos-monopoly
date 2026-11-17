/**
 * src/game/business/businessTypes.ts
 * Type definitions for Multi-tier Business Archetypes and Adjacency Synergies.
 */

export type BusinessCategory = 'NIGHTLIFE' | 'COMMERCIAL' | 'CIVIC' | 'RESIDENTIAL' | 'FINANCE';

export type BusinessArchetypeId =
  | 'underground_bar'
  | 'pawn_shop'
  | 'underground_casino'
  | 'street_food_stall'
  | 'clinic_pharmacy'
  | 'luxury_boutique'
  | 'police_checkpoint'
  | 'security_hq'
  | 'coffin_home_units'
  | 'tenement_complex';

export interface BusinessDefinition {
  id: string;
  category: BusinessCategory;
  name: string;
  baseRent: number;
  buildCost?: number;
  synergyTags: string[];
  description?: string;
}

export interface BusinessSynergyResult {
  multiplier: number;
  isSuppressed: boolean;
  disabled?: boolean;
  modifierSummary: string[];
  positiveBonuses?: { neighborNodeId: string; tag: string; bonus: number }[];
  negativePenalties?: { neighborNodeId: string; tag: string; penalty: number }[];
}

export interface CurrentBusiness {
  id: string;
  businessId: string;
  name: string;
  category: BusinessCategory;
  tier: number; // 1 to 5
  baseRentMultiplier?: number;
  synergyTags: string[];
  ownerPlayerId?: string;
}

export interface BusinessRentOptions {
  floorPlayers?: number;
  chaosPhase?: 'PEACEFUL' | 'INSTABILITY' | 'CHAOS';
  upgradeTier?: number;
}
