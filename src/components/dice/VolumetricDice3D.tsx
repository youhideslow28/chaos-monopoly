import React, { useEffect, useState, useMemo } from 'react';

export interface VolumetricDice3DProps {
  dice: [number, number];
  isRolling: boolean;
  isDouble: boolean;
  diceSkinId?: string;
  onRollComplete?: () => void;
}

/**
 * Opposite face mathematical mapping:
 * 1 + 6 = 7
 * 2 + 5 = 7
 * 3 + 4 = 7
 */
export const OPPOSITE_FACES: Record<number, number> = {
  1: 6,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
  6: 1,
};

/**
 * Exact Euler rotation angles (degrees) to present each face directly to the camera.
 */
export const DICE_FACE_ORIENTATIONS: Record<number, { rotX: number; rotY: number }> = {
  1: { rotX: 0, rotY: 0 },
  2: { rotX: -90, rotY: 0 },
  3: { rotX: 0, rotY: -90 },
  4: { rotX: 0, rotY: 90 },
  5: { rotX: 90, rotY: 0 },
  6: { rotX: 0, rotY: 180 },
};

export function getFaceRotation(value: number): { rotX: number; rotY: number } {
  const norm = Math.max(1, Math.min(6, Math.round(value)));
  return DICE_FACE_ORIENTATIONS[norm] || DICE_FACE_ORIENTATIONS[1];
}

interface SkinPalette {
  faceBg: string;
  border: string;
  pipColor: string;
  pipCenter: string;
  shadow: string;
}

export function getDiceSkinPalette(skinId?: string): SkinPalette {
  switch (skinId) {
    case 'dice-cyber-gold':
      return {
        faceBg: 'bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-500',
        border: 'border-amber-300',
        pipColor: 'bg-amber-950 shadow-inner',
        pipCenter: 'bg-red-700 shadow-inner',
        shadow: 'rgba(245, 158, 11, 0.6)',
      };
    case 'dice-obsidian-void':
      return {
        faceBg: 'bg-gradient-to-br from-slate-950 via-purple-950 to-black',
        border: 'border-purple-500',
        pipColor: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]',
        pipCenter: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]',
        shadow: 'rgba(168, 85, 247, 0.5)',
      };
    case 'dice-starlight':
      return {
        faceBg: 'bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-950',
        border: 'border-cyan-400',
        pipColor: 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]',
        pipCenter: 'bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.9)]',
        shadow: 'rgba(6, 182, 212, 0.5)',
      };
    case 'dice-flame-ruby':
      return {
        faceBg: 'bg-gradient-to-br from-rose-950 via-red-800 to-amber-700',
        border: 'border-rose-400',
        pipColor: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]',
        pipCenter: 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)]',
        shadow: 'rgba(244, 63, 94, 0.6)',
      };
    case 'dice-neon-cyan':
      return {
        faceBg: 'bg-gradient-to-br from-cyan-950 via-slate-900 to-black',
        border: 'border-cyan-400',
        pipColor: 'bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]',
        pipCenter: 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]',
        shadow: 'rgba(6, 182, 212, 0.7)',
      };
    default:
      return {
        faceBg: 'bg-gradient-to-br from-white via-slate-100 to-slate-200',
        border: 'border-slate-300',
        pipColor: 'bg-slate-900 shadow-inner',
        pipCenter: 'bg-rose-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]',
        shadow: 'rgba(0, 0, 0, 0.4)',
      };
  }
}

/**
 * Authentic pip layout renderer for dice faces 1 through 6.
 */
