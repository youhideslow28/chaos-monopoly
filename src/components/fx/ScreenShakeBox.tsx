import React, { useEffect, useState } from 'react';
import { shake, ShakeLevel, subscribeShake } from '../../game/fx/screenShake';

interface ScreenShakeBoxProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Applies the current screen-shake offset to its children (roadmap 8.2).
 * Rendering is isolated here so a shaking board never re-renders the rest of the app.
 */
export const ScreenShakeBox: React.FC<ScreenShakeBoxProps> = ({ children, className }) => {
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => subscribeShake(setOffset), []);

  return (
    <div
      className={className}
      data-testid="screen-shake-box"
      style={{
        transform: offset.x === 0 && offset.y === 0 ? undefined : `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};

export function useScreenShakeTrigger(): (level: ShakeLevel) => void {
  return (level: ShakeLevel) => {
    shake(level);
  };
}
