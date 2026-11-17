import type { SpatialBoardGraph } from '../graph/spatialGraphTypes';
import type { FogOfWarState } from '../graph/urbanFogOfWarEngine';
import type { ChaosMeterState } from '../chaos-engine/chaosMeter';
import type { PlacedTrap, TrapType } from '../chaos-engine/trapEngine';

export type PlayerId = string;
export type TileId = number;

export type DistrictColor =
  | 'district-brown'      // Nâu (Đồng Bằng) - Cần Thơ
  | 'district-lightblue'  // Lam Nhạt (Biển Đông) - Vũng Tàu, Nha Trang
  | 'district-pink'       // Tím Hồng (Cố Đô) - Huế, Hội An
  | 'district-orange'     // Cam (Công Nghiệp) - Hải Phòng, Tuần Châu
  | 'district-red'        // Đỏ (Kỳ Quan Biển) - Đà Nẵng
  | 'district-yellow'     // Vàng (Đảo Ngọc) - Phú Quốc
  | 'district-green'      // Lục (Thủ Đô) - Hà Nội
  | 'district-darkblue'   // Lam Thẫm (Kinh Tế Vàng) - TP.HCM
  | 'district-transport'  // Trục Vận Tải Quốc Gia (4 Ga/Cảng/Sân Bay)
  | 'district-utility'    // Hạ Tầng Tiện Ích Đô Thị (EVN, SAWACO)
  | 'district-cyber'      // Legacy support
  | 'district-finance'    // Legacy support
  | 'district-neon'       // Legacy support
  | 'district-energy'     // Legacy support
  | 'district-food'       // Legacy support
  | 'district-port'       // Legacy support
  | 'district-space'      // Legacy support
  | 'district-tech'       // Legacy support
  | 'special';            // Non-color properties / corners

export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'TRANSPORT'
  | 'UTILITY'
  | 'CHAOS'
  | 'CHEST'
  | 'CHANCE'
  | 'DETENTION'
  | 'TAX'
  | 'REST_ZONE'
  | 'GO_TO_JAIL'
  | 'WARP'
  | 'CASINO';

export interface PropertyData {
  basePrice: number;
  baseRent: number;
  houseRent: number[]; // Rent at upgrade level 1, 2, 3, 4, 5 (Landmark)
  upgradeCost: number;
  maxLevel: number;    // 5 for properties, 0 for Transport/Utility
  district: string;
  districtColor: DistrictColor;
  mortgageValue?: number; // 50% basePrice
}

export interface BoardTile {
  id: TileId;
  name: string;
  shortName: string;
  type: TileType;
  description: string;
  property?: PropertyData;
  iconName: string;
  taxAmount?: number;
  gridPosition?: { col: number; row: number }; // 11x11 perimeter grid layout
}

export interface PlayerToken {
  id: string;
  name: string;
  symbol?: string;
  colorHex?: string;
  accentHex?: string;
  avatarIcon?: string;
  icon?: string;
  description?: string;
}

export type AIPersonalityId =
  | 'TYCOON'
  | 'STRATEGIST'
  | 'SHARK'
  | 'SURVIVOR'
  | 'CHAOTIC'
  | 'DIPLOMAT';

export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface AIDecisionReason {
  playerId: PlayerId;
  playerName: string;
  personality: AIPersonalityId;
  difficulty: AIDifficulty;
  actionType: string;
  summaryVi: string;
  score?: number;
  timestamp: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  token: PlayerToken;
  cash: number;
  position: TileId;
  positionNodeId?: string;
  inDetention: boolean;
  detentionTurns: number;
  jailFreeCards?: number;
  isBankrupt: boolean;
  turnLockTurns?: number; // Lockdown trap stun: when > 0, player skips roll and turn advances
  isAI?: boolean;
  aiPersonality?: AIPersonalityId;
  aiDifficulty?: AIDifficulty;
  consecutiveDoubles: number;
  stats: {
    rentPaid: number;
    rentCollected: number;
    chaosTriggered: number;
    tilesTraveled: number;
    propertiesOwned: number;
  };
}

