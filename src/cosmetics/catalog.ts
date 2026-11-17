import {
  CosmeticCategory,
  CosmeticItem,
  DEFAULT_PLAYER_COSMETICS,
  PlayerCosmetics,
} from './types';

const L = (vi: string, en: string) => ({ vi, en });

export const COSMETICS_CATALOG: CosmeticItem[] = [
  // ==========================================
  // 1. CHARACTERS (Nhân Vật)
  // ==========================================
  {
    id: 'char-tycoon',
    category: 'CHARACTER',
    name: L('Tài Phiệt Alpha', 'Alpha Tycoon'),
    description: L(
      'Nhà đầu tư bất động sản bản lĩnh, khởi nghiệp từ những con phố sầm uất.',
      'A formidable real estate investor who built an empire from bustling city avenues.'
    ),
    rarity: 'COMMON',
    iconName: 'User',
    previewColor: '#06b6d4',
    worldTheme: 'modern-metropolis',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'char-cyberpunk',
    category: 'CHARACTER',
    name: L('Hacker Neon', 'Neon Netrunner'),
    description: L(
      'Chuyên gia giải mã dữ liệu của Neo-Saigon 2099 với cánh tay cơ khí phát quang.',
      'A data decryptor from Neo-Saigon 2099 with luminescent cybernetic augmentations.'
    ),
    rarity: 'RARE',
    iconName: 'Cpu',
    previewColor: '#ec4899',
    worldTheme: 'cyberpunk-city',
    unlockCondition: L('Đạt Cấp 5 hoặc mua tại Cửa Hàng', 'Reach Level 5 or buy in Shop'),
    price: 500,
  },
  {
    id: 'char-mekong',
    category: 'CHARACTER',
    name: L('Nông Gia Sông Nước', 'Mekong Planter'),
    description: L(
      'Chủ miệt vườn hào sảng, nắm giữ những vựa cây trái trĩu quả bờ sông Tiền.',
      'A genial orchard master commanding bountiful fruit groves along the Mekong banks.'
    ),
    rarity: 'UNCOMMON',
    iconName: 'Palmtree',
    previewColor: '#10b981',
    worldTheme: 'mekong-delta',
    unlockCondition: L('Đạt Cấp 3 hoặc mua tại Cửa Hàng', 'Reach Level 3 or buy in Shop'),
    price: 350,
  },
  {
    id: 'char-astronaut',
    category: 'CHARACTER',
    name: L('Phi Hành Gia Helios', 'Helios Astronaut'),
    description: L(
      'Chỉ huy trưởng trạm không gian quỹ đạo, quen thuộc với môi trường vi trọng lực.',
      'Orbital station commander, veteran of deep space microgravity operations.'
    ),
    rarity: 'EPIC',
    iconName: 'Rocket',
    previewColor: '#8b5cf6',
    worldTheme: 'space-colony',
    unlockCondition: L('Đạt Cấp 10 hoặc mua tại Cửa Hàng', 'Reach Level 10 or buy in Shop'),
    price: 800,
  },
  {
    id: 'char-monarch',
    category: 'CHARACTER',
    name: L('Đại Vương Triều', 'High Monarch'),
    description: L(
      'Người kế thừa vương quốc huyền thoại với chiếc vương miện đính ngọc hoàng gia.',
      'Heir to a legendary realm, bearing an imperial crown of royal jade and gold.'
    ),
    rarity: 'LEGENDARY',
    iconName: 'Crown',
    previewColor: '#f59e0b',
    worldTheme: 'fantasy-kingdom',
    unlockCondition: L('Đạt Cấp 20 hoặc mua tại Cửa Hàng', 'Reach Level 20 or buy in Shop'),
    price: 1500,
  },
  {
    id: 'char-merchant',
    category: 'CHARACTER',
    name: L('Thương Nhân Phố Cổ', 'Heritage Merchant'),
    description: L(
      'Thương nhân dày dạn kinh nghiệm buôn bán lụa là, gốm sứ và đất vàng ngàn năm.',
      'A seasoned trader versed in ancient silk routes, ceramics, and prime heritage plots.'
    ),
    rarity: 'UNCOMMON',
    iconName: 'Coins',
    previewColor: '#eab308',
    worldTheme: 'modern-metropolis',
    unlockCondition: L('Chiến thắng 3 trận đấu', 'Win 3 matches'),
    price: 400,
  },

  // ==========================================
  // 2. OUTFITS (Trang Phục)
  // ==========================================
  {
    id: 'outfit-classic-suit',
    category: 'OUTFIT',
    name: L('Vest Doanh Nhân Cổ Điển', 'Classic Executive Suit'),
    description: L(
      'Bộ âu phục may đo chỉn chu dành cho những cuộc đàm phán triệu đô.',
      'A sharp tailored two-piece suit crafted for million-dollar boardrooms.'
    ),
    rarity: 'COMMON',
    iconName: 'Shirt',
    previewColor: '#3b82f6',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'outfit-cyber-jacket',
    category: 'OUTFIT',
    name: L('Áo Khoác Da Hologram', 'Hologram Leather Jacket'),
    description: L(
      'Áo khoác da tích hợp dải đèn LED quang phổ chạy dọc cánh tay.',
      'Streetwise leather jacket woven with spectrum fiber-optic neon piping.'
    ),
    rarity: 'RARE',
    iconName: 'Sparkles',
    previewColor: '#ec4899',
    worldTheme: 'cyberpunk-city',
    unlockCondition: L('Hoàn thành 5 lượt chơi tại Cyberpunk City', 'Play 5 turns in Cyberpunk City'),
    price: 450,
  },
  {
    id: 'outfit-ao-ba-ba',
    category: 'OUTFIT',
    name: L('Áo Bà Ba Khăn Rằn', 'Heritage Mekong Silk'),
    description: L(
      'Trang phục truyền thống Nam Bộ thoáng mát kết hợp khăn rằn mộc mạc.',
      'Traditional Southern Vietnamese silk tunic accompanied by a checkered scarf.'
    ),
    rarity: 'UNCOMMON',
    iconName: 'Shirt',
    previewColor: '#10b981',
    worldTheme: 'mekong-delta',
    unlockCondition: L('Sở hữu độc quyền 1 quận tại Mekong Delta', 'Form a monopoly in Mekong Delta'),
    price: 300,
  },
  {
    id: 'outfit-spacesuit',
    category: 'OUTFIT',
    name: L('Bộ Giáp Không Trọng Lực', 'EVA Zero-G Exosuit'),
    description: L(
      'Bộ đồ bảo hộ vũ trụ cách nhiệt tích hợp màn hình áp suất HUD.',
      'Pressurized thermo-composite spacesuit with integrated tactile helmet HUD.'
    ),
    rarity: 'EPIC',
    iconName: 'Shield',
    previewColor: '#6366f1',
    worldTheme: 'space-colony',
    unlockCondition: L('Sống sót qua 3 cơn Bão Mặt Trời', 'Survive 3 Solar Flare events'),
    price: 750,
  },
  {
    id: 'outfit-royal-robe',
    category: 'OUTFIT',
    name: L('Hoàng Bào Thêu Rồng Vàng', 'Imperial Dragon Robe'),
    description: L(
      'Áo choàng nhung đỏ thêu chỉ vàng quý phái của các bậc quyền quý vương triều.',
      'Crimson velvet mantle embroidered with golden dragons fit for imperial nobility.'
    ),
    rarity: 'LEGENDARY',
    iconName: 'Crown',
    previewColor: '#f59e0b',
    unlockCondition: L('Đạt tổng tài sản $4000M trong một ván', 'Reach $4000M net worth in a match'),
    price: 1200,
  },

  // ==========================================
  // 3. PETS (Thú Cưng Đồng Hành)
  // ==========================================
  {
    id: 'pet-none',
    category: 'PET',
    name: L('Không Mang Pet', 'No Companion'),
    description: L('Không sử dụng thú cưng đồng hành.', 'No pet companion active.'),
    rarity: 'COMMON',
    iconName: 'MinusCircle',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'pet-shiba',
    category: 'PET',
    name: L('Chó Shiba Cyber', 'Cyber Shiba'),
    description: L(
      'Chú chó Shiba đeo kính AR thông minh, hay vẫy đuôi chúc mừng bạn mua đất.',
      'A cybernetic Shiba dog equipped with AR goggles, joyfully barking at your acquisitions.'
    ),
    rarity: 'RARE',
    iconName: 'Dog',
    previewColor: '#f59e0b',
    unlockCondition: L('Mua 10 bất động sản trong chế độ bất kỳ', 'Buy 10 properties in any mode'),
    price: 600,
  },
  {
    id: 'pet-otter',
    category: 'PET',
    name: L('Rái Cá Sông Hậu', 'Mekong River Otter'),
    description: L(
      'Chú rái cá tinh nghịch thích đùa giỡn với những đồng xu may mắn.',
      'A playful river otter that balances lucky gold coins on its nose.'
    ),
    rarity: 'UNCOMMON',
    iconName: 'Fish',
    previewColor: '#06b6d4',
    worldTheme: 'mekong-delta',
    unlockCondition: L('Đạt Cấp 4', 'Reach Level 4'),
    price: 400,
  },
  {
    id: 'pet-drone',
    category: 'PET',
    name: L('Drone Trinh Sát AI', 'AI Orbital Drone'),
    description: L(
      'Thiết bị bay trinh sát hình cầu mini bay lượn hộ tống xung quanh người chơi.',
      'A floating micro-drone emitting soft scanning pulses around its commander.'
    ),
    rarity: 'EPIC',
    iconName: 'Radio',
    previewColor: '#a855f7',
    worldTheme: 'space-colony',
    unlockCondition: L('Đạt Cấp 8', 'Reach Level 8'),
    price: 850,
  },
  {
    id: 'pet-phoenix',
    category: 'PET',
    name: L('Phượng Hoàng Lửa', 'Mystic Phoenix'),
    description: L(
      'Linh thú thần thoại rực sáng mỗi khi bạn thoát khỏi nguy cơ phá sản.',
      'A mythical flaming avian spirit that bursts into golden embers during critical saves.'
    ),
    rarity: 'LEGENDARY',
    iconName: 'Flame',
    previewColor: '#ef4444',
    unlockCondition: L('Thoát khỏi cảnh vỡ nợ thành công 2 lần', 'Successfully settle debt 2 times'),
    price: 1800,
  },

  // ==========================================
  // 4. DICE SKINS (Giao Diện Xúc Xắc)
  // ==========================================
  {
    id: 'dice-neon-cyan',
    category: 'DICE',
    name: L('Neon Cyan Chuẩn', 'Neon Cyan Standard'),
    description: L(
      'Cặp xúc xắc phát sáng neon xanh hiện đại với hiệu ứng phản xạ sắc nét.',
      'Precision dice carved with sleek luminous cyan edges and dark crystalline pips.'
    ),
    rarity: 'COMMON',
    iconName: 'Dices',
    previewColor: '#06b6d4',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'dice-cyber-gold',
    category: 'DICE',
    name: L('Hoàng Kim Thần Tài', 'Cyber Gold Jackpot'),
    description: L(
      'Xúc xắc mạ vàng 24K tỏa ánh hào quang tài lộc mỗi lần tung số đôi.',
      '24K gilded dice radiant with golden jackpot shimmer upon rolling doubles.'
    ),
    rarity: 'RARE',
    iconName: 'Dices',
    previewColor: '#eab308',
    unlockCondition: L('Tung được 3 lần đổ số đôi liên tiếp', 'Roll 3 doubles in matches'),
    price: 550,
  },
  {
    id: 'dice-obsidian-void',
    category: 'DICE',
    name: L('Đá Hắc Diệu Vô Cực', 'Obsidian Void Dice'),
    description: L(
      'Khối tinh thể bóng đêm hấp thụ ánh sáng với các chấm khắc tím ma mị.',
      'Light-absorbing black volcanic glass dice inlaid with violet glowing pips.'
    ),
    rarity: 'EPIC',
    iconName: 'Dices',
    previewColor: '#8b5cf6',
    unlockCondition: L('Đạt Cấp 12', 'Reach Level 12'),
    price: 900,
  },
  {
    id: 'dice-starlight',
    category: 'DICE',
    name: L('Tinh Vân Sao Băng', 'Nebula Starlight'),
    description: L(
      'Xúc xắc trong suốt chứa bụi thiên hà lấp lánh như bầu trời đêm vô tận.',
      'Transparent prismatic dice containing cosmic nebula dust that glitters in flight.'
    ),
    rarity: 'LEGENDARY',
    iconName: 'Sparkles',
    previewColor: '#38bdf8',
    worldTheme: 'space-colony',
    unlockCondition: L('Đạt Cấp 25 hoặc mua tại Cửa Hàng', 'Reach Level 25 or buy in Shop'),
    price: 1600,
  },
  {
    id: 'dice-flame-ruby',
    category: 'DICE',
    name: L('Hỏa Ngọc Hồng Bảo', 'Crimson Flame Ruby'),
    description: L(
      'Xúc xắc đúc từ hồng ngọc rực lửa mang năng lượng may mắn.',
      'Ruby-forged dice burning with inner fiery embers of high-stakes momentum.'
    ),
    rarity: 'UNCOMMON',
    iconName: 'Flame',
    previewColor: '#f43f5e',
    unlockCondition: L('Thắng 1 cuộc đấu giá bất động sản', 'Win a property auction'),
    price: 350,
  },

  // ==========================================
  // 5. TOKENS & VEHICLES (Quân Cờ & Phương Tiện)
  // ==========================================
  {
    id: 'token-vinfast',
    category: 'TOKEN',
    name: L('Xe Điện VinFast VF9', 'VinFast VF9 Electric SUV'),
    description: L(
      'Mẫu xe điện flagship hiện đại lướt êm ái trên các trục đại lộ đô thị.',
      'Modern flagship luxury electric SUV gliding gracefully across metropolis avenues.'
    ),
    rarity: 'COMMON',
    iconName: 'Car',
    previewColor: '#06b6d4',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'token-metro',
    category: 'TOKEN',
    name: L('Tàu Siêu Tốc Metro', 'High-Speed Metro Train'),
    description: L(
      'Đoàn tàu điện ngầm hiện đại kết nối các đại đô thị tài chính.',
      'Sleek aerodynamic metro express linking bustling commercial districts.'
    ),
    rarity: 'UNCOMMON',
    iconName: 'Train',
    previewColor: '#f59e0b',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'token-meo-than-tai',
    category: 'TOKEN',
    name: L('Mèo Thần Tài Cyber', 'Cyber Lucky Maneki'),
    description: L(
      'Biểu tượng chiêu tài nạp lộc được nâng cấp phong cách cơ khí cyberpunk.',
      'Traditional Japanese-Vietnamese lucky fortune cat enhanced with cybernetic brass.'
    ),
    rarity: 'UNCOMMON',
    iconName: 'Sparkles',
    previewColor: '#10b981',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'token-vinasat',
    category: 'TOKEN',
    name: L('Phi Thuyền Vinasat', 'Vinasat Star Cruiser'),
    description: L(
      'Tàu du hành không gian mang cờ hiệu Việt Nam vươn ra các vì sao.',
      'Vietnamese deep-space explorer spacecraft pioneering orbital transit.'
    ),
    rarity: 'RARE',
    iconName: 'Rocket',
    previewColor: '#ef4444',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'token-sampan',
    category: 'TOKEN',
    name: L('Xuồng Ba Lá Miền Tây', 'Mekong Three-Plank Sampan'),
    description: L(
      'Chiếc xuồng mộc mạc lướt sóng qua những dòng kênh chằng chịt sông nước.',
      'A classic wooden delta boat cutting deftly through winding river channels.'
    ),
    rarity: 'RARE',
    iconName: 'Ship',
    previewColor: '#10b981',
    worldTheme: 'mekong-delta',
    unlockCondition: L('Đạt Cấp 6 hoặc mua tại Cửa Hàng', 'Reach Level 6 or buy in Shop'),
    price: 500,
  },
  {
    id: 'token-hoverboard',
    category: 'TOKEN',
    name: L('Ván Trượt Phản Trọng Lực', 'Antigravity Hoverboard'),
    description: L(
      'Thiết bị di chuyển cá nhân bay lơ lửng cách mặt đất 30cm với vệt khói xanh.',
      'Futuristic maglev hoverboard floating effortlessly above the board surface.'
    ),
    rarity: 'EPIC',
    iconName: 'Zap',
    previewColor: '#ec4899',
    worldTheme: 'cyberpunk-city',
    unlockCondition: L('Đạt Cấp 15 hoặc mua tại Cửa Hàng', 'Reach Level 15 or buy in Shop'),
    price: 950,
  },

  // ==========================================
  // 6. VISUAL EFFECTS (Hiệu Ứng Bàn Cờ)
  // ==========================================
  {
    id: 'effect-none',
    category: 'EFFECT',
    name: L('Mặc Định', 'Standard Effects'),
    description: L('Hiệu ứng thị giác chuẩn của trò chơi.', 'Standard visual feedback.'),
    rarity: 'COMMON',
    iconName: 'Check',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'effect-victory-confetti',
    category: 'EFFECT',
    name: L('Pháo Hoa Hoàng Kim', 'Golden Victor Confetti'),
    description: L(
      'Mưa pháo hoa kim tuyến vàng kim rực rỡ khi giành chiến thắng ván cờ.',
      'Shimmering gold and holographic confetti rain upon clinching the championship.'
    ),
    rarity: 'RARE',
    iconName: 'Sparkles',
    previewColor: '#f59e0b',
    unlockCondition: L('Chiến thắng ván đấu đầu tiên', 'Win your first match'),
    price: 450,
  },
  {
    id: 'effect-neon-trail',
    category: 'EFFECT',
    name: L('Vệt Sáng Neon Trail', 'Neon Dash Ripple'),
    description: L(
      'Tạo gợn sóng ánh sáng neon theo từng bước di chuyển của quân cờ.',
      'Emits glowing neon ring shockwaves as your token hops along the perimeter.'
    ),
    rarity: 'EPIC',
    iconName: 'Zap',
    previewColor: '#06b6d4',
    worldTheme: 'cyberpunk-city',
    unlockCondition: L('Đạt Cấp 9', 'Reach Level 9'),
    price: 700,
  },
  {
    id: 'effect-cosmic-warp',
    category: 'EFFECT',
    name: L('Cổng Lỗ Sâu Không Gian', 'Cosmic Wormhole Aura'),
    description: L(
      'Hào quang tinh vân xoáy ốc xuất hiện khi hạ cánh xuống các ô đặc biệt.',
      'Swirling miniature galactic singularity flares when landing on corner tiles.'
    ),
    rarity: 'LEGENDARY',
    iconName: 'Orbit',
    previewColor: '#8b5cf6',
    worldTheme: 'space-colony',
    unlockCondition: L('Đạt Cấp 30 hoặc mua tại Cửa Hàng', 'Reach Level 30 or buy in Shop'),
    price: 1500,
  },

  // ==========================================
  // 7. EMOTES (Biểu Cảm Nhanh Online)
  // ==========================================
  {
    id: 'emote-gg',
    category: 'EMOTE',
    name: L('Chơi Rất Hay! (GG)', 'Good Game! (GG)'),
    description: L('Cử chỉ bắt tay tôn trọng đối thủ.', 'Handshake gesture of sportsmanship.'),
    rarity: 'COMMON',
    iconName: 'Handshake',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'emote-laugh',
    category: 'EMOTE',
    name: L('Cười Nghiêng Ngả 😂', 'Laughter 😂'),
    description: L('Cười sảng khoái trước những tình huống bất ngờ.', 'Hearty laughter.'),
    rarity: 'COMMON',
    iconName: 'Smile',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'emote-panic',
    category: 'EMOTE',
    name: L('Toang Rồi! 😱', 'Panic 😱'),
    description: L('Biểu cảm khi vừa bước vào ô đất đắt đỏ của đối thủ.', 'Panic reaction.'),
    rarity: 'COMMON',
    iconName: 'AlertCircle',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'emote-money',
    category: 'EMOTE',
    name: L('Đại Gia Mua Hết 💸', 'Big Spender 💸'),
    description: L('Tung tiền khoe tài sản.', 'Raining bank bills.'),
    rarity: 'UNCOMMON',
    iconName: 'Coins',
    unlockCondition: L('Đạt $2000M tiền mặt trong một ván', 'Hold $2000M cash in a match'),
    price: 250,
  },
  {
    id: 'emote-thumbsup',
    category: 'EMOTE',
    name: L('Tuyệt Vời 👍', 'Thumbs Up 👍'),
    description: L('Tán thành quyết định giao dịch.', 'Agreement and support.'),
    rarity: 'COMMON',
    iconName: 'ThumbsUp',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'emote-fire',
    category: 'EMOTE',
    name: L('Cháy Quá! 🔥', 'On Fire 🔥'),
    description: L('Khi thế trận đang vô cùng kịch tính.', 'High stakes adrenaline.'),
    rarity: 'UNCOMMON',
    iconName: 'Flame',
    unlockCondition: L('Thắng 2 trận đấu liên tiếp', 'Win 2 consecutive matches'),
    price: 250,
  },
  {
    id: 'emote-cry',
    category: 'EMOTE',
    name: L('Khóc Ròng 😭', 'Sobbing 😭'),
    description: L('Khi bị thu tiền thuê đắt đỏ hoặc vào tù.', 'Crying over heavy rent.'),
    rarity: 'COMMON',
    iconName: 'Frown',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
  {
    id: 'emote-rage',
    category: 'EMOTE',
    name: L('Tức Giận 💢', 'Frustration 💢'),
    description: L('Khi vận may chưa mỉm cười.', 'Playful frustration.'),
    rarity: 'UNCOMMON',
    iconName: 'Zap',
    unlockCondition: L('Có sẵn mặc định', 'Unlocked by default'),
    price: 0,
    isDefault: true,
  },
];

export function getCosmeticItem(id: string): CosmeticItem | undefined {
  return COSMETICS_CATALOG.find(item => item.id === id);
}

export function getCosmeticsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return COSMETICS_CATALOG.filter(item => item.category === category);
}

