import { BoardTile, PlayerToken } from '../types';

export const BOARD_SIZE = 40;

// Grid layout mapping for 11x11 perimeter board (Monopoly standard)
export const TILE_GRID_POSITIONS_40: Record<number, { col: number; row: number }> = {
  // Bottom Row (Right -> Left: 0 at bottom-right, 10 at bottom-left)
  0: { col: 11, row: 11 },
  1: { col: 10, row: 11 },
  2: { col: 9, row: 11 },
  3: { col: 8, row: 11 },
  4: { col: 7, row: 11 },
  5: { col: 6, row: 11 },
  6: { col: 5, row: 11 },
  7: { col: 4, row: 11 },
  8: { col: 3, row: 11 },
  9: { col: 2, row: 11 },
  10: { col: 1, row: 11 },

  // Left Column (Bottom -> Top: 11 to 19, 20 at top-left)
  11: { col: 1, row: 10 },
  12: { col: 1, row: 9 },
  13: { col: 1, row: 8 },
  14: { col: 1, row: 7 },
  15: { col: 1, row: 6 },
  16: { col: 1, row: 5 },
  17: { col: 1, row: 4 },
  18: { col: 1, row: 3 },
  19: { col: 1, row: 2 },
  20: { col: 1, row: 1 },

  // Top Row (Left -> Right: 21 to 29, 30 at top-right)
  21: { col: 2, row: 1 },
  22: { col: 3, row: 1 },
  23: { col: 4, row: 1 },
  24: { col: 5, row: 1 },
  25: { col: 6, row: 1 },
  26: { col: 7, row: 1 },
  27: { col: 8, row: 1 },
  28: { col: 9, row: 1 },
  29: { col: 10, row: 1 },
  30: { col: 11, row: 1 },

  // Right Column (Top -> Bottom: 31 to 39)
  31: { col: 11, row: 2 },
  32: { col: 11, row: 3 },
  33: { col: 11, row: 4 },
  34: { col: 11, row: 5 },
  35: { col: 11, row: 6 },
  36: { col: 11, row: 7 },
  37: { col: 11, row: 8 },
  38: { col: 11, row: 9 },
  39: { col: 11, row: 10 },
};