export interface PropertyOwnership {
  ownerId: PlayerId | null;
  level: number; // 0 = unowned/unbuilt, 1 = 1★, 2 = 2★, 3 = 3★, 4 = 4★, 5 = Landmark 5★
  businessTypeId?: string; // M2 multi-tier business archetype ID
  isMortgaged?: boolean;
  /** Round in which this property was last upgraded (a property can be upgraded once per round). */
  lastUpgradeRound?: number;
}

export type ChaosCategory =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'PERSONAL'
  | 'GLOBAL'
  | 'ECONOMIC'
  | 'LEGENDARY'
  | 'SOCIAL'
  | 'ENVIRONMENT'
  | 'TECH'
  | 'JURIDICAL';

export type ChaosRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'CALAMITY' | 'LEGENDARY';

export type ChaosTriggerType =
  | 'TILE_LANDED'
  | 'DOUBLE_DICE'
  | 'ROUND_INTERVAL'
  | 'CRISIS_DESPERATION'
  | 'MANUAL';

export interface ChaosEventPayload {
  id: string;
  nameVi: string;
  descriptionVi: string;
  category: ChaosCategory;
  rarity: ChaosRarity;
  durationInTurns: number; // 0 = instantaneous
  effectType: string;
  magnitude: number;
  targetPlayerId?: string;
}

export type ChaosEffectType =
  | 'CASH_ALL'           // All players gain/lose cash
  | 'CASH_SELF'          // Current player gains/loses cash
  | 'CASH_STEAL'         // Steal cash from opponents
  | 'TELEPORT'           // Warp to a specific tile
  | 'TELEPORT_ALL'       // Warp all players to tile
  | 'RENT_MULTIPLIER'    // Next rent is multiplied or waived
  | 'PROPERTY_UPGRADE'   // Free upgrade on random property
  | 'FREE_UPGRADE'       // Free upgrade alias
  | 'DOWNGRADE_PROPERTY' // Downgrade properties (earthquake)
  | 'PROPERTY_TAX'       // Tax per building/property
  | 'DETENTION_RELEASE'  // Free get out of detention card
  | 'DETENTION_IMMUNITY' // Immunity to detention
  | 'GO_TO_DETENTION'    // Direct to detention
  | 'CASINO_GAMBLE'      // 50/50 gamble
  | 'DESPERATION_GAMBLE' // 50/50 desperation gamble
  | 'REVERSE_DIRECTION'  // Reverse movement direction
  | 'SWAP_POSITIONS'     // Musical chairs swap positions
  | 'REDISTRIBUTE_WEALTH'// Wealth redistribution
  | 'EARTHQUAKE'         // Demolish 1 level across board
  | 'DEBT_JUBILEE'       // Clear all mortgages
  | 'HOSTILE_TAKEOVER'   // Acquire opponent unbuilt property
  | 'FREEZE_MARKET'      // Freeze buying/upgrading
  | 'GOLDEN_HOUR'        // Double salary on GO
  | 'TRANSPORT_BOOM'     // Double transport rent
  | 'UTILITY_BOOM'       // Double utility rent
  | 'DISTRICT_BOOM'      // 1.5x rent for Hanoi and HCMC
  | 'INTEREST_HIKE'      // Higher unmortgage interest
  | 'SUBSIDIZED_MORTGAGE'// 75% mortgage value
  | 'CURFEW'             // Step count cap
  | 'ALIEN_MOTHERSHIP'   // Landmark 81 turns to chaos portal
  | 'VISION_SHIFT';      // Visual-only weather change, no state change beyond the log