export function isValidCosmeticId(id: string, category?: CosmeticCategory): boolean {
  const item = getCosmeticItem(id);
  if (!item) return false;
  if (category && item.category !== category) return false;
  return true;
}

export function sanitizePlayerCosmetics(
  input?: Partial<PlayerCosmetics> | null
): PlayerCosmetics {
  if (!input) return { ...DEFAULT_PLAYER_COSMETICS };

  return {
    characterId: isValidCosmeticId(input.characterId || '', 'CHARACTER')
      ? (input.characterId as string)
      : DEFAULT_PLAYER_COSMETICS.characterId,
    outfitId: isValidCosmeticId(input.outfitId || '', 'OUTFIT')
      ? (input.outfitId as string)
      : DEFAULT_PLAYER_COSMETICS.outfitId,
    petId: isValidCosmeticId(input.petId || '', 'PET')
      ? (input.petId as string)
      : DEFAULT_PLAYER_COSMETICS.petId,
    diceSkinId: isValidCosmeticId(input.diceSkinId || '', 'DICE')
      ? (input.diceSkinId as string)
      : DEFAULT_PLAYER_COSMETICS.diceSkinId,
    tokenId: isValidCosmeticId(input.tokenId || '', 'TOKEN')
      ? (input.tokenId as string)
      : DEFAULT_PLAYER_COSMETICS.tokenId,
    effectId: isValidCosmeticId(input.effectId || '', 'EFFECT')
      ? (input.effectId as string)
      : DEFAULT_PLAYER_COSMETICS.effectId,
  };
}
