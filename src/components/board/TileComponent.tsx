import React, { useState, useMemo } from 'react';
import { displayTileName } from '../../worlds/runtime';
import { formatMoney } from '../../utils/money';
import { BoardTile, PlayerState, PropertyOwnership } from '../../game/types';
import { SpatialBillboard } from './SpatialBillboard';
import { CameraState, DEFAULT_CAMERA } from './spatialMath';
import { computeTokenPlacements } from './tokenStackingEngine';
import { VolumetricPlayerToken } from './VolumetricPlayerToken';
import { VolumetricBuilding } from './VolumetricBuilding';
import {
  Flag,
  Compass,
  Gift,
  ShoppingBag,
  Receipt,
  Train,
  Sun,
  Sparkles,
  Palmtree,
  Building,
  ShieldAlert,
  Castle,
  Zap,
  Landmark,
  Trees,
  Plane,
  Flame,
  Anchor,
  Factory,
  Car,
  DollarSign,
  Navigation,
  Ship,
  Waves,
  Camera,
  Utensils,
  Droplet,
  Mountain,
  Siren,
  Hotel,
  Coffee,
  Gem,
  Rocket,
  Building2,
  HelpCircle,
} from 'lucide-react';

interface TileComponentProps {
  tile: BoardTile;
  ownership?: PropertyOwnership;
  ownerPlayer?: PlayerState;
  playersHere: PlayerState[];
  activePlayerId?: string;
  isHighlighted?: boolean;
  /** Phase 05: World-provided colour for the district band (falls back to base Tailwind class). */
  bandColor?: string;
  equippedPetId?: string | null;
  onSelect: (tileId: number) => void;
  is3DView?: boolean;
  camera?: CameraState;
  worldId?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Flag: <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />,
  Compass: <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />,
  Gift: <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />,
  ShoppingBag: <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />,
  Receipt: <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />,
  Train: <Train className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />,
  Sun: <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />,
  Sparkles: <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fuchsia-400 animate-pulse" />,
  Palmtree: <Palmtree className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />,
  Building: <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />,
  ShieldAlert: <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />,
  Castle: <Castle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />,
  Zap: <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />,
  Landmark: <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-300" />,
  Trees: <Trees className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />,
  Plane: <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />,
  Flame: <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />,
  Anchor: <Anchor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />,
  Factory: <Factory className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />,
  Car: <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />,
  DollarSign: <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />,
  Navigation: <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />,
  Ship: <Ship className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />,
  Waves: <Waves className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />,
  Camera: <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />,
  Utensils: <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />,
  Droplet: <Droplet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />,
  Mountain: <Mountain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />,
  Siren: <Siren className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 animate-pulse" />,
  Hotel: <Hotel className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />,
  Coffee: <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />,
  Gem: <Gem className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-300" />,
  Rocket: <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />,
  Building2: <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />,
};

const DISTRICT_COLOR_CLASSES: Record<string, string> = {
  'district-brown': 'bg-[#8b4513]',
  'district-lightblue': 'bg-sky-400',
  'district-pink': 'bg-pink-500',
  'district-orange': 'bg-orange-500',
  'district-red': 'bg-rose-500',
  'district-yellow': 'bg-yellow-400',
  'district-green': 'bg-emerald-500',
  'district-darkblue': 'bg-blue-600',
  'district-transport': 'bg-slate-500',
  'district-utility': 'bg-cyan-600',
  'district-food': 'bg-rose-600',
  'district-port': 'bg-blue-600',
  'district-energy': 'bg-emerald-600',
  'district-finance': 'bg-amber-500',
  'district-cyber': 'bg-purple-600',
};

