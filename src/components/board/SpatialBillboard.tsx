import React from 'react';
import { CameraState, DEFAULT_CAMERA, getBillboardTransform } from './spatialMath';

export interface SpatialBillboardProps {
  elevation?: number; // Elevation in px along +Z axis
  camera?: CameraState;
  is3D?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * SpatialBillboard
 * A camera-facing 3D container applying inverse camera rotation (rotateZ(-yaw) rotateX(-pitch)).
 * Ensures typography, price tags, rent indicators, and tooltips face the user directly
 * without perspective distortion or blur in 2.5D isometric mode.
 */
export const SpatialBillboard: React.FC<SpatialBillboardProps> = ({
  elevation = 0,
  camera = DEFAULT_CAMERA,
  is3D = true,
  className = '',
  style,
  children,
}) => {
  const transform = is3D
    ? getBillboardTransform(camera, elevation)
    : elevation !== 0
    ? `translateZ(${elevation}px)`
    : undefined;

  return (
    <div
      className={`preserve-3d ${className}`}
      style={{
        transform,
        transformStyle: is3D ? 'preserve-3d' : 'flat',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