export const BOARD_TILES: BoardTile[] = [
  // Tile 0: START
  {
    id: 0,
    name: 'Cổng Khởi Hành',
    shortName: 'Khởi Hành',
    type: 'START',
    description: 'Đi qua hoặc dừng lại nhận ngay $200 trợ cấp thành phố.',
    iconName: 'Flag',
    gridPosition: TILE_GRID_POSITIONS_40[0],
  },

  // Tile 1: Bến Ninh Kiều (Cần Thơ)
  {
    id: 1,
    name: 'Bến Ninh Kiều (Cần Thơ)',
    shortName: 'Bến Ninh Kiều',
    type: 'PROPERTY',
    description: 'Bến Ninh Kiều thơ mộng, thủ phủ miền Tây sông nước Cửu Long.',
    iconName: 'Compass',
    property: {
      basePrice: 60,
      baseRent: 2,
      houseRent: [10, 30, 90, 160, 250],
      upgradeCost: 50,
      maxLevel: 5,
      district: 'Cần Thơ (Đồng Bằng)',
      districtColor: 'district-brown',
      mortgageValue: 30,
    },
    gridPosition: TILE_GRID_POSITIONS_40[1],
  },

  // Tile 2: Lễ Hội Sông Nước
  {
    id: 2,
    name: 'Lễ Hội Sông Nước',
    shortName: 'Lễ Hội 1',
    type: 'CHEST',
    description: 'Lễ hội sông nước miền Tây náo nhiệt với nhiều cơ hội may mắn.',
    iconName: 'Gift',
    gridPosition: TILE_GRID_POSITIONS_40[2],
  },

  // Tile 3: Chợ Nổi Cái Răng (Cần Thơ)
  {
    id: 3,
    name: 'Chợ Nổi Cái Răng (Cần Thơ)',
    shortName: 'Chợ Nổi',
    type: 'PROPERTY',
    description: 'Chợ nổi đặc trưng miền Cửu Long tấp nập thuyền bè giao thương.',
    iconName: 'ShoppingBag',
    property: {
      basePrice: 60,
      baseRent: 4,
      houseRent: [20, 60, 180, 320, 450],
      upgradeCost: 50,
      maxLevel: 5,
      district: 'Cần Thơ (Đồng Bằng)',
      districtColor: 'district-brown',
      mortgageValue: 30,
    },
    gridPosition: TILE_GRID_POSITIONS_40[3],
  },

  // Tile 4: Thuế Thu Nhập Đô Thị
  {
    id: 4,
    name: 'Thuế Thu Nhập Đô Thị',
    shortName: 'Thuế TN',
    type: 'TAX',
    description: 'Nộp thuế thu nhập cá nhân đô thị $200 vào ngân sách.',
    iconName: 'Receipt',
    taxAmount: 200,
    gridPosition: TILE_GRID_POSITIONS_40[4],
  },

  // Tile 5: Ga Hà Nội (Đường Sắt Bắc Nam)
  {
    id: 5,
    name: 'Ga Hà Nội (Đường Sắt Bắc Nam)',
    shortName: 'Ga Hà Nội',
    type: 'TRANSPORT',
    description: 'Đầu mối đường sắt xuyên Việt kết nối mạch máu giao thương Bắc Nam.',
    iconName: 'Train',
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200], // 1 hub: 25k, 2 hubs: 50k, 3 hubs: 100k, 4 hubs: 200k
      upgradeCost: 0,
      maxLevel: 0,
      district: 'Trục Vận Tải',
      districtColor: 'district-transport',
      mortgageValue: 100,
    },
    gridPosition: TILE_GRID_POSITIONS_40[5],
  },

  // Tile 6: Bãi Sau Vũng Tàu
  {
    id: 6,
    name: 'Bãi Sau Vũng Tàu',
    shortName: 'Vũng Tàu',
    type: 'PROPERTY',
    description: 'Bãi biển du lịch nổi tiếng sôi động với cát vàng và sóng xanh.',
    iconName: 'Sun',
    property: {
      basePrice: 100,
      baseRent: 6,
      houseRent: [30, 90, 270, 400, 550],
      upgradeCost: 50,
      maxLevel: 5,
      district: 'Duyên Hải Nam Trung Bộ',
      districtColor: 'district-lightblue',
      mortgageValue: 50,
    },
    gridPosition: TILE_GRID_POSITIONS_40[6],
  },

  // Tile 7: Cổng Hỗn Loạn Alpha
  {
    id: 7,
    name: 'Cổng Hỗn Loạn Alpha',
    shortName: 'Chaos α',
    type: 'CHAOS',
    description: 'Vòng xoáy Chaos Alpha! Kích hoạt rút thẻ biến cố bất ngờ.',
    iconName: 'Sparkles',
    gridPosition: TILE_GRID_POSITIONS_40[7],
  },

  // Tile 8: Đường Trần Phú (Nha Trang)
  {
    id: 8,
    name: 'Đường Trần Phú (Nha Trang)',
    shortName: 'Trần Phú',
    type: 'PROPERTY',
    description: 'Cung đường ven vịnh biển thơ mộng hàng đầu Việt Nam.',
    iconName: 'Palmtree',
    property: {
      basePrice: 100,
      baseRent: 6,
      houseRent: [30, 90, 270, 400, 550],
      upgradeCost: 50,
      maxLevel: 5,
      district: 'Duyên Hải Nam Trung Bộ',
      districtColor: 'district-lightblue',
      mortgageValue: 50,
    },
    gridPosition: TILE_GRID_POSITIONS_40[8],
  },

  // Tile 9: Tháp Trầm Hương (Nha Trang)
  {
    id: 9,
    name: 'Tháp Trầm Hương (Nha Trang)',
    shortName: 'Trầm Hương',
    type: 'PROPERTY',
    description: 'Biểu tượng kiến trúc hoa sen độc đáo bên bờ vịnh ngọc Nha Trang.',
    iconName: 'Building',
    property: {
      basePrice: 120,
      baseRent: 8,
      houseRent: [40, 100, 300, 450, 600],
      upgradeCost: 50,
      maxLevel: 5,
      district: 'Duyên Hải Nam Trung Bộ',
      districtColor: 'district-lightblue',
      mortgageValue: 60,
    },
    gridPosition: TILE_GRID_POSITIONS_40[9],
  },

  // Tile 10: Khu Cách Ly Tạm Giam
  {
    id: 10,
    name: 'Khu Cách Ly Tạm Giam',
    shortName: 'Tạm Giam',
    type: 'DETENTION',
    description: 'Chỉ viếng thăm nếu đi ngang. Bị tạm giam tối đa 3 lượt nếu vi phạm luật.',
    iconName: 'ShieldAlert',
    gridPosition: TILE_GRID_POSITIONS_40[10],
  },

  // Tile 11: Đại Nội Kinh Thành Huế
  {
    id: 11,
    name: 'Đại Nội Kinh Thành Huế',
    shortName: 'Đại Nội',
    type: 'PROPERTY',
    description: 'Quần thể di tích Cố Đô uy nghiêm đậm dấu ấn lịch sử triều Nguyễn.',
    iconName: 'Castle',
    property: {
      basePrice: 140,
      baseRent: 10,
      houseRent: [50, 150, 450, 625, 750],
      upgradeCost: 100,
      maxLevel: 5,
      district: 'Cố Đô Di Sản',
      districtColor: 'district-pink',
      mortgageValue: 70,
    },
    gridPosition: TILE_GRID_POSITIONS_40[11],
  },

  // Tile 12: Cấp Nước Chợ Lớn (SAWACO)
  {
    id: 12,
    name: 'Cấp Nước Chợ Lớn (SAWACO)',
    shortName: 'Cấp Nước',
    type: 'UTILITY',
    description: 'Mạng lưới cấp nước sạch đô thị. Tiền thuê tính theo điểm đổ xúc xắc (4x hoặc 10x).',
    iconName: 'Droplets',
    property: {
      basePrice: 150,
      baseRent: 4,
      houseRent: [10],
      upgradeCost: 0,
      maxLevel: 0,
      district: 'Hạ Tầng Năng Lượng',
      districtColor: 'district-utility',
      mortgageValue: 75,
    },
    gridPosition: TILE_GRID_POSITIONS_40[12],
  },

  // Tile 13: Cầu Tràng Tiền (Huế)
  {
    id: 13,
    name: 'Cầu Tràng Tiền (Huế)',
    shortName: 'Tràng Tiền',
    type: 'PROPERTY',
    description: 'Cây cầu biểu tượng 6 vài 12 nhịp bắc qua dòng sông Hương êm đềm.',
    iconName: 'Landmark',
    property: {
      basePrice: 140,
      baseRent: 10,
      houseRent: [50, 150, 450, 625, 750],
      upgradeCost: 100,
      maxLevel: 5,
      district: 'Cố Đô Di Sản',
      districtColor: 'district-pink',
      mortgageValue: 70,
    },
    gridPosition: TILE_GRID_POSITIONS_40[13],
  },

  // Tile 14: Phố Cổ Hội An
  {
    id: 14,
    name: 'Phố Cổ Hội An',
    shortName: 'Hội An',
    type: 'PROPERTY',
    description: 'Đô thị cổ lung linh đèn lồng và kiến trúc giao thoa văn hóa quốc tế.',
    iconName: 'Sparkles',
    property: {
      basePrice: 160,
      baseRent: 12,
      houseRent: [60, 180, 500, 700, 900],
      upgradeCost: 100,
      maxLevel: 5,
      district: 'Cố Đô Di Sản',
      districtColor: 'district-pink',
      mortgageValue: 80,
    },
    gridPosition: TILE_GRID_POSITIONS_40[14],
  },

  // Tile 15: Cảng Quốc Tế Hải Phòng
  {
    id: 15,
    name: 'Cảng Quốc Tế Hải Phòng',
    shortName: 'Cảng HP',
    type: 'TRANSPORT',
    description: 'Cửa ngõ hàng hải quốc tế lớn nhất miền Bắc với luồng tàu biển tấp nập.',
    iconName: 'Anchor',
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200],
      upgradeCost: 0,
      maxLevel: 0,
      district: 'Trục Vận Tải',
      districtColor: 'district-transport',
      mortgageValue: 100,
    },
    gridPosition: TILE_GRID_POSITIONS_40[15],
  },

  // Tile 16: Phố Cảng Lạch Tray (Hải Phòng)
  {
    id: 16,
    name: 'Phố Cảng Lạch Tray (Hải Phòng)',
    shortName: 'Lạch Tray',
    type: 'PROPERTY',
    description: 'Tuyến phố huyết mạch sôi động bậc nhất của thành phố Hoa Phượng Đỏ.',
    iconName: 'Flame',
    property: {
      basePrice: 180,
      baseRent: 14,
      houseRent: [70, 200, 550, 750, 950],
      upgradeCost: 100,
      maxLevel: 5,
      district: 'Hải Phòng & Vùng Cảng',
      districtColor: 'district-orange',
      mortgageValue: 90,
    },
    gridPosition: TILE_GRID_POSITIONS_40[16],
  },

  // Tile 17: Khí Vận Doanh Nhân
  {
    id: 17,
    name: 'Khí Vận Doanh Nhân',
    shortName: 'Khí Vận 1',
    type: 'CHANCE',
    description: 'Cơ hội đầu tư mạo hiểm hoặc vận hội thị trường chuyển động.',
    iconName: 'TrendingUp',
    gridPosition: TILE_GRID_POSITIONS_40[17],
  },

  // Tile 18: Bán Đảo Đồ Sơn (Hải Phòng)
  {
    id: 18,
    name: 'Bán Đảo Đồ Sơn (Hải Phòng)',
    shortName: 'Đồ Sơn',
    type: 'PROPERTY',
    description: 'Khu du lịch bán đảo danh tiếng với rừng thông bạt ngàn và gió biển.',
    iconName: 'Trees',
    property: {
      basePrice: 180,
      baseRent: 14,
      houseRent: [70, 200, 550, 750, 950],
      upgradeCost: 100,
      maxLevel: 5,
      district: 'Hải Phòng & Vùng Cảng',
      districtColor: 'district-orange',
      mortgageValue: 90,
    },
    gridPosition: TILE_GRID_POSITIONS_40[18],
  },

  // Tile 19: Bến Du Thuyền Tuần Châu
  {
    id: 19,
    name: 'Bến Du Thuyền Tuần Châu',
    shortName: 'Tuần Châu',
    type: 'PROPERTY',
    description: 'Cảng tàu du lịch sang trọng kết nối kỳ quan thiên nhiên thế giới.',
    iconName: 'Ship',
    property: {
      basePrice: 200,
      baseRent: 16,
      houseRent: [80, 220, 600, 800, 1000],
      upgradeCost: 100,
      maxLevel: 5,
      district: 'Hải Phòng & Vùng Cảng',
      districtColor: 'district-orange',
      mortgageValue: 100,
    },
    gridPosition: TILE_GRID_POSITIONS_40[19],
  },

  // Tile 20: Trạm Nghỉ Chân Miễn Phí
  {
    id: 20,
    name: 'Trạm Nghỉ Chân Miễn Phí',
    shortName: 'Nghỉ Chân',
    type: 'REST_ZONE',
    description: 'Trạm dừng chân miễn phí, an toàn tuyệt đối trước mọi rủi ro thị trường.',
    iconName: 'Coffee',
    gridPosition: TILE_GRID_POSITIONS_40[20],
  },

  // Tile 21: Bãi Biển Mỹ Khê (Đà Nẵng)
  {
    id: 21,
    name: 'Bãi Biển Mỹ Khê (Đà Nẵng)',
    shortName: 'Mỹ Khê',
    type: 'PROPERTY',
    description: 'Bãi biển quyến rũ hàng đầu hành tinh với bờ cát trắng phau mịn màng.',
    iconName: 'Waves',
    property: {
      basePrice: 220,
      baseRent: 18,
      houseRent: [90, 250, 700, 875, 1050],
      upgradeCost: 150,
      maxLevel: 5,
      district: 'Đà Nẵng Đô Thị Biển',
      districtColor: 'district-red',
      mortgageValue: 110,
    },
    gridPosition: TILE_GRID_POSITIONS_40[21],
  },

  // Tile 22: Cổng Hỗn Loạn Beta
  {
    id: 22,
    name: 'Cổng Hỗn Loạn Beta',
    shortName: 'Chaos β',
    type: 'CHAOS',
    description: 'Vòng xoáy Chaos Beta! Tỷ lệ thẻ Uncommon và Rare xuất hiện cao.',
    iconName: 'Sparkles',
    gridPosition: TILE_GRID_POSITIONS_40[22],
  },

  // Tile 23: Bán Đảo Sơn Trà (Đà Nẵng)
  {
    id: 23,
    name: 'Bán Đảo Sơn Trà (Đà Nẵng)',
    shortName: 'Sơn Trà',
    type: 'PROPERTY',
    description: 'Lá phổi xanh nguyên sinh với đỉnh Bàn Cờ hướng nhìn trọn vịnh Đà Nẵng.',
    iconName: 'Mountain',
    property: {
      basePrice: 220,
      baseRent: 18,
      houseRent: [90, 250, 700, 875, 1050],
      upgradeCost: 150,
      maxLevel: 5,
      district: 'Đà Nẵng Đô Thị Biển',
      districtColor: 'district-red',
      mortgageValue: 110,
    },
    gridPosition: TILE_GRID_POSITIONS_40[23],
  },

  // Tile 24: Cầu Vàng Bà Nà Hills
  {
    id: 24,
    name: 'Cầu Vàng Bà Nà Hills',
    shortName: 'Cầu Vàng',
    type: 'PROPERTY',
    description: 'Kiệt tác đôi bàn tay khổng lồ nâng dải lụa vàng giữa mây ngàn Bà Nà.',
    iconName: 'Crown',
    property: {
      basePrice: 240,
      baseRent: 20,
      houseRent: [100, 300, 750, 925, 1100],
      upgradeCost: 150,
      maxLevel: 5,
      district: 'Đà Nẵng Đô Thị Biển',
      districtColor: 'district-red',
      mortgageValue: 120,
    },
    gridPosition: TILE_GRID_POSITIONS_40[24],
  },

  // Tile 25: Cảng Quốc Tế Sài Gòn
  {
    id: 25,
    name: 'Cảng Quốc Tế Sài Gòn',
    shortName: 'Cảng SG',
    type: 'TRANSPORT',
    description: 'Cửa ngõ logistics biển phương Nam nhộn nhịp tàu hàng năm châu cập bến.',
    iconName: 'Navigation',
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200],
      upgradeCost: 0,
      maxLevel: 0,
      district: 'Trục Vận Tải',
      districtColor: 'district-transport',
      mortgageValue: 100,
    },
    gridPosition: TILE_GRID_POSITIONS_40[25],
  },

  // Tile 26: Bãi Sao (Phú Quốc)
  {
    id: 26,
    name: 'Bãi Sao (Phú Quốc)',
    shortName: 'Bãi Sao',
    type: 'PROPERTY',
    description: 'Thiên đường biển đảo ngọc với làn nước trong vắt nhìn thấu đáy.',
    iconName: 'SunMedium',
    property: {
      basePrice: 260,
      baseRent: 22,
      houseRent: [110, 330, 800, 975, 1150],
      upgradeCost: 150,
      maxLevel: 5,
      district: 'Phú Quốc Đảo Ngọc',
      districtColor: 'district-yellow',
      mortgageValue: 130,
    },
    gridPosition: TILE_GRID_POSITIONS_40[26],
  },

  // Tile 27: Thị Trấn Hoàng Hôn Sunset
  {
    id: 27,
    name: 'Thị Trấn Hoàng Hôn Sunset',
    shortName: 'Sunset Town',
    type: 'PROPERTY',
    description: 'Thị trấn mang phong cách Địa Trung Hải ngắm hoàng hôn rực rỡ nhất đảo.',
    iconName: 'Sunset',
    property: {
      basePrice: 260,
      baseRent: 22,
      houseRent: [110, 330, 800, 975, 1150],
      upgradeCost: 150,
      maxLevel: 5,
      district: 'Phú Quốc Đảo Ngọc',
      districtColor: 'district-yellow',
      mortgageValue: 130,
    },
    gridPosition: TILE_GRID_POSITIONS_40[27],
  },

  // Tile 28: Điện Lực Quốc Gia EVN
  {
    id: 28,
    name: 'Điện Lực Quốc Gia EVN',
    shortName: 'Điện EVN',
    type: 'UTILITY',
    description: 'Mạng lưới truyền tải điện quốc gia. Tiền thuê tính theo điểm xúc xắc (4x hoặc 10x).',
    iconName: 'Zap',
    property: {
      basePrice: 150,
      baseRent: 4,
      houseRent: [10],
      upgradeCost: 0,
      maxLevel: 0,
      district: 'Hạ Tầng Năng Lượng',
      districtColor: 'district-utility',
      mortgageValue: 75,
    },
    gridPosition: TILE_GRID_POSITIONS_40[28],
  },

  // Tile 29: Thành Phố Không Ngủ Grand World
  {
    id: 29,
    name: 'Thành Phố Không Ngủ Grand World',
    shortName: 'Grand World',
    type: 'PROPERTY',
    description: 'Tổ hợp kinh tế đêm phồn hoa với lễ hội biểu diễn liên tục 24/7.',
    iconName: 'Sparkles',
    property: {
      basePrice: 280,
      baseRent: 24,
      houseRent: [120, 360, 850, 1025, 1200],
      upgradeCost: 150,
      maxLevel: 5,
      district: 'Phú Quốc Đảo Ngọc',
      districtColor: 'district-yellow',
      mortgageValue: 140,
    },
    gridPosition: TILE_GRID_POSITIONS_40[29],
  },

  // Tile 30: Lệnh Giam Giữ (Vào Tù)
  {
    id: 30,
    name: 'Lệnh Giam Giữ (Vào Tù)',
    shortName: 'Vào Tù',
    type: 'GO_TO_JAIL',
    description: 'Bị áp giải thẳng về Khu Cách Ly Tạm Giam (Tile 10)! Không nhận lương GO.',
    iconName: 'ShieldAlert',
    gridPosition: TILE_GRID_POSITIONS_40[30],
  },

  // Tile 31: Phố Cổ Tạ Hiện (Hà Nội)
  {
    id: 31,
    name: 'Phố Cổ Tạ Hiện (Hà Nội)',
    shortName: 'Phố Tạ Hiện',
    type: 'PROPERTY',
    description: 'Ngã tư quốc tế phố cổ ngàn năm, tụ điểm giải trí đêm đông đúc của Thủ Đô.',
    iconName: 'Store',
    property: {
      basePrice: 300,
      baseRent: 26,
      houseRent: [130, 390, 900, 1100, 1275],
      upgradeCost: 200,
      maxLevel: 5,
      district: 'Hà Nội Ba Đình & Hoàn Kiếm',
      districtColor: 'district-green',
      mortgageValue: 150,
    },
    gridPosition: TILE_GRID_POSITIONS_40[31],
  },

  // Tile 32: Bờ Hồ Hoàn Kiếm (Hà Nội)
  {
    id: 32,
    name: 'Bờ Hồ Hoàn Kiếm (Hà Nội)',
    shortName: 'Hồ Hoàn Kiếm',
    type: 'PROPERTY',
    description: 'Trái tim thiêng liêng của Thăng Long Hà Nội với Tháp Rùa cổ kính.',
    iconName: 'Landmark',
    property: {
      basePrice: 300,
      baseRent: 26,
      houseRent: [130, 390, 900, 1100, 1275],
      upgradeCost: 200,
      maxLevel: 5,
      district: 'Hà Nội Ba Đình & Hoàn Kiếm',
      districtColor: 'district-green',
      mortgageValue: 150,
    },
    gridPosition: TILE_GRID_POSITIONS_40[32],
  },

  // Tile 33: Lễ Hội Ngàn Năm Thăng Long
  {
    id: 33,
    name: 'Lễ Hội Ngàn Năm Thăng Long',
    shortName: 'Lễ Hội 2',
    type: 'CHEST',
    description: 'Đại lễ văn hóa hào khí ngàn năm, đón nhận phúc lộc đô thị.',
    iconName: 'Gift',
    gridPosition: TILE_GRID_POSITIONS_40[33],
  },

  // Tile 34: Bán Đảo Tây Hồ (Hà Nội)
  {
    id: 34,
    name: 'Bán Đảo Tây Hồ (Hà Nội)',
    shortName: 'Tây Hồ',
    type: 'PROPERTY',
    description: 'Vùng đất phong thủy đắc địa nơi quy tụ các biệt thự ven hồ đắt giá.',
    iconName: 'Building',
    property: {
      basePrice: 320,
      baseRent: 28,
      houseRent: [150, 450, 1000, 1200, 1400],
      upgradeCost: 200,
      maxLevel: 5,
      district: 'Hà Nội Ba Đình & Hoàn Kiếm',
      districtColor: 'district-green',
      mortgageValue: 160,
    },
    gridPosition: TILE_GRID_POSITIONS_40[34],
  },

  // Tile 35: Sân Bay Quốc Tế Nội Bài - TSN
  {
    id: 35,
    name: 'Sân Bay Quốc Tế Nội Bài - TSN',
    shortName: 'Sân Bay QT',
    type: 'TRANSPORT',
    description: 'Cửa ngõ hàng không quốc tế đón hàng chục triệu lượt khách toàn cầu.',
    iconName: 'PlaneTakeoff',
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200],
      upgradeCost: 0,
      maxLevel: 0,
      district: 'Trục Vận Tải',
      districtColor: 'district-transport',
      mortgageValue: 100,
    },
    gridPosition: TILE_GRID_POSITIONS_40[35],
  },

  // Tile 36: Cổng Hỗn Loạn Omega
  {
    id: 36,
    name: 'Cổng Hỗn Loạn Omega',
    shortName: 'Chaos Ω',
    type: 'CHAOS',
    description: 'Vòng xoáy Chaos Omega! Rút các biến cố Rare, Calamity và Legendary.',
    iconName: 'Sparkles',
    gridPosition: TILE_GRID_POSITIONS_40[36],
  },

  // Tile 37: Phố Tài Chính Nguyễn Huệ (Q.1)
  {
    id: 37,
    name: 'Phố Tài Chính Nguyễn Huệ (Q.1)',
    shortName: 'Nguyễn Huệ',
    type: 'PROPERTY',
    description: 'Trung tâm tài chính vàng sầm uất và quảng trường hoa lệ bậc nhất Sài Gòn.',
    iconName: 'TrendingUp',
    property: {
      basePrice: 350,
      baseRent: 35,
      houseRent: [175, 500, 1100, 1300, 1500],
      upgradeCost: 200,
      maxLevel: 5,
      district: 'TP.HCM Sài Gòn Hoa Lệ',
      districtColor: 'district-darkblue',
      mortgageValue: 175,
    },
    gridPosition: TILE_GRID_POSITIONS_40[37],
  },

  // Tile 38: Thuế Tài Sản Đô Thị Cao Cấp
  {
    id: 38,
    name: 'Thuế Tài Sản Đô Thị Cao Cấp',
    shortName: 'Thuế Tài Sản',
    type: 'TAX',
    description: 'Nộp thuế tài sản đô thị cao cấp $100 cho cơ quan thuế.',
    iconName: 'Receipt',
    taxAmount: 100,
    gridPosition: TILE_GRID_POSITIONS_40[38],
  },

  // Tile 39: Tòa Tháp Landmark 81 & Thủ Thiêm
  {
    id: 39,
    name: 'Tòa Tháp Landmark 81 & Thủ Thiêm',
    shortName: 'Landmark 81',
    type: 'PROPERTY',
    description: 'Kỳ quan chọc trời cao nhất Việt Nam và trung tâm tài chính mới Thủ Thiêm.',
    iconName: 'Building2',
    property: {
      basePrice: 400,
      baseRent: 50,
      houseRent: [200, 600, 1400, 1700, 2000],
      upgradeCost: 200,
      maxLevel: 5,
      district: 'TP.HCM Sài Gòn Hoa Lệ',
      districtColor: 'district-darkblue',
      mortgageValue: 200,
    },
    gridPosition: TILE_GRID_POSITIONS_40[39],
  },
];

