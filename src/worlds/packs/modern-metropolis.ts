import { BASE_DISTRICT_HEX, buildTileNames, makePack } from './shared';

export const pack = makePack({
  id: 'modern-metropolis',
  typography: { display: "'Inter','Segoe UI',system-ui,sans-serif", body: "'Inter','Segoe UI',system-ui,sans-serif" },
  tileNames: buildTileNames([
    [1, 'Phố Cổ Phiếu', 'Stock Row'], [3, 'Chợ Trung Tâm', 'Central Market'], [5, 'Ga Trung Tâm', 'Central Station'],
    [6, 'Cảng Xanh', 'Green Harbor'], [8, 'Đại Lộ Ngân Hàng', 'Bank Avenue'], [9, 'Quảng Trường Mới', 'New Square'],
    [11, 'Khu Văn Phòng', 'Office Park'], [12, 'Cấp Nước', 'Water Works'], [13, 'Phố Thời Trang', 'Fashion Mile'],
    [14, 'Trung Tâm Mua Sắm', 'Grand Mall'], [15, 'Cảng Hàng Hóa', 'Freight Port'], [16, 'Khu Đại Học', 'Campus Row'],
    [18, 'Công Viên Hồ', 'Lakeside Park'], [19, 'Khu Bảo Tàng', 'Museum Quarter'], [21, 'Khu Hội Nghị', 'Convention Hub'],
    [23, 'Phố Ẩm Thực', 'Food Street'], [24, 'Khu Giải Trí', 'Showtime Strip'], [25, 'Ga Bến Thành Mới', 'Eastside Station'],
    [26, 'Bến Du Thuyền', 'Marina Bay'], [27, 'Khu Căn Hộ Cao Cấp', 'Skyline Towers'], [28, 'Điện Lực', 'Power Grid'],
    [29, 'Phố Luật', 'Court Row'], [31, 'Đại Lộ Midtown', 'Midtown Avenue'], [32, 'Khu Tập Đoàn', 'Corporate Plaza'],
    [34, 'Tháp Tài Chính', 'Finance Tower'], [35, 'Sân Bay Quốc Tế', 'International Airport'],
    [37, 'Trung Tâm Thương Mại', 'Commerce Center'], [39, 'Tháp Biểu Tượng', 'Landmark Tower'],
  ]),
  tileVisuals: { districtColors: { ...BASE_DISTRICT_HEX }, frame: '#334155' },
  background: {
    gradient: 'radial-gradient(1200px 600px at 50% -10%, #12203d 0%, #080c14 60%)',
    boardGradient: 'linear-gradient(180deg,#0a0e17,#0a0e17)',
  },
  environment: { kind: 'none', intensity: 0 },
  animations: { introMs: 1300, tileLiftPx: 2 },
  chaosPresentation: { label: { vi: 'Biến Động Thị Trường', en: 'Market Shock' }, accent: '#06b6d4' },
  features: [
    { vi: 'Kinh tế chuẩn: lạm phát +2,5%/vòng (trần 2,4x), hoàn bán 75%, thế chấp 60%', en: 'Balanced market: +2.5%/round inflation (2.4x cap), 75% sellback, 60% mortgage' },
    { vi: 'Sự kiện: hưng phấn thị trường, siết tín dụng, hội chợ thương mại', en: 'Events: market rally, credit squeeze, trade expo' },
  ],
});
