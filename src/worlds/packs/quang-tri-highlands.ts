import { BASE_DISTRICT_HEX, buildTileNames, makePack } from './shared';

export const pack = makePack({
  id: 'quang-tri-highlands',
  typography: { display: "'Baloo 2','Segoe UI',system-ui,sans-serif", body: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif" },
  tileNames: buildTileNames([
    [1, 'Đồi Cà Phê Tân Lâm', 'Tan Lam Coffee Hills'], [3, 'Chợ Đầu Mối Đông Hà', 'Dong Ha Wholesale Market'], [5, 'Ga Đông Hà', 'Dong Ha Station'],
    [6, 'Vườn Hồ Tiêu Cam Lộ', 'Cam Lo Pepper Gardens'], [8, 'Đồi Chè Bốn Lâu', 'Bon Lau Tea Hills'], [9, 'Trang Trại Điện Gió Quảng Trị', 'Quang Tri Wind Farm'],
    [11, 'Làng Truyền Thống Cồn Sẻ', 'Con Se Traditional Village'], [12, 'Thủy Điện Rào Quán', 'Rao Quan Hydro Power'], [13, 'Ruộng Bậc Thang', 'Terraced Fields'],
    [14, 'Thác Tà Puồng', 'Ta Puong Waterfall'], [15, 'Bến Cảng Cửa Việt', 'Cua Viet Port'], [16, 'Nương Chè Khe Sanh', 'Khe Sanh Tea Slopes'],
    [18, 'Hồ Đập Tân Kim', 'Tan Kim Reservoir'], [19, 'Chợ Bến Cảng', 'Harbour Market'], [21, 'Thác Gió', 'Wind Waterfall'],
    [23, 'Cầu Treo Dakrong', 'Dakrong Suspension Bridge'], [24, 'Khu Du Lịch Làng Vây', 'Lang Vay Eco Site'], [25, 'Ga Lao Bảo', 'Lao Bao Station'],
    [26, 'Suối Nước Nóng Bang', 'Bang Hot Springs'], [27, 'Vườn Cao Su', 'Rubber Plantation'], [28, 'Thủy Điện Quảng Bình', 'Hydro Plant'],
    [29, 'Đèo Ngang', 'Ngang Pass'], [31, 'Chợ Đêm Đông Hà', 'Dong Ha Night Market'], [32, 'Làng Nghề Gốm', 'Pottery Village'],
    [34, 'Khu Nghỉ Dưỡng Biển Cửa Tùng', 'Cua Tung Beach Resort'], [35, 'Sân Bay Phú Bài', 'Phu Bai Airfield'],
    [37, 'Khu Công Nghiệp Quán Hàu', 'Quan Hau Industrial Zone'], [39, 'Cầu Nhật Lệ', 'Nhat Le Bridge'],
  ]),
  tileVisuals: {
    districtColors: {
      ...BASE_DISTRICT_HEX,
      'district-brown': '#92400e', 'district-lightblue': '#0ea5e9', 'district-pink': '#fb7185',
      'district-orange': '#f97316', 'district-red': '#ef4444', 'district-yellow': '#facc15',
      'district-green': '#65a30d', 'district-darkblue': '#0284c7',
    },
    frame: '#365314',
  },
  background: {
    gradient: 'radial-gradient(1000px 520px at 50% -15%, #3f6212 0%, transparent 60%), radial-gradient(800px 400px at 100% 100%, #854d0e 0%, transparent 55%), #0f1a12',
    boardGradient: 'linear-gradient(180deg,#1d2b1f,#0f1a12)',
  },
  environment: { kind: 'rain', intensity: 0.35 },
  animations: { introMs: 1200, tileLiftPx: 2 },
  chaosPresentation: { label: { vi: 'Biến Cố Mùa Mưa Khô', en: 'Seasonal Twist' }, accent: '#a3e635' },
  features: [
    { vi: 'Mùa Khô (thuê x1,35, xây x1,15) & Mùa Mưa (thuê/xây x0,85) mỗi 6 vòng; thế chấp ổn định 60%', en: 'Dry (+35% rent/+15% build) & Wet (-15% rent/build) every 6 rounds; stable 60% mortgage' },
    { vi: 'Ô sạt lở bị khoá thu thuê 1 vòng', en: 'Landslide tiles are closed to rent for one round' },
    { vi: 'Cơn mưa nhiệt đới nhẹ', en: 'Light tropical rain' },
  ],
});