export const DEFAULT_PLAYER_TOKENS: PlayerToken[] = [
  {
    id: 'token-vinfast',
    name: 'VinFast VF9',
    symbol: '🚗',
    colorHex: '#06b6d4', // Cyan
    accentHex: '#22d3ee',
    avatarIcon: 'Car',
  },
  {
    id: 'token-metro',
    name: 'Metro Express',
    symbol: '🚆',
    colorHex: '#ec4899', // Fuchsia Pink
    accentHex: '#f472b6',
    avatarIcon: 'Train',
  },
  {
    id: 'token-meo-than-tai',
    name: 'Mèo Thần Tài Cyber',
    symbol: '🐱',
    colorHex: '#eab308', // Amber Gold
    accentHex: '#fde047',
    avatarIcon: 'Sparkles',
  },
  {
    id: 'token-vinasat',
    name: 'Vệ Tinh Vinasat',
    symbol: '🛰️',
    colorHex: '#8b5cf6', // Violet
    accentHex: '#a78bfa',
    avatarIcon: 'Crown',
  },
];

export const BOARD_TILES_BY_ID: Record<number, BoardTile> = Object.freeze(
  BOARD_TILES.reduce((acc, tile) => {
    acc[tile.id] = tile;
    return acc;
  }, {} as Record<number, BoardTile>)
);

export const TILES_BY_DISTRICT: Record<string, BoardTile[]> = Object.freeze(
  BOARD_TILES.reduce((acc, tile) => {
    if (tile.property?.districtColor) {
      const color = tile.property.districtColor;
      if (!acc[color]) acc[color] = [];
      acc[color].push(tile);
    }
    return acc;
  }, {} as Record<string, BoardTile[]>)
);