function renderFacePips(value: number, palette: SkinPalette) {
  switch (value) {
    case 1:
      return (
        <div className="flex items-center justify-center w-full h-full">
          <span className={`w-3.5 h-3.5 rounded-full ${palette.pipCenter}`} />
        </div>
      );
    case 2:
      return (
        <div className="flex justify-between w-full h-full p-2">
          <span className={`w-2 h-2 rounded-full self-start ${palette.pipColor}`} />
          <span className={`w-2 h-2 rounded-full self-end ${palette.pipColor}`} />
        </div>
      );
    case 3:
      return (
        <div className="flex justify-between w-full h-full p-2">
          <span className={`w-2 h-2 rounded-full self-start ${palette.pipColor}`} />
          <span className={`w-2 h-2 rounded-full self-center ${palette.pipColor}`} />
          <span className={`w-2 h-2 rounded-full self-end ${palette.pipColor}`} />
        </div>
      );
    case 4:
      return (
        <div className="grid grid-cols-2 gap-2 p-2 w-full h-full items-center justify-items-center">
          <span className={`w-2 h-2 rounded-full ${palette.pipColor}`} />
          <span className={`w-2 h-2 rounded-full ${palette.pipColor}`} />
          <span className={`w-2 h-2 rounded-full ${palette.pipColor}`} />
          <span className={`w-2 h-2 rounded-full ${palette.pipColor}`} />
        </div>
      );
    case 5:
      return (
        <div className="grid grid-cols-3 gap-1 p-2 w-full h-full items-center justify-items-center">
          <span className={`w-1.5 h-1.5 rounded-full self-start justify-self-start ${palette.pipColor}`} />
          <span />
          <span className={`w-1.5 h-1.5 rounded-full self-start justify-self-end ${palette.pipColor}`} />
          <span />
          <span className={`w-1.5 h-1.5 rounded-full ${palette.pipColor}`} />
          <span />
          <span className={`w-1.5 h-1.5 rounded-full self-end justify-self-start ${palette.pipColor}`} />
          <span />
          <span className={`w-1.5 h-1.5 rounded-full self-end justify-self-end ${palette.pipColor}`} />
        </div>
      );
    case 6:
      return (
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 p-2 w-full h-full items-center justify-items-center">
          <span className={`w-1.5 h-1.5 rounded-full ${palette.pipColor}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${palette.pipColor}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${palette.pipColor}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${palette.pipColor}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${palette.pipColor}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${palette.pipColor}`} />
        </div>
      );
    default:
      return null;
  }
}

/**
 * Single 3D Volumetric Cube Die Component with 6 true CSS 3D faces.
 */
interface SingleDieProps {
  value: number;
  isRolling: boolean;
  palette: SkinPalette;
  tumbleBonusX: number;
  tumbleBonusY: number;
  bounceOffset: number;
  reducedMotion: boolean;
}