export interface ChaosCard {
  id: string;
  title: string;
  nameVi?: string;
  tagline: string;
  taglineVi?: string;
  flavorText: string;
  descriptionVi?: string;
  /** English copy (required for cards added in roadmap C). */
  nameEn?: string;
  taglineEn?: string;
  flavorTextEn?: string;
  descriptionEn?: string;
  /** True when the card hurts the player it targets; used for the deck-wide damage audit. */
  harmful?: boolean;
  category?: ChaosCategory;
  rarity: ChaosRarity;
  effectType: ChaosEffectType | string;
  value: number;
  magnitude?: number;
  durationInTurns?: number;
  targetTileId?: TileId;
  iconName: string;
  triggerType?: ChaosTriggerType;
  /** Phase 05: set when the card originates from a World map event. */
  worldId?: string;
  worldEventId?: string;
}

export type TurnPhase =
  | 'WAITING_FOR_ROLL'
  | 'ROLLING'
  | 'MOVING'
  | 'BRANCH_DECISION'
  | 'RESOLVING_TILE'
  | 'ACTION_MENU'
  | 'AUCTION'
  | 'CHAOS_EVENT'
  | 'DEBT_LIQUIDATION'
  | 'BANKRUPTCY_CHECK'
  | 'GAME_OVER';

export interface MovementState {
  remainingSteps: number;
  diceSum: number;
  currentNodeId: string;
  availableNextNodes: string[];
}

export interface AuctionState {
  propertyId: TileId;
  openingBid: number;
  highestBid: number;
  highestBidderId: PlayerId | null;
  currentTurnBidderId: PlayerId;
  activeBidderIds: PlayerId[];
  passedBidderIds: PlayerId[];
  status: 'ACTIVE' | 'RESOLVED' | 'NO_BIDS';
}

export interface TradeProposal {
  id: string;
  senderPlayerId: PlayerId;
  targetPlayerId: PlayerId;
  offeredCash: number;
  offeredPropertyIds: TileId[];
  offeredJailCards: number;
  requestedCash: number;
  requestedPropertyIds: TileId[];
  requestedJailCards: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: number;
  /** The target used their single cash adjustment; the original sender now answers. */
  countered?: boolean;
}

export type TransactionCategory =
  | 'SALARY_START'         // Passing or landing on START / GO tile (+200k or Golden Hour +400k)
  | 'RENT_PAYMENT'         // Rent transferred between players for landing on improved/unimproved property
  | 'PROPERTY_PURCHASE'    // List price paid to Bank to acquire unowned property
  | 'PROPERTY_UPGRADE'     // Construction cost paid to Bank (1★ to 5★ Landmark)
  | 'PROPERTY_DOWNGRADE'   // Demolition refund (75%+ market-indexed) credited from Bank
  | 'PROPERTY_SALE'        // Selling vacant land back to Bank (75%+ market-indexed) credited from Bank
  | 'PROPERTY_MORTGAGE'    // Mortgage loan (60% market-indexed or 75% subsidized) credited from Bank
  | 'PROPERTY_UNMORTGAGE'  // Repayment of mortgage (+10% or +20% interest) paid to Bank
  | 'TAX_PAYMENT'          // Income/Luxury tax paid to Bank
  | 'BAIL_PAYMENT'         // Detention bail fee ($50k) paid to Bank
  | 'AUCTION_WIN'          // Highest bid paid to Bank to acquire auctioned deed
  | 'TRADE_CASH'           // Cash transferred between players in bilateral trade
  | 'CHAOS_EFFECT'         // Cash injection or deduction triggered by Chaos card
  | 'DEBT_SETTLEMENT';     // Full or partial liquidation payment to creditor or Bank

export type LedgerParty = PlayerId | 'BANK';

export interface LedgerEntry {
  id: string;               // Format: `tx-${timestamp}-${sequence}`
  sequence: number;         // Monotonically increasing sequence number
  timestamp: number;        // UTC epoch millis
  roundNumber: number;      // Current round in GameState
  category: TransactionCategory;
  fromPlayerId: LedgerParty;
  toPlayerId: LedgerParty;
  amount: number;           // Absolute cash transferred (> 0)
  tileId?: TileId;          // Associated board tile (for rent, property purchase, tax)
  balanceBefore: {
    from?: number;          // Undefined if 'BANK'
    to?: number;            // Undefined if 'BANK'
  };
  balanceAfter: {
    from?: number;          // Undefined if 'BANK'
    to?: number;            // Undefined if 'BANK'
  };
  memo: string;             // Descriptive audit log
}

