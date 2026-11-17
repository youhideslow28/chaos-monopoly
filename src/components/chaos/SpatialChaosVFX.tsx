import React, { useEffect, useState } from 'react';
import { ChaosCard } from '../../game/types';
import { CameraState, getTile3DPosition, Vector3D } from '../board/spatialMath';
import { TrendingDown, Flame, Sparkles, Coins } from 'lucide-react';

export type SpatialChaosEffectType = 'METEOR_STRIKE' | 'MARKET_CRASH' | 'ECONOMIC_BOOM';

export interface SpatialChaosVFXProps {
  card?: ChaosCard | null;
  boardSize: number;
  slabHeight?: number;
  camera?: CameraState;
  forceEffect?: SpatialChaosEffectType;
  targetTileId?: number;
  onAnimationComplete?: () => void;
}

/**
 * Determines which 3D spatial effect to trigger based on chaos card metadata.
 */
export function determineChaosEffectType(
  card?: ChaosCard | null,
  forceEffect?: SpatialChaosEffectType
): SpatialChaosEffectType | null {
  if (forceEffect) return forceEffect;
  if (!card) return null;

  const typeStr = (card.effectType || '').toString().toUpperCase();
  const titleStr = (card.title || card.nameVi || card.id || '').toUpperCase();

  // 1. Market Crash: financial downturns, devaluations, high taxes
  if (
    /CRASH|INFLATION|TAX|INTEREST|RECESSION|DEVALUE|DOWNGRADE|MORTGAGE_FREEZE/.test(typeStr) ||
    /CRASH|SỤP ĐỔ|KHỦNG HOẢNG|LẠM PHÁT|THUẾ|TRỪNG PHẠT/.test(titleStr)
  ) {
    return 'MARKET_CRASH';
  }

  // 2. Economic Boom: windfalls, dividends, jackpots, subsidies
  if (
    /BOOM|JACKPOT|WINDFALL|SUBSIDY|DIVIDEND|LOTTERY|GOLD|GRANT|PROSPERITY/.test(typeStr) ||
    /BOOM|THỊNH VƯỢNG|PHÁT TÀI|KHO BÁU|JACKPOT|THƯỞNG|TRÚNG SỐ/.test(titleStr)
  ) {
    return 'ECONOMIC_BOOM';
  }

  // 3. Meteor Strike: physical destruction, calamities, meteorites, typhoons
  if (
    card.rarity === 'CALAMITY' ||
    /METEOR|CALAMITY|DEMOLISH|DISASTER|STRIKE|TYPHOON|ALIEN|EARTHQUAKE|FIRE/.test(typeStr) ||
    /METEOR|THIÊN THẠCH|THẢM HỌA|BÃO|SÓNG THẦN|HỎA HOẠN|ĐỘNG ĐẤT/.test(titleStr)
  ) {
    return 'METEOR_STRIKE';
  }

  // Default to Meteor Strike for negative/calamity effects, Economic Boom for others
  return card.rarity === 'COMMON' || card.rarity === 'UNCOMMON' ? 'ECONOMIC_BOOM' : 'METEOR_STRIKE';
}

/**
 * Resolves the 3D position in pixel space for a chaos effect.
 */
export function resolveChaos3DPosition(
  effectType: SpatialChaosEffectType,
  boardSize: number,
  slabHeight: number = 28,
  targetTileId?: number,
  card?: ChaosCard | null
): Vector3D {
  if (effectType === 'ECONOMIC_BOOM') {
    // Economic Boom centers at the main plaza (0, 0)
    return { x: 0, y: 0, z: slabHeight };
  }

  // Targeted effects (Meteor Strike, Market Crash) anchor to target tile
  const tileId = targetTileId ?? card?.targetTileId ?? 20;
  return getTile3DPosition(tileId, boardSize, slabHeight);
}

