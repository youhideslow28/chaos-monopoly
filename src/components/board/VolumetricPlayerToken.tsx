import React from 'react';
import { PlayerState } from '../../game/types';
import { getCosmeticItem } from '../../cosmetics/catalog';
import { TokenPlacement, getTokenZIndex } from './tokenStackingEngine';

export interface VolumetricPlayerTokenProps {
  player: PlayerState;
  isPlayerActive: boolean;
  equippedPetId?: string | null;
  placement: TokenPlacement;
  isIsometric?: boolean;
}

const VolumetricPlayerTokenInner: React.FC<VolumetricPlayerTokenProps> = ({
  player,
  isPlayerActive,
  equippedPetId,
  placement,
  isIsometric = true,
}) => {
  const zIndex = getTokenZIndex(placement.depthIndex, isPlayerActive);
  const colorHex = player.token.colorHex || '#3b82f6';
  const accentHex = player.token.accentHex || '#60a5fa';
  const symbol = player.token.symbol || '♟️';

  const petId = !player.isAI ? equippedPetId : null;
  const pet = petId ? getCosmeticItem(petId) : null;

  // Pet icon lookup
  const getPetEmoji = (iconName?: string) => {
    switch (iconName) {
      case 'Dog':
        return '🐕';
      case 'Fish':
        return '🦦';
      case 'Radio':
        return '🛸';
      case 'Flame':
        return '🔥';
      default:
        return '🐾';
    }
  };

  const elevationZ = isIsometric ? placement.elevationZ : 0;
  const cylinderHeight = 6; // px thickness of pedestal rim

  return (
    <div
      className="absolute pointer-events-none select-none transition-all duration-300 ease-out"
      style={{
        left: `${placement.xPercent}%`,
        top: `${placement.yPercent}%`,
        transform: `translate(-50%, -50%) scale(${placement.scale})`,
        zIndex,
        transformStyle: isIsometric ? 'preserve-3d' : 'flat',
      }}
      title={`${player.name} (${player.token.name})`}
      data-testid={`volumetric-token-${player.id}`}
    >
      {/* 1. Ground Contact Drop Shadow (at Z = 0) */}
      <div
        className={`absolute rounded-full transition-all duration-300 ${
          isPlayerActive
            ? 'w-7 h-5 -left-0.5 -top-0.5 bg-black/60 blur-[3px] scale-110'
            : 'w-6 h-4 left-0 top-0.5 bg-black/50 blur-[2px]'
        }`}
        style={
          isIsometric
            ? {
                transform: 'translateZ(0px)',
              }
            : undefined
        }
      />

      {/* 2. Volumetric 3D Cylinder Pedestal */}
      <div
        className="relative w-6 h-6 sm:w-7 sm:h-7"
        style={
          isIsometric
            ? {
                transformStyle: 'preserve-3d',
                transform: `translateZ(${elevationZ}px)`,
              }
            : undefined
        }
      >
        {/* Extruded Pedestal Rim / Sidewall Slices (visible in 2.5D pitch) */}
        {isIsometric && (
          <>
            <div
              className="absolute inset-0 rounded-full border border-black/40"
              style={{
                backgroundColor: colorHex,
                filter: 'brightness(0.65)',
                transform: `translateZ(-${cylinderHeight}px)`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full border border-black/30"
              style={{
                backgroundColor: colorHex,
                filter: 'brightness(0.8)',
                transform: `translateZ(-${cylinderHeight / 2}px)`,
              }}
            />
          </>
        )}

        {/* Cylinder Top Face */}
        <div
          className={`absolute inset-0 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs text-white shadow-md border ${
            isPlayerActive
              ? 'border-white ring-2 ring-cyan-300 shadow-[0_0_12px_rgba(255,255,255,0.9)]'
              : 'border-white/40 ring-1 ring-black/40'
          }`}
          style={{
            background: `radial-gradient(circle at 35% 30%, ${accentHex}, ${colorHex} 70%, #000 100%)`,
          }}
        >
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none select-none">
            {symbol}
          </span>
        </div>

        {/* 3. Active Levitating Energy Ring (translates Z + 8px with pulse) */}
        {isPlayerActive && isIsometric && (
          <div
            className="absolute -inset-1.5 rounded-full border-2 border-cyan-300/80 pointer-events-none animate-pulse-subtle"
            style={{
              transform: 'translateZ(10px)',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.75), inset 0 0 6px rgba(6, 182, 212, 0.5)',
            }}
          />
        )}

        {/* 4. Detention Jail Cage Overlay */}
        {player.inDetention && (
          <div
            className="absolute -inset-1 rounded-md border-2 border-amber-500/80 bg-red-950/40 flex items-center justify-center pointer-events-none"
            style={
              isIsometric
                ? {
                    transform: 'translateZ(12px)',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)',
                  }
                : undefined
            }
            title="Đang bị Tạm Giam"
          >
            {/* Miniature vertical bars */}
            <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
              <div className="w-0.5 h-full bg-slate-300/80 shadow-xs" />
              <div className="w-0.5 h-full bg-slate-300/80 shadow-xs" />
              <div className="w-0.5 h-full bg-slate-300/80 shadow-xs" />
            </div>
            <span className="text-[9px] relative z-10 drop-shadow">🔒</span>
          </div>
        )}
      </div>

      {/* 5. Companion Pet Satellite (Orbiting at +14px, -10px, Z: 10px) */}
      {pet && pet.id !== 'pet-none' && (
        <div
          className="absolute -right-3 -top-2 w-4 h-4 rounded-full bg-slate-900/90 border border-cyan-400/60 shadow-sm flex items-center justify-center text-[9px] pointer-events-none"
          style={
            isIsometric
              ? {
                  transform: 'translateZ(10px)',
                }
              : undefined
          }
          title={`Thú cưng đồng hành: ${pet.name.vi}`}
        >
          <span className="leading-none drop-shadow-sm select-none">
            {getPetEmoji(pet.iconName)}
          </span>
        </div>
      )}
    </div>
  );
};

export const VolumetricPlayerToken = React.memo(VolumetricPlayerTokenInner);
