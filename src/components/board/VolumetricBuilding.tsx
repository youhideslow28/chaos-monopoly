import React from 'react';

export interface VolumetricBuildingProps {
  level: number;              // 1 to 5
  districtColor: string;      // Tailwind class or district ID (e.g. 'RED', 'BLUE', etc.)
  districtHex?: string;       // Custom hex from world pack
  worldId?: string;           // 'modern-metropolis' | 'cyberpunk-city' | 'mekong-delta' | 'space-colony'
  isMortgaged?: boolean;
  tileType?: string;          // 'PROPERTY' | 'TRANSPORT' | 'UTILITY'
  isIsometric?: boolean;
}

/**
 * World-specific material styling presets.
 */
interface WorldMaterialTheme {
  wallBg: string;
  wallBorder: string;
  roofBg: string;
  windowGlow: string;
  accentGlow: string;
  trimColor: string;
}

function getWorldTheme(worldId?: string, fallbackHex?: string): WorldMaterialTheme {
  const accent = fallbackHex || '#06b6d4';

  switch (worldId) {
    case 'cyberpunk-city':
      return {
        wallBg: 'bg-gradient-to-b from-slate-900 to-black',
        wallBorder: 'border-fuchsia-500/50',
        roofBg: 'bg-gradient-to-tr from-cyan-950 via-slate-900 to-fuchsia-950',
        windowGlow: 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]',
        accentGlow: 'shadow-[0_0_12px_rgba(217,70,239,0.7)]',
        trimColor: '#d946ef',
      };
    case 'mekong-delta':
      return {
        wallBg: 'bg-gradient-to-b from-amber-900/90 to-amber-950',
        wallBorder: 'border-amber-700/60',
        roofBg: 'bg-gradient-to-tr from-orange-800 via-amber-700 to-red-800',
        windowGlow: 'bg-amber-300 shadow-[0_0_5px_rgba(252,211,77,0.8)]',
        accentGlow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]',
        trimColor: '#f59e0b',
      };
    case 'space-colony':
      return {
        wallBg: 'bg-gradient-to-b from-slate-100 to-slate-300',
        wallBorder: 'border-cyan-300/80',
        roofBg: 'bg-gradient-to-tr from-cyan-200 via-white to-slate-200',
        windowGlow: 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.9)]',
        accentGlow: 'shadow-[0_0_14px_rgba(6,182,212,0.8)]',
        trimColor: '#06b6d4',
      };
    case 'modern-metropolis':
    default:
      return {
        wallBg: 'bg-gradient-to-b from-slate-800 to-slate-950',
        wallBorder: 'border-slate-600/70',
        roofBg: 'bg-gradient-to-tr from-slate-700 via-slate-800 to-cyan-950',
        windowGlow: 'bg-amber-200 shadow-[0_0_5px_rgba(254,240,138,0.8)]',
        accentGlow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]',
        trimColor: accent,
      };
  }
}

