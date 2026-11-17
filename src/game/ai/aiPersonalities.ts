import { AIDifficulty, AIPersonalityId, DistrictColor } from '../types';

export interface AIPersonalityProfile {
  id: AIPersonalityId;
  nameVi: string;
  titleVi: string;
  taglineVi: string;
  descriptionVi: string;
  badgeColor: string;
  iconName: string;
  /** Minimum cash reserve ratio relative to starting cash ($1500M) */
  minReserveRatio: number;
  /** Maximum willingness to pay as a multiple of property basePrice in auctions */
  auctionMaxMultiple: number;
  /** Bonus multiplier when bidding on a property that completes or blocks a monopoly */
  monopolyBlockWeight: number;
  /** Minimum expected ROI threshold to trigger property purchase */
  acquisitionThreshold: number;
  /** Aggressiveness in upgrading properties (lower = upgrades with smaller cash buffer) */
  upgradeBufferMultiplier: number;
  /** Minimum surplus utility required to accept or propose a trade */
  tradeFairnessTolerance: number;
  /** Willingness to exploit distressed opponents in trades/auctions */
  predatoryFactor: number;
  /** Sensitivity to Chaos economic modifiers */
  chaosAdaptability: number;
  /** Preferred district color groups */
  preferredDistricts: DistrictColor[];
}

export const AI_PERSONALITIES: Record<AIPersonalityId, AIPersonalityProfile> = {
  TYCOON: {
    id: 'TYCOON',
    nameVi: 'Tài Phiệt Bất Động Sản',
    titleVi: 'THE TYCOON',
    taglineVi: 'Thâu tóm đất vàng & xây đại công trình',
    descriptionVi:
      'Ưu tiên mua tối đa bất động sản, đặc biệt là các phân khu cao cấp (Hà Nội, TP.HCM, Đà Nẵng) và đầu tư nâng cấp Landmark 5★ ngay khi đủ vốn.',
    badgeColor: '#f59e0b', // Amber
    iconName: 'Building2',
    minReserveRatio: 0.12,        // Keeps ~$180M minimum buffer; spends aggressively on land
    auctionMaxMultiple: 1.35,     // Willing to bid up to 135% base price
    monopolyBlockWeight: 1.45,
    acquisitionThreshold: 0.35,   // Buys almost any affordable property
    upgradeBufferMultiplier: 1.15,// Upgrades as soon as cash >= 1.15x upgradeCost + reserve
    tradeFairnessTolerance: -0.05,// Will pay a slight premium to complete a monopoly
    predatoryFactor: 0.6,
    chaosAdaptability: 0.85,
    preferredDistricts: ['district-darkblue', 'district-green', 'district-yellow', 'district-red'],
  },
  STRATEGIST: {
    id: 'STRATEGIST',
    nameVi: 'Nhà Chiến Lược Định Lượng',
    titleVi: 'THE STRATEGIST',
    taglineVi: 'Tối ưu tỷ suất sinh lời & kiểm soát rủi ro',
    descriptionVi:
      'Tính toán kỳ vọng dòng tiền (Expected Value), chi phí cơ hội và xác suất đối thủ dẫm vào ô. Chỉ đầu tư khi tỷ lệ lợi nhuận/rủi ro vượt ngưỡng tối ưu.',
    badgeColor: '#06b6d4', // Cyan
    iconName: 'BrainCircuit',
    minReserveRatio: 0.25,        // Keeps ~$375M disciplined reserve
    auctionMaxMultiple: 1.1,      // Rarely overpays above intrinsic value
    monopolyBlockWeight: 1.6,     // Strongly values blocking/completing high-ROI sets
    acquisitionThreshold: 0.58,   // Selective acquisition
    upgradeBufferMultiplier: 1.6, // Requires solid reserve before building
    tradeFairnessTolerance: 0.05, // Requires positive expected value on trades
    predatoryFactor: 0.5,
    chaosAdaptability: 0.95,
    preferredDistricts: ['district-orange', 'district-red', 'district-lightblue', 'district-transport'],
  },
  SHARK: {
    id: 'SHARK',
    nameVi: 'Cá Mập Thâu Tóm',
    titleVi: 'THE SHARK',
    taglineVi: 'Ép giá đấu giá & tận dụng khủng hoảng đối thủ',
    descriptionVi:
      'Đấu giá quyết liệt để chặn độc quyền của đối thủ, ép giá khi đối thủ cạn tiền mặt và chỉ chấp nhận các thương vụ mang lại lợi thế áp đảo.',
    badgeColor: '#ef4444', // Red
    iconName: 'Flame',
    minReserveRatio: 0.18,
    auctionMaxMultiple: 1.45,     // Aggressive bidder, drives up prices
    monopolyBlockWeight: 1.85,    // Ruthlessly blocks opponents' monopolies
    acquisitionThreshold: 0.45,
    upgradeBufferMultiplier: 1.3,
    tradeFairnessTolerance: 0.18, // Demands a 18%+ surplus advantage in trades
    predatoryFactor: 1.0,         // Maximum exploitation of distressed players
    chaosAdaptability: 0.8,
    preferredDistricts: ['district-darkblue', 'district-red', 'district-orange', 'district-transport'],
  },
  SURVIVOR: {
    id: 'SURVIVOR',
    nameVi: 'Bậc Thầy Phòng Thủ Thanh Khoản',
    titleVi: 'THE SURVIVOR',
    taglineVi: 'Ưu tiên tiền mặt & miễn nhiễm phá sản',
    descriptionVi:
      'Luôn duy trì quỹ dự phòng tiền mặt lớn, chủ động thế chấp hoặc thu hẹp rủi ro khi thị trường biến động, chờ đối thủ tự sụp đổ vì cạn thanh khoản.',
    badgeColor: '#10b981', // Emerald
    iconName: 'ShieldCheck',
    minReserveRatio: 0.34,        // High liquidity cushion (~$510M)
    auctionMaxMultiple: 0.95,     // Buys value bargains in auctions
    monopolyBlockWeight: 1.3,
    acquisitionThreshold: 0.62,   // Selective low-risk property purchases
    upgradeBufferMultiplier: 1.85,// Upgrades when safe liquidity cushion is met
    tradeFairnessTolerance: 0.05,
    predatoryFactor: 0.3,
    chaosAdaptability: 1.0,      // Immediately adapts to tax/crash modifiers
    preferredDistricts: ['district-brown', 'district-lightblue', 'district-pink', 'district-utility'],
  },
  CHAOTIC: {
    id: 'CHAOTIC',
    nameVi: 'Kẻ Thao Túng Hỗn Loạn',
    titleVi: 'THE CHAOTIC',
    taglineVi: 'Đặt cược rủi ro cao & bùng nổ theo sóng Chaos',
    descriptionVi:
      'Phản ứng cực mạnh với các hiệu ứng Chaos (Sốt đất, Đường sắt, Giờ vàng), sẵn sàng tất tay vào các cơ hội đột biến để lật ngược thế cờ.',
    badgeColor: '#d946ef', // Fuchsia
    iconName: 'Zap',
    minReserveRatio: 0.08,        // Comfortable operating on razor-thin cash
    auctionMaxMultiple: 1.5,      // Wildly aggressive when Chaos boosts a sector
    monopolyBlockWeight: 1.5,
    acquisitionThreshold: 0.3,
    upgradeBufferMultiplier: 1.05,
    tradeFairnessTolerance: -0.1, // Willing to make bold, volatile swaps
    predatoryFactor: 0.75,
    chaosAdaptability: 1.35,      // Hyper-amplifies Chaos economic modifiers
    preferredDistricts: ['district-transport', 'district-utility', 'district-yellow', 'district-darkblue'],
  },
  DIPLOMAT: {
    id: 'DIPLOMAT',
    nameVi: 'Nhà Ngoại Giao Liên Minh',
    titleVi: 'THE DIPLOMAT',
    taglineVi: 'Hợp tác đôi bên cùng có lợi & kiềm chế kẻ dẫn đầu',
    descriptionVi:
      'Tích cực đề xuất các thương vụ trao đổi đôi bên cùng có lợi (Win-Win) với người chơi yếu thế hơn để cùng phát triển và kiềm chế người đang dẫn đầu.',
    badgeColor: '#6366f1', // Indigo
    iconName: 'Handshake',
    minReserveRatio: 0.2,
    auctionMaxMultiple: 1.05,
    monopolyBlockWeight: 1.35,
    acquisitionThreshold: 0.5,
    upgradeBufferMultiplier: 1.4,
    tradeFairnessTolerance: -0.02,// Accepts mutually beneficial fair trades readily
    predatoryFactor: 0.15,        // Avoids hostility against weaker players; targets leader
    chaosAdaptability: 0.9,
    preferredDistricts: ['district-pink', 'district-orange', 'district-green', 'district-transport'],
  },
};