const TileComponentInner: React.FC<TileComponentProps> = ({
  tile,
  ownership,
  ownerPlayer,
  playersHere,
  activePlayerId,
  isHighlighted,
  bandColor,
  equippedPetId,
  onSelect,
  is3DView = true,
  camera = DEFAULT_CAMERA,
  worldId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isCorner = tile.id === 0 || tile.id === 10 || tile.id === 20 || tile.id === 30;
  const isProperty = tile.type === 'PROPERTY' || tile.type === 'TRANSPORT' || tile.type === 'UTILITY';
  const districtColorClass = tile.property
    ? DISTRICT_COLOR_CLASSES[tile.property.districtColor] || 'bg-slate-600'
    : '';

  const tokenPlacements = useMemo(
    () => computeTokenPlacements(playersHere, activePlayerId, is3DView),
    [playersHere, activePlayerId, is3DView]
  );

  const renderUpgradeBadge = (level: number) => {
    if (level <= 0) return null;
    if (level === 5) {
      return (
        <span className="text-[9px] sm:text-[10px] leading-none" title="Siêu Landmark Cấp 5">
          🏙️
        </span>
      );
    }
    return (
      <span className="text-[8px] sm:text-[9px] leading-none text-amber-300" title={`Cấp ${level}`}>
        {'⭐'.repeat(level)}
      </span>
    );
  };

  // 3D tactile plate elevation & transforms
  let elevationZ = 4; // Base tactile 3D plate depth
  let scale = 1;

  if (is3DView) {
    if (ownership?.isMortgaged) {
      elevationZ = -4; // Mortgaged sunken state
    } else if (isHighlighted) {
      elevationZ = 14; // Active player highlighted lift
      scale = 1.02;
    } else if (isHovered) {
      elevationZ = 12; // Hover lift state
      scale = 1.01;
    }
  }

  const transformStyle = is3DView
    ? `translateZ(${elevationZ}px) scale(${scale})`
    : isHighlighted
    ? 'scale(1.03)'
    : isHovered
    ? 'scale(1.02)'
    : 'scale(1)';

  let shadowStyle: string | undefined = undefined;
  if (is3DView) {
    if (ownership?.isMortgaged) {
      shadowStyle = 'inset 0 3px 8px rgba(0, 0, 0, 0.95)';
    } else if (isHighlighted) {
      shadowStyle = '0 16px 28px -6px rgba(0, 0, 0, 0.85), 0 0 20px rgba(6, 182, 212, 0.6)';
    } else if (isHovered) {
      shadowStyle = '0 12px 22px -4px rgba(0, 0, 0, 0.75), 0 0 16px rgba(6, 182, 212, 0.35)';
    } else {
      shadowStyle = '0 4px 8px -2px rgba(0, 0, 0, 0.6)';
    }
  }

  return (
    <div
      data-tile-id={tile.id}
      aria-label={displayTileName(tile)}
      onClick={() => onSelect(tile.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(tile.id);
        }
      }}
      className={`relative w-full h-full flex flex-col justify-between p-1 sm:p-1.5 rounded-lg sm:rounded-xl cursor-pointer select-none border transition-all duration-200 ${
        is3DView ? 'preserve-3d' : 'overflow-hidden'
      } ${
        isCorner
          ? 'bg-slate-100 border-slate-300 shadow-sm'
          : ownership?.isMortgaged
          ? 'bg-slate-100/60 border-slate-200'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
      } ${
        isHighlighted
          ? 'ring-2 ring-emerald-500 z-20'
          : ''
      }`}
      style={{
        minHeight: '44px',
        minWidth: '44px',
        transform: transformStyle,
        transformStyle: is3DView ? 'preserve-3d' : 'flat',
        boxShadow: shadowStyle,
      }}
    >
      {/* Property District Color Band */}
      {isProperty && tile.property && (
        <div
          className={`h-1.5 sm:h-2 w-full rounded-sm sm:rounded-md -mt-0.5 mb-0.5 ${districtColorClass} shadow-sm flex items-center justify-end px-0.5`}
          style={bandColor ? { backgroundColor: bandColor } : undefined}
        >
          {ownership?.level && ownership.level > 0 ? renderUpgradeBadge(ownership.level) : null}
        </div>
      )}

      {/* Volumetric Building in Upper Quadrant */}
      {isProperty && ownership?.level && ownership.level > 0 ? (
        <div
          className="absolute top-2.5 sm:top-3 inset-x-0 flex items-center justify-center pointer-events-none z-10"
          style={is3DView ? { transform: 'translateZ(6px)', transformStyle: 'preserve-3d' } : undefined}
        >
          <VolumetricBuilding
            level={ownership.level}
            districtColor={tile.property?.districtColor || ''}
            districtHex={bandColor}
            worldId={worldId}
            isMortgaged={ownership.isMortgaged}
            tileType={tile.type}
            isIsometric={is3DView}
          />
        </div>
      ) : null}

      {/* Special Corner or Non-Property Badge */}
      {!isProperty && (
        <div className="h-1.5 sm:h-2 w-full rounded-sm -mt-0.5 mb-0.5 bg-slate-200"></div>
      )}

      {/* Main Center Info */}
      <div className="flex flex-col items-center text-center my-auto px-0.5">
        <div className="mb-0.5 shrink-0">
          {ICON_MAP[tile.iconName] || <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />}
        </div>
        <span className="text-[8px] sm:text-[10px] font-extrabold text-slate-800 leading-tight line-clamp-2">
          {displayTileName(tile)}
        </span>

        {/* Price / Cost Readout with SpatialBillboard */}
        {tile.property && (
          <SpatialBillboard elevation={4} camera={camera} is3D={is3DView}>
            <span className="text-[7.5px] sm:text-[9px] font-black text-emerald-700 mt-0.5 inline-block">
              {formatMoney(tile.property.basePrice)}
            </span>
          </SpatialBillboard>
        )}

        {tile.taxAmount && (
          <SpatialBillboard elevation={4} camera={camera} is3D={is3DView}>
            <span className="text-[7.5px] sm:text-[9px] font-black text-rose-600 mt-0.5 inline-block">
              {formatMoney(tile.taxAmount)}
            </span>
          </SpatialBillboard>
        )}
      </div>

      {/* Mortgage Pattern Stripe Overlay */}
      {ownership?.isMortgaged && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center bg-red-950/40 border-2 border-red-500/60 z-10 rounded-lg sm:rounded-xl"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(239,68,68,0.2), rgba(239,68,68,0.2) 6px, transparent 6px, transparent 12px)',
          }}
        >
          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-red-600/90 text-white shadow-sm rotate-[-12deg]">
            THẾ CHẤP
          </span>
        </div>
      )}

      {/* Ownership Ribbon */}
      {ownerPlayer && !ownership?.isMortgaged && (
        <div
          className="w-full text-[7px] sm:text-[8px] font-black py-0.5 rounded text-center truncate text-white shadow-sm mt-0.5"
          style={{ backgroundColor: ownerPlayer.token.colorHex }}
          title={`Chủ sở hữu: ${ownerPlayer.name}`}
        >
          {ownerPlayer.name}
        </div>
      )}

      {/* Occupying Player Tokens using 2.5D Volumetric Token Stacking Engine */}
      {playersHere.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={is3DView ? { transformStyle: 'preserve-3d' } : undefined}
        >
          {playersHere.map((player) => {
            const placement = tokenPlacements[player.id];
            if (!placement) return null;
            return (
              <VolumetricPlayerToken
                key={player.id}
                player={player}
                isPlayerActive={player.id === activePlayerId}
                equippedPetId={equippedPetId}
                placement={placement}
                isIsometric={is3DView}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TileComponent = React.memo(TileComponentInner);


