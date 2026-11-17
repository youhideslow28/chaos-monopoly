import { DEFAULT_WORLD_ID, WORLD_SCHEMA_VERSION, WorldCatalogEntry, WorldId, WorldPalette } from './types';

const pal = (
  bg: string, bgAlt: string, surface: string, border: string,
  accent: string, accent2: string, text: string, glow: string
): WorldPalette => ({ bg, bgAlt, surface, border, accent, accent2, text, glow });

type Seed = Omit<WorldCatalogEntry, 'schemaVersion' | 'version'>;

const SEEDS: Seed[] = [
  {
    id: 'modern-metropolis', order: 1, availability: 'AVAILABLE', completeness: 'FULL',
    name: { vi: 'Đô Thị Hiện Đại', en: 'Modern Metropolis' },
    tagline: { vi: 'Tài chính • Bất động sản • Thương mại', en: 'Finance • Real estate • Commerce' },
    description: {
      vi: 'Thành phố hiện đại của các tập đoàn lớn, khu tài chính và trung tâm thương mại. Thị trường biến động theo từng vòng.',
      en: 'A modern city of major corporations, financial districts and shopping centres. The market shifts round by round.',
    },
    styleTags: [{ vi: 'Cao tầng', en: 'Skyline' }, { vi: 'Tối giản cao cấp', en: 'Premium minimal' }],
    palette: pal('#080c14', '#0e1628', '#0f172a', '#334155', '#06b6d4', '#6366f1', '#e2e8f0', 'rgba(6,182,212,0.18)'),
  },
  {
    id: 'cyberpunk-city', order: 2, availability: 'AVAILABLE', completeness: 'FULL',
    name: { vi: 'Thành Phố Cyberpunk', en: 'Cyberpunk City' },
    tagline: { vi: 'Công nghệ • AI • Năng lượng', en: 'Tech • AI • Energy' },
    description: {
      vi: 'Đô thị tương lai về đêm, nơi các tập đoàn công nghệ giành quyền kiểm soát lưới điện và dữ liệu.',
      en: 'A future city at night where tech corporations fight for control of the grid and the data.',
    },
    styleTags: [{ vi: 'Neon tiết chế', en: 'Restrained neon' }, { vi: 'Mưa đêm', en: 'Night rain' }],
    palette: pal('#0a0614', '#1a0b2e', '#150a26', '#6d28d9', '#e879f9', '#22d3ee', '#f5e9ff', 'rgba(232,121,249,0.22)'),
  },
  {
    id: 'mekong-delta', order: 3, availability: 'AVAILABLE', completeness: 'FULL',
    name: { vi: 'Miền Tây Sông Nước', en: 'Mekong Delta' },
    tagline: { vi: 'Chợ nổi • Mùa vụ • Vận tải đường thủy', en: 'Floating markets • Harvests • River freight' },
    description: {
      vi: 'Vùng đồng bằng sông nước với kênh rạch, chợ nổi và vườn cây trái. Mùa vụ và thủy lộ ảnh hưởng thương mại.',
      en: 'A river delta of canals, floating markets and orchards. Harvests and waterways shape local trade.',
    },
    styleTags: [{ vi: 'Nhiệt đới thân thiện', en: 'Warm tropical' }, { vi: 'Sông nước', en: 'Waterways' }],
    palette: pal('#06150f', '#0b2a1d', '#0d2219', '#15803d', '#34d399', '#fbbf24', '#ecfdf5', 'rgba(52,211,153,0.2)'),
  },
  {
    id: 'quang-tri-highlands', order: 4, availability: 'AVAILABLE', completeness: 'FULL',
    name: { vi: 'Cao Nguyên Quảng Trị', en: 'Quảng Trị Highlands' },
    tagline: { vi: 'Mùa mưa • Mùa khô • Cà phê', en: 'Wet season • Dry season • Coffee' },
    description: {
      vi: 'Cao nguyên miền Trung với mùa mưa, mùa khô và đồi cà phê. Thuê và giá xây đổi theo mùa.',
      en: 'Central highlands of wet and dry seasons and coffee hills. Rents and build costs follow the season.',
    },
    styleTags: [{ vi: 'Núi đồi', en: 'Highlands' }],
    palette: pal('#0f1a12', '#1d2b1f', '#162017', '#4d7c0f', '#a3e635', '#fb923c', '#f7fee7', 'rgba(163,230,53,0.16)'),
  },
  {
    id: 'northwest-vietnam', order: 5, availability: 'AVAILABLE', completeness: 'FULL',
    name: { vi: 'Tây Bắc Việt Nam', en: 'Northwest Vietnam' },
    tagline: { vi: 'Ruộng bậc thang • Phiên chợ • Đèo', en: 'Terraces • Market days • Mountain passes' },
    description: {
      vi: 'Ruộng bậc thang và chợ phiên vùng cao. Phiên chợ mở mỗi 5 vòng: giao dịch tự do và hoàn tiền 100%.',
      en: 'Terraced fields and highland fairs. A market opens every 5 rounds: free trading and 100% sellback.',
    },
    styleTags: [{ vi: 'Núi nhiều lớp', en: 'Layered mountains' }],
    palette: pal('#101a14', '#1f3326', '#16241b', '#65a30d', '#bef264', '#f59e0b', '#f7fee7', 'rgba(190,242,100,0.16)'),
  },
  {
    id: 'fantasy-kingdom', order: 6, availability: 'COMING_SOON', completeness: 'CONFIG_ONLY',
    name: { vi: 'Vương Quốc Giả Tưởng', en: 'Fantasy Kingdom' },
    tagline: { vi: 'Lâu đài • Phép thuật • Thế lực', en: 'Castles • Magic • Factions' },
    description: {
      vi: 'Vương quốc phép thuật với lâu đài và rừng huyền bí. Sắp ra mắt.',
      en: 'A magical realm of castles and enchanted forests. Coming soon.',
    },
    styleTags: [{ vi: 'Huyền ảo', en: 'Enchanted' }],
    palette: pal('#120a24', '#24103f', '#1b0f33', '#7c3aed', '#c4b5fd', '#fcd34d', '#f5f3ff', 'rgba(196,181,253,0.18)'),
  },
  {
    id: 'tropical-island', order: 7, availability: 'COMING_SOON', completeness: 'CONFIG_ONLY',
    name: { vi: 'Đảo Nhiệt Đới', en: 'Tropical Island' },
    tagline: { vi: 'Du lịch • Cảng biển • Tài nguyên biển', en: 'Tourism • Harbours • Marine resources' },
    description: {
      vi: 'Quần đảo nhiệt đới với resort và bến cảng. Sắp ra mắt.',
      en: 'A tropical archipelago of resorts and harbours. Coming soon.',
    },
    styleTags: [{ vi: 'Biển xanh', en: 'Blue sea' }],
    palette: pal('#04202a', '#08394a', '#0a2c3a', '#0891b2', '#22d3ee', '#fde047', '#ecfeff', 'rgba(34,211,238,0.2)'),
  },
  {
    id: 'space-colony', order: 8, availability: 'AVAILABLE', completeness: 'FULL',
    name: { vi: 'Thuộc Địa Không Gian', en: 'Space Colony' },
    tagline: { vi: 'Năng lượng • Tài nguyên • Sự cố trạm', en: 'Energy • Resources • Station incidents' },
    description: {
      vi: 'Các trạm vũ trụ và khu định cư ngoài Trái Đất, nơi năng lượng và tài nguyên quyết định tất cả.',
      en: 'Space stations and off-world settlements where energy and resources decide everything.',
    },
    styleTags: [{ vi: 'Không gian sâu', en: 'Deep space' }, { vi: 'Công nghệ tương lai', en: 'Future tech' }],
    palette: pal('#05070f', '#0c1226', '#0a1020', '#3b82f6', '#60a5fa', '#f472b6', '#e0e7ff', 'rgba(96,165,250,0.2)'),
  },
];

export const WORLD_CATALOG: readonly WorldCatalogEntry[] = SEEDS.map(s => ({
  ...s,
  schemaVersion: WORLD_SCHEMA_VERSION,
  version: 1,
}));

export function getCatalogEntry(id: unknown): WorldCatalogEntry | undefined {
  return typeof id === 'string' ? WORLD_CATALOG.find(w => w.id === id) : undefined;
}

/** Server-authoritative gate: a world may be used for a match only if it exists AND is AVAILABLE. */
export function isWorldSelectable(id: unknown): id is WorldId {
  const e = getCatalogEntry(id);
  return !!e && e.availability === 'AVAILABLE';
}

export function resolveWorldId(id: unknown): WorldId {
  return isWorldSelectable(id) ? id : (DEFAULT_WORLD_ID as WorldId);
}
