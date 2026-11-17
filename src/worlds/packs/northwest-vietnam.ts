import { BASE_DISTRICT_HEX, buildTileNames, makePack } from './shared';

export const pack = makePack({
  id: 'northwest-vietnam',
  typography: { display: "'Baloo 2','Segoe UI',system-ui,sans-serif", body: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif" },
  tileNames: buildTileNames([
    [1, 'Ruộng Bậc Thang Y Tý', 'Y Ty Terraces'], [3, 'Chợ Tình Yêu Sa Pa', 'Sa Pa Love Market'], [5, 'Ga Lào Cai', 'Lao Cai Station'],
    [6, 'Bản Làng Cát Cát', 'Cat Cat Village'], [8, 'Ruộng Bậc Thang Hoàng Su Phì', 'Hoang Su Phi Terraces'], [9, 'Cột Mốc Biên Giới Hà Giang', 'Ha Giang Border Post'],
    [11, 'Làng Hmong Hà Giang', 'Hmong Village'], [12, 'Thủy Điện Cửa Đạt', 'Cua Dat Hydro'], [13, 'Bản Làng Tả Van', 'Ta Van Village'],
    [14, 'Đèo Ô Quy Hồ', 'O Quy Ho Pass'], [15, 'Ga Sapa', 'Sa Pa Station'], [16, 'Suối Nước Nóng Bản Phiệt', 'Ban Phiệt Hot Springs'],
    [18, 'Ruộng Bậc Thang Mù Cang Chải', 'Mu Cang Chai Terraces'], [19, 'Chợ Phiên Tả Phìn', 'Ta Phin Fair'], [21, 'Làng Du Lịch Bản Sin Hồ', 'Sin Ho'],
    [23, 'Ruộng Bậc Thang Bắc Hà', 'Bac Ha Terraces'], [24, 'Khu Du Lịch Điện Biên', 'Dien Bien Site'], [25, 'Đèo Pha Đin', 'Pha Din Pass'],
    [26, 'Làng Hmong Pà Phìn', 'Pa Phin Village'], [27, 'Ruộng Bậc Thang Tú Lệ', 'Tu Le Terraces'], [28, 'Thủy Điện Lai Châu', 'Lai Chau Hydro'],
    [29, 'Bản Làng Dùng Xuối', 'Dung Xuoi Village'], [31, 'Chợ Phiên Sín Chéng', 'Sin Cheng Fair'], [32, 'Làng Mèo Rừng', 'Meo Rung Village'],
    [34, 'Khu Du Lịch Hang Sơn Đoòng', 'Son Doong Cave Site'], [35, 'Sân Bay Điện Biên', 'Dien Bien Airfield'],
    [37, 'Khu Công Nghiệp Mondulkiri', 'Industrial Zone'], [39, 'Cầu Pá Vi', 'Pa Vi Bridge'],
  ]),
  tileVisuals: {
    districtColors: {
      ...BASE_DISTRICT_HEX,
      'district-brown': '#a16207', 'district-lightblue': '#38bdf8', 'district-pink': '#fb7185',
      'district-orange': '#f59e0b', 'district-red': '#f87171', 'district-yellow': '#fde047',
      'district-green': '#84cc16', 'district-darkblue': '#0ea5e9',
    },
    frame: '#3f6212',
  },
  background: {
    gradient: 'radial-gradient(1000px 520px at 50% -15%, #365314 0%, transparent 60%), radial-gradient(800px 400px at 100% 100%, #92400e 0%, transparent 55%), #101a14',
    boardGradient: 'linear-gradient(180deg,#1f3326,#101a14)',
  },
  environment: { kind: 'drift', intensity: 0.3 },
  animations: { introMs: 1400, tileLiftPx: 2 },
  chaosPresentation: { label: { vi: 'Biến Cố Chợ Phiên', en: 'Market Fair Twist' }, accent: '#bef264' },
  features: [
    { vi: 'Phiên chợ mỗi 5 vòng: giao dịch tự do mọi lượt & hoàn tiền bán công trình/đất 100%', en: 'Market day every 5 rounds: anytime trading & 100% sellback' },
    { vi: 'Ngày thường: hoàn bán 75%, lương Khởi Hành +5%, lạm phát nhẹ +2%/vòng', en: 'Normal days: 75% sellback, +5% Start salary, +2%/round inflation' },
    { vi: 'Sương núi mỏng', en: 'Thin mountain mist' },
  ],
});
