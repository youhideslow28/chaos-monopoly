import React, { useEffect, useState } from 'react';

interface AnimatedDiceProps {
  dice: [number, number];
  isRolling: boolean;
  isDouble: boolean;
  diceSkinId?: string;
}

const AnimatedDiceInner: React.FC<AnimatedDiceProps> = ({ dice, isRolling, isDouble, diceSkinId }) => {
  const [displayValues, setDisplayValues] = useState<[number, number]>(dice);

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayValues([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }, 70);
      return () => clearInterval(interval);
    } else {
      setDisplayValues(dice);
    }
  }, [isRolling, dice]);

  // Skin styling configuration
  const getSkinClasses = () => {
    switch (diceSkinId) {
      case 'dice-cyber-gold':
        return {
          diceBox: 'bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-500 border-amber-300 text-amber-950 shadow-[0_10px_25px_rgba(245,158,11,0.5),inset_0_2px_4px_rgba(255,255,255,0.8)]',
          dot: 'bg-amber-950 shadow-inner',
          dotCenter: 'bg-red-700 shadow-inner',
        };
      case 'dice-obsidian-void':
        return {
          diceBox: 'bg-gradient-to-br from-slate-950 via-purple-950 to-black border-purple-500 text-purple-200 shadow-[0_10px_25px_rgba(168,85,247,0.4),inset_0_2px_4px_rgba(192,132,252,0.4)]',
          dot: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]',
          dotCenter: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]',
        };
      case 'dice-starlight':
        return {
          diceBox: 'bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-950 border-cyan-400 text-cyan-200 shadow-[0_10px_25px_rgba(6,182,212,0.4),inset_0_2px_4px_rgba(56,189,248,0.5)]',
          dot: 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]',
          dotCenter: 'bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.9)]',
        };
      case 'dice-flame-ruby':
        return {
          diceBox: 'bg-gradient-to-br from-rose-950 via-red-800 to-amber-700 border-rose-400 text-amber-200 shadow-[0_10px_25px_rgba(244,63,94,0.5),inset_0_2px_4px_rgba(254,205,211,0.5)]',
          dot: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]',
          dotCenter: 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)]',
        };
      default:
        return {
          diceBox: 'bg-gradient-to-br from-white via-slate-100 to-slate-200 border-slate-300 text-slate-900 shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.9)]',
          dot: 'bg-slate-900 shadow-inner',
          dotCenter: 'bg-rose-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]',
        };
    }
  };

  const skin = getSkinClasses();

  // Authentic dot patterns for numbers 1 to 6
  const renderDots = (value: number) => {
    switch (value) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ${skin.dotCenter}`}></span>
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2 sm:p-2.5">
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-start ${skin.dot}`}></span>
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-end ${skin.dot}`}></span>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2 sm:p-2.5">
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-start ${skin.dot}`}></span>
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-center ${skin.dot}`}></span>
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-end ${skin.dot}`}></span>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-2 p-2 sm:p-2.5 w-full h-full items-center justify-items-center">
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${skin.dot}`}></span>
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${skin.dot}`}></span>
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${skin.dot}`}></span>
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${skin.dot}`}></span>
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 gap-1 p-2 sm:p-2.5 w-full h-full items-center justify-items-center">
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full self-start justify-self-start ${skin.dot}`}></span>
            <span></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full self-start justify-self-end ${skin.dot}`}></span>
            <span></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${skin.dot}`}></span>
            <span></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full self-end justify-self-start ${skin.dot}`}></span>
            <span></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full self-end justify-self-end ${skin.dot}`}></span>
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 p-2 sm:p-2.5 w-full h-full items-center justify-items-center">
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${skin.dot}`}></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${skin.dot}`}></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${skin.dot}`}></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${skin.dot}`}></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${skin.dot}`}></span>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${skin.dot}`}></span>
          </div>
        );
      default:
        return null;
    }
  };

  const totalSum = displayValues[0] + displayValues[1];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Die 1 */}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-150 transform ${skin.diceBox} ${
            isRolling ? 'animate-dice-shake scale-105 rotate-6' : 'hover:scale-105'
          } ${
            isDouble && !isRolling
              ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse'
              : ''
          }`}
        >
          {renderDots(displayValues[0])}
        </div>

        {/* Die 2 */}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-150 transform ${skin.diceBox} ${
            isRolling ? 'animate-dice-shake scale-105 -rotate-6' : 'hover:scale-105'
          } ${
            isDouble && !isRolling
              ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse'
              : ''
          }`}
        >
          {renderDots(displayValues[1])}
        </div>
      </div>

      {/* Result Indicator */}
      {!isRolling && (
        <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
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

export const AnimatedDice = React.memo(AnimatedDiceInner);