export const AI_PERSONALITY_LIST: AIPersonalityProfile[] = Object.values(AI_PERSONALITIES);

export interface AIDifficultyModifiers {
  id: AIDifficulty;
  nameVi: string;
  descriptionVi: string;
  /** Depth of opponent threat and board lookahead (0 = none, 1 = immediate, 2 = full board + opponent modeling) */
  lookaheadDepth: number;
  /** Accuracy of valuation (Easy introduces noise/myopia; Hard uses exact EV + denial value) */
  valuationPrecision: number;
  /** Whether AI actively models opponent monopoly completion and net-worth leadership */
  enableOpponentModeling: boolean;
  /** Whether AI generates strategic counteroffers and multi-asset packages */
  enableSmartNegotiation: boolean;
}

export const AI_DIFFICULTIES: Record<AIDifficulty, AIDifficultyModifiers> = {
  EASY: {
    id: 'EASY',
    nameVi: 'Dễ (Tập sự)',
    descriptionVi: 'Đánh giá cơ bản theo giá niêm yết, ít phòng thủ trước độc quyền của đối thủ.',
    lookaheadDepth: 0,
    valuationPrecision: 0.65,
    enableOpponentModeling: false,
    enableSmartNegotiation: false,
  },
  NORMAL: {
    id: 'NORMAL',
    nameVi: 'Trung bình (Tiêu chuẩn)',
    descriptionVi: 'Cân bằng giữa dòng tiền thuê kỳ vọng, quỹ dự phòng an toàn và cơ hội độc quyền.',
    lookaheadDepth: 1,
    valuationPrecision: 0.9,
    enableOpponentModeling: true,
    enableSmartNegotiation: false,
  },
  HARD: {
    id: 'HARD',
    nameVi: 'Khó (Đại Kiện Tướng)',
    descriptionVi: 'Phân tích xác suất bàn cờ, mô hình hóa đối thủ, chặn độc quyền và thương lượng đa tầng.',
    lookaheadDepth: 2,
    valuationPrecision: 1.0,
    enableOpponentModeling: true,
    enableSmartNegotiation: true,
  },
};

export function getAIPersonalityProfile(id?: AIPersonalityId): AIPersonalityProfile {
  return AI_PERSONALITIES[id || 'STRATEGIST'] || AI_PERSONALITIES.STRATEGIST;
}

export function getAIDifficultyConfig(difficulty?: AIDifficulty): AIDifficultyModifiers {
  return AI_DIFFICULTIES[difficulty || 'NORMAL'] || AI_DIFFICULTIES.NORMAL;
}