export const SpatialChaosVFX: React.FC<SpatialChaosVFXProps> = ({
  card,
  boardSize,
  slabHeight = 28,
  forceEffect,
  targetTileId,
  onAnimationComplete,
}) => {
  const effectType = determineChaosEffectType(card, forceEffect);
  const [active, setActive] = useState<boolean>(true);

  useEffect(() => {
    if (!effectType) return;
    setActive(true);
    // Effects play for 2.6 seconds
    const timer = setTimeout(() => {
      setActive(false);
      onAnimationComplete?.();
    }, 2600);
    return () => clearTimeout(timer);
  }, [card?.id, forceEffect, onAnimationComplete]);

  if (!effectType || !active) return null;

  const pos = resolveChaos3DPosition(effectType, boardSize, slabHeight, targetTileId, card);

  return (
    <div
      data-testid="spatial-chaos-vfx"
      data-effect={effectType}
      className="absolute pointer-events-none select-none z-50"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 1. METEOR STRIKE EFFECT */}
      {effectType === 'METEOR_STRIKE' && (
        <div
          data-testid="spatial-vfx-meteor"
          className="relative flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Descending Fiery Projectile */}
          <div
            className="spatial-meteor-projectile absolute flex flex-col items-center justify-center"
            style={{
              width: '40px',
              height: '40px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Core Meteor Rock & Fire */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-300 shadow-[0_0_35px_#f97316] flex items-center justify-center border border-yellow-200">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            {/* Flame Trail */}
            <div
              className="w-4 h-24 bg-gradient-to-t from-transparent via-orange-600/60 to-yellow-400 rounded-full blur-[2px]"
              style={{ transform: 'translateY(-20px)' }}
            />
          </div>

          {/* Expanding Ground Shockwave Rings */}
          <div
            className="spatial-shockwave-ring absolute rounded-full border-4 border-orange-500 shadow-[0_0_30px_#ea580c]"
            style={{
              width: '90px',
              height: '90px',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            className="spatial-shockwave-ring-delayed absolute rounded-full border-2 border-red-500 shadow-[0_0_40px_#ef4444]"
            style={{
              width: '130px',
              height: '130px',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Ground Crater Scorch Decal */}
          <div
            className="spatial-scorch-decal absolute rounded-full bg-red-950/70 border border-orange-600/80 shadow-[0_0_25px_rgba(234,88,12,0.8)]"
            style={{
              width: '60px',
              height: '60px',
              transform: 'translate(-50%, -50%) translateZ(1px)',
            }}
          />
        </div>
      )}

      {/* 2. MARKET CRASH EFFECT */}
      {effectType === 'MARKET_CRASH' && (
        <div
          data-testid="spatial-vfx-market-crash"
          className="relative flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Descending Holographic Wireframe Grid */}
          <div
            className="spatial-market-grid absolute flex items-center justify-center rounded-xl border-2 border-red-500/90 bg-red-950/40 backdrop-blur-xs shadow-[0_0_40px_rgba(239,68,68,0.7)]"
            style={{
              width: '110px',
              height: '110px',
              transform: 'translate(-50%, -50%)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Red Hologram Grid Lines */}
            <div
              className="absolute inset-0 opacity-60 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(239,68,68,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(239,68,68,0.6) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />

            {/* Cascading Downward Red Arrows */}
            <div className="flex flex-col items-center justify-center gap-1">
              <TrendingDown className="w-8 h-8 text-red-400 spatial-down-arrow shadow-[0_0_15px_#ef4444]" />
              <span className="text-[10px] font-black tracking-widest text-red-300 bg-red-900/80 px-2 py-0.5 rounded border border-red-500/80 uppercase">
                CRASH
              </span>
            </div>
          </div>

          {/* Red Perimeter Warning Beacon */}
          <div
            className="spatial-warning-beacon absolute rounded-full border-2 border-red-500/80 animate-ping"
            style={{
              width: '140px',
              height: '140px',
              transform: 'translate(-50%, -50%) translateZ(2px)',
            }}
          />
        </div>
      )}

      {/* 3. ECONOMIC BOOM EFFECT */}
      {effectType === 'ECONOMIC_BOOM' && (
        <div
          data-testid="spatial-vfx-economic-boom"
          className="relative flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Expanding Prosperity Ground Aura */}
          <div
            className="spatial-boom-aura absolute rounded-full border-4 border-amber-400 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 shadow-[0_0_60px_rgba(251,191,36,0.9)]"
            style={{
              width: '180px',
              height: '180px',
              transform: 'translate(-50%, -50%) translateZ(2px)',
            }}
          />

          {/* Golden Particle Fountain Rising Along +Z */}
          {[-25, -10, 0, 10, 25].map((offset, i) => (
            <div
              key={i}
              className={`spatial-gold-stream-${i} absolute flex flex-col items-center`}
              style={{
                transform: `translate3d(${offset * 1.5}px, ${((i * 19) % 30) - 15}px, 0px)`,
                transformStyle: 'preserve-3d',
                animationDelay: `${i * 0.12}s`,
              }}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-100 shadow-[0_0_20px_#f59e0b] flex items-center justify-center border border-yellow-200">
                <Coins className="w-3 h-3 text-amber-950 shrink-0 drop-shadow-xs" />
              </div>
            </div>
          ))}

          {/* Central Fountain Crest Banner */}
          <div
            className="spatial-boom-crest absolute flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/30 border border-amber-300/80 backdrop-blur-sm shadow-[0_0_30px_#fbbf24]"
            style={{
              transform: 'translate(-50%, -50%) translateZ(80px)',
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
            <span className="text-xs font-black text-yellow-200 tracking-wider">BOOM!</span>
          </div>
        </div>
      )}
    </div>
  );
};
