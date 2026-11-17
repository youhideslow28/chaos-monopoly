import { BASE_DISTRICT_HEX, buildTileNames, makePack } from './shared';

export const pack = makePack({
  id: 'cyberpunk-city',
  typography: { display: "'Orbitron','Segoe UI',system-ui,sans-serif", body: "'Inter','Segoe UI',system-ui,sans-serif" },
  tileNames: buildTileNames([
    [1, 'Hẻm Dữ Liệu', 'Data Alley'], [3, 'Chợ Đen Nơ-ron', 'Neural Bazaar'], [5, 'Tàu Từ Trường', 'Maglev Hub'],
    [6, 'Khu Hologram', 'Hologram Row'], [8, 'Phố Neon', 'Neon Strip'], [9, 'Trạm Lưu Trữ', 'Archive Node'],
    [11, 'Tháp Quang Tử', 'Photon Tower'], [12, 'Lưới Điện Lõi', 'Core Grid'], [13, 'Khu Robot', 'Droid District'],
    [14, 'Xưởng Cyborg', 'Cyborg Works'], [15, 'Cổng Drone', 'Drone Port'], [16, 'Viện Mạng Nơ-ron', 'Neural Institute'],
    [18, 'Quảng Trường Mã', 'Code Plaza'], [19, 'Khu Tài Chính Số', 'Crypto Quarter'], [21, 'Trung Tâm AI', 'AI Nexus'],
    [23, 'Phố Máy Chủ', 'Server Street'], [24, 'Tòa Tập Đoàn', 'Megacorp Arcology'], [25, 'Ga Chân Không', 'Vacuum Rail'],
    [26, 'Chợ Linh Kiện', 'Parts Market'], [27, 'Khu Ảo Giác', 'Simulation Strip'], [28, 'Lò Phản Ứng', 'Reactor Hub'],
    [29, 'Tháp Giám Sát', 'Overwatch Tower'], [31, 'Khu Ngầm', 'Undercity'], [32, 'Cổng Dữ Liệu', 'Data Gate'],
    [34, 'Đỉnh Thiên Đường', 'Skyline Apex'], [35, 'Cảng Tàu Vũ Trụ', 'Orbital Shuttle Port'],
    [37, 'Khu Tập Đoàn Lõi', 'Core Syndicate'], [39, 'Tòa Tháp Vô Cực', 'Infinity Spire'],
  ]),
  tileVisuals: {
    districtColors: {
      ...BASE_DISTRICT_HEX,
      'district-brown': '#7c3aed', 'district-lightblue': '#22d3ee', 'district-pink': '#e879f9',
      'district-orange': '#fb7185', 'district-red': '#f43f5e', 'district-yellow': '#facc15',
      'district-green': '#4ade80', 'district-darkblue': '#6366f1',
    },
    frame: '#6d28d9',
  },
  background: {
    gradient: 'radial-gradient(900px 500px at 20% -10%, #3b0764 0%, transparent 60%), radial-gradient(900px 500px at 90% 0%, #0e7490 0%, transparent 55%), #0a0614',
    boardGradient: 'linear-gradient(180deg,#120a22,#0a0614)',
  },
  environment: { kind: 'rain', intensity: 0.35 },
  animations: { introMs: 1500, tileLiftPx: 3 },
  chaosPresentation: { label: { vi: 'Sự Cố Hệ Thống', en: 'System Glitch' }, accent: '#e879f9' },
  features: [
    { vi: 'Kinh tế số: lạm phát +3,5%/vòng, +15% thuê cho công trình 3★–5★, hoàn bán 80%', en: 'Tech economy: +3.5%/round inflation, +15% rent on 3★–5★ towers, 80% sellback' },
    { vi: 'Sự kiện: quá tải lưới điện, phí an ninh mạng, quỹ tín dụng AI', en: 'Events: grid overload, cybersecurity levy, AI credit fund' },
  ],
});
