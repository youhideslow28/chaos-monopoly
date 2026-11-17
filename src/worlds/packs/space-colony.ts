import { BASE_DISTRICT_HEX, buildTileNames, makePack } from './shared';

export const pack = makePack({
  id: 'space-colony',
  typography: { display: "'Rajdhani','Segoe UI',system-ui,sans-serif", body: "'Inter','Segoe UI',system-ui,sans-serif" },
  tileNames: buildTileNames([
    [1, 'Mô-đun Sinh Hoạt', 'Habitat Module'], [3, 'Chợ Quỹ Đạo', 'Orbital Bazaar'], [5, 'Thang Máy Vũ Trụ', 'Space Elevator'],
    [6, 'Vườn Thủy Canh', 'Hydroponic Deck'], [8, 'Khu Mỏ Tiểu Hành Tinh', 'Asteroid Mine'], [9, 'Trạm Băng Sao Chổi', 'Comet Ice Depot'],
    [11, 'Phòng Thí Nghiệm Zero-G', 'Zero-G Lab'], [12, 'Trạm Tái Chế Nước', 'Water Reclaimer'], [13, 'Vòng Quay Trọng Lực', 'Gravity Ring'],
    [14, 'Đô Thị Mái Vòm', 'Dome City'], [15, 'Bến Tàu Con Thoi', 'Shuttle Dock'], [16, 'Căn Cứ Mặt Trăng', 'Lunar Base'],
    [18, 'Hố Thiên Thạch', 'Impact Crater Camp'], [19, 'Mỏ Heli-3', 'Helium-3 Mine'], [21, 'Cảng Sao Hỏa', 'Mars Landing'],
    [23, 'Thung Lũng Mariner', 'Canyon Outpost'], [24, 'Tháp Chỉ Huy', 'Command Spire'], [25, 'Cổng Dịch Chuyển', 'Warp Gate'],
    [26, 'Vành Đai Băng', 'Ice Belt'], [27, 'Vệ Tinh Titan', 'Titan Outpost'], [28, 'Lò Phản Ứng Nhiệt Hạch', 'Fusion Reactor'],
    [29, 'Trạm Sao Mộc', 'Jovian Station'], [31, 'Khu Dân Cư Tầng Cao', 'Orbit Residences'], [32, 'Đài Quan Sát', 'Deep Observatory'],
    [34, 'Vườn Mái Kính', 'Glass Garden Ring'], [35, 'Cổng Liên Sao', 'Interstellar Port'],
    [37, 'Trung Tâm Dữ Liệu Lượng Tử', 'Quantum Core'], [39, 'Trạm Mẹ Gaia', 'Gaia Mothership'],
  ]),
  tileVisuals: {
    districtColors: {
      ...BASE_DISTRICT_HEX,
      'district-brown': '#a8a29e', 'district-lightblue': '#67e8f9', 'district-pink': '#f9a8d4',
      'district-orange': '#fdba74', 'district-red': '#fb7185', 'district-yellow': '#fde68a',
      'district-green': '#6ee7b7', 'district-darkblue': '#818cf8',
    },
    frame: '#3b82f6',
  },
  background: {
    gradient: 'radial-gradient(900px 500px at 80% -10%, #1e3a8a 0%, transparent 60%), radial-gradient(700px 400px at 0% 100%, #581c87 0%, transparent 55%), #05070f',
    boardGradient: 'linear-gradient(180deg,#0c1226,#05070f)',
  },
  environment: { kind: 'stars', intensity: 0.5 },
  animations: { introMs: 1500, tileLiftPx: 3 },
  chaosPresentation: { label: { vi: 'Sự Cố Trạm', en: 'Station Incident' }, accent: '#60a5fa' },
  features: [
    { vi: 'Kinh tế quỹ đạo: chi phí xây +15%, +20% thuê trạm 4★–5★ & vận tải, hoàn bán 80%', en: 'Orbital economy: +15% build cost, +20% rent on 4★–5★ & transport, 80% sellback' },
    { vi: 'Sự kiện: bão mặt trời, đột biến năng lượng, tiếp tế, rò rỉ vỏ trạm', en: 'Events: solar flare, energy surge, supply drop, hull breach' },
  ],
});