export interface LedgerResult {
  success: boolean;
  entry: LedgerEntry | null;
  error?: string;
  newPlayers: PlayerState[];
  actualPaid: number;
  shortfall: number;
}

export interface PendingDebt {
  creditorPlayerId: PlayerId | null; // null = bank/tax/chaos
  amount: number;
  reason: string;
  category?: TransactionCategory;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  playerId?: PlayerId;
  playerName?: string;
  message: string;
  type: 'INFO' | 'DICE' | 'PURCHASE' | 'RENT' | 'CHAOS' | 'BANKRUPT' | 'WARNING' | 'VICTORY';
}

export type GameMode = 'CLASSIC' | 'CHAOS';

export interface GameConfig {
  startingCash: number;
  salaryOnStart: number;
  maxRounds: number; // 0 = no round cap (match ends on bankruptcy)
  detentionBailCost: number; // Default 50
  fastMode: boolean;
  seed?: number;
  /** Phase 05: selected World id (presentation + world map events only; never changes core rules). */
  worldId?: string;
  worldVersion?: number;
  /** M3: Optional 3D Spatial Map ID (e.g. 'hong-kong-kowloon', 'new-york-wall-street', etc.) */
  mapId?: string;
  gameMode?: GameMode;
}

export interface ChaosModifiers {
  reverseDirectionTurns: number;
  marketFrozenTurns: number;
  goldenHourTurns: number;
  curfewTurns: number;
  transportBoomTurns: number;
  utilityBoomTurns: number;
  districtBoomTurns: number;
  alienMothershipTurns: number;
  interestHikeTurns: number;
  subsidizedMortgageTurns: number;
}

export interface ChaosEventHistoryEntry {
  id: string;
  cardId: string;
  title: string;
  category: ChaosCategory;
  rarity: ChaosRarity;
  effectType: string;
  roundNumber: number;
  triggeredByPlayerId: PlayerId;
  triggeredByPlayerName: string;
  triggerType: ChaosTriggerType;
  chainedFromCardId?: string;
  summaryVi: string;
  timestamp: number;
}

export interface GameState {
  config: GameConfig;
  status: 'SETUP' | 'PLAYING' | 'ENDED';
  players: PlayerState[];
  activePlayerIndex: number;
  turnPhase: TurnPhase;
  roundNumber: number;
  dice: [number, number];
  isDouble: boolean;
  properties: Record<TileId, PropertyOwnership>;
  activeChaosCard: ChaosCard | null;
  pendingDebt?: PendingDebt | null;
  logs: GameLogEntry[];
  winner: PlayerState | null;
  selectedTileForDetail: TileId | null;
  rentModifier: number; // Global or next-turn multiplier
  chaosModifiers?: ChaosModifiers;
  chaosHistory?: ChaosEventHistoryEntry[];
  ledger?: LedgerEntry[];
  ledgerHistory?: LedgerEntry[];
  processedActionIds?: string[];
  lastSoundEffect?: string | null;
  activeAuction?: AuctionState | null;
  activeTrade?: TradeProposal | null;
  lastAIDecision?: AIDecisionReason | null;
  /** World-native pressure state (roadmap B). Only worlds with a mechanic use it. */
  worldState?: WorldState | null;
  /** M1 3D Spatial Graph Engine & Urban Fog of War */
  spatialGraph?: SpatialBoardGraph;
  fogOfWarState?: FogOfWarState;
  movementState?: MovementState | null;
  /** M2 Escalating Chaos Engine & Sabotage Traps */
  chaosMeter?: ChaosMeterState;
  placedTraps?: PlacedTrap[];
}