const VolumetricBuildingInner: React.FC<VolumetricBuildingProps> = ({
  level,
  districtColor: _districtColor,
  districtHex,
  worldId = 'modern-metropolis',
  isMortgaged = false,
  tileType = 'PROPERTY',
  isIsometric = true,
}) => {
  if (level <= 0 || tileType !== 'PROPERTY') return null;

  const theme = getWorldTheme(worldId, districtHex);
  const colorAccent = districtHex || '#3b82f6';

  // Tier 1: Shophouse / Townhouse (Pitched roof gable)
  const renderTier1 = () => (
    <div
      className={`relative w-4 h-3.5 sm:w-5 sm:h-4 rounded-xs border ${theme.wallBorder} ${theme.wallBg} flex flex-col items-center justify-between shadow-md`}
      style={{
        transform: isIsometric ? 'translateZ(10px)' : undefined,
        transformStyle: isIsometric ? 'preserve-3d' : 'flat',
      }}
    >
      {/* Pitched Roof Ridge */}
      <div
        className="w-full h-1 sm:h-1.5 rounded-t-xs -mt-1 shadow-xs"
        style={{
          backgroundColor: colorAccent,
          clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
        }}
      />
      {/* Front lit window & entrance */}
      <div className="flex items-center justify-center gap-0.5 my-auto">
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
      </div>
    </div>
  );

  // Tier 2: Duplex / Dual Shophouses (Twin linked buildings)
  const renderTier2 = () => (
    <div
      className="relative flex items-end gap-0.5 shadow-md"
      style={{
        transform: isIsometric ? 'translateZ(14px)' : undefined,
        transformStyle: isIsometric ? 'preserve-3d' : 'flat',
      }}
    >
      {/* Left house */}
      <div className={`w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-xs border ${theme.wallBorder} ${theme.wallBg} flex flex-col justify-between`}>
        <div
          className="w-full h-1 rounded-t-xs -mt-0.5"
          style={{ backgroundColor: colorAccent, clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
        />
        <div className="flex justify-center gap-0.5 mb-0.5">
          <span className={`w-0.5 h-1 rounded-xs ${theme.windowGlow}`} />
          <span className={`w-0.5 h-1 rounded-xs ${theme.windowGlow}`} />
        </div>
      </div>
      {/* Right house (slightly offset) */}
      <div className={`w-3 h-4.5 sm:w-3.5 sm:h-5 rounded-xs border ${theme.wallBorder} ${theme.wallBg} flex flex-col justify-between`}>
        <div
          className="w-full h-1 rounded-t-xs -mt-0.5"
          style={{ backgroundColor: colorAccent, clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
        />
        <div className="flex justify-center gap-0.5 mb-0.5">
          <span className={`w-0.5 h-1 rounded-xs ${theme.windowGlow}`} />
          <span className={`w-0.5 h-1 rounded-xs ${theme.windowGlow}`} />
        </div>
      </div>
    </div>
  );

  // Tier 3: Mid-Rise Apartments (4-story flat-roof block with HVAC)
  const renderTier3 = () => (
    <div
      className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-xs border ${theme.wallBorder} ${theme.wallBg} flex flex-col justify-between p-0.5 shadow-lg`}
      style={{
        transform: isIsometric ? 'translateZ(20px)' : undefined,
        transformStyle: isIsometric ? 'preserve-3d' : 'flat',
      }}
    >
      {/* Rooftop HVAC and parapet trim */}
      <div
        className="w-full h-1 rounded-t-xs flex items-center justify-between px-0.5 -mt-0.5"
        style={{ backgroundColor: colorAccent }}
      >
        <span className="w-1 h-0.5 bg-slate-400 rounded-xs shadow-xs" />
        <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" />
      </div>
      {/* 4 windows grid */}
      <div className="grid grid-cols-2 gap-0.5 px-0.5 my-auto">
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
      </div>
    </div>
  );

  // Tier 4: Corporate High-Rise Tower (Stepped cantilever, Helipad 'H')
  const renderTier4 = () => (
    <div
      className={`relative w-5 h-7 sm:w-6 sm:h-8 rounded-xs border-2 ${theme.wallBorder} ${theme.wallBg} flex flex-col justify-between p-0.5 shadow-xl`}
      style={{
        transform: isIsometric ? 'translateZ(28px)' : undefined,
        transformStyle: isIsometric ? 'preserve-3d' : 'flat',
      }}
    >
      {/* Rooftop Helipad with 'H' mark */}
      <div
        className="w-full h-2 rounded-t-xs flex items-center justify-center -mt-0.5 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${colorAccent}, #0f172a)`,
        }}
      >
        <span className="text-[6px] font-black text-amber-300 leading-none">H</span>
      </div>
      {/* Glass Curtain Wall Windows */}
      <div className="grid grid-cols-2 gap-0.5 px-0.5 my-auto">
        <span className={`w-1.5 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1.5 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1.5 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1.5 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1.5 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1.5 h-1 rounded-xs ${theme.windowGlow}`} />
      </div>
    </div>
  );

  // Tier 5: Super Landmark / Monumental Skyscraper (Spire beacon & multi-tier crown)
  const renderTier5 = () => (
    <div
      className={`relative w-6 h-9 sm:w-7 sm:h-10 rounded-xs border-2 ${theme.wallBorder} ${theme.wallBg} flex flex-col justify-between p-0.5 shadow-2xl ${theme.accentGlow}`}
      style={{
        transform: isIsometric ? 'translateZ(38px)' : undefined,
        transformStyle: isIsometric ? 'preserve-3d' : 'flat',
      }}
    >
      {/* Iconic Spire & Glowing Crown Beacon */}
      <div className="absolute -top-3.5 inset-x-0 flex flex-col items-center pointer-events-none">
        <div className="w-0.5 h-2 bg-gradient-to-t from-cyan-400 to-white shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-pulse" />
        <div
          className="w-3.5 h-1.5 rounded-t-xs shadow-md flex items-center justify-center"
          style={{ backgroundColor: colorAccent }}
        >
          <span className="text-[6px] leading-none">👑</span>
        </div>
      </div>
      {/* Upper Crown Setback */}
      <div className="w-full h-1 bg-slate-800 rounded-xs border border-white/30 mt-0.5" />
      {/* Window Columns */}
      <div className="grid grid-cols-3 gap-0.5 px-0.5 my-auto">
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
        <span className={`w-1 h-1 rounded-xs ${theme.windowGlow}`} />
      </div>
    </div>
  );

  const renderTier = () => {
    switch (level) {
      case 1:
        return renderTier1();
      case 2:
        return renderTier2();
      case 3:
        return renderTier3();
      case 4:
        return renderTier4();
      case 5:
      default:
        return renderTier5();
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center pointer-events-none transition-all duration-300 ${
        isMortgaged ? 'grayscale-[0.85] opacity-75' : ''
      }`}
      data-testid={`volumetric-building-tier-${level}`}
      title={level === 5 ? 'Siêu Landmark Cấp 5' : `Công trình Cấp ${level}`}
    >
      {renderTier()}

      {/* Mortgaged Holographic Caution Scaffolding Overlay */}
      {isMortgaged && (
        <div
          className="absolute -inset-1 rounded-xs border border-red-500/80 bg-red-950/30 pointer-events-none flex items-center justify-center animate-pulse"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(239,68,68,0.3), rgba(239,68,68,0.3) 3px, transparent 3px, transparent 6px)',
          }}
        >
          <span className="text-[7px] font-black text-amber-300 bg-black/80 px-0.5 rounded shadow-xs">
            🚧
          </span>
        </div>
      )}
    </div>
  );
};

export const VolumetricBuilding = React.memo(VolumetricBuildingInner);
