import { BASE_DISTRICT_HEX, buildTileNames, makePack } from './shared';

export const pack = makePack({
  id: 'mekong-delta',
  typography: { display: "'Nunito','Segoe UI',system-ui,sans-serif", body: "'Nunito','Segoe UI',system-ui,sans-serif" },
  tileNames: buildTileNames([
    [1, 'Bến Ninh Kiều', 'Ninh Kieu Wharf'], [3, 'Chợ Nổi Cái Răng', 'Floating Market'], [5, 'Bến Phà Mỹ Thuận', 'Ferry Landing'],
    [6, 'Vườn Xoài', 'Mango Orchard'], [8, 'Rạch Sen', 'Lotus Canal'], [9, 'Vườn Sầu Riêng', 'Durian Grove'],
    [11, 'Làng Nghề Bánh Tráng', 'Rice Paper Village'], [12, 'Trạm Bơm Nước', 'Pump Station'], [13, 'Ruộng Lúa Vàng', 'Golden Paddies'],
    [14, 'Xóm Nhà Sàn Sông', 'Riverside Hamlet'], [15, 'Bến Ghe Hàng', 'Cargo Boat Dock'], [16, 'Vườn Dừa Bến Tre', 'Coconut Grove'],
    [18, 'Đầm Sen Hồng', 'Pink Lotus Pond'], [19, 'Chợ Trái Cây', 'Fruit Market'], [21, 'Trại Cá Tra', 'Catfish Farm'],
    [23, 'Rừng Tràm', 'Cajuput Forest'], [24, 'Khu Du Lịch Sinh Thái', 'Eco-Tour Camp'], [25, 'Cảng Cái Cui', 'Delta Port'],
    [26, 'Cồn Sơn', 'Delta Islet'], [27, 'Vườn Chôm Chôm', 'Rambutan Orchard'], [28, 'Điện Gió Ven Biển', 'Coastal Wind Farm'],
    [29, 'Xưởng Gạo', 'Rice Mill'], [31, 'Chợ Đêm Sông Hậu', 'Hau River Night Market'], [32, 'Làng Hoa Sa Đéc', 'Sa Dec Flower Village'],
    [34, 'Khu Nghỉ Dưỡng Miệt Vườn', 'Orchard Retreat'], [35, 'Cảng Hàng Không Cần Thơ', 'Delta Airfield'],
    [37, 'Trung Tâm Lúa Gạo', 'Rice Trade Center'], [39, 'Cầu Dây Văng', 'Cable Bridge'],
  ]),
  tileVisuals: {
    districtColors: {
      ...BASE_DISTRICT_HEX,
      'district-brown': '#a16207', 'district-lightblue': '#2dd4bf', 'district-pink': '#fb7185',
      'district-orange': '#fb923c', 'district-red': '#f87171', 'district-yellow': '#fde047',
      'district-green': '#4ade80', 'district-darkblue': '#0ea5e9',
    },
    frame: '#15803d',
  },
  background: {
    gradient: 'radial-gradient(1000px 520px at 50% -15%, #14532d 0%, transparent 60%), radial-gradient(800px 400px at 100% 100%, #78350f 0%, transparent 55%), #06150f',
    boardGradient: 'linear-gradient(180deg,#0b2a1d,#06150f)',
  },
  environment: { kind: 'fireflies', intensity: 0.4 },
  animations: { introMs: 1300, tileLiftPx: 2 },
  chaosPresentation: { label: { vi: 'Biến Cố Mùa Vụ', en: 'Seasonal Twist' }, accent: '#34d399' },
  features: [
    { vi: 'Kinh tế miệt vườn: giá đất -10%, lương Khởi Hành +15%, lạm phát thấp +1,5%/vòng', en: 'Delta economy: -10% land cost, +15% Start salary, low +1.5%/round inflation' },
    { vi: 'Sự kiện: trúng mùa, vận tải đường thủy, mùa nước nổi', en: 'Events: bumper harvest, river freight, flood season' },
  ],
});
