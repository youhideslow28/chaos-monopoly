import React from 'react';
import { WorldConfig } from '../../worlds/types';

export interface BoardSlabProps {
  boardSize: number;
  slabThickness?: number;
  worldConfig?: WorldConfig | null;
  is3DView?: boolean;
  children: React.ReactNode;
}

/**
 * Volumetric 3D Board Slab Pedestal
 * Renders a true 6-faced cuboid with extruded vertical sidewalls,
 * ambient occlusion shading, beveled LED accent rim, and ground contact shadow.
 */
export const BoardSlab: React.FC<BoardSlabProps> = ({
  boardSize,
  slabThickness = 28,
  worldConfig: _worldConfig,
  is3DView = true,
  children,
}) => {
  const borderColor = '#cbd5e1';
  const boardBg = '#e2e8f0';

  return (
    <div
      className="relative select-none"
      style={{
        width: `${boardSize}px`,
        height: `${boardSize}px`,
        transformStyle: is3DView ? 'preserve-3d' : 'flat',
      }}
    >
      {is3DView && (
        <>
          {/* 1. Ground Contact Shadow (Soft volumetric ambient occlusion on light table) */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{
              transform: `translateZ(-${slabThickness + 14}px) scale(1.08)`,
              background:
                'radial-gradient(ellipse at center, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0.06) 60%, transparent 80%)',
              filter: 'blur(16px)',
            }}
          />

          {/* 2. South-West Front Extruded Wall (Darker ambient wooden face) */}
          <div
            className="absolute left-0 right-0 bottom-0 pointer-events-none backface-hidden"
            style={{
              height: `${slabThickness}px`,
              transformOrigin: 'bottom center',
              transform: 'rotateX(-90deg) translateZ(0px)',
              background: 'linear-gradient(180deg, #b08968 0%, #7f5539 100%)',
              borderBottom: '2px solid rgba(0,0,0,0.15)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          />

          {/* 3. South-East Front Extruded Wall (Light-receiving wooden face) */}
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none backface-hidden"
            style={{
              width: `${slabThickness}px`,
              transformOrigin: 'center right',
              transform: 'rotateY(90deg) translateZ(0px)',
              background: 'linear-gradient(90deg, #ddb892 0%, #b08968 100%)',
              borderBottom: '2px solid rgba(0,0,0,0.15)',
              boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.25)',
            }}
          />

          {/* 4. North-West Back Extruded Wall */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none backface-hidden"
            style={{
              width: `${slabThickness}px`,
              transformOrigin: 'center left',
              transform: 'rotateY(-90deg) translateZ(0px)',
              background: '#9c6644',
              borderTop: '1px solid #7f5539',
            }}
          />

          {/* 5. North-East Back Extruded Wall */}
          <div
            className="absolute left-0 right-0 top-0 pointer-events-none backface-hidden"
            style={{
              height: `${slabThickness}px`,
              transformOrigin: 'top center',
              transform: 'rotateX(90deg) translateZ(0px)',
              background: '#9c6644',
              borderTop: '1px solid #7f5539',
            }}
          />
        </>
      )}

      {/* 6. Top Surface Plane (Hosts perimeter tiles and center plaza) */}
      <div
        className="w-full h-full relative rounded-2xl p-1.5 sm:p-2.5 border-2 transition-shadow duration-300"
        style={{
          background: boardBg,
          borderColor: borderColor,
          boxShadow: is3DView
            ? '0 20px 40px -15px rgba(15,23,42,0.2), 0 0 10px rgba(0,0,0,0.04)'
            : '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
          transformStyle: is3DView ? 'preserve-3d' : 'flat',
        }}
      >
        {children}
      </div>
    </div>
  );
};