export type SeasonPhase = 'DRY' | 'WET';

export interface WorldState {
  /** Quảng Trị: 'DRY' | 'WET'. */
  seasonPhase?: SeasonPhase;
  /** Tây Bắc: true on market days (every 5th round). */
  marketOpen?: boolean;
  /** Tiles the current mechanic closes for one round (e.g. landslide). */
  blockedTiles?: TileId[];
}

export interface BaseActionEnvelope {
  actionId?: string;
  senderPlayerId?: string;
  timestamp?: number;
}

export type GameActionPayload =
  | {
      type: 'START_GAME';
      players: {
        name: string;
        token?: PlayerToken;
        isAI?: boolean;
        aiPersonality?: AIPersonalityId;
        aiDifficulty?: AIDifficulty;
      }[];
      config?: Partial<GameConfig>;
    }
  | { type: 'ROLL_DICE_START' }
  | { type: 'ROLL_DICE_RESULT'; dice: [number, number] }
  | { type: 'CHOOSE_BRANCH_PATH'; targetNodeId: string }
  | { type: 'UNLOCK_ZONE'; zoneId: string; reason?: string }
  | { type: 'STEP_MOVE_COMPLETE' }
  | { type: 'BUY_PROPERTY'; tileId: TileId }
  | { type: 'UPGRADE_PROPERTY'; tileId: TileId }
  | { type: 'DOWNGRADE_PROPERTY'; tileId: TileId }
  | { type: 'SELL_PROPERTY'; tileId: TileId }
  | { type: 'MORTGAGE_PROPERTY'; tileId: TileId }
  | { type: 'UNMORTGAGE_PROPERTY'; tileId: TileId }
  | { type: 'PAY_RENT'; tileId: TileId }
  | { type: 'PAY_DETENTION_BAIL' }
  | { type: 'USE_DETENTION_CARD' }
  | { type: 'RESOLVE_CHAOS' }
  | { type: 'APPLY_CHAOS_EFFECT'; payload: ChaosEventPayload | ChaosCard }
  | { type: 'RESOLVE_DEBT' }
  | { type: 'SETTLE_PARTIAL_DEBT'; amount?: number }
  | { type: 'START_AUCTION'; tileId?: TileId }
  | { type: 'DECLINE_PROPERTY_PURCHASE'; tileId?: TileId }
  | { type: 'PLACE_AUCTION_BID'; playerId: PlayerId; bidAmount: number }
  | { type: 'PASS_AUCTION_BID'; playerId: PlayerId }
  | { type: 'PROPOSE_TRADE'; proposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'> }
  | { type: 'ACCEPT_TRADE'; tradeId?: string }
  | { type: 'REJECT_TRADE'; tradeId?: string }
  | { type: 'CANCEL_TRADE'; tradeId?: string }
  | { type: 'COUNTER_TRADE'; proposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'> }
  | { type: 'RECORD_AI_DECISION'; decision: AIDecisionReason }
  | { type: 'LOAD_SAVED_MATCH'; savedState: GameState }
  | { type: 'END_TURN' }
  | { type: 'DECLARE_BANKRUPTCY'; playerId: PlayerId }
  | { type: 'SELECT_TILE_DETAIL'; tileId: TileId | null }
  | { type: 'RESTART_GAME' }
  | { type: 'PLACE_TRAP'; nodeId: string; trapType: TrapType }
  | { type: 'TRIGGER_TRAP'; nodeId: string; victimPlayerId: PlayerId; trapId?: string }
  | { type: 'SELECT_BUSINESS_TYPE'; tileId?: TileId; nodeId?: string; businessId: string; playerId?: PlayerId }
  | { type: 'APPLY_CHAOS_DELTA'; delta: number };

export type GameAction = GameActionPayload & BaseActionEnvelope;

export type { ChaosMeterState } from '../chaos-engine/chaosMeter';
export type { PlacedTrap, TrapType } from '../chaos-engine/trapEngine';