const SingleDie: React.FC<SingleDieProps> = ({
  value,
  isRolling,
  palette,
  tumbleBonusX,
  tumbleBonusY,
  bounceOffset,
  reducedMotion,
}) => {
  const cubeSize = 54; // px
  const halfDepth = cubeSize / 2; // 27px

  const target = getFaceRotation(value);

  // Rotation angles: tumble if rolling, target orientation when settled
  const currentRotX = isRolling && !reducedMotion ? target.rotX + tumbleBonusX : target.rotX;
  const currentRotY = isRolling && !reducedMotion ? target.rotY + tumbleBonusY : target.rotY;
  const currentBounce = isRolling && !reducedMotion ? bounceOffset : 0;

  // Face CSS 3D transforms enforcing 1+6=7, 2+5=7, 3+4=7 opposite pairings
  const faces = useMemo(
    () => [
      { faceNum: 1, transform: `translateZ(${halfDepth}px)` },
      { faceNum: 6, transform: `rotateY(180deg) translateZ(${halfDepth}px)` },
      { faceNum: 2, transform: `rotateX(90deg) translateZ(${halfDepth}px)` },
      { faceNum: 5, transform: `rotateX(-90deg) translateZ(${halfDepth}px)` },
      { faceNum: 3, transform: `rotateY(90deg) translateZ(${halfDepth}px)` },
      { faceNum: 4, transform: `rotateY(-90deg) translateZ(${halfDepth}px)` },
    ],
    [halfDepth]
  );

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        width: `${cubeSize}px`,
        height: `${cubeSize}px`,
        perspective: '600px',
      }}
    >
      {/* Dynamic Ground Contact Shadow on Tray Surface */}
      <div
        className="absolute rounded-full transition-all duration-150 pointer-events-none"
        style={{
          width: isRolling ? '36px' : '48px',
          height: isRolling ? '14px' : '20px',
          bottom: '-6px',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 70%)',
          filter: isRolling ? 'blur(4px)' : 'blur(2px)',
          opacity: isRolling ? 0.45 : 0.85,
        }}
      />

      {/* 3D Rotating Cube Container */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateY(${currentBounce}px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`,
          transition: reducedMotion
            ? 'none'
            : isRolling
            ? 'transform 100ms linear'
            : 'transform 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {faces.map(({ faceNum, transform }) => (
          <div
            key={faceNum}
            className={`absolute inset-0 rounded-xl border-2 ${palette.border} ${palette.faceBg} shadow-md flex items-center justify-center backface-hidden`}
            style={{
              transform,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {renderFacePips(faceNum, palette)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const VolumetricDice3D: React.FC<VolumetricDice3DProps> = ({
  dice,
  isRolling,
  isDouble,
  diceSkinId,
  onRollComplete,
}) => {
  const palette = useMemo(() => getDiceSkinPalette(diceSkinId), [diceSkinId]);

  // Check prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener?.('change', listener);
      return () => mediaQuery.removeEventListener?.('change', listener);
    }
  }, []);

  // Multi-axis tumbling physics simulation
  const [tumbleX1, setTumbleX1] = useState(0);
  const [tumbleY1, setTumbleY1] = useState(0);
  const [tumbleX2, setTumbleX2] = useState(0);
  const [tumbleY2, setTumbleY2] = useState(0);
  const [bounce, setBounce] = useState(0);

  useEffect(() => {
    if (!isRolling || reducedMotion) {
      setBounce(0);
      return;
    }

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // High-velocity tumble rotation
      setTumbleX1((prev) => prev + 90);
      setTumbleY1((prev) => prev + 120);
      setTumbleX2((prev) => prev + 120);
      setTumbleY2((prev) => prev + 90);

      // 2-stage bounce trajectory
      if (frame < 5) {
        setBounce(-28); // Apex lift
      } else if (frame < 8) {
        setBounce(-10); // Secondary bounce
      } else {
        setBounce(0); // Impact settle
      }
    }, 70);

    return () => clearInterval(interval);
  }, [isRolling, reducedMotion]);

  useEffect(() => {
    if (!isRolling && onRollComplete) {
      onRollComplete();
    }
  }, [isRolling, onRollComplete]);

  const totalSum = dice[0] + dice[1];

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 select-none"
      data-testid="volumetric-dice-3d"
    >
      <div
        className={`flex items-center gap-4 sm:gap-6 p-2 rounded-2xl transition-all duration-300 ${
          isDouble && !isRolling
            ? 'ring-4 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.7)] bg-amber-500/10'
            : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <SingleDie
          value={dice[0]}
          isRolling={isRolling}
          palette={palette}
          tumbleBonusX={tumbleX1}
          tumbleBonusY={tumbleY1}
          bounceOffset={bounce}
          reducedMotion={reducedMotion}
        />
        <SingleDie
          value={dice[1]}
          isRolling={isRolling}
          palette={palette}
          tumbleBonusX={tumbleX2}
          tumbleBonusY={tumbleY2}
          bounceOffset={bounce}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Result Indicator Badge */}
      {!isRolling && (
        <div className="flex items-center gap-2 mt-1 flex-wrap justify-center pointer-events-none">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900/90 text-cyan-300 border border-slate-700 shadow-sm">
            Tổng: <strong className="text-white font-extrabold">{totalSum}</strong> điểm
          </span>
          {isDouble && (
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-neon-amber animate-pulse">
              ✨ ĐÔI! LẮC THÊM LƯỢT
            </span>
          )}
        </div>
      )}
    </div>
  );
};
