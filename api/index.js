// src/server/vercelHandler.ts
import os from "node:os";
import path3 from "node:path";

// src/server/multiplayerServer.ts
import http from "node:http";
import crypto3 from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
import { WebSocketServer, WebSocket } from "ws";

// src/multiplayer/protocol.ts
var PROTOCOL_VERSION = "1.0";

// src/server/roomManager.ts
import crypto2 from "node:crypto";

// src/game/board/boardData.ts
var BOARD_SIZE = 40;
var TILE_GRID_POSITIONS_40 = {
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
  39: { col: 11, row: 10 }
};
var BOARD_TILES = [
  // Tile 0: START
  {
    id: 0,
    name: "C\u1ED5ng Kh\u1EDFi H\xE0nh",
    shortName: "Kh\u1EDFi H\xE0nh",
    type: "START",
    description: "\u0110i qua ho\u1EB7c d\u1EEBng l\u1EA1i nh\u1EADn ngay $200 tr\u1EE3 c\u1EA5p th\xE0nh ph\u1ED1.",
    iconName: "Flag",
    gridPosition: TILE_GRID_POSITIONS_40[0]
  },
  // Tile 1: Bến Ninh Kiều (Cần Thơ)
  {
    id: 1,
    name: "B\u1EBFn Ninh Ki\u1EC1u (C\u1EA7n Th\u01A1)",
    shortName: "B\u1EBFn Ninh Ki\u1EC1u",
    type: "PROPERTY",
    description: "B\u1EBFn Ninh Ki\u1EC1u th\u01A1 m\u1ED9ng, th\u1EE7 ph\u1EE7 mi\u1EC1n T\xE2y s\xF4ng n\u01B0\u1EDBc C\u1EEDu Long.",
    iconName: "Compass",
    property: {
      basePrice: 60,
      baseRent: 2,
      houseRent: [10, 30, 90, 160, 250],
      upgradeCost: 50,
      maxLevel: 5,
      district: "C\u1EA7n Th\u01A1 (\u0110\u1ED3ng B\u1EB1ng)",
      districtColor: "district-brown",
      mortgageValue: 30
    },
    gridPosition: TILE_GRID_POSITIONS_40[1]
  },
  // Tile 2: Lễ Hội Sông Nước
  {
    id: 2,
    name: "L\u1EC5 H\u1ED9i S\xF4ng N\u01B0\u1EDBc",
    shortName: "L\u1EC5 H\u1ED9i 1",
    type: "CHEST",
    description: "L\u1EC5 h\u1ED9i s\xF4ng n\u01B0\u1EDBc mi\u1EC1n T\xE2y n\xE1o nhi\u1EC7t v\u1EDBi nhi\u1EC1u c\u01A1 h\u1ED9i may m\u1EAFn.",
    iconName: "Gift",
    gridPosition: TILE_GRID_POSITIONS_40[2]
  },
  // Tile 3: Chợ Nổi Cái Răng (Cần Thơ)
  {
    id: 3,
    name: "Ch\u1EE3 N\u1ED5i C\xE1i R\u0103ng (C\u1EA7n Th\u01A1)",
    shortName: "Ch\u1EE3 N\u1ED5i",
    type: "PROPERTY",
    description: "Ch\u1EE3 n\u1ED5i \u0111\u1EB7c tr\u01B0ng mi\u1EC1n C\u1EEDu Long t\u1EA5p n\u1EADp thuy\u1EC1n b\xE8 giao th\u01B0\u01A1ng.",
    iconName: "ShoppingBag",
    property: {
      basePrice: 60,
      baseRent: 4,
      houseRent: [20, 60, 180, 320, 450],
      upgradeCost: 50,
      maxLevel: 5,
      district: "C\u1EA7n Th\u01A1 (\u0110\u1ED3ng B\u1EB1ng)",
      districtColor: "district-brown",
      mortgageValue: 30
    },
    gridPosition: TILE_GRID_POSITIONS_40[3]
  },
  // Tile 4: Thuế Thu Nhập Đô Thị
  {
    id: 4,
    name: "Thu\u1EBF Thu Nh\u1EADp \u0110\xF4 Th\u1ECB",
    shortName: "Thu\u1EBF TN",
    type: "TAX",
    description: "N\u1ED9p thu\u1EBF thu nh\u1EADp c\xE1 nh\xE2n \u0111\xF4 th\u1ECB $200 v\xE0o ng\xE2n s\xE1ch.",
    iconName: "Receipt",
    taxAmount: 200,
    gridPosition: TILE_GRID_POSITIONS_40[4]
  },
  // Tile 5: Ga Hà Nội (Đường Sắt Bắc Nam)
  {
    id: 5,
    name: "Ga H\xE0 N\u1ED9i (\u0110\u01B0\u1EDDng S\u1EAFt B\u1EAFc Nam)",
    shortName: "Ga H\xE0 N\u1ED9i",
    type: "TRANSPORT",
    description: "\u0110\u1EA7u m\u1ED1i \u0111\u01B0\u1EDDng s\u1EAFt xuy\xEAn Vi\u1EC7t k\u1EBFt n\u1ED1i m\u1EA1ch m\xE1u giao th\u01B0\u01A1ng B\u1EAFc Nam.",
    iconName: "Train",
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200],
      // 1 hub: 25k, 2 hubs: 50k, 3 hubs: 100k, 4 hubs: 200k
      upgradeCost: 0,
      maxLevel: 0,
      district: "Tr\u1EE5c V\u1EADn T\u1EA3i",
      districtColor: "district-transport",
      mortgageValue: 100
    },
    gridPosition: TILE_GRID_POSITIONS_40[5]
  },
  // Tile 6: Bãi Sau Vũng Tàu
  {
    id: 6,
    name: "B\xE3i Sau V\u0169ng T\xE0u",
    shortName: "V\u0169ng T\xE0u",
    type: "PROPERTY",
    description: "B\xE3i bi\u1EC3n du l\u1ECBch n\u1ED5i ti\u1EBFng s\xF4i \u0111\u1ED9ng v\u1EDBi c\xE1t v\xE0ng v\xE0 s\xF3ng xanh.",
    iconName: "Sun",
    property: {
      basePrice: 100,
      baseRent: 6,
      houseRent: [30, 90, 270, 400, 550],
      upgradeCost: 50,
      maxLevel: 5,
      district: "Duy\xEAn H\u1EA3i Nam Trung B\u1ED9",
      districtColor: "district-lightblue",
      mortgageValue: 50
    },
    gridPosition: TILE_GRID_POSITIONS_40[6]
  },
  // Tile 7: Cổng Hỗn Loạn Alpha
  {
    id: 7,
    name: "C\u1ED5ng H\u1ED7n Lo\u1EA1n Alpha",
    shortName: "Chaos \u03B1",
    type: "CHAOS",
    description: "V\xF2ng xo\xE1y Chaos Alpha! K\xEDch ho\u1EA1t r\xFAt th\u1EBB bi\u1EBFn c\u1ED1 b\u1EA5t ng\u1EDD.",
    iconName: "Sparkles",
    gridPosition: TILE_GRID_POSITIONS_40[7]
  },
  // Tile 8: Đường Trần Phú (Nha Trang)
  {
    id: 8,
    name: "\u0110\u01B0\u1EDDng Tr\u1EA7n Ph\xFA (Nha Trang)",
    shortName: "Tr\u1EA7n Ph\xFA",
    type: "PROPERTY",
    description: "Cung \u0111\u01B0\u1EDDng ven v\u1ECBnh bi\u1EC3n th\u01A1 m\u1ED9ng h\xE0ng \u0111\u1EA7u Vi\u1EC7t Nam.",
    iconName: "Palmtree",
    property: {
      basePrice: 100,
      baseRent: 6,
      houseRent: [30, 90, 270, 400, 550],
      upgradeCost: 50,
      maxLevel: 5,
      district: "Duy\xEAn H\u1EA3i Nam Trung B\u1ED9",
      districtColor: "district-lightblue",
      mortgageValue: 50
    },
    gridPosition: TILE_GRID_POSITIONS_40[8]
  },
  // Tile 9: Tháp Trầm Hương (Nha Trang)
  {
    id: 9,
    name: "Th\xE1p Tr\u1EA7m H\u01B0\u01A1ng (Nha Trang)",
    shortName: "Tr\u1EA7m H\u01B0\u01A1ng",
    type: "PROPERTY",
    description: "Bi\u1EC3u t\u01B0\u1EE3ng ki\u1EBFn tr\xFAc hoa sen \u0111\u1ED9c \u0111\xE1o b\xEAn b\u1EDD v\u1ECBnh ng\u1ECDc Nha Trang.",
    iconName: "Building",
    property: {
      basePrice: 120,
      baseRent: 8,
      houseRent: [40, 100, 300, 450, 600],
      upgradeCost: 50,
      maxLevel: 5,
      district: "Duy\xEAn H\u1EA3i Nam Trung B\u1ED9",
      districtColor: "district-lightblue",
      mortgageValue: 60
    },
    gridPosition: TILE_GRID_POSITIONS_40[9]
  },
  // Tile 10: Khu Cách Ly Tạm Giam
  {
    id: 10,
    name: "Khu C\xE1ch Ly T\u1EA1m Giam",
    shortName: "T\u1EA1m Giam",
    type: "DETENTION",
    description: "Ch\u1EC9 vi\u1EBFng th\u0103m n\u1EBFu \u0111i ngang. B\u1ECB t\u1EA1m giam t\u1ED1i \u0111a 3 l\u01B0\u1EE3t n\u1EBFu vi ph\u1EA1m lu\u1EADt.",
    iconName: "ShieldAlert",
    gridPosition: TILE_GRID_POSITIONS_40[10]
  },
  // Tile 11: Đại Nội Kinh Thành Huế
  {
    id: 11,
    name: "\u0110\u1EA1i N\u1ED9i Kinh Th\xE0nh Hu\u1EBF",
    shortName: "\u0110\u1EA1i N\u1ED9i",
    type: "PROPERTY",
    description: "Qu\u1EA7n th\u1EC3 di t\xEDch C\u1ED1 \u0110\xF4 uy nghi\xEAm \u0111\u1EADm d\u1EA5u \u1EA5n l\u1ECBch s\u1EED tri\u1EC1u Nguy\u1EC5n.",
    iconName: "Castle",
    property: {
      basePrice: 140,
      baseRent: 10,
      houseRent: [50, 150, 450, 625, 750],
      upgradeCost: 100,
      maxLevel: 5,
      district: "C\u1ED1 \u0110\xF4 Di S\u1EA3n",
      districtColor: "district-pink",
      mortgageValue: 70
    },
    gridPosition: TILE_GRID_POSITIONS_40[11]
  },
  // Tile 12: Cấp Nước Chợ Lớn (SAWACO)
  {
    id: 12,
    name: "C\u1EA5p N\u01B0\u1EDBc Ch\u1EE3 L\u1EDBn (SAWACO)",
    shortName: "C\u1EA5p N\u01B0\u1EDBc",
    type: "UTILITY",
    description: "M\u1EA1ng l\u01B0\u1EDBi c\u1EA5p n\u01B0\u1EDBc s\u1EA1ch \u0111\xF4 th\u1ECB. Ti\u1EC1n thu\xEA t\xEDnh theo \u0111i\u1EC3m \u0111\u1ED5 x\xFAc x\u1EAFc (4x ho\u1EB7c 10x).",
    iconName: "Droplets",
    property: {
      basePrice: 150,
      baseRent: 4,
      houseRent: [10],
      upgradeCost: 0,
      maxLevel: 0,
      district: "H\u1EA1 T\u1EA7ng N\u0103ng L\u01B0\u1EE3ng",
      districtColor: "district-utility",
      mortgageValue: 75
    },
    gridPosition: TILE_GRID_POSITIONS_40[12]
  },
  // Tile 13: Cầu Tràng Tiền (Huế)
  {
    id: 13,
    name: "C\u1EA7u Tr\xE0ng Ti\u1EC1n (Hu\u1EBF)",
    shortName: "Tr\xE0ng Ti\u1EC1n",
    type: "PROPERTY",
    description: "C\xE2y c\u1EA7u bi\u1EC3u t\u01B0\u1EE3ng 6 v\xE0i 12 nh\u1ECBp b\u1EAFc qua d\xF2ng s\xF4ng H\u01B0\u01A1ng \xEAm \u0111\u1EC1m.",
    iconName: "Landmark",
    property: {
      basePrice: 140,
      baseRent: 10,
      houseRent: [50, 150, 450, 625, 750],
      upgradeCost: 100,
      maxLevel: 5,
      district: "C\u1ED1 \u0110\xF4 Di S\u1EA3n",
      districtColor: "district-pink",
      mortgageValue: 70
    },
    gridPosition: TILE_GRID_POSITIONS_40[13]
  },
  // Tile 14: Phố Cổ Hội An
  {
    id: 14,
    name: "Ph\u1ED1 C\u1ED5 H\u1ED9i An",
    shortName: "H\u1ED9i An",
    type: "PROPERTY",
    description: "\u0110\xF4 th\u1ECB c\u1ED5 lung linh \u0111\xE8n l\u1ED3ng v\xE0 ki\u1EBFn tr\xFAc giao thoa v\u0103n h\xF3a qu\u1ED1c t\u1EBF.",
    iconName: "Sparkles",
    property: {
      basePrice: 160,
      baseRent: 12,
      houseRent: [60, 180, 500, 700, 900],
      upgradeCost: 100,
      maxLevel: 5,
      district: "C\u1ED1 \u0110\xF4 Di S\u1EA3n",
      districtColor: "district-pink",
      mortgageValue: 80
    },
    gridPosition: TILE_GRID_POSITIONS_40[14]
  },
  // Tile 15: Cảng Quốc Tế Hải Phòng
  {
    id: 15,
    name: "C\u1EA3ng Qu\u1ED1c T\u1EBF H\u1EA3i Ph\xF2ng",
    shortName: "C\u1EA3ng HP",
    type: "TRANSPORT",
    description: "C\u1EEDa ng\xF5 h\xE0ng h\u1EA3i qu\u1ED1c t\u1EBF l\u1EDBn nh\u1EA5t mi\u1EC1n B\u1EAFc v\u1EDBi lu\u1ED3ng t\xE0u bi\u1EC3n t\u1EA5p n\u1EADp.",
    iconName: "Anchor",
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200],
      upgradeCost: 0,
      maxLevel: 0,
      district: "Tr\u1EE5c V\u1EADn T\u1EA3i",
      districtColor: "district-transport",
      mortgageValue: 100
    },
    gridPosition: TILE_GRID_POSITIONS_40[15]
  },
  // Tile 16: Phố Cảng Lạch Tray (Hải Phòng)
  {
    id: 16,
    name: "Ph\u1ED1 C\u1EA3ng L\u1EA1ch Tray (H\u1EA3i Ph\xF2ng)",
    shortName: "L\u1EA1ch Tray",
    type: "PROPERTY",
    description: "Tuy\u1EBFn ph\u1ED1 huy\u1EBFt m\u1EA1ch s\xF4i \u0111\u1ED9ng b\u1EADc nh\u1EA5t c\u1EE7a th\xE0nh ph\u1ED1 Hoa Ph\u01B0\u1EE3ng \u0110\u1ECF.",
    iconName: "Flame",
    property: {
      basePrice: 180,
      baseRent: 14,
      houseRent: [70, 200, 550, 750, 950],
      upgradeCost: 100,
      maxLevel: 5,
      district: "H\u1EA3i Ph\xF2ng & V\xF9ng C\u1EA3ng",
      districtColor: "district-orange",
      mortgageValue: 90
    },
    gridPosition: TILE_GRID_POSITIONS_40[16]
  },
  // Tile 17: Khí Vận Doanh Nhân
  {
    id: 17,
    name: "Kh\xED V\u1EADn Doanh Nh\xE2n",
    shortName: "Kh\xED V\u1EADn 1",
    type: "CHANCE",
    description: "C\u01A1 h\u1ED9i \u0111\u1EA7u t\u01B0 m\u1EA1o hi\u1EC3m ho\u1EB7c v\u1EADn h\u1ED9i th\u1ECB tr\u01B0\u1EDDng chuy\u1EC3n \u0111\u1ED9ng.",
    iconName: "TrendingUp",
    gridPosition: TILE_GRID_POSITIONS_40[17]
  },
  // Tile 18: Bán Đảo Đồ Sơn (Hải Phòng)
  {
    id: 18,
    name: "B\xE1n \u0110\u1EA3o \u0110\u1ED3 S\u01A1n (H\u1EA3i Ph\xF2ng)",
    shortName: "\u0110\u1ED3 S\u01A1n",
    type: "PROPERTY",
    description: "Khu du l\u1ECBch b\xE1n \u0111\u1EA3o danh ti\u1EBFng v\u1EDBi r\u1EEBng th\xF4ng b\u1EA1t ng\xE0n v\xE0 gi\xF3 bi\u1EC3n.",
    iconName: "Trees",
    property: {
      basePrice: 180,
      baseRent: 14,
      houseRent: [70, 200, 550, 750, 950],
      upgradeCost: 100,
      maxLevel: 5,
      district: "H\u1EA3i Ph\xF2ng & V\xF9ng C\u1EA3ng",
      districtColor: "district-orange",
      mortgageValue: 90
    },
    gridPosition: TILE_GRID_POSITIONS_40[18]
  },
  // Tile 19: Bến Du Thuyền Tuần Châu
  {
    id: 19,
    name: "B\u1EBFn Du Thuy\u1EC1n Tu\u1EA7n Ch\xE2u",
    shortName: "Tu\u1EA7n Ch\xE2u",
    type: "PROPERTY",
    description: "C\u1EA3ng t\xE0u du l\u1ECBch sang tr\u1ECDng k\u1EBFt n\u1ED1i k\u1EF3 quan thi\xEAn nhi\xEAn th\u1EBF gi\u1EDBi.",
    iconName: "Ship",
    property: {
      basePrice: 200,
      baseRent: 16,
      houseRent: [80, 220, 600, 800, 1e3],
      upgradeCost: 100,
      maxLevel: 5,
      district: "H\u1EA3i Ph\xF2ng & V\xF9ng C\u1EA3ng",
      districtColor: "district-orange",
      mortgageValue: 100
    },
    gridPosition: TILE_GRID_POSITIONS_40[19]
  },
  // Tile 20: Trạm Nghỉ Chân Miễn Phí
  {
    id: 20,
    name: "Tr\u1EA1m Ngh\u1EC9 Ch\xE2n Mi\u1EC5n Ph\xED",
    shortName: "Ngh\u1EC9 Ch\xE2n",
    type: "REST_ZONE",
    description: "Tr\u1EA1m d\u1EEBng ch\xE2n mi\u1EC5n ph\xED, an to\xE0n tuy\u1EC7t \u0111\u1ED1i tr\u01B0\u1EDBc m\u1ECDi r\u1EE7i ro th\u1ECB tr\u01B0\u1EDDng.",
    iconName: "Coffee",
    gridPosition: TILE_GRID_POSITIONS_40[20]
  },
  // Tile 21: Bãi Biển Mỹ Khê (Đà Nẵng)
  {
    id: 21,
    name: "B\xE3i Bi\u1EC3n M\u1EF9 Kh\xEA (\u0110\xE0 N\u1EB5ng)",
    shortName: "M\u1EF9 Kh\xEA",
    type: "PROPERTY",
    description: "B\xE3i bi\u1EC3n quy\u1EBFn r\u0169 h\xE0ng \u0111\u1EA7u h\xE0nh tinh v\u1EDBi b\u1EDD c\xE1t tr\u1EAFng phau m\u1ECBn m\xE0ng.",
    iconName: "Waves",
    property: {
      basePrice: 220,
      baseRent: 18,
      houseRent: [90, 250, 700, 875, 1050],
      upgradeCost: 150,
      maxLevel: 5,
      district: "\u0110\xE0 N\u1EB5ng \u0110\xF4 Th\u1ECB Bi\u1EC3n",
      districtColor: "district-red",
      mortgageValue: 110
    },
    gridPosition: TILE_GRID_POSITIONS_40[21]
  },
  // Tile 22: Cổng Hỗn Loạn Beta
  {
    id: 22,
    name: "C\u1ED5ng H\u1ED7n Lo\u1EA1n Beta",
    shortName: "Chaos \u03B2",
    type: "CHAOS",
    description: "V\xF2ng xo\xE1y Chaos Beta! T\u1EF7 l\u1EC7 th\u1EBB Uncommon v\xE0 Rare xu\u1EA5t hi\u1EC7n cao.",
    iconName: "Sparkles",
    gridPosition: TILE_GRID_POSITIONS_40[22]
  },
  // Tile 23: Bán Đảo Sơn Trà (Đà Nẵng)
  {
    id: 23,
    name: "B\xE1n \u0110\u1EA3o S\u01A1n Tr\xE0 (\u0110\xE0 N\u1EB5ng)",
    shortName: "S\u01A1n Tr\xE0",
    type: "PROPERTY",
    description: "L\xE1 ph\u1ED5i xanh nguy\xEAn sinh v\u1EDBi \u0111\u1EC9nh B\xE0n C\u1EDD h\u01B0\u1EDBng nh\xECn tr\u1ECDn v\u1ECBnh \u0110\xE0 N\u1EB5ng.",
    iconName: "Mountain",
    property: {
      basePrice: 220,
      baseRent: 18,
      houseRent: [90, 250, 700, 875, 1050],
      upgradeCost: 150,
      maxLevel: 5,
      district: "\u0110\xE0 N\u1EB5ng \u0110\xF4 Th\u1ECB Bi\u1EC3n",
      districtColor: "district-red",
      mortgageValue: 110
    },
    gridPosition: TILE_GRID_POSITIONS_40[23]
  },
  // Tile 24: Cầu Vàng Bà Nà Hills
  {
    id: 24,
    name: "C\u1EA7u V\xE0ng B\xE0 N\xE0 Hills",
    shortName: "C\u1EA7u V\xE0ng",
    type: "PROPERTY",
    description: "Ki\u1EC7t t\xE1c \u0111\xF4i b\xE0n tay kh\u1ED5ng l\u1ED3 n\xE2ng d\u1EA3i l\u1EE5a v\xE0ng gi\u1EEFa m\xE2y ng\xE0n B\xE0 N\xE0.",
    iconName: "Crown",
    property: {
      basePrice: 240,
      baseRent: 20,
      houseRent: [100, 300, 750, 925, 1100],
      upgradeCost: 150,
      maxLevel: 5,
      district: "\u0110\xE0 N\u1EB5ng \u0110\xF4 Th\u1ECB Bi\u1EC3n",
      districtColor: "district-red",
      mortgageValue: 120
    },
    gridPosition: TILE_GRID_POSITIONS_40[24]
  },
  // Tile 25: Cảng Quốc Tế Sài Gòn
  {
    id: 25,
    name: "C\u1EA3ng Qu\u1ED1c T\u1EBF S\xE0i G\xF2n",
    shortName: "C\u1EA3ng SG",
    type: "TRANSPORT",
    description: "C\u1EEDa ng\xF5 logistics bi\u1EC3n ph\u01B0\u01A1ng Nam nh\u1ED9n nh\u1ECBp t\xE0u h\xE0ng n\u0103m ch\xE2u c\u1EADp b\u1EBFn.",
    iconName: "Navigation",
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200],
      upgradeCost: 0,
      maxLevel: 0,
      district: "Tr\u1EE5c V\u1EADn T\u1EA3i",
      districtColor: "district-transport",
      mortgageValue: 100
    },
    gridPosition: TILE_GRID_POSITIONS_40[25]
  },
  // Tile 26: Bãi Sao (Phú Quốc)
  {
    id: 26,
    name: "B\xE3i Sao (Ph\xFA Qu\u1ED1c)",
    shortName: "B\xE3i Sao",
    type: "PROPERTY",
    description: "Thi\xEAn \u0111\u01B0\u1EDDng bi\u1EC3n \u0111\u1EA3o ng\u1ECDc v\u1EDBi l\xE0n n\u01B0\u1EDBc trong v\u1EAFt nh\xECn th\u1EA5u \u0111\xE1y.",
    iconName: "SunMedium",
    property: {
      basePrice: 260,
      baseRent: 22,
      houseRent: [110, 330, 800, 975, 1150],
      upgradeCost: 150,
      maxLevel: 5,
      district: "Ph\xFA Qu\u1ED1c \u0110\u1EA3o Ng\u1ECDc",
      districtColor: "district-yellow",
      mortgageValue: 130
    },
    gridPosition: TILE_GRID_POSITIONS_40[26]
  },
  // Tile 27: Thị Trấn Hoàng Hôn Sunset
  {
    id: 27,
    name: "Th\u1ECB Tr\u1EA5n Ho\xE0ng H\xF4n Sunset",
    shortName: "Sunset Town",
    type: "PROPERTY",
    description: "Th\u1ECB tr\u1EA5n mang phong c\xE1ch \u0110\u1ECBa Trung H\u1EA3i ng\u1EAFm ho\xE0ng h\xF4n r\u1EF1c r\u1EE1 nh\u1EA5t \u0111\u1EA3o.",
    iconName: "Sunset",
    property: {
      basePrice: 260,
      baseRent: 22,
      houseRent: [110, 330, 800, 975, 1150],
      upgradeCost: 150,
      maxLevel: 5,
      district: "Ph\xFA Qu\u1ED1c \u0110\u1EA3o Ng\u1ECDc",
      districtColor: "district-yellow",
      mortgageValue: 130
    },
    gridPosition: TILE_GRID_POSITIONS_40[27]
  },
  // Tile 28: Điện Lực Quốc Gia EVN
  {
    id: 28,
    name: "\u0110i\u1EC7n L\u1EF1c Qu\u1ED1c Gia EVN",
    shortName: "\u0110i\u1EC7n EVN",
    type: "UTILITY",
    description: "M\u1EA1ng l\u01B0\u1EDBi truy\u1EC1n t\u1EA3i \u0111i\u1EC7n qu\u1ED1c gia. Ti\u1EC1n thu\xEA t\xEDnh theo \u0111i\u1EC3m x\xFAc x\u1EAFc (4x ho\u1EB7c 10x).",
    iconName: "Zap",
    property: {
      basePrice: 150,
      baseRent: 4,
      houseRent: [10],
      upgradeCost: 0,
      maxLevel: 0,
      district: "H\u1EA1 T\u1EA7ng N\u0103ng L\u01B0\u1EE3ng",
      districtColor: "district-utility",
      mortgageValue: 75
    },
    gridPosition: TILE_GRID_POSITIONS_40[28]
  },
  // Tile 29: Thành Phố Không Ngủ Grand World
  {
    id: 29,
    name: "Th\xE0nh Ph\u1ED1 Kh\xF4ng Ng\u1EE7 Grand World",
    shortName: "Grand World",
    type: "PROPERTY",
    description: "T\u1ED5 h\u1EE3p kinh t\u1EBF \u0111\xEAm ph\u1ED3n hoa v\u1EDBi l\u1EC5 h\u1ED9i bi\u1EC3u di\u1EC5n li\xEAn t\u1EE5c 24/7.",
    iconName: "Sparkles",
    property: {
      basePrice: 280,
      baseRent: 24,
      houseRent: [120, 360, 850, 1025, 1200],
      upgradeCost: 150,
      maxLevel: 5,
      district: "Ph\xFA Qu\u1ED1c \u0110\u1EA3o Ng\u1ECDc",
      districtColor: "district-yellow",
      mortgageValue: 140
    },
    gridPosition: TILE_GRID_POSITIONS_40[29]
  },
  // Tile 30: Lệnh Giam Giữ (Vào Tù)
  {
    id: 30,
    name: "L\u1EC7nh Giam Gi\u1EEF (V\xE0o T\xF9)",
    shortName: "V\xE0o T\xF9",
    type: "GO_TO_JAIL",
    description: "B\u1ECB \xE1p gi\u1EA3i th\u1EB3ng v\u1EC1 Khu C\xE1ch Ly T\u1EA1m Giam (Tile 10)! Kh\xF4ng nh\u1EADn l\u01B0\u01A1ng GO.",
    iconName: "ShieldAlert",
    gridPosition: TILE_GRID_POSITIONS_40[30]
  },
  // Tile 31: Phố Cổ Tạ Hiện (Hà Nội)
  {
    id: 31,
    name: "Ph\u1ED1 C\u1ED5 T\u1EA1 Hi\u1EC7n (H\xE0 N\u1ED9i)",
    shortName: "Ph\u1ED1 T\u1EA1 Hi\u1EC7n",
    type: "PROPERTY",
    description: "Ng\xE3 t\u01B0 qu\u1ED1c t\u1EBF ph\u1ED1 c\u1ED5 ng\xE0n n\u0103m, t\u1EE5 \u0111i\u1EC3m gi\u1EA3i tr\xED \u0111\xEAm \u0111\xF4ng \u0111\xFAc c\u1EE7a Th\u1EE7 \u0110\xF4.",
    iconName: "Store",
    property: {
      basePrice: 300,
      baseRent: 26,
      houseRent: [130, 390, 900, 1100, 1275],
      upgradeCost: 200,
      maxLevel: 5,
      district: "H\xE0 N\u1ED9i Ba \u0110\xECnh & Ho\xE0n Ki\u1EBFm",
      districtColor: "district-green",
      mortgageValue: 150
    },
    gridPosition: TILE_GRID_POSITIONS_40[31]
  },
  // Tile 32: Bờ Hồ Hoàn Kiếm (Hà Nội)
  {
    id: 32,
    name: "B\u1EDD H\u1ED3 Ho\xE0n Ki\u1EBFm (H\xE0 N\u1ED9i)",
    shortName: "H\u1ED3 Ho\xE0n Ki\u1EBFm",
    type: "PROPERTY",
    description: "Tr\xE1i tim thi\xEAng li\xEAng c\u1EE7a Th\u0103ng Long H\xE0 N\u1ED9i v\u1EDBi Th\xE1p R\xF9a c\u1ED5 k\xEDnh.",
    iconName: "Landmark",
    property: {
      basePrice: 300,
      baseRent: 26,
      houseRent: [130, 390, 900, 1100, 1275],
      upgradeCost: 200,
      maxLevel: 5,
      district: "H\xE0 N\u1ED9i Ba \u0110\xECnh & Ho\xE0n Ki\u1EBFm",
      districtColor: "district-green",
      mortgageValue: 150
    },
    gridPosition: TILE_GRID_POSITIONS_40[32]
  },
  // Tile 33: Lễ Hội Ngàn Năm Thăng Long
  {
    id: 33,
    name: "L\u1EC5 H\u1ED9i Ng\xE0n N\u0103m Th\u0103ng Long",
    shortName: "L\u1EC5 H\u1ED9i 2",
    type: "CHEST",
    description: "\u0110\u1EA1i l\u1EC5 v\u0103n h\xF3a h\xE0o kh\xED ng\xE0n n\u0103m, \u0111\xF3n nh\u1EADn ph\xFAc l\u1ED9c \u0111\xF4 th\u1ECB.",
    iconName: "Gift",
    gridPosition: TILE_GRID_POSITIONS_40[33]
  },
  // Tile 34: Bán Đảo Tây Hồ (Hà Nội)
  {
    id: 34,
    name: "B\xE1n \u0110\u1EA3o T\xE2y H\u1ED3 (H\xE0 N\u1ED9i)",
    shortName: "T\xE2y H\u1ED3",
    type: "PROPERTY",
    description: "V\xF9ng \u0111\u1EA5t phong th\u1EE7y \u0111\u1EAFc \u0111\u1ECBa n\u01A1i quy t\u1EE5 c\xE1c bi\u1EC7t th\u1EF1 ven h\u1ED3 \u0111\u1EAFt gi\xE1.",
    iconName: "Building",
    property: {
      basePrice: 320,
      baseRent: 28,
      houseRent: [150, 450, 1e3, 1200, 1400],
      upgradeCost: 200,
      maxLevel: 5,
      district: "H\xE0 N\u1ED9i Ba \u0110\xECnh & Ho\xE0n Ki\u1EBFm",
      districtColor: "district-green",
      mortgageValue: 160
    },
    gridPosition: TILE_GRID_POSITIONS_40[34]
  },
  // Tile 35: Sân Bay Quốc Tế Nội Bài - TSN
  {
    id: 35,
    name: "S\xE2n Bay Qu\u1ED1c T\u1EBF N\u1ED9i B\xE0i - TSN",
    shortName: "S\xE2n Bay QT",
    type: "TRANSPORT",
    description: "C\u1EEDa ng\xF5 h\xE0ng kh\xF4ng qu\u1ED1c t\u1EBF \u0111\xF3n h\xE0ng ch\u1EE5c tri\u1EC7u l\u01B0\u1EE3t kh\xE1ch to\xE0n c\u1EA7u.",
    iconName: "PlaneTakeoff",
    property: {
      basePrice: 200,
      baseRent: 25,
      houseRent: [50, 100, 200],
      upgradeCost: 0,
      maxLevel: 0,
      district: "Tr\u1EE5c V\u1EADn T\u1EA3i",
      districtColor: "district-transport",
      mortgageValue: 100
    },
    gridPosition: TILE_GRID_POSITIONS_40[35]
  },
  // Tile 36: Cổng Hỗn Loạn Omega
  {
    id: 36,
    name: "C\u1ED5ng H\u1ED7n Lo\u1EA1n Omega",
    shortName: "Chaos \u03A9",
    type: "CHAOS",
    description: "V\xF2ng xo\xE1y Chaos Omega! R\xFAt c\xE1c bi\u1EBFn c\u1ED1 Rare, Calamity v\xE0 Legendary.",
    iconName: "Sparkles",
    gridPosition: TILE_GRID_POSITIONS_40[36]
  },
  // Tile 37: Phố Tài Chính Nguyễn Huệ (Q.1)
  {
    id: 37,
    name: "Ph\u1ED1 T\xE0i Ch\xEDnh Nguy\u1EC5n Hu\u1EC7 (Q.1)",
    shortName: "Nguy\u1EC5n Hu\u1EC7",
    type: "PROPERTY",
    description: "Trung t\xE2m t\xE0i ch\xEDnh v\xE0ng s\u1EA7m u\u1EA5t v\xE0 qu\u1EA3ng tr\u01B0\u1EDDng hoa l\u1EC7 b\u1EADc nh\u1EA5t S\xE0i G\xF2n.",
    iconName: "TrendingUp",
    property: {
      basePrice: 350,
      baseRent: 35,
      houseRent: [175, 500, 1100, 1300, 1500],
      upgradeCost: 200,
      maxLevel: 5,
      district: "TP.HCM S\xE0i G\xF2n Hoa L\u1EC7",
      districtColor: "district-darkblue",
      mortgageValue: 175
    },
    gridPosition: TILE_GRID_POSITIONS_40[37]
  },
  // Tile 38: Thuế Tài Sản Đô Thị Cao Cấp
  {
    id: 38,
    name: "Thu\u1EBF T\xE0i S\u1EA3n \u0110\xF4 Th\u1ECB Cao C\u1EA5p",
    shortName: "Thu\u1EBF T\xE0i S\u1EA3n",
    type: "TAX",
    description: "N\u1ED9p thu\u1EBF t\xE0i s\u1EA3n \u0111\xF4 th\u1ECB cao c\u1EA5p $100 cho c\u01A1 quan thu\u1EBF.",
    iconName: "Receipt",
    taxAmount: 100,
    gridPosition: TILE_GRID_POSITIONS_40[38]
  },
  // Tile 39: Tòa Tháp Landmark 81 & Thủ Thiêm
  {
    id: 39,
    name: "T\xF2a Th\xE1p Landmark 81 & Th\u1EE7 Thi\xEAm",
    shortName: "Landmark 81",
    type: "PROPERTY",
    description: "K\u1EF3 quan ch\u1ECDc tr\u1EDDi cao nh\u1EA5t Vi\u1EC7t Nam v\xE0 trung t\xE2m t\xE0i ch\xEDnh m\u1EDBi Th\u1EE7 Thi\xEAm.",
    iconName: "Building2",
    property: {
      basePrice: 400,
      baseRent: 50,
      houseRent: [200, 600, 1400, 1700, 2e3],
      upgradeCost: 200,
      maxLevel: 5,
      district: "TP.HCM S\xE0i G\xF2n Hoa L\u1EC7",
      districtColor: "district-darkblue",
      mortgageValue: 200
    },
    gridPosition: TILE_GRID_POSITIONS_40[39]
  }
];
var DEFAULT_PLAYER_TOKENS = [
  {
    id: "token-vinfast",
    name: "VinFast VF9",
    symbol: "\u{1F697}",
    colorHex: "#06b6d4",
    // Cyan
    accentHex: "#22d3ee",
    avatarIcon: "Car"
  },
  {
    id: "token-metro",
    name: "Metro Express",
    symbol: "\u{1F686}",
    colorHex: "#ec4899",
    // Fuchsia Pink
    accentHex: "#f472b6",
    avatarIcon: "Train"
  },
  {
    id: "token-meo-than-tai",
    name: "M\xE8o Th\u1EA7n T\xE0i Cyber",
    symbol: "\u{1F431}",
    colorHex: "#eab308",
    // Amber Gold
    accentHex: "#fde047",
    avatarIcon: "Sparkles"
  },
  {
    id: "token-vinasat",
    name: "V\u1EC7 Tinh Vinasat",
    symbol: "\u{1F6F0}\uFE0F",
    colorHex: "#8b5cf6",
    // Violet
    accentHex: "#a78bfa",
    avatarIcon: "Crown"
  }
];
var BOARD_TILES_BY_ID = Object.freeze(
  BOARD_TILES.reduce((acc, tile) => {
    acc[tile.id] = tile;
    return acc;
  }, {})
);
var TILES_BY_DISTRICT = Object.freeze(
  BOARD_TILES.reduce((acc, tile) => {
    if (tile.property?.districtColor) {
      const color = tile.property.districtColor;
      if (!acc[color]) acc[color] = [];
      acc[color].push(tile);
    }
    return acc;
  }, {})
);

// src/utils/money.ts
function formatMoney(amount) {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const body = Math.abs(safe).toLocaleString("en-US");
  return safe < 0 ? `-$${body}` : `$${body}`;
}

// src/game/world-rules/worldRules.ts
var SEASON_CYCLE = 6;
var MARKET_CYCLE = 5;
var DRY_RENT_MULTIPLIER = 1.35;
var DRY_BUILD_MULTIPLIER = 1.15;
var WET_RENT_MULTIPLIER = 0.85;
var WET_BUILD_MULTIPLIER = 0.85;
var MARKET_SELL_RATE_OPEN = 1;
var MARKET_SELL_RATE_CLOSED = 0.75;
var DEFAULT_WORLD_ECONOMIC_PROFILE = {
  inflationRatePerRound: 0.025,
  maxRoundMultiplier: 2.4,
  salaryMultiplier: 1,
  baseLandMultiplier: 1,
  baseBuildMultiplier: 1,
  baseRentMultiplier: 1,
  sellRate: 0.75,
  mortgageRate: 0.6
};
var WORLD_ECONOMIC_PROFILES = {
  "modern-metropolis": {
    ...DEFAULT_WORLD_ECONOMIC_PROFILE
  },
  "cyberpunk-city": {
    inflationRatePerRound: 0.035,
    maxRoundMultiplier: 2.5,
    salaryMultiplier: 1,
    baseLandMultiplier: 1,
    baseBuildMultiplier: 1,
    baseRentMultiplier: 1,
    sellRate: 0.8,
    mortgageRate: 0.6,
    highTierRentThreshold: 3,
    highTierRentMultiplier: 1.15
  },
  "mekong-delta": {
    inflationRatePerRound: 0.015,
    maxRoundMultiplier: 2.1,
    salaryMultiplier: 1.15,
    baseLandMultiplier: 0.9,
    baseBuildMultiplier: 0.95,
    baseRentMultiplier: 0.95,
    sellRate: 0.75,
    mortgageRate: 0.6
  },
  "quang-tri-highlands": {
    inflationRatePerRound: 0.025,
    maxRoundMultiplier: 2.4,
    salaryMultiplier: 1,
    baseLandMultiplier: 1,
    baseBuildMultiplier: 1,
    baseRentMultiplier: 1,
    sellRate: 0.75,
    mortgageRate: 0.6
  },
  "northwest-vietnam": {
    inflationRatePerRound: 0.02,
    maxRoundMultiplier: 2.2,
    salaryMultiplier: 1.05,
    baseLandMultiplier: 1,
    baseBuildMultiplier: 1,
    baseRentMultiplier: 1,
    sellRate: MARKET_SELL_RATE_CLOSED,
    mortgageRate: 0.6
  },
  "space-colony": {
    inflationRatePerRound: 0.015,
    maxRoundMultiplier: 2.2,
    salaryMultiplier: 1,
    baseLandMultiplier: 1,
    baseBuildMultiplier: 1.15,
    baseRentMultiplier: 1,
    sellRate: 0.8,
    mortgageRate: 0.6,
    highTierRentThreshold: 4,
    highTierRentMultiplier: 1.2,
    transportRentMultiplier: 1.2
  }
};
function getWorldEconomicProfile(state) {
  const worldId = state?.config?.worldId ?? "";
  return WORLD_ECONOMIC_PROFILES[worldId] ?? DEFAULT_WORLD_ECONOMIC_PROFILE;
}
function getWorldRules(state) {
  const worldId = state?.config?.worldId ?? "";
  const ws = state?.worldState ?? void 0;
  return {
    worldId,
    seasonPhase: ws?.seasonPhase,
    marketOpen: ws?.marketOpen,
    blockedTiles: ws?.blockedTiles
  };
}
function seasonForRound(roundNumber) {
  const r = Math.max(1, Math.floor(roundNumber || 1));
  return Math.floor((r - 1) / SEASON_CYCLE) % 2 === 0 ? "DRY" : "WET";
}
function marketOpenForRound(roundNumber) {
  return Math.max(1, Math.floor(roundNumber || 1)) % MARKET_CYCLE === 0;
}
function inflationRatePerRound(state) {
  return getWorldEconomicProfile(state).inflationRatePerRound;
}
function maxRoundMultiplier(state) {
  return getWorldEconomicProfile(state).maxRoundMultiplier;
}
function salaryMultiplier(state) {
  return getWorldEconomicProfile(state).salaryMultiplier;
}
function landMultiplier(state) {
  return getWorldEconomicProfile(state).baseLandMultiplier;
}
function mortgageRate(state) {
  return getWorldEconomicProfile(state).mortgageRate;
}
function rentMultiplier(state, tileLevel = 0, tileType) {
  const rules = getWorldRules(state);
  const profile = getWorldEconomicProfile(state);
  let mult = profile.baseRentMultiplier;
  if (rules.worldId === "quang-tri-highlands" && rules.seasonPhase) {
    mult *= rules.seasonPhase === "DRY" ? DRY_RENT_MULTIPLIER : WET_RENT_MULTIPLIER;
  }
  if (profile.highTierRentThreshold !== void 0 && profile.highTierRentMultiplier !== void 0 && tileLevel >= profile.highTierRentThreshold) {
    mult *= profile.highTierRentMultiplier;
  } else if (profile.transportRentMultiplier !== void 0 && tileType === "TRANSPORT") {
    mult *= profile.transportRentMultiplier;
  }
  return Number(mult.toFixed(4));
}
function buyMultiplier(state) {
  const rules = getWorldRules(state);
  let mult = getWorldEconomicProfile(state).baseLandMultiplier;
  if (rules.worldId === "quang-tri-highlands" && rules.seasonPhase) {
    mult *= rules.seasonPhase === "DRY" ? DRY_BUILD_MULTIPLIER : WET_BUILD_MULTIPLIER;
  }
  return Number(mult.toFixed(4));
}
function buildMultiplier(state) {
  const rules = getWorldRules(state);
  let mult = getWorldEconomicProfile(state).baseBuildMultiplier;
  if (rules.worldId === "quang-tri-highlands" && rules.seasonPhase) {
    mult *= rules.seasonPhase === "DRY" ? DRY_BUILD_MULTIPLIER : WET_BUILD_MULTIPLIER;
  }
  return Number(mult.toFixed(4));
}
function sellRate(state) {
  const rules = getWorldRules(state);
  if (rules.worldId === "northwest-vietnam") {
    return rules.marketOpen ? MARKET_SELL_RATE_OPEN : MARKET_SELL_RATE_CLOSED;
  }
  return getWorldEconomicProfile(state).sellRate;
}
function landSellRate(state) {
  return sellRate(state);
}
function tradeAnytime(state) {
  const rules = getWorldRules(state);
  return rules.worldId === "northwest-vietnam" && rules.marketOpen === true;
}
function isTileBlocked(state, tileId) {
  const rules = getWorldRules(state);
  if (rules.worldId !== "quang-tri-highlands") return false;
  return (rules.blockedTiles ?? []).includes(tileId);
}
function advanceWorldRound(previous, nextRound) {
  const worldId = previous?.config?.worldId ?? "";
  if (worldId === "quang-tri-highlands") {
    const season = seasonForRound(nextRound);
    const changed = (previous?.worldState?.seasonPhase ?? null) !== season;
    const logs = [];
    if (changed) {
      logs.push({
        message: season === "DRY" ? "M\xF9a kh\xF4 b\u1EAFt \u0111\u1EA7u t\u1EA1i Cao Nguy\xEAn Qu\u1EA3ng Tr\u1ECB: ti\u1EC1n thu\xEA x1,35, chi ph\xED mua & x\xE2y x1,15." : "M\xF9a m\u01B0a b\u1EAFt \u0111\u1EA7u t\u1EA1i Cao Nguy\xEAn Qu\u1EA3ng Tr\u1ECB: ti\u1EC1n thu\xEA x0,85, chi ph\xED mua & x\xE2y x0,85 (gi\xE1 th\u1EBF ch\u1EA5p gi\u1EEF nguy\xEAn).",
        type: "INFO"
      });
    }
    return { worldState: { seasonPhase: season, blockedTiles: previous?.worldState?.blockedTiles ?? [] }, logs };
  }
  if (worldId === "northwest-vietnam") {
    const open = marketOpenForRound(nextRound);
    const changed = (previous?.worldState?.marketOpen ?? null) !== open;
    const logs = [];
    if (changed) {
      logs.push({
        message: open ? "Phi\xEAn ch\u1EE3 v\xF9ng cao m\u1EDF: giao d\u1ECBch t\u1EF1 do m\u1ECDi l\u01B0\u1EE3t, ho\xE0n ti\u1EC1n b\xE1n \u0111\u1EA5t/c\xF4ng tr\xECnh 100% gi\xE1 th\u1ECB tr\u01B0\u1EDDng!" : "Phi\xEAn ch\u1EE3 v\xF9ng cao k\u1EBFt th\xFAc: giao d\u1ECBch theo l\u01B0\u1EE3t nh\u01B0 th\u01B0\u1EDDng, ho\xE0n ti\u1EC1n b\xE1n \u0111\u1EA5t/c\xF4ng tr\xECnh 75%.",
        type: "INFO"
      });
    }
    return { worldState: { marketOpen: open }, logs };
  }
  return { worldState: null, logs: [] };
}

// src/game/economy/economicModifiers.ts
var START_SALARY_GROWTH_PER_ROUND = 0.015;
var START_SALARY_GROWTH_MAX = 1.6;
var DEFAULT_MORTGAGE_RATIO = 0.6;
var DEFAULT_CHAOS_MODIFIERS = {
  reverseDirectionTurns: 0,
  marketFrozenTurns: 0,
  goldenHourTurns: 0,
  curfewTurns: 0,
  transportBoomTurns: 0,
  utilityBoomTurns: 0,
  districtBoomTurns: 0,
  alienMothershipTurns: 0,
  interestHikeTurns: 0,
  subsidizedMortgageTurns: 0
};
function getRoundSalaryMultiplier(roundNumber = 1) {
  const r = Number.isFinite(roundNumber) && roundNumber > 1 ? Math.floor(roundNumber) : 1;
  return Math.min(START_SALARY_GROWTH_MAX, Number((1 + START_SALARY_GROWTH_PER_ROUND * (r - 1)).toFixed(4)));
}
function calculateSalary(baseSalary, modifiers, roundNumber = 1, world) {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const roundMult = getRoundSalaryMultiplier(roundNumber);
  const worldMult = salaryMultiplier(world);
  const goldenMult = mods.goldenHourTurns > 0 ? 2 : 1;
  return Math.round(baseSalary * roundMult * worldMult * goldenMult);
}
function calculateEffectiveMovement(currentPosition, diceRollSum, modifiers, boardSize = BOARD_SIZE) {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const isCapped = mods.curfewTurns > 0 && diceRollSum > 4;
  const steps = mods.curfewTurns > 0 ? Math.min(diceRollSum, 4) : diceRollSum;
  const isReverse = mods.reverseDirectionTurns > 0;
  if (isReverse) {
    const newPosition2 = ((currentPosition - steps) % boardSize + boardSize) % boardSize;
    const passedStart2 = false;
    return {
      effectiveSteps: steps,
      newPosition: newPosition2,
      passedStart: passedStart2,
      isCapped,
      isReverse: true
    };
  }
  const rawTarget = currentPosition + steps;
  const passedStart = rawTarget >= boardSize;
  const newPosition = rawTarget % boardSize;
  return {
    effectiveSteps: steps,
    newPosition,
    passedStart,
    isCapped,
    isReverse: false
  };
}
function calculateEffectiveMortgageValue(marketOrBasePrice, modifiers, standardRate = DEFAULT_MORTGAGE_RATIO) {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const ratio = mods.subsidizedMortgageTurns > 0 ? Math.max(0.75, standardRate) : standardRate;
  return Math.floor(marketOrBasePrice * ratio);
}
function calculateEffectiveUnmortgageCost(marketOrBasePrice, modifiers, customMortgageValue, standardRate = DEFAULT_MORTGAGE_RATIO) {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const mortgageVal = customMortgageValue ?? Math.floor(marketOrBasePrice * standardRate);
  const interestRatio = mods.interestHikeTurns > 0 ? 1.2 : 1.1;
  return Math.floor(mortgageVal * interestRatio);
}
function isMarketFrozen(modifiers) {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  return mods.marketFrozenTurns > 0;
}

// src/game/property/propertyEngine.ts
function resolveRound(roundNumber, world) {
  if (roundNumber !== void 0 && Number.isFinite(roundNumber)) {
    return Math.max(1, Math.floor(roundNumber));
  }
  const wRound = world?.roundNumber;
  return typeof wRound === "number" && Number.isFinite(wRound) ? Math.max(1, Math.floor(wRound)) : 1;
}
function getTileById(tileId) {
  return BOARD_TILES_BY_ID[tileId];
}
function getTilesInDistrict(districtColor) {
  return TILES_BY_DISTRICT[districtColor] || [];
}
function hasDistrictMonopoly(districtColor, playerId, properties) {
  const districtTiles = getTilesInDistrict(districtColor);
  if (districtTiles.length === 0) return false;
  return districtTiles.every((t) => properties[t.id]?.ownerId === playerId);
}
function getMarketLandValue(tileId, roundNumber, world) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  const r = resolveRound(roundNumber, world);
  return Math.round(tile.property.basePrice * getRoundPriceMultiplier(r, world) * landMultiplier(world));
}
function getMortgageValue(tileId, modifiers, world, roundNumber) {
  const marketLand = getMarketLandValue(tileId, roundNumber, world);
  if (marketLand <= 0) return 0;
  return calculateEffectiveMortgageValue(marketLand, modifiers, mortgageRate(world));
}
function getUnmortgageCost(tileId, modifiers, world, roundNumber) {
  const marketLand = getMarketLandValue(tileId, roundNumber, world);
  if (marketLand <= 0) return 0;
  const stdRate = mortgageRate(world);
  const standardPrincipal = calculateEffectiveMortgageValue(marketLand, void 0, stdRate);
  return calculateEffectiveUnmortgageCost(marketLand, modifiers, standardPrincipal, stdRate);
}
function calculateRent(tileId, properties, rentModifier = 1, diceSum = 7, modifiers) {
  const tile = getTileById(tileId);
  const ownership = properties[tileId];
  if (!tile || !tile.property || !ownership || !ownership.ownerId) {
    return { rentAmount: 0, isMonopoly: false, ownerId: null };
  }
  if (ownership.isMortgaged) {
    return { rentAmount: 0, isMonopoly: false, ownerId: ownership.ownerId };
  }
  const ownerId = ownership.ownerId;
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  if (tileId === 39 && mods.alienMothershipTurns > 0) {
    return { rentAmount: 0, isMonopoly: false, ownerId };
  }
  if (tile.type === "TRANSPORT" || tile.property.districtColor === "district-transport") {
    const transportTiles = getTilesInDistrict("district-transport");
    const ownedTransportCount = transportTiles.filter((t) => properties[t.id]?.ownerId === ownerId).length;
    const transportRentScale = [0, 25, 50, 100, 200];
    let rent2 = transportRentScale[Math.min(ownedTransportCount, 4)] || 25;
    if (mods.transportBoomTurns > 0) {
      rent2 *= 2;
    }
    const finalRent2 = Math.max(1, Math.round(rent2 * rentModifier));
    return {
      rentAmount: finalRent2,
      isMonopoly: ownedTransportCount === transportTiles.length,
      ownerId
    };
  }
  if (tile.type === "UTILITY" || tile.property.districtColor === "district-utility") {
    const utilityTiles = getTilesInDistrict("district-utility");
    const ownedUtilityCount = utilityTiles.filter((t) => properties[t.id]?.ownerId === ownerId).length;
    const multiplier = ownedUtilityCount >= 2 ? 10 : 4;
    let rent2 = multiplier * diceSum;
    if (mods.utilityBoomTurns > 0) {
      rent2 *= 2;
    }
    const finalRent2 = Math.max(1, Math.round(rent2 * rentModifier));
    return {
      rentAmount: finalRent2,
      isMonopoly: ownedUtilityCount === utilityTiles.length,
      ownerId
    };
  }
  const { baseRent, houseRent, districtColor } = tile.property;
  const isMonopoly = hasDistrictMonopoly(districtColor, ownerId, properties);
  let rent = baseRent;
  if (ownership.level > 0) {
    const idx = Math.min(ownership.level - 1, houseRent.length - 1);
    rent = houseRent[idx];
  } else if (isMonopoly) {
    rent = baseRent * 2;
  }
  if (mods.districtBoomTurns > 0 && (districtColor === "district-green" || districtColor === "district-darkblue")) {
    rent = Math.round(rent * 1.5);
  }
  const finalRent = Math.max(1, Math.round(rent * rentModifier));
  return {
    rentAmount: finalRent,
    isMonopoly,
    ownerId
  };
}
var RENT_ESCALATION_START_ROUND = 25;
var RENT_ESCALATION_PER_ROUND = 0.09;
var RENT_ESCALATION_MAX = 8;
function getRentEscalationMultiplier(roundNumber = 1) {
  if (!Number.isFinite(roundNumber) || roundNumber <= RENT_ESCALATION_START_ROUND) return 1;
  const steps = roundNumber - RENT_ESCALATION_START_ROUND;
  return Math.min(RENT_ESCALATION_MAX, 1 + RENT_ESCALATION_PER_ROUND * steps);
}
function getRoundPriceMultiplier(roundNumber = 1, world) {
  const r = Number.isFinite(roundNumber) && roundNumber > 1 ? Math.floor(roundNumber) : 1;
  const rate = inflationRatePerRound(world);
  const cap = maxRoundMultiplier(world);
  return Math.min(cap, Number((1 + rate * (r - 1)).toFixed(4)));
}
function getBuyPrice(tileId, roundNumber, world) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  const r = resolveRound(roundNumber, world);
  return Math.round(tile.property.basePrice * getRoundPriceMultiplier(r, world) * buyMultiplier(world));
}
function getUpgradeCost(tileId, roundNumber, world) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  const r = resolveRound(roundNumber, world);
  return Math.round(tile.property.upgradeCost * getRoundPriceMultiplier(r, world) * buildMultiplier(world));
}
function canBuyProperty(tileId, playerCash, properties, modifiers, roundNumber = 1, world) {
  if (isMarketFrozen(modifiers)) {
    return {
      canBuy: false,
      reason: "Th\u1ECB tr\u01B0\u1EDDng b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang b\u1ECB \u0111\xF3ng b\u0103ng (Freeze Market)! Kh\xF4ng th\u1EC3 mua \u0111\u1EA5t trong v\xF2ng n\xE0y."
    };
  }
  const tile = getTileById(tileId);
  const buyableTypes = ["PROPERTY", "TRANSPORT", "UTILITY"];
  if (!tile || !buyableTypes.includes(tile.type) || !tile.property) {
    return { canBuy: false, reason: "\xD4 n\xE0y kh\xF4ng ph\u1EA3i b\u1EA5t \u0111\u1ED9ng s\u1EA3n c\xF3 th\u1EC3 mua." };
  }
  const ownership = properties[tileId];
  if (ownership && ownership.ownerId !== null) {
    return { canBuy: false, reason: "B\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y \u0111\xE3 c\xF3 ch\u1EE7 s\u1EDF h\u1EEFu." };
  }
  const price = getBuyPrice(tileId, roundNumber, world);
  if (playerCash < price) {
    return {
      canBuy: false,
      reason: `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7. C\u1EA7n ${formatMoney(price)} (B\u1EA1n c\xF3 ${formatMoney(playerCash)}).`
    };
  }
  return { canBuy: true };
}
function canUpgradeProperty(tileId, playerId, playerCash, properties, modifiers, roundNumber, world) {
  if (isMarketFrozen(modifiers)) {
    return {
      canUpgrade: false,
      reason: "Th\u1ECB tr\u01B0\u1EDDng b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang b\u1ECB \u0111\xF3ng b\u0103ng (Freeze Market)! Kh\xF4ng th\u1EC3 x\xE2y d\u1EF1ng ho\u1EB7c n\xE2ng c\u1EA5p c\xF4ng tr\xECnh trong v\xF2ng n\xE0y."
    };
  }
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canUpgrade: false, reason: "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u c\xF4ng tr\xECnh." };
  }
  if (tile.property.maxLevel <= 0) {
    return { canUpgrade: false, reason: "Khu v\u1EF1c n\xE0y (V\u1EADn t\u1EA3i/Ti\u1EC7n \xEDch) kh\xF4ng th\u1EC3 x\xE2y c\xF4ng tr\xECnh n\xE2ng c\u1EA5p." };
  }
  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canUpgrade: false, reason: "B\u1EA1n kh\xF4ng s\u1EDF h\u1EEFu b\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y." };
  }
  if (ownership.level >= tile.property.maxLevel) {
    return { canUpgrade: false, reason: "C\xF4ng tr\xECnh \u0111\xE3 \u0111\u1EA1t c\u1EA5p cao nh\u1EA5t (Landmark 5\u2605)." };
  }
  if (roundNumber !== void 0 && ownership.lastUpgradeRound === roundNumber) {
    return { canUpgrade: false, reason: "C\xF4ng tr\xECnh n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c n\xE2ng c\u1EA5p trong v\xF2ng n\xE0y. M\u1ED7i v\xF2ng ch\u1EC9 n\xE2ng c\u1EA5p m\u1ED9t l\u1EA7n." };
  }
  const upgradeCost = getUpgradeCost(tileId, roundNumber ?? 1, world);
  if (playerCash < upgradeCost) {
    return {
      canUpgrade: false,
      reason: `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7. Ph\xED n\xE2ng c\u1EA5p l\xE0 ${formatMoney(upgradeCost)}.`
    };
  }
  return { canUpgrade: true };
}
function canDowngradeProperty(tileId, playerId, properties, roundNumber, world) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canDowngrade: false, refundAmount: 0, reason: "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u c\xF4ng tr\xECnh." };
  }
  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canDowngrade: false, refundAmount: 0, reason: "B\u1EA1n kh\xF4ng s\u1EDF h\u1EEFu b\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y." };
  }
  if (ownership.level <= 0) {
    return { canDowngrade: false, refundAmount: 0, reason: "\u0110\u1EA5t tr\u1ED1ng, kh\xF4ng c\xF3 c\xF4ng tr\xECnh \u0111\u1EC3 b\xE1n." };
  }
  const r = resolveRound(roundNumber, world);
  const currentUpgradeCost = getUpgradeCost(tileId, r, world);
  const refundAmount = Math.round(currentUpgradeCost * sellRate(world));
  return { canDowngrade: true, refundAmount };
}
function getLandSellValue(tileId, properties, roundNumber, world, modifiers) {
  const r = resolveRound(roundNumber, world);
  const marketLand = getMarketLandValue(tileId, r, world);
  if (marketLand <= 0) return 0;
  const gross = Math.round(marketLand * landSellRate(world));
  const ownership = properties?.[tileId];
  if (ownership?.isMortgaged) {
    const payoff = getUnmortgageCost(tileId, modifiers, world, r);
    return Math.max(0, gross - payoff);
  }
  return gross;
}
function canSellProperty(tileId, playerId, properties, modifiers, roundNumber, world) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canSell: false, sellValue: 0, reason: "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u b\u1EA5t \u0111\u1ED9ng s\u1EA3n." };
  }
  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canSell: false, sellValue: 0, reason: "B\u1EA1n kh\xF4ng s\u1EDF h\u1EEFu b\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y." };
  }
  const districtTiles = getTilesInDistrict(tile.property.districtColor);
  const hasBuildings = districtTiles.some((t) => (properties[t.id]?.level ?? 0) > 0);
  if (hasBuildings) {
    return {
      canSell: false,
      sellValue: 0,
      reason: "Ph\u1EA3i b\xE1n h\u1EBFt c\xF4ng tr\xECnh trong ph\xE2n khu tr\u01B0\u1EDBc khi b\xE1n l\u1EA1i \u0111\u1EA5t cho Ng\xE2n h\xE0ng."
    };
  }
  const r = resolveRound(roundNumber, world);
  const sellValue = getLandSellValue(tileId, properties, r, world, modifiers);
  return { canSell: true, sellValue };
}
function canMortgageProperty(tileId, playerId, properties, modifiers, world, roundNumber) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canMortgage: false, mortgageValue: 0, reason: "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u b\u1EA5t \u0111\u1ED9ng s\u1EA3n." };
  }
  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canMortgage: false, mortgageValue: 0, reason: "B\u1EA1n kh\xF4ng s\u1EDF h\u1EEFu b\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y." };
  }
  if (ownership.isMortgaged) {
    return { canMortgage: false, mortgageValue: 0, reason: "B\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y \u0111\xE3 b\u1ECB c\u1EA7m c\u1ED1 tr\u01B0\u1EDBc \u0111\xF3." };
  }
  const districtTiles = getTilesInDistrict(tile.property.districtColor);
  const hasBuildings = districtTiles.some((t) => (properties[t.id]?.level ?? 0) > 0);
  if (hasBuildings) {
    return {
      canMortgage: false,
      mortgageValue: 0,
      reason: "Ph\u1EA3i b\xE1n to\xE0n b\u1ED9 c\xF4ng tr\xECnh trong ph\xE2n khu v\u1EC1 \u0111\u1EA5t tr\u1ED1ng tr\u01B0\u1EDBc khi c\u1EA7m c\u1ED1."
    };
  }
  const mortgageValue = getMortgageValue(tileId, modifiers, world, roundNumber);
  return { canMortgage: true, mortgageValue };
}
function canUnmortgageProperty(tileId, playerId, playerCash, properties, modifiers, world, roundNumber) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return { canUnmortgage: false, unmortgageCost: 0, reason: "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u b\u1EA5t \u0111\u1ED9ng s\u1EA3n." };
  }
  const ownership = properties[tileId];
  if (!ownership || ownership.ownerId !== playerId) {
    return { canUnmortgage: false, unmortgageCost: 0, reason: "B\u1EA1n kh\xF4ng s\u1EDF h\u1EEFu b\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y." };
  }
  if (!ownership.isMortgaged) {
    return { canUnmortgage: false, unmortgageCost: 0, reason: "B\u1EA5t \u0111\u1ED9ng s\u1EA3n n\xE0y kh\xF4ng b\u1ECB c\u1EA7m c\u1ED1." };
  }
  const unmortgageCost = getUnmortgageCost(tileId, modifiers, world, roundNumber);
  if (playerCash < unmortgageCost) {
    return {
      canUnmortgage: false,
      unmortgageCost,
      reason: `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 gi\u1EA3i ch\u1EA5p. C\u1EA7n ${formatMoney(unmortgageCost)} (B\u1EA1n c\xF3 ${formatMoney(playerCash)}).`
    };
  }
  return { canUnmortgage: true, unmortgageCost };
}

// src/game/economy/ledgerEngine.ts
var globalTxSequence = 1;
function assertMoneyConservation(before, after, entry) {
  const sumBefore = before.reduce((acc, p) => acc + (p.isBankrupt ? 0 : p.cash), 0);
  const sumAfter = after.reduce((acc, p) => acc + (p.isBankrupt ? 0 : p.cash), 0);
  const delta = sumAfter - sumBefore;
  if (entry.fromPlayerId !== "BANK" && entry.toPlayerId !== "BANK") {
    if (delta !== 0) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] P2P tx ${entry.id} altered total cash by ${delta}!`);
    }
  } else if (entry.fromPlayerId === "BANK" && entry.toPlayerId !== "BANK") {
    if (delta !== entry.amount) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] Bank payout tx ${entry.id} expected delta +${entry.amount}, got ${delta}!`);
    }
  } else if (entry.fromPlayerId !== "BANK" && entry.toPlayerId === "BANK") {
    if (delta !== -entry.amount) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] Bank deposit tx ${entry.id} expected delta -${entry.amount}, got ${delta}!`);
    }
  }
}
function executeLedgerTransaction(players, params, ledgerHistory = []) {
  const { category, from, to, roundNumber, tileId, memo, allowPartial, debtCategory } = params;
  const requestedAmount = Math.floor(params.amount);
  if (requestedAmount < 0 || !Number.isFinite(requestedAmount)) {
    return {
      success: false,
      entry: null,
      error: "INVALID_AMOUNT",
      newPlayers: players,
      actualPaid: 0,
      shortfall: 0
    };
  }
  if (from === to) {
    return {
      success: false,
      entry: null,
      error: "IDENTICAL_PARTIES",
      newPlayers: players,
      actualPaid: 0,
      shortfall: 0
    };
  }
  let fromPlayer;
  let fromBalanceBefore;
  if (from !== "BANK") {
    fromPlayer = players.find((p) => p.id === from);
    if (!fromPlayer) {
      return {
        success: false,
        entry: null,
        error: "PLAYER_NOT_FOUND",
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount
      };
    }
    if (fromPlayer.isBankrupt) {
      return {
        success: false,
        entry: null,
        error: "PLAYER_BANKRUPT",
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount
      };
    }
    fromBalanceBefore = fromPlayer.cash;
  }
  let toPlayer;
  let toBalanceBefore;
  if (to !== "BANK") {
    toPlayer = players.find((p) => p.id === to);
    if (!toPlayer) {
      return {
        success: false,
        entry: null,
        error: "PLAYER_NOT_FOUND",
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount
      };
    }
    if (toPlayer.isBankrupt) {
      return {
        success: false,
        entry: null,
        error: "PLAYER_BANKRUPT",
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount
      };
    }
    toBalanceBefore = toPlayer.cash;
  }
  let actualPaid = requestedAmount;
  let shortfall = 0;
  if (fromPlayer) {
    if (fromPlayer.cash < requestedAmount) {
      if (!allowPartial) {
        return {
          success: false,
          entry: null,
          error: "INSUFFICIENT_FUNDS",
          newPlayers: players,
          actualPaid: 0,
          shortfall: requestedAmount - fromPlayer.cash
        };
      }
      actualPaid = Math.max(0, fromPlayer.cash);
      shortfall = requestedAmount - actualPaid;
    }
  }
  const fromBalanceAfter = fromPlayer !== void 0 ? fromPlayer.cash - actualPaid : void 0;
  const toBalanceAfter = toPlayer !== void 0 ? toPlayer.cash + actualPaid : void 0;
  const isRentAttributable = category === "RENT_PAYMENT" || category === "DEBT_SETTLEMENT" && debtCategory === "RENT_PAYMENT" || category === "DEBT_SETTLEMENT" && debtCategory !== "TAX_PAYMENT" && from !== "BANK" && to !== "BANK";
  const newPlayers = players.map((p) => {
    if (p.id === from) {
      const updatedRentPaid = isRentAttributable ? p.stats.rentPaid + actualPaid : p.stats.rentPaid;
      return {
        ...p,
        cash: Math.max(0, p.cash - actualPaid),
        stats: {
          ...p.stats,
          rentPaid: updatedRentPaid
        }
      };
    }
    if (p.id === to) {
      const updatedRentCollected = isRentAttributable ? p.stats.rentCollected + actualPaid : p.stats.rentCollected;
      return {
        ...p,
        cash: p.cash + actualPaid,
        stats: {
          ...p.stats,
          rentCollected: updatedRentCollected
        }
      };
    }
    return p;
  });
  const nextSeq = ledgerHistory.length > 0 ? ledgerHistory[ledgerHistory.length - 1].sequence + 1 : globalTxSequence++;
  const entry = {
    id: `tx-${Date.now()}-${nextSeq}`,
    sequence: nextSeq,
    timestamp: Date.now(),
    roundNumber,
    category,
    fromPlayerId: from,
    toPlayerId: to,
    amount: actualPaid,
    tileId,
    balanceBefore: { from: fromBalanceBefore, to: toBalanceBefore },
    balanceAfter: { from: fromBalanceAfter, to: toBalanceAfter },
    memo
  };
  assertMoneyConservation(players, newPlayers, entry);
  return {
    success: true,
    entry,
    newPlayers,
    actualPaid,
    shortfall
  };
}

// src/game/sound/soundEmitter.ts
var activeSoundListener = null;
function emitSound(effect) {
  if (activeSoundListener) {
    try {
      activeSoundListener(effect);
    } catch {
    }
  }
}

// src/game/auction/auctionEngine.ts
var MIN_BID_INCREMENT = 10;
function initiateAuction(state, propertyId) {
  if (state.status !== "PLAYING" || state.activeAuction) {
    return state;
  }
  if (isMarketFrozen(state.chaosModifiers)) {
    return state;
  }
  const activePlayer = state.players[state.activePlayerIndex];
  const targetTileId = propertyId !== void 0 ? propertyId : activePlayer?.position;
  if (targetTileId === void 0) return state;
  const tile = getTileById(targetTileId);
  const buyableTypes = ["PROPERTY", "TRANSPORT", "UTILITY"];
  if (!tile || !buyableTypes.includes(tile.type) || !tile.property) {
    return state;
  }
  const ownership = state.properties[targetTileId];
  if (ownership && ownership.ownerId !== null) {
    return state;
  }
  const openingBid = Math.max(10, Math.floor(tile.property.basePrice * 0.5));
  const orderedPlayers = [
    ...state.players.slice(state.activePlayerIndex),
    ...state.players.slice(0, state.activePlayerIndex)
  ].filter((p) => !p.isBankrupt);
  const activeBidderIds = orderedPlayers.map((p) => p.id);
  if (activeBidderIds.length === 0) {
    return state;
  }
  const auction = {
    propertyId: targetTileId,
    openingBid,
    highestBid: 0,
    highestBidderId: null,
    currentTurnBidderId: activeBidderIds[0],
    activeBidderIds,
    passedBidderIds: [],
    status: "ACTIVE"
  };
  emitSound("diceRoll");
  return {
    ...state,
    turnPhase: "AUCTION",
    activeAuction: auction,
    lastSoundEffect: "diceRoll",
    logs: [
      {
        id: `auction-start-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer?.id,
        playerName: activePlayer?.name,
        message: `[\u0110\u1EA4U GI\xC1 C\xD4NG KHAI] M\u1EDF phi\xEAn \u0111\u1EA5u gi\xE1 b\u1EA5t \u0111\u1ED9ng s\u1EA3n [${tile.name}] v\u1EDBi gi\xE1 kh\u1EDFi \u0111i\u1EC3m ${formatMoney(openingBid)}!`,
        type: "INFO"
      },
      ...state.logs
    ]
  };
}
function placeAuctionBid(state, playerId, bidAmount) {
  const auction = state.activeAuction;
  if (!auction || auction.status !== "ACTIVE" || state.turnPhase !== "AUCTION") {
    return state;
  }
  if (!auction.activeBidderIds.includes(playerId)) {
    return state;
  }
  const bidder = state.players.find((p) => p.id === playerId);
  if (!bidder || bidder.isBankrupt) {
    return state;
  }
  if (!Number.isFinite(bidAmount) || !Number.isInteger(bidAmount)) {
    return state;
  }
  const minRequiredBid = auction.highestBidderId === null ? auction.openingBid : auction.highestBid + MIN_BID_INCREMENT;
  if (bidAmount < minRequiredBid) {
    return state;
  }
  if (bidder.cash < bidAmount) {
    return state;
  }
  const currentIdx = auction.activeBidderIds.indexOf(playerId);
  const nextIdx = (currentIdx + 1) % auction.activeBidderIds.length;
  const nextBidderId = auction.activeBidderIds[nextIdx];
  const tile = getTileById(auction.propertyId);
  const updatedAuction = {
    ...auction,
    highestBid: bidAmount,
    highestBidderId: playerId,
    currentTurnBidderId: nextBidderId
  };
  const stateWithBid = {
    ...state,
    activeAuction: updatedAuction,
    logs: [
      {
        id: `auction-bid-${Date.now()}-${playerId}`,
        timestamp: Date.now(),
        playerId: bidder.id,
        playerName: bidder.name,
        message: `[\u0110\u1EA4U GI\xC1] ${bidder.name} tr\u1EA3 gi\xE1 ${formatMoney(bidAmount)} cho [${tile?.name || auction.propertyId}].`,
        type: "INFO"
      },
      ...state.logs
    ]
  };
  if (updatedAuction.activeBidderIds.length === 1 && updatedAuction.highestBidderId === playerId) {
    return resolveAuction(stateWithBid);
  }
  return stateWithBid;
}
function passAuctionBid(state, playerId) {
  const auction = state.activeAuction;
  if (!auction || auction.status !== "ACTIVE" || state.turnPhase !== "AUCTION") {
    return state;
  }
  if (!auction.activeBidderIds.includes(playerId)) {
    return state;
  }
  const player = state.players.find((p) => p.id === playerId);
  const tile = getTileById(auction.propertyId);
  const currentIdx = auction.activeBidderIds.indexOf(playerId);
  const remainingBidders = auction.activeBidderIds.filter((id) => id !== playerId);
  const updatedPassedBidders = [...auction.passedBidderIds, playerId];
  const passLog = {
    id: `auction-pass-${Date.now()}-${playerId}`,
    timestamp: Date.now(),
    playerId: player?.id,
    playerName: player?.name,
    message: `[\u0110\u1EA4U GI\xC1] ${player?.name || playerId} b\u1ECF l\u01B0\u1EE3t \u0111\u1EA5u gi\xE1 [${tile?.name || auction.propertyId}].`,
    type: "INFO"
  };
  if (remainingBidders.length === 0) {
    if (auction.highestBidderId !== null && auction.highestBid > 0) {
      return resolveAuction({
        ...state,
        activeAuction: {
          ...auction,
          activeBidderIds: [],
          passedBidderIds: updatedPassedBidders
        },
        logs: [passLog, ...state.logs]
      });
    }
    return {
      ...state,
      turnPhase: "ACTION_MENU",
      activeAuction: null,
      logs: [
        {
          id: `auction-nobid-${Date.now()}`,
          timestamp: Date.now(),
          message: `[K\u1EBET TH\xDAC \u0110\u1EA4U GI\xC1] Kh\xF4ng c\xF3 ai tr\u1EA3 gi\xE1 cho [${tile?.name || auction.propertyId}]. B\u1EA5t \u0111\u1ED9ng s\u1EA3n v\u1EABn thu\u1ED9c v\u1EC1 Ng\xE2n H\xE0ng.`,
          type: "INFO"
        },
        passLog,
        ...state.logs
      ]
    };
  }
  if (remainingBidders.length === 1 && auction.highestBidderId === remainingBidders[0]) {
    return resolveAuction({
      ...state,
      activeAuction: {
        ...auction,
        activeBidderIds: remainingBidders,
        passedBidderIds: updatedPassedBidders,
        currentTurnBidderId: remainingBidders[0]
      },
      logs: [passLog, ...state.logs]
    });
  }
  const nextBidderIdx = currentIdx % remainingBidders.length;
  const nextTurnBidderId = remainingBidders[nextBidderIdx];
  return {
    ...state,
    activeAuction: {
      ...auction,
      activeBidderIds: remainingBidders,
      passedBidderIds: updatedPassedBidders,
      currentTurnBidderId: nextTurnBidderId
    },
    logs: [passLog, ...state.logs]
  };
}
function resolveAuction(state) {
  const auction = state.activeAuction;
  if (!auction || !auction.highestBidderId || auction.highestBid <= 0) {
    return {
      ...state,
      turnPhase: "ACTION_MENU",
      activeAuction: null
    };
  }
  const winnerId = auction.highestBidderId;
  const winningBid = auction.highestBid;
  const propertyId = auction.propertyId;
  const tile = getTileById(propertyId);
  const winner = state.players.find((p) => p.id === winnerId);
  const currentOwnership = state.properties[propertyId];
  if (!winner || winner.isBankrupt || currentOwnership && currentOwnership.ownerId !== null) {
    return {
      ...state,
      turnPhase: "ACTION_MENU",
      activeAuction: null
    };
  }
  const ledgerRes = executeLedgerTransaction(
    state.players,
    {
      category: "AUCTION_WIN",
      from: winnerId,
      to: "BANK",
      amount: winningBid,
      roundNumber: state.roundNumber,
      tileId: propertyId,
      memo: `Th\u1EAFng \u0111\u1EA5u gi\xE1 b\u1EA5t \u0111\u1ED9ng s\u1EA3n [${tile?.name || propertyId}]`
    },
    state.ledger || []
  );
  if (!ledgerRes.success) {
    return {
      ...state,
      turnPhase: "ACTION_MENU",
      activeAuction: null
    };
  }
  const updatedPlayers = ledgerRes.newPlayers.map(
    (p) => p.id === winnerId ? { ...p, stats: { ...p.stats, propertiesOwned: p.stats.propertiesOwned + 1 } } : p
  );
  const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
  const updatedProperties = {
    ...state.properties,
    [propertyId]: {
      ownerId: winnerId,
      level: 0,
      isMortgaged: false
    }
  };
  emitSound("buyProperty");
  return {
    ...state,
    players: updatedPlayers,
    properties: updatedProperties,
    turnPhase: "ACTION_MENU",
    activeAuction: null,
    ledger: updatedLedger,
    ledgerHistory: updatedLedger,
    lastSoundEffect: "buyProperty",
    logs: [
      {
        id: `auction-win-${Date.now()}`,
        timestamp: Date.now(),
        playerId: winner.id,
        playerName: winner.name,
        message: `\u{1F528} [TH\u1EAENG \u0110\u1EA4U GI\xC1] ${winner.name} \u0111\xE3 s\u1EDF h\u1EEFu [${tile?.name || propertyId}] v\u1EDBi m\u1EE9c gi\xE1 ${formatMoney(winningBid)}!`,
        type: "PURCHASE"
      },
      ...state.logs
    ]
  };
}

// src/game/trade/tradeEngine.ts
function validateTradeProposal(state, proposal) {
  if (state.status !== "PLAYING") {
    return { valid: false, reason: "Tr\u1EADn \u0111\u1EA5u ch\u01B0a b\u1EAFt \u0111\u1EA7u ho\u1EB7c \u0111\xE3 k\u1EBFt th\xFAc." };
  }
  const {
    senderPlayerId,
    targetPlayerId,
    offeredCash,
    offeredPropertyIds,
    offeredJailCards,
    requestedCash,
    requestedPropertyIds,
    requestedJailCards
  } = proposal;
  if (!senderPlayerId || !targetPlayerId || senderPlayerId === targetPlayerId) {
    return { valid: false, reason: "Ng\u01B0\u1EDDi g\u1EEDi v\xE0 ng\u01B0\u1EDDi nh\u1EADn giao d\u1ECBch ph\u1EA3i l\xE0 2 ng\u01B0\u1EDDi ch\u01A1i kh\xE1c nhau." };
  }
  const sender = state.players.find((p) => p.id === senderPlayerId);
  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!sender || !target || sender.isBankrupt || target.isBankrupt) {
    return { valid: false, reason: "Kh\xF4ng th\u1EC3 giao d\u1ECBch v\u1EDBi ng\u01B0\u1EDDi ch\u01A1i kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 ph\xE1 s\u1EA3n." };
  }
  if (!Number.isFinite(offeredCash) || !Number.isInteger(offeredCash) || offeredCash < 0 || !Number.isFinite(requestedCash) || !Number.isInteger(requestedCash) || requestedCash < 0) {
    return { valid: false, reason: "S\u1ED1 ti\u1EC1n giao d\u1ECBch ph\u1EA3i l\xE0 s\u1ED1 nguy\xEAn kh\xF4ng \xE2m." };
  }
  if (!Number.isFinite(offeredJailCards) || !Number.isInteger(offeredJailCards) || offeredJailCards < 0 || !Number.isFinite(requestedJailCards) || !Number.isInteger(requestedJailCards) || requestedJailCards < 0) {
    return { valid: false, reason: "S\u1ED1 th\u1EBB mi\u1EC5n giam giao d\u1ECBch kh\xF4ng h\u1EE3p l\u1EC7." };
  }
  const hasOfferedAnything = offeredCash > 0 || offeredPropertyIds.length > 0 || offeredJailCards > 0;
  const hasRequestedAnything = requestedCash > 0 || requestedPropertyIds.length > 0 || requestedJailCards > 0;
  if (!hasOfferedAnything && !hasRequestedAnything) {
    return { valid: false, reason: "Giao d\u1ECBch ph\u1EA3i bao g\u1ED3m \xEDt nh\u1EA5t ti\u1EC1n m\u1EB7t, b\u1EA5t \u0111\u1ED9ng s\u1EA3n ho\u1EB7c th\u1EBB mi\u1EC5n giam." };
  }
  if (sender.cash < offeredCash) {
    return {
      valid: false,
      reason: `${sender.name} kh\xF4ng \u0111\u1EE7 ti\u1EC1n m\u1EB7t \u0111\u1EC3 \u0111\u1EC1 xu\u1EA5t (${formatMoney(offeredCash)} > ${formatMoney(sender.cash)}).`
    };
  }
  if (target.cash < requestedCash) {
    return {
      valid: false,
      reason: `${target.name} kh\xF4ng \u0111\u1EE7 ti\u1EC1n m\u1EB7t \u0111\u1EC3 \u0111\xE1p \u1EE9ng (${formatMoney(requestedCash)} > ${formatMoney(target.cash)}).`
    };
  }
  if ((sender.jailFreeCards || 0) < offeredJailCards) {
    return { valid: false, reason: `${sender.name} kh\xF4ng c\xF3 \u0111\u1EE7 Th\u1EBB Mi\u1EC5n Giam.` };
  }
  if ((target.jailFreeCards || 0) < requestedJailCards) {
    return { valid: false, reason: `${target.name} kh\xF4ng c\xF3 \u0111\u1EE7 Th\u1EBB Mi\u1EC5n Giam.` };
  }
  const uniqueOffered = new Set(offeredPropertyIds);
  const uniqueRequested = new Set(requestedPropertyIds);
  if (uniqueOffered.size !== offeredPropertyIds.length || uniqueRequested.size !== requestedPropertyIds.length) {
    return { valid: false, reason: "Danh s\xE1ch b\u1EA5t \u0111\u1ED9ng s\u1EA3n giao d\u1ECBch b\u1ECB tr\xF9ng l\u1EB7p." };
  }
  for (const id of offeredPropertyIds) {
    if (uniqueRequested.has(id)) {
      return { valid: false, reason: "M\u1ED9t b\u1EA5t \u0111\u1ED9ng s\u1EA3n kh\xF4ng th\u1EC3 v\u1EEBa \u0111\u01B0a v\u1EEBa nh\u1EADn." };
    }
  }
  const senderPropCheck = validatePropertiesForTrade(
    state,
    senderPlayerId,
    offeredPropertyIds,
    sender.name
  );
  if (!senderPropCheck.valid) {
    return senderPropCheck;
  }
  const targetPropCheck = validatePropertiesForTrade(
    state,
    targetPlayerId,
    requestedPropertyIds,
    target.name
  );
  if (!targetPropCheck.valid) {
    return targetPropCheck;
  }
  return { valid: true };
}
function validatePropertiesForTrade(state, ownerId, propertyIds, ownerName) {
  for (const tileId of propertyIds) {
    const tile = getTileById(tileId);
    if (!tile || !tile.property) {
      return { valid: false, reason: `\xD4 #${tileId} kh\xF4ng ph\u1EA3i l\xE0 b\u1EA5t \u0111\u1ED9ng s\u1EA3n h\u1EE3p l\u1EC7.` };
    }
    const ownership = state.properties[tileId];
    if (!ownership || ownership.ownerId !== ownerId) {
      return {
        valid: false,
        reason: `${ownerName} kh\xF4ng c\xF2n s\u1EDF h\u1EEFu b\u1EA5t \u0111\u1ED9ng s\u1EA3n [${tile.name}].`
      };
    }
    if (ownership.level > 0) {
      return {
        valid: false,
        reason: `Kh\xF4ng th\u1EC3 giao d\u1ECBch [${tile.name}] v\xEC \u0111ang c\xF3 c\xF4ng tr\xECnh x\xE2y d\u1EF1ng (C\u1EA5p ${ownership.level}\u2605). Ph\u1EA3i b\xE1n h\u1EBFt c\xF4ng tr\xECnh v\u1EC1 \u0111\u1EA5t tr\u1ED1ng tr\u01B0\u1EDBc!`
      };
    }
    const districtTiles = getTilesInDistrict(tile.property.districtColor);
    const builtSibling = districtTiles.find((t) => (state.properties[t.id]?.level ?? 0) > 0);
    if (builtSibling) {
      return {
        valid: false,
        reason: `Quy t\u1EAFc Ph\xE2n Khu Tr\u1ED1ng: Kh\xF4ng th\u1EC3 giao d\u1ECBch [${tile.name}] khi [${builtSibling.name}] c\xF9ng ph\xE2n khu v\u1EABn c\xF2n c\xF4ng tr\xECnh x\xE2y d\u1EF1ng.`
      };
    }
  }
  return { valid: true };
}
function proposeTrade(state, proposalInput) {
  if (state.activeTrade && state.activeTrade.status === "PENDING") {
    return state;
  }
  const validation = validateTradeProposal(state, proposalInput);
  if (!validation.valid) {
    return state;
  }
  const sender = state.players.find((p) => p.id === proposalInput.senderPlayerId);
  const target = state.players.find((p) => p.id === proposalInput.targetPlayerId);
  const proposal = {
    ...proposalInput,
    id: `trade-${Date.now()}-${state.roundNumber}`,
    status: "PENDING",
    createdAt: Date.now()
  };
  return {
    ...state,
    activeTrade: proposal,
    logs: [
      {
        id: `log-trade-propose-${Date.now()}`,
        timestamp: Date.now(),
        playerId: sender?.id,
        playerName: sender?.name,
        message: `\u{1F91D} [\u0110\u1EC0 XU\u1EA4T GIAO D\u1ECACH] ${sender?.name} g\u1EEDi l\u1EDDi m\u1EDDi th\u01B0\u01A1ng l\u01B0\u1EE3ng t\xE0i s\u1EA3n t\u1EDBi ${target?.name}.`,
        type: "INFO"
      },
      ...state.logs
    ]
  };
}
function getTradeResponderId(trade) {
  return trade.countered ? trade.senderPlayerId : trade.targetPlayerId;
}
function counterTrade(state, adjustment) {
  const trade = state.activeTrade;
  if (!trade || trade.status !== "PENDING" || trade.countered) {
    return state;
  }
  const adjusted = {
    senderPlayerId: trade.senderPlayerId,
    targetPlayerId: trade.targetPlayerId,
    offeredCash: adjustment.offeredCash,
    offeredPropertyIds: trade.offeredPropertyIds,
    offeredJailCards: trade.offeredJailCards,
    requestedCash: adjustment.requestedCash,
    requestedPropertyIds: trade.requestedPropertyIds,
    requestedJailCards: trade.requestedJailCards
  };
  if (adjusted.offeredCash === trade.offeredCash && adjusted.requestedCash === trade.requestedCash) {
    return state;
  }
  const validation = validateTradeProposal(state, adjusted);
  if (!validation.valid) {
    return state;
  }
  const target = state.players.find((p) => p.id === trade.targetPlayerId);
  const sender = state.players.find((p) => p.id === trade.senderPlayerId);
  return {
    ...state,
    activeTrade: {
      ...trade,
      offeredCash: adjusted.offeredCash,
      requestedCash: adjusted.requestedCash,
      countered: true
    },
    logs: [
      {
        id: `log-trade-counter-${Date.now()}`,
        timestamp: Date.now(),
        playerId: target?.id,
        playerName: target?.name,
        message: `\u{1F501} [\u0110I\u1EC0U CH\u1EC8NH GIAO D\u1ECACH] ${target?.name} \u0111i\u1EC1u ch\u1EC9nh ti\u1EC1n m\u1EB7t (${formatMoney(adjusted.offeredCash)} / ${formatMoney(adjusted.requestedCash)}). ${sender?.name} ph\u1EA3n h\u1ED3i m\u1ED9t l\u1EA7n cu\u1ED1i.`,
        type: "INFO"
      },
      ...state.logs
    ]
  };
}
function acceptTrade(state, tradeId) {
  const trade = state.activeTrade;
  if (!trade || trade.status !== "PENDING") {
    return state;
  }
  if (tradeId && trade.id !== tradeId) {
    return state;
  }
  const validation = validateTradeProposal(state, trade);
  if (!validation.valid) {
    return {
      ...state,
      activeTrade: null,
      logs: [
        {
          id: `log-trade-invalid-${Date.now()}`,
          timestamp: Date.now(),
          message: `[GIAO D\u1ECACH H\u1EE6Y B\u1ECE] \u0110\u1EC1 xu\u1EA5t giao d\u1ECBch kh\xF4ng c\xF2n h\u1EE3p l\u1EC7: ${validation.reason}`,
          type: "WARNING"
        },
        ...state.logs
      ]
    };
  }
  let currentPlayers = [...state.players];
  let currentLedger = [...state.ledger || []];
  const sender = currentPlayers.find((p) => p.id === trade.senderPlayerId);
  const target = currentPlayers.find((p) => p.id === trade.targetPlayerId);
  if (trade.offeredCash > 0) {
    const res1 = executeLedgerTransaction(
      currentPlayers,
      {
        category: "TRADE_CASH",
        from: trade.senderPlayerId,
        to: trade.targetPlayerId,
        amount: trade.offeredCash,
        roundNumber: state.roundNumber,
        memo: `Chuy\u1EC3n ti\u1EC1n giao d\u1ECBch th\u01B0\u01A1ng m\u1EA1i t\u1EEB ${sender.name} sang ${target.name}`
      },
      currentLedger
    );
    if (!res1.success) {
      return { ...state, activeTrade: null };
    }
    currentPlayers = res1.newPlayers;
    if (res1.entry) currentLedger.push(res1.entry);
  }
  if (trade.requestedCash > 0) {
    const res2 = executeLedgerTransaction(
      currentPlayers,
      {
        category: "TRADE_CASH",
        from: trade.targetPlayerId,
        to: trade.senderPlayerId,
        amount: trade.requestedCash,
        roundNumber: state.roundNumber,
        memo: `Chuy\u1EC3n ti\u1EC1n giao d\u1ECBch th\u01B0\u01A1ng m\u1EA1i t\u1EEB ${target.name} sang ${sender.name}`
      },
      currentLedger
    );
    if (!res2.success) {
      return { ...state, activeTrade: null };
    }
    currentPlayers = res2.newPlayers;
    if (res2.entry) currentLedger.push(res2.entry);
  }
  const updatedProperties = { ...state.properties };
  for (const propId of trade.offeredPropertyIds) {
    updatedProperties[propId] = {
      ...updatedProperties[propId],
      ownerId: trade.targetPlayerId,
      level: 0
    };
  }
  for (const propId of trade.requestedPropertyIds) {
    updatedProperties[propId] = {
      ...updatedProperties[propId],
      ownerId: trade.senderPlayerId,
      level: 0
    };
  }
  const netPropsForSender = trade.requestedPropertyIds.length - trade.offeredPropertyIds.length;
  const netPropsForTarget = trade.offeredPropertyIds.length - trade.requestedPropertyIds.length;
  const netCardsForSender = trade.requestedJailCards - trade.offeredJailCards;
  const netCardsForTarget = trade.offeredJailCards - trade.requestedJailCards;
  currentPlayers = currentPlayers.map((p) => {
    if (p.id === trade.senderPlayerId) {
      return {
        ...p,
        jailFreeCards: Math.max(0, (p.jailFreeCards || 0) + netCardsForSender),
        stats: {
          ...p.stats,
          propertiesOwned: Math.max(0, p.stats.propertiesOwned + netPropsForSender)
        }
      };
    }
    if (p.id === trade.targetPlayerId) {
      return {
        ...p,
        jailFreeCards: Math.max(0, (p.jailFreeCards || 0) + netCardsForTarget),
        stats: {
          ...p.stats,
          propertiesOwned: Math.max(0, p.stats.propertiesOwned + netPropsForTarget)
        }
      };
    }
    return p;
  });
  emitSound("buyProperty");
  return {
    ...state,
    players: currentPlayers,
    properties: updatedProperties,
    activeTrade: null,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    lastSoundEffect: "buyProperty",
    logs: [
      {
        id: `log-trade-accept-${Date.now()}`,
        timestamp: Date.now(),
        playerId: target.id,
        playerName: target.name,
        message: `\u2705 [GIAO D\u1ECACH TH\xC0NH C\xD4NG] ${sender.name} v\xE0 ${target.name} \u0111\xE3 ho\xE0n t\u1EA5t h\u1EE3p \u0111\u1ED3ng trao \u0111\u1ED5i t\xE0i s\u1EA3n!`,
        type: "PURCHASE"
      },
      ...state.logs
    ]
  };
}
function rejectTrade(state, tradeId) {
  const trade = state.activeTrade;
  if (!trade || trade.status !== "PENDING") {
    return state;
  }
  if (tradeId && trade.id !== tradeId) {
    return state;
  }
  const target = state.players.find((p) => p.id === trade.targetPlayerId);
  const sender = state.players.find((p) => p.id === trade.senderPlayerId);
  return {
    ...state,
    activeTrade: null,
    logs: [
      {
        id: `log-trade-reject-${Date.now()}`,
        timestamp: Date.now(),
        playerId: target?.id,
        playerName: target?.name,
        message: `\u274C [T\u1EEA CH\u1ED0I GIAO D\u1ECACH] ${target?.name} \u0111\xE3 t\u1EEB ch\u1ED1i l\u1EDDi \u0111\u1EC1 ngh\u1ECB th\u01B0\u01A1ng l\u01B0\u1EE3ng c\u1EE7a ${sender?.name}.`,
        type: "INFO"
      },
      ...state.logs
    ]
  };
}
function cancelTrade(state, tradeId) {
  const trade = state.activeTrade;
  if (!trade || trade.status !== "PENDING") {
    return state;
  }
  if (tradeId && trade.id !== tradeId) {
    return state;
  }
  const sender = state.players.find((p) => p.id === trade.senderPlayerId);
  return {
    ...state,
    activeTrade: null,
    logs: [
      {
        id: `log-trade-cancel-${Date.now()}`,
        timestamp: Date.now(),
        playerId: sender?.id,
        playerName: sender?.name,
        message: `[H\u1EE6Y GIAO D\u1ECACH] ${sender?.name} \u0111\xE3 r\xFAt l\u1EA1i \u0111\u1EC1 xu\u1EA5t th\u01B0\u01A1ng l\u01B0\u1EE3ng.`,
        type: "INFO"
      },
      ...state.logs
    ]
  };
}

// src/game/ai/aiPersonalities.ts
var AI_PERSONALITIES = {
  TYCOON: {
    id: "TYCOON",
    nameVi: "T\xE0i Phi\u1EC7t B\u1EA5t \u0110\u1ED9ng S\u1EA3n",
    titleVi: "THE TYCOON",
    taglineVi: "Th\xE2u t\xF3m \u0111\u1EA5t v\xE0ng & x\xE2y \u0111\u1EA1i c\xF4ng tr\xECnh",
    descriptionVi: "\u01AFu ti\xEAn mua t\u1ED1i \u0111a b\u1EA5t \u0111\u1ED9ng s\u1EA3n, \u0111\u1EB7c bi\u1EC7t l\xE0 c\xE1c ph\xE2n khu cao c\u1EA5p (H\xE0 N\u1ED9i, TP.HCM, \u0110\xE0 N\u1EB5ng) v\xE0 \u0111\u1EA7u t\u01B0 n\xE2ng c\u1EA5p Landmark 5\u2605 ngay khi \u0111\u1EE7 v\u1ED1n.",
    badgeColor: "#f59e0b",
    // Amber
    iconName: "Building2",
    minReserveRatio: 0.12,
    // Keeps ~$180M minimum buffer; spends aggressively on land
    auctionMaxMultiple: 1.35,
    // Willing to bid up to 135% base price
    monopolyBlockWeight: 1.45,
    acquisitionThreshold: 0.35,
    // Buys almost any affordable property
    upgradeBufferMultiplier: 1.15,
    // Upgrades as soon as cash >= 1.15x upgradeCost + reserve
    tradeFairnessTolerance: -0.05,
    // Will pay a slight premium to complete a monopoly
    predatoryFactor: 0.6,
    chaosAdaptability: 0.85,
    preferredDistricts: ["district-darkblue", "district-green", "district-yellow", "district-red"]
  },
  STRATEGIST: {
    id: "STRATEGIST",
    nameVi: "Nh\xE0 Chi\u1EBFn L\u01B0\u1EE3c \u0110\u1ECBnh L\u01B0\u1EE3ng",
    titleVi: "THE STRATEGIST",
    taglineVi: "T\u1ED1i \u01B0u t\u1EF7 su\u1EA5t sinh l\u1EDDi & ki\u1EC3m so\xE1t r\u1EE7i ro",
    descriptionVi: "T\xEDnh to\xE1n k\u1EF3 v\u1ECDng d\xF2ng ti\u1EC1n (Expected Value), chi ph\xED c\u01A1 h\u1ED9i v\xE0 x\xE1c su\u1EA5t \u0111\u1ED1i th\u1EE7 d\u1EABm v\xE0o \xF4. Ch\u1EC9 \u0111\u1EA7u t\u01B0 khi t\u1EF7 l\u1EC7 l\u1EE3i nhu\u1EADn/r\u1EE7i ro v\u01B0\u1EE3t ng\u01B0\u1EE1ng t\u1ED1i \u01B0u.",
    badgeColor: "#06b6d4",
    // Cyan
    iconName: "BrainCircuit",
    minReserveRatio: 0.25,
    // Keeps ~$375M disciplined reserve
    auctionMaxMultiple: 1.1,
    // Rarely overpays above intrinsic value
    monopolyBlockWeight: 1.6,
    // Strongly values blocking/completing high-ROI sets
    acquisitionThreshold: 0.58,
    // Selective acquisition
    upgradeBufferMultiplier: 1.6,
    // Requires solid reserve before building
    tradeFairnessTolerance: 0.05,
    // Requires positive expected value on trades
    predatoryFactor: 0.5,
    chaosAdaptability: 0.95,
    preferredDistricts: ["district-orange", "district-red", "district-lightblue", "district-transport"]
  },
  SHARK: {
    id: "SHARK",
    nameVi: "C\xE1 M\u1EADp Th\xE2u T\xF3m",
    titleVi: "THE SHARK",
    taglineVi: "\xC9p gi\xE1 \u0111\u1EA5u gi\xE1 & t\u1EADn d\u1EE5ng kh\u1EE7ng ho\u1EA3ng \u0111\u1ED1i th\u1EE7",
    descriptionVi: "\u0110\u1EA5u gi\xE1 quy\u1EBFt li\u1EC7t \u0111\u1EC3 ch\u1EB7n \u0111\u1ED9c quy\u1EC1n c\u1EE7a \u0111\u1ED1i th\u1EE7, \xE9p gi\xE1 khi \u0111\u1ED1i th\u1EE7 c\u1EA1n ti\u1EC1n m\u1EB7t v\xE0 ch\u1EC9 ch\u1EA5p nh\u1EADn c\xE1c th\u01B0\u01A1ng v\u1EE5 mang l\u1EA1i l\u1EE3i th\u1EBF \xE1p \u0111\u1EA3o.",
    badgeColor: "#ef4444",
    // Red
    iconName: "Flame",
    minReserveRatio: 0.18,
    auctionMaxMultiple: 1.45,
    // Aggressive bidder, drives up prices
    monopolyBlockWeight: 1.85,
    // Ruthlessly blocks opponents' monopolies
    acquisitionThreshold: 0.45,
    upgradeBufferMultiplier: 1.3,
    tradeFairnessTolerance: 0.18,
    // Demands a 18%+ surplus advantage in trades
    predatoryFactor: 1,
    // Maximum exploitation of distressed players
    chaosAdaptability: 0.8,
    preferredDistricts: ["district-darkblue", "district-red", "district-orange", "district-transport"]
  },
  SURVIVOR: {
    id: "SURVIVOR",
    nameVi: "B\u1EADc Th\u1EA7y Ph\xF2ng Th\u1EE7 Thanh Kho\u1EA3n",
    titleVi: "THE SURVIVOR",
    taglineVi: "\u01AFu ti\xEAn ti\u1EC1n m\u1EB7t & mi\u1EC5n nhi\u1EC5m ph\xE1 s\u1EA3n",
    descriptionVi: "Lu\xF4n duy tr\xEC qu\u1EF9 d\u1EF1 ph\xF2ng ti\u1EC1n m\u1EB7t l\u1EDBn, ch\u1EE7 \u0111\u1ED9ng th\u1EBF ch\u1EA5p ho\u1EB7c thu h\u1EB9p r\u1EE7i ro khi th\u1ECB tr\u01B0\u1EDDng bi\u1EBFn \u0111\u1ED9ng, ch\u1EDD \u0111\u1ED1i th\u1EE7 t\u1EF1 s\u1EE5p \u0111\u1ED5 v\xEC c\u1EA1n thanh kho\u1EA3n.",
    badgeColor: "#10b981",
    // Emerald
    iconName: "ShieldCheck",
    minReserveRatio: 0.34,
    // High liquidity cushion (~$510M)
    auctionMaxMultiple: 0.95,
    // Buys value bargains in auctions
    monopolyBlockWeight: 1.3,
    acquisitionThreshold: 0.62,
    // Selective low-risk property purchases
    upgradeBufferMultiplier: 1.85,
    // Upgrades when safe liquidity cushion is met
    tradeFairnessTolerance: 0.05,
    predatoryFactor: 0.3,
    chaosAdaptability: 1,
    // Immediately adapts to tax/crash modifiers
    preferredDistricts: ["district-brown", "district-lightblue", "district-pink", "district-utility"]
  },
  CHAOTIC: {
    id: "CHAOTIC",
    nameVi: "K\u1EBB Thao T\xFAng H\u1ED7n Lo\u1EA1n",
    titleVi: "THE CHAOTIC",
    taglineVi: "\u0110\u1EB7t c\u01B0\u1EE3c r\u1EE7i ro cao & b\xF9ng n\u1ED5 theo s\xF3ng Chaos",
    descriptionVi: "Ph\u1EA3n \u1EE9ng c\u1EF1c m\u1EA1nh v\u1EDBi c\xE1c hi\u1EC7u \u1EE9ng Chaos (S\u1ED1t \u0111\u1EA5t, \u0110\u01B0\u1EDDng s\u1EAFt, Gi\u1EDD v\xE0ng), s\u1EB5n s\xE0ng t\u1EA5t tay v\xE0o c\xE1c c\u01A1 h\u1ED9i \u0111\u1ED9t bi\u1EBFn \u0111\u1EC3 l\u1EADt ng\u01B0\u1EE3c th\u1EBF c\u1EDD.",
    badgeColor: "#d946ef",
    // Fuchsia
    iconName: "Zap",
    minReserveRatio: 0.08,
    // Comfortable operating on razor-thin cash
    auctionMaxMultiple: 1.5,
    // Wildly aggressive when Chaos boosts a sector
    monopolyBlockWeight: 1.5,
    acquisitionThreshold: 0.3,
    upgradeBufferMultiplier: 1.05,
    tradeFairnessTolerance: -0.1,
    // Willing to make bold, volatile swaps
    predatoryFactor: 0.75,
    chaosAdaptability: 1.35,
    // Hyper-amplifies Chaos economic modifiers
    preferredDistricts: ["district-transport", "district-utility", "district-yellow", "district-darkblue"]
  },
  DIPLOMAT: {
    id: "DIPLOMAT",
    nameVi: "Nh\xE0 Ngo\u1EA1i Giao Li\xEAn Minh",
    titleVi: "THE DIPLOMAT",
    taglineVi: "H\u1EE3p t\xE1c \u0111\xF4i b\xEAn c\xF9ng c\xF3 l\u1EE3i & ki\u1EC1m ch\u1EBF k\u1EBB d\u1EABn \u0111\u1EA7u",
    descriptionVi: "T\xEDch c\u1EF1c \u0111\u1EC1 xu\u1EA5t c\xE1c th\u01B0\u01A1ng v\u1EE5 trao \u0111\u1ED5i \u0111\xF4i b\xEAn c\xF9ng c\xF3 l\u1EE3i (Win-Win) v\u1EDBi ng\u01B0\u1EDDi ch\u01A1i y\u1EBFu th\u1EBF h\u01A1n \u0111\u1EC3 c\xF9ng ph\xE1t tri\u1EC3n v\xE0 ki\u1EC1m ch\u1EBF ng\u01B0\u1EDDi \u0111ang d\u1EABn \u0111\u1EA7u.",
    badgeColor: "#6366f1",
    // Indigo
    iconName: "Handshake",
    minReserveRatio: 0.2,
    auctionMaxMultiple: 1.05,
    monopolyBlockWeight: 1.35,
    acquisitionThreshold: 0.5,
    upgradeBufferMultiplier: 1.4,
    tradeFairnessTolerance: -0.02,
    // Accepts mutually beneficial fair trades readily
    predatoryFactor: 0.15,
    // Avoids hostility against weaker players; targets leader
    chaosAdaptability: 0.9,
    preferredDistricts: ["district-pink", "district-orange", "district-green", "district-transport"]
  }
};
var AI_PERSONALITY_LIST = Object.values(AI_PERSONALITIES);
var AI_DIFFICULTIES = {
  EASY: {
    id: "EASY",
    nameVi: "D\u1EC5 (T\u1EADp s\u1EF1)",
    descriptionVi: "\u0110\xE1nh gi\xE1 c\u01A1 b\u1EA3n theo gi\xE1 ni\xEAm y\u1EBFt, \xEDt ph\xF2ng th\u1EE7 tr\u01B0\u1EDBc \u0111\u1ED9c quy\u1EC1n c\u1EE7a \u0111\u1ED1i th\u1EE7.",
    lookaheadDepth: 0,
    valuationPrecision: 0.65,
    enableOpponentModeling: false,
    enableSmartNegotiation: false
  },
  NORMAL: {
    id: "NORMAL",
    nameVi: "Trung b\xECnh (Ti\xEAu chu\u1EA9n)",
    descriptionVi: "C\xE2n b\u1EB1ng gi\u1EEFa d\xF2ng ti\u1EC1n thu\xEA k\u1EF3 v\u1ECDng, qu\u1EF9 d\u1EF1 ph\xF2ng an to\xE0n v\xE0 c\u01A1 h\u1ED9i \u0111\u1ED9c quy\u1EC1n.",
    lookaheadDepth: 1,
    valuationPrecision: 0.9,
    enableOpponentModeling: true,
    enableSmartNegotiation: false
  },
  HARD: {
    id: "HARD",
    nameVi: "Kh\xF3 (\u0110\u1EA1i Ki\u1EC7n T\u01B0\u1EDBng)",
    descriptionVi: "Ph\xE2n t\xEDch x\xE1c su\u1EA5t b\xE0n c\u1EDD, m\xF4 h\xECnh h\xF3a \u0111\u1ED1i th\u1EE7, ch\u1EB7n \u0111\u1ED9c quy\u1EC1n v\xE0 th\u01B0\u01A1ng l\u01B0\u1EE3ng \u0111a t\u1EA7ng.",
    lookaheadDepth: 2,
    valuationPrecision: 1,
    enableOpponentModeling: true,
    enableSmartNegotiation: true
  }
};
function getAIPersonalityProfile(id) {
  return AI_PERSONALITIES[id || "STRATEGIST"] || AI_PERSONALITIES.STRATEGIST;
}
function getAIDifficultyConfig(difficulty) {
  return AI_DIFFICULTIES[difficulty || "NORMAL"] || AI_DIFFICULTIES.NORMAL;
}

// src/game/economy/economyEngine.ts
function calculatePlayerNetWorth(player, properties, modifiers, roundNumber, world) {
  if (player.isBankrupt) return 0;
  let totalPropertyVal = 0;
  let totalMortgageDebt = 0;
  for (const [tileIdStr, ownership] of Object.entries(properties)) {
    if (ownership.ownerId === player.id) {
      const tileId = Number(tileIdStr);
      const tile = getTileById(tileId);
      if (tile && tile.property) {
        const base = getMarketLandValue(tileId, roundNumber, world);
        const upgradeVal = ownership.level * getUpgradeCost(tileId, roundNumber, world);
        totalPropertyVal += base + upgradeVal;
        if (ownership.isMortgaged) {
          totalMortgageDebt += getMortgageValue(tileId, modifiers, world, roundNumber);
        }
      }
    }
  }
  return Math.max(0, player.cash + totalPropertyVal - totalMortgageDebt);
}
function liquidateBankruptPlayer(bankruptPlayerId, properties, creditorPlayerId) {
  const updatedProperties = { ...properties };
  for (const [tileIdStr, ownership] of Object.entries(updatedProperties)) {
    if (ownership.ownerId === bankruptPlayerId) {
      const tileId = Number(tileIdStr);
      if (creditorPlayerId) {
        updatedProperties[tileId] = {
          ...ownership,
          ownerId: creditorPlayerId
        };
      } else {
        updatedProperties[tileId] = {
          ownerId: null,
          level: 0,
          isMortgaged: false
        };
      }
    }
  }
  return updatedProperties;
}

// src/game/ai/aiValuation.ts
var TWO_DICE_PROBABILITY = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  7: 6 / 36,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36
};
function calculateNextRollDangerExposure(state, player) {
  if (player.inDetention) {
    return { expectedRentLoss: 0, maxSingleHit: 0 };
  }
  const isReverse = (state.chaosModifiers?.reverseDirectionTurns || 0) > 0;
  const isCurfew = (state.chaosModifiers?.curfewTurns || 0) > 0;
  let expectedRentLoss = 0;
  let maxSingleHit = 0;
  for (let sum = 2; sum <= 12; sum++) {
    const prob = TWO_DICE_PROBABILITY[sum] || 0;
    const effectiveSteps = isCurfew ? Math.min(sum, 4) : sum;
    const rawPos = isReverse ? player.position - effectiveSteps : player.position + effectiveSteps;
    const landingPos = (rawPos % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
    const tile = getTileById(landingPos);
    if (!tile) continue;
    let hit = 0;
    if (tile.type === "TAX") {
      hit = tile.taxAmount || (tile.id === 4 ? 200 : 100);
    } else if (tile.type === "PROPERTY" || tile.type === "TRANSPORT" || tile.type === "UTILITY") {
      const ownership = state.properties[landingPos];
      if (ownership && ownership.ownerId && ownership.ownerId !== player.id && !ownership.isMortgaged) {
        const rentInfo = calculateRent(
          landingPos,
          state.properties,
          state.rentModifier * getRentEscalationMultiplier(state.roundNumber) * rentMultiplier(state, ownership.level, tile.type),
          sum,
          state.chaosModifiers
        );
        hit = rentInfo.rentAmount;
      }
    }
    expectedRentLoss += prob * hit;
    if (hit > maxSingleHit) {
      maxSingleHit = hit;
    }
  }
  return {
    expectedRentLoss: Math.round(expectedRentLoss),
    maxSingleHit
  };
}
function calculateRequiredSafetyReserve(state, player, personalityId, difficultyId) {
  const profile = getAIPersonalityProfile(personalityId || player.aiPersonality);
  const diff = getAIDifficultyConfig(difficultyId || player.aiDifficulty);
  const baseReserve = state.config.startingCash * profile.minReserveRatio;
  if (diff.lookaheadDepth === 0) {
    return Math.round(baseReserve * 0.75);
  }
  const danger = calculateNextRollDangerExposure(state, player);
  const dangerBuffer = diff.lookaheadDepth >= 2 ? Math.min(baseReserve * 0.85, Math.max(danger.expectedRentLoss * 0.85, danger.maxSingleHit * 0.14)) : Math.min(baseReserve * 0.9, danger.expectedRentLoss * 0.95);
  let chaosReserveMultiplier = 1;
  if ((state.chaosModifiers?.interestHikeTurns || 0) > 0) {
    chaosReserveMultiplier += 0.15 * profile.chaosAdaptability;
  }
  if (state.rentModifier > 1) {
    chaosReserveMultiplier += 0.25 * profile.chaosAdaptability;
  }
  return Math.round((baseReserve + dangerBuffer) * chaosReserveMultiplier);
}
function evaluatePropertyForPlayer(state, player, tileId, personalityId, difficultyId) {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) {
    return {
      tileId,
      basePrice: 0,
      intrinsicValue: 0,
      completesOwnMonopoly: false,
      blocksOpponentMonopoly: false,
      blockedOpponentId: null,
      expectedRentPerRound: 0,
      strategicScore: 0
    };
  }
  const profile = getAIPersonalityProfile(personalityId || player.aiPersonality);
  const diff = getAIDifficultyConfig(difficultyId || player.aiDifficulty);
  const { baseRent, districtColor } = tile.property;
  const basePrice = getBuyPrice(tileId, state.roundNumber, state) || tile.property.basePrice;
  const currentUpgradeCost = getUpgradeCost(tileId, state.roundNumber, state) || tile.property.upgradeCost;
  const districtTiles = getTilesInDistrict(districtColor);
  const totalInDistrict = districtTiles.length;
  const ownedBySelf = districtTiles.filter(
    (t) => t.id !== tileId && state.properties[t.id]?.ownerId === player.id
  ).length;
  const completesOwnMonopoly = totalInDistrict > 1 && ownedBySelf === totalInDistrict - 1;
  let blocksOpponentMonopoly = false;
  let blockedOpponentId = null;
  if (totalInDistrict > 1) {
    for (const opp of state.players) {
      if (opp.id === player.id || opp.isBankrupt) continue;
      const ownedByOpp = districtTiles.filter(
        (t) => t.id !== tileId && state.properties[t.id]?.ownerId === opp.id
      ).length;
      if (ownedByOpp === totalInDistrict - 1) {
        blocksOpponentMonopoly = true;
        blockedOpponentId = opp.id;
        break;
      }
    }
  }
  const planningEndRound = state.config.maxRounds > 0 ? state.config.maxRounds : state.roundNumber + 30;
  const remainingRounds = Math.max(3, planningEndRound - state.roundNumber);
  const activeOpponents = Math.max(
    1,
    state.players.filter((p) => !p.isBankrupt && p.id !== player.id).length
  );
  const expectedLandingsPerRound = activeOpponents * 0.14;
  let effectiveRent = baseRent;
  if (tile.type === "TRANSPORT") {
    const transportScale = [25, 50, 100, 200];
    effectiveRent = transportScale[Math.min(ownedBySelf, 3)];
    if ((state.chaosModifiers?.transportBoomTurns || 0) > 0) {
      effectiveRent *= 1.5 * profile.chaosAdaptability;
    }
  } else if (tile.type === "UTILITY") {
    effectiveRent = (ownedBySelf >= 1 ? 10 : 4) * 7;
    if ((state.chaosModifiers?.utilityBoomTurns || 0) > 0) {
      effectiveRent *= 1.4 * profile.chaosAdaptability;
    }
  } else {
    if (completesOwnMonopoly) {
      const potentialRent = player.cash >= basePrice + currentUpgradeCost * 2 ? tile.property.houseRent[1] || baseRent * 3 : baseRent * 2;
      effectiveRent = potentialRent;
    } else if (ownedBySelf > 0) {
      effectiveRent = baseRent * 1.45;
    }
    if ((state.chaosModifiers?.districtBoomTurns || 0) > 0 && (districtColor === "district-green" || districtColor === "district-darkblue")) {
      effectiveRent *= 1.35 * profile.chaosAdaptability;
    }
  }
  effectiveRent *= rentMultiplier(state, completesOwnMonopoly ? 2 : 0, tile.type);
  const expectedRentPerRound = expectedLandingsPerRound * effectiveRent;
  const horizonRounds = Math.min(remainingRounds, 22);
  let intrinsicValue = basePrice * 0.65 + expectedRentPerRound * horizonRounds;
  if (completesOwnMonopoly) {
    intrinsicValue *= 1.65;
  } else if (ownedBySelf > 0) {
    intrinsicValue *= 1.25;
  }
  if (blocksOpponentMonopoly && diff.enableOpponentModeling) {
    intrinsicValue *= profile.monopolyBlockWeight;
  }
  if (profile.preferredDistricts.includes(districtColor)) {
    intrinsicValue *= 1.18;
  }
  if (diff.id === "EASY") {
    intrinsicValue = basePrice * 0.72;
  } else if (diff.id === "HARD") {
    intrinsicValue *= 1.12;
  }
  const roundedIntrinsic = Math.max(10, Math.round(intrinsicValue));
  const strategicScore = Number((roundedIntrinsic / Math.max(1, basePrice)).toFixed(2));
  return {
    tileId,
    basePrice,
    intrinsicValue: roundedIntrinsic,
    completesOwnMonopoly,
    blocksOpponentMonopoly,
    blockedOpponentId,
    expectedRentPerRound: Math.round(expectedRentPerRound),
    strategicScore
  };
}
function getNetWorthStandings(state) {
  const scored = state.players.filter((p) => !p.isBankrupt).map((p) => ({
    playerId: p.id,
    netWorth: calculatePlayerNetWorth(p, state.properties, state.chaosModifiers, state.roundNumber, state)
  })).sort((a, b) => b.netWorth - a.netWorth);
  return scored.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}
function shouldEscapeDetentionImmediately(state, player) {
  const unownedCount = Object.values(state.properties).filter(
    (p) => p.ownerId === null
  ).length;
  const profile = getAIPersonalityProfile(player.aiPersonality);
  const diff = getAIDifficultyConfig(player.aiDifficulty);
  if (unownedCount >= 6 || profile.id === "TYCOON" || profile.id === "CHAOTIC") {
    return {
      shouldEscape: true,
      reasonVi: `C\xF2n ${unownedCount} l\xF4 \u0111\u1EA5t tr\u1ED1ng tr\xEAn b\xE0n c\u1EDD, \u01B0u ti\xEAn tho\xE1t giam s\u1EDBm \u0111\u1EC3 chi\u1EBFm \u0111\u1EA5t.`
    };
  }
  if (diff.lookaheadDepth >= 1 && (profile.id === "SURVIVOR" || profile.id === "STRATEGIST")) {
    const maxedOutDistricts = /* @__PURE__ */ new Set();
    for (const opp of state.players) {
      if (opp.id === player.id || opp.isBankrupt) continue;
      for (const tile of BOARD_TILES) {
        if (tile.property && tile.property.districtColor !== "district-transport" && tile.property.districtColor !== "district-utility" && hasDistrictMonopoly(tile.property.districtColor, opp.id, state.properties)) {
          maxedOutDistricts.add(tile.property.districtColor);
        }
      }
    }
    if (maxedOutDistricts.size >= 2) {
      return {
        shouldEscape: false,
        reasonVi: `B\xE0n c\u1EDD c\xF3 nhi\u1EC1u khu \u0111\u1ED9c quy\u1EC1n nguy hi\u1EC3m c\u1EE7a \u0111\u1ED1i th\u1EE7, t\u1EA1m tr\xFA trong Khu C\xE1ch Ly \u0111\u1EC3 b\u1EA3o to\xE0n v\u1ED1n.`
      };
    }
  }
  return {
    shouldEscape: true,
    reasonVi: `Ch\u1EE7 \u0111\u1ED9ng n\u1ED9p b\u1EA3o l\xE3nh/d\xF9ng th\u1EBB \u0111\u1EC3 ti\u1EBFp t\u1EE5c chu k\u1EF3 kinh doanh.`
  };
}

// src/game/ai/aiNegotiationEngine.ts
function evaluateIncomingTradeForAI(state, targetAI, trade) {
  const validation = validateTradeProposal(state, trade);
  if (!validation.valid) {
    return {
      decision: "REJECT",
      netUtilityForTarget: -999,
      netUtilityForSender: 0,
      reasonVi: `H\u1EE3p \u0111\u1ED3ng kh\xF4ng h\u1EE3p l\u1EC7: ${validation.reason}`
    };
  }
  const sender = state.players.find((p) => p.id === trade.senderPlayerId);
  if (!sender || sender.isBankrupt) {
    return {
      decision: "REJECT",
      netUtilityForTarget: -999,
      netUtilityForSender: 0,
      reasonVi: "\u0110\u1ED1i t\xE1c giao d\u1ECBch kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  const profile = getAIPersonalityProfile(targetAI.aiPersonality);
  const diff = getAIDifficultyConfig(targetAI.aiDifficulty);
  const safetyReserve = calculateRequiredSafetyReserve(state, targetAI);
  const cashAfterTrade = targetAI.cash - trade.requestedCash + trade.offeredCash;
  if (trade.requestedCash > 0 && cashAfterTrade < safetyReserve * 0.75) {
    return {
      decision: "REJECT",
      netUtilityForTarget: -500,
      netUtilityForSender: 0,
      reasonVi: `${targetAI.name} t\u1EEB ch\u1ED1i v\xEC chi tr\u1EA3 ${formatMoney(trade.requestedCash)} s\u1EBD l\xE0m th\u1EE7ng qu\u1EF9 d\u1EF1 ph\xF2ng an to\xE0n (${formatMoney(safetyReserve)}).`
    };
  }
  let valueReceivedByTarget = trade.offeredCash + trade.offeredJailCards * 75;
  let targetGainsMonopoly = false;
  for (const propId of trade.offeredPropertyIds) {
    const val = evaluatePropertyForPlayer(
      state,
      targetAI,
      propId,
      targetAI.aiPersonality,
      targetAI.aiDifficulty
    );
    valueReceivedByTarget += val.intrinsicValue;
    if (val.completesOwnMonopoly) {
      targetGainsMonopoly = true;
    }
  }
  let valueGivenByTarget = trade.requestedCash + trade.requestedJailCards * 75;
  let senderGainsMonopoly = false;
  for (const propId of trade.requestedPropertyIds) {
    const valForTarget = evaluatePropertyForPlayer(
      state,
      targetAI,
      propId,
      targetAI.aiPersonality,
      targetAI.aiDifficulty
    );
    const valForSender = evaluatePropertyForPlayer(
      state,
      sender,
      propId,
      "STRATEGIST",
      "HARD"
    );
    valueGivenByTarget += valForTarget.intrinsicValue;
    if (valForSender.completesOwnMonopoly) {
      senderGainsMonopoly = true;
    }
  }
  const standings = getNetWorthStandings(state);
  const senderRank = standings.find((s) => s.playerId === sender.id)?.rank || 2;
  const targetRank = standings.find((s) => s.playerId === targetAI.id)?.rank || 2;
  if (diff.enableOpponentModeling && senderGainsMonopoly && !targetGainsMonopoly) {
    const monopolyPenalty = diff.id === "HARD" ? 180 : 110;
    valueGivenByTarget += monopolyPenalty;
  }
  if (diff.enableOpponentModeling && senderRank === 1 && targetRank > 1) {
    const leaderPenalty = profile.id === "SHARK" || profile.id === "STRATEGIST" ? 70 : 35;
    valueGivenByTarget += leaderPenalty;
  }
  const netUtilityForTarget = Math.round(valueReceivedByTarget - valueGivenByTarget);
  const baselineScale = Math.max(100, valueGivenByTarget);
  const relativeSurplus = netUtilityForTarget / baselineScale;
  const netUtilityForSender = Math.round(valueGivenByTarget - valueReceivedByTarget);
  if (relativeSurplus >= profile.tradeFairnessTolerance) {
    return {
      decision: "ACCEPT",
      netUtilityForTarget,
      netUtilityForSender,
      reasonVi: `${targetAI.name} (${profile.titleVi}) \u0111\u1ED3ng \xFD th\u01B0\u01A1ng v\u1EE5 (L\u1EE3i \xEDch r\xF2ng \u01B0\u1EDBc t\xEDnh: +${formatMoney(netUtilityForTarget)}).`
    };
  }
  if (diff.enableSmartNegotiation && netUtilityForTarget < 0 && netUtilityForTarget >= -260 && (trade.offeredPropertyIds.length > 0 || trade.requestedPropertyIds.length > 0)) {
    const requiredExtraCash = Math.ceil((Math.abs(netUtilityForTarget) + 30) / 10) * 10;
    const newRequestedFromSender = trade.offeredCash + requiredExtraCash;
    if (sender.cash >= newRequestedFromSender && trade.requestedCash === 0) {
      const counterProposal = {
        senderPlayerId: trade.senderPlayerId,
        targetPlayerId: trade.targetPlayerId,
        offeredCash: newRequestedFromSender,
        offeredPropertyIds: trade.offeredPropertyIds,
        offeredJailCards: trade.offeredJailCards,
        requestedCash: trade.requestedCash,
        requestedPropertyIds: trade.requestedPropertyIds,
        requestedJailCards: trade.requestedJailCards
      };
      if (validateTradeProposal(state, counterProposal).valid) {
        return {
          decision: "COUNTER",
          netUtilityForTarget,
          netUtilityForSender,
          counterProposal,
          reasonVi: `${targetAI.name} (${profile.titleVi}) \u0111\u1EC1 xu\u1EA5t ph\u1EA3n\u1ED3i: y\xEAu c\u1EA7u n\xE2ng m\u1EE9c ti\u1EC1n b\xF9 l\xEAn ${formatMoney(newRequestedFromSender)}.`
        };
      }
    }
  }
  return {
    decision: "REJECT",
    netUtilityForTarget,
    netUtilityForSender,
    reasonVi: `${targetAI.name} (${profile.titleVi}) t\u1EEB ch\u1ED1i v\xEC gi\xE1 tr\u1ECB trao \u0111\u1ED5i b\u1EA5t l\u1EE3i (${netUtilityForTarget}M).`
  };
}
function generateOutboundTradeForAI(state, aiPlayer) {
  if (state.activeTrade) return null;
  const profile = getAIPersonalityProfile(aiPlayer.aiPersonality);
  const diff = getAIDifficultyConfig(aiPlayer.aiDifficulty);
  const safetyReserve = calculateRequiredSafetyReserve(state, aiPlayer);
  if (diff.id === "EASY" && profile.id !== "DIPLOMAT" && profile.id !== "SHARK") {
    return null;
  }
  const isTradable = (tileId) => {
    const tile = getTileById(tileId);
    if (!tile || !tile.property) return false;
    const districtTiles = getTilesInDistrict(tile.property.districtColor);
    return !districtTiles.some((t) => (state.properties[t.id]?.level ?? 0) > 0);
  };
  const aiOwnedIds = Object.keys(state.properties).map(Number).filter((tid) => state.properties[tid]?.ownerId === aiPlayer.id && isTradable(tid));
  const aiSparePropertyIds = aiOwnedIds.filter((tid) => {
    const tile = getTileById(tid);
    if (!tile?.property) return false;
    const siblings = getTilesInDistrict(tile.property.districtColor);
    const ownedCount = siblings.filter((t) => state.properties[t.id]?.ownerId === aiPlayer.id).length;
    return ownedCount === 1 && siblings.length >= 2;
  });
  for (const tidStr of Object.keys(state.properties)) {
    const targetTileId = Number(tidStr);
    const ownership = state.properties[targetTileId];
    if (!ownership || !ownership.ownerId || ownership.ownerId === aiPlayer.id) continue;
    if (!isTradable(targetTileId)) continue;
    const owner = state.players.find((p) => p.id === ownership.ownerId);
    if (!owner || owner.isBankrupt) continue;
    const tile = getTileById(targetTileId);
    if (!tile || !tile.property) continue;
    const districtTiles = getTilesInDistrict(tile.property.districtColor);
    const aiOwnedInDistrict = districtTiles.filter(
      (t) => state.properties[t.id]?.ownerId === aiPlayer.id
    ).length;
    if (aiOwnedInDistrict === 0) continue;
    const valuation = evaluatePropertyForPlayer(
      state,
      aiPlayer,
      targetTileId,
      aiPlayer.aiPersonality,
      aiPlayer.aiDifficulty
    );
    const matchingSpare = aiSparePropertyIds.find((spareId) => {
      const spareTile = getTileById(spareId);
      if (!spareTile?.property) return false;
      const oppSiblings = getTilesInDistrict(spareTile.property.districtColor);
      const oppOwnedCount = oppSiblings.filter(
        (t) => state.properties[t.id]?.ownerId === owner.id
      ).length;
      return oppOwnedCount >= 1 || profile.id === "DIPLOMAT";
    });
    if (matchingSpare !== void 0) {
      const spareTile = getTileById(matchingSpare);
      const priceDiff = (tile.property.basePrice || 100) - (spareTile.property?.basePrice || 100);
      const offeredCash = priceDiff > 0 && aiPlayer.cash - priceDiff >= safetyReserve ? Math.max(0, Math.round(priceDiff)) : 0;
      const proposal = {
        senderPlayerId: aiPlayer.id,
        targetPlayerId: owner.id,
        offeredCash,
        offeredPropertyIds: [matchingSpare],
        offeredJailCards: 0,
        requestedCash: 0,
        requestedPropertyIds: [targetTileId],
        requestedJailCards: 0
      };
      if (validateTradeProposal(state, proposal).valid) {
        return {
          proposal,
          reasonVi: `${aiPlayer.name} (${profile.titleVi}) \u0111\u1EC1 ngh\u1ECB \u0111\u1ED5i [${spareTile.shortName}]${offeredCash > 0 ? ` + ${formatMoney(offeredCash)}` : ""} l\u1EA5y [${tile.shortName}] c\u1EE7a ${owner.name} \u0111\u1EC3 gom nh\xF3m ph\xE2n khu.`
        };
      }
    }
    const disposableCash = aiPlayer.cash - safetyReserve;
    const basePrice = tile.property.basePrice;
    const isOwnerDistressed = owner.cash < 180;
    const offerMultiple = isOwnerDistressed && profile.id === "SHARK" ? 0.95 : valuation.completesOwnMonopoly ? 1.3 : 1.15;
    const cashOffer = Math.round(basePrice * offerMultiple / 10) * 10;
    if (disposableCash >= cashOffer && cashOffer >= 40) {
      const proposal = {
        senderPlayerId: aiPlayer.id,
        targetPlayerId: owner.id,
        offeredCash: cashOffer,
        offeredPropertyIds: [],
        offeredJailCards: 0,
        requestedCash: 0,
        requestedPropertyIds: [targetTileId],
        requestedJailCards: 0
      };
      if (validateTradeProposal(state, proposal).valid) {
        if (diff.enableOpponentModeling) {
          const preview = evaluateIncomingTradeForAI(state, owner, {
            ...proposal,
            id: "preview",
            status: "PENDING",
            createdAt: 0
          });
          if (preview.decision === "REJECT") {
            continue;
          }
        }
        return {
          proposal,
          reasonVi: `${aiPlayer.name} (${profile.titleVi}) \u0111\u1EC1 ngh\u1ECB mua l\u1EA1i [${tile.shortName}] t\u1EEB ${owner.name} v\u1EDBi gi\xE1 ${formatMoney(cashOffer)}.`
        };
      }
    }
  }
  return null;
}

// src/game/business/businessCatalog.ts
var BUSINESS_CATALOG = {
  underground_bar: {
    id: "underground_bar",
    category: "NIGHTLIFE",
    name: "Underground Bar",
    baseRent: 35,
    buildCost: 100,
    synergyTags: ["NIGHTLIFE", "BAR", "ALCOHOL"],
    description: "Qu\xE1n bar ng\u1EA7m n\xE1o nhi\u1EC7t, h\u01B0\u1EDFng l\u1EE3i c\xF9ng ti\u1EC7m c\u1EA7m \u0111\u1ED3 v\xE0 s\xF2ng b\u1EA1c l\xE2n c\u1EADn."
  },
  pawn_shop: {
    id: "pawn_shop",
    category: "FINANCE",
    name: "Pawn Shop",
    baseRent: 30,
    buildCost: 90,
    synergyTags: ["FINANCE", "SHADY", "VALUABLES"],
    description: "Ti\u1EC7m c\u1EA7m \u0111\u1ED3 t\xE0i ch\xEDnh ng\u1EA7m, t\u01B0\u01A1ng h\u1ED7 v\u1EDBi qu\xE1n bar nh\u01B0ng b\u1ECB c\u1EA3nh s\xE1t si\u1EBFt ch\u1EB7t."
  },
  underground_casino: {
    id: "underground_casino",
    category: "NIGHTLIFE",
    name: "Underground Casino",
    baseRent: 90,
    buildCost: 200,
    synergyTags: ["NIGHTLIFE", "GAMBLING", "ILLEGAL"],
    description: "S\xF2ng b\u1EA1c chui si\xEAu l\u1EE3i nhu\u1EADn, nh\u01B0ng b\u1ECB v\xF4 hi\u1EC7u h\xF3a ho\xE0n to\xE0n ($0) n\u1EBFu g\u1EA7n ch\u1ED1t c\u1EA3nh s\xE1t."
  },
  street_food_stall: {
    id: "street_food_stall",
    category: "COMMERCIAL",
    name: "Street Food Stall",
    baseRent: 25,
    buildCost: 60,
    synergyTags: ["COMMERCIAL", "FOOD", "INFORMAL"],
    description: "Qu\u1EA7y \u1EA9m th\u1EF1c \u0111\u01B0\u1EDDng ph\u1ED1, t\u0103ng doanh thu m\u1EA1nh khi n\u1EB1m c\u1EA1nh c\xE1c c\u1EE5m nh\xE0 l\u1ED3ng h\u1ED9p."
  },
  clinic_pharmacy: {
    id: "clinic_pharmacy",
    category: "CIVIC",
    name: "Pharmacy / Clinic",
    baseRent: 50,
    buildCost: 140,
    synergyTags: ["CIVIC", "HEALTH", "ESSENTIAL"],
    description: "Ph\xF2ng kh\xE1m & nh\xE0 thu\u1ED1c d\xE2n sinh, t\u1EA1o c\u1EE5m y t\u1EBF c\u1ED9ng h\u01B0\u1EDFng gia t\u0103ng gi\xE1 tr\u1ECB."
  },
  luxury_boutique: {
    id: "luxury_boutique",
    category: "COMMERCIAL",
    name: "Luxury Boutique",
    baseRent: 80,
    buildCost: 180,
    synergyTags: ["COMMERCIAL", "LUXURY", "RETAIL"],
    description: "C\u1EEDa h\xE0ng xa x\u1EC9 ph\u1EA9m cao c\u1EA5p, b\u1ECB suy gi\u1EA3m kh\xE1ch khi n\u1EB1m g\u1EA7n khu nh\xE0 h\u1ED9p."
  },
  police_checkpoint: {
    id: "police_checkpoint",
    category: "CIVIC",
    name: "Police Checkpoint",
    baseRent: 40,
    buildCost: 120,
    synergyTags: ["CIVIC", "LAW_ENFORCEMENT", "AUTHORITY"],
    description: "Ch\u1ED1t an ninh ki\u1EC3m so\xE1t, v\xF4 hi\u1EC7u h\xF3a s\xF2ng b\u1EA1c chui ($0) v\xE0 gi\u1EA3m 50% ti\u1EC7m c\u1EA7m \u0111\u1ED3."
  },
  security_hq: {
    id: "security_hq",
    category: "CIVIC",
    name: "Security HQ",
    baseRent: 65,
    buildCost: 160,
    synergyTags: ["CIVIC", "SECURITY", "DEFENSE"],
    description: "Tr\u1EE5 s\u1EDF b\u1EA3o an ki\xEAn c\u1ED1, \u0111i\u1EC3m t\u1EF1a ph\xF2ng ng\u1EF1 trong c\xE1c \u0111\u1EE3t b\xF9ng n\u1ED5 kh\u1EE7ng ho\u1EA3ng."
  },
  coffin_home_units: {
    id: "coffin_home_units",
    category: "RESIDENTIAL",
    name: "Coffin Home Units",
    baseRent: 45,
    buildCost: 110,
    synergyTags: ["RESIDENTIAL", "DENSITY", "LOW_INCOME"],
    description: "C\u1EE5m nh\xE0 l\u1ED3ng h\u1ED9p si\xEAu m\u1EADt \u0111\u1ED9, th\xFAc \u0111\u1EA9y h\xE0ng qu\xE1n \u0103n v\u1EB7t nh\u01B0ng k\xE9o gi\u1EA3m h\xE0ng hi\u1EC7u."
  },
  tenement_complex: {
    id: "tenement_complex",
    category: "RESIDENTIAL",
    name: "Tenement Complex",
    baseRent: 75,
    buildCost: 170,
    synergyTags: ["RESIDENTIAL", "HOUSING", "MID_INCOME"],
    description: "Khu chung c\u01B0 thu nh\u1EADp trung b\xECnh, t\u1EA1o d\xF2ng ti\u1EC1n thu\xEA \u1ED5n \u0111\u1ECBnh v\xE0 b\u1EC1n v\u1EEFng."
  }
};

// src/game/graph/spatialGraphEngine.ts
function getEdge(graph, fromNodeId, toNodeId) {
  if (!graph.edges) return void 0;
  const directKey = `${fromNodeId}->${toNodeId}`;
  if (graph.edges[directKey]) return graph.edges[directKey];
  const edgeIdKey = `edge-${fromNodeId}->${toNodeId}`;
  if (graph.edges[edgeIdKey]) return graph.edges[edgeIdKey];
  for (const edge of Object.values(graph.edges)) {
    if (edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId) {
      return edge;
    }
    if (edge.bidirectional && edge.fromNodeId === toNodeId && edge.toNodeId === fromNodeId) {
      return edge;
    }
  }
  return void 0;
}
function createFallbackEdge(fromNodeId, toNodeId) {
  return {
    id: `${fromNodeId}->${toNodeId}`,
    fromNodeId,
    toNodeId,
    type: "MAIN_LOOP",
    stepCost: 1
  };
}
function getValidCandidateEdges(graph, currentNodeId, currentCash) {
  const currentNode = graph.nodes[currentNodeId];
  if (!currentNode) return [];
  if (currentNode.hazardStatus === "COLLAPSED") return [];
  const candidates = [];
  for (const targetId of currentNode.connectedNodeIds) {
    const targetNode = graph.nodes[targetId];
    if (!targetNode) continue;
    if (targetNode.isLocked) continue;
    if (targetNode.hazardStatus === "COLLAPSED") continue;
    const edge = getEdge(graph, currentNodeId, targetId) || createFallbackEdge(currentNodeId, targetId);
    const tollAmount = edge.toll?.currency === "CASH" ? edge.toll.amount : 0;
    const canAffordToll = currentCash === void 0 || tollAmount === 0 || currentCash >= tollAmount;
    if (!canAffordToll) continue;
    candidates.push({
      targetNode,
      edge,
      tollAmount,
      canAffordToll: true
    });
  }
  return candidates;
}
function getValidNextNodes(graph, currentNodeId, currentCash, previousNodeId) {
  const candidates = getValidCandidateEdges(graph, currentNodeId, currentCash);
  let validNodes = candidates.map((c) => c.targetNode);
  if (previousNodeId && validNodes.length > 1) {
    const nonBacktrack = validNodes.filter((n) => n.id !== previousNodeId);
    if (nonBacktrack.length > 0) {
      validNodes = nonBacktrack;
    }
  }
  return validNodes;
}
function stepTraverse(graph, fromNodeId, toNodeId, currentCash) {
  const fromNode = graph.nodes[fromNodeId];
  const toNode = graph.nodes[toNodeId];
  if (!fromNode || !toNode) {
    throw new Error(`stepTraverse: Invalid node ID(s) [from: ${fromNodeId}, to: ${toNodeId}]`);
  }
  if (toNode.isLocked) {
    throw new Error(`stepTraverse: Target node ${toNodeId} is locked by Fog of War (locked or collapsed)`);
  }
  if (toNode.hazardStatus === "COLLAPSED") {
    throw new Error(`stepTraverse: Target node ${toNodeId} is locked or collapsed`);
  }
  if (!fromNode.connectedNodeIds.includes(toNodeId)) {
    throw new Error(`stepTraverse: Invalid traversal: node ${fromNodeId} is not connected to ${toNodeId}`);
  }
  const edge = getEdge(graph, fromNodeId, toNodeId) || createFallbackEdge(fromNodeId, toNodeId);
  const tollAmount = edge.toll?.currency === "CASH" ? edge.toll.amount : 0;
  if (tollAmount > 0 && currentCash < tollAmount) {
    throw new Error(`stepTraverse: Insufficient cash for toll ($${currentCash} available, $${tollAmount} required) on edge ${edge.id}`);
  }
  return {
    nextNodeId: toNodeId,
    tollPaid: tollAmount,
    edge
  };
}
function findShortestPath(graph, startNodeId, targetNodeId, options) {
  if (!graph.nodes[startNodeId] || !graph.nodes[targetNodeId]) return null;
  if (graph.nodes[targetNodeId].isLocked) return null;
  const distances = {};
  const tollsMap = {};
  const previous = {};
  const unvisited = /* @__PURE__ */ new Set();
  for (const nodeId of Object.keys(graph.nodes)) {
    distances[nodeId] = Infinity;
    tollsMap[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  }
  distances[startNodeId] = 0;
  tollsMap[startNodeId] = 0;
  while (unvisited.size > 0) {
    let closestNodeId = null;
    let minDistance = Infinity;
    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        closestNodeId = nodeId;
      }
    }
    if (!closestNodeId || minDistance === Infinity) break;
    if (closestNodeId === targetNodeId) break;
    unvisited.delete(closestNodeId);
    const candidates = getValidCandidateEdges(graph, closestNodeId, options?.maxCash);
    for (const { targetNode, edge, tollAmount } of candidates) {
      if (!unvisited.has(targetNode.id)) continue;
      if (options?.avoidHazards && targetNode.hazardStatus && targetNode.hazardStatus !== "NONE") continue;
      const altDistance = distances[closestNodeId] + (edge.stepCost || 1);
      const altTolls = tollsMap[closestNodeId] + tollAmount;
      if (options?.maxCash !== void 0 && altTolls > options.maxCash) continue;
      if (altDistance < distances[targetNode.id]) {
        distances[targetNode.id] = altDistance;
        tollsMap[targetNode.id] = altTolls;
        previous[targetNode.id] = { nodeId: closestNodeId, edge };
      }
    }
  }
  if (distances[targetNodeId] === Infinity) return null;
  const path4 = [];
  const edges = [];
  let curr = targetNodeId;
  while (curr && curr !== startNodeId) {
    path4.unshift(curr);
    const prevEntry = previous[curr];
    if (prevEntry) {
      edges.unshift(prevEntry.edge);
      curr = prevEntry.nodeId;
    } else {
      break;
    }
  }
  path4.unshift(startNodeId);
  return {
    path: path4,
    totalDistance: distances[targetNodeId],
    totalTolls: tollsMap[targetNodeId],
    edges
  };
}
function hasBranchIntersections(graph) {
  if (!graph || !graph.nodes) return false;
  return Object.values(graph.nodes).some((n) => n.connectedNodeIds.length > 1 || n.isIntersection);
}

// src/game/chaos-engine/trapEngine.ts
var MAX_ACTIVE_TRAPS_PER_PLAYER = 2;
var MAX_PLACEMENT_GRAPH_DISTANCE = 6;
var ROBBERY_PERCENTAGE = 0.2;
var MAX_ROBBERY_AMOUNT = 250;
var SMUGGLER_BOON_REWARD = 150;
var SMUGGLER_BOON_PENALTY = 200;
function canPlaceTrap(trapsOrState, playerId, nodeId, graphParam) {
  if (Array.isArray(trapsOrState)) {
    const traps = trapsOrState;
    const graph2 = graphParam;
    const playerTraps = traps.filter((t) => t.ownerPlayerId === playerId && !t.revealed);
    if (playerTraps.length >= MAX_ACTIVE_TRAPS_PER_PLAYER) {
      return false;
    }
    if (graph2 && graph2.nodes) {
      const node = graph2.nodes[nodeId];
      if (!node || node.isLocked || node.hazardStatus === "COLLAPSED") {
        return false;
      }
    }
    const existingTrap2 = traps.find((t) => t.nodeId === nodeId && !t.revealed);
    if (existingTrap2) {
      return false;
    }
    return true;
  }
  const state = trapsOrState;
  const graph = state.spatialGraph;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isBankrupt) {
    return false;
  }
  const currentTraps = (state.placedTraps || []).filter((t) => t.ownerPlayerId === playerId && !t.revealed);
  if (currentTraps.length >= MAX_ACTIVE_TRAPS_PER_PLAYER) {
    return false;
  }
  if (graph && graph.nodes) {
    const node = graph.nodes[nodeId];
    if (!node || node.isLocked || node.hazardStatus === "COLLAPSED") {
      return false;
    }
  }
  const existingTrap = (state.placedTraps || []).find((t) => t.nodeId === nodeId && !t.revealed);
  if (existingTrap) {
    return false;
  }
  if (graph && graph.nodes) {
    const isOwned = isNodeOwnedByPlayer(state, nodeId, playerId);
    if (!isOwned) {
      const playerPosNode = player.positionNodeId || (player.position !== void 0 ? `node-${player.position}` : graph.startNodeId);
      const pathRes = findShortestPath(graph, playerPosNode, nodeId);
      if (!pathRes || pathRes.totalDistance > MAX_PLACEMENT_GRAPH_DISTANCE) {
        return false;
      }
    }
  }
  return true;
}
function triggerTrapAtNode(state, victimPlayerId, nodeId) {
  const traps = state.placedTraps || [];
  const trapIndex = traps.findIndex((t) => t.nodeId === nodeId && !t.revealed);
  if (trapIndex === -1) {
    return { nextState: state, haltedMovement: false };
  }
  const trap = traps[trapIndex];
  if (victimPlayerId === trap.ownerPlayerId) {
    return { nextState: state, haltedMovement: false };
  }
  const victim = state.players.find((p) => p.id === victimPlayerId);
  const owner = state.players.find((p) => p.id === trap.ownerPlayerId);
  if (!victim || !owner) {
    return { nextState: state, haltedMovement: false };
  }
  const updatedTraps = [...traps];
  const triggeredTrap = { ...trap, revealed: true };
  updatedTraps[trapIndex] = triggeredTrap;
  let currentPlayers = state.players;
  let currentLedger = state.ledger || [];
  let haltedMovement = false;
  const newLogs = [...state.logs];
  switch (trap.trapType) {
    case "ROBBERY": {
      const victimLiquid = Math.max(0, victim.cash);
      const stealAmount = Math.min(Math.floor(victimLiquid * ROBBERY_PERCENTAGE), MAX_ROBBERY_AMOUNT);
      if (stealAmount > 0) {
        const txRes = executeLedgerTransaction(
          currentPlayers,
          {
            category: "CHAOS_EFFECT",
            from: victim.id,
            to: owner.id,
            amount: stealAmount,
            roundNumber: state.roundNumber,
            memo: `B\u1ECB c\u01B0\u1EDBp b\u1EDFi b\u1EABy Robbery ($${stealAmount}M)`
          },
          currentLedger
        );
        if (txRes.success && txRes.entry) {
          currentPlayers = txRes.newPlayers;
          currentLedger = [...currentLedger, txRes.entry];
        }
      }
      newLogs.unshift({
        id: `trap-rob-${Date.now()}`,
        timestamp: Date.now(),
        playerId: victim.id,
        playerName: victim.name,
        message: `\u{1F4A3} [B\u1EAAY C\u01AF\u1EDAP TI\u1EC0N] ${victim.name} \u0111\u1EA1p tr\xFAng b\u1EABy c\u1EE7a ${owner.name}! B\u1ECB c\u01B0\u1EDBp $${stealAmount}M!`,
        type: "CHAOS"
      });
      break;
    }
    case "LOCKDOWN": {
      haltedMovement = true;
      currentPlayers = currentPlayers.map(
        (p) => p.id === victim.id ? { ...p, turnLockTurns: 1 } : p
      );
      newLogs.unshift({
        id: `trap-lock-${Date.now()}`,
        timestamp: Date.now(),
        playerId: victim.id,
        playerName: victim.name,
        message: `\u26D3\uFE0F [B\u1EAAY LOCKDOWN] ${victim.name} \u0111\u1EA1p tr\xFAng b\u1EABy Lockdown! D\u1EEBng b\u01B0\u1EDBc ngay l\u1EADp t\u1EE9c v\xE0 m\u1EA5t 1 l\u01B0\u1EE3t ti\u1EBFp theo!`,
        type: "CHAOS"
      });
      break;
    }
    case "TELEPORT_HAZARD": {
      haltedMovement = true;
      const opponentLandmarkTile = findOpponentLandmarkTile(state, victim.id);
      if (opponentLandmarkTile !== null) {
        const destNodeId = `node-${opponentLandmarkTile}`;
        currentPlayers = currentPlayers.map(
          (p) => p.id === victim.id ? { ...p, position: opponentLandmarkTile, positionNodeId: destNodeId } : p
        );
        newLogs.unshift({
          id: `trap-tele-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `\u{1F300} [B\u1EAAY D\u1ECACH CHUY\u1EC2N] ${victim.name} b\u1ECB d\u1ECBch chuy\u1EC3n t\u1EDBi Landmark \u0111\u1ED1i th\u1EE7 (\xD4 ${opponentLandmarkTile})!`,
          type: "CHAOS"
        });
      } else {
        const detentionNode = state.spatialGraph?.detentionNodeId || "node-10";
        currentPlayers = currentPlayers.map(
          (p) => p.id === victim.id ? { ...p, position: 10, positionNodeId: detentionNode, inDetention: true, detentionTurns: 2, consecutiveDoubles: 0 } : p
        );
        newLogs.unshift({
          id: `trap-tele-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `\u{1F300} [B\u1EAAY D\u1ECACH CHUY\u1EC2N] ${victim.name} b\u1ECB d\u1ECBch chuy\u1EC3n th\u1EB3ng v\xE0o Tr\u1EA1i Giam!`,
          type: "CHAOS"
        });
      }
      break;
    }
    case "SMUGGLER_BOON": {
      const isReward = victim.cash % 2 === 0;
      if (isReward) {
        const txRes = executeLedgerTransaction(
          currentPlayers,
          {
            category: "CHAOS_EFFECT",
            from: "BANK",
            to: victim.id,
            amount: SMUGGLER_BOON_REWARD,
            roundNumber: state.roundNumber,
            memo: `Th\u01B0\u1EDFng R\u01B0\u01A1ng Bu\xF4n L\u1EADu (+$${SMUGGLER_BOON_REWARD}M)`
          },
          currentLedger
        );
        if (txRes.success && txRes.entry) {
          currentPlayers = txRes.newPlayers;
          currentLedger = [...currentLedger, txRes.entry];
        }
        newLogs.unshift({
          id: `trap-smug-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `\u{1F381} [R\u01AF\u01A0NG BU\xD4N L\u1EACU] ${victim.name} m\u1EDF tr\xFAng R\u01B0\u01A1ng Bu\xF4n L\u1EADu! Nh\u1EADn \u0111\u01B0\u1EE3c +$${SMUGGLER_BOON_REWARD}M!`,
          type: "CHAOS"
        });
      } else {
        const penalty = Math.min(victim.cash, SMUGGLER_BOON_PENALTY);
        const txRes = executeLedgerTransaction(
          currentPlayers,
          {
            category: "CHAOS_EFFECT",
            from: victim.id,
            to: "BANK",
            amount: penalty,
            allowPartial: true,
            roundNumber: state.roundNumber,
            memo: `Ph\u1EA1t R\u01B0\u01A1ng Bu\xF4n L\u1EADu ph\xE1t n\u1ED5 (-$${penalty}M)`
          },
          currentLedger
        );
        if (txRes.success && txRes.entry) {
          currentPlayers = txRes.newPlayers;
          currentLedger = [...currentLedger, txRes.entry];
        }
        newLogs.unshift({
          id: `trap-smug-${Date.now()}`,
          timestamp: Date.now(),
          playerId: victim.id,
          playerName: victim.name,
          message: `\u{1F4A5} [R\u01AF\u01A0NG BU\xD4N L\u1EACU] R\u01B0\u01A1ng Bu\xF4n L\u1EADu ph\xE1t n\u1ED5! ${victim.name} b\u1ECB ph\u1EA1t -$${penalty}M!`,
          type: "CHAOS"
        });
      }
      break;
    }
  }
  return {
    nextState: {
      ...state,
      placedTraps: updatedTraps,
      players: currentPlayers,
      ledger: currentLedger,
      ledgerHistory: currentLedger,
      logs: newLogs
    },
    trapTriggered: triggeredTrap,
    haltedMovement
  };
}
function isNodeOwnedByPlayer(state, nodeId, playerId) {
  const numericStr = nodeId.replace(/^(node-|tile-)/, "");
  const numericId = parseInt(numericStr, 10);
  if (!isNaN(numericId) && state.properties[numericId]?.ownerId === playerId) {
    return true;
  }
  const graph = state.spatialGraph;
  if (graph && graph.nodes && graph.nodes[nodeId]?.numericId !== void 0) {
    const nid = graph.nodes[nodeId].numericId;
    return state.properties[nid]?.ownerId === playerId;
  }
  return false;
}
function findOpponentLandmarkTile(state, victimPlayerId) {
  for (const [tileIdStr, prop] of Object.entries(state.properties)) {
    if (prop.ownerId && prop.ownerId !== victimPlayerId && prop.level === 5) {
      return parseInt(tileIdStr, 10);
    }
  }
  return null;
}

// src/game/business/businessSynergyEngine.ts
function getAdjacentNodeIds(graph, nodeId) {
  const node = graph.nodes[nodeId];
  if (!node) return [];
  const neighborIds = /* @__PURE__ */ new Set();
  if (Array.isArray(node.connectedNodeIds)) {
    for (const cid of node.connectedNodeIds) {
      if (cid && cid !== nodeId && graph.nodes[cid]) {
        neighborIds.add(cid);
      }
    }
  }
  if (graph.edges) {
    for (const edge of Object.values(graph.edges)) {
      if (edge.fromNodeId === nodeId && edge.toNodeId !== nodeId && graph.nodes[edge.toNodeId]) {
        neighborIds.add(edge.toNodeId);
      }
      if (edge.toNodeId === nodeId && edge.fromNodeId !== nodeId && graph.nodes[edge.fromNodeId]) {
        neighborIds.add(edge.fromNodeId);
      }
    }
  }
  if (neighborIds.size === 0 && node.numericId !== void 0) {
    const prevTileId = (node.numericId - 1 + 40) % 40;
    const nextTileId = (node.numericId + 1) % 40;
    const prevNodeId = `node-${prevTileId}`;
    const nextNodeId = `node-${nextTileId}`;
    if (graph.nodes[prevNodeId]) neighborIds.add(prevNodeId);
    if (graph.nodes[nextNodeId]) neighborIds.add(nextNodeId);
  }
  return Array.from(neighborIds);
}
function calculateSynergyModifier(targetBusinessId, adjacentBusinessIds) {
  let multiplier = 1;
  let isSuppressed = false;
  const modifierSummary = [];
  for (const adjId of adjacentBusinessIds) {
    if (adjId === "police_checkpoint" && targetBusinessId === "underground_casino") {
      isSuppressed = true;
      multiplier = 0;
      modifierSummary.push("Police Checkpoint completely shuts down Casino ($0 rent)");
      return {
        multiplier: 0,
        isSuppressed: true,
        disabled: true,
        modifierSummary
      };
    }
    if (adjId === "police_checkpoint" && targetBusinessId === "pawn_shop") {
      multiplier *= 0.5;
      modifierSummary.push("Police Checkpoint suppresses Pawn Shop (-50%)");
    }
    if (adjId === "coffin_home_units" && targetBusinessId === "luxury_boutique") {
      multiplier *= 0.6;
      modifierSummary.push("Coffin Home reduces Luxury Boutique foot traffic (-40%)");
    }
    if (targetBusinessId === "underground_bar" && adjId === "pawn_shop" || targetBusinessId === "pawn_shop" && adjId === "underground_bar") {
      multiplier *= 1.25;
      modifierSummary.push("Bar & Pawn Shop mutual synergy (+25%)");
    }
    if (targetBusinessId === "underground_casino" && adjId === "underground_bar") {
      multiplier *= 1.3;
      modifierSummary.push("Bar boosts adjacent Casino patrons (+30%)");
    }
    if (targetBusinessId === "street_food_stall" && adjId === "coffin_home_units") {
      multiplier *= 1.15;
      modifierSummary.push("High density Coffin Homes boost Street Food Stall (+15%)");
    }
    if (targetBusinessId === "clinic_pharmacy" && adjId === "clinic_pharmacy") {
      multiplier *= 1.2;
      modifierSummary.push("Healthcare district synergy (+20%)");
    }
  }
  return {
    multiplier,
    isSuppressed,
    disabled: isSuppressed,
    modifierSummary
  };
}
function calculateBusinessRent(graph, nodeId, options) {
  const node = graph.nodes[nodeId];
  if (!node) return 0;
  if (node.hazardStatus === "FIRE" || node.hazardStatus === "COLLAPSED" || node.isLocked) {
    return 0;
  }
  const business = node.currentBusiness ? BUSINESS_CATALOG[node.currentBusiness.businessId] : void 0;
  let baseRent = business ? business.baseRent : node.property?.baseRent ?? 30;
  if (options?.upgradeTier) {
    const tierRents = [0, 15, 45, 135, 350, 800];
    baseRent = tierRents[Math.min(5, Math.max(1, options.upgradeTier))];
  }
  const adjacentNodeIds = getAdjacentNodeIds(graph, nodeId);
  const adjacentBusinessIds = [];
  for (const adjId of adjacentNodeIds) {
    const adjNode = graph.nodes[adjId];
    if (adjNode?.currentBusiness) {
      adjacentBusinessIds.push(adjNode.currentBusiness.businessId);
    }
  }
  const targetBizId = node.currentBusiness?.businessId ?? "coffin_home_units";
  const { multiplier, isSuppressed } = calculateSynergyModifier(targetBizId, adjacentBusinessIds);
  if (isSuppressed) return 0;
  let totalRent = baseRent * multiplier;
  const floorPlayers = options?.floorPlayers ?? 1;
  const densityMultiplier = 1 + 0.5 * Math.max(0, floorPlayers - 1);
  totalRent *= densityMultiplier;
  if (options?.chaosPhase === "INSTABILITY") {
    totalRent *= 1.1;
  } else if (options?.chaosPhase === "CHAOS") {
    totalRent *= 1.25;
  }
  return Math.round(totalRent);
}
function calculateDynamicBusinessRent(graph, nodeId, state) {
  const node = graph.nodes[nodeId];
  if (!node) return 0;
  const targetFloor = node.floor ?? 0;
  let floorPlayers = 0;
  for (const player of state.players) {
    if (player.isBankrupt) continue;
    const playerNodeId = player.positionNodeId || `node-${player.position}`;
    const pNode = graph.nodes[playerNodeId];
    if (pNode && (pNode.floor ?? 0) === targetFloor) {
      floorPlayers += 1;
    }
  }
  const chaosPhase = state.chaosMeter?.phase ?? "PEACEFUL";
  let upgradeTier;
  if (node.numericId !== void 0 && state.properties[node.numericId]) {
    upgradeTier = state.properties[node.numericId].level;
  } else {
    const numId = parseInt(nodeId.replace(/^(node-|tile-)/, ""), 10);
    if (!isNaN(numId) && state.properties[numId]) {
      upgradeTier = state.properties[numId].level;
    }
  }
  return calculateBusinessRent(graph, nodeId, {
    floorPlayers: Math.max(1, floorPlayers),
    chaosPhase,
    upgradeTier
  });
}

// src/game/ai/aiDecisionEngine.ts
function evaluateAIBranchChoice(options) {
  const { branches, opponentProperties, trapsOnNodes, riskTolerance } = options;
  const utilities = {};
  let bestNodeId = branches[0]?.id ?? "";
  let highestUtility = -Infinity;
  for (const node of branches) {
    const reward = node.property?.baseRent ?? 20;
    const opponentRent = opponentProperties[node.id] ?? 0;
    const hasTrap = trapsOnNodes[node.id] ? 100 : 0;
    const hazard = opponentRent + hasTrap;
    const toll = node.type === "TRANSPORT" ? 50 : 0;
    const alphaRisk = 1.2 - riskTolerance;
    const utility = reward - alphaRisk * hazard - toll;
    utilities[node.id] = Math.round(utility * 100) / 100;
    if (utility > highestUtility) {
      highestUtility = utility;
      bestNodeId = node.id;
    }
  }
  return { chosenNodeId: bestNodeId, utilities };
}
function evaluateAIChokePointTrap(graph, availableNodeIds) {
  let bestNodeId = availableNodeIds[0] ?? "";
  let maxScore = -1;
  for (const nodeId of availableNodeIds) {
    const node = graph.nodes[nodeId];
    if (!node) continue;
    let score = 0;
    if (node.id.includes("ELEV") || node.type === "TRANSPORT") score += 50;
    if (node.id.includes("STAIR")) score += 40;
    if (node.isIntersection) score += 30;
    score += node.connectedNodeIds.length * 5;
    if (score > maxScore) {
      maxScore = score;
      bestNodeId = nodeId;
    }
  }
  return bestNodeId;
}
function evaluateAIAdaptiveBusiness(chaosPhase, adjacentBusinesses) {
  if (chaosPhase === "PEACEFUL") {
    return BUSINESS_CATALOG["underground_casino"];
  }
  if (chaosPhase === "INSTABILITY") {
    const hasCasino = adjacentBusinesses.some((b) => b.id === "underground_casino");
    return hasCasino ? BUSINESS_CATALOG["police_checkpoint"] : BUSINESS_CATALOG["clinic_pharmacy"];
  }
  return BUSINESS_CATALOG["security_hq"];
}
function getActiveAIActor(state) {
  if (state.status !== "PLAYING" || state.turnPhase === "GAME_OVER") {
    return null;
  }
  if (state.activeTrade && state.activeTrade.status === "PENDING") {
    const target = state.players.find((p) => p.id === getTradeResponderId(state.activeTrade));
    if (target && target.isAI && !target.isBankrupt) {
      return target;
    }
    return null;
  }
  if (state.turnPhase === "AUCTION" && state.activeAuction && state.activeAuction.status === "ACTIVE") {
    const bidder = state.players.find(
      (p) => p.id === state.activeAuction?.currentTurnBidderId
    );
    if (bidder && bidder.isAI && !bidder.isBankrupt) {
      return bidder;
    }
    return null;
  }
  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer && activePlayer.isAI && !activePlayer.isBankrupt) {
    return activePlayer;
  }
  return null;
}
function computeNextAIDecision(state, aiActionStepCount = 0) {
  const actor = getActiveAIActor(state);
  if (!actor) return null;
  const profile = getAIPersonalityProfile(actor.aiPersonality);
  const diff = getAIDifficultyConfig(actor.aiDifficulty);
  const makeReason = (actionType, summaryVi, score) => ({
    playerId: actor.id,
    playerName: actor.name,
    personality: profile.id,
    difficulty: diff.id,
    actionType,
    summaryVi,
    score,
    timestamp: Date.now()
  });
  if (state.activeTrade && state.activeTrade.status === "PENDING" && getTradeResponderId(state.activeTrade) === actor.id) {
    const trade = state.activeTrade;
    if (trade.countered) {
      const cashCost = trade.offeredCash - trade.requestedCash;
      const accept = cashCost <= 150 && actor.cash >= trade.offeredCash;
      return {
        action: accept ? { type: "ACCEPT_TRADE", tradeId: trade.id, senderPlayerId: actor.id } : { type: "REJECT_TRADE", tradeId: trade.id, senderPlayerId: actor.id },
        reason: makeReason(
          accept ? "ACCEPT_TRADE" : "REJECT_TRADE",
          accept ? `${actor.name} \u0111\u1ED3ng \xFD v\u1EDBi \u0111i\u1EC1u ch\u1EC9nh ti\u1EC1n (chi ph\xED r\xF2ng ${formatMoney(cashCost)}).` : `${actor.name} t\u1EEB ch\u1ED1i \u0111i\u1EC1u ch\u1EC9nh ti\u1EC1n (chi ph\xED r\xF2ng ${formatMoney(cashCost)} qu\xE1 cao).`,
          0
        )
      };
    }
    const evalResult = evaluateIncomingTradeForAI(state, actor, trade);
    if (evalResult.decision === "ACCEPT") {
      return {
        action: {
          type: "ACCEPT_TRADE",
          tradeId: trade.id,
          senderPlayerId: actor.id
        },
        reason: makeReason("ACCEPT_TRADE", evalResult.reasonVi, evalResult.netUtilityForTarget)
      };
    }
    if (evalResult.decision === "COUNTER" && evalResult.counterProposal && aiActionStepCount < 2) {
      return {
        action: {
          type: "COUNTER_TRADE",
          proposal: evalResult.counterProposal,
          senderPlayerId: actor.id
        },
        reason: makeReason("COUNTER_TRADE", evalResult.reasonVi, evalResult.netUtilityForTarget)
      };
    }
    return {
      action: {
        type: "REJECT_TRADE",
        tradeId: trade.id,
        senderPlayerId: actor.id
      },
      reason: makeReason("REJECT_TRADE", evalResult.reasonVi, evalResult.netUtilityForTarget)
    };
  }
  if (state.turnPhase === "AUCTION" && state.activeAuction && state.activeAuction.status === "ACTIVE" && state.activeAuction.currentTurnBidderId === actor.id) {
    const auction = state.activeAuction;
    const minNextBid = auction.highestBidderId === null ? auction.openingBid : auction.highestBid + MIN_BID_INCREMENT;
    if (actor.cash < minNextBid) {
      return {
        action: {
          type: "PASS_AUCTION_BID",
          playerId: actor.id,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "PASS_AUCTION_BID",
          `${actor.name} b\u1ECF l\u01B0\u1EE3t \u0111\u1EA5u gi\xE1 v\xEC kh\xF4ng \u0111\u1EE7 ti\u1EC1n m\u1EB7t \u0111\u1EB7t m\u1EE9c t\u1ED1i thi\u1EC3u ${formatMoney(minNextBid)}.`
        )
      };
    }
    const valuation = evaluatePropertyForPlayer(
      state,
      actor,
      auction.propertyId,
      profile.id,
      diff.id
    );
    const safetyReserve = calculateRequiredSafetyReserve(state, actor, profile.id, diff.id);
    const maxAffordableBid = Math.max(0, actor.cash - Math.round(safetyReserve * 0.6));
    const diffAuctionFactor = diff.id === "EASY" ? 0.68 : diff.id === "HARD" ? 1.04 : 1;
    let maxWillingBid = Math.round(
      Math.min(
        valuation.intrinsicValue * profile.auctionMaxMultiple * diffAuctionFactor,
        valuation.basePrice * profile.auctionMaxMultiple * diffAuctionFactor * (valuation.completesOwnMonopoly ? 1.35 : 1)
      )
    );
    if (valuation.blocksOpponentMonopoly && diff.enableOpponentModeling) {
      maxWillingBid = Math.max(
        maxWillingBid,
        Math.round(valuation.basePrice * profile.monopolyBlockWeight)
      );
    }
    const effectiveCeiling = Math.min(maxAffordableBid, maxWillingBid);
    if (minNextBid <= effectiveCeiling) {
      const jump = (profile.id === "SHARK" || profile.id === "TYCOON") && minNextBid + 10 <= effectiveCeiling ? 10 : 0;
      const bidAmount = minNextBid + jump;
      const tile = getTileById(auction.propertyId);
      return {
        action: {
          type: "PLACE_AUCTION_BID",
          playerId: actor.id,
          bidAmount,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "PLACE_AUCTION_BID",
          `${actor.name} (${profile.titleVi}) tr\u1EA3 gi\xE1 ${formatMoney(bidAmount)} cho [${tile?.shortName || auction.propertyId}] (\u0110\u1ECBnh gi\xE1 n\u1ED9i t\u1EA1i: ${formatMoney(valuation.intrinsicValue)}).`,
          valuation.strategicScore
        )
      };
    }
    return {
      action: {
        type: "PASS_AUCTION_BID",
        playerId: actor.id,
        senderPlayerId: actor.id
      },
      reason: makeReason(
        "PASS_AUCTION_BID",
        `${actor.name} (${profile.titleVi}) d\u1EEBng tr\u1EA3 gi\xE1 t\u1EA1i ${formatMoney(minNextBid)} v\xEC v\u01B0\u1EE3t ng\u01B0\u1EE1ng an to\xE0n (${formatMoney(effectiveCeiling)}).`,
        valuation.strategicScore
      )
    };
  }
  if (state.activeChaosCard) {
    return {
      action: {
        type: "RESOLVE_CHAOS",
        senderPlayerId: actor.id
      },
      reason: makeReason(
        "RESOLVE_CHAOS",
        `${actor.name} x\xE1c nh\u1EADn ho\xE0n t\u1EA5t hi\u1EC7u \u1EE9ng bi\u1EBFn c\u1ED1 Chaos.`
      )
    };
  }
  if ((state.turnPhase === "BANKRUPTCY_CHECK" || state.turnPhase === "DEBT_LIQUIDATION") && state.pendingDebt) {
    const debtAmount = state.pendingDebt.amount;
    if (actor.cash >= debtAmount) {
      return {
        action: {
          type: "RESOLVE_DEBT",
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "RESOLVE_DEBT",
          `${actor.name} thanh to\xE1n d\u1EE9t \u0111i\u1EC3m kho\u1EA3n n\u1EE3 ${formatMoney(debtAmount)}.`
        )
      };
    }
    const ownedTileIds = Object.keys(state.properties).map(Number).filter((tid) => state.properties[tid]?.ownerId === actor.id);
    const mortgageCandidates = ownedTileIds.filter(
      (tid) => canMortgageProperty(tid, actor.id, state.properties, state.chaosModifiers, state, state.roundNumber).canMortgage
    ).sort((a, b) => {
      const valA = evaluatePropertyForPlayer(state, actor, a, profile.id, diff.id);
      const valB = evaluatePropertyForPlayer(state, actor, b, profile.id, diff.id);
      return valA.strategicScore - valB.strategicScore;
    });
    if (mortgageCandidates.length > 0) {
      const targetTileId = mortgageCandidates[0];
      const tile = getTileById(targetTileId);
      return {
        action: {
          type: "MORTGAGE_PROPERTY",
          tileId: targetTileId,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "MORTGAGE_PROPERTY",
          `${actor.name} th\u1EBF ch\u1EA5p kh\u1EA9n c\u1EA5p [${tile?.shortName || targetTileId}] \u0111\u1EC3 huy \u0111\u1ED9ng ti\u1EC1n m\u1EB7t tr\u1EA3 n\u1EE3.`
        )
      };
    }
    const downgradeCandidates = ownedTileIds.filter(
      (tid) => canDowngradeProperty(tid, actor.id, state.properties, state.roundNumber, state).canDowngrade
    );
    if (downgradeCandidates.length > 0) {
      const targetTileId = downgradeCandidates[0];
      const tile = getTileById(targetTileId);
      return {
        action: {
          type: "DOWNGRADE_PROPERTY",
          tileId: targetTileId,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "DOWNGRADE_PROPERTY",
          `${actor.name} b\xE1n b\u1EDBt 1 c\u1EA5p c\xF4ng tr\xECnh t\u1EA1i [${tile?.shortName || targetTileId}] \u0111\u1EC3 c\u1EE9u thanh kho\u1EA3n.`
        )
      };
    }
    const sellLandCandidates = ownedTileIds.filter((tid) => {
      const check = canSellProperty(tid, actor.id, state.properties, state.chaosModifiers, state.roundNumber, state);
      return check.canSell && check.sellValue > 0;
    }).sort((a, b) => {
      const valA = evaluatePropertyForPlayer(state, actor, a, profile.id, diff.id);
      const valB = evaluatePropertyForPlayer(state, actor, b, profile.id, diff.id);
      return valA.strategicScore - valB.strategicScore;
    });
    if (sellLandCandidates.length > 0) {
      const targetTileId = sellLandCandidates[0];
      const tile = getTileById(targetTileId);
      return {
        action: {
          type: "SELL_PROPERTY",
          tileId: targetTileId,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "SELL_PROPERTY",
          `${actor.name} b\xE1n l\u1EA1i \xF4 \u0111\u1EA5t [${tile?.shortName || targetTileId}] cho Ng\xE2n h\xE0ng \u0111\u1EC3 tr\xE1nh ph\xE1 s\u1EA3n.`
        )
      };
    }
    if (actor.cash > 0) {
      return {
        action: {
          type: "SETTLE_PARTIAL_DEBT",
          amount: actor.cash,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "SETTLE_PARTIAL_DEBT",
          `${actor.name} n\u1ED9p to\xE0n b\u1ED9 ${formatMoney(actor.cash)} ti\u1EC1n m\u1EB7t hi\u1EC7n c\xF3 \u0111\u1EC3 gi\u1EA3m n\u1EE3.`
        )
      };
    }
    return {
      action: {
        type: "DECLARE_BANKRUPTCY",
        playerId: actor.id,
        senderPlayerId: actor.id
      },
      reason: makeReason(
        "DECLARE_BANKRUPTCY",
        `${actor.name} \u0111\xE3 c\u1EA1n ki\u1EC7t to\xE0n b\u1ED9 t\xE0i s\u1EA3n thanh kho\u1EA3n v\xE0 bu\u1ED9c ph\u1EA3i tuy\xEAn b\u1ED1 ph\xE1 s\u1EA3n.`
      )
    };
  }
  if (state.turnPhase === "WAITING_FOR_ROLL") {
    if (actor.inDetention) {
      const escapeEval = shouldEscapeDetentionImmediately(state, actor);
      if (escapeEval.shouldEscape) {
        if ((actor.jailFreeCards || 0) > 0) {
          return {
            action: {
              type: "USE_DETENTION_CARD",
              senderPlayerId: actor.id
            },
            reason: makeReason("USE_DETENTION_CARD", `${actor.name}: ${escapeEval.reasonVi}`)
          };
        }
        const bailCost = state.config.detentionBailCost;
        const safetyReserve = calculateRequiredSafetyReserve(state, actor, profile.id, diff.id);
        if (actor.cash >= bailCost + safetyReserve * 0.6) {
          return {
            action: {
              type: "PAY_DETENTION_BAIL",
              senderPlayerId: actor.id
            },
            reason: makeReason("PAY_DETENTION_BAIL", `${actor.name}: ${escapeEval.reasonVi}`)
          };
        }
      }
    }
    return {
      action: {
        type: "ROLL_DICE_START",
        senderPlayerId: actor.id
      },
      reason: makeReason(
        "ROLL_DICE_START",
        `${actor.name} (${profile.titleVi}) tung x\xFAc x\u1EAFc b\u1EAFt \u0111\u1EA7u l\u01B0\u1EE3t \u0111i.`
      )
    };
  }
  if (state.turnPhase === "BRANCH_DECISION" && state.movementState && state.spatialGraph) {
    const { availableNextNodes } = state.movementState;
    const graph = state.spatialGraph;
    const branches = availableNextNodes.map((nid) => graph.nodes[nid]).filter((n) => Boolean(n));
    if (branches.length > 0) {
      const opponentProperties = {};
      const trapsOnNodes = {};
      for (const node of branches) {
        const numId = node.numericId ?? -1;
        const propOwnership = numId >= 0 ? state.properties[numId] : void 0;
        if (propOwnership && propOwnership.ownerId && propOwnership.ownerId !== actor.id && !propOwnership.isMortgaged) {
          opponentProperties[node.id] = node.property?.baseRent ?? 40;
        }
        if (state.placedTraps?.some((t) => t.nodeId === node.id && (t.revealed || t.ownerPlayerId === actor.id))) {
          trapsOnNodes[node.id] = true;
        }
      }
      const riskTolerance = profile.id === "SURVIVOR" ? 0.2 : profile.id === "TYCOON" || profile.id === "SHARK" ? 0.8 : 0.5;
      const { chosenNodeId, utilities } = evaluateAIBranchChoice({
        branches,
        playerCash: actor.cash,
        opponentProperties,
        trapsOnNodes,
        riskTolerance
      });
      const chosenNode = graph.nodes[chosenNodeId] || branches[0];
      return {
        action: {
          type: "CHOOSE_BRANCH_PATH",
          targetNodeId: chosenNode.id,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "CHOOSE_BRANCH_PATH",
          `${actor.name} (${profile.titleVi}) ch\u1ECDn nh\xE1nh \u0111i t\u1EDBi [${chosenNode.shortName || chosenNode.name}] (\u0110i\u1EC3m k\u1EF3 v\u1ECDng: ${utilities[chosenNode.id] ?? 0}).`,
          utilities[chosenNode.id]
        )
      };
    }
  }
  if (state.turnPhase === "ACTION_MENU") {
    if (aiActionStepCount >= 6) {
      return {
        action: {
          type: "END_TURN",
          senderPlayerId: actor.id
        },
        reason: makeReason("END_TURN", `${actor.name} k\u1EBFt th\xFAc l\u01B0\u1EE3t sau khi ho\xE0n t\u1EA5t \u0111i\u1EC1u ph\u1ED1i t\xE0i s\u1EA3n.`)
      };
    }
    const currentTile = getTileById(actor.position);
    const safetyReserve = calculateRequiredSafetyReserve(state, actor, profile.id, diff.id);
    if (currentTile && currentTile.property && state.properties[currentTile.id]?.ownerId === null) {
      const buyValidation = canBuyProperty(
        currentTile.id,
        actor.cash,
        state.properties,
        state.chaosModifiers,
        state.roundNumber,
        state
      );
      const valuation = evaluatePropertyForPlayer(
        state,
        actor,
        currentTile.id,
        profile.id,
        diff.id
      );
      if (buyValidation.canBuy) {
        const price = getBuyPrice(currentTile.id, state.roundNumber, state);
        const cashAfterBuy = actor.cash - price;
        const reserveRatio = diff.id === "HARD" ? 0.45 : 0.7;
        const meetsReserve = cashAfterBuy >= safetyReserve * reserveRatio || valuation.completesOwnMonopoly || valuation.blocksOpponentMonopoly;
        const effectiveThreshold = diff.id === "EASY" ? Math.max(0.76, profile.acquisitionThreshold + 0.35) : diff.id === "HARD" ? profile.acquisitionThreshold * 0.78 : profile.acquisitionThreshold;
        if (meetsReserve && valuation.strategicScore >= effectiveThreshold) {
          return {
            action: {
              type: "BUY_PROPERTY",
              tileId: currentTile.id,
              senderPlayerId: actor.id
            },
            reason: makeReason(
              "BUY_PROPERTY",
              `${actor.name} (${profile.titleVi}) mua [${currentTile.shortName}] gi\xE1 ${formatMoney(price)} (\u0110i\u1EC3m chi\u1EBFn l\u01B0\u1EE3c: ${valuation.strategicScore}x).`,
              valuation.strategicScore
            )
          };
        }
      }
      if ((state.chaosModifiers?.marketFrozenTurns || 0) === 0 && aiActionStepCount === 0) {
        return {
          action: {
            type: "START_AUCTION",
            tileId: currentTile.id,
            senderPlayerId: actor.id
          },
          reason: makeReason(
            "START_AUCTION",
            `${actor.name} (${profile.titleVi}) t\u1EEB ch\u1ED1i mua tr\u1EF1c ti\u1EBFp [${currentTile.shortName}] v\xE0 m\u1EDF phi\xEAn \u0111\u1EA5u gi\xE1 c\xF4ng khai \u0111\u1EC3 t\xECm gi\xE1 t\u1ED1t h\u01A1n.`,
            valuation.strategicScore
          )
        };
      }
    }
    if ((profile.id === "SURVIVOR" || profile.id === "STRATEGIST") && actor.cash < safetyReserve * 0.5 && aiActionStepCount < 3) {
      const mortgageable = Object.keys(state.properties).map(Number).filter(
        (tid) => state.properties[tid]?.ownerId === actor.id && canMortgageProperty(tid, actor.id, state.properties, state.chaosModifiers, state, state.roundNumber).canMortgage
      );
      if (mortgageable.length > 0) {
        const tid = mortgageable[0];
        const tile = getTileById(tid);
        return {
          action: {
            type: "MORTGAGE_PROPERTY",
            tileId: tid,
            senderPlayerId: actor.id
          },
          reason: makeReason(
            "MORTGAGE_PROPERTY",
            `${actor.name} (${profile.titleVi}) ch\u1EE7 \u0111\u1ED9ng th\u1EBF ch\u1EA5p [${tile?.shortName || tid}] \u0111\u1EC3 c\u1EE7ng c\u1ED1 qu\u1EF9 d\u1EF1 ph\xF2ng ti\u1EC1n m\u1EB7t.`
          )
        };
      }
    }
    if ((state.chaosModifiers?.interestHikeTurns || 0) === 0 && aiActionStepCount < 4) {
      const mortgagedOwned = Object.keys(state.properties).map(Number).filter((tid) => {
        const check = canUnmortgageProperty(
          tid,
          actor.id,
          actor.cash,
          state.properties,
          state.chaosModifiers,
          state,
          state.roundNumber
        );
        return check.canUnmortgage && actor.cash - check.unmortgageCost >= safetyReserve * 1.25;
      });
      if (mortgagedOwned.length > 0) {
        const tid = mortgagedOwned[0];
        const tile = getTileById(tid);
        return {
          action: {
            type: "UNMORTGAGE_PROPERTY",
            tileId: tid,
            senderPlayerId: actor.id
          },
          reason: makeReason(
            "UNMORTGAGE_PROPERTY",
            `${actor.name} (${profile.titleVi}) gi\u1EA3i ch\u1EA5p [${tile?.shortName || tid}] \u0111\u1EC3 kh\xF4i ph\u1EE5c quy\u1EC1n thu ti\u1EC1n thu\xEA.`
          )
        };
      }
    }
    const upgradeCandidates = Object.keys(state.properties).map(Number).filter((tid) => {
      const check = canUpgradeProperty(
        tid,
        actor.id,
        actor.cash,
        state.properties,
        state.chaosModifiers,
        state.roundNumber,
        state
      );
      if (!check.canUpgrade) return false;
      const cost = getUpgradeCost(tid, state.roundNumber, state) || 100;
      const reserveFactor = diff.lookaheadDepth >= 2 ? 0.5 : 0.75;
      const requiredCash = cost * profile.upgradeBufferMultiplier + safetyReserve * reserveFactor;
      return actor.cash >= requiredCash;
    }).sort((a, b) => {
      const tileA = getTileById(a);
      const tileB = getTileById(b);
      return (tileB?.property?.baseRent || 0) - (tileA?.property?.baseRent || 0);
    });
    if (upgradeCandidates.length > 0 && aiActionStepCount < 4) {
      const bestUpgradeId = upgradeCandidates[0];
      const tile = getTileById(bestUpgradeId);
      const nextLevel = (state.properties[bestUpgradeId]?.level || 0) + 1;
      return {
        action: {
          type: "UPGRADE_PROPERTY",
          tileId: bestUpgradeId,
          senderPlayerId: actor.id
        },
        reason: makeReason(
          "UPGRADE_PROPERTY",
          `${actor.name} (${profile.titleVi}) \u0111\u1EA7u t\u01B0 n\xE2ng c\u1EA5p [${tile?.shortName || bestUpgradeId}] l\xEAn C\u1EA5p ${nextLevel}\u2605.`
        )
      };
    }
    if (aiActionStepCount === 1) {
      const tradeOpportunity = generateOutboundTradeForAI(state, actor);
      if (tradeOpportunity) {
        return {
          action: {
            type: "PROPOSE_TRADE",
            proposal: tradeOpportunity.proposal,
            senderPlayerId: actor.id
          },
          reason: makeReason("PROPOSE_TRADE", tradeOpportunity.reasonVi)
        };
      }
    }
    if (aiActionStepCount < 4 && state.spatialGraph) {
      const ownedWithoutBiz = Object.keys(state.properties).map(Number).filter((tid) => {
        const own = state.properties[tid];
        return own && own.ownerId === actor.id && !own.isMortgaged && !own.businessTypeId;
      });
      if (ownedWithoutBiz.length > 0) {
        const targetTileId = ownedWithoutBiz[0];
        const targetNodeId = Object.values(state.spatialGraph.nodes).find((n) => n.numericId === targetTileId)?.id || `node-${targetTileId}`;
        const adjIds = getAdjacentNodeIds(state.spatialGraph, targetNodeId);
        const adjBusinesses = [];
        for (const adjId of adjIds) {
          const bId = state.spatialGraph.nodes[adjId]?.currentBusiness?.businessId;
          if (bId && BUSINESS_CATALOG[bId]) {
            adjBusinesses.push(BUSINESS_CATALOG[bId]);
          }
        }
        const chaosPhase = state.chaosMeter?.phase ?? "PEACEFUL";
        const chosenBiz = evaluateAIAdaptiveBusiness(chaosPhase, adjBusinesses);
        if (chosenBiz) {
          const tile = getTileById(targetTileId);
          return {
            action: {
              type: "SELECT_BUSINESS_TYPE",
              tileId: targetTileId,
              nodeId: targetNodeId,
              businessId: chosenBiz.id,
              playerId: actor.id,
              senderPlayerId: actor.id
            },
            reason: makeReason(
              "SELECT_BUSINESS_TYPE",
              `${actor.name} (${profile.titleVi}) tri\u1EC3n khai m\xF4 h\xECnh kinh doanh [${chosenBiz.name}] t\u1EA1i [${tile?.shortName || targetTileId}] th\xEDch \u1EE9ng pha ${chaosPhase}.`
            )
          };
        }
      }
    }
    if (aiActionStepCount < 5 && state.spatialGraph && (profile.id === "SHARK" || profile.id === "CHAOTIC" || profile.id === "STRATEGIST")) {
      const candidateNodeIds = Object.keys(state.spatialGraph.nodes).filter(
        (nid) => canPlaceTrap(state, actor.id, nid)
      );
      if (candidateNodeIds.length > 0) {
        const bestTrapNodeId = evaluateAIChokePointTrap(state.spatialGraph, candidateNodeIds);
        const bestNode = state.spatialGraph.nodes[bestTrapNodeId];
        if (bestNode && (bestNode.isIntersection || bestNode.type === "TRANSPORT" || profile.id === "CHAOTIC")) {
          const trapType = profile.id === "SHARK" ? "ROBBERY" : profile.id === "CHAOTIC" ? "TELEPORT_HAZARD" : "LOCKDOWN";
          return {
            action: {
              type: "PLACE_TRAP",
              nodeId: bestTrapNodeId,
              trapType,
              senderPlayerId: actor.id
            },
            reason: makeReason(
              "PLACE_TRAP",
              `${actor.name} (${profile.titleVi}) b\xED m\u1EADt g\xE0i b\u1EABy ${trapType} t\u1EA1i \u0111i\u1EC3m ngh\u1EBDn [${bestNode.shortName || bestTrapNodeId}].`
            )
          };
        }
      }
    }
    return {
      action: {
        type: "END_TURN",
        senderPlayerId: actor.id
      },
      reason: makeReason(
        "END_TURN",
        `${actor.name} (${profile.titleVi}) ho\xE0n t\u1EA5t l\u01B0\u1EE3t h\xE0nh \u0111\u1ED9ng.`
      )
    };
  }
  return null;
}

// src/game/chaos-engine/prng.ts
var SeededPRNG = class {
  state;
  constructor(seed = 1337) {
    this.state = seed >>> 0 || 1337;
  }
  /**
   * Returns a pseudo-random floating point number in [0, 1).
   */
  nextFloat() {
    this.state = this.state + 1831565813 | 0;
    let t = Math.imul(this.state ^ this.state >>> 15, 1 | this.state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  /**
   * Returns a pseudo-random integer between min and max (inclusive).
   */
  nextInt(min, max) {
    if (min > max) {
      [min, max] = [max, min];
    }
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
  /**
   * Picks a single random element from an array.
   */
  pickOne(items) {
    if (items.length === 0) {
      throw new Error("Cannot pick from empty array");
    }
    const index = Math.floor(this.nextFloat() * items.length);
    return items[index];
  }
  /**
   * Shuffles an array deterministically using Fisher-Yates algorithm.
   */
  shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextFloat() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  /**
   * Resets the seed.
   */
  setSeed(seed) {
    this.state = seed >>> 0 || 1337;
  }
  /**
   * Gets the current internal state.
   */
  getState() {
    return this.state;
  }
};
var defaultPRNG = new SeededPRNG(424242);
function createPRNG(seed) {
  return new SeededPRNG(seed);
}

// src/game/dice/diceEngine.ts
function rollSingleDie() {
  return Math.floor(Math.random() * 6) + 1;
}
function rollTwoDice(customValues) {
  const d1 = customValues ? customValues[0] : rollSingleDie();
  const d2 = customValues ? customValues[1] : rollSingleDie();
  return {
    dice: [d1, d2],
    sum: d1 + d2,
    isDouble: d1 === d2
  };
}

// src/game/chaos-engine/chaosCardsM2.ts
var CHAOS_CARDS_M2 = [
  // =========================================================================
  // XÃ HỘI (SOCIAL — cộng đồng & liên minh)
  // =========================================================================
  {
    id: "soc-community-pot",
    title: "Qu\u1EF9 C\u1ED9ng \u0110\u1ED3ng Khu Ph\u1ED1",
    nameVi: "Qu\u1EF9 C\u1ED9ng \u0110\u1ED3ng Khu Ph\u1ED1",
    nameEn: "Neighbourhood Community Fund",
    tagline: "Chung tay g\xF3p s\u1EE9c",
    taglineVi: "Chung tay g\xF3p s\u1EE9c",
    taglineEn: "Everyone gets a share",
    flavorText: "Qu\u1EF9 khu ph\u1ED1 chia \u0111\u1EC1u ti\u1EC1n m\u1EB7t cho m\u1ECDi c\u01B0 d\xE2n. M\u1ED7i ng\u01B0\u1EDDi nh\u1EADn +$100.",
    flavorTextEn: "The neighbourhood fund pays every resident equally. Everyone gets +$100.",
    descriptionVi: "Qu\u1EF9 khu ph\u1ED1 chia \u0111\u1EC1u ti\u1EC1n m\u1EB7t cho m\u1ECDi c\u01B0 d\xE2n. M\u1ED7i ng\u01B0\u1EDDi nh\u1EADn +$100.",
    descriptionEn: "The neighbourhood fund pays every resident equally. Everyone gets +$100.",
    category: "SOCIAL",
    rarity: "COMMON",
    effectType: "CASH_ALL",
    value: 100,
    magnitude: 100,
    durationInTurns: 0,
    iconName: "Gift",
    triggerType: "TILE_LANDED"
  },
  {
    id: "soc-building-levy",
    title: "\u0110\xF3ng G\xF3p Qu\u1EF9 Tu B\u1ED5 Chung C\u01B0",
    nameVi: "\u0110\xF3ng G\xF3p Qu\u1EF9 Tu B\u1ED5 Chung C\u01B0",
    nameEn: "Building Maintenance Levy",
    tagline: "S\u1EEDa thang m\xE1y chung",
    taglineVi: "S\u1EEDa thang m\xE1y chung",
    taglineEn: "Fix the shared lift",
    flavorText: "C\u1EA3 khu chung c\u01B0 ph\u1EA3i g\xF3p qu\u1EF9 s\u1EEDa thang m\xE1y. M\u1ED7i ng\u01B0\u1EDDi m\u1EA5t -$60.",
    flavorTextEn: "Every flat must pay toward the lift repair. Everyone loses $60.",
    descriptionVi: "C\u1EA3 khu chung c\u01B0 ph\u1EA3i g\xF3p qu\u1EF9 s\u1EEDa thang m\xE1y. M\u1ED7i ng\u01B0\u1EDDi m\u1EA5t -$60.",
    descriptionEn: "Every flat must pay toward the lift repair. Everyone loses $60.",
    category: "SOCIAL",
    rarity: "COMMON",
    effectType: "CASH_ALL",
    value: -60,
    magnitude: -60,
    durationInTurns: 0,
    iconName: "Receipt",
    triggerType: "TILE_LANDED",
    harmful: true
  },
  {
    id: "soc-flood-donation",
    title: "Quy\xEAn G\xF3p T\u1EEB Thi\u1EC7n M\xF9a L\u0169",
    nameVi: "Quy\xEAn G\xF3p T\u1EEB Thi\u1EC7n M\xF9a L\u0169",
    nameEn: "Flood Season Charity Drive",
    tagline: "Ngh\u0129a c\u1EED \u0111\u1EB9p",
    taglineVi: "Ngh\u0129a c\u1EED \u0111\u1EB9p",
    taglineEn: "A generous gesture",
    flavorText: "B\u1EA1n quy\xEAn g\xF3p c\u1EE9u tr\u1EE3 v\xF9ng l\u0169. M\u1EA5t -$120 ti\u1EC1n m\u1EB7t.",
    flavorTextEn: "You donate to flood relief. You lose $120 in cash.",
    descriptionVi: "B\u1EA1n quy\xEAn g\xF3p c\u1EE9u tr\u1EE3 v\xF9ng l\u0169. M\u1EA5t -$120 ti\u1EC1n m\u1EB7t.",
    descriptionEn: "You donate to flood relief. You lose $120 in cash.",
    category: "SOCIAL",
    rarity: "UNCOMMON",
    effectType: "CASH_SELF",
    value: -120,
    magnitude: -120,
    durationInTurns: 0,
    iconName: "Leaf",
    triggerType: "TILE_LANDED",
    harmful: true
  },
  {
    id: "soc-wealth-share",
    title: "Chia S\u1EBB Thu Nh\u1EADp Li\xEAn Minh",
    nameVi: "Chia S\u1EBB Thu Nh\u1EADp Li\xEAn Minh",
    nameEn: "Alliance Income Sharing",
    tagline: "Ng\u01B0\u1EDDi gi\xE0u \u0111\u1EE1 ng\u01B0\u1EDDi ngh\xE8o",
    taglineVi: "Ng\u01B0\u1EDDi gi\xE0u \u0111\u1EE1 ng\u01B0\u1EDDi ngh\xE8o",
    taglineEn: "The rich lift up the poor",
    flavorText: "Ng\u01B0\u1EDDi gi\xE0u nh\u1EA5t chuy\u1EC3n 25% ti\u1EC1n m\u1EB7t cho ng\u01B0\u1EDDi ngh\xE8o nh\u1EA5t.",
    flavorTextEn: "The richest player sends 25% of their cash to the poorest.",
    descriptionVi: "Ng\u01B0\u1EDDi gi\xE0u nh\u1EA5t chuy\u1EC3n 25% ti\u1EC1n m\u1EB7t cho ng\u01B0\u1EDDi ngh\xE8o nh\u1EA5t.",
    descriptionEn: "The richest player sends 25% of their cash to the poorest.",
    category: "SOCIAL",
    rarity: "UNCOMMON",
    effectType: "REDISTRIBUTE_WEALTH",
    value: 25,
    magnitude: 25,
    durationInTurns: 0,
    iconName: "TrendingUp",
    triggerType: "TILE_LANDED"
  },
  {
    id: "soc-community-pardon",
    title: "\u0110\u1EA1i X\xE1 C\u1ED9ng \u0110\u1ED3ng",
    nameVi: "\u0110\u1EA1i X\xE1 C\u1ED9ng \u0110\u1ED3ng",
    nameEn: "Community Pardon",
    tagline: "Xo\xE1 n\u1EE3 th\u1EBF ch\u1EA5p",
    taglineVi: "Xo\xE1 n\u1EE3 th\u1EBF ch\u1EA5p",
    taglineEn: "Mortgages forgiven",
    flavorText: "Ch\xEDnh quy\u1EC1n xo\xE1 th\u1EBF ch\u1EA5p cho m\u1ECDi b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang b\u1ECB c\u1EA7m c\u1ED1.",
    flavorTextEn: "The city lifts every mortgage on properties currently pledged.",
    descriptionVi: "Ch\xEDnh quy\u1EC1n xo\xE1 th\u1EBF ch\u1EA5p cho m\u1ECDi b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang b\u1ECB c\u1EA7m c\u1ED1.",
    descriptionEn: "The city lifts every mortgage on properties currently pledged.",
    category: "SOCIAL",
    rarity: "RARE",
    effectType: "DEBT_JUBILEE",
    value: 0,
    magnitude: 0,
    durationInTurns: 0,
    iconName: "Sparkles",
    triggerType: "TILE_LANDED"
  },
  {
    id: "soc-street-festival",
    title: "L\u1EC5 H\u1ED9i \u0110\u01B0\u1EDDng Ph\u1ED1",
    nameVi: "L\u1EC5 H\u1ED9i \u0110\u01B0\u1EDDng Ph\u1ED1",
    nameEn: "Street Festival",
    tagline: "Ti\u1EC1n v\xE9 v\xE0 ti\u1EC1n b\xE1n h\xE0ng",
    taglineVi: "Ti\u1EC1n v\xE9 v\xE0 ti\u1EC1n b\xE1n h\xE0ng",
    taglineEn: "Tickets and stall sales",
    flavorText: "L\u1EC5 h\u1ED9i \u0111\u01B0\u1EDDng ph\u1ED1 \u0111\xF4ng k\xEDn kh\xE1ch. B\u1EA1n thu v\u1EC1 +$140.",
    flavorTextEn: "The street festival is packed. You collect +$140.",
    descriptionVi: "L\u1EC5 h\u1ED9i \u0111\u01B0\u1EDDng ph\u1ED1 \u0111\xF4ng k\xEDn kh\xE1ch. B\u1EA1n thu v\u1EC1 +$140.",
    descriptionEn: "The street festival is packed. You collect +$140.",
    category: "SOCIAL",
    rarity: "COMMON",
    effectType: "CASH_SELF",
    value: 140,
    magnitude: 140,
    durationInTurns: 0,
    iconName: "Coins",
    triggerType: "TILE_LANDED"
  },
  // =========================================================================
  // MÔI TRƯỜNG (ENVIRONMENT — đổi tầm nhìn, không đổi tiền)
  // =========================================================================
  {
    id: "env-monsoon-fog",
    title: "S\u01B0\u01A1ng M\xF9 \u0110\u1EA7u M\xF9a",
    nameVi: "S\u01B0\u01A1ng M\xF9 \u0110\u1EA7u M\xF9a",
    nameEn: "Early Monsoon Fog",
    tagline: "Th\xE0nh ph\u1ED1 m\u1EDD s\u01B0\u01A1ng",
    taglineVi: "Th\xE0nh ph\u1ED1 m\u1EDD s\u01B0\u01A1ng",
    taglineEn: "The city fades into mist",
    flavorText: "S\u01B0\u01A1ng d\xE0y ph\u1EE7 k\xEDn b\xE0n c\u1EDD. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    flavorTextEn: "Thick fog covers the board. No money changes hands, only the view.",
    descriptionVi: "S\u01B0\u01A1ng d\xE0y ph\u1EE7 k\xEDn b\xE0n c\u1EDD. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    descriptionEn: "Thick fog covers the board. No money changes hands, only the view.",
    category: "ENVIRONMENT",
    rarity: "COMMON",
    effectType: "VISION_SHIFT",
    value: 0,
    magnitude: 0,
    durationInTurns: 2,
    iconName: "Leaf",
    triggerType: "TILE_LANDED"
  },
  {
    id: "env-heat-wave",
    title: "N\u1EAFng N\xF3ng K\u1EF7 L\u1EE5c",
    nameVi: "N\u1EAFng N\xF3ng K\u1EF7 L\u1EE5c",
    nameEn: "Record Heat Wave",
    tagline: "M\u1EB7t \u0111\u01B0\u1EDDng b\u1ED1c h\u01A1i",
    taglineVi: "M\u1EB7t \u0111\u01B0\u1EDDng b\u1ED1c h\u01A1i",
    taglineEn: "Asphalt shimmers",
    flavorText: "N\u1EAFng g\u1EAFt l\xE0m c\u1EA3 th\xE0nh ph\u1ED1 oi \u1EA3. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    flavorTextEn: "Scorching sun bakes the city. No money changes hands, only the view.",
    descriptionVi: "N\u1EAFng g\u1EAFt l\xE0m c\u1EA3 th\xE0nh ph\u1ED1 oi \u1EA3. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    descriptionEn: "Scorching sun bakes the city. No money changes hands, only the view.",
    category: "ENVIRONMENT",
    rarity: "COMMON",
    effectType: "VISION_SHIFT",
    value: 0,
    magnitude: 0,
    durationInTurns: 2,
    iconName: "Sparkles",
    triggerType: "TILE_LANDED"
  },
  {
    id: "env-green-corridor",
    title: "H\xE0nh Lang Xanh \u0110\xF4 Th\u1ECB",
    nameVi: "H\xE0nh Lang Xanh \u0110\xF4 Th\u1ECB",
    nameEn: "Urban Green Corridor",
    tagline: "C\xE2y xanh d\u1ECDc ph\u1ED1",
    taglineVi: "C\xE2y xanh d\u1ECDc ph\u1ED1",
    taglineEn: "Trees line the streets",
    flavorText: "H\xE0ng c\xE2y m\u1EDBi ph\u1EE7 xanh c\xE1c con ph\u1ED1. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    flavorTextEn: "New trees green up the avenues. No money changes hands, only the view.",
    descriptionVi: "H\xE0ng c\xE2y m\u1EDBi ph\u1EE7 xanh c\xE1c con ph\u1ED1. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    descriptionEn: "New trees green up the avenues. No money changes hands, only the view.",
    category: "ENVIRONMENT",
    rarity: "UNCOMMON",
    effectType: "VISION_SHIFT",
    value: 0,
    magnitude: 0,
    durationInTurns: 3,
    iconName: "Leaf",
    triggerType: "TILE_LANDED"
  },
  {
    id: "env-storm-warning",
    title: "C\u1EA3nh B\xE1o B\xE3o C\u1EA5p 10",
    nameVi: "C\u1EA3nh B\xE1o B\xE3o C\u1EA5p 10",
    nameEn: "Level 10 Storm Warning",
    tagline: "\u0110\xF3ng c\u1EEDa th\u1ECB tr\u01B0\u1EDDng",
    taglineVi: "\u0110\xF3ng c\u1EEDa th\u1ECB tr\u01B0\u1EDDng",
    taglineEn: "Markets close for the storm",
    flavorText: "B\xE3o l\u1EDBn bu\u1ED9c th\u1ECB tr\u01B0\u1EDDng t\u1EA1m \u0111\xF3ng: kh\xF4ng mua b\xE1n, n\xE2ng c\u1EA5p trong 1 v\xF2ng.",
    flavorTextEn: "A major storm shuts trading: no buying or upgrading for 1 round.",
    descriptionVi: "B\xE3o l\u1EDBn bu\u1ED9c th\u1ECB tr\u01B0\u1EDDng t\u1EA1m \u0111\xF3ng: kh\xF4ng mua b\xE1n, n\xE2ng c\u1EA5p trong 1 v\xF2ng.",
    descriptionEn: "A major storm shuts trading: no buying or upgrading for 1 round.",
    category: "ENVIRONMENT",
    rarity: "UNCOMMON",
    effectType: "FREEZE_MARKET",
    value: 0,
    magnitude: 0,
    durationInTurns: 1,
    iconName: "Receipt",
    triggerType: "TILE_LANDED",
    harmful: true
  },
  {
    id: "env-river-cleanup",
    title: "Chi\u1EBFn D\u1ECBch D\u1ECDn S\xF4ng",
    nameVi: "Chi\u1EBFn D\u1ECBch D\u1ECDn S\xF4ng",
    nameEn: "River Cleanup Campaign",
    tagline: "N\u01B0\u1EDBc trong tr\u1EDF l\u1EA1i",
    taglineVi: "N\u01B0\u1EDBc trong tr\u1EDF l\u1EA1i",
    taglineEn: "Clear water returns",
    flavorText: "C\xE1c d\xF2ng k\xEAnh \u0111\u01B0\u1EE3c l\xE0m s\u1EA1ch, c\u1EA3 b\xE0n c\u1EDD s\xE1ng l\xEAn. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n.",
    flavorTextEn: "Canals are cleaned and the board brightens. No money changes hands.",
    descriptionVi: "C\xE1c d\xF2ng k\xEAnh \u0111\u01B0\u1EE3c l\xE0m s\u1EA1ch, c\u1EA3 b\xE0n c\u1EDD s\xE1ng l\xEAn. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n.",
    descriptionEn: "Canals are cleaned and the board brightens. No money changes hands.",
    category: "ENVIRONMENT",
    rarity: "COMMON",
    effectType: "VISION_SHIFT",
    value: 0,
    magnitude: 0,
    durationInTurns: 2,
    iconName: "Leaf",
    triggerType: "TILE_LANDED"
  },
  {
    id: "env-solar-surge",
    title: "N\u0103ng L\u01B0\u1EE3ng M\u1EB7t Tr\u1EDDi Lan T\u1ECFa",
    nameVi: "N\u0103ng L\u01B0\u1EE3ng M\u1EB7t Tr\u1EDDi Lan T\u1ECFa",
    nameEn: "Solar Surge",
    tagline: "M\xE1i nh\xE0 l\u1EA5p l\xE1nh",
    taglineVi: "M\xE1i nh\xE0 l\u1EA5p l\xE1nh",
    taglineEn: "Rooftops gleam",
    flavorText: "T\u1EA5m pin m\u1EB7t tr\u1EDDi ph\u1EE7 k\xEDn m\xE1i nh\xE0 th\xE0nh ph\u1ED1. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    flavorTextEn: "Solar panels cover the city rooftops. No money changes hands, only the view.",
    descriptionVi: "T\u1EA5m pin m\u1EB7t tr\u1EDDi ph\u1EE7 k\xEDn m\xE1i nh\xE0 th\xE0nh ph\u1ED1. Kh\xF4ng \u0111\u1ED5i ti\u1EC1n, ch\u1EC9 \u0111\u1ED5i t\u1EA7m nh\xECn.",
    descriptionEn: "Solar panels cover the city rooftops. No money changes hands, only the view.",
    category: "ENVIRONMENT",
    rarity: "RARE",
    effectType: "VISION_SHIFT",
    value: 0,
    magnitude: 0,
    durationInTurns: 3,
    iconName: "Sparkles",
    triggerType: "TILE_LANDED"
  },
  // =========================================================================
  // CÔNG NGHỆ (TECH — kỹ năng & hệ thống)
  // =========================================================================
  {
    id: "tech-drone-delivery",
    title: "Giao H\xE0ng B\u1EB1ng Drone",
    nameVi: "Giao H\xE0ng B\u1EB1ng Drone",
    nameEn: "Drone Delivery",
    tagline: "Bay th\u1EB3ng t\u1EDBi n\u01A1i",
    taglineVi: "Bay th\u1EB3ng t\u1EDBi n\u01A1i",
    taglineEn: "Straight to the door",
    flavorText: "Drone giao h\xE0ng \u0111\u01B0a b\u1EA1n nh\u1EA3y th\u1EB3ng t\u1EDBi tr\u01B0\u1EDBc 3 \xF4.",
    flavorTextEn: "A delivery drone carries you 3 tiles ahead.",
    descriptionVi: "Drone giao h\xE0ng \u0111\u01B0a b\u1EA1n nh\u1EA3y th\u1EB3ng t\u1EDBi tr\u01B0\u1EDBc 3 \xF4.",
    descriptionEn: "A delivery drone carries you 3 tiles ahead.",
    category: "TECH",
    rarity: "UNCOMMON",
    effectType: "TELEPORT",
    value: 3,
    magnitude: 3,
    durationInTurns: 0,
    iconName: "Plane",
    triggerType: "TILE_LANDED"
  },
  {
    id: "tech-software-upgrade",
    title: "N\xE2ng C\u1EA5p Ph\u1EA7n M\u1EC1m Qu\u1EA3n L\xFD",
    nameVi: "N\xE2ng C\u1EA5p Ph\u1EA7n M\u1EC1m Qu\u1EA3n L\xFD",
    nameEn: "Management Software Upgrade",
    tagline: "C\xF4ng tr\xECnh th\xF4ng minh h\u01A1n",
    taglineVi: "C\xF4ng tr\xECnh th\xF4ng minh h\u01A1n",
    taglineEn: "Smarter buildings",
    flavorText: "Ph\u1EA7n m\u1EC1m qu\u1EA3n l\xFD t\u1EF1 \u0111\u1ED9ng n\xE2ng 1 c\u1EA5p c\xF4ng tr\xECnh ng\u1EABu nhi\xEAn c\u1EE7a b\u1EA1n.",
    flavorTextEn: "Management software upgrades one of your properties by 1 level.",
    descriptionVi: "Ph\u1EA7n m\u1EC1m qu\u1EA3n l\xFD t\u1EF1 \u0111\u1ED9ng n\xE2ng 1 c\u1EA5p c\xF4ng tr\xECnh ng\u1EABu nhi\xEAn c\u1EE7a b\u1EA1n.",
    descriptionEn: "Management software upgrades one of your properties by 1 level.",
    category: "TECH",
    rarity: "UNCOMMON",
    effectType: "FREE_UPGRADE",
    value: 150,
    magnitude: 150,
    durationInTurns: 0,
    iconName: "TrendingUp",
    triggerType: "TILE_LANDED"
  },
  {
    id: "tech-data-hack",
    title: "Hack D\u1EEF Li\u1EC7u \u0110\u1ED1i Th\u1EE7",
    nameVi: "Hack D\u1EEF Li\u1EC7u \u0110\u1ED1i Th\u1EE7",
    nameEn: "Rival Data Hack",
    tagline: "Chuy\u1EC3n ti\u1EC1n qua l\u1ED7 h\u1ED5ng",
    taglineVi: "Chuy\u1EC3n ti\u1EC1n qua l\u1ED7 h\u1ED5ng",
    taglineEn: "Money through a loophole",
    flavorText: "B\u1EA1n khai th\xE1c l\u1ED7 h\u1ED5ng v\xE0 h\xFAt $60 t\u1EEB m\u1ED7i \u0111\u1ED1i th\u1EE7.",
    flavorTextEn: "You exploit a loophole and pull $60 from each rival.",
    descriptionVi: "B\u1EA1n khai th\xE1c l\u1ED7 h\u1ED5ng v\xE0 h\xFAt $60 t\u1EEB m\u1ED7i \u0111\u1ED1i th\u1EE7.",
    descriptionEn: "You exploit a loophole and pull $60 from each rival.",
    category: "TECH",
    rarity: "RARE",
    effectType: "CASH_STEAL",
    value: 60,
    magnitude: 60,
    durationInTurns: 0,
    iconName: "Receipt",
    triggerType: "TILE_LANDED"
  },
  {
    id: "tech-finance-glitch",
    title: "L\u1ED7i Ph\u1EA7n M\u1EC1m T\xE0i Ch\xEDnh",
    nameVi: "L\u1ED7i Ph\u1EA7n M\u1EC1m T\xE0i Ch\xEDnh",
    nameEn: "Finance Software Glitch",
    tagline: "H\u1EC7 th\u1ED1ng treo gi\u1EEFa giao d\u1ECBch",
    taglineVi: "H\u1EC7 th\u1ED1ng treo gi\u1EEFa giao d\u1ECBch",
    taglineEn: "The system freezes mid-transaction",
    flavorText: "M\u1ED9t l\u1ED7i ph\u1EA7n m\u1EC1m nu\u1ED1t m\u1EA5t -$90 ti\u1EC1n m\u1EB7t c\u1EE7a b\u1EA1n.",
    flavorTextEn: "A software bug swallows $90 of your cash.",
    descriptionVi: "M\u1ED9t l\u1ED7i ph\u1EA7n m\u1EC1m nu\u1ED1t m\u1EA5t -$90 ti\u1EC1n m\u1EB7t c\u1EE7a b\u1EA1n.",
    descriptionEn: "A software bug swallows $90 of your cash.",
    category: "TECH",
    rarity: "COMMON",
    effectType: "CASH_SELF",
    value: -90,
    magnitude: -90,
    durationInTurns: 0,
    iconName: "Receipt",
    triggerType: "TILE_LANDED",
    harmful: true
  },
  {
    id: "tech-smart-meter",
    title: "\u0110\u1ED3ng H\u1ED3 \u0110i\u1EC7n N\u01B0\u1EDBc Th\xF4ng Minh",
    nameVi: "\u0110\u1ED3ng H\u1ED3 \u0110i\u1EC7n N\u01B0\u1EDBc Th\xF4ng Minh",
    nameEn: "Smart Utility Meters",
    tagline: "Ti\u1EC7n \xEDch t\u0103ng gi\xE1 tr\u1ECB",
    taglineVi: "Ti\u1EC7n \xEDch t\u0103ng gi\xE1 tr\u1ECB",
    taglineEn: "Utilities gain value",
    flavorText: "Ti\u1EC7n \xEDch \u0111i\u1EC7n n\u01B0\u1EDBc nh\xE2n \u0111\xF4i ti\u1EC1n thu\xEA trong 2 v\xF2ng.",
    flavorTextEn: "Utility rents double for 2 rounds.",
    descriptionVi: "Ti\u1EC7n \xEDch \u0111i\u1EC7n n\u01B0\u1EDBc nh\xE2n \u0111\xF4i ti\u1EC1n thu\xEA trong 2 v\xF2ng.",
    descriptionEn: "Utility rents double for 2 rounds.",
    category: "TECH",
    rarity: "UNCOMMON",
    effectType: "UTILITY_BOOM",
    value: 2,
    magnitude: 2,
    durationInTurns: 2,
    iconName: "Coins",
    triggerType: "TILE_LANDED"
  },
  {
    id: "tech-crypto-swing",
    title: "Bi\u1EBFn \u0110\u1ED9ng Ti\u1EC1n S\u1ED1",
    nameVi: "Bi\u1EBFn \u0110\u1ED9ng Ti\u1EC1n S\u1ED1",
    nameEn: "Crypto Market Swing",
    tagline: "C\u01B0\u1EE3c m\u1ED9t phi\xEAn giao d\u1ECBch",
    taglineVi: "C\u01B0\u1EE3c m\u1ED9t phi\xEAn giao d\u1ECBch",
    taglineEn: "One trading session gamble",
    flavorText: "B\u1EA1n \u0111\u1EB7t c\u01B0\u1EE3c $120 v\xE0o bi\u1EBFn \u0111\u1ED9ng ti\u1EC1n s\u1ED1. C\xF3 th\u1EC3 nh\xE2n \u0111\xF4i, c\xF3 th\u1EC3 thua (t\u1ED1i \u0111a 25% ti\u1EC1n m\u1EB7t).",
    flavorTextEn: "You stake $120 on a crypto swing. You may double it or lose some (at most 25% of your cash).",
    descriptionVi: "B\u1EA1n \u0111\u1EB7t c\u01B0\u1EE3c $120 v\xE0o bi\u1EBFn \u0111\u1ED9ng ti\u1EC1n s\u1ED1. C\xF3 th\u1EC3 nh\xE2n \u0111\xF4i, c\xF3 th\u1EC3 thua (t\u1ED1i \u0111a 25% ti\u1EC1n m\u1EB7t).",
    descriptionEn: "You stake $120 on a crypto swing. You may double it or lose some (at most 25% of your cash).",
    category: "TECH",
    rarity: "RARE",
    effectType: "CASINO_GAMBLE",
    value: 120,
    magnitude: 120,
    durationInTurns: 0,
    iconName: "Sparkles",
    triggerType: "TILE_LANDED",
    harmful: true
  },
  // =========================================================================
  // PHÁP LÝ (JURIDICAL — luật tạm thời)
  // =========================================================================
  {
    id: "jur-antitrust-fine",
    title: "Ph\u1EA1t Ch\u1ED1ng \u0110\u1ED9c Quy\u1EC1n",
    nameVi: "Ph\u1EA1t Ch\u1ED1ng \u0110\u1ED9c Quy\u1EC1n",
    nameEn: "Antitrust Fine",
    tagline: "C\u01A1 quan c\u1EA1nh tranh ra tay",
    taglineVi: "C\u01A1 quan c\u1EA1nh tranh ra tay",
    taglineEn: "The competition authority acts",
    flavorText: "M\u1ED7i b\u1EA5t \u0111\u1ED9ng s\u1EA3n b\u1EA1n s\u1EDF h\u1EEFu ch\u1ECBu thu\u1EBF $40 theo m\u1EE9c \u0111\u1ED9 chi\u1EBFm l\u0129nh.",
    flavorTextEn: "Each property you hold is taxed $40, scaled by its level.",
    descriptionVi: "M\u1ED7i b\u1EA5t \u0111\u1ED9ng s\u1EA3n b\u1EA1n s\u1EDF h\u1EEFu ch\u1ECBu thu\u1EBF $40 theo m\u1EE9c \u0111\u1ED9 chi\u1EBFm l\u0129nh.",
    descriptionEn: "Each property you hold is taxed $40, scaled by its level.",
    category: "JURIDICAL",
    rarity: "UNCOMMON",
    effectType: "PROPERTY_TAX",
    value: 40,
    magnitude: 40,
    durationInTurns: 0,
    iconName: "Receipt",
    triggerType: "TILE_LANDED",
    harmful: true
  },
  {
    id: "jur-contract-breach",
    title: "Vi Ph\u1EA1m H\u1EE3p \u0110\u1ED3ng Th\u01B0\u01A1ng M\u1EA1i",
    nameVi: "Vi Ph\u1EA1m H\u1EE3p \u0110\u1ED3ng Th\u01B0\u01A1ng M\u1EA1i",
    nameEn: "Commercial Contract Breach",
    tagline: "B\u1ED3i th\u01B0\u1EDDng thi\u1EC7t h\u1EA1i",
    taglineVi: "B\u1ED3i th\u01B0\u1EDDng thi\u1EC7t h\u1EA1i",
    taglineEn: "Pay the damages",
    flavorText: "B\u1EA1n vi ph\u1EA1m h\u1EE3p \u0111\u1ED3ng v\xE0 ph\u1EA3i b\u1ED3i th\u01B0\u1EDDng -$70.",
    flavorTextEn: "You breach a contract and must pay $70 in damages.",
    descriptionVi: "B\u1EA1n vi ph\u1EA1m h\u1EE3p \u0111\u1ED3ng v\xE0 ph\u1EA3i b\u1ED3i th\u01B0\u1EDDng -$70.",
    descriptionEn: "You breach a contract and must pay $70 in damages.",
    category: "JURIDICAL",
    rarity: "COMMON",
    effectType: "CASH_SELF",
    value: -70,
    magnitude: -70,
    durationInTurns: 0,
    iconName: "Receipt",
    triggerType: "TILE_LANDED",
    harmful: true
  },
  {
    id: "jur-tariff-relief",
    title: "Mi\u1EC5n Gi\u1EA3m Thu\u1EBF Quan",
    nameVi: "Mi\u1EC5n Gi\u1EA3m Thu\u1EBF Quan",
    nameEn: "Tariff Relief",
    tagline: "Ho\xE0n thu\u1EBF nh\u1EADp kh\u1EA9u",
    taglineVi: "Ho\xE0n thu\u1EBF nh\u1EADp kh\u1EA9u",
    taglineEn: "Import duties refunded",
    flavorText: "Hi\u1EC7p \u0111\u1ECBnh th\u01B0\u01A1ng m\u1EA1i m\u1EDBi ho\xE0n l\u1EA1i cho b\u1EA1n +$90.",
    flavorTextEn: "A new trade deal refunds you +$90.",
    descriptionVi: "Hi\u1EC7p \u0111\u1ECBnh th\u01B0\u01A1ng m\u1EA1i m\u1EDBi ho\xE0n l\u1EA1i cho b\u1EA1n +$90.",
    descriptionEn: "A new trade deal refunds you +$90.",
    category: "JURIDICAL",
    rarity: "COMMON",
    effectType: "CASH_SELF",
    value: 90,
    magnitude: 90,
    durationInTurns: 0,
    iconName: "Gift",
    triggerType: "TILE_LANDED"
  },
  {
    id: "jur-rate-squeeze",
    title: "Lu\u1EADt Si\u1EBFt L\xE3i Su\u1EA5t Gi\u1EA3i Ch\u1EA5p",
    nameVi: "Lu\u1EADt Si\u1EBFt L\xE3i Su\u1EA5t Gi\u1EA3i Ch\u1EA5p",
    nameEn: "Mortgage Rate Squeeze",
    tagline: "Gi\u1EA3i ch\u1EA5p \u0111\u1EAFt \u0111\u1ECF h\u01A1n",
    taglineVi: "Gi\u1EA3i ch\u1EA5p \u0111\u1EAFt \u0111\u1ECF h\u01A1n",
    taglineEn: "Unmortgaging costs more",
    flavorText: "Ng\xE2n h\xE0ng t\u0103ng l\xE3i su\u1EA5t gi\u1EA3i ch\u1EA5p th\xEAm 10% trong 3 v\xF2ng.",
    flavorTextEn: "Banks raise unmortgage interest by 10% for 3 rounds.",
    descriptionVi: "Ng\xE2n h\xE0ng t\u0103ng l\xE3i su\u1EA5t gi\u1EA3i ch\u1EA5p th\xEAm 10% trong 3 v\xF2ng.",
    descriptionEn: "Banks raise unmortgage interest by 10% for 3 rounds.",
    category: "JURIDICAL",
    rarity: "UNCOMMON",
    effectType: "INTEREST_HIKE",
    value: 0,
    magnitude: 0,
    durationInTurns: 3,
    iconName: "TrendingUp",
    triggerType: "TILE_LANDED",
    harmful: true
  }
];

// src/game/chaos-engine/chaosCardsEn.ts
var BASE_CHAOS_CARDS_EN = {
  // POSITIVE
  "pos-vietlott-jackpot": {
    name: "Vietlott Power 6/55 Jackpot",
    tagline: "Billionaire luck",
    flavorText: "A bright red lottery ticket lands the jackpot. Collect +$400.",
    description: "A bright red lottery ticket lands the jackpot. Collect +$400."
  },
  "pos-fdi-boost": {
    name: "Semiconductor FDI Wave",
    tagline: "Foreign capital inflows",
    flavorText: "A global tech giant funds your startup project. Collect +$250.",
    description: "A global tech giant funds your startup project. Collect +$250."
  },
  "pos-green-grant": {
    name: "Net-Zero Green City Grant",
    tagline: "Ecological upgrade",
    flavorText: "An international green fund upgrades one of your buildings by 1 level (or pays $150 if you own none).",
    description: "An international green fund upgrades one of your buildings by 1 level (or pays $150 if you own none)."
  },
  "pos-tax-exemption": {
    name: "Corporate Tax Exemption Policy",
    tagline: "Economic stimulus",
    flavorText: "Your project qualifies for a high-tech stimulus package. Tax refund +$150.",
    description: "Your project qualifies for a high-tech stimulus package. Tax refund +$150."
  },
  "pos-stimulus-package": {
    name: "Nationwide Consumption Stimulus",
    tagline: "Everyone gets paid",
    flavorText: "The budget hands out cash to every citizen. Each player receives +$100.",
    description: "The budget hands out cash to every citizen. Each player receives +$100."
  },
  "pos-vip-flight": {
    name: "Private Jet to Start",
    tagline: "Fly straight home",
    flavorText: "A private jet flies you straight to the Start Gate (tile 0) with the full +$200 salary.",
    description: "A private jet flies you straight to the Start Gate (tile 0) with the full +$200 salary."
  },
  // NEGATIVE
  "neg-construction-audit": {
    name: "Surprise Construction Inspection",
    tagline: "Permits under review",
    flavorText: "Inspectors check your building permits. Pay a $30 fine for every build level you own.",
    description: "Inspectors check your building permits. Pay a $30 fine for every build level you own."
  },
  "neg-typhoon-central": {
    name: "Central Vietnam Typhoon",
    tagline: "Flooding and damage",
    flavorText: "A major storm tears roofs off and floods infrastructure. Every player pays $60 into the relief fund.",
    description: "A major storm tears roofs off and floods infrastructure. Every player pays $60 into the relief fund."
  },
  "neg-cyber-scam": {
    name: "Quantum Wallet Heist",
    tagline: "Account compromised",
    flavorText: "An international hacker cracks your e-wallet and steals $150 from you.",
    description: "An international hacker cracks your e-wallet and steals $150 from you."
  },
  "neg-traffic-fine": {
    name: "Highway Speed Camera Fine",
    tagline: "AI camera caught you",
    flavorText: "An AI camera records your vehicle speeding on the North-South expressway. Fine: $80.",
    description: "An AI camera records your vehicle speeding on the North-South expressway. Fine: $80."
  },
  "neg-quarantine-order": {
    name: "Economic Investigation Detention",
    tagline: "Taken into custody",
    flavorText: "Financial inspectors find suspicious cash flows and detain you at the Detention Zone (tile 10) for 2 turns!",
    description: "Financial inspectors find suspicious cash flows and detain you at the Detention Zone (tile 10) for 2 turns!"
  },
  "neg-supply-shortage": {
    name: "Building Material Shortage",
    tagline: "Steel prices spike",
    flavorText: "Cement and steel prices soar, forcing a construction surcharge of $100 on you.",
    description: "Cement and steel prices soar, forcing a construction surcharge of $100 on you."
  },
  // PERSONAL
  "per-robin-hack": {
    name: "Rival Wallet Drain Attack",
    tagline: "Malware siphons cash",
    flavorText: "You plant malware that pulls $60 from every rival who still has cash, straight into your account.",
    description: "You plant malware that pulls $60 from every rival who still has cash, straight into your account."
  },
  "per-vip-charity-gala": {
    name: "Tycoon Charity Gala",
    tagline: "Generous magnate",
    flavorText: "You show tycoon-class generosity and gift $40 to each rival.",
    description: "You show tycoon-class generosity and gift $40 to each rival."
  },
  "per-quantum-leap": {
    name: "Quantum Warp Gate",
    tagline: "A jump through space",
    flavorText: "You spin up the spatial leap ring and advance 6 tiles from your current position.",
    description: "You spin up the spatial leap ring and advance 6 tiles from your current position."
  },
  "per-get-out-jail-card": {
    name: "Privileged Immunity Card",
    tagline: "A golden way out",
    flavorText: "A golden pass that exempts you from detention. Receive 1 Get Out of Detention card.",
    description: "A golden pass that exempts you from detention. Receive 1 Get Out of Detention card."
  },
  "per-monopoly-hostile-takeover": {
    name: "Hostile Corporate Takeover",
    tagline: "Compulsory acquisition",
    flavorText: "You buy out your rival\u2019s cheapest unbuilt (level 0) tile after paying 1.5x its base price.",
    description: "You buy out your rival\u2019s cheapest unbuilt (level 0) tile after paying 1.5x its base price."
  },
  "per-desperation-roulette": {
    name: "Casino Fortune Roulette",
    tagline: "All or nothing",
    flavorText: "50/50: stake $100. Win and collect $200; lose and the stake is gone.",
    description: "50/50: stake $100. Win and collect $200; lose and the stake is gone."
  },
  // GLOBAL
  "glo-reverse-dimension": {
    name: "Time Reversal (Reverse Movement)",
    tagline: "The wheel spins backwards",
    flavorText: "Every player moves counter-clockwise for the next 3 rounds!",
    description: "Every player moves counter-clockwise for the next 3 rounds!"
  },
  "glo-musical-chairs": {
    name: "Random Position Swap",
    tagline: "Traffic chaos",
    flavorText: "The transport grid suffers a quantum fault! Every player swaps position.",
    description: "The transport grid suffers a quantum fault! Every player swaps position."
  },
  "glo-hyper-inflation": {
    name: "Urban Land Fever (Hyperinflation)",
    tagline: "Rent storm",
    flavorText: "Rent on every property on the board doubles (x2) for 2 rounds!",
    description: "Rent on every property on the board doubles (x2) for 2 rounds!"
  },
  "glo-solar-emp-blackout": {
    name: "Cosmic Solar EMP",
    tagline: "Payments paralysed",
    flavorText: "Payment terminals go dark: all rent is halved (x0.5) for 2 rounds.",
    description: "Payment terminals go dark: all rent is halved (x0.5) for 2 rounds."
  },
  "glo-golden-hour": {
    name: "Urban Golden Hour (Double Salary)",
    tagline: "Start bonus doubled",
    flavorText: "The city doubles the Start Gate reward to $400 for 1 round!",
    description: "The city doubles the Start Gate reward to $400 for 1 round!"
  },
  "glo-curfew-lockdown": {
    name: "Citywide Curfew Lockdown",
    tagline: "Movement restricted",
    flavorText: "Movement is capped: each dice roll moves you at most 4 tiles this round.",
    description: "Movement is capped: each dice roll moves you at most 4 tiles this round."
  },
  // ECONOMIC
  "eco-real-estate-boom": {
    name: "Thu Thiem & West Lake Land Boom",
    tagline: "Capital real estate surges",
    flavorText: "Rent for Hanoi and Ho Chi Minh City districts rises 1.5x for 3 rounds.",
    description: "Rent for Hanoi and Ho Chi Minh City districts rises 1.5x for 3 rounds."
  },
  "eco-bank-interest-hike": {
    name: "State Bank Raises Interest Rates",
    tagline: "Tighter credit",
    flavorText: "Mortgage redemption interest rises by 10% (to 20%) for 3 rounds.",
    description: "Mortgage redemption interest rises by 10% (to 20%) for 3 rounds."
  },
  "eco-subsidized-mortgage": {
    name: "Real Estate Credit Rescue Package",
    tagline: "Liquidity support",
    flavorText: "Banks lend 75% of base value against mortgages (instead of 50%) for 2 rounds.",
    description: "Banks lend 75% of base value against mortgages (instead of 50%) for 2 rounds."
  },
  "eco-freeze-market": {
    name: "Market Freeze",
    tagline: "Trading halted",
    flavorText: "Buying new land and upgrading buildings are locked across the board for 1 round.",
    description: "Buying new land and upgrading buildings are locked across the board for 1 round."
  },
  "eco-transport-boom": {
    name: "High-Speed Rail Opening Gala",
    tagline: "Transport infrastructure booms",
    flavorText: "All four national transport hubs charge double rent (x2) for 3 rounds!",
    description: "All four national transport hubs charge double rent (x2) for 3 rounds!"
  },
  "eco-utility-energy-tax": {
    name: "Power & Water Price Adjustment",
    tagline: "Essential utilities",
    flavorText: "Rent for EVN and SAWACO doubles for 2 rounds!",
    description: "Rent for EVN and SAWACO doubles for 2 rounds!"
  },
  // LEGENDARY
  "leg-robin-hood": {
    name: "Wealth Rebalance (Robin Hood)",
    tagline: "Take from the rich, give to the poor",
    flavorText: "The player with the highest net worth transfers 25% of their cash to the player with the lowest!",
    description: "The player with the highest net worth transfers 25% of their cash to the player with the lowest!"
  },
  "leg-mega-earthquake": {
    name: "Mega Earthquake Levels Buildings",
    tagline: "Seismic shock",
    flavorText: "Every property on the board with level >= 1 loses one build level!",
    description: "Every property on the board with level >= 1 loses one build level!"
  },
  "leg-black-hole-warp": {
    name: "Black Hole Gravity Well",
    tagline: "A vortex pulls everyone in",
    flavorText: "Every player is sucked onto the same tile: the one with the highest upgrade value!",
    description: "Every player is sucked onto the same tile: the one with the highest upgrade value!"
  },
  "leg-deathmatch-duel": {
    name: "One-on-One Deathmatch Duel",
    tagline: "Dice of life and death",
    flavorText: "You and the richest player roll two dice against each other. The lower score pays $300 to the winner!",
    description: "You and the richest player roll two dice against each other. The lower score pays $300 to the winner!"
  },
  "leg-national-jubilee": {
    name: "National Debt Jubilee",
    tagline: "All mortgages wiped",
    flavorText: "Every mortgaged property on the board is released free of charge!",
    description: "Every mortgaged property on the board is released free of charge!"
  },
  "leg-alien-mothership": {
    name: "Alien Mothership Invasion",
    tagline: "Landmark 81 blockaded",
    flavorText: "An alien mothership blockades Landmark 81 (tile 39), turning it into a Chaos Gate that collects no rent for 5 rounds!",
    description: "An alien mothership blockades Landmark 81 (tile 39), turning it into a Chaos Gate that collects no rent for 5 rounds!"
  }
};

// src/game/chaos-engine/chaosCards.ts
function withEnglishCopy(card) {
  const en = BASE_CHAOS_CARDS_EN[card.id];
  if (!en) return card;
  return {
    ...card,
    nameEn: card.nameEn ?? en.name,
    taglineEn: card.taglineEn ?? en.tagline,
    flavorTextEn: card.flavorTextEn ?? en.flavorText,
    descriptionEn: card.descriptionEn ?? en.description
  };
}
var BASE_CHAOS_CARDS = [
  // =========================================================================
  // NHÓM 1: DƯƠNG TÍNH (POSITIVE — LỢI THẾ & TÀI LỘC) - 6 CARDS
  // =========================================================================
  {
    id: "pos-vietlott-jackpot",
    title: "Tr\xFAng \u0110\u1ED9c \u0110\u1EAFc Vietlott Power 6/55",
    nameVi: "Tr\xFAng \u0110\u1ED9c \u0110\u1EAFc Vietlott Power 6/55",
    tagline: "V\u1EADn may t\u1EF7 ph\xFA",
    taglineVi: "V\u1EADn may t\u1EF7 ph\xFA",
    flavorText: "T\u1EA5m v\xE9 s\u1ED1 \u0111\u1ECF r\u1EF1c mang l\u1EA1i gi\u1EA3i \u0111\u1ED9c \u0111\u1EAFc kh\u1EE7ng cho b\u1EA1n! Nh\u1EADn ngay +$400.",
    descriptionVi: "T\u1EA5m v\xE9 s\u1ED1 \u0111\u1ECF r\u1EF1c mang l\u1EA1i gi\u1EA3i \u0111\u1ED9c \u0111\u1EAFc kh\u1EE7ng cho b\u1EA1n! Nh\u1EADn ngay +$400.",
    category: "POSITIVE",
    rarity: "RARE",
    effectType: "CASH_SELF",
    value: 400,
    magnitude: 400,
    durationInTurns: 0,
    iconName: "Sparkles",
    triggerType: "TILE_LANDED"
  },
  {
    id: "pos-fdi-boost",
    title: "L\xE0n S\xF3ng FDI C\xF4ng Ngh\u1EC7 B\xE1n D\u1EABn",
    nameVi: "L\xE0n S\xF3ng FDI C\xF4ng Ngh\u1EC7 B\xE1n D\u1EABn",
    tagline: "D\xF2ng v\u1ED1n ngo\u1EA1i qu\u1ED1c",
    taglineVi: "D\xF2ng v\u1ED1n ngo\u1EA1i qu\u1ED1c",
    flavorText: "T\u1EADp \u0111o\xE0n c\xF4ng ngh\u1EC7 to\xE0n c\u1EA7u r\xF3t v\u1ED1n kh\u1EE7ng v\xE0o d\u1EF1 \xE1n kh\u1EDFi nghi\u1EC7p c\u1EE7a b\u1EA1n. Nh\u1EADn ngay +$250.",
    descriptionVi: "T\u1EADp \u0111o\xE0n c\xF4ng ngh\u1EC7 to\xE0n c\u1EA7u r\xF3t v\u1ED1n kh\u1EE7ng v\xE0o d\u1EF1 \xE1n kh\u1EDFi nghi\u1EC7p c\u1EE7a b\u1EA1n. Nh\u1EADn ngay +$250.",
    category: "POSITIVE",
    rarity: "UNCOMMON",
    effectType: "CASH_SELF",
    value: 250,
    magnitude: 250,
    durationInTurns: 0,
    iconName: "TrendingUp",
    triggerType: "TILE_LANDED"
  },
  {
    id: "pos-green-grant",
    title: "T\xE0i Tr\u1EE3 \u0110\xF4 Th\u1ECB Xanh Net-Zero",
    nameVi: "T\xE0i Tr\u1EE3 \u0110\xF4 Th\u1ECB Xanh Net-Zero",
    tagline: "N\xE2ng c\u1EA5p sinh th\xE1i",
    taglineVi: "N\xE2ng c\u1EA5p sinh th\xE1i",
    flavorText: "Qu\u1EF9 ph\xE1t tri\u1EC3n xanh qu\u1ED1c t\u1EBF n\xE2ng c\u1EA5p mi\u1EC5n ph\xED 1 c\u1EA5p c\xF4ng tr\xECnh cho b\u1EA1n (ho\u1EB7c nh\u1EADn $150k n\u1EBFu kh\xF4ng c\xF3 \u0111\u1EA5t).",
    descriptionVi: "Qu\u1EF9 ph\xE1t tri\u1EC3n xanh qu\u1ED1c t\u1EBF n\xE2ng c\u1EA5p mi\u1EC5n ph\xED 1 c\u1EA5p c\xF4ng tr\xECnh cho b\u1EA1n (ho\u1EB7c nh\u1EADn $150k n\u1EBFu kh\xF4ng c\xF3 \u0111\u1EA5t).",
    category: "POSITIVE",
    rarity: "RARE",
    effectType: "FREE_UPGRADE",
    value: 150,
    magnitude: 150,
    durationInTurns: 0,
    iconName: "Leaf",
    triggerType: "TILE_LANDED"
  },
  {
    id: "pos-tax-exemption",
    title: "Ch\xEDnh S\xE1ch \u01AFu \u0110\xE3i Mi\u1EC5n Thu\u1EBF Doanh Nghi\u1EC7p",
    nameVi: "Ch\xEDnh S\xE1ch \u01AFu \u0110\xE3i Mi\u1EC5n Thu\u1EBF Doanh Nghi\u1EC7p",
    tagline: "K\xEDch c\u1EA7u kinh t\u1EBF",
    taglineVi: "K\xEDch c\u1EA7u kinh t\u1EBF",
    flavorText: "D\u1EF1 \xE1n c\u1EE7a b\u1EA1n n\u1EB1m trong di\u1EC7n k\xEDch c\u1EA7u c\xF4ng ngh\u1EC7 cao, nh\u1EADn ho\xE0n thu\u1EBF +$150.",
    descriptionVi: "D\u1EF1 \xE1n c\u1EE7a b\u1EA1n n\u1EB1m trong di\u1EC7n k\xEDch c\u1EA7u c\xF4ng ngh\u1EC7 cao, nh\u1EADn ho\xE0n thu\u1EBF +$150.",
    category: "POSITIVE",
    rarity: "COMMON",
    effectType: "CASH_SELF",
    value: 150,
    magnitude: 150,
    durationInTurns: 0,
    iconName: "Coins",
    triggerType: "TILE_LANDED"
  },
  {
    id: "pos-stimulus-package",
    title: "G\xF3i K\xEDch C\u1EA7u Ti\xEAu D\xF9ng To\xE0n Qu\u1ED1c",
    nameVi: "G\xF3i K\xEDch C\u1EA7u Ti\xEAu D\xF9ng To\xE0n Qu\u1ED1c",
    tagline: "Tr\u1EE3 c\u1EA5p to\xE0n d\xE2n",
    taglineVi: "Tr\u1EE3 c\u1EA5p to\xE0n d\xE2n",
    flavorText: "Ng\xE2n s\xE1ch ph\xE1t ti\u1EC1n m\u1EB7t h\u1ED7 tr\u1EE3 ti\xEAu d\xF9ng cho to\xE0n b\u1ED9 c\xF4ng d\xE2n th\xE0nh ph\u1ED1. M\u1ED7i ng\u01B0\u1EDDi nh\u1EADn +$100.",
    descriptionVi: "Ng\xE2n s\xE1ch ph\xE1t ti\u1EC1n m\u1EB7t h\u1ED7 tr\u1EE3 ti\xEAu d\xF9ng cho to\xE0n b\u1ED9 c\xF4ng d\xE2n th\xE0nh ph\u1ED1. M\u1ED7i ng\u01B0\u1EDDi nh\u1EADn +$100.",
    category: "POSITIVE",
    rarity: "COMMON",
    effectType: "CASH_ALL",
    value: 100,
    magnitude: 100,
    durationInTurns: 0,
    iconName: "Gift",
    triggerType: "TILE_LANDED"
  },
  {
    id: "pos-vip-flight",
    title: "Chuy\u1EBFn Bay Chuy\xEAn C\u01A1 Kh\u1EDFi H\xE0nh",
    nameVi: "Chuy\u1EBFn Bay Chuy\xEAn C\u01A1 Kh\u1EDFi H\xE0nh",
    tagline: "Bay th\u1EB3ng v\u1EC1 \u0111\xEDch",
    taglineVi: "Bay th\u1EB3ng v\u1EC1 \u0111\xEDch",
    flavorText: "Chuy\xEAn c\u01A1 \u0111\u01B0a b\u1EA1n bay th\u1EB3ng v\u1EC1 C\u1ED5ng Kh\u1EDFi H\xE0nh (Tile 0) v\xE0 nh\u1EADn \u0111\u1EE7 l\u01B0\u01A1ng +$200.",
    descriptionVi: "Chuy\xEAn c\u01A1 \u0111\u01B0a b\u1EA1n bay th\u1EB3ng v\u1EC1 C\u1ED5ng Kh\u1EDFi H\xE0nh (Tile 0) v\xE0 nh\u1EADn \u0111\u1EE7 l\u01B0\u01A1ng +$200.",
    category: "POSITIVE",
    rarity: "UNCOMMON",
    effectType: "TELEPORT",
    targetTileId: 0,
    value: 200,
    magnitude: 200,
    durationInTurns: 0,
    iconName: "Plane",
    triggerType: "TILE_LANDED"
  },
  // =========================================================================
  // NHÓM 2: ÂM TÍNH (NEGATIVE — CHI PHÍ & THỬ THÁCH) - 6 CARDS
  // =========================================================================
  {
    id: "neg-construction-audit",
    title: "Thanh Tra X\xE2y D\u1EF1ng \u0110\u1ED9t Xu\u1EA5t",
    nameVi: "Thanh Tra X\xE2y D\u1EF1ng \u0110\u1ED9t Xu\u1EA5t",
    tagline: "Ki\u1EC3m tra gi\u1EA5y ph\xE9p",
    taglineVi: "Ki\u1EC3m tra gi\u1EA5y ph\xE9p",
    flavorText: "C\u01A1 quan ki\u1EC3m tra gi\u1EA5y ph\xE9p c\xF4ng tr\xECnh b\u1EA5t \u0111\u1ED9ng s\u1EA3n. N\u1ED9p ph\u1EA1t $30 cho m\u1ED7i c\u1EA5p sao c\xF4ng tr\xECnh.",
    descriptionVi: "C\u01A1 quan ki\u1EC3m tra gi\u1EA5y ph\xE9p c\xF4ng tr\xECnh b\u1EA5t \u0111\u1ED9ng s\u1EA3n. N\u1ED9p ph\u1EA1t $30 cho m\u1ED7i c\u1EA5p sao c\xF4ng tr\xECnh.",
    category: "NEGATIVE",
    rarity: "UNCOMMON",
    effectType: "PROPERTY_TAX",
    value: 30,
    magnitude: 30,
    durationInTurns: 0,
    iconName: "Receipt",
    triggerType: "TILE_LANDED"
  },
  {
    id: "neg-typhoon-central",
    title: "B\xE3o Nhi\u1EC7t \u0110\u1EDBi \u0110\u1ED5 B\u1ED9 Mi\u1EC1n Trung",
    nameVi: "B\xE3o Nhi\u1EC7t \u0110\u1EDBi \u0110\u1ED5 B\u1ED9 Mi\u1EC1n Trung",
    tagline: "Ng\u1EADp \xFAng thi\xEAn tai",
    taglineVi: "Ng\u1EADp \xFAng thi\xEAn tai",
    flavorText: "B\xE3o l\u1EDBn g\xE2y t\u1ED1c m\xE1i v\xE0 ng\u1EADp \xFAng h\u1EA1 t\u1EA7ng. T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i n\u1ED9p -$60 v\xE0o qu\u1EF9 c\u1EE9u tr\u1EE3.",
    descriptionVi: "B\xE3o l\u1EDBn g\xE2y t\u1ED1c m\xE1i v\xE0 ng\u1EADp \xFAng h\u1EA1 t\u1EA7ng. T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i n\u1ED9p -$60 v\xE0o qu\u1EF9 c\u1EE9u tr\u1EE3.",
    category: "NEGATIVE",
    rarity: "COMMON",
    effectType: "CASH_ALL",
    value: -60,
    magnitude: -60,
    durationInTurns: 0,
    iconName: "CloudRain",
    triggerType: "TILE_LANDED"
  },
  {
    id: "neg-cyber-scam",
    title: "\u0110\u1ED9t Nh\u1EADp V\xED L\u01B0\u1EE3ng T\u1EED (Cyber Heist)",
    nameVi: "\u0110\u1ED9t Nh\u1EADp V\xED L\u01B0\u1EE3ng T\u1EED (Cyber Heist)",
    tagline: "Chi\u1EBFm \u0111o\u1EA1t t\xE0i kho\u1EA3n",
    taglineVi: "Chi\u1EBFm \u0111o\u1EA1t t\xE0i kho\u1EA3n",
    flavorText: "Hacker qu\u1ED1c t\u1EBF x\xE2m nh\u1EADp h\u1EC7 th\u1ED1ng v\xED \u0111i\u1EC7n t\u1EED v\xE0 chi\u1EBFm \u0111o\u1EA1t -$150 c\u1EE7a b\u1EA1n.",
    descriptionVi: "Hacker qu\u1ED1c t\u1EBF x\xE2m nh\u1EADp h\u1EC7 th\u1ED1ng v\xED \u0111i\u1EC7n t\u1EED v\xE0 chi\u1EBFm \u0111o\u1EA1t -$150 c\u1EE7a b\u1EA1n.",
    category: "NEGATIVE",
    rarity: "UNCOMMON",
    effectType: "CASH_SELF",
    value: -150,
    magnitude: -150,
    durationInTurns: 0,
    iconName: "ShieldAlert",
    triggerType: "TILE_LANDED"
  },
  {
    id: "neg-traffic-fine",
    title: "Ph\u1EA1t Ngu\u1ED9i Vi Ph\u1EA1m Giao Th\xF4ng Cao T\u1ED1c",
    nameVi: "Ph\u1EA1t Ngu\u1ED9i Vi Ph\u1EA1m Giao Th\xF4ng Cao T\u1ED1c",
    tagline: "Camera AI b\u1EAFt t\u1ED1c \u0111\u1ED9",
    taglineVi: "Camera AI b\u1EAFt t\u1ED1c \u0111\u1ED9",
    flavorText: "Camera AI ghi nh\u1EADn ph\u01B0\u01A1ng ti\u1EC7n di chuy\u1EC3n qu\xE1 t\u1ED1c \u0111\u1ED9 tr\xEAn cao t\u1ED1c B\u1EAFc Nam. N\u1ED9p ph\u1EA1t -$80.",
    descriptionVi: "Camera AI ghi nh\u1EADn ph\u01B0\u01A1ng ti\u1EC7n di chuy\u1EC3n qu\xE1 t\u1ED1c \u0111\u1ED9 tr\xEAn cao t\u1ED1c B\u1EAFc Nam. N\u1ED9p ph\u1EA1t -$80.",
    category: "NEGATIVE",
    rarity: "COMMON",
    effectType: "CASH_SELF",
    value: -80,
    magnitude: -80,
    durationInTurns: 0,
    iconName: "AlertTriangle",
    triggerType: "TILE_LANDED"
  },
  {
    id: "neg-quarantine-order",
    title: "L\u1EC7nh T\u1EA1m Gi\u1EEF \u0110i\u1EC1u Tra Kinh T\u1EBF",
    nameVi: "L\u1EC7nh T\u1EA1m Gi\u1EEF \u0110i\u1EC1u Tra Kinh T\u1EBF",
    tagline: "V\xE0o khu c\xE1ch ly",
    taglineVi: "V\xE0o khu c\xE1ch ly",
    flavorText: "Thanh tra t\xE0i ch\xEDnh ph\xE1t hi\u1EC7n d\xF2ng ti\u1EC1n b\u1EA5t minh, t\u1EA1m giam t\u1EA1i Khu C\xE1ch Ly (Tile 10) trong 2 l\u01B0\u1EE3t!",
    descriptionVi: "Thanh tra t\xE0i ch\xEDnh ph\xE1t hi\u1EC7n d\xF2ng ti\u1EC1n b\u1EA5t minh, t\u1EA1m giam t\u1EA1i Khu C\xE1ch Ly (Tile 10) trong 2 l\u01B0\u1EE3t!",
    category: "NEGATIVE",
    rarity: "UNCOMMON",
    effectType: "GO_TO_DETENTION",
    targetTileId: 10,
    value: 2,
    magnitude: 2,
    durationInTurns: 2,
    iconName: "Lock",
    triggerType: "TILE_LANDED"
  },
  {
    id: "neg-supply-shortage",
    title: "\u0110\u1EE9t G\xE3y Chu\u1ED7i Cung \u1EE8ng V\u1EADt Li\u1EC7u",
    nameVi: "\u0110\u1EE9t G\xE3y Chu\u1ED7i Cung \u1EE8ng V\u1EADt Li\u1EC7u",
    tagline: "Gi\xE1 s\u1EAFt th\xE9p leo thang",
    taglineVi: "Gi\xE1 s\u1EAFt th\xE9p leo thang",
    flavorText: "Gi\xE1 xi m\u0103ng v\xE0 s\u1EAFt th\xE9p leo thang phi m\xE3, b\u1EA1n ph\u1EA3i chi tr\u1EA3 ph\u1EE5 ph\xED x\xE2y d\u1EF1ng -$100.",
    descriptionVi: "Gi\xE1 xi m\u0103ng v\xE0 s\u1EAFt th\xE9p leo thang phi m\xE3, b\u1EA1n ph\u1EA3i chi tr\u1EA3 ph\u1EE5 ph\xED x\xE2y d\u1EF1ng -$100.",
    category: "NEGATIVE",
    rarity: "COMMON",
    effectType: "CASH_SELF",
    value: -100,
    magnitude: -100,
    durationInTurns: 0,
    iconName: "Truck",
    triggerType: "TILE_LANDED"
  },
  // =========================================================================
  // NHÓM 3: CÁ NHÂN (PERSONAL — TÁC ĐỘNG & TƯƠNG TÁC) - 6 CARDS
  // =========================================================================
  {
    id: "per-robin-hack",
    title: "T\u1EA5n C\xF4ng H\xFAt V\xED \u0110\u1ED1i Th\u1EE7",
    nameVi: "T\u1EA5n C\xF4ng H\xFAt V\xED \u0110\u1ED1i Th\u1EE7",
    tagline: "M\xE3 \u0111\u1ED9c r\xFAt v\xED",
    taglineVi: "M\xE3 \u0111\u1ED9c r\xFAt v\xED",
    flavorText: "B\u1EA1n c\xE0i m\xE3 \u0111\u1ED9c r\xFAt b\u1EDBt $60 t\u1EEB v\xED c\u1EE7a m\u1ED7i \u0111\u1ED1i th\u1EE7 c\xF2n ti\u1EC1n m\u1EB7t chuy\u1EC3n v\xE0o t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.",
    descriptionVi: "B\u1EA1n c\xE0i m\xE3 \u0111\u1ED9c r\xFAt b\u1EDBt $60 t\u1EEB v\xED c\u1EE7a m\u1ED7i \u0111\u1ED1i th\u1EE7 c\xF2n ti\u1EC1n m\u1EB7t chuy\u1EC3n v\xE0o t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.",
    category: "PERSONAL",
    rarity: "RARE",
    effectType: "CASH_STEAL",
    value: 60,
    magnitude: 60,
    durationInTurns: 0,
    iconName: "Zap",
    triggerType: "TILE_LANDED"
  },
  {
    id: "per-vip-charity-gala",
    title: "\u0110\xEAm Ti\u1EC7c T\u1EEB Thi\u1EC7n Doanh Nh\xE2n",
    nameVi: "\u0110\xEAm Ti\u1EC7c T\u1EEB Thi\u1EC7n Doanh Nh\xE2n",
    tagline: "H\xE0o ph\xF3ng t\xE0i phi\u1EC7t",
    taglineVi: "H\xE0o ph\xF3ng t\xE0i phi\u1EC7t",
    flavorText: "Th\u1EC3 hi\u1EC7n \u0111\u1EB3ng c\u1EA5p nh\xE0 t\xE0i phi\u1EC7t h\xE0o ph\xF3ng t\u1EB7ng m\u1ED7i \u0111\u1ED1i th\u1EE7 $40.",
    descriptionVi: "Th\u1EC3 hi\u1EC7n \u0111\u1EB3ng c\u1EA5p nh\xE0 t\xE0i phi\u1EC7t h\xE0o ph\xF3ng t\u1EB7ng m\u1ED7i \u0111\u1ED1i th\u1EE7 $40.",
    category: "PERSONAL",
    rarity: "COMMON",
    effectType: "CASH_STEAL",
    value: -40,
    magnitude: -40,
    durationInTurns: 0,
    iconName: "Heart",
    triggerType: "TILE_LANDED"
  },
  {
    id: "per-quantum-leap",
    title: "C\u1ED5ng D\u1ECBch Chuy\u1EC3n L\u01B0\u1EE3ng T\u1EED",
    nameVi: "C\u1ED5ng D\u1ECBch Chuy\u1EC3n L\u01B0\u1EE3ng T\u1EED",
    tagline: "B\u01B0\u1EDBc nh\u1EA3y kh\xF4ng gian",
    taglineVi: "B\u01B0\u1EDBc nh\u1EA3y kh\xF4ng gian",
    flavorText: "B\u1EA1n k\xEDch ho\u1EA1t v\xF2ng xoay b\u01B0\u1EDBc nh\u1EA3y kh\xF4ng gian, ti\u1EBFn th\xEAm 6 b\u01B0\u1EDBc t\u1EEB v\u1ECB tr\xED hi\u1EC7n t\u1EA1i.",
    descriptionVi: "B\u1EA1n k\xEDch ho\u1EA1t v\xF2ng xoay b\u01B0\u1EDBc nh\u1EA3y kh\xF4ng gian, ti\u1EBFn th\xEAm 6 b\u01B0\u1EDBc t\u1EEB v\u1ECB tr\xED hi\u1EC7n t\u1EA1i.",
    category: "PERSONAL",
    rarity: "UNCOMMON",
    effectType: "TELEPORT",
    value: 6,
    magnitude: 6,
    durationInTurns: 0,
    iconName: "FastForward",
    triggerType: "TILE_LANDED"
  },
  {
    id: "per-get-out-jail-card",
    title: "Th\u1EBB Mi\u1EC5n Tr\u1EEB Tr\xE1ch Nhi\u1EC7m \u0110\u1EB7c Quy\u1EC1n",
    nameVi: "Th\u1EBB Mi\u1EC5n Tr\u1EEB Tr\xE1ch Nhi\u1EC7m \u0110\u1EB7c Quy\u1EC1n",
    tagline: "V\xE9 v\xE0ng tho\xE1t hi\u1EC3m",
    taglineVi: "V\xE9 v\xE0ng tho\xE1t hi\u1EC3m",
    flavorText: "T\u1EA5m v\xE9 v\xE0ng mi\u1EC5n ch\u1EA5p h\xE0nh t\u1EA1m giam, trao ngay 1 th\u1EBB Mi\u1EC5n Giam Gi\u1EEF cho b\u1EA1n.",
    descriptionVi: "T\u1EA5m v\xE9 v\xE0ng mi\u1EC5n ch\u1EA5p h\xE0nh t\u1EA1m giam, trao ngay 1 th\u1EBB Mi\u1EC5n Giam Gi\u1EEF cho b\u1EA1n.",
    category: "PERSONAL",
    rarity: "UNCOMMON",
    effectType: "DETENTION_IMMUNITY",
    value: 1,
    magnitude: 1,
    durationInTurns: 0,
    iconName: "Key",
    triggerType: "TILE_LANDED"
  },
  {
    id: "per-monopoly-hostile-takeover",
    title: "Th\xE2u T\xF3m C\u1ED5 Ph\u1EA7n Doanh Nghi\u1EC7p",
    nameVi: "Th\xE2u T\xF3m C\u1ED5 Ph\u1EA7n Doanh Nghi\u1EC7p",
    tagline: "Mua l\u1EA1i b\u1EAFt bu\u1ED9c",
    taglineVi: "Mua l\u1EA1i b\u1EAFt bu\u1ED9c",
    flavorText: "B\u1EA1n mua l\u1EA1i 1 \xF4 \u0111\u1EA5t tr\u1ED1ng Level 0 c\u1EE7a \u0111\u1ED1i th\u1EE7 c\xF3 gi\xE1 th\u1EA5p nh\u1EA5t sau khi thanh to\xE1n 1.5x gi\xE1 g\u1ED1c.",
    descriptionVi: "B\u1EA1n mua l\u1EA1i 1 \xF4 \u0111\u1EA5t tr\u1ED1ng Level 0 c\u1EE7a \u0111\u1ED1i th\u1EE7 c\xF3 gi\xE1 th\u1EA5p nh\u1EA5t sau khi thanh to\xE1n 1.5x gi\xE1 g\u1ED1c.",
    category: "PERSONAL",
    rarity: "RARE",
    effectType: "HOSTILE_TAKEOVER",
    value: 150,
    magnitude: 150,
    durationInTurns: 0,
    iconName: "Briefcase",
    triggerType: "TILE_LANDED"
  },
  {
    id: "per-desperation-roulette",
    title: "V\xE1n C\u01B0\u1EE3c \u0110\u1ED5i \u0110\u1EDDi T\u1EA1i S\xF2ng B\u1EA1c",
    nameVi: "V\xE1n C\u01B0\u1EE3c \u0110\u1ED5i \u0110\u1EDDi T\u1EA1i S\xF2ng B\u1EA1c",
    tagline: "\u0110\u01B0\u1EE3c \u0103n c\u1EA3 ng\xE3 v\u1EC1 kh\xF4ng",
    taglineVi: "\u0110\u01B0\u1EE3c \u0103n c\u1EA3 ng\xE3 v\u1EC1 kh\xF4ng",
    flavorText: "50/50: \u0110\u1EB7t c\u01B0\u1EE3c $100: Th\u1EAFng nh\u1EADn $200, thua m\u1EA5t tr\u1EAFng $100.",
    descriptionVi: "50/50: \u0110\u1EB7t c\u01B0\u1EE3c $100: Th\u1EAFng nh\u1EADn $200, thua m\u1EA5t tr\u1EAFng $100.",
    category: "PERSONAL",
    rarity: "UNCOMMON",
    effectType: "DESPERATION_GAMBLE",
    value: 100,
    magnitude: 100,
    durationInTurns: 0,
    iconName: "Dices",
    triggerType: "CRISIS_DESPERATION"
  },
  // =========================================================================
  // NHÓM 4: TOÀN CẦU (GLOBAL — ĐẢO LỘN QUY TẮC BÀN CỜ) - 6 CARDS
  // =========================================================================
  {
    id: "glo-reverse-dimension",
    title: "Ngh\u1ECBch \u0110\u1EA3o Th\u1EDDi Gian (\u0110\u1ED5i Chi\u1EC1u \u0110i)",
    nameVi: "Ngh\u1ECBch \u0110\u1EA3o Th\u1EDDi Gian (\u0110\u1ED5i Chi\u1EC1u \u0110i)",
    tagline: "\u0110\u1EA3o ng\u01B0\u1EE3c b\xE1nh xe v\u1EADn m\u1EC7nh",
    taglineVi: "\u0110\u1EA3o ng\u01B0\u1EE3c b\xE1nh xe v\u1EADn m\u1EC7nh",
    flavorText: "To\xE0n b\u1ED9 ng\u01B0\u1EDDi ch\u01A1i s\u1EBD di chuy\u1EC3n ng\u01B0\u1EE3c chi\u1EC1u kim \u0111\u1ED3ng h\u1ED3 trong 3 v\xF2ng t\u1EDBi!",
    descriptionVi: "To\xE0n b\u1ED9 ng\u01B0\u1EDDi ch\u01A1i s\u1EBD di chuy\u1EC3n ng\u01B0\u1EE3c chi\u1EC1u kim \u0111\u1ED3ng h\u1ED3 trong 3 v\xF2ng t\u1EDBi!",
    category: "GLOBAL",
    rarity: "CALAMITY",
    effectType: "REVERSE_DIRECTION",
    value: -1,
    magnitude: -1,
    durationInTurns: 3,
    iconName: "RotateCcw",
    triggerType: "TILE_LANDED"
  },
  {
    id: "glo-musical-chairs",
    title: "Ho\xE1n \u0110\u1ED5i V\u1ECB Tr\xED Ng\u1EABu Nhi\xEAn",
    nameVi: "Ho\xE1n \u0110\u1ED5i V\u1ECB Tr\xED Ng\u1EABu Nhi\xEAn",
    tagline: "H\u1ED7n lo\u1EA1n giao th\xF4ng",
    taglineVi: "H\u1ED7n lo\u1EA1n giao th\xF4ng",
    flavorText: "H\u1EC7 th\u1ED1ng giao th\xF4ng g\u1EB7p s\u1EF1 c\u1ED1 l\u01B0\u1EE3ng t\u1EED! T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i ho\xE1n \u0111\u1ED5i v\u1ECB tr\xED cho nhau.",
    descriptionVi: "H\u1EC7 th\u1ED1ng giao th\xF4ng g\u1EB7p s\u1EF1 c\u1ED1 l\u01B0\u1EE3ng t\u1EED! T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i ho\xE1n \u0111\u1ED5i v\u1ECB tr\xED cho nhau.",
    category: "GLOBAL",
    rarity: "RARE",
    effectType: "SWAP_POSITIONS",
    value: 0,
    magnitude: 0,
    durationInTurns: 0,
    iconName: "Shuffle",
    triggerType: "TILE_LANDED"
  },
  {
    id: "glo-hyper-inflation",
    title: "C\u01A1n S\u1ED1t \u0110\u1EA5t \u0110\xF4 Th\u1ECB (Si\xEAu L\u1EA1m Ph\xE1t)",
    nameVi: "C\u01A1n S\u1ED1t \u0110\u1EA5t \u0110\xF4 Th\u1ECB (Si\xEAu L\u1EA1m Ph\xE1t)",
    tagline: "B\xE3o gi\xE1 ti\u1EC1n thu\xEA",
    taglineVi: "B\xE3o gi\xE1 ti\u1EC1n thu\xEA",
    flavorText: "Ti\u1EC1n thu\xEA to\xE0n b\u1ED9 b\u1EA5t \u0111\u1ED9ng s\u1EA3n tr\xEAn b\xE0n c\u1EDD t\u0103ng g\u1EA5p \u0111\xF4i (x2) trong 2 v\xF2ng!",
    descriptionVi: "Ti\u1EC1n thu\xEA to\xE0n b\u1ED9 b\u1EA5t \u0111\u1ED9ng s\u1EA3n tr\xEAn b\xE0n c\u1EDD t\u0103ng g\u1EA5p \u0111\xF4i (x2) trong 2 v\xF2ng!",
    category: "GLOBAL",
    rarity: "CALAMITY",
    effectType: "RENT_MULTIPLIER",
    value: 2,
    magnitude: 2,
    durationInTurns: 2,
    iconName: "Flame",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "glo-solar-emp-blackout",
    title: "B\xE3o T\u1EEB V\u0169 Tr\u1EE5 (Solar EMP)",
    nameVi: "B\xE3o T\u1EEB V\u0169 Tr\u1EE5 (Solar EMP)",
    tagline: "T\xEA li\u1EC7t thanh to\xE1n",
    taglineVi: "T\xEA li\u1EC7t thanh to\xE1n",
    flavorText: "Thi\u1EBFt b\u1ECB thanh to\xE1n t\xEA li\u1EC7t t\u1EA1m th\u1EDDi, ti\u1EC1n thu\xEA to\xE0n s\xE0n gi\u1EA3m m\u1ED9t n\u1EEDa (x0.5) trong 2 v\xF2ng.",
    descriptionVi: "Thi\u1EBFt b\u1ECB thanh to\xE1n t\xEA li\u1EC7t t\u1EA1m th\u1EDDi, ti\u1EC1n thu\xEA to\xE0n s\xE0n gi\u1EA3m m\u1ED9t n\u1EEDa (x0.5) trong 2 v\xF2ng.",
    category: "GLOBAL",
    rarity: "UNCOMMON",
    effectType: "RENT_MULTIPLIER",
    value: 0.5,
    magnitude: 0.5,
    durationInTurns: 2,
    iconName: "ZapOff",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "glo-golden-hour",
    title: "Gi\u1EDD V\xE0ng \u0110\xF4 Th\u1ECB (Double Salary)",
    nameVi: "Gi\u1EDD V\xE0ng \u0110\xF4 Th\u1ECB (Double Salary)",
    tagline: "T\u0103ng g\u1EA5p \u0111\xF4i l\u01B0\u01A1ng kh\u1EDFi h\xE0nh",
    taglineVi: "T\u0103ng g\u1EA5p \u0111\xF4i l\u01B0\u01A1ng kh\u1EDFi h\xE0nh",
    flavorText: "Ch\xEDnh quy\u1EC1n n\xE2ng m\u1EE9c th\u01B0\u1EDFng C\u1ED5ng Kh\u1EDFi H\xE0nh l\xEAn g\u1EA5p \u0111\xF4i ($400) trong 1 v\xF2ng!",
    descriptionVi: "Ch\xEDnh quy\u1EC1n n\xE2ng m\u1EE9c th\u01B0\u1EDFng C\u1ED5ng Kh\u1EDFi H\xE0nh l\xEAn g\u1EA5p \u0111\xF4i ($400) trong 1 v\xF2ng!",
    category: "GLOBAL",
    rarity: "UNCOMMON",
    effectType: "GOLDEN_HOUR",
    value: 400,
    magnitude: 400,
    durationInTurns: 1,
    iconName: "Clock",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "glo-curfew-lockdown",
    title: "L\u1EC7nh Gi\u1EDBi Nghi\xEAm To\xE0n Th\xE0nh Ph\u1ED1",
    nameVi: "L\u1EC7nh Gi\u1EDBi Nghi\xEAm To\xE0n Th\xE0nh Ph\u1ED1",
    tagline: "H\u1EA1n ch\u1EBF t\u1ED1c \u0111\u1ED9",
    taglineVi: "H\u1EA1n ch\u1EBF t\u1ED1c \u0111\u1ED9",
    flavorText: "Gi\u1EDBi h\u1EA1n t\u1ED1c \u0111\u1ED9 di chuy\u1EC3n, m\u1ED7i l\u1EA7n \u0111\u1ED5 x\xFAc x\u1EAFc t\u1ED1i \u0111a ch\u1EC9 \u0111\u01B0\u1EE3c \u0111i 4 b\u01B0\u1EDBc trong v\xF2ng n\xE0y.",
    descriptionVi: "Gi\u1EDBi h\u1EA1n t\u1ED1c \u0111\u1ED9 di chuy\u1EC3n, m\u1ED7i l\u1EA7n \u0111\u1ED5 x\xFAc x\u1EAFc t\u1ED1i \u0111a ch\u1EC9 \u0111\u01B0\u1EE3c \u0111i 4 b\u01B0\u1EDBc trong v\xF2ng n\xE0y.",
    category: "GLOBAL",
    rarity: "RARE",
    effectType: "CURFEW",
    value: 4,
    magnitude: 4,
    durationInTurns: 1,
    iconName: "Shield",
    triggerType: "ROUND_INTERVAL"
  },
  // =========================================================================
  // NHÓM 5: KINH TẾ (ECONOMIC — BẤT ĐỘNG SẢN & TÀI CHÍNH) - 6 CARDS
  // =========================================================================
  {
    id: "eco-real-estate-boom",
    title: "S\xF3ng S\u1ED1t \u0110\u1EA5t Th\u1EE7 Thi\xEAm & T\xE2y H\u1ED3",
    nameVi: "S\xF3ng S\u1ED1t \u0110\u1EA5t Th\u1EE7 Thi\xEAm & T\xE2y H\u1ED3",
    tagline: "B\xF9ng n\u1ED5 b\u1EA5t \u0111\u1ED9ng s\u1EA3n th\u1EE7 ph\u1EE7",
    taglineVi: "B\xF9ng n\u1ED5 b\u1EA5t \u0111\u1ED9ng s\u1EA3n th\u1EE7 ph\u1EE7",
    flavorText: "T\u0103ng 1.5x ti\u1EC1n thu\xEA ri\xEAng cho c\xE1c b\u1EA5t \u0111\u1ED9ng s\u1EA3n thu\u1ED9c Qu\u1EADn H\xE0 N\u1ED9i v\xE0 TP.HCM trong 3 v\xF2ng.",
    descriptionVi: "T\u0103ng 1.5x ti\u1EC1n thu\xEA ri\xEAng cho c\xE1c b\u1EA5t \u0111\u1ED9ng s\u1EA3n thu\u1ED9c Qu\u1EADn H\xE0 N\u1ED9i v\xE0 TP.HCM trong 3 v\xF2ng.",
    category: "ECONOMIC",
    rarity: "RARE",
    effectType: "DISTRICT_BOOM",
    value: 1.5,
    magnitude: 1.5,
    durationInTurns: 3,
    iconName: "Building2",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "eco-bank-interest-hike",
    title: "Ng\xE2n H\xE0ng Nh\xE0 N\u01B0\u1EDBc T\u0103ng L\xE3i Su\u1EA5t",
    nameVi: "Ng\xE2n H\xE0ng Nh\xE0 N\u01B0\u1EDBc T\u0103ng L\xE3i Su\u1EA5t",
    tagline: "Th\u1EAFt ch\u1EB7t t\xEDn d\u1EE5ng",
    taglineVi: "Th\u1EAFt ch\u1EB7t t\xEDn d\u1EE5ng",
    flavorText: "L\xE3i su\u1EA5t chu\u1ED9c l\u1EA1i \u0111\u1EA5t th\u1EBF ch\u1EA5p t\u0103ng th\xEAm 10% (l\xEAn 20% l\xE3i su\u1EA5t) trong 3 v\xF2ng.",
    descriptionVi: "L\xE3i su\u1EA5t chu\u1ED9c l\u1EA1i \u0111\u1EA5t th\u1EBF ch\u1EA5p t\u0103ng th\xEAm 10% (l\xEAn 20% l\xE3i su\u1EA5t) trong 3 v\xF2ng.",
    category: "ECONOMIC",
    rarity: "UNCOMMON",
    effectType: "INTEREST_HIKE",
    value: 20,
    magnitude: 20,
    durationInTurns: 3,
    iconName: "Percent",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "eco-subsidized-mortgage",
    title: "G\xF3i C\u1EE9u Tr\u1EE3 T\xEDn D\u1EE5ng B\u1EA5t \u0110\u1ED9ng S\u1EA3n",
    nameVi: "G\xF3i C\u1EE9u Tr\u1EE3 T\xEDn D\u1EE5ng B\u1EA5t \u0110\u1ED9ng S\u1EA3n",
    tagline: "H\u1ED7 tr\u1EE3 thanh kho\u1EA3n",
    taglineVi: "H\u1ED7 tr\u1EE3 thanh kho\u1EA3n",
    flavorText: "Ng\xE2n h\xE0ng h\u1ED7 tr\u1EE3 vay c\u1EA7m c\u1ED1 nh\u1EADn ngay 75% gi\xE1 tr\u1ECB g\u1ED1c (thay v\xEC 50%) trong 2 v\xF2ng.",
    descriptionVi: "Ng\xE2n h\xE0ng h\u1ED7 tr\u1EE3 vay c\u1EA7m c\u1ED1 nh\u1EADn ngay 75% gi\xE1 tr\u1ECB g\u1ED1c (thay v\xEC 50%) trong 2 v\xF2ng.",
    category: "ECONOMIC",
    rarity: "UNCOMMON",
    effectType: "SUBSIDIZED_MORTGAGE",
    value: 75,
    magnitude: 75,
    durationInTurns: 2,
    iconName: "Landmark",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "eco-freeze-market",
    title: "\u0110\xF3ng B\u0103ng Th\u1ECB Tr\u01B0\u1EDDng Mua B\xE1n",
    nameVi: "\u0110\xF3ng B\u0103ng Th\u1ECB Tr\u01B0\u1EDDng Mua B\xE1n",
    tagline: "T\u1EA1m ng\u1EEBng giao d\u1ECBch",
    taglineVi: "T\u1EA1m ng\u1EEBng giao d\u1ECBch",
    flavorText: "Kh\xF3a quy\u1EC1n mua \u0111\u1EA5t m\u1EDBi v\xE0 quy\u1EC1n n\xE2ng c\u1EA5p tr\xEAn to\xE0n b\xE0n c\u1EDD trong 1 v\xF2ng.",
    descriptionVi: "Kh\xF3a quy\u1EC1n mua \u0111\u1EA5t m\u1EDBi v\xE0 quy\u1EC1n n\xE2ng c\u1EA5p tr\xEAn to\xE0n b\xE0n c\u1EDD trong 1 v\xF2ng.",
    category: "ECONOMIC",
    rarity: "RARE",
    effectType: "FREEZE_MARKET",
    value: 1,
    magnitude: 1,
    durationInTurns: 1,
    iconName: "Snowflake",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "eco-transport-boom",
    title: "\u0110\u1EA1i L\u1EC5 Kh\xE1nh Th\xE0nh \u0110\u01B0\u1EDDng S\u1EAFt T\u1ED1c \u0110\u1ED9 Cao",
    nameVi: "\u0110\u1EA1i L\u1EC5 Kh\xE1nh Th\xE0nh \u0110\u01B0\u1EDDng S\u1EAFt T\u1ED1c \u0110\u1ED9 Cao",
    tagline: "H\u1EA1 t\u1EA7ng giao th\xF4ng b\xF9ng n\u1ED5",
    taglineVi: "H\u1EA1 t\u1EA7ng giao th\xF4ng b\xF9ng n\u1ED5",
    flavorText: "To\xE0n b\u1ED9 4 Tr\u1EA1m V\u1EADn T\u1EA3i Qu\u1ED1c Gia thu ti\u1EC1n thu\xEA g\u1EA5p \u0111\xF4i (x2) trong 3 v\xF2ng!",
    descriptionVi: "To\xE0n b\u1ED9 4 Tr\u1EA1m V\u1EADn T\u1EA3i Qu\u1ED1c Gia thu ti\u1EC1n thu\xEA g\u1EA5p \u0111\xF4i (x2) trong 3 v\xF2ng!",
    category: "ECONOMIC",
    rarity: "UNCOMMON",
    effectType: "TRANSPORT_BOOM",
    value: 2,
    magnitude: 2,
    durationInTurns: 3,
    iconName: "TrainTrack",
    triggerType: "ROUND_INTERVAL"
  },
  {
    id: "eco-utility-energy-tax",
    title: "\u0110i\u1EC1u Ch\u1EC9nh Gi\xE1 \u0110i\u1EC7n & Bi\u1EC3u Gi\xE1 N\u01B0\u1EDBc",
    nameVi: "\u0110i\u1EC1u Ch\u1EC9nh Gi\xE1 \u0110i\u1EC7n & Bi\u1EC3u Gi\xE1 N\u01B0\u1EDBc",
    tagline: "N\u0103ng l\u01B0\u1EE3ng thi\u1EBFt y\u1EBFu",
    taglineVi: "N\u0103ng l\u01B0\u1EE3ng thi\u1EBFt y\u1EBFu",
    flavorText: "Nh\xE2n \u0111\xF4i h\u1EC7 s\u1ED1 ti\u1EC1n thu\xEA c\u1EE7a EVN v\xE0 SAWACO trong 2 v\xF2ng!",
    descriptionVi: "Nh\xE2n \u0111\xF4i h\u1EC7 s\u1ED1 ti\u1EC1n thu\xEA c\u1EE7a EVN v\xE0 SAWACO trong 2 v\xF2ng!",
    category: "ECONOMIC",
    rarity: "UNCOMMON",
    effectType: "UTILITY_BOOM",
    value: 2,
    magnitude: 2,
    durationInTurns: 2,
    iconName: "Lightbulb",
    triggerType: "ROUND_INTERVAL"
  },
  // =========================================================================
  // NHÓM 6: HUYỀN THOẠI HIẾM (RARE LEGENDARY & CALAMITY) - 6 CARDS
  // =========================================================================
  {
    id: "leg-robin-hood",
    title: "T\xE1i C\xE2n B\u1EB1ng T\xE0i S\u1EA3n (Robin Hood)",
    nameVi: "T\xE1i C\xE2n B\u1EB1ng T\xE0i S\u1EA3n (Robin Hood)",
    tagline: "L\u1EA5y c\u1EE7a ng\u01B0\u1EDDi gi\xE0u chia cho ng\u01B0\u1EDDi ngh\xE8o",
    taglineVi: "L\u1EA5y c\u1EE7a ng\u01B0\u1EDDi gi\xE0u chia cho ng\u01B0\u1EDDi ngh\xE8o",
    flavorText: "Ng\u01B0\u1EDDi c\xF3 Net Worth cao nh\u1EA5t chuy\u1EC3n 25% ti\u1EC1n m\u1EB7t c\u1EE7a m\xECnh cho ng\u01B0\u1EDDi c\xF3 Net Worth th\u1EA5p nh\u1EA5t!",
    descriptionVi: "Ng\u01B0\u1EDDi c\xF3 Net Worth cao nh\u1EA5t chuy\u1EC3n 25% ti\u1EC1n m\u1EB7t c\u1EE7a m\xECnh cho ng\u01B0\u1EDDi c\xF3 Net Worth th\u1EA5p nh\u1EA5t!",
    category: "LEGENDARY",
    rarity: "LEGENDARY",
    effectType: "REDISTRIBUTE_WEALTH",
    value: 25,
    magnitude: 25,
    durationInTurns: 0,
    iconName: "Scale",
    triggerType: "TILE_LANDED"
  },
  {
    id: "leg-mega-earthquake",
    title: "\u0110\u1ED9ng \u0110\u1EA5t San Ph\u1EB3ng C\xF4ng Tr\xECnh",
    nameVi: "\u0110\u1ED9ng \u0110\u1EA5t San Ph\u1EB3ng C\xF4ng Tr\xECnh",
    tagline: "Thi\xEAn tai rung ch\u1EA5n",
    taglineVi: "Thi\xEAn tai rung ch\u1EA5n",
    flavorText: "To\xE0n b\u1ED9 b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang c\xF3 c\u1EA5p Level >= 1 tr\xEAn b\xE0n c\u1EDD b\u1ECB s\u1EE5t gi\u1EA3m 1 c\u1EA5p sao!",
    descriptionVi: "To\xE0n b\u1ED9 b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang c\xF3 c\u1EA5p Level >= 1 tr\xEAn b\xE0n c\u1EDD b\u1ECB s\u1EE5t gi\u1EA3m 1 c\u1EA5p sao!",
    category: "LEGENDARY",
    rarity: "LEGENDARY",
    effectType: "DOWNGRADE_PROPERTY",
    value: 1,
    magnitude: 1,
    durationInTurns: 0,
    iconName: "Activity",
    triggerType: "TILE_LANDED"
  },
  {
    id: "leg-black-hole-warp",
    title: "C\u1ED5ng H\xFAt L\u1ED7 \u0110en Kh\xF4ng Gian",
    nameVi: "C\u1ED5ng H\xFAt L\u1ED7 \u0110en Kh\xF4ng Gian",
    tagline: "V\xF2ng xo\xE1y h\u1ED9i t\u1EE5",
    taglineVi: "V\xF2ng xo\xE1y h\u1ED9i t\u1EE5",
    flavorText: "H\xFAt to\xE0n b\u1ED9 ng\u01B0\u1EDDi ch\u01A1i tr\xEAn b\xE0n c\u1EDD v\u1EC1 c\xF9ng m\u1ED9t \xF4 \u0111\u1EA5t c\xF3 gi\xE1 tr\u1ECB n\xE2ng c\u1EA5p cao nh\u1EA5t!",
    descriptionVi: "H\xFAt to\xE0n b\u1ED9 ng\u01B0\u1EDDi ch\u01A1i tr\xEAn b\xE0n c\u1EDD v\u1EC1 c\xF9ng m\u1ED9t \xF4 \u0111\u1EA5t c\xF3 gi\xE1 tr\u1ECB n\xE2ng c\u1EA5p cao nh\u1EA5t!",
    category: "LEGENDARY",
    rarity: "CALAMITY",
    effectType: "TELEPORT_ALL",
    value: 0,
    magnitude: 0,
    durationInTurns: 0,
    iconName: "Compass",
    triggerType: "TILE_LANDED"
  },
  {
    id: "leg-deathmatch-duel",
    title: "\u0110\u1EA5u Tr\u01B0\u1EDDng Sinh T\u1EED 1 \u0110\u1ED5i 1",
    nameVi: "\u0110\u1EA5u Tr\u01B0\u1EDDng Sinh T\u1EED 1 \u0110\u1ED5i 1",
    tagline: "Tung x\xFAc x\u1EAFc sinh t\u1EED",
    taglineVi: "Tung x\xFAc x\u1EAFc sinh t\u1EED",
    flavorText: "B\u1EA1n v\xE0 ng\u01B0\u1EDDi gi\xE0u nh\u1EA5t tung 2 x\xFAc x\u1EAFc \u0111\u1ED1i \u0111\u1EA7u. K\u1EBB th\u1EA5p \u0111i\u1EC3m h\u01A1n n\u1ED9p ngay $300 cho ng\u01B0\u1EDDi chi\u1EBFn th\u1EAFng!",
    descriptionVi: "B\u1EA1n v\xE0 ng\u01B0\u1EDDi gi\xE0u nh\u1EA5t tung 2 x\xFAc x\u1EAFc \u0111\u1ED1i \u0111\u1EA7u. K\u1EBB th\u1EA5p \u0111i\u1EC3m h\u01A1n n\u1ED9p ngay $300 cho ng\u01B0\u1EDDi chi\u1EBFn th\u1EAFng!",
    category: "LEGENDARY",
    rarity: "LEGENDARY",
    effectType: "CASH_STEAL",
    value: 300,
    magnitude: 300,
    durationInTurns: 0,
    iconName: "Swords",
    triggerType: "TILE_LANDED"
  },
  {
    id: "leg-national-jubilee",
    title: "\u0110\u1EA1i \xC2n X\xE1 Qu\u1ED1c Gia (Debt Jubilee)",
    nameVi: "\u0110\u1EA1i \xC2n X\xE1 Qu\u1ED1c Gia (Debt Jubilee)",
    tagline: "X\xF3a s\u1EA1ch n\u1EE3 n\u1EA7n th\u1EBF ch\u1EA5p",
    taglineVi: "X\xF3a s\u1EA1ch n\u1EE3 n\u1EA7n th\u1EBF ch\u1EA5p",
    flavorText: "To\xE0n b\u1ED9 b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang b\u1ECB c\u1EA7m c\u1ED1 tr\xEAn to\xE0n b\xE0n c\u1EDD \u0111\u01B0\u1EE3c gi\u1EA3i ch\u1EA5p mi\u1EC5n ph\xED 100%!",
    descriptionVi: "To\xE0n b\u1ED9 b\u1EA5t \u0111\u1ED9ng s\u1EA3n \u0111ang b\u1ECB c\u1EA7m c\u1ED1 tr\xEAn to\xE0n b\xE0n c\u1EDD \u0111\u01B0\u1EE3c gi\u1EA3i ch\u1EA5p mi\u1EC5n ph\xED 100%!",
    category: "LEGENDARY",
    rarity: "LEGENDARY",
    effectType: "DEBT_JUBILEE",
    value: 0,
    magnitude: 0,
    durationInTurns: 0,
    iconName: "Award",
    triggerType: "TILE_LANDED"
  },
  {
    id: "leg-alien-mothership",
    title: "Phi Thuy\u1EC1n Kh\xF4ng Gian X\xE2m Chi\u1EBFm",
    nameVi: "Phi Thuy\u1EC1n Kh\xF4ng Gian X\xE2m Chi\u1EBFm",
    tagline: "T\xE0u m\u1EB9 phong t\u1ECFa Landmark 81",
    taglineVi: "T\xE0u m\u1EB9 phong t\u1ECFa Landmark 81",
    flavorText: "T\xE0u m\u1EB9 v\u0169 tr\u1EE5 phong t\u1ECFa \xF4 \u0111\u1EA5t Landmark 81 (Tile 39) v\xE0 bi\u1EBFn n\xF3 th\xE0nh C\u1ED5ng Chaos kh\xF4ng thu ti\u1EC1n thu\xEA trong 5 v\xF2ng!",
    descriptionVi: "T\xE0u m\u1EB9 v\u0169 tr\u1EE5 phong t\u1ECFa \xF4 \u0111\u1EA5t Landmark 81 (Tile 39) v\xE0 bi\u1EBFn n\xF3 th\xE0nh C\u1ED5ng Chaos kh\xF4ng thu ti\u1EC1n thu\xEA trong 5 v\xF2ng!",
    category: "LEGENDARY",
    rarity: "LEGENDARY",
    effectType: "ALIEN_MOTHERSHIP",
    targetTileId: 39,
    value: 5,
    magnitude: 5,
    durationInTurns: 5,
    iconName: "Sparkle",
    triggerType: "TILE_LANDED"
  }
];
var CHAOS_CARDS = [
  ...BASE_CHAOS_CARDS.map(withEnglishCopy),
  ...CHAOS_CARDS_M2
];
var LEGACY_CARD_ALIASES = {
  "stimulus-global": "pos-stimulus-package",
  "lottery-jackpot": "pos-vietlott-jackpot",
  "cyber-heist": "per-robin-hack",
  "quantum-warp-start": "pos-vip-flight",
  "hyper-inflation": "glo-hyper-inflation",
  "property-tax-audit": "neg-construction-audit",
  "angel-investment": "pos-fdi-boost",
  "energy-crisis-fine": "neg-typhoon-central",
  "detention-warrant": "neg-quarantine-order",
  "party-time": "per-vip-charity-gala"
};
function getChaosCardById(cardId) {
  const actualId = LEGACY_CARD_ALIASES[cardId] || cardId;
  return CHAOS_CARDS.find((c) => c.id === actualId || c.id === cardId);
}
function getChaosCardsByCategory(category) {
  return CHAOS_CARDS.filter((c) => c.category === category);
}
function getChaosCardsByRarity(rarity) {
  return CHAOS_CARDS.filter((c) => c.rarity === rarity);
}

// src/game/chaos-engine/chaosEngine.ts
var CHAOS_LOSS_CAP_RATIO = 0.25;
function capChaosLoss(cash, amount) {
  if (amount <= 0 || cash <= 0) return 0;
  return Math.min(amount, Math.floor(cash * CHAOS_LOSS_CAP_RATIO));
}
function drawRandomChaosCard(tileId, prng, state) {
  return drawChaosCard({ tileId, prng, state });
}
function selectContextWeightedChaosCard(candidates, rng, state) {
  if (candidates.length === 0) {
    return rng.pickOne(CHAOS_CARDS);
  }
  if (!state || candidates.length === 1) {
    return rng.pickOne(candidates);
  }
  const hasHistory = (state.chaosHistory?.length || 0) > 0;
  if (!state.config?.seed && !hasHistory) {
    return rng.pickOne(candidates);
  }
  const recentCardIds = (state.chaosHistory || []).slice(0, 2).map((h) => h.cardId);
  const nonRepeated = candidates.filter((c) => !recentCardIds.includes(c.id));
  const effectivePool = nonRepeated.length > 0 ? nonRepeated : candidates;
  const round = state.roundNumber || 1;
  const activePlayer = state.players[state.activePlayerIndex];
  const solventPlayers = state.players.filter((p) => !p.isBankrupt);
  let maxWorth = 0;
  let minWorth = Infinity;
  for (const p of solventPlayers) {
    const w = calculatePlayerNetWorth(p, state.properties, state.chaosModifiers, state.roundNumber, state);
    if (w > maxWorth) maxWorth = w;
    if (w < minWorth) minWorth = w;
  }
  const wealthGapRatio = minWorth > 0 ? maxWorth / minWorth : 2;
  const totalBuildings = Object.values(state.properties).reduce(
    (sum, prop) => sum + (prop.level || 0),
    0
  );
  const totalMortgaged = Object.values(state.properties).filter(
    (prop) => prop.isMortgaged
  ).length;
  const weights = effectivePool.map((card) => {
    let w = 10;
    if (round <= 6) {
      if ((card.effectType === "DOWNGRADE_PROPERTY" || card.effectType === "PROPERTY_TAX") && totalBuildings === 0) {
        w = 2;
      }
      if (card.effectType === "DEBT_JUBILEE" && totalMortgaged === 0) {
        w = 2;
      }
      if (card.category === "POSITIVE" || card.effectType === "GOLDEN_HOUR") {
        w += 5;
      }
    }
    if (wealthGapRatio >= 2.2) {
      if (card.effectType === "REDISTRIBUTE_WEALTH" || card.effectType === "DEBT_JUBILEE" || card.effectType === "SUBSIDIZED_MORTGAGE") {
        w += 12;
      }
    }
    if (activePlayer && activePlayer.cash < 200) {
      if (card.category === "POSITIVE" || card.effectType === "DESPERATION_GAMBLE" || card.effectType === "SUBSIDIZED_MORTGAGE") {
        w += 8;
      }
    }
    if (totalBuildings >= 6) {
      if (card.category === "ECONOMIC" || card.effectType === "DISTRICT_BOOM" || card.effectType === "PROPERTY_TAX") {
        w += 6;
      }
    }
    return Math.max(1, w);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = rng.nextFloat() * totalWeight;
  for (let i = 0; i < effectivePool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return effectivePool[i];
    }
  }
  return effectivePool[effectivePool.length - 1];
}
function drawChaosCard(options = {}) {
  const rng = options.prng || defaultPRNG;
  const isClassic = options.state?.config?.gameMode === "CLASSIC";
  const filterForClassic = (pool) => {
    if (!isClassic) return pool;
    const filtered = pool.filter(
      (c) => c.rarity !== "CALAMITY" && c.category !== "GLOBAL" && c.effectType !== "REVERSE_DIRECTION" && c.effectType !== "SWAP_POSITIONS" && c.effectType !== "CURFEW" && c.effectType !== "ALIEN_ABDUCTION"
    );
    return filtered.length > 0 ? filtered : pool;
  };
  if (options.pool && options.pool.length > 0) {
    return selectContextWeightedChaosCard(filterForClassic(options.pool), rng, options.state);
  }
  if (options.category) {
    const pool = getChaosCardsByCategory(options.category);
    if (pool.length > 0) return selectContextWeightedChaosCard(filterForClassic(pool), rng, options.state);
  }
  if (options.rarity) {
    const pool = getChaosCardsByRarity(options.rarity);
    if (pool.length > 0) return selectContextWeightedChaosCard(filterForClassic(pool), rng, options.state);
  }
  if (options.tileId !== void 0) {
    return evaluateTileChaosTrigger(options.tileId, rng, options.state);
  }
  return selectContextWeightedChaosCard(filterForClassic(CHAOS_CARDS), rng, options.state);
}
function evaluateTileChaosTrigger(tileId, prng, state) {
  const rng = prng || defaultPRNG;
  const isClassic = state?.config?.gameMode === "CLASSIC";
  const filterPool = (pool) => {
    if (!isClassic) return pool;
    const filtered = pool.filter(
      (c) => c.rarity !== "CALAMITY" && c.category !== "GLOBAL" && c.effectType !== "REVERSE_DIRECTION" && c.effectType !== "SWAP_POSITIONS" && c.effectType !== "CURFEW" && c.effectType !== "ALIEN_ABDUCTION"
    );
    return filtered.length > 0 ? filtered : pool;
  };
  if (tileId === 7) {
    const alphaCards = filterPool(
      CHAOS_CARDS.filter(
        (c) => (c.rarity === "COMMON" || c.rarity === "UNCOMMON") && c.effectType !== "TELEPORT"
      )
    );
    if (alphaCards.length > 0) {
      return selectContextWeightedChaosCard(alphaCards, rng, state);
    }
  } else if (tileId === 22) {
    const betaCards = filterPool(
      CHAOS_CARDS.filter(
        (c) => c.rarity === "UNCOMMON" || c.rarity === "RARE"
      )
    );
    if (betaCards.length > 0) {
      return selectContextWeightedChaosCard(betaCards, rng, state);
    }
  } else if (tileId === 36) {
    const omegaCards = filterPool(
      CHAOS_CARDS.filter(
        (c) => c.rarity === "RARE" || c.rarity === "CALAMITY" || c.rarity === "LEGENDARY"
      )
    );
    if (omegaCards.length > 0) {
      return selectContextWeightedChaosCard(omegaCards, rng, state);
    }
  }
  return selectContextWeightedChaosCard(filterPool(CHAOS_CARDS), rng, state);
}
function applyChaosCard(state, rawCard, prng) {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.isBankrupt) return state;
  const rng = prng || (state.config.seed ? createPRNG(state.config.seed) : defaultPRNG);
  const cardId = rawCard.id;
  const canonicalCard = getChaosCardById(cardId) || rawCard;
  const title = rawCard.title || rawCard.nameVi || canonicalCard.title;
  const flavorText = rawCard.flavorText || rawCard.descriptionVi || canonicalCard.flavorText;
  const effectType = rawCard.effectType;
  const value = rawCard.value !== void 0 ? rawCard.value : rawCard.magnitude ?? canonicalCard.value;
  const durationInTurns = rawCard.durationInTurns !== void 0 ? rawCard.durationInTurns : canonicalCard.durationInTurns || 0;
  let updatedPlayers = [...state.players];
  let updatedProperties = { ...state.properties };
  let currentLedger = [...state.ledgerHistory || state.ledger || []];
  let newRentModifier = state.rentModifier;
  let newTurnPhase = state.turnPhase === "CHAOS_EVENT" ? "ACTION_MENU" : state.turnPhase;
  let pendingDebt = state.pendingDebt || null;
  let logMsg = `[CHAOS] ${activePlayer.name} k\xEDch ho\u1EA1t "${title}": ${flavorText}`;
  const recordChaosTx = (from, to, amount, memo, category = "CHAOS_EFFECT", allowPartial = false) => {
    const res = executeLedgerTransaction(
      updatedPlayers,
      {
        category,
        from,
        to,
        amount,
        roundNumber: state.roundNumber,
        memo,
        allowPartial
      },
      currentLedger
    );
    if (res.success) {
      updatedPlayers = res.newPlayers;
      if (res.entry) {
        currentLedger = [...currentLedger, res.entry];
      }
    }
    return res;
  };
  const updatedModifiers = {
    reverseDirectionTurns: state.chaosModifiers?.reverseDirectionTurns || 0,
    marketFrozenTurns: state.chaosModifiers?.marketFrozenTurns || 0,
    goldenHourTurns: state.chaosModifiers?.goldenHourTurns || 0,
    curfewTurns: state.chaosModifiers?.curfewTurns || 0,
    transportBoomTurns: state.chaosModifiers?.transportBoomTurns || 0,
    utilityBoomTurns: state.chaosModifiers?.utilityBoomTurns || 0,
    districtBoomTurns: state.chaosModifiers?.districtBoomTurns || 0,
    alienMothershipTurns: state.chaosModifiers?.alienMothershipTurns || 0,
    interestHikeTurns: state.chaosModifiers?.interestHikeTurns || 0,
    subsidizedMortgageTurns: state.chaosModifiers?.subsidizedMortgageTurns || 0
  };
  emitSound("chaosTrigger");
  switch (effectType) {
    case "CASH_SELF": {
      if (value >= 0) {
        recordChaosTx("BANK", activePlayer.id, value, `Th\u01B0\u1EDFng Chaos: ${title}`);
        logMsg += ` -> Nh\u1EADn \u0111\u01B0\u1EE3c +${formatMoney(value)}!`;
      } else {
        const penalty = capChaosLoss(activePlayer.cash, Math.abs(value));
        if (activePlayer.cash >= penalty) {
          recordChaosTx(activePlayer.id, "BANK", penalty, `Ph\u1EA1t Chaos: ${title}`);
          logMsg += ` -> B\u1ECB ph\u1EA1t tr\u1EEB -${formatMoney(penalty)}!`;
        } else {
          const res = recordChaosTx(activePlayer.id, "BANK", penalty, `Ph\u1EA1t bi\u1EBFn c\u1ED1 (m\u1ED9t ph\u1EA7n): ${title}`, "CHAOS_EFFECT", true);
          const remainingDebt = res.shortfall;
          newTurnPhase = "BANKRUPTCY_CHECK";
          pendingDebt = {
            creditorPlayerId: null,
            amount: remainingDebt,
            reason: `Ph\u1EA1t bi\u1EBFn c\u1ED1: ${title}`,
            category: "CHAOS_EFFECT"
          };
          logMsg += ` -> Kh\xF4ng \u0111\u1EE7 ti\u1EC1n tr\u1EA3 ph\u1EA1t, ghi nh\u1EADn n\u1EE3 ${formatMoney(remainingDebt)} kh\u1EA9n c\u1EA5p!`;
        }
      }
      break;
    }
    case "CASH_ALL": {
      if (value >= 0) {
        for (const p of [...updatedPlayers]) {
          if (!p.isBankrupt) {
            recordChaosTx("BANK", p.id, value, `Tr\u1EE3 c\u1EA5p to\xE0n d\xE2n: ${title}`);
          }
        }
        logMsg += ` -> T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i nh\u1EADn tr\u1EE3 c\u1EA5p +${formatMoney(value)}!`;
      } else {
        const penalty = Math.abs(value);
        for (const p of [...updatedPlayers]) {
          if (!p.isBankrupt) {
            recordChaosTx(p.id, "BANK", capChaosLoss(p.cash, penalty), `\u0110\xF3ng g\xF3p qu\u1EF9: ${title}`, "CHAOS_EFFECT", true);
          }
        }
        logMsg += ` -> T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i \u0111\xF3ng g\xF3p qu\u1EF9 -${formatMoney(penalty)}!`;
      }
      break;
    }
    case "CASH_STEAL": {
      if (value > 0) {
        let totalStolen = 0;
        for (const p of [...updatedPlayers]) {
          if (p.id !== activePlayer.id && !p.isBankrupt) {
            const res = recordChaosTx(p.id, activePlayer.id, capChaosLoss(p.cash, value), `Thu h\xFAt t\u1EEB ${p.name}: ${title}`, "CHAOS_EFFECT", true);
            totalStolen += res.actualPaid;
          }
        }
        logMsg += ` -> Thu h\xFAt th\xE0nh c\xF4ng t\u1ED5ng c\u1ED9ng ${formatMoney(totalStolen)} t\u1EEB c\xE1c \u0111\u1ED1i th\u1EE7!`;
      } else {
        const giftAmount = Math.abs(value);
        const recipients = updatedPlayers.filter((p, idx) => idx !== state.activePlayerIndex && !p.isBankrupt);
        for (const p of recipients) {
          const senderNow = updatedPlayers.find((pl) => pl.id === activePlayer.id);
          const available = senderNow ? senderNow.cash : 0;
          if (available > 0) {
            const toGive = Math.min(available, giftAmount);
            recordChaosTx(activePlayer.id, p.id, toGive, `T\u1EB7ng qu\xE0 cho ${p.name}: ${title}`, "CHAOS_EFFECT", true);
          }
        }
        logMsg += ` -> H\xE0o ph\xF3ng t\u1EB7ng m\u1ED7i \u0111\u1ED1i th\u1EE7 ${formatMoney(giftAmount)}!`;
      }
      break;
    }
    case "TELEPORT": {
      const target = rawCard.targetTileId;
      if (target !== void 0) {
        updatedPlayers[state.activePlayerIndex] = {
          ...updatedPlayers[state.activePlayerIndex],
          position: target
        };
        if (target === 0) {
          const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          recordChaosTx("BANK", activePlayer.id, salary, `L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh (D\u1ECBch chuy\u1EC3n)`, "SALARY_START");
          logMsg += ` -> D\u1ECBch chuy\u1EC3n v\u1EC1 C\u1ED5ng Kh\u1EDFi H\xE0nh, nh\u1EADn l\u01B0\u01A1ng +${formatMoney(salary)}!`;
        } else {
          logMsg += ` -> D\u1ECBch chuy\u1EC3n tr\u1EF1c ti\u1EBFp \u0111\u1EBFn \xF4 #${target}!`;
        }
      } else if (value > 0) {
        const oldPos = activePlayer.position;
        const newPos = (oldPos + value) % 40;
        let passSalary = 0;
        if (newPos < oldPos) {
          passSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          recordChaosTx("BANK", activePlayer.id, passSalary, `L\u01B0\u01A1ng qua C\u1ED5ng Kh\u1EDFi H\xE0nh (Nh\u1EA3y v\u1ECDt)`, "SALARY_START");
        }
        updatedPlayers[state.activePlayerIndex] = {
          ...updatedPlayers[state.activePlayerIndex],
          position: newPos
        };
        logMsg += ` -> Nh\u1EA3y v\u1ECDt +${value} b\u01B0\u1EDBc \u0111\u1EBFn \xF4 #${newPos}!${passSalary > 0 ? ` (Nh\u1EADn l\u01B0\u01A1ng +${formatMoney(passSalary)})` : ""}`;
      }
      break;
    }
    case "TELEPORT_ALL": {
      let maxTileId = 39;
      let maxLevel = -1;
      for (const [tIdStr, prop] of Object.entries(updatedProperties)) {
        if (prop.ownerId && prop.level > maxLevel) {
          maxLevel = prop.level;
          maxTileId = Number(tIdStr);
        }
      }
      updatedPlayers = updatedPlayers.map((p) => {
        if (p.isBankrupt) return p;
        return { ...p, position: maxTileId };
      });
      logMsg += ` -> L\u1ED7 \u0111en kh\xF4ng gian h\xFAt to\xE0n b\u1ED9 ng\u01B0\u1EDDi ch\u01A1i v\u1EC1 \xF4 \u0111\u1EA5t #${maxTileId}!`;
      break;
    }
    case "GO_TO_DETENTION": {
      updatedPlayers[state.activePlayerIndex] = {
        ...activePlayer,
        position: 10,
        // Tile 10 Khu Cách Ly Tạm Giam
        inDetention: true,
        detentionTurns: durationInTurns || value || 2,
        consecutiveDoubles: 0
      };
      logMsg += ` -> B\u1ECB \xE1p gi\u1EA3i v\xE0o Khu C\xE1ch Ly T\u1EA1m Giam (Tile 10) trong 2 l\u01B0\u1EE3t!`;
      break;
    }
    case "RENT_MULTIPLIER": {
      newRentModifier = value;
      logMsg += ` -> H\u1EC7 s\u1ED1 ti\u1EC1n thu\xEA to\xE0n s\xE0n \u0111i\u1EC1u ch\u1EC9nh th\xE0nh x${value}!`;
      break;
    }
    case "PROPERTY_TAX": {
      let count = 0;
      for (const ownership of Object.values(updatedProperties)) {
        if (ownership.ownerId === activePlayer.id) {
          count += 1 + ownership.level;
        }
      }
      const totalTax = capChaosLoss(activePlayer.cash, count * value);
      if (activePlayer.cash >= totalTax) {
        recordChaosTx(activePlayer.id, "BANK", totalTax, `Thu\u1EBF c\xF4ng tr\xECnh: ${title}`, "CHAOS_EFFECT");
        logMsg += ` -> N\u1ED9p thu\u1EBF ${formatMoney(value)} x ${count} h\u1EA1ng m\u1EE5c = -${formatMoney(totalTax)}!`;
      } else {
        const res = recordChaosTx(activePlayer.id, "BANK", totalTax, `Thu\u1EBF c\xF4ng tr\xECnh (m\u1ED9t ph\u1EA7n): ${title}`, "CHAOS_EFFECT", true);
        const remainingDebt = res.shortfall;
        newTurnPhase = "BANKRUPTCY_CHECK";
        pendingDebt = {
          creditorPlayerId: null,
          amount: remainingDebt,
          reason: `Thu\u1EBF c\xF4ng tr\xECnh: ${title}`,
          category: "CHAOS_EFFECT"
        };
        logMsg += ` -> Thi\u1EBFu ti\u1EC1n \u0111\xF3ng thu\u1EBF, ghi nh\u1EADn n\u1EE3 ${formatMoney(remainingDebt)}!`;
      }
      break;
    }
    case "FREE_UPGRADE":
    case "PROPERTY_UPGRADE": {
      const ownedTileIds = Object.keys(updatedProperties).map(Number).filter(
        (tid) => updatedProperties[tid]?.ownerId === activePlayer.id && !updatedProperties[tid]?.isMortgaged && updatedProperties[tid]?.level < 5
      );
      if (ownedTileIds.length > 0) {
        const chosenTileId = rng.pickOne(ownedTileIds);
        updatedProperties[chosenTileId] = {
          ...updatedProperties[chosenTileId],
          level: updatedProperties[chosenTileId].level + 1
        };
        logMsg += ` -> N\xE2ng c\u1EA5p mi\u1EC5n ph\xED +1\u2605 cho \xF4 \u0111\u1EA5t #${chosenTileId} (C\u1EA5p hi\u1EC7n t\u1EA1i: ${updatedProperties[chosenTileId].level}\u2605)!`;
      } else {
        const comp = value || 150;
        recordChaosTx("BANK", activePlayer.id, comp, `Tr\u1EE3 c\u1EA5p n\xE2ng c\u1EA5p: ${title}`);
        logMsg += ` -> Kh\xF4ng c\xF3 c\xF4ng tr\xECnh ph\xF9 h\u1EE3p, nh\u1EADn b\xF9 +${formatMoney(comp)} ti\u1EC1n m\u1EB7t!`;
      }
      break;
    }
    case "DOWNGRADE_PROPERTY":
    case "EARTHQUAKE": {
      let count = 0;
      for (const [tIdStr, ownership] of Object.entries(updatedProperties)) {
        const tId = Number(tIdStr);
        if (ownership.ownerId && ownership.level > 0) {
          updatedProperties[tId] = {
            ...ownership,
            level: Math.max(0, ownership.level - 1)
          };
          count++;
        }
      }
      logMsg += ` -> \u0110\u1ED9ng \u0111\u1EA5t l\xE0m s\u1EADp 1 c\u1EA5p sao c\u1EE7a ${count} c\xF4ng tr\xECnh tr\xEAn to\xE0n b\xE0n c\u1EDD!`;
      break;
    }
    case "REVERSE_DIRECTION": {
      updatedModifiers.reverseDirectionTurns = durationInTurns || 3;
      logMsg += ` -> To\xE0n b\u1ED9 ng\u01B0\u1EDDi ch\u01A1i di chuy\u1EC3n ng\u01B0\u1EE3c chi\u1EC1u kim \u0111\u1ED3ng h\u1ED3 trong ${updatedModifiers.reverseDirectionTurns} v\xF2ng!`;
      break;
    }
    case "SWAP_POSITIONS": {
      const solventPlayers = updatedPlayers.filter((p) => !p.isBankrupt);
      if (solventPlayers.length >= 2) {
        const originalPositions = solventPlayers.map((p) => p.position);
        const shiftedPositions = [...originalPositions.slice(1), originalPositions[0]];
        let sIdx = 0;
        updatedPlayers = updatedPlayers.map((p) => {
          if (p.isBankrupt) return p;
          const newPos = shiftedPositions[sIdx++];
          return { ...p, position: newPos };
        });
        logMsg += ` -> Ho\xE1n \u0111\u1ED5i v\u1ECB tr\xED di chuy\u1EC3n c\u1EE7a to\xE0n b\u1ED9 ng\u01B0\u1EDDi ch\u01A1i tr\xEAn b\xE0n c\u1EDD!`;
      }
      break;
    }
    case "REDISTRIBUTE_WEALTH": {
      const solventPlayers = updatedPlayers.filter((p) => !p.isBankrupt);
      if (solventPlayers.length >= 2) {
        let richest = solventPlayers[0];
        let poorest = solventPlayers[0];
        let maxWorth = calculatePlayerNetWorth(richest, updatedProperties, state.chaosModifiers, state.roundNumber, state);
        let minWorth = maxWorth;
        for (const p of solventPlayers) {
          const w = calculatePlayerNetWorth(p, updatedProperties, state.chaosModifiers, state.roundNumber, state);
          if (w > maxWorth) {
            maxWorth = w;
            richest = p;
          }
          if (w < minWorth) {
            minWorth = w;
            poorest = p;
          }
        }
        if (richest.id !== poorest.id && richest.cash > 0) {
          const transferAmount = Math.floor(richest.cash * 0.25);
          recordChaosTx(richest.id, poorest.id, transferAmount, `T\xE1i ph\xE2n ph\u1ED1i t\xE0i s\u1EA3n: ${title}`);
          logMsg += ` -> ${richest.name} (gi\xE0u nh\u1EA5t) chuy\u1EC3n ${formatMoney(transferAmount)} (25% ti\u1EC1n m\u1EB7t) cho ${poorest.name} (ngh\xE8o nh\u1EA5t)!`;
        }
      }
      break;
    }
    case "DETENTION_IMMUNITY":
    case "DETENTION_RELEASE": {
      const newCardCount = (activePlayer.jailFreeCards || 0) + 1;
      updatedPlayers[state.activePlayerIndex] = {
        ...updatedPlayers[state.activePlayerIndex],
        jailFreeCards: newCardCount
      };
      logMsg += ` -> Nh\u1EADn 1 Th\u1EBB Mi\u1EC5n Tr\u1EEB Giam Gi\u1EEF \u0111\u1EB7c quy\u1EC1n! (T\u1ED5ng s\u1ED1 th\u1EBB s\u1EDF h\u1EEFu: ${newCardCount})`;
      break;
    }
    case "DESPERATION_GAMBLE":
    case "CASINO_GAMBLE": {
      const gambleAmount = value || 100;
      const isWin = rng.nextFloat() >= 0.5;
      if (isWin) {
        const winAmount = gambleAmount * 2;
        recordChaosTx("BANK", activePlayer.id, winAmount, `Th\u1EAFng c\u01B0\u1EE3c Casino: ${title}`);
        logMsg += ` -> Th\u1EAFng c\u01B0\u1EE3c s\xF2ng b\u1EA1c! Nh\xE2n \u0111\xF4i s\u1ED1 ti\u1EC1n nh\u1EADn +${formatMoney(winAmount)}!`;
      } else {
        const actualLost = capChaosLoss(activePlayer.cash, gambleAmount);
        if (actualLost > 0) {
          recordChaosTx(activePlayer.id, "BANK", actualLost, `Thua c\u01B0\u1EE3c Casino: ${title}`);
        }
        logMsg += ` -> Thua c\u01B0\u1EE3c! M\u1EA5t -${formatMoney(actualLost)} (t\u1ED1i \u0111a 25% ti\u1EC1n m\u1EB7t)!`;
      }
      break;
    }
    case "DEBT_JUBILEE": {
      let jubileeCount = 0;
      for (const [tIdStr, ownership] of Object.entries(updatedProperties)) {
        const tId = Number(tIdStr);
        if (ownership.ownerId && ownership.isMortgaged) {
          updatedProperties[tId] = {
            ...ownership,
            isMortgaged: false
          };
          jubileeCount++;
        }
      }
      logMsg += ` -> \u0110\u1EA1i \xE2n x\xE1 qu\u1ED1c gia! Gi\u1EA3i ch\u1EA5p mi\u1EC5n ph\xED cho ${jubileeCount} b\u1EA5t \u0111\u1ED9ng s\u1EA3n!`;
      break;
    }
    case "HOSTILE_TAKEOVER": {
      let candidateTileId = null;
      let minPrice = Infinity;
      let opponentOwnerId = null;
      for (const [tIdStr, ownership] of Object.entries(updatedProperties)) {
        const tId = Number(tIdStr);
        if (ownership.ownerId && ownership.ownerId !== activePlayer.id && ownership.level === 0) {
          const tile = BOARD_TILES.find((t) => t.id === tId);
          const price = tile?.property?.basePrice || 100;
          if (price < minPrice) {
            minPrice = price;
            candidateTileId = tId;
            opponentOwnerId = ownership.ownerId;
          }
        }
      }
      const takeoverCost = Math.floor(minPrice * 1.5);
      if (candidateTileId !== null && opponentOwnerId && activePlayer.cash >= takeoverCost) {
        updatedProperties[candidateTileId] = {
          ...updatedProperties[candidateTileId],
          ownerId: activePlayer.id
        };
        recordChaosTx(activePlayer.id, opponentOwnerId, takeoverCost, `Th\xE2u t\xF3m \xF4 \u0111\u1EA5t #${candidateTileId}: ${title}`);
        logMsg += ` -> Th\xE2u t\xF3m \xF4 \u0111\u1EA5t #${candidateTileId} c\u1EE7a \u0111\u1ED1i th\u1EE7 v\u1EDBi gi\xE1 1.5x (${formatMoney(takeoverCost)})!`;
      } else {
        recordChaosTx("BANK", activePlayer.id, 150, `Tr\u1EE3 c\u1EA5p \u0111\u1EA7u t\u01B0: ${title}`);
        logMsg += ` -> Kh\xF4ng c\xF3 \xF4 \u0111\u1EA5t ph\xF9 h\u1EE3p \u0111\u1EC3 th\xE2u t\xF3m, nh\u1EADn tr\u1EE3 c\u1EA5p \u0111\u1EA7u t\u01B0 +$150M!`;
      }
      break;
    }
    case "FREEZE_MARKET": {
      updatedModifiers.marketFrozenTurns = durationInTurns || 1;
      logMsg += ` -> \u0110\xF3ng b\u0103ng th\u1ECB tr\u01B0\u1EDDng mua b\xE1n & n\xE2ng c\u1EA5p tr\xEAn to\xE0n th\xE0nh ph\u1ED1 trong 1 v\xF2ng!`;
      break;
    }
    case "GOLDEN_HOUR": {
      updatedModifiers.goldenHourTurns = durationInTurns || 1;
      logMsg += ` -> Gi\u1EDD v\xE0ng \u0111\xF4 th\u1ECB! L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh t\u0103ng g\u1EA5p \u0111\xF4i ($400M) trong 1 v\xF2ng!`;
      break;
    }
    case "TRANSPORT_BOOM": {
      updatedModifiers.transportBoomTurns = durationInTurns || 3;
      logMsg += ` -> \u0110\u1EA1i l\u1EC5 \u0111\u01B0\u1EDDng s\u1EAFt t\u1ED1c \u0111\u1ED9 cao! Ti\u1EC1n thu\xEA 4 Tr\u1EA1m V\u1EADn T\u1EA3i t\u0103ng g\u1EA5p \u0111\xF4i (x2) trong 3 v\xF2ng!`;
      break;
    }
    case "UTILITY_BOOM": {
      updatedModifiers.utilityBoomTurns = durationInTurns || 2;
      logMsg += ` -> \u0110i\u1EC1u ch\u1EC9nh gi\xE1 \u0111i\u1EC7n & n\u01B0\u1EDBc! Ti\u1EC1n thu\xEA SAWACO v\xE0 EVN t\u0103ng g\u1EA5p \u0111\xF4i (x2) trong 2 v\xF2ng!`;
      break;
    }
    case "DISTRICT_BOOM": {
      updatedModifiers.districtBoomTurns = durationInTurns || 3;
      logMsg += ` -> S\xF3ng s\u1ED1t \u0111\u1EA5t H\xE0 N\u1ED9i & TP.HCM! Ti\u1EC1n thu\xEA t\u0103ng 1.5x trong 3 v\xF2ng!`;
      break;
    }
    case "INTEREST_HIKE": {
      updatedModifiers.interestHikeTurns = durationInTurns || 3;
      updatedModifiers.subsidizedMortgageTurns = 0;
      logMsg += ` -> Ng\xE2n h\xE0ng t\u0103ng l\xE3i su\u1EA5t gi\u1EA3i ch\u1EA5p th\xEAm 10% trong 3 v\xF2ng!`;
      break;
    }
    case "SUBSIDIZED_MORTGAGE": {
      updatedModifiers.subsidizedMortgageTurns = durationInTurns || 2;
      updatedModifiers.interestHikeTurns = 0;
      logMsg += ` -> H\u1ED7 tr\u1EE3 t\xEDn d\u1EE5ng! C\u1EA7m c\u1ED1 b\u1EA5t \u0111\u1ED9ng s\u1EA3n nh\u1EADn ngay 75% gi\xE1 g\u1ED1c trong 2 v\xF2ng!`;
      break;
    }
    case "CURFEW": {
      updatedModifiers.curfewTurns = durationInTurns || 1;
      logMsg += ` -> Gi\u1EDBi nghi\xEAm to\xE0n th\xE0nh ph\u1ED1! X\xFAc x\u1EAFc b\u1ECB gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a 4 b\u01B0\u1EDBc \u0111i trong 1 v\xF2ng!`;
      break;
    }
    case "ALIEN_MOTHERSHIP": {
      updatedModifiers.alienMothershipTurns = durationInTurns || 5;
      logMsg += ` -> T\xE0u m\u1EB9 v\u0169 tr\u1EE5 phong t\u1ECFa Landmark 81 (Tile 39) th\xE0nh C\u1ED5ng Chaos kh\xF4ng thu ti\u1EC1n thu\xEA trong 5 v\xF2ng!`;
      break;
    }
    case "VISION_SHIFT": {
      logMsg += ` -> T\u1EA7m nh\xECn th\xE0nh ph\u1ED1 thay \u0111\u1ED5i trong ${durationInTurns || 1} v\xF2ng. Kh\xF4ng ai m\u1EA5t hay nh\u1EADn ti\u1EC1n.`;
      break;
    }
    default:
      logMsg += ` -> \u0110\xE3 k\xEDch ho\u1EA1t hi\u1EC7u \u1EE9ng th\xE0nh c\xF4ng!`;
      break;
  }
  updatedPlayers[state.activePlayerIndex] = {
    ...updatedPlayers[state.activePlayerIndex],
    stats: {
      ...updatedPlayers[state.activePlayerIndex].stats,
      chaosTriggered: (updatedPlayers[state.activePlayerIndex].stats.chaosTriggered || 0) + 1
    }
  };
  const historyEntry = {
    id: `chaos-hist-${Date.now()}-${(state.chaosHistory?.length || 0) + 1}`,
    cardId: canonicalCard.id,
    title,
    category: canonicalCard.category || "PERSONAL",
    rarity: canonicalCard.rarity || "COMMON",
    effectType: String(effectType),
    roundNumber: state.roundNumber,
    triggeredByPlayerId: activePlayer.id,
    triggeredByPlayerName: activePlayer.name,
    triggerType: canonicalCard.triggerType || "TILE_LANDED",
    summaryVi: logMsg,
    timestamp: Date.now()
  };
  const updatedChaosHistory = [historyEntry, ...state.chaosHistory || []].slice(0, 60);
  return {
    ...state,
    players: updatedPlayers,
    properties: updatedProperties,
    activeChaosCard: canonicalCard,
    rentModifier: newRentModifier,
    turnPhase: newTurnPhase,
    pendingDebt,
    chaosModifiers: updatedModifiers,
    chaosHistory: updatedChaosHistory,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    logs: [
      {
        id: `chaos-log-${Date.now()}-${rng.nextInt(1e3, 9999)}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: logMsg,
        type: "CHAOS"
      },
      ...state.logs
    ]
  };
}

// src/game/win-condition/winCondition.ts
function evaluateWinCondition(players, properties, currentRound, maxRounds = 0, world) {
  const activePlayers = players.filter((p) => !p.isBankrupt);
  if (activePlayers.length === 1 && players.length > 1) {
    return {
      isGameOver: true,
      winner: activePlayers[0],
      reason: "LAST_MAN_STANDING"
    };
  }
  if (activePlayers.length === 0) {
    return {
      isGameOver: true,
      winner: null,
      reason: "LAST_MAN_STANDING"
    };
  }
  if (maxRounds > 0 && currentRound >= maxRounds) {
    let topPlayer = activePlayers[0];
    let topWorth = calculatePlayerNetWorth(topPlayer, properties, void 0, currentRound, world);
    for (let i = 1; i < activePlayers.length; i++) {
      const p = activePlayers[i];
      const worth = calculatePlayerNetWorth(p, properties, void 0, currentRound, world);
      if (worth > topWorth || worth === topWorth && p.cash > topPlayer.cash) {
        topPlayer = p;
        topWorth = worth;
      }
    }
    return {
      isGameOver: true,
      winner: topPlayer,
      reason: "MAX_ROUNDS_REACHED"
    };
  }
  return {
    isGameOver: false,
    winner: null,
    reason: null
  };
}

// src/game/chaos-engine/patrolEngine.ts
var PATROL_FINE_AMOUNT = 100;
function movePatrolUnits(patrolUnits, graph) {
  if (!patrolUnits || patrolUnits.length === 0 || !graph || !graph.nodes) {
    return patrolUnits || [];
  }
  return patrolUnits.map((unit) => {
    const currentNode = graph.nodes[unit.currentNodeId];
    if (!currentNode) {
      return unit;
    }
    let destId = unit.destinationNodeId || unit.targetNodeId;
    if (!destId || unit.currentNodeId === destId) {
      if (unit.currentNodeId === "KOW_F1_08") {
        destId = "KOW_F1_04";
      } else if (unit.currentNodeId === "KOW_F1_04") {
        destId = "KOW_F1_08";
      } else if (unit.currentNodeId === "node-20") {
        destId = "node-10";
      } else if (unit.currentNodeId === "node-10") {
        destId = "node-20";
      } else {
        const validNeighbors = getValidNextNodes(graph, unit.currentNodeId).filter(
          (n) => !n.isLocked && n.hazardStatus !== "COLLAPSED" && n.hazardStatus !== "FIRE"
        );
        if (validNeighbors.length > 0) {
          destId = validNeighbors[0].id;
        }
      }
    }
    let nextNodeId = unit.currentNodeId;
    if (destId && destId !== unit.currentNodeId) {
      const pathRes = findShortestPath(graph, unit.currentNodeId, destId);
      if (pathRes && pathRes.path && pathRes.path.length > 1) {
        const candidateId = pathRes.path[1];
        const candidateNode = graph.nodes[candidateId];
        if (candidateNode && !candidateNode.isLocked && candidateNode.hazardStatus !== "COLLAPSED" && candidateNode.hazardStatus !== "FIRE") {
          nextNodeId = candidateId;
        }
      }
    }
    if (nextNodeId === unit.currentNodeId) {
      const candidates = getValidNextNodes(graph, unit.currentNodeId).filter(
        (n) => !n.isLocked && n.hazardStatus !== "COLLAPSED" && n.hazardStatus !== "FIRE"
      );
      if (candidates.length > 0) {
        nextNodeId = candidates[0].id;
      }
    }
    return {
      ...unit,
      currentNodeId: nextNodeId,
      destinationNodeId: destId,
      targetNodeId: destId
    };
  });
}
function checkPatrolInterception(player, patrolUnits) {
  if (!player || player.isBankrupt || !patrolUnits || patrolUnits.length === 0) {
    return void 0;
  }
  const playerNodeId = player.positionNodeId || (player.position !== void 0 ? `node-${player.position}` : void 0);
  if (!playerNodeId) return void 0;
  return patrolUnits.find((unit) => unit.currentNodeId === playerNodeId);
}
function resolvePatrolPenalty(state, victimPlayerId) {
  const victim = state.players.find((p) => p.id === victimPlayerId);
  if (!victim || victim.isBankrupt) {
    return { nextState: state, penaltyType: "FINE", amountPaid: 0 };
  }
  const isChaos = state.chaosMeter?.phase === "CHAOS";
  const canAffordFine = victim.cash >= PATROL_FINE_AMOUNT;
  if (canAffordFine && !isChaos) {
    const currentLedger = state.ledger || [];
    const txResult = executeLedgerTransaction(
      state.players,
      {
        category: "TAX_PAYMENT",
        from: victim.id,
        to: "BANK",
        amount: PATROL_FINE_AMOUNT,
        roundNumber: state.roundNumber,
        memo: `C\u1EA3nh s\xE1t tu\u1EA7n tra x\u1EED ph\u1EA1t vi ph\u1EA1m an ninh ($${PATROL_FINE_AMOUNT}M)`
      },
      currentLedger
    );
    const updatedPlayers = txResult.success ? txResult.newPlayers : state.players;
    const updatedLedger = txResult.entry ? [...currentLedger, txResult.entry] : currentLedger;
    const logEntry = {
      id: `patrol-fine-${Date.now()}`,
      timestamp: Date.now(),
      playerId: victim.id,
      playerName: victim.name,
      message: `\u{1F6A8} [C\u1EA2NH S\xC1T TU\u1EA6N TRA] ${victim.name} b\u1ECB c\u1EA3nh s\xE1t ch\u1EB7n b\u1EAFt v\xE0 x\u1EED ph\u1EA1t $${PATROL_FINE_AMOUNT}M!`,
      type: "WARNING"
    };
    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        logs: [logEntry, ...state.logs],
        lastSoundEffect: "chaosWarning"
      },
      penaltyType: "FINE",
      amountPaid: PATROL_FINE_AMOUNT
    };
  } else {
    const detentionNodeId = state.spatialGraph?.detentionNodeId || "node-10";
    const updatedPlayers = state.players.map((p) => {
      if (p.id === victim.id) {
        return {
          ...p,
          position: 10,
          positionNodeId: detentionNodeId,
          inDetention: true,
          detentionTurns: 2,
          consecutiveDoubles: 0
        };
      }
      return p;
    });
    const logEntry = {
      id: `patrol-jail-${Date.now()}`,
      timestamp: Date.now(),
      playerId: victim.id,
      playerName: victim.name,
      message: `\u{1F6A8} [C\u1EA2NH S\xC1T TU\u1EA6N TRA] ${victim.name} kh\xF4ng th\u1EC3 n\u1ED9p ph\u1EA1t ho\u1EB7c vi ph\u1EA1m trong v\xF9ng H\u1ED7n Lo\u1EA1n! B\u1ECB gi\u1EA3i th\u1EB3ng v\xE0o Tr\u1EA1i Giam (2 l\u01B0\u1EE3t)!`,
      type: "WARNING"
    };
    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        logs: [logEntry, ...state.logs],
        lastSoundEffect: "chaosWarning"
      },
      penaltyType: "DETENTION",
      amountPaid: 0
    };
  }
}

// src/game/maps/kowloonWalledCity.ts
var KOWLOON_MAP_ID = "hong-kong-kowloon";
var COFFIN_HOME_UPGRADES = [
  { level: 1, name: "Wire Cage Bed", cost: 40, baseRent: 15 },
  { level: 2, name: "Plywood Cubicle", cost: 40, baseRent: 45 },
  { level: 3, name: "Subdivided Micro-Flat", cost: 50, baseRent: 135 },
  { level: 4, name: "Double-Decker Mezzanine", cost: 60, baseRent: 350 },
  { level: 5, name: "Slumlord Rooftop Stronghold (Landmark)", cost: 100, baseRent: 800 }
];
function createKowloonWalledCityGraph() {
  const nodes = {};
  const edges = {};
  const floorElevations = [0, 3.5, 7, 10.5];
  const floorNodeCounts = [12, 12, 12, 8];
  const floorDistrictColors = [
    "district-brown",
    "district-orange",
    "district-red",
    "district-darkblue"
  ];
  for (let f = 0; f < 4; f++) {
    const count = floorNodeCounts[f];
    const elevY = floorElevations[f];
    for (let i = 0; i < count; i++) {
      const idxStr = i < 10 ? `0${i}` : `${i}`;
      const id = `KOW_F${f}_${idxStr}`;
      const nextIdx = (i + 1) % count;
      const nextId = `KOW_F${f}_${nextIdx < 10 ? `0${nextIdx}` : `${nextIdx}`}`;
      const numericId = (f * 12 + i) % 40;
      nodes[id] = {
        id,
        numericId: f * 12 + i,
        name: f === 0 && i === 0 ? "Kai Tak Border Gate" : f === 0 && i === 6 ? "Kowloon Detention Cell" : f === 0 && i === 11 ? "Secret Basement Black Market" : i === 4 ? `South Freight Elevator F${f}` : i === 8 || f === 3 && i === 6 ? `North Dark Stairwell F${f}` : `Kowloon F${f} Node ${i}`,
        shortName: `K${f}-${i}`,
        type: f === 0 && i === 0 ? "START" : f === 0 && i === 6 ? "DETENTION" : i === 4 ? "TRANSPORT" : i === 8 || f === 3 && i === 6 ? "TRANSPORT" : "PROPERTY",
        zoneId: f === 0 && i === 11 ? "ZONE_BLACK_MARKET" : `ZONE_F${f}`,
        floor: f,
        position3D: { x: i % 4 * 3, y: elevY, z: Math.floor(i / 4) * 3 },
        connectedNodeIds: [nextId],
        isIntersection: false,
        isSecretZone: f === 0 && i === 11,
        // Concealed basement black market node
        isLocked: f === 0 && i === 11,
        hazardStatus: "NONE",
        property: {
          basePrice: 100 + f * 50,
          baseRent: COFFIN_HOME_UPGRADES[0].baseRent,
          houseRent: COFFIN_HOME_UPGRADES.map((u) => u.baseRent),
          upgradeCost: 40 + f * 15,
          maxLevel: 5,
          district: `Floor ${f}`,
          districtColor: floorDistrictColors[f] || "district-brown"
        },
        gridPosition: { col: numericId % 11, row: Math.floor(numericId / 11) }
      };
      edges[`EDGE_${id}_${nextId}`] = {
        id: `EDGE_${id}_${nextId}`,
        fromNodeId: id,
        toNodeId: nextId,
        type: "MAIN_LOOP",
        bidirectional: false
      };
    }
  }
  const elevNodes = ["KOW_F0_04", "KOW_F1_04", "KOW_F2_04", "KOW_F3_04"];
  for (let f = 0; f < 3; f++) {
    const from = elevNodes[f];
    const to = elevNodes[f + 1];
    nodes[from].connectedNodeIds.push(to);
    nodes[from].isIntersection = true;
    nodes[to].connectedNodeIds.push(from);
    nodes[to].isIntersection = true;
    edges[`ELEV_${from}_${to}`] = {
      id: `ELEV_${from}_${to}`,
      fromNodeId: from,
      toNodeId: to,
      type: "VERTICAL_ELEVATOR",
      toll: { currency: "CASH", amount: 50 },
      bidirectional: true,
      label: "Thang M\xE1y Nam ($50)"
    };
  }
  const stairNodes = ["KOW_F0_08", "KOW_F1_08", "KOW_F2_08", "KOW_F3_06"];
  for (let f = 0; f < 3; f++) {
    const from = stairNodes[f];
    const to = stairNodes[f + 1];
    nodes[from].connectedNodeIds.push(to);
    nodes[from].isIntersection = true;
    nodes[to].connectedNodeIds.push(from);
    nodes[to].isIntersection = true;
    edges[`STAIR_${from}_${to}`] = {
      id: `STAIR_${from}_${to}`,
      fromNodeId: from,
      toNodeId: to,
      type: "VERTICAL_STAIRS",
      toll: { currency: "CASH", amount: 0 },
      bidirectional: true,
      label: "C\u1EA7u Thang B\u1ED9 B\u1EAFc (Mi\u1EC5n ph\xED)"
    };
  }
  nodes["KOW_F2_10"].connectedNodeIds.push("KOW_F3_02");
  nodes["KOW_F2_10"].isIntersection = true;
  nodes["KOW_F3_02"].connectedNodeIds.push("KOW_F2_10");
  nodes["KOW_F3_02"].isIntersection = true;
  edges["SKYWALK_F2_F3"] = {
    id: "SKYWALK_F2_F3",
    fromNodeId: "KOW_F2_10",
    toNodeId: "KOW_F3_02",
    type: "SKYWALK",
    bidirectional: true,
    label: "C\u1EA7u V\u01B0\u1EE3t T\u1EA7ng Th\u01B0\u1EE3ng"
  };
  const zones = {
    ZONE_F0: {
      id: "ZONE_F0",
      name: "Ground Level Drainage & Alleys",
      isLocked: false,
      initiallyLocked: false,
      floor: 0,
      nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F0_") && k !== "KOW_F0_11")
    },
    ZONE_F1: {
      id: "ZONE_F1",
      name: "Second Floor Workshops & Dwellings",
      isLocked: false,
      initiallyLocked: false,
      floor: 1,
      nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F1_"))
    },
    ZONE_F2: {
      id: "ZONE_F2",
      name: "Third Floor Coffin Hive",
      isLocked: false,
      initiallyLocked: false,
      floor: 2,
      nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F2_"))
    },
    ZONE_F3: {
      id: "ZONE_F3",
      name: "Rooftop Shanties & Coops",
      isLocked: false,
      initiallyLocked: false,
      floor: 3,
      nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F3_"))
    },
    ZONE_BLACK_MARKET: {
      id: "ZONE_BLACK_MARKET",
      name: "Secret Basement Black Market",
      isLocked: true,
      initiallyLocked: true,
      isSecretZone: true,
      floor: 0,
      unlockRequirement: {
        type: "BUILDING_UPGRADE_COUNT",
        threshold: 6,
        descriptionVi: "M\u1EDF kh\xF3a khi t\u1ED5ng s\u1ED1 l\u1EA7n n\xE2ng c\u1EA5p c\xF4ng tr\xECnh \u0111\u1EA1t 6 ho\u1EB7c b\u01B0\u1EDBc sang pha B\u1EA5t \u1ED4n."
      },
      nodeIds: ["KOW_F0_11"]
    }
  };
  return {
    mapId: KOWLOON_MAP_ID,
    mapName: "Hong Kong \u2014 Kowloon Walled City",
    description: "Chung C\u01B0 C\u1EEDu Long 4 t\u1EA7ng ch\u1ED3ng ch\u1EA5t v\u1EDBi thang m\xE1y thu ph\xED, c\u1EA7u thang t\u1ED1i t\u0103m v\xE0 Nh\xE0 Quan T\xE0i.",
    nodes,
    edges,
    startNodeId: "KOW_F0_00",
    detentionNodeId: "KOW_F0_06",
    floors: [
      {
        floorIndex: 0,
        name: "Ground Floor",
        elevationY: 0,
        nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F0_"))
      },
      {
        floorIndex: 1,
        name: "Second Floor",
        elevationY: 3.5,
        nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F1_"))
      },
      {
        floorIndex: 2,
        name: "Third Floor",
        elevationY: 7,
        nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F2_"))
      },
      {
        floorIndex: 3,
        name: "Rooftop",
        elevationY: 10.5,
        nodeIds: Object.keys(nodes).filter((k) => k.startsWith("KOW_F3_"))
      }
    ],
    zones
  };
}
function applyKowloonFireClearance(graph, burnedFloor) {
  const updatedGraph = JSON.parse(JSON.stringify(graph));
  const affectedNodeIds = [];
  for (const [nodeId, node] of Object.entries(updatedGraph.nodes)) {
    if (node.floor === burnedFloor) {
      node.hazardStatus = "FIRE";
      affectedNodeIds.push(nodeId);
    }
  }
  if (updatedGraph.floors) {
    updatedGraph.floors = updatedGraph.floors.map(
      (f) => f.floorIndex === burnedFloor ? { ...f, isHazardAblaze: true } : f
    );
  }
  return {
    updatedGraph,
    evacuatedFloors: [burnedFloor],
    affectedNodeIds
  };
}
function advanceKowloonDisasterIfNeeded(state, newRound) {
  if (!state.spatialGraph || state.spatialGraph.mapId !== KOWLOON_MAP_ID) {
    return state;
  }
  const isChaosPhase = state.chaosMeter?.phase === "CHAOS";
  let floorToBurn = null;
  if (newRound === 18 || isChaosPhase && newRound % 3 === 0) {
    for (let f = 0; f < 3; f++) {
      const floorNodes = Object.values(state.spatialGraph.nodes).filter((n) => n.floor === f);
      const alreadyBurned = floorNodes.length > 0 && floorNodes.every((n) => n.hazardStatus === "FIRE");
      if (!alreadyBurned) {
        if (f === 0 && (newRound >= 18 || isChaosPhase)) {
          floorToBurn = 0;
          break;
        }
        if (f === 1 && (newRound >= 21 || isChaosPhase)) {
          floorToBurn = 1;
          break;
        }
        if (f === 2 && (newRound >= 24 || isChaosPhase)) {
          floorToBurn = 2;
          break;
        }
      }
    }
  }
  if (floorToBurn === null) {
    return state;
  }
  const { updatedGraph } = applyKowloonFireClearance(state.spatialGraph, floorToBurn);
  const nextFloor = Math.min(3, floorToBurn + 1);
  const evacNodeId = `KOW_F${nextFloor}_00`;
  const evacNumericId = updatedGraph.nodes[evacNodeId]?.numericId ?? 0;
  let currentPlayers = [...state.players];
  let currentLedger = state.ledger || [];
  const evacuatedNames = [];
  for (const player of currentPlayers) {
    if (player.isBankrupt) continue;
    const pNodeId = player.positionNodeId || `KOW_F0_00`;
    const pFloor = updatedGraph.nodes[pNodeId]?.floor ?? 0;
    if (pFloor <= floorToBurn) {
      evacuatedNames.push(player.name);
      const penalty = Math.min(player.cash, 100);
      if (penalty > 0) {
        const res = executeLedgerTransaction(
          currentPlayers,
          {
            category: "CHAOS_EFFECT",
            from: player.id,
            to: "BANK",
            amount: penalty,
            roundNumber: newRound,
            memo: `Ph\xED s\u01A1 t\xE1n kh\u1EA9n c\u1EA5p \u0111\xE1m ch\xE1y T\u1EA7ng ${floorToBurn}`
          },
          currentLedger
        );
        if (res.success) {
          currentPlayers = res.newPlayers;
          if (res.entry) currentLedger = [...currentLedger, res.entry];
        }
      }
      currentPlayers = currentPlayers.map(
        (p) => p.id === player.id ? {
          ...p,
          positionNodeId: evacNodeId,
          position: evacNumericId
        } : p
      );
    }
  }
  const fireLog = {
    id: `kowloon-fire-f${floorToBurn}-${Date.now()}`,
    timestamp: Date.now(),
    message: `\u{1F525} [CH\xC1Y L\u1EDAN / GI\u1EA2I T\u1ECEA C\u1EECU LONG] T\u1EA7ng ${floorToBurn} ch\xECm trong bi\u1EC3n l\u1EEDa! To\xE0n b\u1ED9 \xF4 \u0111\u1EA5t T\u1EA7ng ${floorToBurn} b\u1ECB v\xF4 hi\u1EC7u h\xF3a${evacuatedNames.length > 0 ? `, s\u01A1 t\xE1n kh\u1EA9n c\u1EA5p (${evacuatedNames.join(", ")}) l\xEAn T\u1EA7ng ${nextFloor}!` : "!"}`,
    type: "CHAOS"
  };
  return {
    ...state,
    spatialGraph: updatedGraph,
    players: currentPlayers,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    logs: [fireLog, ...state.logs]
  };
}

// src/components/board/three/threeCoordinates.ts
var BOARD_HALF_SIZE = 10;
var TILE_HEIGHT = 0.25;
var CORNER_SPAN = 2.4;
var EDGE_TILES = 9;
var REGULAR_SPAN = (BOARD_HALF_SIZE * 2 - CORNER_SPAN * 2) / EDGE_TILES;
function getLegacyTile3DWorldPosition(tileId) {
  const normId = (tileId % 40 + 40) % 40;
  const startOffset = BOARD_HALF_SIZE - CORNER_SPAN / 2;
  if (normId === 0) {
    return { x: startOffset, y: TILE_HEIGHT / 2, z: startOffset };
  }
  if (normId > 0 && normId < 10) {
    const step2 = normId;
    const x = startOffset - CORNER_SPAN / 2 - (step2 - 0.5) * REGULAR_SPAN;
    return { x, y: TILE_HEIGHT / 2, z: startOffset };
  }
  if (normId === 10) {
    return { x: -startOffset, y: TILE_HEIGHT / 2, z: startOffset };
  }
  if (normId > 10 && normId < 20) {
    const step2 = normId - 10;
    const z2 = startOffset - CORNER_SPAN / 2 - (step2 - 0.5) * REGULAR_SPAN;
    return { x: -startOffset, y: TILE_HEIGHT / 2, z: z2 };
  }
  if (normId === 20) {
    return { x: -startOffset, y: TILE_HEIGHT / 2, z: -startOffset };
  }
  if (normId > 20 && normId < 30) {
    const step2 = normId - 20;
    const x = -startOffset + CORNER_SPAN / 2 + (step2 - 0.5) * REGULAR_SPAN;
    return { x, y: TILE_HEIGHT / 2, z: -startOffset };
  }
  if (normId === 30) {
    return { x: startOffset, y: TILE_HEIGHT / 2, z: -startOffset };
  }
  const step = normId - 30;
  const z = -startOffset + CORNER_SPAN / 2 + (step - 0.5) * REGULAR_SPAN;
  return { x: startOffset, y: TILE_HEIGHT / 2, z };
}

// src/game/graph/legacyRingAdapter.ts
var LEGACY_MAP_ID = "legacy-ring-40";
var LEGACY_MAP_NAME = "B\u1EA3n \u0110\u1ED3 C\u1ED5 \u0110i\u1EC3n 40 \xD4 (Perimeter Ring)";
function legacyTileIdToNodeId(tileId) {
  const normId = (tileId % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
  return `node-${normId}`;
}
function createLegacyRingGraph(tiles = BOARD_TILES) {
  const nodes = {};
  const edges = {};
  const nodeIds = [];
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const nodeId = legacyTileIdToNodeId(tile.id);
    const nextTileId = (tile.id + 1) % tiles.length;
    const nextNodeId = legacyTileIdToNodeId(nextTileId);
    const edgeId = `edge-ring-${tile.id}-to-${nextTileId}`;
    nodeIds.push(nodeId);
    const pos3D = getLegacyTile3DWorldPosition(tile.id);
    edges[edgeId] = {
      id: edgeId,
      fromNodeId: nodeId,
      toNodeId: nextNodeId,
      type: "MAIN_LOOP",
      bidirectional: false,
      stepCost: 1,
      label: `V\xF2ng chu vi: ${tile.shortName} -> ${tiles[nextTileId].shortName}`
    };
    nodes[nodeId] = {
      id: nodeId,
      numericId: tile.id,
      name: tile.name,
      shortName: tile.shortName,
      type: tile.type,
      zoneId: tile.property?.district || "zone-perimeter-ring",
      floor: 0,
      position3D: {
        x: pos3D.x,
        y: 0,
        z: pos3D.z
      },
      connectedNodeIds: [nextNodeId],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
      property: tile.property ? { ...tile.property } : void 0,
      currentBusiness: void 0,
      hazardStatus: "NONE",
      description: tile.description,
      iconName: tile.iconName,
      taxAmount: tile.taxAmount,
      gridPosition: tile.gridPosition || TILE_GRID_POSITIONS_40[tile.id]
    };
  }
  const groundFloor = {
    floorIndex: 0,
    name: "M\u1EB7t \u0110\u1EA5t (Ground Level)",
    elevationY: 0,
    nodeIds
  };
  return {
    mapId: LEGACY_MAP_ID,
    mapName: LEGACY_MAP_NAME,
    description: "B\u1EA3n \u0111\u1ED3 40 \xF4 truy\u1EC1n th\u1ED1ng v\u1EDBi chu vi v\xF2ng kh\xE9p k\xEDn ti\xEAu chu\u1EA9n.",
    nodes,
    edges,
    startNodeId: legacyTileIdToNodeId(0),
    detentionNodeId: legacyTileIdToNodeId(10),
    floors: [groundFloor]
  };
}
var LEGACY_RING_GRAPH = Object.freeze(createLegacyRingGraph());

// src/game/maps/mapRegistry.ts
var MAP_SCHEMAS = {
  "new-york-wall-street": {
    mapId: "new-york-wall-street",
    mapName: "New York \u2014 Wall Street & Subway",
    nodeCount: 40,
    floorsCount: 2,
    uniqueMechanic: "Stock Co-Ownership and $3 Subway Express Transit",
    disasterDefinition: {
      name: "Black Monday Market Crash",
      triggerPhase: "CHAOS",
      effectDescription: "All rents halved for 2 rounds; subway power outage cuts express transit"
    },
    sampleNodes: [
      {
        id: "NY_SURFACE_00",
        name: "Wall Street NYSE",
        shortName: "NYSE",
        type: "PROPERTY",
        zoneId: "ZONE_FINANCIAL",
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ["NY_SURFACE_01", "NY_SUBWAY_00"],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: "NONE"
      },
      {
        id: "NY_SUBWAY_00",
        name: "Broad Street Subway Station",
        shortName: "MTA-B",
        type: "TRANSPORT",
        zoneId: "ZONE_SUBWAY",
        floor: -1,
        position3D: { x: 0, y: -3.5, z: 0 },
        connectedNodeIds: ["NY_SURFACE_00"],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: "NONE"
      }
    ]
  },
  "paris-riot-square": {
    mapId: "paris-riot-square",
    mapName: "Paris \u2014 Riot Square",
    nodeCount: 44,
    floorsCount: 1,
    uniqueMechanic: "Crisis Economics: Peaceful luxury boom vs Riot business surge",
    disasterDefinition: {
      name: "General Strike Flaming Barricades",
      triggerPhase: "CHAOS",
      effectDescription: "2 radial boulevards barricaded, forcing detours and burning vehicles"
    },
    sampleNodes: [
      {
        id: "PARIS_CENTRAL_00",
        name: "Place de la Bastille",
        shortName: "Bastille",
        type: "START",
        zoneId: "ZONE_CENTRAL",
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ["PARIS_BLVD_A0", "PARIS_BLVD_B0"],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: "NONE"
      }
    ]
  },
  "africa-mining-outpost": {
    mapId: "africa-mining-outpost",
    mapName: "Africa \u2014 Mining & Outpost",
    nodeCount: 40,
    floorsCount: 3,
    uniqueMechanic: "Commodity tokens (Copper/Cobalt) and Haul Ramp Ascent Tolls",
    disasterDefinition: {
      name: "Roaming Sandstorm",
      triggerPhase: "INSTABILITY",
      effectDescription: "8-node moving dust storm halving movement dice rolls and blinding radar"
    },
    sampleNodes: [
      {
        id: "AFRICA_RIM_00",
        name: "Outpost Trading Post",
        shortName: "Post",
        type: "PROPERTY",
        zoneId: "ZONE_RIM",
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ["AFRICA_PIT_00"],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: "NONE"
      }
    ]
  },
  "japan-shinjuku-alleys": {
    mapId: "japan-shinjuku-alleys",
    mapName: "Japan \u2014 Shinjuku Night Alleys",
    nodeCount: 44,
    floorsCount: 2,
    uniqueMechanic: "3-Business Synergy Triad (Izakaya + Karaoke + Capsule Hotel = 3.0x rent)",
    disasterDefinition: {
      name: "00:00 Last Train Curfew",
      triggerPhase: "CHAOS",
      effectDescription: "Elevated JR Line shuts down; stranded players in alleys detained by curfew police"
    },
    sampleNodes: [
      {
        id: "SHINJUKU_ALLEY_00",
        name: "Omoide Yokocho",
        shortName: "Yokocho",
        type: "PROPERTY",
        zoneId: "ZONE_ALLEY",
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ["SHINJUKU_ALLEY_01", "SHINJUKU_RAIL_00"],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: "NONE"
      }
    ]
  }
};
function buildGraphFromSchema(schema) {
  const nodes = {};
  const edges = {};
  const nodesPerFloor = Math.ceil(schema.nodeCount / schema.floorsCount);
  const floorList = [];
  for (let f = 0; f < schema.floorsCount; f++) {
    const floorIndex = schema.mapId === "new-york-wall-street" && f === 1 ? -1 : f;
    const elevationY = floorIndex * 3.5;
    const count = f === schema.floorsCount - 1 ? schema.nodeCount - f * nodesPerFloor : nodesPerFloor;
    const floorNodeIds = [];
    for (let i = 0; i < count; i++) {
      const idx = f * nodesPerFloor + i;
      const id = `${schema.mapId.toUpperCase().replace(/-/g, "_")}_F${f}_${i < 10 ? `0${i}` : i}`;
      const nextI = (i + 1) % count;
      const nextId = `${schema.mapId.toUpperCase().replace(/-/g, "_")}_F${f}_${nextI < 10 ? `0${nextI}` : nextI}`;
      floorNodeIds.push(id);
      nodes[id] = {
        id,
        numericId: idx % 40,
        name: idx === 0 ? schema.sampleNodes[0]?.name || `${schema.mapName} Start` : `${schema.mapName} F${floorIndex}-${i}`,
        shortName: `M${f}-${i}`,
        type: idx === 0 ? "START" : idx === 6 ? "DETENTION" : i % 5 === 4 ? "TRANSPORT" : "PROPERTY",
        zoneId: `ZONE_F${f}`,
        floor: floorIndex,
        position3D: { x: i % 4 * 3, y: elevationY, z: Math.floor(i / 4) * 3 },
        connectedNodeIds: [nextId],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: "NONE",
        property: {
          basePrice: 120 + f * 40,
          baseRent: 25 + f * 15,
          houseRent: [25, 60, 150, 380, 850],
          upgradeCost: 60,
          maxLevel: 5,
          district: `Floor ${floorIndex}`,
          districtColor: "district-cyber"
        }
      };
      edges[`EDGE_${id}_${nextId}`] = {
        id: `EDGE_${id}_${nextId}`,
        fromNodeId: id,
        toNodeId: nextId,
        type: "MAIN_LOOP",
        bidirectional: false
      };
    }
    floorList.push({
      floorIndex,
      name: `Floor ${floorIndex}`,
      elevationY,
      nodeIds: floorNodeIds
    });
  }
  if (floorList.length > 1) {
    for (let f = 0; f < floorList.length - 1; f++) {
      const fromId = floorList[f].nodeIds[Math.min(4, floorList[f].nodeIds.length - 1)];
      const toId = floorList[f + 1].nodeIds[Math.min(4, floorList[f + 1].nodeIds.length - 1)];
      if (fromId && toId) {
        nodes[fromId].connectedNodeIds.push(toId);
        nodes[fromId].isIntersection = true;
        nodes[toId].connectedNodeIds.push(fromId);
        nodes[toId].isIntersection = true;
        edges[`VERT_${fromId}_${toId}`] = {
          id: `VERT_${fromId}_${toId}`,
          fromNodeId: fromId,
          toNodeId: toId,
          type: "VERTICAL_STAIRS",
          toll: { currency: "CASH", amount: 0 },
          bidirectional: true
        };
      }
    }
  }
  const allNodeIds = Object.keys(nodes);
  return {
    mapId: schema.mapId,
    mapName: schema.mapName,
    description: schema.uniqueMechanic,
    nodes,
    edges,
    startNodeId: allNodeIds[0],
    detentionNodeId: allNodeIds[Math.min(6, allNodeIds.length - 1)],
    floors: floorList
  };
}
function getSpatialGraphForMapId(mapOrWorldId) {
  if (!mapOrWorldId) return LEGACY_RING_GRAPH;
  if (mapOrWorldId === KOWLOON_MAP_ID) {
    return createKowloonWalledCityGraph();
  }
  const schema = MAP_SCHEMAS[mapOrWorldId];
  if (schema) {
    return buildGraphFromSchema(schema);
  }
  return LEGACY_RING_GRAPH;
}

// src/game/turn-manager/turnManager.ts
var CATCH_UP_SHIELD_ROUNDS = 5;
var CATCH_UP_SHIELD_AMOUNT = 150;
function getNextActivePlayerIndex(players, currentIndex) {
  let next = (currentIndex + 1) % players.length;
  let completedRound = next <= currentIndex;
  let count = 0;
  while (players[next].isBankrupt && count < players.length) {
    next = (next + 1) % players.length;
    if (next <= currentIndex) {
      completedRound = true;
    }
    count++;
  }
  return { nextIndex: next, completedRound };
}
function advanceTurn(state) {
  const maxRounds = state.config.maxRounds > 0 ? state.config.maxRounds : 0;
  const winResult = evaluateWinCondition(
    state.players,
    state.properties,
    state.roundNumber,
    0,
    state
  );
  if (winResult.isGameOver) {
    return {
      ...state,
      status: "ENDED",
      winner: winResult.winner,
      turnPhase: "GAME_OVER"
    };
  }
  const { nextIndex, completedRound } = getNextActivePlayerIndex(state.players, state.activePlayerIndex);
  const nextPlayer = state.players[nextIndex];
  const newRound = completedRound ? state.roundNumber + 1 : state.roundNumber;
  if (maxRounds > 0 && completedRound && newRound > maxRounds) {
    const postRoundWin = evaluateWinCondition(
      state.players,
      state.properties,
      maxRounds,
      maxRounds,
      state
    );
    if (postRoundWin.isGameOver) {
      return {
        ...state,
        roundNumber: maxRounds,
        status: "ENDED",
        winner: postRoundWin.winner,
        turnPhase: "GAME_OVER"
      };
    }
  }
  const updatedPlayer = { ...nextPlayer, consecutiveDoubles: 0 };
  const updatedPlayers = [...state.players];
  updatedPlayers[nextIndex] = updatedPlayer;
  let updatedChaosModifiers = state.chaosModifiers;
  if (completedRound && state.chaosModifiers) {
    updatedChaosModifiers = {
      reverseDirectionTurns: Math.max(0, state.chaosModifiers.reverseDirectionTurns - 1),
      marketFrozenTurns: Math.max(0, state.chaosModifiers.marketFrozenTurns - 1),
      goldenHourTurns: Math.max(0, state.chaosModifiers.goldenHourTurns - 1),
      curfewTurns: Math.max(0, state.chaosModifiers.curfewTurns - 1),
      transportBoomTurns: Math.max(0, state.chaosModifiers.transportBoomTurns - 1),
      utilityBoomTurns: Math.max(0, state.chaosModifiers.utilityBoomTurns - 1),
      districtBoomTurns: Math.max(0, state.chaosModifiers.districtBoomTurns - 1),
      alienMothershipTurns: Math.max(0, state.chaosModifiers.alienMothershipTurns - 1),
      interestHikeTurns: Math.max(0, state.chaosModifiers.interestHikeTurns - 1),
      subsidizedMortgageTurns: Math.max(0, state.chaosModifiers.subsidizedMortgageTurns - 1)
    };
  }
  let shieldPlayers = updatedPlayers;
  let shieldLedger = state.ledger || [];
  const shieldLogs = [];
  if (completedRound && newRound % CATCH_UP_SHIELD_ROUNDS === 0) {
    const solvent = updatedPlayers.filter((p) => !p.isBankrupt);
    if (solvent.length > 1) {
      const trailing = [...solvent].sort(
        (a, b) => calculatePlayerNetWorth(a, state.properties, state.chaosModifiers, newRound, state) - calculatePlayerNetWorth(b, state.properties, state.chaosModifiers, newRound, state)
      )[0];
      const shieldRes = executeLedgerTransaction(
        shieldPlayers,
        {
          category: "CHAOS_EFFECT",
          from: "BANK",
          to: trailing.id,
          amount: CATCH_UP_SHIELD_AMOUNT,
          roundNumber: newRound,
          memo: "Khi\xEAn ch\u1ED1ng d\u1EABn \u0111\u1EA7u (tr\u1EE3 c\u1EA5p b\xE1m \u0111u\u1ED5i)"
        },
        shieldLedger
      );
      if (shieldRes.success) {
        shieldPlayers = shieldRes.newPlayers;
        shieldLedger = shieldRes.entry ? [...shieldLedger, shieldRes.entry] : shieldLedger;
        shieldLogs.push({
          id: `shield-${Date.now()}`,
          timestamp: Date.now(),
          playerId: trailing.id,
          playerName: trailing.name,
          message: `\u{1F6E1}\uFE0F [KHI\xCAN CH\u1ED0NG D\u1EAAN \u0110\u1EA6U] ${trailing.name} \u0111ang x\u1EBFp cu\u1ED1i, nh\u1EADn ${formatMoney(
            CATCH_UP_SHIELD_AMOUNT
          )} tr\u1EE3 c\u1EA5p \u0111\u1EC3 b\xE1m \u0111u\u1ED5i.`,
          type: "CHAOS"
        });
      }
    }
  }
  const world = completedRound ? advanceWorldRound(state, newRound) : null;
  let updatedChaosMeter = state.chaosMeter;
  let patrolPlayers = shieldPlayers;
  let patrolLedger = shieldLedger;
  const patrolLogs = [];
  if (updatedChaosMeter && updatedChaosMeter.phase !== "PEACEFUL" && updatedChaosMeter.patrolUnits && updatedChaosMeter.patrolUnits.length > 0 && state.spatialGraph) {
    const movedUnits = movePatrolUnits(updatedChaosMeter.patrolUnits, state.spatialGraph);
    updatedChaosMeter = {
      ...updatedChaosMeter,
      patrolUnits: movedUnits
    };
    for (const player of patrolPlayers) {
      if (player.isBankrupt) continue;
      const interception = checkPatrolInterception(player, movedUnits);
      if (interception) {
        const dummyState = {
          ...state,
          players: patrolPlayers,
          ledger: patrolLedger,
          chaosMeter: updatedChaosMeter,
          roundNumber: newRound
        };
        const penRes = resolvePatrolPenalty(dummyState, player.id);
        patrolPlayers = penRes.nextState.players;
        patrolLedger = penRes.nextState.ledger || patrolLedger;
        if (penRes.nextState.logs.length > dummyState.logs.length) {
          patrolLogs.push(penRes.nextState.logs[0]);
        }
      }
    }
  }
  const worldLogs = (world?.logs ?? []).map((entry, i) => ({
    id: `world-${newRound}-${i}`,
    timestamp: Date.now(),
    playerId: void 0,
    playerName: void 0,
    message: entry.message,
    type: entry.type
  }));
  const allNewLogs = [
    ...worldLogs,
    ...patrolLogs.length > 0 ? patrolLogs : [],
    ...shieldLogs.length > 0 ? shieldLogs : []
  ];
  const nextTurnState = {
    ...state,
    players: patrolPlayers,
    ledger: patrolLedger,
    ledgerHistory: patrolLedger,
    chaosMeter: updatedChaosMeter,
    activePlayerIndex: nextIndex,
    roundNumber: newRound,
    turnPhase: "WAITING_FOR_ROLL",
    worldState: world ? world.worldState : state.worldState,
    activeChaosCard: null,
    pendingDebt: null,
    dice: [1, 1],
    isDouble: false,
    rentModifier: 1,
    // Reset turn rent modifier
    chaosModifiers: updatedChaosModifiers,
    logs: allNewLogs.length > 0 ? [...allNewLogs, ...state.logs] : state.logs
  };
  if (completedRound) {
    return advanceKowloonDisasterIfNeeded(nextTurnState, newRound);
  }
  return nextTurnState;
}

// src/worlds/types.ts
var WORLD_SCHEMA_VERSION = 1;
var DEFAULT_WORLD_ID = "modern-metropolis";

// src/worlds/catalog.ts
var pal = (bg, bgAlt, surface, border, accent, accent2, text, glow) => ({ bg, bgAlt, surface, border, accent, accent2, text, glow });
var SEEDS = [
  {
    id: "modern-metropolis",
    order: 1,
    availability: "AVAILABLE",
    completeness: "FULL",
    name: { vi: "\u0110\xF4 Th\u1ECB Hi\u1EC7n \u0110\u1EA1i", en: "Modern Metropolis" },
    tagline: { vi: "T\xE0i ch\xEDnh \u2022 B\u1EA5t \u0111\u1ED9ng s\u1EA3n \u2022 Th\u01B0\u01A1ng m\u1EA1i", en: "Finance \u2022 Real estate \u2022 Commerce" },
    description: {
      vi: "Th\xE0nh ph\u1ED1 hi\u1EC7n \u0111\u1EA1i c\u1EE7a c\xE1c t\u1EADp \u0111o\xE0n l\u1EDBn, khu t\xE0i ch\xEDnh v\xE0 trung t\xE2m th\u01B0\u01A1ng m\u1EA1i. Th\u1ECB tr\u01B0\u1EDDng bi\u1EBFn \u0111\u1ED9ng theo t\u1EEBng v\xF2ng.",
      en: "A modern city of major corporations, financial districts and shopping centres. The market shifts round by round."
    },
    styleTags: [{ vi: "Cao t\u1EA7ng", en: "Skyline" }, { vi: "T\u1ED1i gi\u1EA3n cao c\u1EA5p", en: "Premium minimal" }],
    palette: pal("#080c14", "#0e1628", "#0f172a", "#334155", "#06b6d4", "#6366f1", "#e2e8f0", "rgba(6,182,212,0.18)")
  },
  {
    id: "cyberpunk-city",
    order: 2,
    availability: "AVAILABLE",
    completeness: "FULL",
    name: { vi: "Th\xE0nh Ph\u1ED1 Cyberpunk", en: "Cyberpunk City" },
    tagline: { vi: "C\xF4ng ngh\u1EC7 \u2022 AI \u2022 N\u0103ng l\u01B0\u1EE3ng", en: "Tech \u2022 AI \u2022 Energy" },
    description: {
      vi: "\u0110\xF4 th\u1ECB t\u01B0\u01A1ng lai v\u1EC1 \u0111\xEAm, n\u01A1i c\xE1c t\u1EADp \u0111o\xE0n c\xF4ng ngh\u1EC7 gi\xE0nh quy\u1EC1n ki\u1EC3m so\xE1t l\u01B0\u1EDBi \u0111i\u1EC7n v\xE0 d\u1EEF li\u1EC7u.",
      en: "A future city at night where tech corporations fight for control of the grid and the data."
    },
    styleTags: [{ vi: "Neon ti\u1EBFt ch\u1EBF", en: "Restrained neon" }, { vi: "M\u01B0a \u0111\xEAm", en: "Night rain" }],
    palette: pal("#0a0614", "#1a0b2e", "#150a26", "#6d28d9", "#e879f9", "#22d3ee", "#f5e9ff", "rgba(232,121,249,0.22)")
  },
  {
    id: "mekong-delta",
    order: 3,
    availability: "AVAILABLE",
    completeness: "FULL",
    name: { vi: "Mi\u1EC1n T\xE2y S\xF4ng N\u01B0\u1EDBc", en: "Mekong Delta" },
    tagline: { vi: "Ch\u1EE3 n\u1ED5i \u2022 M\xF9a v\u1EE5 \u2022 V\u1EADn t\u1EA3i \u0111\u01B0\u1EDDng th\u1EE7y", en: "Floating markets \u2022 Harvests \u2022 River freight" },
    description: {
      vi: "V\xF9ng \u0111\u1ED3ng b\u1EB1ng s\xF4ng n\u01B0\u1EDBc v\u1EDBi k\xEAnh r\u1EA1ch, ch\u1EE3 n\u1ED5i v\xE0 v\u01B0\u1EDDn c\xE2y tr\xE1i. M\xF9a v\u1EE5 v\xE0 th\u1EE7y l\u1ED9 \u1EA3nh h\u01B0\u1EDFng th\u01B0\u01A1ng m\u1EA1i.",
      en: "A river delta of canals, floating markets and orchards. Harvests and waterways shape local trade."
    },
    styleTags: [{ vi: "Nhi\u1EC7t \u0111\u1EDBi th\xE2n thi\u1EC7n", en: "Warm tropical" }, { vi: "S\xF4ng n\u01B0\u1EDBc", en: "Waterways" }],
    palette: pal("#06150f", "#0b2a1d", "#0d2219", "#15803d", "#34d399", "#fbbf24", "#ecfdf5", "rgba(52,211,153,0.2)")
  },
  {
    id: "quang-tri-highlands",
    order: 4,
    availability: "AVAILABLE",
    completeness: "FULL",
    name: { vi: "Cao Nguy\xEAn Qu\u1EA3ng Tr\u1ECB", en: "Qu\u1EA3ng Tr\u1ECB Highlands" },
    tagline: { vi: "M\xF9a m\u01B0a \u2022 M\xF9a kh\xF4 \u2022 C\xE0 ph\xEA", en: "Wet season \u2022 Dry season \u2022 Coffee" },
    description: {
      vi: "Cao nguy\xEAn mi\u1EC1n Trung v\u1EDBi m\xF9a m\u01B0a, m\xF9a kh\xF4 v\xE0 \u0111\u1ED3i c\xE0 ph\xEA. Thu\xEA v\xE0 gi\xE1 x\xE2y \u0111\u1ED5i theo m\xF9a.",
      en: "Central highlands of wet and dry seasons and coffee hills. Rents and build costs follow the season."
    },
    styleTags: [{ vi: "N\xFAi \u0111\u1ED3i", en: "Highlands" }],
    palette: pal("#0f1a12", "#1d2b1f", "#162017", "#4d7c0f", "#a3e635", "#fb923c", "#f7fee7", "rgba(163,230,53,0.16)")
  },
  {
    id: "northwest-vietnam",
    order: 5,
    availability: "AVAILABLE",
    completeness: "FULL",
    name: { vi: "T\xE2y B\u1EAFc Vi\u1EC7t Nam", en: "Northwest Vietnam" },
    tagline: { vi: "Ru\u1ED9ng b\u1EADc thang \u2022 Phi\xEAn ch\u1EE3 \u2022 \u0110\xE8o", en: "Terraces \u2022 Market days \u2022 Mountain passes" },
    description: {
      vi: "Ru\u1ED9ng b\u1EADc thang v\xE0 ch\u1EE3 phi\xEAn v\xF9ng cao. Phi\xEAn ch\u1EE3 m\u1EDF m\u1ED7i 5 v\xF2ng: giao d\u1ECBch t\u1EF1 do v\xE0 ho\xE0n ti\u1EC1n 100%.",
      en: "Terraced fields and highland fairs. A market opens every 5 rounds: free trading and 100% sellback."
    },
    styleTags: [{ vi: "N\xFAi nhi\u1EC1u l\u1EDBp", en: "Layered mountains" }],
    palette: pal("#101a14", "#1f3326", "#16241b", "#65a30d", "#bef264", "#f59e0b", "#f7fee7", "rgba(190,242,100,0.16)")
  },
  {
    id: "fantasy-kingdom",
    order: 6,
    availability: "COMING_SOON",
    completeness: "CONFIG_ONLY",
    name: { vi: "V\u01B0\u01A1ng Qu\u1ED1c Gi\u1EA3 T\u01B0\u1EDFng", en: "Fantasy Kingdom" },
    tagline: { vi: "L\xE2u \u0111\xE0i \u2022 Ph\xE9p thu\u1EADt \u2022 Th\u1EBF l\u1EF1c", en: "Castles \u2022 Magic \u2022 Factions" },
    description: {
      vi: "V\u01B0\u01A1ng qu\u1ED1c ph\xE9p thu\u1EADt v\u1EDBi l\xE2u \u0111\xE0i v\xE0 r\u1EEBng huy\u1EC1n b\xED. S\u1EAFp ra m\u1EAFt.",
      en: "A magical realm of castles and enchanted forests. Coming soon."
    },
    styleTags: [{ vi: "Huy\u1EC1n \u1EA3o", en: "Enchanted" }],
    palette: pal("#120a24", "#24103f", "#1b0f33", "#7c3aed", "#c4b5fd", "#fcd34d", "#f5f3ff", "rgba(196,181,253,0.18)")
  },
  {
    id: "tropical-island",
    order: 7,
    availability: "COMING_SOON",
    completeness: "CONFIG_ONLY",
    name: { vi: "\u0110\u1EA3o Nhi\u1EC7t \u0110\u1EDBi", en: "Tropical Island" },
    tagline: { vi: "Du l\u1ECBch \u2022 C\u1EA3ng bi\u1EC3n \u2022 T\xE0i nguy\xEAn bi\u1EC3n", en: "Tourism \u2022 Harbours \u2022 Marine resources" },
    description: {
      vi: "Qu\u1EA7n \u0111\u1EA3o nhi\u1EC7t \u0111\u1EDBi v\u1EDBi resort v\xE0 b\u1EBFn c\u1EA3ng. S\u1EAFp ra m\u1EAFt.",
      en: "A tropical archipelago of resorts and harbours. Coming soon."
    },
    styleTags: [{ vi: "Bi\u1EC3n xanh", en: "Blue sea" }],
    palette: pal("#04202a", "#08394a", "#0a2c3a", "#0891b2", "#22d3ee", "#fde047", "#ecfeff", "rgba(34,211,238,0.2)")
  },
  {
    id: "space-colony",
    order: 8,
    availability: "AVAILABLE",
    completeness: "FULL",
    name: { vi: "Thu\u1ED9c \u0110\u1ECBa Kh\xF4ng Gian", en: "Space Colony" },
    tagline: { vi: "N\u0103ng l\u01B0\u1EE3ng \u2022 T\xE0i nguy\xEAn \u2022 S\u1EF1 c\u1ED1 tr\u1EA1m", en: "Energy \u2022 Resources \u2022 Station incidents" },
    description: {
      vi: "C\xE1c tr\u1EA1m v\u0169 tr\u1EE5 v\xE0 khu \u0111\u1ECBnh c\u01B0 ngo\xE0i Tr\xE1i \u0110\u1EA5t, n\u01A1i n\u0103ng l\u01B0\u1EE3ng v\xE0 t\xE0i nguy\xEAn quy\u1EBFt \u0111\u1ECBnh t\u1EA5t c\u1EA3.",
      en: "Space stations and off-world settlements where energy and resources decide everything."
    },
    styleTags: [{ vi: "Kh\xF4ng gian s\xE2u", en: "Deep space" }, { vi: "C\xF4ng ngh\u1EC7 t\u01B0\u01A1ng lai", en: "Future tech" }],
    palette: pal("#05070f", "#0c1226", "#0a1020", "#3b82f6", "#60a5fa", "#f472b6", "#e0e7ff", "rgba(96,165,250,0.2)")
  }
];
var WORLD_CATALOG = SEEDS.map((s) => ({
  ...s,
  schemaVersion: WORLD_SCHEMA_VERSION,
  version: 1
}));
function getCatalogEntry(id) {
  return typeof id === "string" ? WORLD_CATALOG.find((w) => w.id === id) : void 0;
}
function isWorldSelectable(id) {
  const e = getCatalogEntry(id);
  return !!e && e.availability === "AVAILABLE";
}

// src/worlds/worldEvents.ts
var L = (vi, en) => ({ vi, en });
var WORLD_EVENTS = {
  "modern-metropolis": [
    {
      id: "mm-market-rally",
      name: L("Th\u1ECB Tr\u01B0\u1EDDng H\u01B0ng Ph\u1EA5n", "Market Rally"),
      description: L("Ch\u1EC9 s\u1ED1 ch\u1EE9ng kho\xE1n b\u1EE9t ph\xE1. M\u1ECDi nh\xE0 \u0111\u1EA7u t\u01B0 nh\u1EADn $60M.", "Stocks surge. Every investor receives $60M."),
      trigger: { tileType: "CHAOS", minRound: 1 },
      effect: { type: "CASH_ALL", value: 60, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "Gift"
    },
    {
      id: "mm-credit-squeeze",
      name: L("Si\u1EBFt T\xEDn D\u1EE5ng", "Credit Squeeze"),
      description: L("Ng\xE2n h\xE0ng n\xE2ng l\xE3i su\u1EA5t: ph\xED chu\u1ED9c th\u1EBF ch\u1EA5p t\u0103ng trong 2 l\u01B0\u1EE3t.", "Banks raise rates: unmortgage fees increase for 2 turns."),
      trigger: { tileType: "CHAOS", minRound: 5 },
      effect: { type: "INTEREST_HIKE", value: 20, durationInTurns: 2 },
      rarity: "UNCOMMON",
      iconName: "Percent"
    },
    {
      id: "mm-trade-expo",
      name: L("H\u1ED9i Ch\u1EE3 Th\u01B0\u01A1ng M\u1EA1i", "Trade Expo"),
      description: L("Khu th\u01B0\u01A1ng m\u1EA1i s\u1EA7m u\u1EA5t: ti\u1EC1n thu\xEA khu cao c\u1EA5p t\u0103ng 1.5x trong 2 l\u01B0\u1EE3t.", "Commercial districts boom: premium-district rent x1.5 for 2 turns."),
      trigger: { tileType: "CHAOS", minRound: 3 },
      effect: { type: "DISTRICT_BOOM", value: 1.5, durationInTurns: 2 },
      rarity: "RARE",
      iconName: "Building2"
    }
  ],
  "cyberpunk-city": [
    {
      id: "cp-grid-surge",
      name: L("Qu\xE1 T\u1EA3i L\u01B0\u1EDBi \u0110i\u1EC7n", "Grid Overload"),
      description: L("Gi\xE1 \u0111i\u1EC7n t\u0103ng v\u1ECDt: ti\u1EC1n thu\xEA ti\u1EC7n \xEDch g\u1EA5p \u0111\xF4i trong 2 l\u01B0\u1EE3t.", "Power prices spike: utility rent doubles for 2 turns."),
      trigger: { tileType: "CHAOS", minRound: 1 },
      effect: { type: "UTILITY_BOOM", value: 2, durationInTurns: 2 },
      rarity: "UNCOMMON",
      iconName: "Lightbulb"
    },
    {
      id: "cp-cyber-levy",
      name: L("Ph\xED An Ninh M\u1EA1ng", "Cybersecurity Levy"),
      description: L("Sau v\u1EE5 t\u1EA5n c\xF4ng d\u1EEF li\u1EC7u, m\u1ECDi ng\u01B0\u1EDDi \u0111\xF3ng $40M v\xE0o qu\u1EF9 an ninh.", "After a data breach, everyone pays $40M into the security fund."),
      trigger: { tileType: "CHAOS", minRound: 4 },
      effect: { type: "CASH_ALL", value: -40, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "Shield"
    },
    {
      id: "cp-ai-credit",
      name: L("Qu\u1EF9 T\xEDn D\u1EE5ng AI", "AI Credit Fund"),
      description: L("Qu\u1EF9 AI tr\u1EE3 gi\xE1 th\u1EBF ch\u1EA5p: gi\xE1 tr\u1ECB th\u1EBF ch\u1EA5p 75% trong 2 l\u01B0\u1EE3t.", "An AI fund subsidises mortgages: 75% loan value for 2 turns."),
      trigger: { tileType: "CHAOS", minRound: 3 },
      effect: { type: "SUBSIDIZED_MORTGAGE", value: 75, durationInTurns: 2 },
      rarity: "UNCOMMON",
      iconName: "Landmark"
    }
  ],
  "mekong-delta": [
    {
      id: "mk-bumper-harvest",
      name: L("Tr\xFAng M\xF9a L\xFAa", "Bumper Harvest"),
      description: L("M\xF9a v\u1EE5 b\u1ED9i thu. M\u1ECDi ng\u01B0\u1EDDi nh\u1EADn $50M.", "A bumper harvest. Everyone receives $50M."),
      trigger: { tileType: "CHAOS", minRound: 1 },
      effect: { type: "CASH_ALL", value: 50, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "Gift"
    },
    {
      id: "mk-river-freight",
      name: L("M\xF9a V\u1EADn T\u1EA3i \u0110\u01B0\u1EDDng Th\u1EE7y", "River Freight Rush"),
      description: L("Ghe thuy\u1EC1n t\u1EA5p n\u1EADp: ti\u1EC1n thu\xEA b\u1EBFn/ga g\u1EA5p \u0111\xF4i trong 3 l\u01B0\u1EE3t.", "Boats everywhere: transport rent doubles for 3 turns."),
      trigger: { tileType: "CHAOS", minRound: 2 },
      effect: { type: "TRANSPORT_BOOM", value: 2, durationInTurns: 3 },
      rarity: "UNCOMMON",
      iconName: "TrainTrack"
    },
    {
      id: "mk-flood-season",
      name: L("M\xF9a N\u01B0\u1EDBc N\u1ED5i", "Flood Season"),
      description: L("N\u01B0\u1EDBc l\xEAn cao: m\u1ED7i ng\u01B0\u1EDDi chi $40M gia c\u1ED1 b\u1EDD bao.", "Rising water: everyone pays $40M to reinforce embankments."),
      trigger: { tileType: "CHAOS", minRound: 4 },
      effect: { type: "CASH_ALL", value: -40, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "CloudRain"
    }
  ],
  "quang-tri-highlands": [
    {
      id: "qt-drought",
      name: L("H\u1EA1n H\xE1n M\xF9a Kh\xF4", "Dry Season Drought"),
      description: L("H\u1EA1n h\xE1n k\xE9o d\xE0i: m\u1ED7i ng\u01B0\u1EDDi chi $40M \u0111\xE0o gi\u1EBFng.", "Drought deepens: everyone pays $40M to dig wells."),
      trigger: { tileType: "CHAOS", minRound: 2 },
      effect: { type: "CASH_ALL", value: -40, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "CloudRain"
    },
    {
      id: "qt-coffee-price",
      name: L("Gi\xE1 C\xE0 Ph\xEA T\u0103ng V\u1ECDt", "Coffee Price Spike"),
      description: L("Gi\xE1 c\xE0 ph\xEA xu\u1EA5t kh\u1EA9u t\u0103ng v\u1ECDt. M\u1ECDi ng\u01B0\u1EDDi nh\u1EADn $60M.", "Coffee export prices soar. Everyone receives $60M."),
      trigger: { tileType: "CHAOS", minRound: 1 },
      effect: { type: "CASH_ALL", value: 60, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "Gift"
    },
    {
      id: "qt-storm",
      name: L("B\xE3o L\u0169 Mi\u1EC1n Trung", "Central Coast Storm"),
      description: L("B\xE3o \u0111\u1ED5 b\u1ED9: th\u1ECB tr\u01B0\u1EDDng t\u1EA1m \u0111\xF3ng trong 1 v\xF2ng.", "A storm hits: the market closes for 1 round."),
      trigger: { tileType: "CHAOS", minRound: 3 },
      effect: { type: "FREEZE_MARKET", value: 0, durationInTurns: 1 },
      rarity: "UNCOMMON",
      iconName: "Shield"
    }
  ],
  "northwest-vietnam": [
    {
      id: "nw-hail",
      name: L("M\u01B0a \u0110\xE1 V\xF9ng Cao", "Highland Hailstorm"),
      description: L("M\u01B0a \u0111\xE1 ph\xE1 m\xF9a v\u1EE5: m\u1ED7i ng\u01B0\u1EDDi chi $40M.", "Hail ruins crops: everyone pays $40M."),
      trigger: { tileType: "CHAOS", minRound: 2 },
      effect: { type: "CASH_ALL", value: -40, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "CloudRain"
    },
    {
      id: "nw-tourism-boom",
      name: L("Kh\xE1ch Du L\u1ECBch B\xF9ng N\u1ED5", "Tourism Boom"),
      description: L("Du kh\xE1ch \u0111\u1ED5 v\u1EC1 c\xE1c b\u1EA3n l\xE0ng: ti\u1EC1n thu\xEA khu cao c\u1EA5p t\u0103ng 1.5x trong 2 l\u01B0\u1EE3t.", "Visitors flood the villages: premium rent x1.5 for 2 turns."),
      trigger: { tileType: "CHAOS", minRound: 1 },
      effect: { type: "DISTRICT_BOOM", value: 1.5, durationInTurns: 2 },
      rarity: "UNCOMMON",
      iconName: "Building2"
    },
    {
      id: "nw-mountain-haze",
      name: L("S\u01B0\u01A1ng Mu\u1ED1i \u0110\xE8o Cao", "Frost on the Pass"),
      description: L("S\u01B0\u01A1ng mu\u1ED1i ph\u1EE7 \u0111\xE8o: gi\u1EDBi nghi\xEAm 1 l\u01B0\u1EE3t.", "Frost covers the pass: curfew for 1 turn."),
      trigger: { tileType: "CHAOS", minRound: 3 },
      effect: { type: "CURFEW", value: 4, durationInTurns: 1 },
      rarity: "UNCOMMON",
      iconName: "Shield"
    }
  ],
  "space-colony": [
    {
      id: "sc-solar-flare",
      name: L("B\xE3o M\u1EB7t Tr\u1EDDi", "Solar Flare"),
      description: L("Gi\u1EDBi nghi\xEAm tr\u1EA1m: m\u1ED7i l\u01B0\u1EE3t ch\u1EC9 \u0111\u01B0\u1EE3c \u0111i t\u1ED1i \u0111a 4 b\u01B0\u1EDBc trong 1 l\u01B0\u1EE3t.", "Station lockdown: movement capped at 4 steps for 1 turn."),
      trigger: { tileType: "CHAOS", minRound: 2 },
      effect: { type: "CURFEW", value: 4, durationInTurns: 1 },
      rarity: "RARE",
      iconName: "Shield"
    },
    {
      id: "sc-energy-surge",
      name: L("\u0110\u1ED9t Bi\u1EBFn N\u0103ng L\u01B0\u1EE3ng", "Energy Surge"),
      description: L("Gi\xE1 n\u0103ng l\u01B0\u1EE3ng t\u0103ng: ti\u1EC1n thu\xEA ti\u1EC7n \xEDch g\u1EA5p \u0111\xF4i trong 2 l\u01B0\u1EE3t.", "Energy prices climb: utility rent doubles for 2 turns."),
      trigger: { tileType: "CHAOS", minRound: 1 },
      effect: { type: "UTILITY_BOOM", value: 2, durationInTurns: 2 },
      rarity: "UNCOMMON",
      iconName: "Lightbulb"
    },
    {
      id: "sc-supply-drop",
      name: L("Ti\u1EBFp T\u1EBF T\u1EEB Tr\xE1i \u0110\u1EA5t", "Earth Supply Drop"),
      description: L("T\xE0u ti\u1EBFp t\u1EBF c\u1EADp b\u1EBFn. M\u1ECDi ng\u01B0\u1EDDi nh\u1EADn $60M.", "A supply ship docks. Everyone receives $60M."),
      trigger: { tileType: "CHAOS", minRound: 1 },
      effect: { type: "CASH_ALL", value: 60, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "Gift"
    },
    {
      id: "sc-hull-breach",
      name: L("R\xF2 R\u1EC9 V\u1ECF Tr\u1EA1m", "Hull Breach"),
      description: L("S\u1EEDa ch\u1EEFa kh\u1EA9n c\u1EA5p: m\u1ED7i ng\u01B0\u1EDDi chi $50M.", "Emergency repairs: everyone pays $50M."),
      trigger: { tileType: "CHAOS", minRound: 6 },
      effect: { type: "CASH_ALL", value: -50, durationInTurns: 0 },
      rarity: "COMMON",
      iconName: "Flame"
    }
  ]
};
var WORLD_EVENT_SHARE = 0.3;
function getWorldEvents(worldId) {
  const id = typeof worldId === "string" ? worldId : DEFAULT_WORLD_ID;
  if (!getCatalogEntry(id)) return [];
  return WORLD_EVENTS[id] ?? [];
}
function worldEventToChaosCard(worldId, ev) {
  const { type, value, durationInTurns } = ev.effect;
  return {
    id: `world-${ev.id}`,
    title: ev.name.en,
    nameVi: ev.name.vi,
    tagline: ev.name.en,
    taglineVi: ev.name.vi,
    flavorText: ev.description.en,
    descriptionVi: ev.description.vi,
    category: type === "CASH_ALL" ? value >= 0 ? "POSITIVE" : "NEGATIVE" : "ECONOMIC",
    rarity: ev.rarity,
    effectType: type,
    value,
    magnitude: value,
    durationInTurns,
    iconName: ev.iconName,
    triggerType: "TILE_LANDED",
    worldId,
    worldEventId: ev.id
  };
}
function pickWorldEventCard(state, rng) {
  const worldId = state.config.worldId;
  if (!worldId) return null;
  const eligible = getWorldEvents(worldId).filter(
    (e) => state.roundNumber >= e.trigger.minRound && (e.trigger.maxRound === void 0 || state.roundNumber <= e.trigger.maxRound) && state.chaosHistory?.[0]?.cardId !== `world-${e.id}`
  );
  if (eligible.length === 0) return null;
  const r = rng ?? defaultPRNG;
  if (r.nextFloat() >= WORLD_EVENT_SHARE) return null;
  return worldEventToChaosCard(worldId, eligible[r.nextInt(0, eligible.length - 1)]);
}

// src/game/graph/urbanFogOfWarEngine.ts
function createInitialFogOfWarState(graph) {
  const unlockedZones = {};
  const unlockedNodes = {};
  if (graph.zones) {
    for (const [zoneId, zone] of Object.entries(graph.zones)) {
      const isLocked = Boolean(zone.initiallyLocked ?? zone.isLocked ?? zone.isSecretZone ?? zone.isSecret);
      unlockedZones[zoneId] = !isLocked;
      for (const nodeId of zone.nodeIds) {
        unlockedNodes[nodeId] = !isLocked;
      }
    }
  }
  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    if (unlockedNodes[nodeId] === void 0) {
      unlockedNodes[nodeId] = !node.isSecretZone && !node.isLocked;
    }
  }
  return {
    unlockedZones,
    unlockedNodes,
    unlockHistory: []
  };
}
function checkUnlockTriggers(state, graph, triggerContext) {
  if (!graph.zones) {
    return { shouldUnlock: false, zoneIdsToUnlock: [], reasons: {} };
  }
  const fogState = state.fogOfWarState;
  const zoneIdsToUnlock = [];
  const reasons = {};
  const totalUpgrades = Object.values(state.properties || {}).reduce(
    (sum, p) => sum + (p.level || 0),
    0
  );
  const hasLandmark = Object.values(state.properties || {}).some(
    (p) => (p.level || 0) >= 5
  );
  for (const [zoneId, zone] of Object.entries(graph.zones)) {
    if (fogState && fogState.unlockedZones[zoneId]) {
      continue;
    }
    const triggers = [];
    if (zone.unlockRequirement) {
      triggers.push(zone.unlockRequirement);
    }
    if (zone.unlockTriggers && Array.isArray(zone.unlockTriggers)) {
      triggers.push(...zone.unlockTriggers);
    }
    for (const trigger of triggers) {
      let matched = false;
      let reasonText = "";
      switch (trigger.type) {
        case "BUILDING_UPGRADE_COUNT": {
          const threshold = trigger.threshold ?? 5;
          if (totalUpgrades >= threshold) {
            matched = true;
            reasonText = `T\u1ED5ng c\u1EA5p c\xF4ng tr\xECnh to\xE0n b\xE0n c\u1EDD \u0111\u1EA1t ${totalUpgrades}/${threshold}`;
          }
          break;
        }
        case "BUILDING_UPGRADE": {
          if (trigger.targetPropertyId) {
            const prop = Object.entries(state.properties || {}).find(
              ([id]) => id === trigger.targetPropertyId || `tile-${id}` === trigger.targetPropertyId
            );
            const level = prop ? prop[1].level : 0;
            const threshold = trigger.threshold ?? 3;
            if (level >= threshold) {
              matched = true;
              reasonText = `B\u1EA5t \u0111\u1ED9ng s\u1EA3n [${trigger.targetPropertyId}] \u0111\xE3 n\xE2ng c\u1EA5p l\xEAn c\u1EA5p ${level}`;
            }
          } else {
            const threshold = trigger.threshold ?? 5;
            if (totalUpgrades >= threshold) {
              matched = true;
              reasonText = `T\u1ED5ng n\xE2ng c\u1EA5p c\xF4ng tr\xECnh \u0111\u1EA1t ${totalUpgrades}`;
            }
          }
          break;
        }
        case "LANDMARK_BUILT": {
          if (hasLandmark) {
            matched = true;
            reasonText = `\u0110\u1EA1i C\xF4ng Tr\xECnh Landmark 5\u2605 \u0111\u1EA7u ti\xEAn \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n th\xE0nh`;
          }
          break;
        }
        case "ROUND_NUMBER":
        case "ROUND_THRESHOLD": {
          const targetRound = trigger.threshold ?? 5;
          if (state.roundNumber >= targetRound) {
            matched = true;
            reasonText = `V\xF2ng \u0111\u1EA5u \u0111\xE3 ti\u1EBFn t\u1EDBi V\xF2ng ${state.roundNumber}`;
          }
          break;
        }
        case "CHAOS_PHASE": {
          const currentPhase = triggerContext?.chaosPhase;
          if (currentPhase && trigger.chaosPhase && currentPhase === trigger.chaosPhase) {
            matched = true;
            reasonText = `Ch\u1EC9 s\u1ED1 H\u1ED7n Lo\u1EA1n chuy\u1EC3n sang giai \u0111o\u1EA1n [${trigger.chaosPhase}]`;
          }
          break;
        }
        case "CHAOS_EVENT": {
          const activeEventId = triggerContext?.eventId || state.activeChaosCard?.id;
          if (activeEventId && trigger.eventId && activeEventId === trigger.eventId) {
            matched = true;
            reasonText = `S\u1EF1 ki\u1EC7n H\u1ED7n Lo\u1EA1n k\xEDch ho\u1EA1t: [${trigger.eventId}]`;
          }
          break;
        }
        case "MANUAL": {
          if (triggerContext?.triggerType === "MANUAL") {
            matched = true;
            reasonText = trigger.descriptionVi || "M\u1EDF kh\xF3a \u0111\u1EB7c bi\u1EC7t theo l\u1EC7nh \u0111i\u1EC1u khi\u1EC3n";
          }
          break;
        }
      }
      if (matched) {
        zoneIdsToUnlock.push(zoneId);
        reasons[zoneId] = reasonText;
        break;
      }
    }
  }
  return {
    shouldUnlock: zoneIdsToUnlock.length > 0,
    zoneIdsToUnlock,
    reasons
  };
}
function unlockZone(graph, zoneId, fogState, roundNumber = 1, reason) {
  const zone = graph.zones?.[zoneId];
  const affectedNodeIds = zone?.nodeIds || [];
  const updatedNodes = { ...graph.nodes };
  for (const nodeId of affectedNodeIds) {
    if (updatedNodes[nodeId]) {
      updatedNodes[nodeId] = {
        ...updatedNodes[nodeId],
        isLocked: false,
        isSecretZone: false
      };
    }
  }
  const updatedZones = graph.zones ? { ...graph.zones } : {};
  if (updatedZones[zoneId]) {
    updatedZones[zoneId] = {
      ...updatedZones[zoneId],
      isLocked: false,
      initiallyLocked: false,
      isSecret: false,
      isSecretZone: false
    };
  }
  const updatedGraph = {
    ...graph,
    nodes: updatedNodes,
    zones: updatedZones
  };
  const updatedUnlockedZones = {
    ...fogState.unlockedZones,
    [zoneId]: true
  };
  const updatedUnlockedNodes = {
    ...fogState.unlockedNodes
  };
  for (const nodeId of affectedNodeIds) {
    updatedUnlockedNodes[nodeId] = true;
  }
  const unlockEvent = {
    zoneId,
    zoneName: zone?.name || zoneId,
    triggeredBy: reason || "Khu v\u1EF1c b\xED m\u1EADt \u0111\xE3 \u0111\u01B0\u1EE3c v\xE9n m\xE0n s\u01B0\u01A1ng m\xF9!",
    roundNumber,
    timestamp: Date.now(),
    unlockedNodeIds: affectedNodeIds
  };
  const updatedFogState = {
    unlockedZones: updatedUnlockedZones,
    unlockedNodes: updatedUnlockedNodes,
    unlockHistory: [...fogState.unlockHistory, unlockEvent]
  };
  return { updatedGraph, updatedFogState, unlockEvent };
}

// src/game/chaos-engine/chaosMeter.ts
var CHAOS_DELTAS = {
  DICE_ROLLED: 0.4,
  DICE_DOUBLES: 1.5,
  PROPERTY_PURCHASED: 1,
  PROPERTY_UPGRADED: 1.5,
  RENT_PAID_BASE: 0.2,
  RENT_PAID_HIGH_RATE: 0.5,
  // per $100M if >= $200M
  TRAP_TRIGGERED: 2.5,
  CHAOS_CARD_DRAWN: 3,
  AUCTION_STARTED: 1.5,
  PLAYER_BANKRUPTCY: 8,
  PASS_GO: -0.5,
  PAY_DETENTION_BAIL: -1
};
function createInitialChaosMeter() {
  return {
    value: 0,
    phase: "PEACEFUL",
    phaseFloor: 0,
    patrolUnits: []
  };
}
function applyChaosDelta(meter, delta, _roundNumber) {
  const candidate = Math.round((meter.value + delta) * 100) / 100;
  const clampedValue = Math.min(100, Math.max(meter.phaseFloor, candidate));
  let nextPhase = meter.phase;
  let nextFloor = meter.phaseFloor;
  let transitionedPhase;
  if (nextFloor >= 70 || clampedValue > 70) {
    nextPhase = "CHAOS";
    nextFloor = Math.max(nextFloor, 70);
    if (meter.phase !== "CHAOS") {
      transitionedPhase = "CHAOS";
    }
  } else if (nextFloor >= 30 || clampedValue > 30) {
    nextPhase = "INSTABILITY";
    nextFloor = Math.max(nextFloor, 30);
    if (meter.phase === "PEACEFUL") {
      transitionedPhase = "INSTABILITY";
    }
  } else {
    nextPhase = "PEACEFUL";
    nextFloor = 0;
  }
  const patrolUnits = [...meter.patrolUnits || []];
  if (transitionedPhase === "INSTABILITY" && patrolUnits.length === 0) {
    patrolUnits.push({
      id: "PATROL_01",
      currentNodeId: "KOW_F1_04",
      destinationNodeId: "KOW_F1_08",
      direction: "FORWARD"
    });
  }
  const nextMeter = {
    value: clampedValue,
    phase: nextPhase,
    phaseFloor: nextFloor,
    patrolUnits
  };
  return { nextMeter, transitionedPhase };
}

// src/game/chaos-engine/chaosEventBus.ts
function computeDeltaForEvent(event) {
  switch (event.type) {
    case "DICE_ROLLED":
      return CHAOS_DELTAS.DICE_ROLLED;
    // +0.4%
    case "DICE_DOUBLES":
      return CHAOS_DELTAS.DICE_DOUBLES;
    // +1.5%
    case "PROPERTY_PURCHASED":
      return CHAOS_DELTAS.PROPERTY_PURCHASED;
    // +1.0%
    case "PROPERTY_UPGRADED":
      return CHAOS_DELTAS.PROPERTY_UPGRADED;
    // +1.5%
    case "RENT_PAID":
      if (event.amount !== void 0 && event.amount >= 200) {
        return CHAOS_DELTAS.RENT_PAID_HIGH_RATE * Math.floor(event.amount / 100);
      }
      return CHAOS_DELTAS.RENT_PAID_BASE;
    // +0.2%
    case "TRAP_TRIGGERED":
      return CHAOS_DELTAS.TRAP_TRIGGERED;
    // +2.5%
    case "CHAOS_CARD_DRAWN":
      return CHAOS_DELTAS.CHAOS_CARD_DRAWN;
    // +3.0%
    case "AUCTION_STARTED":
      return CHAOS_DELTAS.AUCTION_STARTED;
    // +1.5%
    case "PLAYER_BANKRUPTCY":
      return CHAOS_DELTAS.PLAYER_BANKRUPTCY;
    // +8.0%
    case "PASS_GO":
      return CHAOS_DELTAS.PASS_GO;
    // -0.5%
    case "PAY_DETENTION_BAIL":
      return CHAOS_DELTAS.PAY_DETENTION_BAIL;
    // -1.0%
    default:
      return 0;
  }
}
function processGameEvent(state, event) {
  const currentMeter = state.chaosMeter || createInitialChaosMeter();
  const delta = computeDeltaForEvent(event);
  const { nextMeter, transitionedPhase } = applyChaosDelta(currentMeter, delta, state.roundNumber);
  let nextState = {
    ...state,
    chaosMeter: nextMeter
  };
  if (transitionedPhase) {
    const phaseName = transitionedPhase === "INSTABILITY" ? "B\u1EA4T \u1ED4N (INSTABILITY)" : "H\u1ED6N LO\u1EA0N T\u1ED8T \u0110\u1ED8 (CHAOS)";
    const logEntry = {
      id: `disaster-phase-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      timestamp: Date.now(),
      message: `\u{1F6A8} [B\xC1O \u0110\u1ED8NG H\u1ED6N LO\u1EA0N] Ch\u1EC9 s\u1ED1 H\u1ED7n Lo\u1EA1n \u0111\u1EA1t ${nextMeter.value}%! Tr\xF2 ch\u01A1i b\u01B0\u1EDBc v\xE0o giai \u0111o\u1EA1n ${phaseName}!`,
      type: "WARNING"
    };
    nextState.logs = [logEntry, ...nextState.logs];
    nextState.lastSoundEffect = "chaosWarning";
    if (nextState.spatialGraph && nextState.fogOfWarState) {
      const unlockRes = checkUnlockTriggers(nextState, nextState.spatialGraph, {
        triggerType: "CHAOS_CHANGE",
        chaosPhase: transitionedPhase,
        chaosMeterValue: nextMeter.value
      });
      if (unlockRes.shouldUnlock) {
        let currentGraph = nextState.spatialGraph;
        let currentFog = nextState.fogOfWarState;
        const newLogs = [...nextState.logs];
        for (const zoneId of unlockRes.zoneIdsToUnlock) {
          const reason = unlockRes.reasons[zoneId] || `Khai m\u1EDF do H\u1ED7n Lo\u1EA1n b\u01B0\u1EDBc v\xE0o ${transitionedPhase}`;
          const res = unlockZone(currentGraph, zoneId, currentFog, nextState.roundNumber, reason);
          currentGraph = res.updatedGraph;
          currentFog = res.updatedFogState;
          newLogs.unshift({
            id: `unlock-${zoneId}-${Date.now()}`,
            timestamp: Date.now(),
            message: `\u{1F513} [KHAI M\u1EDE KHU V\u1EF0C] Khu v\u1EF1c b\xED m\u1EADt [${res.unlockEvent.zoneName}] \u0111\xE3 \u0111\u01B0\u1EE3c khai m\u1EDF! (${reason})`,
            type: "CHAOS"
          });
        }
        nextState = {
          ...nextState,
          spatialGraph: currentGraph,
          fogOfWarState: currentFog,
          logs: newLogs
        };
      }
    }
  }
  return nextState;
}

// src/game/gameReducer.ts
var INITIAL_GAME_CONFIG = {
  startingCash: 1500,
  salaryOnStart: 200,
  maxRounds: 0,
  detentionBailCost: 100,
  fastMode: false,
  gameMode: "CHAOS"
};
var INITIAL_GAME_STATE = {
  config: INITIAL_GAME_CONFIG,
  status: "SETUP",
  players: [],
  activePlayerIndex: 0,
  turnPhase: "WAITING_FOR_ROLL",
  roundNumber: 1,
  dice: [1, 1],
  isDouble: false,
  properties: {},
  activeChaosCard: null,
  pendingDebt: null,
  logs: [],
  winner: null,
  selectedTileForDetail: null,
  rentModifier: 1,
  chaosModifiers: {
    reverseDirectionTurns: 0,
    marketFrozenTurns: 0,
    goldenHourTurns: 0,
    curfewTurns: 0,
    transportBoomTurns: 0,
    utilityBoomTurns: 0,
    districtBoomTurns: 0,
    alienMothershipTurns: 0,
    interestHikeTurns: 0,
    subsidizedMortgageTurns: 0
  },
  ledger: [],
  ledgerHistory: [],
  chaosHistory: [],
  processedActionIds: [],
  lastSoundEffect: null,
  activeAuction: null,
  activeTrade: null,
  lastAIDecision: null,
  worldState: null,
  spatialGraph: LEGACY_RING_GRAPH,
  fogOfWarState: createInitialFogOfWarState(LEGACY_RING_GRAPH),
  movementState: null,
  chaosMeter: createInitialChaosMeter(),
  placedTraps: []
};
function gameReducer(state, action) {
  if ((state.status === "ENDED" || state.turnPhase === "GAME_OVER") && action.type !== "RESTART_GAME" && action.type !== "LOAD_SAVED_MATCH") {
    return state;
  }
  if (action.actionId && state.processedActionIds && state.processedActionIds.includes(action.actionId)) {
    return state;
  }
  if (action.senderPlayerId) {
    const sender = state.players.find((p) => p.id === action.senderPlayerId);
    if (sender && sender.isBankrupt) {
      return state;
    }
    const activePlayer = state.players[state.activePlayerIndex];
    const isMultiPlayerAction = action.type === "START_GAME" || action.type === "RESTART_GAME" || action.type === "LOAD_SAVED_MATCH" || action.type === "SELECT_TILE_DETAIL" || action.type === "RESOLVE_CHAOS" || action.type === "PLACE_AUCTION_BID" || action.type === "PASS_AUCTION_BID" || action.type === "PROPOSE_TRADE" || action.type === "ACCEPT_TRADE" || action.type === "REJECT_TRADE" || action.type === "CANCEL_TRADE" || action.type === "COUNTER_TRADE" || // Tây Bắc: trading, downgrading, selling and mortgaging are allowed outside the active turn on market days.
    action.type === "DOWNGRADE_PROPERTY" || action.type === "SELL_PROPERTY" || action.type === "MORTGAGE_PROPERTY" || action.type === "DECLARE_BANKRUPTCY" || action.type === "UNLOCK_ZONE" || action.type === "RECORD_AI_DECISION";
    if (!isMultiPlayerAction && activePlayer && action.senderPlayerId !== activePlayer.id) {
      return state;
    }
  }
  const nextState = reduceAction(state, action);
  if (action.actionId && nextState !== state) {
    const existingIds = state.processedActionIds || [];
    nextState.processedActionIds = [...existingIds.slice(-49), action.actionId];
  }
  return nextState;
}
function reduceAction(state, action) {
  switch (action.type) {
    case "START_GAME": {
      const initialProperties = {};
      BOARD_TILES.forEach((tile) => {
        if (tile.type === "PROPERTY" || tile.type === "TRANSPORT" || tile.type === "UTILITY") {
          initialProperties[tile.id] = {
            ownerId: null,
            level: 0,
            isMortgaged: false
          };
        }
      });
      const config = { ...INITIAL_GAME_CONFIG, ...action.config };
      if (config.worldId !== void 0 && config.worldId !== KOWLOON_MAP_ID) {
        if (!isWorldSelectable(config.worldId)) return state;
        config.worldVersion = getCatalogEntry(config.worldId)?.version;
      }
      const selectedGraph = getSpatialGraphForMapId(config.mapId || config.worldId);
      const startNodeId = selectedGraph.startNodeId;
      for (const node of Object.values(selectedGraph.nodes)) {
        if (node.numericId !== void 0 && (node.type === "PROPERTY" || node.type === "TRANSPORT" || node.type === "UTILITY") && !initialProperties[node.numericId]) {
          initialProperties[node.numericId] = {
            ownerId: null,
            level: 0,
            isMortgaged: false
          };
        }
      }
      const players = action.players.map((p, idx) => ({
        id: `player-${idx + 1}`,
        name: p.name.trim() || `Ng\u01B0\u1EDDi ch\u01A1i ${idx + 1}`,
        token: p.token || DEFAULT_PLAYER_TOKENS[idx % DEFAULT_PLAYER_TOKENS.length],
        cash: config.startingCash,
        position: 0,
        positionNodeId: selectedGraph.mapId !== "legacy-ring-40" ? startNodeId : void 0,
        inDetention: false,
        detentionTurns: 0,
        jailFreeCards: 0,
        isBankrupt: false,
        isAI: !!p.isAI,
        aiPersonality: p.aiPersonality || (p.isAI ? "STRATEGIST" : void 0),
        aiDifficulty: p.aiDifficulty || (p.isAI ? "NORMAL" : void 0),
        consecutiveDoubles: 0,
        stats: {
          rentPaid: 0,
          rentCollected: 0,
          chaosTriggered: 0,
          tilesTraveled: 0,
          propertiesOwned: 0
        }
      }));
      emitSound("buyProperty");
      const worldId = config.worldId ?? "";
      const startWorldState = worldId === "quang-tri-highlands" ? { seasonPhase: seasonForRound(1), blockedTiles: [] } : worldId === "northwest-vietnam" ? { marketOpen: marketOpenForRound(1) } : null;
      return {
        ...INITIAL_GAME_STATE,
        config,
        status: "PLAYING",
        players,
        worldState: startWorldState,
        properties: initialProperties,
        spatialGraph: selectedGraph,
        fogOfWarState: createInitialFogOfWarState(selectedGraph),
        activePlayerIndex: 0,
        turnPhase: "WAITING_FOR_ROLL",
        ledger: [],
        ledgerHistory: [],
        processedActionIds: [],
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `start-${Date.now()}`,
            timestamp: Date.now(),
            message: `Tr\xF2 ch\u01A1i b\u1EAFt \u0111\u1EA7u v\u1EDBi ${players.length} ng\u01B0\u1EDDi ch\u01A1i tr\xEAn B\xE0n c\u1EDD \u0110\xF4 Th\u1ECB Vi\u1EC7t Nam 40 \xF4. Ch\xFAc c\xE1c nh\xE0 t\xE0i phi\u1EC7t may m\u1EAFn!`,
            type: "INFO"
          }
        ]
      };
    }
    case "ROLL_DICE_START": {
      if (state.turnPhase !== "WAITING_FOR_ROLL") return state;
      const activePlayer = state.players[state.activePlayerIndex];
      if (activePlayer && activePlayer.turnLockTurns && activePlayer.turnLockTurns > 0) {
        const clearedPlayer = { ...activePlayer, turnLockTurns: activePlayer.turnLockTurns - 1 };
        const updatedPlayers = state.players.map((p) => p.id === activePlayer.id ? clearedPlayer : p);
        const nextState = {
          ...state,
          players: updatedPlayers,
          logs: [
            {
              id: `stun-skip-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `\u26D3\uFE0F [CHO\xC1NG] ${activePlayer.name} \u0111ang b\u1ECB cho\xE1ng b\u1EDFi b\u1EABy Lockdown! M\u1EA5t l\u01B0\u1EE3t l\u1EAFc x\xED ng\u1EA7u.`,
              type: "CHAOS"
            },
            ...state.logs
          ]
        };
        return advanceTurn(nextState);
      }
      emitSound("diceRoll");
      return {
        ...state,
        turnPhase: "ROLLING",
        lastSoundEffect: "diceRoll"
      };
    }
    case "ROLL_DICE_RESULT": {
      const activePlayer = state.players[state.activePlayerIndex];
      if (!activePlayer || activePlayer.isBankrupt) return state;
      const dice = action.dice || rollTwoDice().dice;
      const [d1, d2] = dice;
      const sum = d1 + d2;
      const isDouble = d1 === d2;
      if (activePlayer.inDetention) {
        if (isDouble) {
          emitSound("diceRoll");
          const movement = calculateEffectiveMovement(activePlayer.position, sum, state.chaosModifiers, BOARD_SIZE);
          const newPosition = movement.newPosition;
          const passedStart = movement.passedStart;
          let currentPlayers2 = state.players;
          let currentLedger2 = state.ledger || [];
          let earnedSalary = 0;
          let salaryLog = "";
          if (passedStart || newPosition === 0) {
            earnedSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
            const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
            salaryLog = ` v\xE0 nh\u1EADn ${formatMoney(earnedSalary)} tr\u1EE3 c\u1EA5p C\u1ED5ng Kh\u1EDFi H\xE0nh${isGoldenHour ? " (x2 Gi\u1EDD V\xE0ng)!" : "!"}`;
          }
          if (earnedSalary > 0) {
            const salaryRes = executeLedgerTransaction(currentPlayers2, {
              category: "SALARY_START",
              from: "BANK",
              to: activePlayer.id,
              amount: earnedSalary,
              roundNumber: state.roundNumber,
              memo: `L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh (GO)`
            }, currentLedger2);
            if (salaryRes.success && salaryRes.entry) {
              currentPlayers2 = salaryRes.newPlayers;
              currentLedger2 = [...currentLedger2, salaryRes.entry];
            }
          }
          const updatedPlayer2 = {
            ...currentPlayers2.find((p) => p.id === activePlayer.id) || activePlayer,
            position: newPosition,
            inDetention: false,
            detentionTurns: 0,
            consecutiveDoubles: 0,
            stats: {
              ...activePlayer.stats,
              tilesTraveled: activePlayer.stats.tilesTraveled + movement.effectiveSteps
            }
          };
          const updatedPlayers2 = currentPlayers2.map((p) => p.id === activePlayer.id ? updatedPlayer2 : p);
          const landingTile = getTileById(newPosition);
          const escapeLog = {
            id: `log-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[THO\xC1T GIAM] ${activePlayer.name} l\u1EAFc \u0111\u01B0\u1EE3c \u0111\xF4i ${d1}-${d2}! T\u1EF1 do v\xE0 ti\u1EBFn ${sum} \xF4 \u0111\u1EBFn [${landingTile?.name || newPosition}]${salaryLog}.`,
            type: "INFO"
          };
          const stateAfterEscape = {
            ...state,
            players: updatedPlayers2,
            dice,
            isDouble: false,
            // Invariant: Escaping via doubles does NOT grant an extra roll
            turnPhase: "ACTION_MENU",
            ledger: currentLedger2,
            ledgerHistory: currentLedger2,
            lastSoundEffect: "diceRoll",
            logs: [escapeLog, ...state.logs]
          };
          return resolveLandingTile(stateAfterEscape, newPosition, sum);
        } else {
          if (activePlayer.detentionTurns > 0) {
            const remainingTurns = activePlayer.detentionTurns - 1;
            const updatedPlayer2 = {
              ...activePlayer,
              detentionTurns: remainingTurns
            };
            const updatedPlayers2 = state.players.map((p) => p.id === activePlayer.id ? updatedPlayer2 : p);
            return {
              ...state,
              players: updatedPlayers2,
              dice,
              isDouble: false,
              turnPhase: "ACTION_MENU",
              logs: [
                {
                  id: `log-${Date.now()}`,
                  timestamp: Date.now(),
                  playerId: activePlayer.id,
                  playerName: activePlayer.name,
                  message: `${activePlayer.name} l\u1EAFc \u0111\u01B0\u1EE3c ${d1}-${d2} (kh\xF4ng ph\u1EA3i \u0111\xF4i), ti\u1EBFp t\u1EE5c \u1EDF l\u1EA1i Khu C\xE1ch Ly.`,
                  type: "INFO"
                },
                ...state.logs
              ]
            };
          } else {
            emitSound("buyProperty");
            let currentPlayers2 = state.players;
            let currentLedger2 = state.ledger || [];
            const movement = calculateEffectiveMovement(activePlayer.position, sum, state.chaosModifiers, BOARD_SIZE);
            const newPosition = movement.newPosition;
            const passedStart = movement.passedStart;
            let earnedSalary = 0;
            let salaryLog = "";
            if (newPosition === 0) {
              earnedSalary = calculateSalary(state.config.salaryOnStart * 2, state.chaosModifiers, state.roundNumber, state);
              const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
              salaryLog = ` v\xE0 \u0111\xE1p tr\xFAng C\u1ED5ng Kh\u1EDFi H\xE0nh nh\u1EADn th\u01B0\u1EDFng ${formatMoney(earnedSalary)}${isGoldenHour ? " (x2 Gi\u1EDD V\xE0ng)!" : "!"}`;
            } else if (passedStart) {
              earnedSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
              const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
              salaryLog = ` v\xE0 nh\u1EADn ${formatMoney(earnedSalary)} tr\u1EE3 c\u1EA5p C\u1ED5ng Kh\u1EDFi H\xE0nh${isGoldenHour ? " (x2 Gi\u1EDD V\xE0ng)!" : "!"}`;
            }
            if (earnedSalary > 0) {
              const salaryRes = executeLedgerTransaction(currentPlayers2, {
                category: "SALARY_START",
                from: "BANK",
                to: activePlayer.id,
                amount: earnedSalary,
                roundNumber: state.roundNumber,
                memo: `L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh (GO)`
              }, currentLedger2);
              if (salaryRes.success && salaryRes.entry) {
                currentPlayers2 = salaryRes.newPlayers;
                currentLedger2 = [...currentLedger2, salaryRes.entry];
              }
            }
            const updatedPlayer2 = {
              ...currentPlayers2.find((p) => p.id === activePlayer.id) || activePlayer,
              position: newPosition,
              inDetention: false,
              detentionTurns: 0,
              consecutiveDoubles: 0,
              stats: {
                ...activePlayer.stats,
                tilesTraveled: activePlayer.stats.tilesTraveled + movement.effectiveSteps
              }
            };
            const updatedPlayers2 = currentPlayers2.map((p) => p.id === activePlayer.id ? updatedPlayer2 : p);
            const landingTile = getTileById(newPosition);
            const forcedReleaseLog = {
              id: `log-forced-release-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `[H\u1EBET H\u1EA0N T\u1EA0M GIAM] \u0110\xE3 th\u1EE5 \xE1n xong. ${activePlayer.name} \u0111\u01B0\u1EE3c ph\xF3ng th\xEDch mi\u1EC5n ph\xED v\xE0 di chuy\u1EC3n ${sum} \xF4 \u0111\u1EBFn [${landingTile?.name || newPosition}]${salaryLog}.`,
              type: "INFO"
            };
            const stateAfterForcedBail = {
              ...state,
              players: updatedPlayers2,
              dice,
              isDouble: false,
              turnPhase: "ACTION_MENU",
              ledger: currentLedger2,
              ledgerHistory: currentLedger2,
              lastSoundEffect: "buyProperty",
              logs: [forcedReleaseLog, ...state.logs]
            };
            return resolveLandingTile(stateAfterForcedBail, newPosition, sum);
          }
        }
      }
      const consecutiveDoubles = isDouble ? activePlayer.consecutiveDoubles + 1 : 0;
      if (consecutiveDoubles >= 3) {
        emitSound("payRent");
        const updatedPlayer2 = {
          ...activePlayer,
          position: 10,
          inDetention: true,
          detentionTurns: 2,
          consecutiveDoubles: 0
        };
        const updatedPlayers2 = state.players.map((p) => p.id === activePlayer.id ? updatedPlayer2 : p);
        return {
          ...state,
          players: updatedPlayers2,
          dice,
          isDouble: false,
          turnPhase: "ACTION_MENU",
          lastSoundEffect: "payRent",
          logs: [
            {
              id: `log-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `[C\u1EA2NH B\xC1O] ${activePlayer.name} l\u1EAFc 3 l\u1EA7n \u0111\xF4i li\xEAn ti\u1EBFp! B\u1ECB \xE1p gi\u1EA3i t\u1EDBi Khu C\xE1ch Ly An Ninh.`,
              type: "WARNING"
            },
            ...state.logs
          ]
        };
      }
      const graph = state.spatialGraph;
      if (!graph || graph.mapId === "legacy-ring-40" || !hasBranchIntersections(graph)) {
        const movement = calculateEffectiveMovement(activePlayer.position, sum, state.chaosModifiers, BOARD_SIZE);
        const newPosition = movement.newPosition;
        const passedStart = movement.passedStart;
        let currentPlayers2 = state.players;
        let currentLedger2 = state.ledger || [];
        let earnedSalary = 0;
        let salaryLog = "";
        if (passedStart || newPosition === 0) {
          earnedSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
          salaryLog = ` \u0110i qua C\u1ED5ng Kh\u1EDFi H\xE0nh nh\u1EADn ${formatMoney(earnedSalary)} tr\u1EE3 c\u1EA5p${isGoldenHour ? " (x2 Gi\u1EDD V\xE0ng)!" : "!"}`;
        }
        if (earnedSalary > 0) {
          const salaryRes = executeLedgerTransaction(currentPlayers2, {
            category: "SALARY_START",
            from: "BANK",
            to: activePlayer.id,
            amount: earnedSalary,
            roundNumber: state.roundNumber,
            memo: `L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh (GO)`
          }, currentLedger2);
          if (salaryRes.success && salaryRes.entry) {
            currentPlayers2 = salaryRes.newPlayers;
            currentLedger2 = [...currentLedger2, salaryRes.entry];
          }
        }
        const updatedPlayer2 = {
          ...currentPlayers2.find((p) => p.id === activePlayer.id) || activePlayer,
          position: newPosition,
          positionNodeId: `node-${newPosition}`,
          consecutiveDoubles,
          stats: {
            ...activePlayer.stats,
            tilesTraveled: activePlayer.stats.tilesTraveled + movement.effectiveSteps
          }
        };
        const updatedPlayers2 = currentPlayers2.map((p) => p.id === activePlayer.id ? updatedPlayer2 : p);
        const landingTile = getTileById(newPosition);
        const newLogs = [...state.logs];
        let diceLog = `${activePlayer.name} l\u1EAFc \u0111\u01B0\u1EE3c ${d1} + ${d2} = ${sum} \u0111i\u1EC3m`;
        if (movement.isCapped) {
          diceLog += ` (Gi\u1EDBi Nghi\xEAm! T\u1ED1i \u0111a 4 b\u01B0\u1EDBc)`;
        }
        if (movement.isReverse) {
          diceLog += ` (\u0110i ng\u01B0\u1EE3c chi\u1EC1u!)`;
        }
        diceLog += `, di chuy\u1EC3n \u0111\u1EBFn [${landingTile?.name || newPosition}].`;
        if (isDouble) {
          diceLog += ` (\u0110\u01B0\u1EE3c \u0110\xD4I! S\u1EBD \u0111\u01B0\u1EE3c l\u1EAFc th\xEAm l\u01B0\u1EE3t)`;
        }
        if (salaryLog) {
          diceLog += salaryLog;
        }
        newLogs.unshift({
          id: `dice-${Date.now()}`,
          timestamp: Date.now(),
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          message: diceLog,
          type: "DICE"
        });
        const nextState2 = {
          ...state,
          players: updatedPlayers2,
          dice,
          isDouble,
          turnPhase: "ACTION_MENU",
          ledger: currentLedger2,
          ledgerHistory: currentLedger2,
          logs: newLogs
        };
        return resolveLandingTile(nextState2, newPosition, sum);
      }
      let currentNodeId = activePlayer.positionNodeId || (activePlayer.position !== void 0 ? `node-${activePlayer.position}` : graph.startNodeId);
      if (!graph.nodes[currentNodeId]) {
        currentNodeId = graph.startNodeId;
      }
      let remainingSteps = state.chaosModifiers?.curfewTurns && state.chaosModifiers.curfewTurns > 0 ? Math.min(sum, 4) : sum;
      let currentPlayers = state.players;
      let currentLedger = state.ledger || [];
      let previousNodeId = void 0;
      while (remainingSteps > 0) {
        const currentCash = currentPlayers.find((p) => p.id === activePlayer.id)?.cash ?? activePlayer.cash;
        const validCandidates = getValidNextNodes(graph, currentNodeId, currentCash, previousNodeId);
        const unlockedCandidates = validCandidates.filter(
          (node) => !node.isLocked && (!state.fogOfWarState || state.fogOfWarState.unlockedNodes[node.id] !== false)
        );
        if (unlockedCandidates.length === 0) {
          break;
        }
        if (unlockedCandidates.length > 1) {
          const updatedPlayer2 = {
            ...currentPlayers.find((p) => p.id === activePlayer.id) || activePlayer,
            positionNodeId: currentNodeId,
            position: graph.nodes[currentNodeId]?.numericId ?? activePlayer.position,
            consecutiveDoubles
          };
          return {
            ...state,
            players: currentPlayers.map((p) => p.id === activePlayer.id ? updatedPlayer2 : p),
            dice,
            isDouble,
            turnPhase: "BRANCH_DECISION",
            movementState: {
              remainingSteps,
              diceSum: sum,
              currentNodeId,
              availableNextNodes: unlockedCandidates.map((n) => n.id)
            },
            ledger: currentLedger,
            ledgerHistory: currentLedger,
            logs: [
              {
                id: `branch-${Date.now()}`,
                timestamp: Date.now(),
                playerId: activePlayer.id,
                playerName: activePlayer.name,
                message: `${activePlayer.name} t\u1EDBi ng\xE3 r\u1EBD [${graph.nodes[currentNodeId]?.name || currentNodeId}]. C\xF2n ${remainingSteps} b\u01B0\u1EDBc. H\xE3y ch\u1ECDn h\u01B0\u1EDBng ti\u1EBFp theo!`,
                type: "INFO"
              },
              ...state.logs
            ]
          };
        }
        const targetNode = unlockedCandidates[0];
        const stepResult = stepTraverse(graph, currentNodeId, targetNode.id, currentCash);
        if (stepResult.tollPaid > 0) {
          const tollRes = executeLedgerTransaction(currentPlayers, {
            category: "TAX_PAYMENT",
            from: activePlayer.id,
            to: "BANK",
            amount: stepResult.tollPaid,
            roundNumber: state.roundNumber,
            memo: `Ph\xED thang m\xE1y ($${stepResult.tollPaid})`
          }, currentLedger);
          if (tollRes.success && tollRes.entry) {
            currentPlayers = tollRes.newPlayers;
            currentLedger = [...currentLedger, tollRes.entry];
          }
        }
        previousNodeId = currentNodeId;
        currentNodeId = targetNode.id;
        remainingSteps -= 1;
        const trapCheck = triggerTrapAtNode(
          { ...state, players: currentPlayers, ledger: currentLedger },
          activePlayer.id,
          currentNodeId
        );
        if (trapCheck.trapTriggered) {
          currentPlayers = trapCheck.nextState.players;
          currentLedger = trapCheck.nextState.ledger || currentLedger;
          state = {
            ...state,
            placedTraps: trapCheck.nextState.placedTraps,
            logs: trapCheck.nextState.logs
          };
          state = processGameEvent(state, {
            type: "TRAP_TRIGGERED",
            playerId: activePlayer.id,
            nodeId: currentNodeId
          });
          if (trapCheck.haltedMovement) {
            remainingSteps = 0;
            break;
          }
        }
        if (currentNodeId === graph.startNodeId) {
          const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          const salRes = executeLedgerTransaction(currentPlayers, {
            category: "SALARY_START",
            from: "BANK",
            to: activePlayer.id,
            amount: salary,
            roundNumber: state.roundNumber,
            memo: `L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh (GO)`
          }, currentLedger);
          if (salRes.success && salRes.entry) {
            currentPlayers = salRes.newPlayers;
            currentLedger = [...currentLedger, salRes.entry];
          }
        }
      }
      const finalNode = graph.nodes[currentNodeId];
      const finalNumericId = finalNode?.numericId ?? activePlayer.position;
      const updatedPlayer = {
        ...currentPlayers.find((p) => p.id === activePlayer.id) || activePlayer,
        positionNodeId: currentNodeId,
        position: finalNumericId,
        consecutiveDoubles,
        stats: {
          ...activePlayer.stats,
          tilesTraveled: activePlayer.stats.tilesTraveled + sum
        }
      };
      const updatedPlayers = currentPlayers.map((p) => p.id === activePlayer.id ? updatedPlayer : p);
      const landingName = finalNode?.name || currentNodeId;
      let nextState = {
        ...state,
        players: updatedPlayers,
        dice,
        isDouble,
        turnPhase: "ACTION_MENU",
        movementState: null,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs: [
          {
            id: `dice-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `${activePlayer.name} l\u1EAFc \u0111\u01B0\u1EE3c ${d1} + ${d2} = ${sum} \u0111i\u1EC3m, di chuy\u1EC3n \u0111\u1EBFn [${landingName}].`,
            type: "DICE"
          },
          ...state.logs
        ]
      };
      nextState = processGameEvent(nextState, { type: "DICE_ROLLED", playerId: activePlayer.id });
      if (isDouble) {
        nextState = processGameEvent(nextState, { type: "DICE_DOUBLES", playerId: activePlayer.id });
      }
      return resolveLandingTile(nextState, finalNumericId, sum);
    }
    case "CHOOSE_BRANCH_PATH": {
      if (state.turnPhase !== "BRANCH_DECISION" || !state.movementState) {
        return state;
      }
      const { targetNodeId } = action;
      const { remainingSteps, diceSum, currentNodeId, availableNextNodes } = state.movementState;
      if (!availableNextNodes.includes(targetNodeId)) {
        return state;
      }
      const graph = state.spatialGraph;
      if (!graph) return state;
      const activePlayer = state.players[state.activePlayerIndex];
      let currentPlayers = state.players;
      let currentLedger = state.ledger || [];
      const currentCashInitial = currentPlayers.find((p) => p.id === activePlayer.id)?.cash ?? activePlayer.cash;
      const stepResult = stepTraverse(graph, currentNodeId, targetNodeId, currentCashInitial);
      if (stepResult.tollPaid > 0) {
        const tollRes = executeLedgerTransaction(currentPlayers, {
          category: "TAX_PAYMENT",
          from: activePlayer.id,
          to: "BANK",
          amount: stepResult.tollPaid,
          roundNumber: state.roundNumber,
          memo: `Ph\xED thang m\xE1y ($${stepResult.tollPaid})`
        }, currentLedger);
        if (tollRes.success && tollRes.entry) {
          currentPlayers = tollRes.newPlayers;
          currentLedger = [...currentLedger, tollRes.entry];
        }
      }
      let currNodeId = targetNodeId;
      let stepsLeft = remainingSteps - 1;
      let prevNodeId = currentNodeId;
      const branchTrapCheck = triggerTrapAtNode(
        { ...state, players: currentPlayers, ledger: currentLedger },
        activePlayer.id,
        currNodeId
      );
      if (branchTrapCheck.trapTriggered) {
        currentPlayers = branchTrapCheck.nextState.players;
        currentLedger = branchTrapCheck.nextState.ledger || currentLedger;
        state = {
          ...state,
          placedTraps: branchTrapCheck.nextState.placedTraps,
          logs: branchTrapCheck.nextState.logs
        };
        state = processGameEvent(state, {
          type: "TRAP_TRIGGERED",
          playerId: activePlayer.id,
          nodeId: currNodeId
        });
        if (branchTrapCheck.haltedMovement) {
          stepsLeft = 0;
        }
      }
      if (currNodeId === graph.startNodeId) {
        const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
        const salRes = executeLedgerTransaction(currentPlayers, {
          category: "SALARY_START",
          from: "BANK",
          to: activePlayer.id,
          amount: salary,
          roundNumber: state.roundNumber,
          memo: `L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh (GO)`
        }, currentLedger);
        if (salRes.success && salRes.entry) {
          currentPlayers = salRes.newPlayers;
          currentLedger = [...currentLedger, salRes.entry];
        }
      }
      while (stepsLeft > 0) {
        const currentCash = currentPlayers.find((p) => p.id === activePlayer.id)?.cash ?? activePlayer.cash;
        const validCandidates = getValidNextNodes(graph, currNodeId, currentCash, prevNodeId);
        const unlockedCandidates = validCandidates.filter(
          (n) => !n.isLocked && (!state.fogOfWarState || state.fogOfWarState.unlockedNodes[n.id] !== false)
        );
        if (unlockedCandidates.length === 0) {
          break;
        }
        if (unlockedCandidates.length > 1) {
          const intermediatePlayer = {
            ...currentPlayers.find((p) => p.id === activePlayer.id) || activePlayer,
            positionNodeId: currNodeId,
            position: graph.nodes[currNodeId]?.numericId ?? activePlayer.position
          };
          return {
            ...state,
            players: currentPlayers.map((p) => p.id === activePlayer.id ? intermediatePlayer : p),
            turnPhase: "BRANCH_DECISION",
            movementState: {
              remainingSteps: stepsLeft,
              diceSum,
              currentNodeId: currNodeId,
              availableNextNodes: unlockedCandidates.map((n) => n.id)
            },
            ledger: currentLedger,
            ledgerHistory: currentLedger,
            logs: [
              {
                id: `branch-${Date.now()}`,
                timestamp: Date.now(),
                playerId: activePlayer.id,
                playerName: activePlayer.name,
                message: `${activePlayer.name} ti\u1EBFp t\u1EE5c t\u1EDBi ng\xE3 r\u1EBD [${graph.nodes[currNodeId]?.name || currNodeId}]. C\xF2n ${stepsLeft} b\u01B0\u1EDBc. H\xE3y ch\u1ECDn h\u01B0\u1EDBng!`,
                type: "INFO"
              },
              ...state.logs
            ]
          };
        }
        const nextNode = unlockedCandidates[0];
        const res = stepTraverse(graph, currNodeId, nextNode.id, currentCash);
        if (res.tollPaid > 0) {
          const tollRes = executeLedgerTransaction(currentPlayers, {
            category: "TAX_PAYMENT",
            from: activePlayer.id,
            to: "BANK",
            amount: res.tollPaid,
            roundNumber: state.roundNumber,
            memo: `Ph\xED thang m\xE1y ($${res.tollPaid})`
          }, currentLedger);
          if (tollRes.success && tollRes.entry) {
            currentPlayers = tollRes.newPlayers;
            currentLedger = [...currentLedger, tollRes.entry];
          }
        }
        prevNodeId = currNodeId;
        currNodeId = nextNode.id;
        stepsLeft -= 1;
        const loopTrapCheck = triggerTrapAtNode(
          { ...state, players: currentPlayers, ledger: currentLedger },
          activePlayer.id,
          currNodeId
        );
        if (loopTrapCheck.trapTriggered) {
          currentPlayers = loopTrapCheck.nextState.players;
          currentLedger = loopTrapCheck.nextState.ledger || currentLedger;
          state = {
            ...state,
            placedTraps: loopTrapCheck.nextState.placedTraps,
            logs: loopTrapCheck.nextState.logs
          };
          state = processGameEvent(state, {
            type: "TRAP_TRIGGERED",
            playerId: activePlayer.id,
            nodeId: currNodeId
          });
          if (loopTrapCheck.haltedMovement) {
            stepsLeft = 0;
            break;
          }
        }
        if (currNodeId === graph.startNodeId) {
          const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          const salRes = executeLedgerTransaction(currentPlayers, {
            category: "SALARY_START",
            from: "BANK",
            to: activePlayer.id,
            amount: salary,
            roundNumber: state.roundNumber,
            memo: `L\u01B0\u01A1ng C\u1ED5ng Kh\u1EDFi H\xE0nh (GO)`
          }, currentLedger);
          if (salRes.success && salRes.entry) {
            currentPlayers = salRes.newPlayers;
            currentLedger = [...currentLedger, salRes.entry];
          }
        }
      }
      const finalNode = graph.nodes[currNodeId];
      const finalNumericId = finalNode?.numericId ?? activePlayer.position;
      const updatedPlayer = {
        ...currentPlayers.find((p) => p.id === activePlayer.id) || activePlayer,
        positionNodeId: currNodeId,
        position: finalNumericId,
        stats: {
          ...activePlayer.stats,
          tilesTraveled: activePlayer.stats.tilesTraveled + diceSum
        }
      };
      const updatedPlayers = currentPlayers.map((p) => p.id === activePlayer.id ? updatedPlayer : p);
      const landingName = finalNode?.name || currNodeId;
      const nextState = {
        ...state,
        players: updatedPlayers,
        turnPhase: "ACTION_MENU",
        movementState: null,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs: [
          {
            id: `branch-land-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `${activePlayer.name} \u0111\xE3 ho\xE0n t\u1EA5t di chuy\u1EC3n v\xE0 d\u1EEBng l\u1EA1i t\u1EA1i [${landingName}].`,
            type: "INFO"
          },
          ...state.logs
        ]
      };
      return resolveLandingTile(nextState, finalNumericId, diceSum);
    }
    case "UNLOCK_ZONE": {
      const { zoneId, reason } = action;
      if (!state.spatialGraph || !state.fogOfWarState) {
        return state;
      }
      const { updatedGraph, updatedFogState, unlockEvent } = unlockZone(
        state.spatialGraph,
        zoneId,
        state.fogOfWarState,
        state.roundNumber,
        reason
      );
      return {
        ...state,
        spatialGraph: updatedGraph,
        fogOfWarState: updatedFogState,
        logs: [
          {
            id: `unlock-${Date.now()}`,
            timestamp: Date.now(),
            playerId: state.players[state.activePlayerIndex]?.id || "SYSTEM",
            playerName: state.players[state.activePlayerIndex]?.name || "H\u1EC7 Th\u1ED1ng",
            message: `[M\u1EDE KH\xD3A KHU V\u1EF0C] ${unlockEvent.zoneName} \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a! (${unlockEvent.triggeredBy})`,
            type: "INFO"
          },
          ...state.logs
        ]
      };
    }
    case "BUY_PROPERTY": {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const validation = canBuyProperty(tileId, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state);
      if (!validation.canBuy) {
        return state;
      }
      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;
      const price = getBuyPrice(tileId, state.roundNumber, state);
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "PROPERTY_PURCHASE",
        from: activePlayer.id,
        to: "BANK",
        amount: price,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Mua b\u1EA5t \u0111\u1ED9ng s\u1EA3n [${tile.name}]`
      }, state.ledger || []);
      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers.map(
        (p) => p.id === activePlayer.id ? { ...p, stats: { ...p.stats, propertiesOwned: p.stats.propertiesOwned + 1 } } : p
      );
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ownerId: activePlayer.id,
          level: 0,
          isMortgaged: false
        }
      };
      emitSound("buyProperty");
      let nextState = {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `buy-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[MUA \u0110\u1EA4T] ${activePlayer.name} \u0111\xE3 mua b\u1EA5t \u0111\u1ED9ng s\u1EA3n [${tile.name}] v\u1EDBi gi\xE1 ${formatMoney(price)}.`,
            type: "PURCHASE"
          },
          ...state.logs
        ]
      };
      nextState = processGameEvent(nextState, {
        type: "PROPERTY_PURCHASED",
        playerId: activePlayer.id,
        nodeId: `node-${tileId}`
      });
      return nextState;
    }
    case "UPGRADE_PROPERTY": {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const validation = canUpgradeProperty(tileId, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state);
      if (!validation.canUpgrade) {
        return state;
      }
      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;
      const cost = getUpgradeCost(tileId, state.roundNumber, state);
      const currentLevel = state.properties[tileId]?.level || 0;
      const nextLevel = currentLevel + 1;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "PROPERTY_UPGRADE",
        from: activePlayer.id,
        to: "BANK",
        amount: cost,
        roundNumber: state.roundNumber,
        tileId,
        memo: `N\xE2ng c\u1EA5p [${tile.name}] l\xEAn C\u1EA5p ${nextLevel}`
      }, state.ledger || []);
      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          level: nextLevel,
          lastUpgradeRound: state.roundNumber
        }
      };
      emitSound("upgradeProperty");
      const levelNames = ["Nh\xE0 Ph\u1ED1 1\u2605", "Bi\u1EC7t Th\u1EF1 2\u2605", "TT Th\u01B0\u01A1ng M\u1EA1i 3\u2605", "Cao \u1ED0c Ph\u1EE9c H\u1EE3p 4\u2605", "\u0110\u1EA1i C\xF4ng Tr\xECnh Landmark 5\u2605"];
      const levelTitle = levelNames[nextLevel - 1] || `C\u1EA5p ${nextLevel}\u2605`;
      let nextState = {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: "upgradeProperty",
        logs: [
          {
            id: `upgrade-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[X\xC2Y D\u1EF0NG] ${activePlayer.name} n\xE2ng c\u1EA5p [${tile.name}] l\xEAn ${levelTitle} (C\u1EA5p ${nextLevel}) chi ph\xED ${formatMoney(cost)}!`,
            type: "PURCHASE"
          },
          ...state.logs
        ]
      };
      if (nextState.spatialGraph && nextState.fogOfWarState) {
        const triggerRes = checkUnlockTriggers(nextState, nextState.spatialGraph, {
          triggerType: "UPGRADE",
          upgradedTileId: tileId,
          newLevel: nextLevel
        });
        if (triggerRes.shouldUnlock) {
          for (const zid of triggerRes.zoneIdsToUnlock) {
            const unlockRes = unlockZone(
              nextState.spatialGraph,
              zid,
              nextState.fogOfWarState,
              nextState.roundNumber,
              triggerRes.reasons[zid]
            );
            nextState = {
              ...nextState,
              spatialGraph: unlockRes.updatedGraph,
              fogOfWarState: unlockRes.updatedFogState,
              logs: [
                {
                  id: `unlock-${Date.now()}-${zid}`,
                  timestamp: Date.now(),
                  playerId: activePlayer.id,
                  playerName: activePlayer.name,
                  message: `[M\u1EDE KH\xD3A KHU V\u1EF0C] ${unlockRes.unlockEvent.zoneName} \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a! (${unlockRes.unlockEvent.triggeredBy})`,
                  type: "INFO"
                },
                ...nextState.logs
              ]
            };
          }
        }
      }
      nextState = processGameEvent(nextState, {
        type: "PROPERTY_UPGRADED",
        playerId: activePlayer.id,
        nodeId: `node-${tileId}`
      });
      return nextState;
    }
    case "DOWNGRADE_PROPERTY": {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.senderPlayerId || activePlayer?.id;
      const actor = state.players.find((p) => p.id === actorId);
      if (!actor || actor.isBankrupt) return state;
      if (!tradeAnytime(state) && activePlayer && actor.id !== activePlayer.id) {
        return state;
      }
      const validation = canDowngradeProperty(tileId, actor.id, state.properties, state.roundNumber, state);
      if (!validation.canDowngrade) {
        return state;
      }
      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;
      const refund = validation.refundAmount;
      const currentLevel = state.properties[tileId]?.level || 0;
      const nextLevel = currentLevel - 1;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "PROPERTY_DOWNGRADE",
        from: "BANK",
        to: actor.id,
        amount: refund,
        roundNumber: state.roundNumber,
        tileId,
        memo: `D\u1EE1 b\u1ECF 1 c\u1EA5p c\xF4ng tr\xECnh t\u1EA1i [${tile.name}] nh\u1EADn ho\xE0n ti\u1EC1n ${Math.round(sellRate(state) * 100)}%`
      }, state.ledger || []);
      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          level: nextLevel
        }
      };
      emitSound("buyProperty");
      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `downgrade-${Date.now()}`,
            timestamp: Date.now(),
            playerId: actor.id,
            playerName: actor.name,
            message: `[D\u1EE0 B\u1ECE] ${actor.name} b\xE1n b\u1EDBt 1 c\u1EA5p c\xF4ng tr\xECnh t\u1EA1i [${tile.name}] nh\u1EADn v\u1EC1 ${formatMoney(refund)} (${Math.round(sellRate(state) * 100)}%).`,
            type: "PURCHASE"
          },
          ...state.logs
        ]
      };
    }
    case "SELL_PROPERTY": {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.senderPlayerId || activePlayer?.id;
      const actor = state.players.find((p) => p.id === actorId);
      if (!actor || actor.isBankrupt) return state;
      if (!tradeAnytime(state) && activePlayer && actor.id !== activePlayer.id) {
        return state;
      }
      const validation = canSellProperty(tileId, actor.id, state.properties, state.chaosModifiers, state.roundNumber, state);
      if (!validation.canSell) {
        return state;
      }
      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;
      const salePrice = validation.sellValue;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "PROPERTY_SALE",
        from: "BANK",
        to: actor.id,
        amount: salePrice,
        roundNumber: state.roundNumber,
        tileId,
        memo: `B\xE1n l\u1EA1i \xF4 \u0111\u1EA5t [${tile.name}] cho Ng\xE2n h\xE0ng`
      }, state.ledger || []);
      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers.map(
        (p) => p.id === actor.id ? { ...p, stats: { ...p.stats, propertiesOwned: Math.max(0, p.stats.propertiesOwned - 1) } } : p
      );
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ownerId: null,
          level: 0,
          isMortgaged: false
        }
      };
      emitSound("buyProperty");
      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `sell-${Date.now()}`,
            timestamp: Date.now(),
            playerId: actor.id,
            playerName: actor.name,
            message: `[B\xC1N \u0110\u1EA4T] ${actor.name} b\xE1n l\u1EA1i [${tile.name}] cho Ng\xE2n h\xE0ng nh\u1EADn ${formatMoney(salePrice)} (${Math.round(sellRate(state) * 100)}%).`,
            type: "PURCHASE"
          },
          ...state.logs
        ]
      };
    }
    case "MORTGAGE_PROPERTY": {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.senderPlayerId || activePlayer?.id;
      const actor = state.players.find((p) => p.id === actorId);
      if (!actor || actor.isBankrupt) return state;
      if (!tradeAnytime(state) && activePlayer && actor.id !== activePlayer.id) {
        return state;
      }
      const validation = canMortgageProperty(tileId, actor.id, state.properties, state.chaosModifiers, state, state.roundNumber);
      if (!validation.canMortgage) {
        return state;
      }
      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;
      const mortgageVal = validation.mortgageValue;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "PROPERTY_MORTGAGE",
        from: "BANK",
        to: actor.id,
        amount: mortgageVal,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Th\u1EBF ch\u1EA5p [${tile.name}] vay ng\xE2n h\xE0ng`
      }, state.ledger || []);
      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          isMortgaged: true
        }
      };
      emitSound("buyProperty");
      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `mortgage-${Date.now()}`,
            timestamp: Date.now(),
            playerId: actor.id,
            playerName: actor.name,
            message: `[C\u1EA6M C\u1ED0] ${actor.name} th\u1EBF ch\u1EA5p [${tile.name}] cho ng\xE2n h\xE0ng nh\u1EADn ngay ${formatMoney(mortgageVal)}.`,
            type: "PURCHASE"
          },
          ...state.logs
        ]
      };
    }
    case "UNMORTGAGE_PROPERTY": {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const validation = canUnmortgageProperty(tileId, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state, state.roundNumber);
      if (!validation.canUnmortgage) {
        return state;
      }
      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;
      const cost = validation.unmortgageCost;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "PROPERTY_UNMORTGAGE",
        from: activePlayer.id,
        to: "BANK",
        amount: cost,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Gi\u1EA3i ch\u1EA5p [${tile.name}]`
      }, state.ledger || []);
      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          isMortgaged: false
        }
      };
      emitSound("buyProperty");
      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `unmortgage-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[CHU\u1ED8C L\u1EA0I] ${activePlayer.name} gi\u1EA3i ch\u1EA5p [${tile.name}] v\u1EDBi chi ph\xED ${formatMoney(cost)}.`,
            type: "PURCHASE"
          },
          ...state.logs
        ]
      };
    }
    case "RESOLVE_DEBT":
    case "SETTLE_PARTIAL_DEBT": {
      if (state.turnPhase !== "DEBT_LIQUIDATION" && state.turnPhase !== "BANKRUPTCY_CHECK" || !state.pendingDebt) {
        return state;
      }
      const activePlayer = state.players[state.activePlayerIndex];
      const debt = state.pendingDebt;
      const requestedPayment = "amount" in action && typeof action.amount === "number" && action.amount > 0 ? Math.min(action.amount, debt.amount) : debt.amount;
      if (action.type === "RESOLVE_DEBT" && !("amount" in action) && activePlayer.cash < debt.amount) {
        return state;
      }
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "DEBT_SETTLEMENT",
        from: activePlayer.id,
        to: debt.creditorPlayerId || "BANK",
        amount: requestedPayment,
        roundNumber: state.roundNumber,
        memo: `Thanh to\xE1n n\u1EE3: ${debt.reason}`,
        allowPartial: true,
        debtCategory: debt.category
      }, state.ledger || []);
      if (!ledgerRes.success || ledgerRes.actualPaid <= 0) {
        return state;
      }
      const remainingDebt = debt.amount - ledgerRes.actualPaid;
      const isFullySettled = remainingDebt <= 0;
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      return {
        ...state,
        players: ledgerRes.newPlayers,
        turnPhase: isFullySettled ? "ACTION_MENU" : state.turnPhase,
        pendingDebt: isFullySettled ? null : { ...debt, amount: remainingDebt },
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        logs: [
          {
            id: `debt-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: isFullySettled ? `[HO\xC0N T\u1EA4T TR\u1EA2 N\u1EE2] ${activePlayer.name} \u0111\xE3 thanh to\xE1n \u0111\u1EE7 kho\u1EA3n n\u1EE3 ${formatMoney(debt.amount)} (${debt.reason}).` : `[TR\u1EA2 N\u1EE2 M\u1ED8T PH\u1EA6N] ${activePlayer.name} \u0111\xE3 n\u1ED9p ${formatMoney(ledgerRes.actualPaid)}, c\xF2n n\u1EE3 l\u1EA1i ${formatMoney(remainingDebt)}.`,
            type: "INFO"
          },
          ...state.logs
        ]
      };
    }
    case "PAY_DETENTION_BAIL": {
      const activePlayer = state.players[state.activePlayerIndex];
      const bailCost = state.config.detentionBailCost;
      if (!activePlayer.inDetention || activePlayer.cash < bailCost) {
        return state;
      }
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: "BAIL_PAYMENT",
        from: activePlayer.id,
        to: "BANK",
        amount: bailCost,
        roundNumber: state.roundNumber,
        memo: `N\u1ED9p ti\u1EC1n b\u1EA3o l\xE3nh r\u1EDDi Khu C\xE1ch Ly`
      }, state.ledger || []);
      if (!ledgerRes.success) return state;
      emitSound("buyProperty");
      const updatedPlayers = ledgerRes.newPlayers.map(
        (p) => p.id === activePlayer.id ? { ...p, inDetention: false, detentionTurns: 0 } : p
      );
      const updatedLedger = ledgerRes.entry ? [...state.ledger || [], ledgerRes.entry] : state.ledger || [];
      let nextState = {
        ...state,
        players: updatedPlayers,
        turnPhase: "WAITING_FOR_ROLL",
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `bail-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[B\u1EA2O L\xC3NH] ${activePlayer.name} n\u1ED9p ${formatMoney(bailCost)} b\u1EA3o l\xE3nh \u0111\u1EC3 r\u1EDDi Khu C\xE1ch Ly l\u1EADp t\u1EE9c.`,
            type: "INFO"
          },
          ...state.logs
        ]
      };
      nextState = processGameEvent(nextState, { type: "PAY_DETENTION_BAIL", playerId: activePlayer.id });
      return nextState;
    }
    case "USE_DETENTION_CARD": {
      const activePlayer = state.players[state.activePlayerIndex];
      if (!activePlayer.inDetention || (activePlayer.jailFreeCards || 0) <= 0) {
        return state;
      }
      emitSound("buyProperty");
      const updatedPlayer = {
        ...activePlayer,
        inDetention: false,
        detentionTurns: 0,
        jailFreeCards: (activePlayer.jailFreeCards || 0) - 1
      };
      const updatedPlayers = state.players.map((p) => p.id === activePlayer.id ? updatedPlayer : p);
      return {
        ...state,
        players: updatedPlayers,
        turnPhase: "WAITING_FOR_ROLL",
        lastSoundEffect: "buyProperty",
        logs: [
          {
            id: `jail-card-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[TH\u1EBA MI\u1EC4N GIAM] ${activePlayer.name} s\u1EED d\u1EE5ng Th\u1EBB Mi\u1EC5n Giam \u0111\u1EC3 r\u1EDDi Khu C\xE1ch Ly (c\xF2n l\u1EA1i ${updatedPlayer.jailFreeCards} th\u1EBB).`,
            type: "INFO"
          },
          ...state.logs
        ]
      };
    }
    case "RESOLVE_CHAOS": {
      return {
        ...state,
        activeChaosCard: null
      };
    }
    case "APPLY_CHAOS_EFFECT": {
      return applyChaosCard(state, action.payload);
    }
    case "START_AUCTION":
    case "DECLINE_PROPERTY_PURCHASE": {
      return initiateAuction(state, action.tileId);
    }
    case "PLACE_AUCTION_BID": {
      return placeAuctionBid(state, action.playerId, action.bidAmount);
    }
    case "PASS_AUCTION_BID": {
      return passAuctionBid(state, action.playerId);
    }
    case "PROPOSE_TRADE": {
      if (!tradeAnytime(state)) {
        const active = state.players[state.activePlayerIndex]?.id;
        if (active !== action.proposal.senderPlayerId) return state;
      }
      return proposeTrade(state, action.proposal);
    }
    case "ACCEPT_TRADE": {
      return acceptTrade(state, action.tradeId);
    }
    case "REJECT_TRADE": {
      return rejectTrade(state, action.tradeId);
    }
    case "CANCEL_TRADE": {
      return cancelTrade(state, action.tradeId);
    }
    case "COUNTER_TRADE": {
      return counterTrade(state, action.proposal);
    }
    case "RECORD_AI_DECISION": {
      return {
        ...state,
        lastAIDecision: action.decision
      };
    }
    case "LOAD_SAVED_MATCH": {
      if (!action.savedState || !Array.isArray(action.savedState.players) || action.savedState.players.length < 2) {
        return state;
      }
      return {
        ...INITIAL_GAME_STATE,
        ...action.savedState
      };
    }
    case "END_TURN": {
      if (state.turnPhase === "BANKRUPTCY_CHECK" || state.turnPhase === "DEBT_LIQUIDATION" || state.turnPhase === "AUCTION" || state.pendingDebt !== null || state.activeAuction !== null) {
        return state;
      }
      const activePlayer = state.players[state.activePlayerIndex];
      if (state.isDouble && !activePlayer.inDetention && activePlayer.consecutiveDoubles < 3) {
        return {
          ...state,
          turnPhase: "WAITING_FOR_ROLL",
          activeChaosCard: null,
          rentModifier: 1,
          logs: [
            {
              id: `extra-turn-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `${activePlayer.name} \u0111\u01B0\u1EE3c tung x\xFAc x\u1EAFc th\xEAm m\u1ED9t l\u01B0\u1EE3t v\xEC \u0111\xE3 l\u1EAFc \u0111\u01B0\u1EE3c \u0110\xF4i!`,
              type: "INFO"
            },
            ...state.logs
          ]
        };
      }
      let nextState = advanceTurn(state);
      if (nextState.spatialGraph && nextState.fogOfWarState) {
        const triggerRes = checkUnlockTriggers(nextState, nextState.spatialGraph, {
          triggerType: "ROUND_ADVANCE"
        });
        if (triggerRes.shouldUnlock) {
          for (const zid of triggerRes.zoneIdsToUnlock) {
            const unlockRes = unlockZone(
              nextState.spatialGraph,
              zid,
              nextState.fogOfWarState,
              nextState.roundNumber,
              triggerRes.reasons[zid]
            );
            nextState = {
              ...nextState,
              spatialGraph: unlockRes.updatedGraph,
              fogOfWarState: unlockRes.updatedFogState,
              logs: [
                {
                  id: `unlock-${Date.now()}-${zid}`,
                  timestamp: Date.now(),
                  playerId: "SYSTEM",
                  playerName: "H\u1EC7 Th\u1ED1ng",
                  message: `[M\u1EDE KH\xD3A KHU V\u1EF0C] ${unlockRes.unlockEvent.zoneName} \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a! (${unlockRes.unlockEvent.triggeredBy})`,
                  type: "INFO"
                },
                ...nextState.logs
              ]
            };
          }
        }
      }
      return nextState;
    }
    case "DECLARE_BANKRUPTCY": {
      const targetPlayer = state.players.find((p) => p.id === action.playerId);
      if (!targetPlayer) return state;
      emitSound("payRent");
      const creditorId = state.pendingDebt?.creditorPlayerId || null;
      const updatedProperties = liquidateBankruptPlayer(action.playerId, state.properties, creditorId);
      const remainingCash = Math.max(0, targetPlayer.cash);
      let currentPlayers = state.players;
      let currentLedger = state.ledger || [];
      if (remainingCash > 0 && creditorId) {
        const ledgerRes = executeLedgerTransaction(currentPlayers, {
          category: "DEBT_SETTLEMENT",
          from: targetPlayer.id,
          to: creditorId,
          amount: remainingCash,
          roundNumber: state.roundNumber,
          memo: `Chuy\u1EC3n to\xE0n b\u1ED9 ti\u1EC1n m\u1EB7t c\xF2n l\u1EA1i cho ch\u1EE7 n\u1EE3 khi ph\xE1 s\u1EA3n`,
          debtCategory: state.pendingDebt?.category
        }, currentLedger);
        if (ledgerRes.success && ledgerRes.entry) {
          currentPlayers = ledgerRes.newPlayers;
          currentLedger = [...currentLedger, ledgerRes.entry];
        }
      }
      const updatedPlayers = currentPlayers.map((p) => {
        if (p.id === action.playerId) {
          return { ...p, isBankrupt: true, cash: 0 };
        }
        return p;
      });
      const logs = [
        {
          id: `bankrupt-${Date.now()}`,
          timestamp: Date.now(),
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
          message: `[PH\xC1 S\u1EA2N] ${targetPlayer.name} \u0111\xE3 v\u1EE1 n\u1EE3 v\xE0 b\u1ECB lo\u1EA1i kh\u1ECFi cu\u1ED9c ch\u01A1i! To\xE0n b\u1ED9 b\u1EA5t \u0111\u1ED9ng s\u1EA3n b\u1ECB ng\xE2n h\xE0ng t\u1ECBch thu.`,
          type: "BANKRUPT"
        },
        ...state.logs
      ];
      const winCheck = evaluateWinCondition(updatedPlayers, updatedProperties, state.roundNumber, state.config.maxRounds, state);
      if (winCheck.isGameOver) {
        emitSound("victory");
        return {
          ...state,
          status: "ENDED",
          winner: winCheck.winner,
          turnPhase: "GAME_OVER",
          players: updatedPlayers,
          properties: updatedProperties,
          pendingDebt: null,
          ledger: currentLedger,
          ledgerHistory: currentLedger,
          lastSoundEffect: "victory",
          logs: [
            {
              id: `win-${Date.now()}`,
              timestamp: Date.now(),
              message: `\u{1F3C6} CHI\u1EBEN TH\u1EAENG! ${winCheck.winner?.name} l\xE0 ng\u01B0\u1EDDi s\u1ED1ng s\xF3t duy nh\u1EA5t v\xE0 tr\u1EDF th\xE0nh T\xE2n Th\u1ECB Tr\u01B0\u1EDFng Metropolis!`,
              type: "VICTORY"
            },
            ...logs
          ]
        };
      }
      let newState = {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        pendingDebt: null,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs
      };
      if (state.players[state.activePlayerIndex]?.id === action.playerId) {
        newState = advanceTurn(newState);
      }
      newState = processGameEvent(newState, { type: "PLAYER_BANKRUPTCY", playerId: action.playerId });
      return newState;
    }
    case "SELECT_TILE_DETAIL": {
      return {
        ...state,
        selectedTileForDetail: action.tileId
      };
    }
    case "RESTART_GAME": {
      return INITIAL_GAME_STATE;
    }
    case "PLACE_TRAP": {
      const activePlayer = state.players[state.activePlayerIndex];
      if (!activePlayer || activePlayer.isBankrupt || state.status !== "PLAYING") {
        return state;
      }
      const { nodeId, trapType } = action;
      if (!canPlaceTrap(state, activePlayer.id, nodeId)) {
        return state;
      }
      const newTrap = {
        id: `trap-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        nodeId,
        ownerPlayerId: activePlayer.id,
        trapType,
        placedRound: state.roundNumber,
        revealed: false
      };
      const nodeName = state.spatialGraph?.nodes[nodeId]?.name || nodeId;
      return {
        ...state,
        placedTraps: [...state.placedTraps || [], newTrap],
        logs: [
          {
            id: `trap-place-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `\u{1F92B} [\u0110\u1EB6T B\u1EAAY] ${activePlayer.name} \u0111\xE3 b\xED m\u1EADt c\xE0i \u0111\u1EB7t m\u1ED9t b\u1EABy ${trapType} t\u1EA1i [${nodeName}].`,
            type: "CHAOS"
          },
          ...state.logs
        ]
      };
    }
    case "TRIGGER_TRAP": {
      const { nodeId, victimPlayerId } = action;
      const triggerRes = triggerTrapAtNode(state, victimPlayerId, nodeId);
      return triggerRes.nextState;
    }
    case "SELECT_BUSINESS_TYPE": {
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.playerId || activePlayer?.id;
      if (!actorId || state.status !== "PLAYING") return state;
      const { businessId } = action;
      const businessDef = BUSINESS_CATALOG[businessId];
      if (!businessDef) return state;
      let targetTileId = action.tileId;
      let targetNodeId = action.nodeId;
      if (targetTileId === void 0 && targetNodeId) {
        const num = parseInt(targetNodeId.replace(/^(node-|tile-)/, ""), 10);
        if (!isNaN(num)) targetTileId = num;
      } else if (targetTileId !== void 0 && !targetNodeId) {
        targetNodeId = `node-${targetTileId}`;
      } else if (targetTileId === void 0 && !targetNodeId && activePlayer) {
        targetTileId = activePlayer.position;
        targetNodeId = activePlayer.positionNodeId || `node-${activePlayer.position}`;
      }
      if (targetTileId === void 0) return state;
      const ownership = state.properties[targetTileId];
      if (!ownership || ownership.ownerId !== actorId || ownership.isMortgaged) {
        return state;
      }
      const updatedProperties = {
        ...state.properties,
        [targetTileId]: {
          ...ownership,
          businessTypeId: businessId
        }
      };
      let updatedSpatialGraph = state.spatialGraph;
      if (updatedSpatialGraph && targetNodeId && updatedSpatialGraph.nodes[targetNodeId]) {
        const node = updatedSpatialGraph.nodes[targetNodeId];
        updatedSpatialGraph = {
          ...updatedSpatialGraph,
          nodes: {
            ...updatedSpatialGraph.nodes,
            [targetNodeId]: {
              ...node,
              currentBusiness: {
                id: `${businessId}-${targetNodeId}`,
                businessId,
                name: businessDef.name,
                category: businessDef.category,
                tier: Math.max(1, ownership.level || 1),
                baseRentMultiplier: 1,
                synergyTags: [...businessDef.synergyTags],
                ownerPlayerId: ownership.ownerId
              }
            }
          }
        };
      }
      const tileName = getTileById(targetTileId)?.name || targetNodeId || `\xD4 ${targetTileId}`;
      const logEntry = {
        id: `biz-select-${Date.now()}`,
        timestamp: Date.now(),
        playerId: actorId,
        message: `\u{1F3E2} [CH\u1ECCN M\xD4 H\xCCNH KINH DOANH] \u0110\xE3 chuy\u1EC3n \u0111\u1ED5i [${tileName}] sang m\xF4 h\xECnh ${businessDef.name}!`,
        type: "PURCHASE"
      };
      return {
        ...state,
        properties: updatedProperties,
        spatialGraph: updatedSpatialGraph,
        logs: [logEntry, ...state.logs]
      };
    }
    case "APPLY_CHAOS_DELTA": {
      const delta = action.delta;
      const meter = state.chaosMeter || createInitialChaosMeter();
      const { nextMeter } = applyChaosDelta(meter, delta, state.roundNumber);
      return {
        ...state,
        chaosMeter: nextMeter
      };
    }
    default:
      return state;
  }
}
function resolveLandingTile(state, position, diceSum) {
  const activePlayer = state.players[state.activePlayerIndex];
  const landingTile = getTileById(position);
  if (!landingTile) return state;
  const newLogs = [...state.logs];
  let updatedPlayers = [...state.players];
  let currentLedger = state.ledger || [];
  const landingNodeId = activePlayer.positionNodeId || (state.spatialGraph ? `node-${position}` : void 0);
  if (landingNodeId) {
    const trapCheck = triggerTrapAtNode(
      { ...state, players: updatedPlayers, ledger: currentLedger },
      activePlayer.id,
      landingNodeId
    );
    if (trapCheck.trapTriggered) {
      updatedPlayers = trapCheck.nextState.players;
      currentLedger = trapCheck.nextState.ledger || currentLedger;
      state = {
        ...state,
        placedTraps: trapCheck.nextState.placedTraps,
        logs: trapCheck.nextState.logs
      };
      state = processGameEvent(state, {
        type: "TRAP_TRIGGERED",
        playerId: activePlayer.id,
        nodeId: landingNodeId
      });
      if (trapCheck.haltedMovement) {
        return {
          ...state,
          players: updatedPlayers,
          ledger: currentLedger,
          ledgerHistory: currentLedger,
          turnPhase: "ACTION_MENU"
        };
      }
    }
    const patrolHit = checkPatrolInterception(activePlayer, state.chaosMeter?.patrolUnits || []);
    if (patrolHit) {
      const patrolRes = resolvePatrolPenalty(
        { ...state, players: updatedPlayers, ledger: currentLedger },
        activePlayer.id
      );
      updatedPlayers = patrolRes.nextState.players;
      currentLedger = patrolRes.nextState.ledger || currentLedger;
      state = {
        ...state,
        logs: patrolRes.nextState.logs,
        lastSoundEffect: patrolRes.nextState.lastSoundEffect
      };
    }
  }
  switch (landingTile.type) {
    case "GO_TO_JAIL": {
      emitSound("payRent");
      const updatedPlayer = {
        ...activePlayer,
        position: 10,
        inDetention: true,
        detentionTurns: 2,
        consecutiveDoubles: 0
      };
      updatedPlayers = updatedPlayers.map((p) => p.id === activePlayer.id ? updatedPlayer : p);
      newLogs.unshift({
        id: `jail-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: `[L\u1EC6NH B\u1EAET T\u1EA0M GIAM] ${activePlayer.name} d\u1EEBng t\u1EA1i [${landingTile.name}] v\xE0 b\u1ECB \xE1p gi\u1EA3i ngay v\u1EC1 Khu C\xE1ch Ly T\u1EA1m Giam!`,
        type: "WARNING"
      });
      return {
        ...state,
        players: updatedPlayers,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        isDouble: false,
        turnPhase: "ACTION_MENU",
        lastSoundEffect: "payRent",
        logs: newLogs
      };
    }
    case "TAX": {
      const taxAmount = landingTile.taxAmount || (landingTile.id === 4 ? 200 : 100);
      emitSound("payRent");
      const ledgerRes = executeLedgerTransaction(updatedPlayers, {
        category: "TAX_PAYMENT",
        from: activePlayer.id,
        to: "BANK",
        amount: taxAmount,
        roundNumber: state.roundNumber,
        tileId: landingTile.id,
        memo: `N\u1ED9p thu\u1EBF t\u1EA1i [${landingTile.name}]`,
        allowPartial: true
      }, currentLedger);
      const updatedLedger = ledgerRes.entry ? [...currentLedger, ledgerRes.entry] : currentLedger;
      if (ledgerRes.shortfall > 0) {
        return {
          ...state,
          players: ledgerRes.newPlayers,
          ledger: updatedLedger,
          ledgerHistory: updatedLedger,
          turnPhase: "BANKRUPTCY_CHECK",
          lastSoundEffect: "payRent",
          pendingDebt: {
            creditorPlayerId: null,
            amount: ledgerRes.shortfall,
            reason: `N\u1ED9p thu\u1EBF t\u1EA1i [${landingTile.name}]`,
            category: "TAX_PAYMENT"
          },
          logs: [
            {
              id: `tax-warn-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `[C\u1EA2NH B\xC1O N\u1EE2 THU\u1EBE] ${activePlayer.name} \u0111\u1ED1i m\u1EB7t kho\u1EA3n thu\u1EBF ${formatMoney(taxAmount)}, thi\u1EBFu ${formatMoney(ledgerRes.shortfall)}!`,
              type: "WARNING"
            },
            ...newLogs
          ]
        };
      }
      newLogs.unshift({
        id: `tax-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: `${activePlayer.name} \u0111\xF3ng ${formatMoney(taxAmount)} thu\u1EBF t\u1EA1i [${landingTile.name}].`,
        type: "WARNING"
      });
      return {
        ...state,
        players: ledgerRes.newPlayers,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        turnPhase: "ACTION_MENU",
        lastSoundEffect: "payRent",
        logs: newLogs
      };
    }
    case "CHAOS":
    case "CHEST":
    case "CHANCE": {
      if (state.config.gameMode === "CLASSIC" && landingTile.type === "CHAOS") {
        return {
          ...state,
          players: updatedPlayers,
          turnPhase: "ACTION_MENU",
          logs: [
            ...newLogs,
            {
              id: `log-${Date.now()}-classic-chaos`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `${activePlayer.name} d\u1EEBng ch\xE2n t\u1EA1i \xF4 H\u1ED7n Lo\u1EA1n. Kh\xF4ng c\xF3 thi\xEAn tai trong ch\u1EBF \u0111\u1ED9 C\u1ED5 \u0110i\u1EC3n!`,
              type: "INFO"
            }
          ]
        };
      }
      const tileSeed = state.config.seed ? state.config.seed + state.roundNumber * 997 + state.activePlayerIndex * 131 + landingTile.id * 17 + (state.chaosHistory?.length || 0) * 31 : void 0;
      const tileRng = tileSeed !== void 0 ? createPRNG(tileSeed) : void 0;
      const worldCard = landingTile.type === "CHAOS" && state.config.gameMode !== "CLASSIC" ? pickWorldEventCard({ ...state, players: updatedPlayers }, tileRng) : null;
      const card = worldCard ?? drawRandomChaosCard(landingTile.id, tileRng, state);
      let chaosState = {
        ...state,
        players: updatedPlayers,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs: newLogs
      };
      chaosState = processGameEvent(chaosState, {
        type: "CHAOS_CARD_DRAWN",
        playerId: activePlayer.id
      });
      return applyChaosCard(chaosState, card, tileRng);
    }
    case "PROPERTY":
    case "TRANSPORT":
    case "UTILITY": {
      const ownership = state.properties[landingTile.id];
      if (ownership && ownership.ownerId && ownership.ownerId !== activePlayer.id && !ownership.isMortgaged) {
        const blocked = isTileBlocked(state, landingTile.id);
        const targetNodeId = activePlayer.positionNodeId || `node-${landingTile.id}`;
        const hasBusiness = Boolean(
          ownership.businessTypeId || state.spatialGraph?.nodes[targetNodeId]?.currentBusiness
        );
        let rentAmount = 0;
        let isMonopoly = false;
        if (hasBusiness && state.spatialGraph) {
          rentAmount = calculateDynamicBusinessRent(state.spatialGraph, targetNodeId, state);
          if (blocked) rentAmount = 0;
        } else {
          const rentInfo = calculateRent(
            landingTile.id,
            state.properties,
            state.rentModifier * getRentEscalationMultiplier(state.roundNumber) * rentMultiplier(state, ownership.level, landingTile.type) * (blocked ? 0 : 1),
            diceSum,
            state.chaosModifiers
          );
          rentAmount = rentInfo.rentAmount;
          isMonopoly = rentInfo.isMonopoly;
        }
        const owner = updatedPlayers.find((p) => p.id === ownership.ownerId);
        if (owner && !owner.isBankrupt && rentAmount > 0) {
          emitSound("payRent");
          const ledgerRes = executeLedgerTransaction(updatedPlayers, {
            category: "RENT_PAYMENT",
            from: activePlayer.id,
            to: owner.id,
            amount: rentAmount,
            roundNumber: state.roundNumber,
            tileId: landingTile.id,
            memo: `Tr\u1EA3 ti\u1EC1n thu\xEA t\u1EA1i [${landingTile.name}] cho ${owner.name}`,
            allowPartial: true
          }, currentLedger);
          const updatedLedger = ledgerRes.entry ? [...currentLedger, ledgerRes.entry] : currentLedger;
          let rentMsg = `${activePlayer.name} tr\u1EA3 ${formatMoney(ledgerRes.actualPaid)} ti\u1EC1n thu\xEA cho ${owner.name} t\u1EA1i [${landingTile.name}].`;
          if (isMonopoly) {
            rentMsg += ` (Nh\xE2n \u0111\xF4i do \u0110\u1ED9c quy\u1EC1n qu\u1EADn!)`;
          }
          newLogs.unshift({
            id: `rent-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: rentMsg,
            type: "RENT"
          });
          state = processGameEvent(state, {
            type: "RENT_PAID",
            amount: rentAmount,
            playerId: activePlayer.id
          });
          if (ledgerRes.shortfall > 0) {
            return {
              ...state,
              players: ledgerRes.newPlayers,
              ledger: updatedLedger,
              ledgerHistory: updatedLedger,
              turnPhase: "BANKRUPTCY_CHECK",
              lastSoundEffect: "payRent",
              pendingDebt: {
                creditorPlayerId: owner.id,
                amount: ledgerRes.shortfall,
                reason: `Ti\u1EC1n thu\xEA t\u1EA1i [${landingTile.name}] cho ${owner.name}`,
                category: "RENT_PAYMENT"
              },
              logs: newLogs
            };
          }
          return {
            ...state,
            players: ledgerRes.newPlayers,
            ledger: updatedLedger,
            ledgerHistory: updatedLedger,
            turnPhase: "ACTION_MENU",
            lastSoundEffect: "payRent",
            logs: newLogs
          };
        }
      }
      break;
    }
    default:
      break;
  }
  return {
    ...state,
    players: updatedPlayers,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    turnPhase: "ACTION_MENU",
    logs: newLogs
  };
}

// src/cosmetics/types.ts
var DEFAULT_PLAYER_COSMETICS = {
  characterId: "char-tycoon",
  outfitId: "outfit-classic-suit",
  petId: "pet-none",
  diceSkinId: "dice-neon-cyan",
  tokenId: "token-vinfast",
  effectId: "effect-none"
};

// src/cosmetics/catalog.ts
var L2 = (vi, en) => ({ vi, en });
var COSMETICS_CATALOG = [
  // ==========================================
  // 1. CHARACTERS (Nhân Vật)
  // ==========================================
  {
    id: "char-tycoon",
    category: "CHARACTER",
    name: L2("T\xE0i Phi\u1EC7t Alpha", "Alpha Tycoon"),
    description: L2(
      "Nh\xE0 \u0111\u1EA7u t\u01B0 b\u1EA5t \u0111\u1ED9ng s\u1EA3n b\u1EA3n l\u0129nh, kh\u1EDFi nghi\u1EC7p t\u1EEB nh\u1EEFng con ph\u1ED1 s\u1EA7m u\u1EA5t.",
      "A formidable real estate investor who built an empire from bustling city avenues."
    ),
    rarity: "COMMON",
    iconName: "User",
    previewColor: "#06b6d4",
    worldTheme: "modern-metropolis",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "char-cyberpunk",
    category: "CHARACTER",
    name: L2("Hacker Neon", "Neon Netrunner"),
    description: L2(
      "Chuy\xEAn gia gi\u1EA3i m\xE3 d\u1EEF li\u1EC7u c\u1EE7a Neo-Saigon 2099 v\u1EDBi c\xE1nh tay c\u01A1 kh\xED ph\xE1t quang.",
      "A data decryptor from Neo-Saigon 2099 with luminescent cybernetic augmentations."
    ),
    rarity: "RARE",
    iconName: "Cpu",
    previewColor: "#ec4899",
    worldTheme: "cyberpunk-city",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 5 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 5 or buy in Shop"),
    price: 500
  },
  {
    id: "char-mekong",
    category: "CHARACTER",
    name: L2("N\xF4ng Gia S\xF4ng N\u01B0\u1EDBc", "Mekong Planter"),
    description: L2(
      "Ch\u1EE7 mi\u1EC7t v\u01B0\u1EDDn h\xE0o s\u1EA3ng, n\u1EAFm gi\u1EEF nh\u1EEFng v\u1EF1a c\xE2y tr\xE1i tr\u0129u qu\u1EA3 b\u1EDD s\xF4ng Ti\u1EC1n.",
      "A genial orchard master commanding bountiful fruit groves along the Mekong banks."
    ),
    rarity: "UNCOMMON",
    iconName: "Palmtree",
    previewColor: "#10b981",
    worldTheme: "mekong-delta",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 3 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 3 or buy in Shop"),
    price: 350
  },
  {
    id: "char-astronaut",
    category: "CHARACTER",
    name: L2("Phi H\xE0nh Gia Helios", "Helios Astronaut"),
    description: L2(
      "Ch\u1EC9 huy tr\u01B0\u1EDFng tr\u1EA1m kh\xF4ng gian qu\u1EF9 \u0111\u1EA1o, quen thu\u1ED9c v\u1EDBi m\xF4i tr\u01B0\u1EDDng vi tr\u1ECDng l\u1EF1c.",
      "Orbital station commander, veteran of deep space microgravity operations."
    ),
    rarity: "EPIC",
    iconName: "Rocket",
    previewColor: "#8b5cf6",
    worldTheme: "space-colony",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 10 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 10 or buy in Shop"),
    price: 800
  },
  {
    id: "char-monarch",
    category: "CHARACTER",
    name: L2("\u0110\u1EA1i V\u01B0\u01A1ng Tri\u1EC1u", "High Monarch"),
    description: L2(
      "Ng\u01B0\u1EDDi k\u1EBF th\u1EEBa v\u01B0\u01A1ng qu\u1ED1c huy\u1EC1n tho\u1EA1i v\u1EDBi chi\u1EBFc v\u01B0\u01A1ng mi\u1EC7n \u0111\xEDnh ng\u1ECDc ho\xE0ng gia.",
      "Heir to a legendary realm, bearing an imperial crown of royal jade and gold."
    ),
    rarity: "LEGENDARY",
    iconName: "Crown",
    previewColor: "#f59e0b",
    worldTheme: "fantasy-kingdom",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 20 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 20 or buy in Shop"),
    price: 1500
  },
  {
    id: "char-merchant",
    category: "CHARACTER",
    name: L2("Th\u01B0\u01A1ng Nh\xE2n Ph\u1ED1 C\u1ED5", "Heritage Merchant"),
    description: L2(
      "Th\u01B0\u01A1ng nh\xE2n d\xE0y d\u1EA1n kinh nghi\u1EC7m bu\xF4n b\xE1n l\u1EE5a l\xE0, g\u1ED1m s\u1EE9 v\xE0 \u0111\u1EA5t v\xE0ng ng\xE0n n\u0103m.",
      "A seasoned trader versed in ancient silk routes, ceramics, and prime heritage plots."
    ),
    rarity: "UNCOMMON",
    iconName: "Coins",
    previewColor: "#eab308",
    worldTheme: "modern-metropolis",
    unlockCondition: L2("Chi\u1EBFn th\u1EAFng 3 tr\u1EADn \u0111\u1EA5u", "Win 3 matches"),
    price: 400
  },
  // ==========================================
  // 2. OUTFITS (Trang Phục)
  // ==========================================
  {
    id: "outfit-classic-suit",
    category: "OUTFIT",
    name: L2("Vest Doanh Nh\xE2n C\u1ED5 \u0110i\u1EC3n", "Classic Executive Suit"),
    description: L2(
      "B\u1ED9 \xE2u ph\u1EE5c may \u0111o ch\u1EC9n chu d\xE0nh cho nh\u1EEFng cu\u1ED9c \u0111\xE0m ph\xE1n tri\u1EC7u \u0111\xF4.",
      "A sharp tailored two-piece suit crafted for million-dollar boardrooms."
    ),
    rarity: "COMMON",
    iconName: "Shirt",
    previewColor: "#3b82f6",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "outfit-cyber-jacket",
    category: "OUTFIT",
    name: L2("\xC1o Kho\xE1c Da Hologram", "Hologram Leather Jacket"),
    description: L2(
      "\xC1o kho\xE1c da t\xEDch h\u1EE3p d\u1EA3i \u0111\xE8n LED quang ph\u1ED5 ch\u1EA1y d\u1ECDc c\xE1nh tay.",
      "Streetwise leather jacket woven with spectrum fiber-optic neon piping."
    ),
    rarity: "RARE",
    iconName: "Sparkles",
    previewColor: "#ec4899",
    worldTheme: "cyberpunk-city",
    unlockCondition: L2("Ho\xE0n th\xE0nh 5 l\u01B0\u1EE3t ch\u01A1i t\u1EA1i Cyberpunk City", "Play 5 turns in Cyberpunk City"),
    price: 450
  },
  {
    id: "outfit-ao-ba-ba",
    category: "OUTFIT",
    name: L2("\xC1o B\xE0 Ba Kh\u0103n R\u1EB1n", "Heritage Mekong Silk"),
    description: L2(
      "Trang ph\u1EE5c truy\u1EC1n th\u1ED1ng Nam B\u1ED9 tho\xE1ng m\xE1t k\u1EBFt h\u1EE3p kh\u0103n r\u1EB1n m\u1ED9c m\u1EA1c.",
      "Traditional Southern Vietnamese silk tunic accompanied by a checkered scarf."
    ),
    rarity: "UNCOMMON",
    iconName: "Shirt",
    previewColor: "#10b981",
    worldTheme: "mekong-delta",
    unlockCondition: L2("S\u1EDF h\u1EEFu \u0111\u1ED9c quy\u1EC1n 1 qu\u1EADn t\u1EA1i Mekong Delta", "Form a monopoly in Mekong Delta"),
    price: 300
  },
  {
    id: "outfit-spacesuit",
    category: "OUTFIT",
    name: L2("B\u1ED9 Gi\xE1p Kh\xF4ng Tr\u1ECDng L\u1EF1c", "EVA Zero-G Exosuit"),
    description: L2(
      "B\u1ED9 \u0111\u1ED3 b\u1EA3o h\u1ED9 v\u0169 tr\u1EE5 c\xE1ch nhi\u1EC7t t\xEDch h\u1EE3p m\xE0n h\xECnh \xE1p su\u1EA5t HUD.",
      "Pressurized thermo-composite spacesuit with integrated tactile helmet HUD."
    ),
    rarity: "EPIC",
    iconName: "Shield",
    previewColor: "#6366f1",
    worldTheme: "space-colony",
    unlockCondition: L2("S\u1ED1ng s\xF3t qua 3 c\u01A1n B\xE3o M\u1EB7t Tr\u1EDDi", "Survive 3 Solar Flare events"),
    price: 750
  },
  {
    id: "outfit-royal-robe",
    category: "OUTFIT",
    name: L2("Ho\xE0ng B\xE0o Th\xEAu R\u1ED3ng V\xE0ng", "Imperial Dragon Robe"),
    description: L2(
      "\xC1o cho\xE0ng nhung \u0111\u1ECF th\xEAu ch\u1EC9 v\xE0ng qu\xFD ph\xE1i c\u1EE7a c\xE1c b\u1EADc quy\u1EC1n qu\xFD v\u01B0\u01A1ng tri\u1EC1u.",
      "Crimson velvet mantle embroidered with golden dragons fit for imperial nobility."
    ),
    rarity: "LEGENDARY",
    iconName: "Crown",
    previewColor: "#f59e0b",
    unlockCondition: L2("\u0110\u1EA1t t\u1ED5ng t\xE0i s\u1EA3n $4000M trong m\u1ED9t v\xE1n", "Reach $4000M net worth in a match"),
    price: 1200
  },
  // ==========================================
  // 3. PETS (Thú Cưng Đồng Hành)
  // ==========================================
  {
    id: "pet-none",
    category: "PET",
    name: L2("Kh\xF4ng Mang Pet", "No Companion"),
    description: L2("Kh\xF4ng s\u1EED d\u1EE5ng th\xFA c\u01B0ng \u0111\u1ED3ng h\xE0nh.", "No pet companion active."),
    rarity: "COMMON",
    iconName: "MinusCircle",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "pet-shiba",
    category: "PET",
    name: L2("Ch\xF3 Shiba Cyber", "Cyber Shiba"),
    description: L2(
      "Ch\xFA ch\xF3 Shiba \u0111eo k\xEDnh AR th\xF4ng minh, hay v\u1EABy \u0111u\xF4i ch\xFAc m\u1EEBng b\u1EA1n mua \u0111\u1EA5t.",
      "A cybernetic Shiba dog equipped with AR goggles, joyfully barking at your acquisitions."
    ),
    rarity: "RARE",
    iconName: "Dog",
    previewColor: "#f59e0b",
    unlockCondition: L2("Mua 10 b\u1EA5t \u0111\u1ED9ng s\u1EA3n trong ch\u1EBF \u0111\u1ED9 b\u1EA5t k\u1EF3", "Buy 10 properties in any mode"),
    price: 600
  },
  {
    id: "pet-otter",
    category: "PET",
    name: L2("R\xE1i C\xE1 S\xF4ng H\u1EADu", "Mekong River Otter"),
    description: L2(
      "Ch\xFA r\xE1i c\xE1 tinh ngh\u1ECBch th\xEDch \u0111\xF9a gi\u1EE1n v\u1EDBi nh\u1EEFng \u0111\u1ED3ng xu may m\u1EAFn.",
      "A playful river otter that balances lucky gold coins on its nose."
    ),
    rarity: "UNCOMMON",
    iconName: "Fish",
    previewColor: "#06b6d4",
    worldTheme: "mekong-delta",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 4", "Reach Level 4"),
    price: 400
  },
  {
    id: "pet-drone",
    category: "PET",
    name: L2("Drone Trinh S\xE1t AI", "AI Orbital Drone"),
    description: L2(
      "Thi\u1EBFt b\u1ECB bay trinh s\xE1t h\xECnh c\u1EA7u mini bay l\u01B0\u1EE3n h\u1ED9 t\u1ED1ng xung quanh ng\u01B0\u1EDDi ch\u01A1i.",
      "A floating micro-drone emitting soft scanning pulses around its commander."
    ),
    rarity: "EPIC",
    iconName: "Radio",
    previewColor: "#a855f7",
    worldTheme: "space-colony",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 8", "Reach Level 8"),
    price: 850
  },
  {
    id: "pet-phoenix",
    category: "PET",
    name: L2("Ph\u01B0\u1EE3ng Ho\xE0ng L\u1EEDa", "Mystic Phoenix"),
    description: L2(
      "Linh th\xFA th\u1EA7n tho\u1EA1i r\u1EF1c s\xE1ng m\u1ED7i khi b\u1EA1n tho\xE1t kh\u1ECFi nguy c\u01A1 ph\xE1 s\u1EA3n.",
      "A mythical flaming avian spirit that bursts into golden embers during critical saves."
    ),
    rarity: "LEGENDARY",
    iconName: "Flame",
    previewColor: "#ef4444",
    unlockCondition: L2("Tho\xE1t kh\u1ECFi c\u1EA3nh v\u1EE1 n\u1EE3 th\xE0nh c\xF4ng 2 l\u1EA7n", "Successfully settle debt 2 times"),
    price: 1800
  },
  // ==========================================
  // 4. DICE SKINS (Giao Diện Xúc Xắc)
  // ==========================================
  {
    id: "dice-neon-cyan",
    category: "DICE",
    name: L2("Neon Cyan Chu\u1EA9n", "Neon Cyan Standard"),
    description: L2(
      "C\u1EB7p x\xFAc x\u1EAFc ph\xE1t s\xE1ng neon xanh hi\u1EC7n \u0111\u1EA1i v\u1EDBi hi\u1EC7u \u1EE9ng ph\u1EA3n x\u1EA1 s\u1EAFc n\xE9t.",
      "Precision dice carved with sleek luminous cyan edges and dark crystalline pips."
    ),
    rarity: "COMMON",
    iconName: "Dices",
    previewColor: "#06b6d4",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "dice-cyber-gold",
    category: "DICE",
    name: L2("Ho\xE0ng Kim Th\u1EA7n T\xE0i", "Cyber Gold Jackpot"),
    description: L2(
      "X\xFAc x\u1EAFc m\u1EA1 v\xE0ng 24K t\u1ECFa \xE1nh h\xE0o quang t\xE0i l\u1ED9c m\u1ED7i l\u1EA7n tung s\u1ED1 \u0111\xF4i.",
      "24K gilded dice radiant with golden jackpot shimmer upon rolling doubles."
    ),
    rarity: "RARE",
    iconName: "Dices",
    previewColor: "#eab308",
    unlockCondition: L2("Tung \u0111\u01B0\u1EE3c 3 l\u1EA7n \u0111\u1ED5 s\u1ED1 \u0111\xF4i li\xEAn ti\u1EBFp", "Roll 3 doubles in matches"),
    price: 550
  },
  {
    id: "dice-obsidian-void",
    category: "DICE",
    name: L2("\u0110\xE1 H\u1EAFc Di\u1EC7u V\xF4 C\u1EF1c", "Obsidian Void Dice"),
    description: L2(
      "Kh\u1ED1i tinh th\u1EC3 b\xF3ng \u0111\xEAm h\u1EA5p th\u1EE5 \xE1nh s\xE1ng v\u1EDBi c\xE1c ch\u1EA5m kh\u1EAFc t\xEDm ma m\u1ECB.",
      "Light-absorbing black volcanic glass dice inlaid with violet glowing pips."
    ),
    rarity: "EPIC",
    iconName: "Dices",
    previewColor: "#8b5cf6",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 12", "Reach Level 12"),
    price: 900
  },
  {
    id: "dice-starlight",
    category: "DICE",
    name: L2("Tinh V\xE2n Sao B\u0103ng", "Nebula Starlight"),
    description: L2(
      "X\xFAc x\u1EAFc trong su\u1ED1t ch\u1EE9a b\u1EE5i thi\xEAn h\xE0 l\u1EA5p l\xE1nh nh\u01B0 b\u1EA7u tr\u1EDDi \u0111\xEAm v\xF4 t\u1EADn.",
      "Transparent prismatic dice containing cosmic nebula dust that glitters in flight."
    ),
    rarity: "LEGENDARY",
    iconName: "Sparkles",
    previewColor: "#38bdf8",
    worldTheme: "space-colony",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 25 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 25 or buy in Shop"),
    price: 1600
  },
  {
    id: "dice-flame-ruby",
    category: "DICE",
    name: L2("H\u1ECFa Ng\u1ECDc H\u1ED3ng B\u1EA3o", "Crimson Flame Ruby"),
    description: L2(
      "X\xFAc x\u1EAFc \u0111\xFAc t\u1EEB h\u1ED3ng ng\u1ECDc r\u1EF1c l\u1EEDa mang n\u0103ng l\u01B0\u1EE3ng may m\u1EAFn.",
      "Ruby-forged dice burning with inner fiery embers of high-stakes momentum."
    ),
    rarity: "UNCOMMON",
    iconName: "Flame",
    previewColor: "#f43f5e",
    unlockCondition: L2("Th\u1EAFng 1 cu\u1ED9c \u0111\u1EA5u gi\xE1 b\u1EA5t \u0111\u1ED9ng s\u1EA3n", "Win a property auction"),
    price: 350
  },
  // ==========================================
  // 5. TOKENS & VEHICLES (Quân Cờ & Phương Tiện)
  // ==========================================
  {
    id: "token-vinfast",
    category: "TOKEN",
    name: L2("Xe \u0110i\u1EC7n VinFast VF9", "VinFast VF9 Electric SUV"),
    description: L2(
      "M\u1EABu xe \u0111i\u1EC7n flagship hi\u1EC7n \u0111\u1EA1i l\u01B0\u1EDBt \xEAm \xE1i tr\xEAn c\xE1c tr\u1EE5c \u0111\u1EA1i l\u1ED9 \u0111\xF4 th\u1ECB.",
      "Modern flagship luxury electric SUV gliding gracefully across metropolis avenues."
    ),
    rarity: "COMMON",
    iconName: "Car",
    previewColor: "#06b6d4",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "token-metro",
    category: "TOKEN",
    name: L2("T\xE0u Si\xEAu T\u1ED1c Metro", "High-Speed Metro Train"),
    description: L2(
      "\u0110o\xE0n t\xE0u \u0111i\u1EC7n ng\u1EA7m hi\u1EC7n \u0111\u1EA1i k\u1EBFt n\u1ED1i c\xE1c \u0111\u1EA1i \u0111\xF4 th\u1ECB t\xE0i ch\xEDnh.",
      "Sleek aerodynamic metro express linking bustling commercial districts."
    ),
    rarity: "UNCOMMON",
    iconName: "Train",
    previewColor: "#f59e0b",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "token-meo-than-tai",
    category: "TOKEN",
    name: L2("M\xE8o Th\u1EA7n T\xE0i Cyber", "Cyber Lucky Maneki"),
    description: L2(
      "Bi\u1EC3u t\u01B0\u1EE3ng chi\xEAu t\xE0i n\u1EA1p l\u1ED9c \u0111\u01B0\u1EE3c n\xE2ng c\u1EA5p phong c\xE1ch c\u01A1 kh\xED cyberpunk.",
      "Traditional Japanese-Vietnamese lucky fortune cat enhanced with cybernetic brass."
    ),
    rarity: "UNCOMMON",
    iconName: "Sparkles",
    previewColor: "#10b981",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "token-vinasat",
    category: "TOKEN",
    name: L2("Phi Thuy\u1EC1n Vinasat", "Vinasat Star Cruiser"),
    description: L2(
      "T\xE0u du h\xE0nh kh\xF4ng gian mang c\u1EDD hi\u1EC7u Vi\u1EC7t Nam v\u01B0\u01A1n ra c\xE1c v\xEC sao.",
      "Vietnamese deep-space explorer spacecraft pioneering orbital transit."
    ),
    rarity: "RARE",
    iconName: "Rocket",
    previewColor: "#ef4444",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "token-sampan",
    category: "TOKEN",
    name: L2("Xu\u1ED3ng Ba L\xE1 Mi\u1EC1n T\xE2y", "Mekong Three-Plank Sampan"),
    description: L2(
      "Chi\u1EBFc xu\u1ED3ng m\u1ED9c m\u1EA1c l\u01B0\u1EDBt s\xF3ng qua nh\u1EEFng d\xF2ng k\xEAnh ch\u1EB1ng ch\u1ECBt s\xF4ng n\u01B0\u1EDBc.",
      "A classic wooden delta boat cutting deftly through winding river channels."
    ),
    rarity: "RARE",
    iconName: "Ship",
    previewColor: "#10b981",
    worldTheme: "mekong-delta",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 6 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 6 or buy in Shop"),
    price: 500
  },
  {
    id: "token-hoverboard",
    category: "TOKEN",
    name: L2("V\xE1n Tr\u01B0\u1EE3t Ph\u1EA3n Tr\u1ECDng L\u1EF1c", "Antigravity Hoverboard"),
    description: L2(
      "Thi\u1EBFt b\u1ECB di chuy\u1EC3n c\xE1 nh\xE2n bay l\u01A1 l\u1EEDng c\xE1ch m\u1EB7t \u0111\u1EA5t 30cm v\u1EDBi v\u1EC7t kh\xF3i xanh.",
      "Futuristic maglev hoverboard floating effortlessly above the board surface."
    ),
    rarity: "EPIC",
    iconName: "Zap",
    previewColor: "#ec4899",
    worldTheme: "cyberpunk-city",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 15 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 15 or buy in Shop"),
    price: 950
  },
  // ==========================================
  // 6. VISUAL EFFECTS (Hiệu Ứng Bàn Cờ)
  // ==========================================
  {
    id: "effect-none",
    category: "EFFECT",
    name: L2("M\u1EB7c \u0110\u1ECBnh", "Standard Effects"),
    description: L2("Hi\u1EC7u \u1EE9ng th\u1ECB gi\xE1c chu\u1EA9n c\u1EE7a tr\xF2 ch\u01A1i.", "Standard visual feedback."),
    rarity: "COMMON",
    iconName: "Check",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "effect-victory-confetti",
    category: "EFFECT",
    name: L2("Ph\xE1o Hoa Ho\xE0ng Kim", "Golden Victor Confetti"),
    description: L2(
      "M\u01B0a ph\xE1o hoa kim tuy\u1EBFn v\xE0ng kim r\u1EF1c r\u1EE1 khi gi\xE0nh chi\u1EBFn th\u1EAFng v\xE1n c\u1EDD.",
      "Shimmering gold and holographic confetti rain upon clinching the championship."
    ),
    rarity: "RARE",
    iconName: "Sparkles",
    previewColor: "#f59e0b",
    unlockCondition: L2("Chi\u1EBFn th\u1EAFng v\xE1n \u0111\u1EA5u \u0111\u1EA7u ti\xEAn", "Win your first match"),
    price: 450
  },
  {
    id: "effect-neon-trail",
    category: "EFFECT",
    name: L2("V\u1EC7t S\xE1ng Neon Trail", "Neon Dash Ripple"),
    description: L2(
      "T\u1EA1o g\u1EE3n s\xF3ng \xE1nh s\xE1ng neon theo t\u1EEBng b\u01B0\u1EDBc di chuy\u1EC3n c\u1EE7a qu\xE2n c\u1EDD.",
      "Emits glowing neon ring shockwaves as your token hops along the perimeter."
    ),
    rarity: "EPIC",
    iconName: "Zap",
    previewColor: "#06b6d4",
    worldTheme: "cyberpunk-city",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 9", "Reach Level 9"),
    price: 700
  },
  {
    id: "effect-cosmic-warp",
    category: "EFFECT",
    name: L2("C\u1ED5ng L\u1ED7 S\xE2u Kh\xF4ng Gian", "Cosmic Wormhole Aura"),
    description: L2(
      "H\xE0o quang tinh v\xE2n xo\xE1y \u1ED1c xu\u1EA5t hi\u1EC7n khi h\u1EA1 c\xE1nh xu\u1ED1ng c\xE1c \xF4 \u0111\u1EB7c bi\u1EC7t.",
      "Swirling miniature galactic singularity flares when landing on corner tiles."
    ),
    rarity: "LEGENDARY",
    iconName: "Orbit",
    previewColor: "#8b5cf6",
    worldTheme: "space-colony",
    unlockCondition: L2("\u0110\u1EA1t C\u1EA5p 30 ho\u1EB7c mua t\u1EA1i C\u1EEDa H\xE0ng", "Reach Level 30 or buy in Shop"),
    price: 1500
  },
  // ==========================================
  // 7. EMOTES (Biểu Cảm Nhanh Online)
  // ==========================================
  {
    id: "emote-gg",
    category: "EMOTE",
    name: L2("Ch\u01A1i R\u1EA5t Hay! (GG)", "Good Game! (GG)"),
    description: L2("C\u1EED ch\u1EC9 b\u1EAFt tay t\xF4n tr\u1ECDng \u0111\u1ED1i th\u1EE7.", "Handshake gesture of sportsmanship."),
    rarity: "COMMON",
    iconName: "Handshake",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "emote-laugh",
    category: "EMOTE",
    name: L2("C\u01B0\u1EDDi Nghi\xEAng Ng\u1EA3 \u{1F602}", "Laughter \u{1F602}"),
    description: L2("C\u01B0\u1EDDi s\u1EA3ng kho\xE1i tr\u01B0\u1EDBc nh\u1EEFng t\xECnh hu\u1ED1ng b\u1EA5t ng\u1EDD.", "Hearty laughter."),
    rarity: "COMMON",
    iconName: "Smile",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "emote-panic",
    category: "EMOTE",
    name: L2("Toang R\u1ED3i! \u{1F631}", "Panic \u{1F631}"),
    description: L2("Bi\u1EC3u c\u1EA3m khi v\u1EEBa b\u01B0\u1EDBc v\xE0o \xF4 \u0111\u1EA5t \u0111\u1EAFt \u0111\u1ECF c\u1EE7a \u0111\u1ED1i th\u1EE7.", "Panic reaction."),
    rarity: "COMMON",
    iconName: "AlertCircle",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "emote-money",
    category: "EMOTE",
    name: L2("\u0110\u1EA1i Gia Mua H\u1EBFt \u{1F4B8}", "Big Spender \u{1F4B8}"),
    description: L2("Tung ti\u1EC1n khoe t\xE0i s\u1EA3n.", "Raining bank bills."),
    rarity: "UNCOMMON",
    iconName: "Coins",
    unlockCondition: L2("\u0110\u1EA1t $2000M ti\u1EC1n m\u1EB7t trong m\u1ED9t v\xE1n", "Hold $2000M cash in a match"),
    price: 250
  },
  {
    id: "emote-thumbsup",
    category: "EMOTE",
    name: L2("Tuy\u1EC7t V\u1EDDi \u{1F44D}", "Thumbs Up \u{1F44D}"),
    description: L2("T\xE1n th\xE0nh quy\u1EBFt \u0111\u1ECBnh giao d\u1ECBch.", "Agreement and support."),
    rarity: "COMMON",
    iconName: "ThumbsUp",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "emote-fire",
    category: "EMOTE",
    name: L2("Ch\xE1y Qu\xE1! \u{1F525}", "On Fire \u{1F525}"),
    description: L2("Khi th\u1EBF tr\u1EADn \u0111ang v\xF4 c\xF9ng k\u1ECBch t\xEDnh.", "High stakes adrenaline."),
    rarity: "UNCOMMON",
    iconName: "Flame",
    unlockCondition: L2("Th\u1EAFng 2 tr\u1EADn \u0111\u1EA5u li\xEAn ti\u1EBFp", "Win 2 consecutive matches"),
    price: 250
  },
  {
    id: "emote-cry",
    category: "EMOTE",
    name: L2("Kh\xF3c R\xF2ng \u{1F62D}", "Sobbing \u{1F62D}"),
    description: L2("Khi b\u1ECB thu ti\u1EC1n thu\xEA \u0111\u1EAFt \u0111\u1ECF ho\u1EB7c v\xE0o t\xF9.", "Crying over heavy rent."),
    rarity: "COMMON",
    iconName: "Frown",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  },
  {
    id: "emote-rage",
    category: "EMOTE",
    name: L2("T\u1EE9c Gi\u1EADn \u{1F4A2}", "Frustration \u{1F4A2}"),
    description: L2("Khi v\u1EADn may ch\u01B0a m\u1EC9m c\u01B0\u1EDDi.", "Playful frustration."),
    rarity: "UNCOMMON",
    iconName: "Zap",
    unlockCondition: L2("C\xF3 s\u1EB5n m\u1EB7c \u0111\u1ECBnh", "Unlocked by default"),
    price: 0,
    isDefault: true
  }
];
function getCosmeticItem(id) {
  return COSMETICS_CATALOG.find((item) => item.id === id);
}
function isValidCosmeticId(id, category) {
  const item = getCosmeticItem(id);
  if (!item) return false;
  if (category && item.category !== category) return false;
  return true;
}
function sanitizePlayerCosmetics(input) {
  if (!input) return { ...DEFAULT_PLAYER_COSMETICS };
  return {
    characterId: isValidCosmeticId(input.characterId || "", "CHARACTER") ? input.characterId : DEFAULT_PLAYER_COSMETICS.characterId,
    outfitId: isValidCosmeticId(input.outfitId || "", "OUTFIT") ? input.outfitId : DEFAULT_PLAYER_COSMETICS.outfitId,
    petId: isValidCosmeticId(input.petId || "", "PET") ? input.petId : DEFAULT_PLAYER_COSMETICS.petId,
    diceSkinId: isValidCosmeticId(input.diceSkinId || "", "DICE") ? input.diceSkinId : DEFAULT_PLAYER_COSMETICS.diceSkinId,
    tokenId: isValidCosmeticId(input.tokenId || "", "TOKEN") ? input.tokenId : DEFAULT_PLAYER_COSMETICS.tokenId,
    effectId: isValidCosmeticId(input.effectId || "", "EFFECT") ? input.effectId : DEFAULT_PLAYER_COSMETICS.effectId
  };
}

// src/server/security.ts
import crypto from "node:crypto";

// src/game/social/quickChat.ts
var QUICK_CHAT = [
  { id: "qc-1", text: { vi: "Ch\xFAc may m\u1EAFn!", en: "Good luck!" } },
  { id: "qc-2", text: { vi: "Hay l\u1EAFm!", en: "Nice one!" } },
  { id: "qc-3", text: { vi: "\xD4i kh\xF4ng!", en: "Oh no!" } },
  { id: "qc-4", text: { vi: "Ch\u1EDD ch\xFAt nh\xE9", en: "One moment" } },
  { id: "qc-5", text: { vi: "\u0110\u1ED5i kh\xF4ng?", en: "Trade?" } },
  { id: "qc-6", text: { vi: "T\xF4i mu\u1ED1n \xF4 \u0111\xF3", en: "I want that tile" } },
  { id: "qc-7", text: { vi: "\u0110\u1EEBng x\xE2y nh\xE0 nh\xE9", en: "No houses, deal?" } },
  { id: "qc-8", text: { vi: "Nhanh l\xEAn n\xE0o", en: "Hurry up" } },
  { id: "qc-9", text: { vi: "T\xF4i s\u1EAFp ph\xE1 s\u1EA3n", en: "I'm nearly broke" } },
  { id: "qc-10", text: { vi: "C\u0103ng qu\xE1!", en: "So tense!" } },
  { id: "qc-11", text: { vi: "C\u1EA3m \u01A1n nh\xE9", en: "Thanks!" } },
  { id: "qc-12", text: { vi: "V\xE1n hay \u0111\u1EA5y", en: "Great game" } }
];
var QUICK_CHAT_IDS = new Set(QUICK_CHAT.map((p) => p.id));
function isQuickChatId(id) {
  return typeof id === "string" && QUICK_CHAT_IDS.has(id);
}

// src/server/security.ts
var MAX_WS_MESSAGE_BYTES = 16 * 1024;
var VALID_PERSONALITIES = /* @__PURE__ */ new Set([
  "TYCOON",
  "STRATEGIST",
  "SHARK",
  "SURVIVOR",
  "CHAOTIC",
  "DIPLOMAT"
]);
var VALID_DIFFICULTIES = /* @__PURE__ */ new Set(["EASY", "NORMAL", "HARD"]);
var VALID_DISCONNECT_POLICIES = /* @__PURE__ */ new Set([
  "AI_TAKEOVER",
  "FORFEIT",
  "HOST_CONTINUE"
]);
var FORBIDDEN_CLIENT_INTENT_TYPES = /* @__PURE__ */ new Set([
  "ROLL_DICE_RESULT",
  "APPLY_CHAOS_EFFECT",
  "LOAD_SAVED_MATCH",
  "START_GAME",
  "RESTART_GAME",
  "RECORD_AI_DECISION",
  "SET_CASH",
  "SET_POSITION",
  "SET_OWNER"
]);
var FORBIDDEN_INTENT_KEYS = /* @__PURE__ */ new Set([
  "dice",
  "cash",
  "position",
  "ownerId",
  "seed",
  "isBankrupt",
  "winner",
  "activePlayerIndex",
  "roundNumber",
  "savedState"
]);
function sanitizeDisplayText(raw, maxLength = 32, fallback = "") {
  if (typeof raw !== "string") return fallback;
  const stripped = raw.replace(/[<>'"`\\]/g, "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!stripped) return fallback;
  return stripped.slice(0, maxLength);
}
function sanitizeRoomConfig(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const r = raw;
  const out = {};
  if (typeof r.startingCash === "number" && Number.isFinite(r.startingCash)) out.startingCash = r.startingCash;
  if (typeof r.maxRounds === "number" && Number.isFinite(r.maxRounds)) out.maxRounds = r.maxRounds;
  if (typeof r.worldId === "string") out.worldId = r.worldId.slice(0, 48);
  if (r.gameMode === "CLASSIC" || r.gameMode === "CHAOS") out.gameMode = r.gameMode;
  return out;
}
function normalizeRoomCode(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16);
}
function generateSecureRoomCode(existingCodes) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let attempt = 0; attempt < 100; attempt++) {
    const bytes = crypto.randomBytes(4);
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
    const code = `CHAOS-${suffix}`;
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  return `CHAOS-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}
function generateSecureToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}
function hashSecretToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function verifySecretTokenHash(token, expectedHash) {
  if (!token || !expectedHash) return false;
  const candidateHash = hashSecretToken(token);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
function generateSecureSeed32() {
  return crypto.randomInt(1e5, 2147483640);
}
function parseAndValidateClientMessage(rawBuffer) {
  const byteLength = typeof rawBuffer === "string" ? Buffer.byteLength(rawBuffer, "utf8") : rawBuffer.byteLength;
  if (byteLength > MAX_WS_MESSAGE_BYTES) {
    return {
      ok: false,
      code: "MESSAGE_TOO_LARGE",
      messageVi: `G\xF3i tin v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n cho ph\xE9p (${MAX_WS_MESSAGE_BYTES} bytes).`
    };
  }
  let parsed;
  try {
    const text = typeof rawBuffer === "string" ? rawBuffer : rawBuffer.toString("utf8");
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: "INVALID_SCHEMA",
      messageVi: "G\xF3i tin JSON kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      code: "INVALID_SCHEMA",
      messageVi: "C\u1EA5u tr\xFAc g\xF3i tin kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  if (parsed.version !== PROTOCOL_VERSION) {
    return {
      ok: false,
      code: "INVALID_PROTOCOL",
      messageVi: `Phi\xEAn b\u1EA3n giao th\u1EE9c kh\xF4ng t\u01B0\u01A1ng th\xEDch (y\xEAu c\u1EA7u ${PROTOCOL_VERSION}).`
    };
  }
  if (typeof parsed.type !== "string") {
    return {
      ok: false,
      code: "INVALID_SCHEMA",
      messageVi: "Thi\u1EBFu lo\u1EA1i th\xF4ng \u0111i\u1EC7p (type)."
    };
  }
  switch (parsed.type) {
    case "PING":
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "PING",
          requestId: typeof parsed.requestId === "string" ? parsed.requestId.slice(0, 64) : void 0,
          clientTimestamp: typeof parsed.clientTimestamp === "number" ? parsed.clientTimestamp : void 0
        }
      };
    case "CREATE_ROOM": {
      const requestId = sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`);
      const playerName = sanitizeDisplayText(parsed.playerName, 24, "");
      const roomName = sanitizeDisplayText(parsed.roomName, 36, `Ph\xF2ng c\u1EE7a ${playerName || "Ch\u1EE7 ph\xF2ng"}`);
      const capacity = typeof parsed.capacity === "number" ? Math.min(4, Math.max(2, Math.floor(parsed.capacity))) : 4;
      const disconnectPolicy = VALID_DISCONNECT_POLICIES.has(parsed.disconnectPolicy) ? parsed.disconnectPolicy : "AI_TAKEOVER";
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "CREATE_ROOM",
          requestId,
          playerName,
          roomName,
          capacity,
          token: parsed.token && typeof parsed.token === "object" ? parsed.token : void 0,
          cosmetics: parsed.cosmetics && typeof parsed.cosmetics === "object" ? sanitizePlayerCosmetics(parsed.cosmetics) : void 0,
          config: sanitizeRoomConfig(parsed.config),
          disconnectPolicy,
          reconnectGraceMs: typeof parsed.reconnectGraceMs === "number" ? Math.min(3e5, Math.max(500, Math.floor(parsed.reconnectGraceMs))) : void 0
        }
      };
    }
    case "JOIN_ROOM": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode) {
        return {
          ok: false,
          code: "INVALID_SCHEMA",
          messageVi: "M\xE3 ph\xF2ng kh\xF4ng h\u1EE3p l\u1EC7."
        };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "JOIN_ROOM",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          playerName: sanitizeDisplayText(parsed.playerName, 24, ""),
          token: parsed.token && typeof parsed.token === "object" ? parsed.token : void 0,
          cosmetics: parsed.cosmetics && typeof parsed.cosmetics === "object" ? sanitizePlayerCosmetics(parsed.cosmetics) : void 0
        }
      };
    }
    case "RECONNECT_ROOM": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      const playerId = sanitizeDisplayText(parsed.playerId, 24, "");
      const reconnectToken = typeof parsed.reconnectToken === "string" ? parsed.reconnectToken.trim() : "";
      if (!roomCode || !playerId || !reconnectToken) {
        return {
          ok: false,
          code: "INVALID_SCHEMA",
          messageVi: "Thi\u1EBFu th\xF4ng tin x\xE1c th\u1EF1c k\u1EBFt n\u1ED1i l\u1EA1i (roomCode, playerId, reconnectToken)."
        };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "RECONNECT_ROOM",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          playerId,
          reconnectToken
        }
      };
    }
    case "LEAVE_ROOM":
    case "START_MATCH": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "Thi\u1EBFu m\xE3 ph\xF2ng." };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: parsed.type,
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode
        }
      };
    }
    case "SET_READY": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode || typeof parsed.isReady !== "boolean") {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "Tr\u1EA1ng th\xE1i s\u1EB5n s\xE0ng kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "SET_READY",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          isReady: parsed.isReady
        }
      };
    }
    case "SELECT_TOKEN": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode || !parsed.token || typeof parsed.token.id !== "string") {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "L\u1EF1a ch\u1ECDn nh\xE2n v\u1EADt/qu\xE2n c\u1EDD kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "SELECT_TOKEN",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          token: {
            id: sanitizeDisplayText(parsed.token.id, 32, "token-vinfast"),
            name: sanitizeDisplayText(parsed.token.name, 36, "Qu\xE2n c\u1EDD"),
            symbol: sanitizeDisplayText(parsed.token.symbol, 8, "\u{1F697}"),
            colorHex: sanitizeDisplayText(parsed.token.colorHex, 16, "#06b6d4"),
            accentHex: sanitizeDisplayText(parsed.token.accentHex, 16, "#22d3ee")
          },
          playerName: parsed.playerName ? sanitizeDisplayText(parsed.playerName, 24) : void 0,
          cosmetics: parsed.cosmetics && typeof parsed.cosmetics === "object" ? sanitizePlayerCosmetics(parsed.cosmetics) : void 0
        }
      };
    }
    case "SEND_EMOTE": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      const emoteId = sanitizeDisplayText(parsed.emoteId, 32, "");
      const isQuickChat = isQuickChatId(emoteId);
      if (!roomCode || !emoteId || !isQuickChat && (!isValidCosmeticId(emoteId) || getCosmeticItem(emoteId)?.category !== "EMOTE")) {
        return { ok: false, code: "INVALID_COSMETIC", messageVi: "Bi\u1EC3u c\u1EA3m kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "SEND_EMOTE",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          emoteId
        }
      };
    }
    case "CONFIGURE_ROOM": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "Thi\u1EBFu m\xE3 ph\xF2ng." };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "CONFIGURE_ROOM",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          capacity: typeof parsed.capacity === "number" ? Math.min(4, Math.max(2, Math.floor(parsed.capacity))) : void 0,
          config: sanitizeRoomConfig(parsed.config),
          disconnectPolicy: VALID_DISCONNECT_POLICIES.has(parsed.disconnectPolicy) ? parsed.disconnectPolicy : void 0
        }
      };
    }
    case "CONFIGURE_SEAT_AI": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode || typeof parsed.seatIndex !== "number" || parsed.seatIndex < 0 || parsed.seatIndex > 3 || typeof parsed.isAI !== "boolean") {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "Th\xF4ng tin c\u1EA5u h\xECnh v\u1ECB tr\xED AI kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "CONFIGURE_SEAT_AI",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          seatIndex: Math.floor(parsed.seatIndex),
          isAI: parsed.isAI,
          aiPersonality: VALID_PERSONALITIES.has(parsed.aiPersonality) ? parsed.aiPersonality : "STRATEGIST",
          aiDifficulty: VALID_DIFFICULTIES.has(parsed.aiDifficulty) ? parsed.aiDifficulty : "NORMAL",
          name: parsed.name ? sanitizeDisplayText(parsed.name, 24) : void 0
        }
      };
    }
    case "SUBMIT_ACTION": {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      const actionId = sanitizeDisplayText(parsed.actionId, 64, "");
      if (!roomCode || !actionId || !parsed.intent || typeof parsed.intent !== "object") {
        return {
          ok: false,
          code: "INVALID_SCHEMA",
          messageVi: "Thi\u1EBFu th\xF4ng tin h\xE0nh \u0111\u1ED9ng (roomCode, actionId, intent)."
        };
      }
      const intentValidation = validateClientIntentPayload(parsed.intent);
      if (!intentValidation.ok || !intentValidation.value) {
        return {
          ok: false,
          code: intentValidation.code || "INVALID_SCHEMA",
          messageVi: intentValidation.messageVi || "H\xE0nh \u0111\u1ED9ng kh\xF4ng h\u1EE3p l\u1EC7."
        };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: "SUBMIT_ACTION",
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          actionId,
          expectedStateVersion: typeof parsed.expectedStateVersion === "number" ? Math.floor(parsed.expectedStateVersion) : void 0,
          intent: intentValidation.value
        }
      };
    }
    default:
      return {
        ok: false,
        code: "INVALID_SCHEMA",
        messageVi: `Kh\xF4ng h\u1ED7 tr\u1EE3 lo\u1EA1i th\xF4ng \u0111i\u1EC7p: ${String(parsed.type).slice(0, 32)}`
      };
  }
}
function validateClientIntentPayload(rawIntent) {
  if (!rawIntent || typeof rawIntent !== "object" || typeof rawIntent.type !== "string") {
    return {
      ok: false,
      code: "INVALID_SCHEMA",
      messageVi: "Payload h\xE0nh \u0111\u1ED9ng kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  if (FORBIDDEN_CLIENT_INTENT_TYPES.has(rawIntent.type)) {
    return {
      ok: false,
      code: "FORBIDDEN_CLIENT_ACTION",
      messageVi: `T\u1EEB ch\u1ED1i b\u1EA3o m\u1EADt: Client kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p t\u1EF1 quy\u1EBFt \u0111\u1ECBnh [${rawIntent.type}].`
    };
  }
  for (const key of Object.keys(rawIntent)) {
    if (FORBIDDEN_INTENT_KEYS.has(key)) {
      return {
        ok: false,
        code: "FORBIDDEN_CLIENT_ACTION",
        messageVi: `T\u1EEB ch\u1ED1i b\u1EA3o m\u1EADt: Ph\xE1t hi\u1EC7n tr\u01B0\u1EDDng d\u1EEF li\u1EC7u gi\u1EA3 m\u1EA1o [${key}] t\u1EEB client.`
      };
    }
  }
  switch (rawIntent.type) {
    case "ROLL_DICE":
    case "PASS_AUCTION_BID":
    case "PAY_DETENTION_BAIL":
    case "USE_DETENTION_CARD":
    case "RESOLVE_CHAOS":
    case "RESOLVE_DEBT":
    case "END_TURN":
    case "DECLARE_BANKRUPTCY":
      return { ok: true, value: { type: rawIntent.type } };
    case "BUY_PROPERTY":
    case "UPGRADE_PROPERTY":
    case "DOWNGRADE_PROPERTY":
    case "MORTGAGE_PROPERTY":
    case "UNMORTGAGE_PROPERTY":
    case "SELL_PROPERTY": {
      if (typeof rawIntent.tileId !== "number" || !Number.isInteger(rawIntent.tileId) || rawIntent.tileId < 0 || rawIntent.tileId >= 40) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "M\xE3 \xF4 \u0111\u1EA5t (tileId) kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return { ok: true, value: { type: rawIntent.type, tileId: rawIntent.tileId } };
    }
    case "START_AUCTION":
    case "DECLINE_PROPERTY_PURCHASE": {
      const tileId = typeof rawIntent.tileId === "number" && Number.isInteger(rawIntent.tileId) ? rawIntent.tileId : void 0;
      return { ok: true, value: { type: rawIntent.type, tileId } };
    }
    case "PLACE_AUCTION_BID": {
      if (typeof rawIntent.bidAmount !== "number" || !Number.isFinite(rawIntent.bidAmount) || rawIntent.bidAmount <= 0 || rawIntent.bidAmount > 1e6) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "M\u1EE9c gi\xE1 \u0111\u1EA5u kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return {
        ok: true,
        value: { type: "PLACE_AUCTION_BID", bidAmount: Math.floor(rawIntent.bidAmount) }
      };
    }
    case "SETTLE_PARTIAL_DEBT": {
      const amount = typeof rawIntent.amount === "number" && Number.isFinite(rawIntent.amount) && rawIntent.amount > 0 ? Math.floor(rawIntent.amount) : void 0;
      return { ok: true, value: { type: "SETTLE_PARTIAL_DEBT", amount } };
    }
    case "PROPOSE_TRADE":
    case "COUNTER_TRADE": {
      const p = rawIntent.proposal;
      if (!p || typeof p !== "object" || typeof p.senderPlayerId !== "string" || typeof p.targetPlayerId !== "string" || typeof p.offeredCash !== "number" || typeof p.requestedCash !== "number" || !Array.isArray(p.offeredPropertyIds) || !Array.isArray(p.requestedPropertyIds) || p.offeredCash < 0 || p.requestedCash < 0) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "H\u1EE3p \u0111\u1ED3ng \u0111\u1EC1 ngh\u1ECB giao d\u1ECBch kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return {
        ok: true,
        value: {
          type: rawIntent.type,
          proposal: {
            senderPlayerId: sanitizeDisplayText(p.senderPlayerId, 24, ""),
            targetPlayerId: sanitizeDisplayText(p.targetPlayerId, 24, ""),
            offeredCash: Math.floor(p.offeredCash),
            requestedCash: Math.floor(p.requestedCash),
            offeredPropertyIds: p.offeredPropertyIds.filter((id) => typeof id === "number" && Number.isInteger(id) && id >= 0 && id < 40).slice(0, 28),
            requestedPropertyIds: p.requestedPropertyIds.filter((id) => typeof id === "number" && Number.isInteger(id) && id >= 0 && id < 40).slice(0, 28),
            offeredJailCards: typeof p.offeredJailCards === "number" ? Math.max(0, Math.floor(p.offeredJailCards)) : 0,
            requestedJailCards: typeof p.requestedJailCards === "number" ? Math.max(0, Math.floor(p.requestedJailCards)) : 0
          }
        }
      };
    }
    case "ACCEPT_TRADE":
    case "REJECT_TRADE":
    case "CANCEL_TRADE": {
      return {
        ok: true,
        value: {
          type: rawIntent.type,
          tradeId: typeof rawIntent.tradeId === "string" ? rawIntent.tradeId.slice(0, 64) : void 0
        }
      };
    }
    case "CHOOSE_BRANCH_PATH":
    case "CHOOSE_PATH": {
      const targetNodeId = sanitizeDisplayText(rawIntent.targetNodeId, 64, "");
      if (!targetNodeId) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "Thi\u1EBFu m\xE3 nh\xE1nh \u0111\xEDch (targetNodeId)." };
      }
      return {
        ok: true,
        value: { type: rawIntent.type, targetNodeId }
      };
    }
    case "PLACE_TRAP": {
      const nodeId = sanitizeDisplayText(rawIntent.nodeId, 64, "");
      const trapType = sanitizeDisplayText(rawIntent.trapType, 32, "");
      if (!nodeId || !trapType) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "Th\xF4ng tin \u0111\u1EB7t b\u1EABy kh\xF4ng h\u1EE3p l\u1EC7." };
      }
      return {
        ok: true,
        value: { type: "PLACE_TRAP", nodeId, trapType }
      };
    }
    case "SELECT_BUSINESS_TYPE": {
      const businessId = sanitizeDisplayText(rawIntent.businessId, 64, "");
      if (!businessId) {
        return { ok: false, code: "INVALID_SCHEMA", messageVi: "Thi\u1EBFu m\xE3 lo\u1EA1i h\xECnh kinh doanh (businessId)." };
      }
      const tileId = typeof rawIntent.tileId === "number" && Number.isInteger(rawIntent.tileId) ? rawIntent.tileId : void 0;
      const nodeId = typeof rawIntent.nodeId === "string" ? sanitizeDisplayText(rawIntent.nodeId, 64) : void 0;
      return {
        ok: true,
        value: { type: "SELECT_BUSINESS_TYPE", tileId, nodeId, businessId }
      };
    }
    case "SELECT_TILE_DETAIL":
      return {
        ok: false,
        code: "FORBIDDEN_CLIENT_ACTION",
        messageVi: "Chi ti\u1EBFt \xF4 \u0111\u1EA5t l\xE0 thao t\xE1c xem ri\xEAng, kh\xF4ng g\u1EEDi l\xEAn m\xE1y ch\u1EE7."
      };
    default:
      return {
        ok: false,
        code: "FORBIDDEN_CLIENT_ACTION",
        messageVi: `Lo\u1EA1i h\xE0nh \u0111\u1ED9ng kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p: ${String(rawIntent.type).slice(0, 32)}`
      };
  }
}
var SlidingWindowRateLimiter = class {
  constructor(maxRequests = 30, windowMs = 5e3) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  buckets = /* @__PURE__ */ new Map();
  allow(key, now = Date.now()) {
    const existing = this.buckets.get(key);
    if (!existing || now - existing.windowStart >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (existing.count >= this.maxRequests) {
      return false;
    }
    existing.count += 1;
    return true;
  }
  cleanup(now = Date.now()) {
    for (const [k, v] of this.buckets.entries()) {
      if (now - v.windowStart >= this.windowMs * 2) {
        this.buckets.delete(k);
      }
    }
  }
};

// src/server/roomManager.ts
function uniqueSeatName(seats, desired) {
  const taken = new Set(seats.map((s) => s.name.trim().toLowerCase()));
  if (!taken.has(desired.trim().toLowerCase())) return desired;
  for (let n = 2; n <= 9; n++) {
    const suffix = ` ${n}`;
    const candidate = `${desired.slice(0, 24 - suffix.length)}${suffix}`;
    if (!taken.has(candidate.trim().toLowerCase())) return candidate;
  }
  return desired;
}
function sanitizeStateForClient(state, viewingPlayerId) {
  if (!state) return null;
  const baseLogs = Array.isArray(state.logs) ? state.logs.slice(0, 80) : void 0;
  const sanitizedConfig = state.config ? { ...state.config } : void 0;
  if (sanitizedConfig) {
    delete sanitizedConfig.seed;
  }
  return {
    ...state,
    ...sanitizedConfig ? { config: sanitizedConfig } : {},
    placedTraps: state.placedTraps?.map((trap) => {
      if (!trap.revealed && trap.ownerPlayerId !== viewingPlayerId) {
        return {
          ...trap,
          trapType: "HIDDEN",
          ownerPlayerId: void 0
        };
      }
      return trap;
    }),
    ...baseLogs ? { logs: baseLogs } : {}
  };
}
var RoomManager = class {
  constructor(options) {
    this.options = options;
    this.defaultReconnectGraceMs = options.defaultReconnectGraceMs ?? 6e4;
    this.roomExpirationMs = options.roomExpirationMs ?? 2 * 60 * 60 * 1e3;
    this.aiActionDelayMs = options.aiActionDelayMs ?? 120;
    this.turnTimeoutMs = options.turnTimeoutMs ?? 6e4;
    this.turnPostponeMs = options.turnPostponeMs ?? 3e4;
    this.recoverRoomsFromRepository();
    this.turnTicker = setInterval(() => this.tickTurnTimers(), 1e3);
    this.turnTicker.unref?.();
  }
  rooms = /* @__PURE__ */ new Map();
  defaultReconnectGraceMs;
  roomExpirationMs;
  aiActionDelayMs;
  turnTimeoutMs;
  turnPostponeMs;
  turnTicker = null;
  /**
   * Restores all active non-expired rooms from SQLite on server startup / restart.
   */
  recoverRoomsFromRepository() {
    const now = Date.now();
    const persistedRooms = this.options.repository.loadAllActiveRooms(now);
    let recoveredCount = 0;
    for (const rec of persistedRooms) {
      const prng = new SeededPRNG(rec.secretSeed);
      prng.state = rec.prngState;
      const updatedSeats = rec.seats.map((s) => {
        if (!s.isAI && s.connected) {
          return {
            ...s,
            connected: false,
            disconnectedAt: s.disconnectedAt ?? now,
            reconnectDeadlineAt: s.reconnectDeadlineAt ?? now + rec.reconnectGraceMs
          };
        }
        return s;
      });
      const managed = {
        ...rec,
        seats: updatedSeats,
        prng,
        aiStepCount: 0,
        lastActivePlayerId: null,
        aiTimer: null,
        disconnectTimers: /* @__PURE__ */ new Map(),
        turnDeadlineAt: null
      };
      this.rooms.set(managed.roomCode, managed);
      if (managed.status === "IN_GAME") {
        for (const seat of managed.seats) {
          if (!seat.isAI && !seat.connected && !seat.takenOverByAI) {
            this.scheduleDisconnectGraceTimer(managed, seat.playerId, managed.reconnectGraceMs);
          }
        }
        this.scheduleAITurnIfNeeded(managed);
        this.syncTurnDeadline(managed);
      }
      recoveredCount += 1;
    }
    return recoveredCount;
  }
  toPublicSummary(room) {
    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      status: room.status,
      capacity: room.capacity,
      hostPlayerId: room.hostPlayerId,
      seats: room.seats.map((s) => ({ ...s })),
      config: {
        ...room.config,
        worldId: room.config.worldId ?? DEFAULT_WORLD_ID,
        seed: void 0
      },
      disconnectPolicy: room.disconnectPolicy,
      reconnectGraceMs: room.reconnectGraceMs,
      stateVersion: room.stateVersion,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      expiresAt: room.expiresAt,
      turnDeadlineAt: room.turnDeadlineAt
    };
  }
  /**
   * The turn clock runs only for a connected human whose turn it is in a playing room.
   * AI seats, disconnected seats (grace period) and finished matches have no deadline.
   */
  computeTurnDeadline(room, now) {
    if (room.status !== "IN_GAME" || !room.gameState || room.gameState.status !== "PLAYING") {
      return null;
    }
    const actor = room.gameState.players[room.gameState.activePlayerIndex];
    const seat = actor ? room.seats.find((s) => s.playerId === actor.id) : void 0;
    if (!seat || seat.isAI || !seat.connected) return null;
    return now + this.turnTimeoutMs;
  }
  syncTurnDeadline(room, now = Date.now()) {
    room.turnDeadlineAt = this.computeTurnDeadline(room, now);
  }
  /**
   * Server-side turn clock. Expired roll/end-turn decisions are executed through the same
   * authoritative pipeline as player intents. Other phases (auction, trade, debt, chaos) are
   * postponed rather than decided on the player's behalf.
   */
  tickTurnTimers(now = Date.now()) {
    for (const room of this.rooms.values()) {
      if (room.turnDeadlineAt === null || now < room.turnDeadlineAt) continue;
      this.expireTurn(room, now);
    }
  }
  expireTurn(room, now) {
    const state = room.gameState;
    const actor = state ? state.players[state.activePlayerIndex] : void 0;
    const seat = actor ? room.seats.find((s) => s.playerId === actor.id) : void 0;
    if (!state || !actor || !seat || seat.isAI || !seat.connected || room.status !== "IN_GAME") {
      this.syncTurnDeadline(room, now);
      return;
    }
    let intent = null;
    if (state.turnPhase === "WAITING_FOR_ROLL" || state.turnPhase === "ROLLING") {
      intent = { type: "ROLL_DICE" };
    } else if (state.turnPhase === "ACTION_MENU") {
      intent = { type: "END_TURN" };
    }
    const postpone = (reason) => {
      room.turnDeadlineAt = now + this.turnPostponeMs;
      this.options.onBroadcastToRoom(room.roomCode, {
        version: PROTOCOL_VERSION,
        type: "ROOM_UPDATED",
        room: this.toPublicSummary(room),
        reason,
        serverTimestamp: Date.now()
      });
    };
    if (!intent) {
      postpone(`${seat.name} ch\u01B0a quy\u1EBFt \u0111\u1ECBnh k\u1ECBp. H\u1EA1n \u0111\u01B0\u1EE3c gia h\u1EA1n th\xEAm 30 gi\xE2y.`);
      return;
    }
    const actionId = `timeout-${room.roomCode}-v${room.stateVersion}-${now}`;
    const result = this.executeAuthoritativeIntent(room, actor.id, actionId, intent);
    if (!result.ok || !result.data) {
      postpone(`${seat.name} h\u1EBFt gi\u1EDD nh\u01B0ng ch\u01B0a th\u1EC3 t\u1EF1 \u0111\u1ED9ng th\u1EF1c hi\u1EC7n n\u01B0\u1EDBc \u0111i.`);
      return;
    }
    this.options.onBroadcastToRoom(room.roomCode, {
      version: PROTOCOL_VERSION,
      type: "STATE_SYNC",
      roomCode: room.roomCode,
      stateVersion: result.data.stateVersion,
      lastActionType: result.data.actionType,
      lastActorPlayerId: result.data.actorPlayerId,
      actionId,
      gameState: result.data.gameState,
      room: result.data.room,
      serverTimestamp: Date.now()
    });
    if (result.data.room.status === "FINISHED") {
      this.options.onBroadcastToRoom(room.roomCode, {
        version: PROTOCOL_VERSION,
        type: "MATCH_FINISHED",
        roomCode: room.roomCode,
        winner: result.data.gameState.winner,
        gameState: result.data.gameState,
        room: result.data.room,
        stateVersion: result.data.stateVersion,
        serverTimestamp: Date.now()
      });
    }
  }
  persistRoom(room) {
    room.prngState = room.prng.getState();
    room.updatedAt = Date.now();
    const record = {
      roomId: room.roomId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      status: room.status,
      capacity: room.capacity,
      hostPlayerId: room.hostPlayerId,
      seats: room.seats,
      reconnectTokenHashes: room.reconnectTokenHashes,
      config: room.config,
      disconnectPolicy: room.disconnectPolicy,
      reconnectGraceMs: room.reconnectGraceMs,
      stateVersion: room.stateVersion,
      prngState: room.prngState,
      secretSeed: room.secretSeed,
      gameState: room.gameState,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      expiresAt: room.expiresAt
    };
    this.options.repository.saveRoom(record);
  }
  updateLobbyStatus(room) {
    if (room.status === "IN_GAME" || room.status === "FINISHED" || room.status === "EXPIRED") {
      return;
    }
    const activeParticipants = room.seats.length;
    const allReady = room.seats.every((s) => s.isAI || s.isReady);
    room.status = activeParticipants >= 2 && allReady ? "READY" : "WAITING";
  }
  createRoom(params) {
    const now = Date.now();
    let worldIdForRoom = DEFAULT_WORLD_ID;
    if (params.config?.worldId !== void 0) {
      if (!isWorldSelectable(params.config.worldId)) {
        return {
          ok: false,
          code: "INVALID_WORLD",
          messageVi: "Th\u1EBF gi\u1EDBi \u0111\u01B0\u1EE3c ch\u1ECDn kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c ch\u01B0a m\u1EDF."
        };
      }
      worldIdForRoom = params.config.worldId;
    }
    const existingCodes = new Set(this.rooms.keys());
    const roomCode = generateSecureRoomCode(existingCodes);
    const roomId = `room-${crypto2.randomUUID()}`;
    const capacity = Math.min(4, Math.max(2, params.capacity ?? 4));
    const secretSeed = this.options.deterministicTestSeed ?? generateSecureSeed32();
    const prng = new SeededPRNG(secretSeed);
    const assignedPlayerId = "player-1";
    const reconnectToken = generateSecureToken(24);
    const reconnectHash = hashSecretToken(reconnectToken);
    const hostToken = params.token || DEFAULT_PLAYER_TOKENS[0];
    const hostSeat = {
      seatIndex: 0,
      playerId: assignedPlayerId,
      sessionPlayerId: params.sessionPlayerId,
      name: sanitizeDisplayText(params.playerName, 24, "Ng\u01B0\u1EDDi ch\u01A1i 1"),
      token: hostToken,
      isHost: true,
      isReady: true,
      isAI: false,
      connected: true,
      disconnectedAt: null,
      reconnectDeadlineAt: null,
      cosmetics: params.cosmetics ? sanitizePlayerCosmetics(params.cosmetics) : void 0
    };
    const config = {
      ...INITIAL_GAME_CONFIG,
      startingCash: params.config?.startingCash ? Math.min(5e3, Math.max(500, Math.floor(params.config.startingCash))) : INITIAL_GAME_CONFIG.startingCash,
      // 0 = no round cap: the match ends on bankruptcy.
      maxRounds: params.config?.maxRounds ? Math.max(0, Math.floor(params.config.maxRounds)) : 0,
      seed: secretSeed,
      worldId: worldIdForRoom,
      gameMode: params.config?.gameMode || "CLASSIC"
    };
    const managed = {
      roomId,
      roomCode,
      roomName: sanitizeDisplayText(params.roomName, 36, `Ph\xF2ng c\u1EE7a ${hostSeat.name}`),
      status: "WAITING",
      capacity,
      hostPlayerId: assignedPlayerId,
      seats: [hostSeat],
      reconnectTokenHashes: {
        [assignedPlayerId]: reconnectHash
      },
      config,
      disconnectPolicy: params.disconnectPolicy || "AI_TAKEOVER",
      reconnectGraceMs: params.reconnectGraceMs ?? this.defaultReconnectGraceMs,
      stateVersion: 1,
      prngState: prng.getState(),
      secretSeed,
      gameState: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.roomExpirationMs,
      prng,
      aiStepCount: 0,
      lastActivePlayerId: null,
      aiTimer: null,
      disconnectTimers: /* @__PURE__ */ new Map(),
      turnDeadlineAt: null
    };
    this.rooms.set(roomCode, managed);
    this.persistRoom(managed);
    return {
      ok: true,
      data: {
        room: this.toPublicSummary(managed),
        assignedPlayerId,
        reconnectToken,
        gameState: null
      }
    };
  }
  joinRoom(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return {
        ok: false,
        code: "ROOM_NOT_FOUND",
        messageVi: `Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng v\u1EDBi m\xE3 [${params.roomCode}].`
      };
    }
    if (room.status === "EXPIRED" || Date.now() > room.expiresAt) {
      room.status = "EXPIRED";
      this.persistRoom(room);
      return {
        ok: false,
        code: "ROOM_EXPIRED",
        messageVi: "Ph\xF2ng ch\u01A1i n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n."
      };
    }
    if (room.seats.some((s) => !s.isAI && s.sessionPlayerId === params.sessionPlayerId)) {
      return {
        ok: false,
        code: "DUPLICATE_JOIN",
        messageVi: "Phi\xEAn k\u1EBFt n\u1ED1i c\u1EE7a b\u1EA1n \u0111\xE3 \u1EDF trong ph\xF2ng n\xE0y."
      };
    }
    if (room.status === "IN_GAME" || room.status === "STARTING" || room.status === "FINISHED") {
      return {
        ok: false,
        code: "ROOM_ALREADY_STARTED",
        messageVi: "Tr\u1EADn \u0111\u1EA5u \u0111\xE3 b\u1EAFt \u0111\u1EA7u. H\xE3y d\xF9ng t\xEDnh n\u0103ng K\u1EBFt n\u1ED1i l\u1EA1i (Reconnect) n\u1EBFu b\u1EA1n l\xE0 th\xE0nh vi\xEAn c\u0169."
      };
    }
    if (room.seats.length >= room.capacity) {
      return {
        ok: false,
        code: "ROOM_FULL",
        messageVi: `Ph\xF2ng \u0111\xE3 \u0111\u1EA7y (${room.capacity}/${room.capacity} ng\u01B0\u1EDDi ch\u01A1i).`
      };
    }
    const usedIndices = new Set(room.seats.map((s) => s.seatIndex));
    let seatIndex = 0;
    while (usedIndices.has(seatIndex) && seatIndex < room.capacity) {
      seatIndex += 1;
    }
    const assignedPlayerId = `player-${seatIndex + 1}`;
    const reconnectToken = generateSecureToken(24);
    room.reconnectTokenHashes[assignedPlayerId] = hashSecretToken(reconnectToken);
    const usedTokenIds = new Set(room.seats.map((s) => s.token.id));
    const chosenToken = params.token && !usedTokenIds.has(params.token.id) ? params.token : DEFAULT_PLAYER_TOKENS.find((t) => !usedTokenIds.has(t.id)) || DEFAULT_PLAYER_TOKENS[seatIndex % DEFAULT_PLAYER_TOKENS.length];
    const newSeat = {
      seatIndex,
      playerId: assignedPlayerId,
      sessionPlayerId: params.sessionPlayerId,
      name: uniqueSeatName(
        room.seats,
        sanitizeDisplayText(params.playerName, 24, `Ng\u01B0\u1EDDi ch\u01A1i ${seatIndex + 1}`)
      ),
      token: chosenToken,
      isHost: false,
      isReady: true,
      isAI: false,
      connected: true,
      disconnectedAt: null,
      reconnectDeadlineAt: null,
      cosmetics: params.cosmetics ? sanitizePlayerCosmetics(params.cosmetics) : void 0
    };
    room.seats.push(newSeat);
    room.seats.sort((a, b) => a.seatIndex - b.seatIndex);
    this.renormalizeLobbyPlayerIds(room);
    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);
    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        assignedPlayerId: newSeat.playerId,
        reconnectToken,
        gameState: sanitizeStateForClient(room.gameState)
      }
    };
  }
  renormalizeLobbyPlayerIds(room) {
    if (room.status === "IN_GAME" || room.status === "FINISHED") return;
    room.seats.sort((a, b) => a.seatIndex - b.seatIndex);
    const updatedHashes = {};
    room.seats.forEach((seat, idx) => {
      const oldPlayerId = seat.playerId;
      const newPlayerId = `player-${idx + 1}`;
      seat.seatIndex = idx;
      seat.playerId = newPlayerId;
      if (room.reconnectTokenHashes[oldPlayerId]) {
        updatedHashes[newPlayerId] = room.reconnectTokenHashes[oldPlayerId];
      }
      if (seat.isHost) {
        room.hostPlayerId = newPlayerId;
      }
    });
    room.reconnectTokenHashes = updatedHashes;
  }
  reconnectPlayer(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return {
        ok: false,
        code: "ROOM_NOT_FOUND",
        messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng c\u1EA7n k\u1EBFt n\u1ED1i l\u1EA1i."
      };
    }
    if (room.status === "EXPIRED" || Date.now() > room.expiresAt) {
      return {
        ok: false,
        code: "ROOM_EXPIRED",
        messageVi: "Ph\xF2ng ch\u01A1i \u0111\xE3 h\u1EBFt h\u1EA1n."
      };
    }
    const expectedHash = room.reconnectTokenHashes[params.playerId];
    if (!verifySecretTokenHash(params.reconnectToken, expectedHash)) {
      return {
        ok: false,
        code: "INVALID_RECONNECT_TOKEN",
        messageVi: "M\xE3 x\xE1c th\u1EF1c k\u1EBFt n\u1ED1i l\u1EA1i (Reconnect Token) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB gi\u1EA3 m\u1EA1o."
      };
    }
    const seat = room.seats.find((s) => s.playerId === params.playerId);
    if (!seat) {
      return {
        ok: false,
        code: "NOT_ROOM_MEMBER",
        messageVi: "Kh\xF4ng t\xECm th\u1EA5y v\u1ECB tr\xED ng\u01B0\u1EDDi ch\u01A1i trong ph\xF2ng."
      };
    }
    const existingTimer = room.disconnectTimers.get(params.playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      room.disconnectTimers.delete(params.playerId);
    }
    if (room.aiTimer) {
      clearTimeout(room.aiTimer);
      room.aiTimer = null;
    }
    seat.connected = true;
    seat.disconnectedAt = null;
    seat.reconnectDeadlineAt = null;
    seat.sessionPlayerId = params.newSessionPlayerId;
    if (seat.takenOverByAI && room.gameState) {
      seat.isAI = false;
      seat.takenOverByAI = false;
      room.gameState = {
        ...room.gameState,
        players: room.gameState.players.map(
          (p) => p.id === seat.playerId ? { ...p, isAI: false } : p
        )
      };
    }
    this.syncTurnDeadline(room);
    this.persistRoom(room);
    this.scheduleAITurnIfNeeded(room);
    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        assignedPlayerId: seat.playerId,
        reconnectToken: params.reconnectToken,
        gameState: sanitizeStateForClient(room.gameState)
      }
    };
  }
  setReady(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." };
    }
    const seat = room.seats.find((s) => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return { ok: false, code: "NOT_ROOM_MEMBER", messageVi: "B\u1EA1n kh\xF4ng ph\u1EA3i l\xE0 th\xE0nh vi\xEAn c\u1EE7a ph\xF2ng n\xE0y." };
    }
    seat.isReady = params.isReady;
    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }
  selectToken(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." };
    }
    if (room.status === "IN_GAME" || room.status === "FINISHED") {
      return { ok: false, code: "ROOM_ALREADY_STARTED", messageVi: "Kh\xF4ng th\u1EC3 \u0111\u1ED5i nh\xE2n v\u1EADt khi tr\u1EADn \u0111\u1EA5u \u0111\xE3 b\u1EAFt \u0111\u1EA7u." };
    }
    const seat = room.seats.find((s) => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return { ok: false, code: "NOT_ROOM_MEMBER", messageVi: "B\u1EA1n kh\xF4ng ph\u1EA3i l\xE0 th\xE0nh vi\xEAn c\u1EE7a ph\xF2ng n\xE0y." };
    }
    seat.token = params.token;
    if (params.playerName) {
      seat.name = uniqueSeatName(
        room.seats.filter((s) => s !== seat),
        sanitizeDisplayText(params.playerName, 24, seat.name)
      );
    }
    if (params.cosmetics) {
      seat.cosmetics = sanitizePlayerCosmetics(params.cosmetics);
    }
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }
  broadcastEmote(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." };
    }
    const seat = room.seats.find((s) => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return { ok: false, code: "NOT_ROOM_MEMBER", messageVi: "B\u1EA1n kh\xF4ng ph\u1EA3i l\xE0 th\xE0nh vi\xEAn c\u1EE7a ph\xF2ng n\xE0y." };
    }
    return {
      ok: true,
      data: {
        playerId: seat.playerId,
        playerName: seat.name,
        emoteId: params.emoteId,
        serverTimestamp: Date.now()
      }
    };
  }
  configureRoom(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." };
    }
    if (room.status === "IN_GAME" || room.status === "FINISHED") {
      return {
        ok: false,
        code: "ROOM_ALREADY_STARTED",
        messageVi: "Ch\u1EE7 ph\xF2ng kh\xF4ng th\u1EC3 thay \u0111\u1ED5i c\u1EA5u h\xECnh sau khi tr\u1EADn \u0111\u1EA5u \u0111\xE3 b\u1EAFt \u0111\u1EA7u."
      };
    }
    const hostSeat = room.seats.find((s) => s.playerId === room.hostPlayerId);
    if (!hostSeat || hostSeat.sessionPlayerId !== params.sessionPlayerId) {
      return {
        ok: false,
        code: "NOT_ROOM_HOST",
        messageVi: "Ch\u1EC9 ch\u1EE7 ph\xF2ng m\u1EDBi c\xF3 quy\u1EC1n thay \u0111\u1ED5i c\u1EA5u h\xECnh tr\u1EADn \u0111\u1EA5u."
      };
    }
    if (params.capacity !== void 0) {
      const nextCap = Math.min(4, Math.max(2, params.capacity));
      if (nextCap >= room.seats.filter((s) => !s.isAI).length) {
        room.capacity = nextCap;
        while (room.seats.length > room.capacity) {
          const aiIdx = room.seats.findIndex((s) => s.isAI);
          if (aiIdx >= 0) room.seats.splice(aiIdx, 1);
          else break;
        }
        this.renormalizeLobbyPlayerIds(room);
      }
    }
    if (params.config) {
      if (params.config.worldId !== void 0) {
        if (!isWorldSelectable(params.config.worldId)) {
          return {
            ok: false,
            code: "INVALID_WORLD",
            messageVi: "Th\u1EBF gi\u1EDBi \u0111\u01B0\u1EE3c ch\u1ECDn kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c ch\u01B0a m\u1EDF."
          };
        }
        room.config.worldId = params.config.worldId;
        room.config.worldVersion = getCatalogEntry(params.config.worldId)?.version;
      }
      if (typeof params.config.startingCash === "number") {
        room.config.startingCash = Math.min(5e3, Math.max(500, Math.floor(params.config.startingCash)));
      }
      if (typeof params.config.maxRounds === "number") {
        room.config.maxRounds = Math.max(0, Math.floor(params.config.maxRounds));
      }
      if (params.config.gameMode === "CLASSIC" || params.config.gameMode === "CHAOS") {
        room.config.gameMode = params.config.gameMode;
      }
    }
    if (params.disconnectPolicy) {
      room.disconnectPolicy = params.disconnectPolicy;
    }
    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }
  configureSeatAI(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." };
    }
    if (room.status === "IN_GAME" || room.status === "FINISHED") {
      return { ok: false, code: "ROOM_ALREADY_STARTED", messageVi: "Tr\u1EADn \u0111\u1EA5u \u0111\xE3 b\u1EAFt \u0111\u1EA7u." };
    }
    const hostSeat = room.seats.find((s) => s.playerId === room.hostPlayerId);
    if (!hostSeat || hostSeat.sessionPlayerId !== params.sessionPlayerId) {
      return { ok: false, code: "NOT_ROOM_HOST", messageVi: "Ch\u1EC9 ch\u1EE7 ph\xF2ng m\u1EDBi \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh AI." };
    }
    if (params.isAI) {
      const existing = room.seats.find((s) => s.seatIndex === params.seatIndex);
      if (existing && !existing.isAI) {
        return {
          ok: false,
          code: "UNAUTHORIZED_ACTION",
          messageVi: "Kh\xF4ng th\u1EC3 ghi \u0111\xE8 v\u1ECB tr\xED c\u1EE7a ng\u01B0\u1EDDi ch\u01A1i th\u1EADt b\u1EB1ng AI."
        };
      }
      if (!existing && room.seats.length >= room.capacity) {
        return { ok: false, code: "ROOM_FULL", messageVi: "Ph\xF2ng \u0111\xE3 \u0111\u1EE7 s\u1ED1 l\u01B0\u1EE3ng v\u1ECB tr\xED t\u1ED1i \u0111a." };
      }
      const personality = params.aiPersonality || "STRATEGIST";
      const difficulty = params.aiDifficulty || "NORMAL";
      const defaultName = params.name || `AI ${personality} #${params.seatIndex + 1}`;
      if (existing) {
        existing.aiPersonality = personality;
        existing.aiDifficulty = difficulty;
        existing.name = defaultName;
      } else {
        room.seats.push({
          seatIndex: params.seatIndex,
          playerId: `player-${room.seats.length + 1}`,
          sessionPlayerId: `AI-seat-${params.seatIndex}`,
          name: defaultName,
          token: DEFAULT_PLAYER_TOKENS[params.seatIndex % DEFAULT_PLAYER_TOKENS.length],
          isHost: false,
          isReady: true,
          isAI: true,
          aiPersonality: personality,
          aiDifficulty: difficulty,
          connected: true,
          disconnectedAt: null,
          reconnectDeadlineAt: null
        });
      }
    } else {
      const idx = room.seats.findIndex((s) => s.seatIndex === params.seatIndex && s.isAI);
      if (idx >= 0) {
        room.seats.splice(idx, 1);
      }
    }
    this.renormalizeLobbyPlayerIds(room);
    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }
  startMatch(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." };
    }
    if (room.status === "IN_GAME" || room.status === "FINISHED") {
      return { ok: false, code: "ROOM_ALREADY_STARTED", messageVi: "Tr\u1EADn \u0111\u1EA5u \u0111\xE3 b\u1EAFt \u0111\u1EA7u." };
    }
    const hostSeat = room.seats.find((s) => s.playerId === room.hostPlayerId);
    if (!hostSeat || hostSeat.sessionPlayerId !== params.sessionPlayerId) {
      return { ok: false, code: "NOT_ROOM_HOST", messageVi: "Ch\u1EC9 ch\u1EE7 ph\xF2ng m\u1EDBi c\xF3 quy\u1EC1n b\u1EAFt \u0111\u1EA7u tr\u1EADn \u0111\u1EA5u." };
    }
    if (room.seats.length < 2) {
      return {
        ok: false,
        code: "INVALID_GAME_ACTION",
        messageVi: "C\u1EA7n t\u1ED1i thi\u1EC3u 2 ng\u01B0\u1EDDi ch\u01A1i (ho\u1EB7c Ng\u01B0\u1EDDi + AI) \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u tr\u1EADn \u0111\u1EA5u."
      };
    }
    if (!room.seats.every((s) => s.isAI || s.isReady)) {
      return {
        ok: false,
        code: "INVALID_GAME_ACTION",
        messageVi: "T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i trong ph\xF2ng ph\u1EA3i nh\u1EA5n S\u1EB5n S\xE0ng tr\u01B0\u1EDBc khi b\u1EAFt \u0111\u1EA7u."
      };
    }
    this.renormalizeLobbyPlayerIds(room);
    room.status = "STARTING";
    const startAction = {
      type: "START_GAME",
      actionId: `start-${room.roomCode}-${Date.now()}`,
      players: room.seats.map((s) => ({
        name: s.name,
        token: s.token,
        isAI: s.isAI,
        aiPersonality: s.aiPersonality,
        aiDifficulty: s.aiDifficulty
      })),
      config: {
        ...room.config,
        seed: room.secretSeed
      }
    };
    const initialState = gameReducer(INITIAL_GAME_STATE, startAction);
    if (initialState.status !== "PLAYING") {
      room.status = "READY";
      return {
        ok: false,
        code: "INVALID_WORLD",
        messageVi: "Kh\xF4ng th\u1EC3 kh\u1EDFi t\u1EA1o tr\u1EADn \u0111\u1EA5u v\u1EDBi c\u1EA5u h\xECnh hi\u1EC7n t\u1EA1i."
      };
    }
    room.gameState = initialState;
    room.status = "IN_GAME";
    room.stateVersion += 1;
    room.aiStepCount = 0;
    room.lastActivePlayerId = initialState.players[initialState.activePlayerIndex]?.id || null;
    this.syncTurnDeadline(room);
    this.options.repository.saveRoomAndActionAudit(
      {
        roomId: room.roomId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        status: room.status,
        capacity: room.capacity,
        hostPlayerId: room.hostPlayerId,
        seats: room.seats,
        reconnectTokenHashes: room.reconnectTokenHashes,
        config: room.config,
        disconnectPolicy: room.disconnectPolicy,
        reconnectGraceMs: room.reconnectGraceMs,
        stateVersion: room.stateVersion,
        prngState: room.prng.getState(),
        secretSeed: room.secretSeed,
        gameState: room.gameState,
        createdAt: room.createdAt,
        updatedAt: Date.now(),
        expiresAt: room.expiresAt
      },
      {
        roomCode: room.roomCode,
        stateVersion: room.stateVersion,
        actionId: startAction.actionId,
        actorPlayerId: room.hostPlayerId,
        actionType: "START_GAME",
        payloadJson: JSON.stringify({ playersCount: room.seats.length }),
        timestamp: Date.now()
      }
    );
    this.scheduleAITurnIfNeeded(room);
    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        gameState: sanitizeStateForClient(room.gameState),
        stateVersion: room.stateVersion
      }
    };
  }
  /**
   * Authoritative execution of a client-submitted intent.
   */
  submitClientAction(params) {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." };
    }
    if (room.status !== "IN_GAME" || !room.gameState) {
      return {
        ok: false,
        code: "MATCH_NOT_ACTIVE",
        messageVi: "Tr\u1EADn \u0111\u1EA5u ch\u01B0a b\u1EAFt \u0111\u1EA7u ho\u1EB7c \u0111\xE3 k\u1EBFt th\xFAc."
      };
    }
    const seat = room.seats.find((s) => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return {
        ok: false,
        code: "NOT_ROOM_MEMBER",
        messageVi: "T\u1EEB ch\u1ED1i b\u1EA3o m\u1EADt: B\u1EA1n kh\xF4ng ph\u1EA3i l\xE0 th\xE0nh vi\xEAn h\u1EE3p l\u1EC7 c\u1EE7a ph\xF2ng n\xE0y."
      };
    }
    const actorPlayerId = seat.playerId;
    if (room.gameState.processedActionIds && room.gameState.processedActionIds.includes(params.actionId)) {
      return {
        ok: false,
        code: "DUPLICATE_ACTION",
        messageVi: "H\xE0nh \u0111\u1ED9ng tr\xF9ng l\u1EB7p (Duplicate Action ID) \u0111\xE3 b\u1ECB ch\u1EB7n."
      };
    }
    if (params.expectedStateVersion !== void 0 && params.expectedStateVersion !== room.stateVersion) {
      return {
        ok: false,
        code: "STALE_STATE_VERSION",
        messageVi: `Phi\xEAn b\u1EA3n tr\u1EA1ng th\xE1i \u0111\xE3 c\u0169 (Client: v${params.expectedStateVersion}, Server: v${room.stateVersion}).`
      };
    }
    return this.executeAuthoritativeIntent(room, actorPlayerId, params.actionId, params.intent);
  }
  executeAuthoritativeIntent(room, actorPlayerId, actionId, intent) {
    const currentState = room.gameState;
    const activePlayer = currentState.players[currentState.activePlayerIndex];
    if (intent.type === "ROLL_DICE") {
      if (!activePlayer || activePlayer.id !== actorPlayerId) {
        return {
          ok: false,
          code: "UNAUTHORIZED_ACTION",
          messageVi: "Kh\xF4ng ph\u1EA3i l\u01B0\u1EE3t c\u1EE7a b\u1EA1n \u0111\u1EC3 l\u1EAFc x\xFAc x\u1EAFc."
        };
      }
      if (currentState.turnPhase !== "WAITING_FOR_ROLL" && currentState.turnPhase !== "ROLLING") {
        return {
          ok: false,
          code: "INVALID_GAME_ACTION",
          messageVi: `Kh\xF4ng th\u1EC3 l\u1EAFc x\xFAc x\u1EAFc \u1EDF pha hi\u1EC7n t\u1EA1i (${currentState.turnPhase}).`
        };
      }
      const d1 = room.prng.nextInt(1, 6);
      const d2 = room.prng.nextInt(1, 6);
      let nextState2 = currentState;
      if (nextState2.turnPhase === "WAITING_FOR_ROLL") {
        nextState2 = gameReducer(nextState2, {
          type: "ROLL_DICE_START",
          senderPlayerId: actorPlayerId
        });
      }
      nextState2 = gameReducer(nextState2, {
        type: "ROLL_DICE_RESULT",
        dice: [d1, d2],
        senderPlayerId: actorPlayerId,
        actionId
      });
      if (nextState2 === currentState) {
        return {
          ok: false,
          code: "INVALID_GAME_ACTION",
          messageVi: "Kh\xF4ng th\u1EC3 th\u1EF1c hi\u1EC7n l\u1EAFc x\xFAc x\u1EAFc."
        };
      }
      return this.commitNewGameState(room, nextState2, actorPlayerId, actionId, "ROLL_DICE", {
        dice: [d1, d2]
      });
    }
    let canonicalAction;
    switch (intent.type) {
      case "PLACE_AUCTION_BID":
        canonicalAction = {
          type: "PLACE_AUCTION_BID",
          playerId: actorPlayerId,
          // Server binds playerId from verified session
          bidAmount: intent.bidAmount,
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      case "PASS_AUCTION_BID":
        canonicalAction = {
          type: "PASS_AUCTION_BID",
          playerId: actorPlayerId,
          // Server binds playerId from verified session
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      case "PROPOSE_TRADE": {
        if (intent.proposal.senderPlayerId !== actorPlayerId) {
          return {
            ok: false,
            code: "UNAUTHORIZED_ACTION",
            messageVi: "T\u1EEB ch\u1ED1i b\u1EA3o m\u1EADt: Kh\xF4ng th\u1EC3 m\u1EA1o danh ng\u01B0\u1EDDi ch\u01A1i kh\xE1c \u0111\u1EC3 g\u1EEDi \u0111\u1EC1 ngh\u1ECB giao d\u1ECBch."
          };
        }
        canonicalAction = {
          type: "PROPOSE_TRADE",
          proposal: {
            ...intent.proposal,
            senderPlayerId: actorPlayerId
          },
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      }
      case "COUNTER_TRADE": {
        if (!currentState.activeTrade || currentState.activeTrade.countered || currentState.activeTrade.targetPlayerId !== actorPlayerId) {
          return {
            ok: false,
            code: "UNAUTHORIZED_ACTION",
            messageVi: "Ch\u1EC9 ng\u01B0\u1EDDi nh\u1EADn \u0111\u1EC1 ngh\u1ECB \u0111\u01B0\u1EE3c \u0111i\u1EC1u ch\u1EC9nh ti\u1EC1n, v\xE0 ch\u1EC9 m\u1ED9t l\u1EA7n."
          };
        }
        canonicalAction = {
          type: "COUNTER_TRADE",
          proposal: {
            ...intent.proposal,
            senderPlayerId: actorPlayerId
          },
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      }
      case "ACCEPT_TRADE":
      case "REJECT_TRADE": {
        if (!currentState.activeTrade || getTradeResponderId(currentState.activeTrade) !== actorPlayerId) {
          return {
            ok: false,
            code: "UNAUTHORIZED_ACTION",
            messageVi: "Ch\u1EC9 b\xEAn \u0111ang \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u ph\u1EA3n h\u1ED3i m\u1EDBi c\xF3 quy\u1EC1n ch\u1EA5p nh\u1EADn ho\u1EB7c t\u1EEB ch\u1ED1i."
          };
        }
        canonicalAction = {
          type: intent.type,
          tradeId: intent.tradeId,
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      }
      case "CANCEL_TRADE": {
        if (!currentState.activeTrade || currentState.activeTrade.senderPlayerId !== actorPlayerId) {
          return {
            ok: false,
            code: "UNAUTHORIZED_ACTION",
            messageVi: "Ch\u1EC9 ng\u01B0\u1EDDi t\u1EA1o \u0111\u1EC1 ngh\u1ECB giao d\u1ECBch m\u1EDBi c\xF3 quy\u1EC1n h\u1EE7y."
          };
        }
        canonicalAction = {
          type: "CANCEL_TRADE",
          tradeId: intent.tradeId,
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      }
      case "DECLARE_BANKRUPTCY":
        canonicalAction = {
          type: "DECLARE_BANKRUPTCY",
          playerId: actorPlayerId,
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      case "CHOOSE_PATH":
      case "CHOOSE_BRANCH_PATH":
        canonicalAction = {
          type: "CHOOSE_BRANCH_PATH",
          targetNodeId: intent.targetNodeId,
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
      default:
        canonicalAction = {
          ...intent,
          senderPlayerId: actorPlayerId,
          actionId
        };
        break;
    }
    const nextState = gameReducer(currentState, canonicalAction);
    if (nextState === currentState) {
      return {
        ok: false,
        code: "INVALID_GAME_ACTION",
        messageVi: `N\u01B0\u1EDBc \u0111i [${intent.type}] kh\xF4ng h\u1EE3p l\u1EC7 trong b\u1ED1i c\u1EA3nh hi\u1EC7n t\u1EA1i.`
      };
    }
    return this.commitNewGameState(room, nextState, actorPlayerId, actionId, intent.type, intent);
  }
  commitNewGameState(room, nextState, actorPlayerId, actionId, actionType, auditPayload) {
    room.gameState = nextState;
    room.stateVersion += 1;
    if (nextState.status === "ENDED" || nextState.turnPhase === "GAME_OVER") {
      room.status = "FINISHED";
      if (room.aiTimer) {
        clearTimeout(room.aiTimer);
        room.aiTimer = null;
      }
    }
    const activePlayer = nextState.players[nextState.activePlayerIndex];
    if (activePlayer?.id !== room.lastActivePlayerId) {
      room.lastActivePlayerId = activePlayer?.id || null;
      room.aiStepCount = 0;
    }
    this.options.repository.saveRoomAndActionAudit(
      {
        roomId: room.roomId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        status: room.status,
        capacity: room.capacity,
        hostPlayerId: room.hostPlayerId,
        seats: room.seats,
        reconnectTokenHashes: room.reconnectTokenHashes,
        config: room.config,
        disconnectPolicy: room.disconnectPolicy,
        reconnectGraceMs: room.reconnectGraceMs,
        stateVersion: room.stateVersion,
        prngState: room.prng.getState(),
        secretSeed: room.secretSeed,
        gameState: room.gameState,
        createdAt: room.createdAt,
        updatedAt: Date.now(),
        expiresAt: room.expiresAt
      },
      {
        roomCode: room.roomCode,
        stateVersion: room.stateVersion,
        actionId,
        actorPlayerId,
        actionType,
        payloadJson: JSON.stringify(auditPayload),
        timestamp: Date.now()
      }
    );
    this.syncTurnDeadline(room);
    if (room.status === "IN_GAME") {
      this.scheduleAITurnIfNeeded(room);
    }
    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        gameState: sanitizeStateForClient(room.gameState),
        stateVersion: room.stateVersion,
        actorPlayerId,
        actionType
      }
    };
  }
  /**
   * Server-Authoritative AI Execution Pipeline.
   * AI decisions run on the server and pass through the exact same validation & reducer pipeline.
   */
  scheduleAITurnIfNeeded(room) {
    if (room.aiTimer) {
      clearTimeout(room.aiTimer);
      room.aiTimer = null;
    }
    if (room.status !== "IN_GAME" || !room.gameState || room.gameState.status !== "PLAYING") {
      return;
    }
    const aiActor = getActiveAIActor(room.gameState);
    if (!aiActor) {
      return;
    }
    room.aiTimer = setTimeout(() => {
      room.aiTimer = null;
      if (room.status !== "IN_GAME" || !room.gameState || room.gameState.status !== "PLAYING") {
        return;
      }
      const currentAIActor = getActiveAIActor(room.gameState);
      if (!currentAIActor) return;
      const decision = computeNextAIDecision(room.gameState, room.aiStepCount);
      if (!decision) return;
      room.gameState = gameReducer(room.gameState, {
        type: "RECORD_AI_DECISION",
        decision: decision.reason
      });
      const aiActionId = `ai-${room.roomCode}-v${room.stateVersion}-${Date.now()}`;
      let mappedIntent;
      if (decision.action.type === "ROLL_DICE_START") {
        mappedIntent = { type: "ROLL_DICE" };
        room.aiStepCount = 0;
      } else {
        if (decision.action.type !== "PLACE_AUCTION_BID" && decision.action.type !== "PASS_AUCTION_BID" && decision.action.type !== "ACCEPT_TRADE" && decision.action.type !== "REJECT_TRADE") {
          room.aiStepCount += 1;
        }
        mappedIntent = this.mapGameActionToClientIntent(decision.action);
      }
      const result = this.executeAuthoritativeIntent(
        room,
        currentAIActor.id,
        aiActionId,
        mappedIntent
      );
      if (result.ok && result.data) {
        this.options.onBroadcastToRoom(room.roomCode, {
          version: PROTOCOL_VERSION,
          type: "STATE_SYNC",
          roomCode: room.roomCode,
          stateVersion: result.data.stateVersion,
          lastActionType: result.data.actionType,
          lastActorPlayerId: result.data.actorPlayerId,
          actionId: aiActionId,
          gameState: result.data.gameState,
          room: result.data.room,
          serverTimestamp: Date.now()
        });
        if (result.data.room.status === "FINISHED") {
          this.options.onBroadcastToRoom(room.roomCode, {
            version: PROTOCOL_VERSION,
            type: "MATCH_FINISHED",
            roomCode: room.roomCode,
            winner: result.data.gameState.winner,
            gameState: result.data.gameState,
            room: result.data.room,
            stateVersion: result.data.stateVersion,
            serverTimestamp: Date.now()
          });
        }
      }
    }, this.aiActionDelayMs);
  }
  mapGameActionToClientIntent(action) {
    switch (action.type) {
      case "ROLL_DICE_START":
        return { type: "ROLL_DICE" };
      case "PLACE_AUCTION_BID":
        return { type: "PLACE_AUCTION_BID", bidAmount: action.bidAmount };
      case "PASS_AUCTION_BID":
        return { type: "PASS_AUCTION_BID" };
      case "DECLARE_BANKRUPTCY":
        return { type: "DECLARE_BANKRUPTCY" };
      default:
        return action;
    }
  }
  /**
   * Handles player disconnect or voluntary room leave, including host migration and grace timer.
   */
  handleSessionDisconnected(roomCode, sessionPlayerId, voluntaryLeave = false) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const seatIdx = room.seats.findIndex((s) => s.sessionPlayerId === sessionPlayerId);
    if (seatIdx < 0) return null;
    const seat = room.seats[seatIdx];
    const now = Date.now();
    let migratedHost;
    if (room.status === "WAITING" || room.status === "READY" || voluntaryLeave) {
      if (room.status === "WAITING" || room.status === "READY") {
        const wasHost = seat.isHost;
        room.seats.splice(seatIdx, 1);
        delete room.reconnectTokenHashes[seat.playerId];
        const remainingHumans = room.seats.filter((s) => !s.isAI);
        if (remainingHumans.length === 0) {
          room.status = "EXPIRED";
          this.persistRoom(room);
          return null;
        }
        if (wasHost) {
          room.seats.forEach((s) => s.isHost = false);
          remainingHumans[0].isHost = true;
          room.hostPlayerId = remainingHumans[0].playerId;
        }
        this.renormalizeLobbyPlayerIds(room);
        if (wasHost) {
          const newHost = room.seats.find((s) => s.isHost);
          if (newHost) {
            migratedHost = {
              newHostPlayerId: newHost.playerId,
              newHostName: newHost.name
            };
          }
        }
        this.updateLobbyStatus(room);
        room.stateVersion += 1;
        this.persistRoom(room);
        return {
          room: this.toPublicSummary(room),
          disconnectedPlayerId: seat.playerId,
          disconnectedPlayerName: seat.name,
          reconnectDeadlineAt: now,
          migratedHost
        };
      }
    }
    seat.connected = false;
    seat.disconnectedAt = now;
    seat.reconnectDeadlineAt = now + room.reconnectGraceMs;
    if (seat.isHost) {
      const nextHumanHost = room.seats.find((s) => !s.isAI && s.connected && s.playerId !== seat.playerId);
      if (nextHumanHost) {
        seat.isHost = false;
        nextHumanHost.isHost = true;
        room.hostPlayerId = nextHumanHost.playerId;
        migratedHost = {
          newHostPlayerId: nextHumanHost.playerId,
          newHostName: nextHumanHost.name
        };
      }
    }
    room.stateVersion += 1;
    this.syncTurnDeadline(room);
    this.persistRoom(room);
    if (room.status === "IN_GAME") {
      this.scheduleDisconnectGraceTimer(
        room,
        seat.playerId,
        voluntaryLeave ? 50 : room.reconnectGraceMs
      );
    }
    return {
      room: this.toPublicSummary(room),
      disconnectedPlayerId: seat.playerId,
      disconnectedPlayerName: seat.name,
      reconnectDeadlineAt: seat.reconnectDeadlineAt,
      migratedHost
    };
  }
  scheduleDisconnectGraceTimer(room, playerId, graceMs) {
    const existing = room.disconnectTimers.get(playerId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      room.disconnectTimers.delete(playerId);
      const seat = room.seats.find((s) => s.playerId === playerId);
      if (!seat || seat.connected || room.status !== "IN_GAME" || !room.gameState) {
        return;
      }
      if (room.disconnectPolicy === "FORFEIT") {
        const res = this.executeAuthoritativeIntent(
          room,
          playerId,
          `forfeit-${playerId}-${Date.now()}`,
          { type: "DECLARE_BANKRUPTCY" }
        );
        if (res.ok && res.data) {
          this.options.onBroadcastToRoom(room.roomCode, {
            version: PROTOCOL_VERSION,
            type: "STATE_SYNC",
            roomCode: room.roomCode,
            stateVersion: res.data.stateVersion,
            lastActionType: "DECLARE_BANKRUPTCY",
            lastActorPlayerId: playerId,
            actionId: `forfeit-${playerId}`,
            gameState: res.data.gameState,
            room: res.data.room,
            serverTimestamp: Date.now()
          });
        }
      } else {
        seat.isAI = true;
        seat.takenOverByAI = true;
        seat.aiPersonality = seat.aiPersonality || "STRATEGIST";
        seat.aiDifficulty = seat.aiDifficulty || "NORMAL";
        room.gameState = {
          ...room.gameState,
          players: room.gameState.players.map(
            (p) => p.id === playerId ? {
              ...p,
              isAI: true,
              aiPersonality: seat.aiPersonality,
              aiDifficulty: seat.aiDifficulty
            } : p
          ),
          logs: [
            {
              id: `ai-takeover-${Date.now()}`,
              timestamp: Date.now(),
              playerId,
              playerName: seat.name,
              message: `[T\u1EF0 \u0110\u1ED8NG TI\u1EBEP QU\u1EA2N] ${seat.name} m\u1EA5t k\u1EBFt n\u1ED1i qu\xE1 th\u1EDDi gian ch\u1EDD. AI Chi\u1EBFn L\u01B0\u1EE3c t\u1EA1m th\u1EDDi \u0111i\u1EC1u khi\u1EC3n cho \u0111\u1EBFn khi k\u1EBFt n\u1ED1i l\u1EA1i.`,
              type: "WARNING"
            },
            ...room.gameState.logs
          ]
        };
        room.stateVersion += 1;
        this.syncTurnDeadline(room);
        this.persistRoom(room);
        this.options.onBroadcastToRoom(room.roomCode, {
          version: PROTOCOL_VERSION,
          type: "ROOM_UPDATED",
          room: this.toPublicSummary(room),
          reason: `AI t\u1EA1m th\u1EDDi ti\u1EBFp qu\u1EA3n v\u1ECB tr\xED c\u1EE7a ${seat.name}.`,
          serverTimestamp: Date.now()
        });
        this.scheduleAITurnIfNeeded(room);
      }
    }, graceMs);
    room.disconnectTimers.set(playerId, timer);
  }
  /**
   * Synchronizes an external or newly persisted room from the SQLite repository into memory
   * (or refreshes an in-memory room if the database has a newer stateVersion).
   * Used by HTTP / Serverless polling transport and multi-worker deployments.
   */
  syncRoomFromRepository(roomCode) {
    const rec = this.options.repository.getRoom(roomCode);
    const existing = this.rooms.get(roomCode);
    if (!rec) {
      return existing || null;
    }
    if (existing && existing.stateVersion >= rec.stateVersion) {
      return existing;
    }
    const prng = new SeededPRNG(rec.secretSeed);
    prng.state = rec.prngState;
    const managed = {
      ...rec,
      prng,
      aiStepCount: existing?.aiStepCount ?? 0,
      lastActivePlayerId: existing?.lastActivePlayerId ?? null,
      aiTimer: existing?.aiTimer ?? null,
      disconnectTimers: existing?.disconnectTimers ?? /* @__PURE__ */ new Map(),
      turnDeadlineAt: existing?.turnDeadlineAt ?? null
    };
    this.rooms.set(roomCode, managed);
    this.syncTurnDeadline(managed);
    if (managed.status === "IN_GAME") {
      this.scheduleAITurnIfNeeded(managed);
    }
    return managed;
  }
  /**
   * Synchronously advances one pending AI decision step if an AI actor is currently active.
   * Useful in serverless / HTTP request-response environments where background timers may not persist across invocations.
   */
  stepAITurnSync(roomCode) {
    const room = this.syncRoomFromRepository(roomCode);
    if (!room || room.status !== "IN_GAME" || !room.gameState || room.gameState.status !== "PLAYING") {
      return false;
    }
    const currentAIActor = getActiveAIActor(room.gameState);
    if (!currentAIActor) return false;
    if (room.aiTimer) {
      clearTimeout(room.aiTimer);
      room.aiTimer = null;
    }
    const decision = computeNextAIDecision(room.gameState, room.aiStepCount);
    if (!decision) return false;
    room.gameState = gameReducer(room.gameState, {
      type: "RECORD_AI_DECISION",
      decision: decision.reason
    });
    const aiActionId = `ai-${room.roomCode}-v${room.stateVersion}-${Date.now()}`;
    let mappedIntent;
    if (decision.action.type === "ROLL_DICE_START") {
      mappedIntent = { type: "ROLL_DICE" };
      room.aiStepCount = 0;
    } else {
      if (decision.action.type !== "PLACE_AUCTION_BID" && decision.action.type !== "PASS_AUCTION_BID" && decision.action.type !== "ACCEPT_TRADE" && decision.action.type !== "REJECT_TRADE") {
        room.aiStepCount += 1;
      }
      mappedIntent = this.mapGameActionToClientIntent(decision.action);
    }
    const result = this.executeAuthoritativeIntent(
      room,
      currentAIActor.id,
      aiActionId,
      mappedIntent
    );
    if (result.ok && result.data) {
      this.options.onBroadcastToRoom(room.roomCode, {
        version: PROTOCOL_VERSION,
        type: "STATE_SYNC",
        roomCode: room.roomCode,
        stateVersion: result.data.stateVersion,
        lastActionType: result.data.actionType,
        lastActorPlayerId: result.data.actorPlayerId,
        actionId: aiActionId,
        gameState: result.data.gameState,
        room: result.data.room,
        serverTimestamp: Date.now()
      });
      if (result.data.room.status === "FINISHED") {
        this.options.onBroadcastToRoom(room.roomCode, {
          version: PROTOCOL_VERSION,
          type: "MATCH_FINISHED",
          roomCode: room.roomCode,
          winner: result.data.gameState.winner,
          gameState: result.data.gameState,
          room: result.data.room,
          stateVersion: result.data.stateVersion,
          serverTimestamp: Date.now()
        });
      }
      return true;
    }
    return false;
  }
  getRoomStateAndSummary(roomCode, viewingPlayerId) {
    const room = this.syncRoomFromRepository(roomCode);
    if (!room) return null;
    return {
      room: this.toPublicSummary(room),
      gameState: sanitizeStateForClient(room.gameState, viewingPlayerId),
      stateVersion: room.stateVersion
    };
  }
  getRoomSummary(roomCode) {
    const room = this.syncRoomFromRepository(roomCode);
    return room ? this.toPublicSummary(room) : null;
  }
  getActiveRoomCount() {
    return this.rooms.size;
  }
  shutdown() {
    if (this.turnTicker) {
      clearInterval(this.turnTicker);
      this.turnTicker = null;
    }
    for (const room of this.rooms.values()) {
      if (room.aiTimer) clearTimeout(room.aiTimer);
      for (const t of room.disconnectTimers.values()) {
        clearTimeout(t);
      }
    }
    this.rooms.clear();
  }
};

// src/server/roomRepository.ts
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
var RoomRepository = class {
  db;
  constructor(dbFilePath = ":memory:") {
    if (dbFilePath !== ":memory:") {
      const dir = path.dirname(dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(dbFilePath);
    this.initializeSchema();
  }
  initializeSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS rooms (
        room_code TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        status TEXT NOT NULL,
        state_version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        record_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rooms_status_expires
        ON rooms (status, expires_at);

      CREATE TABLE IF NOT EXISTS action_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        state_version INTEGER NOT NULL,
        action_id TEXT NOT NULL,
        actor_player_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_room_version
        ON action_audit_log (room_code, state_version);
    `);
  }
  saveRoom(record) {
    const stmt = this.db.prepare(`
      INSERT INTO rooms (
        room_code, room_id, status, state_version, updated_at, expires_at, record_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_code) DO UPDATE SET
        status = excluded.status,
        state_version = excluded.state_version,
        updated_at = excluded.updated_at,
        expires_at = excluded.expires_at,
        record_json = excluded.record_json
    `);
    stmt.run(
      record.roomCode,
      record.roomId,
      record.status,
      record.stateVersion,
      record.updatedAt,
      record.expiresAt,
      JSON.stringify(record)
    );
  }
  saveRoomAndActionAudit(record, audit) {
    this.db.exec("BEGIN IMMEDIATE TRANSACTION");
    try {
      this.saveRoom(record);
      const auditStmt = this.db.prepare(`
        INSERT INTO action_audit_log (
          room_code, state_version, action_id, actor_player_id, action_type, payload_json, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      auditStmt.run(
        audit.roomCode,
        audit.stateVersion,
        audit.actionId,
        audit.actorPlayerId,
        audit.actionType,
        audit.payloadJson,
        audit.timestamp
      );
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
  getRoom(roomCode) {
    const stmt = this.db.prepare(`SELECT record_json FROM rooms WHERE room_code = ?`);
    const row = stmt.get(roomCode);
    if (!row || !row.record_json) return null;
    try {
      return JSON.parse(row.record_json);
    } catch {
      return null;
    }
  }
  loadAllActiveRooms(now = Date.now()) {
    const stmt = this.db.prepare(`
      SELECT record_json FROM rooms
      WHERE status != 'EXPIRED' AND expires_at > ?
    `);
    const rows = stmt.all(now);
    const results = [];
    for (const row of rows) {
      try {
        results.push(JSON.parse(row.record_json));
      } catch {
      }
    }
    return results;
  }
  getActionAuditLog(roomCode) {
    const stmt = this.db.prepare(`
      SELECT room_code, state_version, action_id, actor_player_id, action_type, payload_json, timestamp
      FROM action_audit_log
      WHERE room_code = ?
      ORDER BY state_version ASC
    `);
    const rows = stmt.all(roomCode);
    return rows.map((r) => ({
      roomCode: r.room_code,
      stateVersion: r.state_version,
      actionId: r.action_id,
      actorPlayerId: r.actor_player_id,
      actionType: r.action_type,
      payloadJson: r.payload_json,
      timestamp: r.timestamp
    }));
  }
  deleteRoom(roomCode) {
    const stmt = this.db.prepare(`DELETE FROM rooms WHERE room_code = ?`);
    stmt.run(roomCode);
  }
  pruneExpiredRooms(now = Date.now()) {
    const stmt = this.db.prepare(`
      DELETE FROM rooms
      WHERE status = 'EXPIRED' OR expires_at <= ?
    `);
    const result = stmt.run(now);
    const ckpt = this.walCheckpoint("PASSIVE");
    return {
      expiredRoomsDeleted: Number(result?.changes ?? 0),
      walCheckpointed: ckpt.checkpointed
    };
  }
  checkIntegrity() {
    try {
      const stmt = this.db.prepare("PRAGMA integrity_check");
      const row = stmt.get();
      const status = row?.integrity_check ?? "unknown";
      return { ok: status === "ok", status };
    } catch (err) {
      return { ok: false, status: err?.message || String(err) };
    }
  }
  walCheckpoint(mode = "PASSIVE") {
    try {
      const stmt = this.db.prepare(`PRAGMA wal_checkpoint(${mode})`);
      const row = stmt.get();
      return {
        busy: row?.busy ?? 0,
        log: row?.log ?? 0,
        checkpointed: row?.checkpointed ?? 0
      };
    } catch {
      return { busy: -1, log: -1, checkpointed: -1 };
    }
  }
  backup(targetFilePath) {
    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
    }
    const escapedPath = targetFilePath.replace(/'/g, "''");
    this.db.exec(`VACUUM INTO '${escapedPath}'`);
  }
  getStats() {
    const roomStmt = this.db.prepare("SELECT COUNT(*) as count FROM rooms");
    const roomRow = roomStmt.get();
    const auditStmt = this.db.prepare("SELECT COUNT(*) as count FROM action_audit_log");
    const auditRow = auditStmt.get();
    const jStmt = this.db.prepare("PRAGMA journal_mode");
    const jRow = jStmt.get();
    return {
      roomCount: roomRow?.count ?? 0,
      auditCount: auditRow?.count ?? 0,
      journalMode: jRow?.journal_mode ?? "unknown"
    };
  }
  close() {
    this.db.close();
  }
};

// src/server/multiplayerServer.ts
var ChaosMultiplayerServer = class {
  constructor(config = {}) {
    this.config = config;
    this.silentLogs = config.silentLogs ?? false;
    this.allowedOrigins = config.allowedOrigins ?? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean) : void 0);
    this.repository = new RoomRepository(config.dbFilePath || ":memory:");
    this.rateLimiter = new SlidingWindowRateLimiter(
      config.maxMessagesPerWindow ?? 35,
      config.rateLimitWindowMs ?? 5e3
    );
    this.joinRateLimiter = new SlidingWindowRateLimiter(12, 1e4);
    this.roomManager = new RoomManager({
      repository: this.repository,
      onBroadcastToRoom: (roomCode, message) => this.broadcastToRoom(roomCode, message),
      defaultReconnectGraceMs: config.defaultReconnectGraceMs,
      roomExpirationMs: config.roomExpirationMs,
      aiActionDelayMs: config.aiActionDelayMs,
      deterministicTestSeed: config.deterministicTestSeed
    });
    this.httpServer = http.createServer((req, res) => this.handleHttpRequest(req, res));
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: "/ws",
      maxPayload: MAX_WS_MESSAGE_BYTES * 2,
      verifyClient: (info, callback) => {
        if (!this.isOriginAllowed(info.origin)) {
          this.logInfo("WS_ORIGIN_REJECTED", { origin: info.origin });
          callback(false, 403, "Forbidden Origin");
          return;
        }
        callback(true);
      }
    });
    this.setupWebSocketHandlers();
  }
  httpServer;
  wss;
  repository;
  roomManager;
  rateLimiter;
  joinRateLimiter;
  connections = /* @__PURE__ */ new Map();
  heartbeatInterval = null;
  silentLogs;
  allowedOrigins;
  isOriginAllowed(originHeader) {
    if (!this.allowedOrigins || this.allowedOrigins.length === 0 || this.allowedOrigins.includes("*")) {
      return true;
    }
    if (!originHeader) {
      return true;
    }
    try {
      const parsed = new URL(originHeader).origin;
      return this.allowedOrigins.some((allowed) => {
        if (allowed === "*") return true;
        try {
          return new URL(allowed).origin === parsed;
        } catch {
          return allowed === originHeader || allowed === parsed;
        }
      });
    } catch {
      return false;
    }
  }
  logInfo(event, meta = {}) {
    if (this.silentLogs) return;
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event,
        ...meta
      })
    );
  }
  handleHttpRequest(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Session-Id");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      const integrity = this.repository.checkIntegrity();
      const stats = this.repository.getStats();
      res.writeHead(integrity.ok ? 200 : 500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          status: integrity.ok ? "ok" : "degraded",
          service: "chaos-monopoly-multiplayer",
          version: PROTOCOL_VERSION,
          activeRooms: this.roomManager.getActiveRoomCount(),
          connectedClients: this.connections.size,
          database: {
            integrity: integrity.status,
            roomCount: stats.roomCount,
            auditCount: stats.auditCount,
            journalMode: stats.journalMode
          },
          timestamp: Date.now()
        })
      );
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/ready") {
      const integrity = this.repository.checkIntegrity();
      res.writeHead(integrity.ok ? 200 : 503, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          ready: integrity.ok,
          storage: "sqlite-wal",
          databaseIntegrity: integrity.status,
          timestamp: Date.now()
        })
      );
      return;
    }
    if ((req.method === "GET" || req.method === "POST") && url.pathname === "/api/cron/maintenance") {
      const now = Date.now();
      const pruned = this.repository.pruneExpiredRooms(now);
      const integrity = this.repository.checkIntegrity();
      const stats = this.repository.getStats();
      res.writeHead(integrity.ok ? 200 : 500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          ok: integrity.ok,
          service: "chaos-monopoly-maintenance",
          expiredRoomsDeleted: pruned.expiredRoomsDeleted,
          walCheckpointed: pruned.walCheckpointed,
          activeRoomsInMemory: this.roomManager.getActiveRoomCount(),
          database: {
            integrity: integrity.status,
            roomCount: stats.roomCount,
            auditCount: stats.auditCount,
            journalMode: stats.journalMode
          },
          timestamp: now
        })
      );
      return;
    }
    if ((req.method === "GET" || req.method === "POST") && url.pathname === "/api/multiplayer") {
      this.handleHttpMultiplayerEndpoint(req, res, url);
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/rooms/")) {
      const code = url.pathname.replace("/api/rooms/", "").trim().toUpperCase();
      const viewingPlayerId = url.searchParams.get("playerId") || void 0;
      if (url.searchParams.get("stepAI") === "1") {
        this.roomManager.stepAITurnSync(code);
      }
      const stateAndSummary = this.roomManager.getRoomStateAndSummary(code, viewingPlayerId);
      if (!stateAndSummary) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "ROOM_NOT_FOUND", messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng." }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          room: stateAndSummary.room,
          gameState: stateAndSummary.gameState,
          stateVersion: stateAndSummary.stateVersion,
          serverTimestamp: Date.now()
        })
      );
      return;
    }
    const distDir = path2.resolve(process.cwd(), "dist");
    if (req.method === "GET" && fs2.existsSync(distDir)) {
      const mimeMap = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2"
      };
      let reqPath = url.pathname;
      if (reqPath === "/" || !path2.extname(reqPath)) {
        reqPath = "/index.html";
      }
      const safePath = path2.normalize(path2.join(distDir, reqPath));
      if (safePath.startsWith(distDir) && fs2.existsSync(safePath) && fs2.statSync(safePath).isFile()) {
        const ext = path2.extname(safePath).toLowerCase();
        const contentType = mimeMap[ext] || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
        });
        fs2.createReadStream(safePath).pipe(res);
        return;
      }
      const indexPath = path2.join(distDir, "index.html");
      if (fs2.existsSync(indexPath)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        fs2.createReadStream(indexPath).pipe(res);
        return;
      }
    }
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "NOT_FOUND" }));
  }
  setupWebSocketHandlers() {
    this.wss.on("connection", (ws, req) => {
      const sessionId = `sess-${crypto3.randomUUID()}`;
      const ip = (req.socket.remoteAddress || "127.0.0.1").slice(0, 64);
      const ctx = {
        sessionId,
        ws,
        joinedRoomCode: null,
        lastHeartbeatAt: Date.now(),
        ip
      };
      this.connections.set(sessionId, ctx);
      this.sendToClient(ws, {
        version: PROTOCOL_VERSION,
        type: "WELCOME",
        sessionId,
        serverTimestamp: Date.now()
      });
      ws.on("message", (data) => {
        ctx.lastHeartbeatAt = Date.now();
        this.handleIncomingClientMessage(ctx, data);
      });
      ws.on("pong", () => {
        ctx.lastHeartbeatAt = Date.now();
      });
      ws.on("close", () => {
        this.handleClientClosed(ctx);
      });
      ws.on("error", () => {
      });
    });
    this.heartbeatInterval = setInterval(() => {
      this.rateLimiter.cleanup();
      this.joinRateLimiter.cleanup();
      const now = Date.now();
      for (const [sessionId, ctx] of Array.from(this.connections.entries())) {
        if (now - ctx.lastHeartbeatAt > 35e3) {
          this.logInfo("SOCKET_PING_TIMEOUT", { sessionId, roomCode: ctx.joinedRoomCode });
          this.connections.delete(sessionId);
          if (ctx.joinedRoomCode) {
            this.processDisconnection(ctx, false, "PING_TIMEOUT");
          }
          try {
            ctx.ws.terminate();
          } catch {
          }
        } else {
          try {
            if (ctx.ws.readyState === WebSocket.OPEN) {
              ctx.ws.ping();
            }
          } catch {
          }
        }
      }
    }, 3e4);
    this.heartbeatInterval.unref?.();
  }
  handleIncomingClientMessage(ctx, rawData) {
    if (!this.rateLimiter.allow(ctx.sessionId)) {
      this.sendError(
        ctx.ws,
        "RATE_LIMITED",
        "B\u1EA1n \u0111ang g\u1EEDi y\xEAu c\u1EA7u qu\xE1 nhanh. Vui l\xF2ng ch\u1EDD gi\xE2y l\xE1t."
      );
      return;
    }
    const parsedOutcome = parseAndValidateClientMessage(rawData);
    if (!parsedOutcome.ok || !parsedOutcome.value) {
      this.sendError(
        ctx.ws,
        parsedOutcome.code || "INVALID_SCHEMA",
        parsedOutcome.messageVi || "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7."
      );
      return;
    }
    const msg = parsedOutcome.value;
    switch (msg.type) {
      case "PING": {
        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: "PONG",
          requestId: msg.requestId,
          serverTimestamp: Date.now()
        });
        return;
      }
      case "CREATE_ROOM": {
        if (!this.joinRateLimiter.allow(ctx.ip)) {
          this.sendError(ctx.ws, "RATE_LIMITED", "T\u1EA1o ph\xF2ng qu\xE1 nhanh. Vui l\xF2ng th\u1EED l\u1EA1i sau.", msg.requestId);
          return;
        }
        const res = this.roomManager.createRoom({
          sessionPlayerId: ctx.sessionId,
          playerName: msg.playerName,
          roomName: msg.roomName,
          capacity: msg.capacity,
          token: msg.token,
          cosmetics: msg.cosmetics,
          config: msg.config,
          disconnectPolicy: msg.disconnectPolicy,
          reconnectGraceMs: msg.reconnectGraceMs
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || "INTERNAL_ERROR", res.messageVi || "L\u1ED7i t\u1EA1o ph\xF2ng.", msg.requestId);
          return;
        }
        ctx.joinedRoomCode = res.data.room.roomCode;
        this.logInfo("ROOM_CREATED", {
          roomCode: res.data.room.roomCode,
          hostPlayerId: res.data.assignedPlayerId
        });
        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: "ROOM_JOINED",
          requestId: msg.requestId,
          room: res.data.room,
          assignedPlayerId: res.data.assignedPlayerId,
          sessionPlayerId: ctx.sessionId,
          reconnectToken: res.data.reconnectToken,
          gameState: res.data.gameState,
          serverTimestamp: Date.now()
        });
        return;
      }
      case "JOIN_ROOM": {
        if (!this.joinRateLimiter.allow(`${ctx.ip}:${msg.roomCode}`)) {
          this.sendError(ctx.ws, "RATE_LIMITED", "Th\u1EED tham gia ph\xF2ng qu\xE1 nhi\u1EC1u l\u1EA7n.", msg.requestId);
          return;
        }
        const res = this.roomManager.joinRoom({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          playerName: msg.playerName,
          token: msg.token,
          cosmetics: msg.cosmetics
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || "ROOM_NOT_FOUND", res.messageVi || "Kh\xF4ng th\u1EC3 v\xE0o ph\xF2ng.", msg.requestId);
          return;
        }
        ctx.joinedRoomCode = res.data.room.roomCode;
        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: "ROOM_JOINED",
          requestId: msg.requestId,
          room: res.data.room,
          assignedPlayerId: res.data.assignedPlayerId,
          sessionPlayerId: ctx.sessionId,
          reconnectToken: res.data.reconnectToken,
          gameState: res.data.gameState,
          serverTimestamp: Date.now()
        });
        this.broadcastToRoom(
          res.data.room.roomCode,
          {
            version: PROTOCOL_VERSION,
            type: "ROOM_UPDATED",
            room: res.data.room,
            reason: `${msg.playerName} \u0111\xE3 tham gia ph\xF2ng.`,
            serverTimestamp: Date.now()
          },
          ctx.sessionId
        );
        return;
      }
      case "RECONNECT_ROOM": {
        const res = this.roomManager.reconnectPlayer({
          roomCode: msg.roomCode,
          playerId: msg.playerId,
          reconnectToken: msg.reconnectToken,
          newSessionPlayerId: ctx.sessionId
        });
        if (!res.ok || !res.data) {
          this.sendError(
            ctx.ws,
            res.code || "INVALID_RECONNECT_TOKEN",
            res.messageVi || "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i l\u1EA1i.",
            msg.requestId
          );
          return;
        }
        ctx.joinedRoomCode = res.data.room.roomCode;
        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: "ROOM_JOINED",
          requestId: msg.requestId,
          room: res.data.room,
          assignedPlayerId: res.data.assignedPlayerId,
          sessionPlayerId: ctx.sessionId,
          reconnectToken: res.data.reconnectToken,
          gameState: res.data.gameState,
          serverTimestamp: Date.now()
        });
        const reconnectedSeat = res.data.room.seats.find((s) => s.playerId === res.data.assignedPlayerId);
        this.broadcastToRoom(
          res.data.room.roomCode,
          {
            version: PROTOCOL_VERSION,
            type: "PLAYER_RECONNECTED",
            roomCode: res.data.room.roomCode,
            playerId: res.data.assignedPlayerId,
            playerName: reconnectedSeat?.name || res.data.assignedPlayerId,
            room: res.data.room,
            serverTimestamp: Date.now()
          },
          ctx.sessionId
        );
        return;
      }
      case "LEAVE_ROOM": {
        const roomCode = msg.roomCode;
        if (ctx.joinedRoomCode !== roomCode) {
          this.sendError(ctx.ws, "NOT_ROOM_MEMBER", "B\u1EA1n kh\xF4ng \u1EDF trong ph\xF2ng n\xE0y.", msg.requestId);
          return;
        }
        this.processDisconnection(ctx, true);
        ctx.joinedRoomCode = null;
        return;
      }
      case "SET_READY": {
        const res = this.roomManager.setReady({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          isReady: msg.isReady
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || "NOT_ROOM_MEMBER", res.messageVi || "L\u1ED7i c\u1EADp nh\u1EADt s\u1EB5n s\xE0ng.", msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: "ROOM_UPDATED",
          room: res.data,
          reason: "C\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i s\u1EB5n s\xE0ng.",
          serverTimestamp: Date.now()
        });
        return;
      }
      case "SELECT_TOKEN": {
        const res = this.roomManager.selectToken({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          token: msg.token,
          playerName: msg.playerName,
          cosmetics: msg.cosmetics
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || "NOT_ROOM_MEMBER", res.messageVi || "Kh\xF4ng th\u1EC3 \u0111\u1ED5i nh\xE2n v\u1EADt.", msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: "ROOM_UPDATED",
          room: res.data,
          reason: "C\u1EADp nh\u1EADt nh\xE2n v\u1EADt \u0111\u1EA1i di\u1EC7n.",
          serverTimestamp: Date.now()
        });
        return;
      }
      case "SEND_EMOTE": {
        const res = this.roomManager.broadcastEmote({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          emoteId: msg.emoteId
        });
        if (res.ok && res.data) {
          this.broadcastToRoom(msg.roomCode, {
            version: PROTOCOL_VERSION,
            type: "EMOTE_BROADCAST",
            roomCode: msg.roomCode,
            playerId: res.data.playerId,
            playerName: res.data.playerName,
            emoteId: res.data.emoteId,
            serverTimestamp: res.data.serverTimestamp
          });
        }
        return;
      }
      case "CONFIGURE_ROOM": {
        const res = this.roomManager.configureRoom({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          capacity: msg.capacity,
          config: msg.config,
          disconnectPolicy: msg.disconnectPolicy
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || "NOT_ROOM_HOST", res.messageVi || "Kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh ph\xF2ng.", msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: "ROOM_UPDATED",
          room: res.data,
          reason: "Ch\u1EE7 ph\xF2ng \u0111\xE3 c\u1EADp nh\u1EADt c\u1EA5u h\xECnh tr\u1EADn \u0111\u1EA5u.",
          serverTimestamp: Date.now()
        });
        return;
      }
      case "CONFIGURE_SEAT_AI": {
        const res = this.roomManager.configureSeatAI({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          seatIndex: msg.seatIndex,
          isAI: msg.isAI,
          aiPersonality: msg.aiPersonality,
          aiDifficulty: msg.aiDifficulty,
          name: msg.name
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || "NOT_ROOM_HOST", res.messageVi || "Kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh AI.", msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: "ROOM_UPDATED",
          room: res.data,
          reason: "Ch\u1EE7 ph\xF2ng \u0111\xE3 c\u1EADp nh\u1EADt v\u1ECB tr\xED AI.",
          serverTimestamp: Date.now()
        });
        return;
      }
      case "START_MATCH": {
        const res = this.roomManager.startMatch({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || "NOT_ROOM_HOST", res.messageVi || "Kh\xF4ng th\u1EC3 b\u1EAFt \u0111\u1EA7u tr\u1EADn \u0111\u1EA5u.", msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: "MATCH_STARTED",
          room: res.data.room,
          gameState: res.data.gameState,
          stateVersion: res.data.stateVersion,
          serverTimestamp: Date.now()
        });
        return;
      }
      case "SUBMIT_ACTION": {
        const res = this.roomManager.submitClientAction({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          actionId: msg.actionId,
          expectedStateVersion: msg.expectedStateVersion,
          intent: msg.intent
        });
        if (!res.ok || !res.data) {
          const currentSummary = this.roomManager.getRoomSummary(msg.roomCode);
          this.sendToClient(ctx.ws, {
            version: PROTOCOL_VERSION,
            type: "ACTION_REJECTED",
            requestId: msg.requestId,
            actionId: msg.actionId,
            code: res.code || "INVALID_GAME_ACTION",
            messageVi: res.messageVi || "N\u01B0\u1EDBc \u0111i kh\xF4ng h\u1EE3p l\u1EC7.",
            stateVersion: currentSummary?.stateVersion || 0,
            serverTimestamp: Date.now()
          });
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: "STATE_SYNC",
          roomCode: msg.roomCode,
          stateVersion: res.data.stateVersion,
          lastActionType: res.data.actionType,
          lastActorPlayerId: res.data.actorPlayerId,
          actionId: msg.actionId,
          gameState: res.data.gameState,
          room: res.data.room,
          serverTimestamp: Date.now()
        });
        if (res.data.room.status === "FINISHED") {
          this.broadcastToRoom(msg.roomCode, {
            version: PROTOCOL_VERSION,
            type: "MATCH_FINISHED",
            roomCode: msg.roomCode,
            winner: res.data.gameState.winner,
            gameState: res.data.gameState,
            room: res.data.room,
            stateVersion: res.data.stateVersion,
            serverTimestamp: Date.now()
          });
        }
        return;
      }
    }
  }
  handleClientClosed(ctx) {
    this.connections.delete(ctx.sessionId);
    if (ctx.joinedRoomCode) {
      this.processDisconnection(ctx, false);
    }
  }
  processDisconnection(ctx, voluntaryLeave, reason) {
    if (!ctx.joinedRoomCode) return;
    const roomCode = ctx.joinedRoomCode;
    ctx.joinedRoomCode = null;
    this.logInfo("SESSION_DISCONNECTED", {
      sessionId: ctx.sessionId,
      roomCode,
      reason: reason || (voluntaryLeave ? "VOLUNTARY" : "CLOSE_EVENT")
    });
    const outcome = this.roomManager.handleSessionDisconnected(
      roomCode,
      ctx.sessionId,
      voluntaryLeave
    );
    if (!outcome) return;
    this.broadcastToRoom(roomCode, {
      version: PROTOCOL_VERSION,
      type: "PLAYER_DISCONNECTED",
      roomCode,
      playerId: outcome.disconnectedPlayerId,
      playerName: outcome.disconnectedPlayerName,
      reconnectDeadlineAt: outcome.reconnectDeadlineAt,
      room: outcome.room,
      serverTimestamp: Date.now()
    });
    if (outcome.migratedHost) {
      this.broadcastToRoom(roomCode, {
        version: PROTOCOL_VERSION,
        type: "HOST_MIGRATED",
        roomCode,
        newHostPlayerId: outcome.migratedHost.newHostPlayerId,
        newHostName: outcome.migratedHost.newHostName,
        room: outcome.room,
        serverTimestamp: Date.now()
      });
    }
  }
  broadcastToRoom(roomCode, message, excludeSessionId) {
    const summary = this.roomManager.getRoomSummary(roomCode);
    if (!summary) return;
    const memberSessionIds = new Set(
      summary.seats.filter((s) => !s.isAI && s.connected).map((s) => s.sessionPlayerId)
    );
    const serialized = JSON.stringify(message);
    for (const [sessionId, ctx] of this.connections.entries()) {
      if (excludeSessionId && sessionId === excludeSessionId) continue;
      if (ctx.joinedRoomCode === roomCode || memberSessionIds.has(sessionId)) {
        if (ctx.ws.readyState === WebSocket.OPEN) {
          ctx.ws.send(serialized);
        }
      }
    }
  }
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  sendError(ws, code, messageVi, requestId) {
    this.sendToClient(ws, {
      version: PROTOCOL_VERSION,
      type: "ERROR",
      requestId,
      code,
      messageVi,
      serverTimestamp: Date.now()
    });
  }
  /**
   * HTTP / Serverless Multiplayer Transport Endpoint (`/api/multiplayer`).
   * Allows full online room creation, joining, reconnection, actions, and polling over HTTP
   * on platforms where persistent WebSocket connections are proxied or serverless (e.g., Vercel).
   */
  handleHttpMultiplayerEndpoint(req, res, url) {
    const sendJson = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(payload));
    };
    if (req.method === "GET") {
      const roomCode = (url.searchParams.get("roomCode") || "").trim().toUpperCase();
      const playerId = url.searchParams.get("playerId") || void 0;
      if (!roomCode) {
        sendJson(200, {
          version: PROTOCOL_VERSION,
          type: "WELCOME",
          sessionId: `http-${crypto3.randomUUID()}`,
          serverTimestamp: Date.now()
        });
        return;
      }
      this.roomManager.stepAITurnSync(roomCode);
      const stateAndSummary = this.roomManager.getRoomStateAndSummary(roomCode, playerId);
      if (!stateAndSummary) {
        sendJson(404, {
          version: PROTOCOL_VERSION,
          type: "ERROR",
          code: "ROOM_NOT_FOUND",
          messageVi: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng.",
          serverTimestamp: Date.now()
        });
        return;
      }
      sendJson(200, {
        version: PROTOCOL_VERSION,
        type: stateAndSummary.gameState ? "STATE_SYNC" : "ROOM_UPDATED",
        roomCode,
        stateVersion: stateAndSummary.stateVersion,
        lastActionType: "POLL_SYNC",
        lastActorPlayerId: stateAndSummary.room.hostPlayerId,
        actionId: `poll-${stateAndSummary.stateVersion}`,
        gameState: stateAndSummary.gameState,
        room: stateAndSummary.room,
        reason: "",
        serverTimestamp: Date.now()
      });
      return;
    }
    const chunks = [];
    let totalBytes = 0;
    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes <= MAX_WS_MESSAGE_BYTES * 2) {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      let rawJson = {};
      try {
        rawJson = JSON.parse(rawBody || "{}");
      } catch {
        sendJson(400, {
          version: PROTOCOL_VERSION,
          type: "ERROR",
          code: "INVALID_SCHEMA",
          messageVi: "G\xF3i tin JSON kh\xF4ng h\u1EE3p l\u1EC7.",
          serverTimestamp: Date.now()
        });
        return;
      }
      const sessionHeader = req.headers["x-session-id"];
      const sessionId = typeof sessionHeader === "string" && sessionHeader.trim() || typeof rawJson.sessionId === "string" && rawJson.sessionId.trim() || `http-${crypto3.randomUUID()}`;
      const parsedOutcome = parseAndValidateClientMessage(rawBody);
      if (!parsedOutcome.ok || !parsedOutcome.value) {
        sendJson(400, {
          version: PROTOCOL_VERSION,
          type: "ERROR",
          code: parsedOutcome.code || "INVALID_SCHEMA",
          messageVi: parsedOutcome.messageVi || "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7.",
          serverTimestamp: Date.now()
        });
        return;
      }
      const msg = parsedOutcome.value;
      if ("roomCode" in msg && msg.roomCode) {
        this.roomManager.syncRoomFromRepository(msg.roomCode);
      }
      switch (msg.type) {
        case "PING":
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: "PONG",
            requestId: msg.requestId,
            serverTimestamp: Date.now()
          });
          return;
        case "CREATE_ROOM": {
          const r = this.roomManager.createRoom({
            sessionPlayerId: sessionId,
            playerName: msg.playerName,
            roomName: msg.roomName,
            capacity: msg.capacity,
            token: msg.token,
            cosmetics: msg.cosmetics,
            config: msg.config,
            disconnectPolicy: msg.disconnectPolicy,
            reconnectGraceMs: msg.reconnectGraceMs
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "INTERNAL_ERROR",
              messageVi: r.messageVi || "L\u1ED7i t\u1EA1o ph\xF2ng.",
              serverTimestamp: Date.now()
            });
            return;
          }
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: "ROOM_JOINED",
            requestId: msg.requestId,
            room: r.data.room,
            assignedPlayerId: r.data.assignedPlayerId,
            sessionPlayerId: sessionId,
            reconnectToken: r.data.reconnectToken,
            gameState: r.data.gameState,
            serverTimestamp: Date.now()
          });
          return;
        }
        case "JOIN_ROOM": {
          const r = this.roomManager.joinRoom({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            playerName: msg.playerName,
            token: msg.token,
            cosmetics: msg.cosmetics
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "ROOM_NOT_FOUND",
              messageVi: r.messageVi || "Kh\xF4ng th\u1EC3 v\xE0o ph\xF2ng.",
              serverTimestamp: Date.now()
            });
            return;
          }
          this.broadcastToRoom(r.data.room.roomCode, {
            version: PROTOCOL_VERSION,
            type: "ROOM_UPDATED",
            room: r.data.room,
            reason: `${msg.playerName} \u0111\xE3 tham gia ph\xF2ng.`,
            serverTimestamp: Date.now()
          });
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: "ROOM_JOINED",
            requestId: msg.requestId,
            room: r.data.room,
            assignedPlayerId: r.data.assignedPlayerId,
            sessionPlayerId: sessionId,
            reconnectToken: r.data.reconnectToken,
            gameState: r.data.gameState,
            serverTimestamp: Date.now()
          });
          return;
        }
        case "RECONNECT_ROOM": {
          const r = this.roomManager.reconnectPlayer({
            roomCode: msg.roomCode,
            playerId: msg.playerId,
            reconnectToken: msg.reconnectToken,
            newSessionPlayerId: sessionId
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "INVALID_RECONNECT_TOKEN",
              messageVi: r.messageVi || "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i l\u1EA1i.",
              serverTimestamp: Date.now()
            });
            return;
          }
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: "ROOM_JOINED",
            requestId: msg.requestId,
            room: r.data.room,
            assignedPlayerId: r.data.assignedPlayerId,
            sessionPlayerId: sessionId,
            reconnectToken: r.data.reconnectToken,
            gameState: r.data.gameState,
            serverTimestamp: Date.now()
          });
          return;
        }
        case "LEAVE_ROOM": {
          this.roomManager.handleSessionDisconnected(msg.roomCode, sessionId, true);
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: "PONG",
            requestId: msg.requestId,
            serverTimestamp: Date.now()
          });
          return;
        }
        case "SET_READY": {
          const r = this.roomManager.setReady({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            isReady: msg.isReady
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "NOT_ROOM_MEMBER",
              messageVi: r.messageVi || "L\u1ED7i c\u1EADp nh\u1EADt s\u1EB5n s\xE0ng.",
              serverTimestamp: Date.now()
            });
            return;
          }
          const updateMsg = {
            version: PROTOCOL_VERSION,
            type: "ROOM_UPDATED",
            room: r.data,
            reason: "C\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i s\u1EB5n s\xE0ng.",
            serverTimestamp: Date.now()
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }
        case "SELECT_TOKEN": {
          const r = this.roomManager.selectToken({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            token: msg.token,
            playerName: msg.playerName,
            cosmetics: msg.cosmetics
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "NOT_ROOM_MEMBER",
              messageVi: r.messageVi || "Kh\xF4ng th\u1EC3 \u0111\u1ED5i nh\xE2n v\u1EADt.",
              serverTimestamp: Date.now()
            });
            return;
          }
          const updateMsg = {
            version: PROTOCOL_VERSION,
            type: "ROOM_UPDATED",
            room: r.data,
            reason: "C\u1EADp nh\u1EADt nh\xE2n v\u1EADt \u0111\u1EA1i di\u1EC7n.",
            serverTimestamp: Date.now()
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }
        case "SEND_EMOTE": {
          const r = this.roomManager.broadcastEmote({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            emoteId: msg.emoteId
          });
          if (r.ok && r.data) {
            const emoteMsg = {
              version: PROTOCOL_VERSION,
              type: "EMOTE_BROADCAST",
              roomCode: msg.roomCode,
              playerId: r.data.playerId,
              playerName: r.data.playerName,
              emoteId: r.data.emoteId,
              serverTimestamp: r.data.serverTimestamp
            };
            this.broadcastToRoom(msg.roomCode, emoteMsg);
            sendJson(200, emoteMsg);
            return;
          }
          sendJson(400, {
            version: PROTOCOL_VERSION,
            type: "ERROR",
            code: r.code || "NOT_ROOM_MEMBER",
            messageVi: r.messageVi || "L\u1ED7i g\u1EEDi bi\u1EC3u c\u1EA3m.",
            serverTimestamp: Date.now()
          });
          return;
        }
        case "CONFIGURE_ROOM": {
          const r = this.roomManager.configureRoom({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            capacity: msg.capacity,
            config: msg.config,
            disconnectPolicy: msg.disconnectPolicy
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "NOT_ROOM_HOST",
              messageVi: r.messageVi || "Kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh ph\xF2ng.",
              serverTimestamp: Date.now()
            });
            return;
          }
          const updateMsg = {
            version: PROTOCOL_VERSION,
            type: "ROOM_UPDATED",
            room: r.data,
            reason: "Ch\u1EE7 ph\xF2ng \u0111\xE3 c\u1EADp nh\u1EADt c\u1EA5u h\xECnh tr\u1EADn \u0111\u1EA5u.",
            serverTimestamp: Date.now()
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }
        case "CONFIGURE_SEAT_AI": {
          const r = this.roomManager.configureSeatAI({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            seatIndex: msg.seatIndex,
            isAI: msg.isAI,
            aiPersonality: msg.aiPersonality,
            aiDifficulty: msg.aiDifficulty,
            name: msg.name
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "NOT_ROOM_HOST",
              messageVi: r.messageVi || "Kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh AI.",
              serverTimestamp: Date.now()
            });
            return;
          }
          const updateMsg = {
            version: PROTOCOL_VERSION,
            type: "ROOM_UPDATED",
            room: r.data,
            reason: "Ch\u1EE7 ph\xF2ng \u0111\xE3 c\u1EADp nh\u1EADt v\u1ECB tr\xED AI.",
            serverTimestamp: Date.now()
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }
        case "START_MATCH": {
          const r = this.roomManager.startMatch({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ERROR",
              requestId: msg.requestId,
              code: r.code || "NOT_ROOM_HOST",
              messageVi: r.messageVi || "Kh\xF4ng th\u1EC3 b\u1EAFt \u0111\u1EA7u tr\u1EADn \u0111\u1EA5u.",
              serverTimestamp: Date.now()
            });
            return;
          }
          const startMsg = {
            version: PROTOCOL_VERSION,
            type: "MATCH_STARTED",
            room: r.data.room,
            gameState: r.data.gameState,
            stateVersion: r.data.stateVersion,
            serverTimestamp: Date.now()
          };
          this.broadcastToRoom(msg.roomCode, startMsg);
          sendJson(200, startMsg);
          return;
        }
        case "SUBMIT_ACTION": {
          const r = this.roomManager.submitClientAction({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            actionId: msg.actionId,
            expectedStateVersion: msg.expectedStateVersion,
            intent: msg.intent
          });
          if (!r.ok || !r.data) {
            const currentSummary = this.roomManager.getRoomSummary(msg.roomCode);
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: "ACTION_REJECTED",
              requestId: msg.requestId,
              actionId: msg.actionId,
              code: r.code || "INVALID_GAME_ACTION",
              messageVi: r.messageVi || "N\u01B0\u1EDBc \u0111i kh\xF4ng h\u1EE3p l\u1EC7.",
              stateVersion: currentSummary?.stateVersion || 0,
              serverTimestamp: Date.now()
            });
            return;
          }
          const syncMsg = {
            version: PROTOCOL_VERSION,
            type: "STATE_SYNC",
            roomCode: msg.roomCode,
            stateVersion: r.data.stateVersion,
            lastActionType: r.data.actionType,
            lastActorPlayerId: r.data.actorPlayerId,
            actionId: msg.actionId,
            gameState: r.data.gameState,
            room: r.data.room,
            serverTimestamp: Date.now()
          };
          this.broadcastToRoom(msg.roomCode, syncMsg);
          sendJson(200, syncMsg);
          return;
        }
      }
    });
  }
  async listen(port = this.config.port ?? 3001, host = this.config.host ?? "127.0.0.1") {
    return new Promise((resolve, reject) => {
      this.httpServer.once("error", reject);
      this.httpServer.listen(port, host, () => {
        const addr = this.httpServer.address();
        const actualPort = typeof addr === "object" && addr ? addr.port : port;
        this.logInfo("MULTIPLAYER_SERVER_LISTENING", { host, port: actualPort });
        resolve(actualPort);
      });
    });
  }
  async stop() {
    return this.close();
  }
  async close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.roomManager.shutdown();
    for (const ctx of this.connections.values()) {
      try {
        ctx.ws.close();
      } catch {
      }
    }
    this.connections.clear();
    await new Promise((resolve) => {
      this.wss.close(() => {
        this.httpServer.close(() => {
          this.repository.close();
          resolve();
        });
      });
    });
  }
};

// src/server/vercelHandler.ts
var globalForServer = globalThis;
function getServerInstance() {
  if (!globalForServer.__chaosVercelServer) {
    const dbFilePath = process.env.MULTIPLAYER_DB_PATH || (process.env.VERCEL ? path3.join(os.tmpdir(), "chaos-multiplayer.sqlite") : path3.resolve(process.cwd(), "data", "chaos-multiplayer.sqlite"));
    globalForServer.__chaosVercelServer = new ChaosMultiplayerServer({
      dbFilePath,
      defaultReconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS || 6e4),
      roomExpirationMs: Number(process.env.ROOM_EXPIRATION_MS || 72e5),
      aiActionDelayMs: Number(process.env.AI_ACTION_DELAY_MS || 120),
      silentLogs: process.env.NODE_ENV === "test"
    });
  }
  return globalForServer.__chaosVercelServer;
}
function handler(req, res) {
  const server = getServerInstance();
  server.handleHttpRequest(req, res);
}
export {
  handler as default
};
