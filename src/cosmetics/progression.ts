import { LocalizedText } from '../worlds/types';

const L = (vi: string, en: string) => ({ vi, en });

export interface AchievementDef {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  iconName: string;
  colorHex: string;
  category: 'MATCH' | 'PROPERTY' | 'ECONOMY' | 'CHAOS';
  xpReward: number;
  coinReward: number;
}

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  {
    id: 'ach-first-win',
    name: L('Chiến Thắng Đầu Tiên', 'First Blood Tycoon'),
    description: L(
      'Giành chiến thắng trong trận đấu đầu tiên với người chơi hoặc AI.',
      'Win your very first match against human opponents or strategic AI.'
    ),
    iconName: 'Trophy',
    colorHex: '#eab308',
    category: 'MATCH',
    xpReward: 300,
    coinReward: 200,
  },
  {
    id: 'ach-property-tycoon',
    name: L('Đại Gia Địa Ốc', 'Property Baron'),
    description: L(
      'Sở hữu ít nhất 5 bất động sản trong một trận đấu.',
      'Acquire and hold at least 5 properties in a single match.'
    ),
    iconName: 'Building',
    colorHex: '#06b6d4',
    category: 'PROPERTY',
    xpReward: 200,
    coinReward: 150,
  },
  {
    id: 'ach-monopoly-master',
    name: L('Độc Quyền Tuyệt Đối', 'Monopoly Master'),
    description: L(
      'Hoàn thành thu mua toàn bộ bất động sản trong một quận màu.',
      'Monopolize all properties within any district color group.'
    ),
    iconName: 'Crown',
    colorHex: '#a855f7',
    category: 'PROPERTY',
    xpReward: 350,
    coinReward: 250,
  },
  {
    id: 'ach-apex-architect',
    name: L('Kỳ Quan Đô Thị', 'Apex Architect'),
    description: L(
      'Nâng cấp thành công một công trình lên Siêu Landmark Cấp 5.',
      'Construct a prestigious Level 5 Apex Landmark.'
    ),
    iconName: 'Sparkles',
    colorHex: '#3b82f6',
    category: 'PROPERTY',
    xpReward: 400,
    coinReward: 300,
  },
  {
    id: 'ach-auction-sniper',
    name: L('Thợ Săn Đấu Giá', 'Auction Sniper'),
    description: L(
      'Chiến thắng 3 cuộc đấu giá bất động sản công khai.',
      'Emerge victorious in 3 public property auctions.'
    ),
    iconName: 'Gavel',
    colorHex: '#f97316',
    category: 'ECONOMY',
    xpReward: 250,
    coinReward: 200,
  },
  {
    id: 'ach-trade-diplomat',
    name: L('Bậc Thầy Đàm Phán', 'Trade Diplomat'),
    description: L(
      'Hoàn tất thành công 3 thương vụ trao đổi bất động sản hai chiều.',
      'Successfully negotiate and execute 3 bilateral trades.'
    ),
    iconName: 'Handshake',
    colorHex: '#10b981',
    category: 'ECONOMY',
    xpReward: 250,
    coinReward: 200,
  },
  {
    id: 'ach-chaos-survivor',
    name: L('Sống Sót Hỗn Loạn', 'Chaos Survivor'),
    description: L(
      'Vượt qua 5 biến cố Chaos trong các trận đấu mà không bị phá sản.',
      'Survive 5 Chaos events across matches without falling into bankruptcy.'
    ),
    iconName: 'Zap',
    colorHex: '#ec4899',
    category: 'CHAOS',
    xpReward: 300,
    coinReward: 200,
  },
  {
    id: 'ach-wealth-titan',
    name: L('Tài Phiệt Tỷ Phú', 'Billionaire Titan'),
    description: L(
      'Đạt tổng tài sản $4000M trong một ván đấu.',
      'Accumulate a peak net worth of $4000M in a single match.'
    ),
    iconName: 'Coins',
    colorHex: '#f59e0b',
    category: 'ECONOMY',
    xpReward: 500,
    coinReward: 400,
  },
  {
    id: 'ach-veteran-roller',
    name: L('Tay Chơi Lão Luyện', 'Veteran Roller'),
    description: L(
      'Hoàn thành 10 ván đấu bất kỳ.',
      'Complete 10 full matches in either local, AI, or online modes.'
    ),
    iconName: 'Dices',
    colorHex: '#64748b',
    category: 'MATCH',
    xpReward: 450,
    coinReward: 350,
  },
];

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS_CATALOG.find(a => a.id === id);
}
