'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HORSE_NAMES } from '@/lib/constants';

interface RaceTrackProps {
  raceData?: any;
  isRacing?: boolean;
  winningHorses?: number[];
}

export const RaceTrack: React.FC<RaceTrackProps> = ({
  raceData,
  isRacing = false,
  winningHorses = [],
}) => {
  const [raceProgress, setRaceProgress] = useState<number[]>(new Array(10).fill(0));
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isRacing && !isFinished) {
      const interval = setInterval(() => {
        setRaceProgress(prev => 
          prev.map(progress => {
            const randomProgress = Math.random() * 5;
            const newProgress = Math.min(progress + randomProgress, 100);
            return newProgress;
          })
        );
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isRacing, isFinished]);

  useEffect(() => {
    if (raceProgress.some(p => p >= 100)) {
      setIsFinished(true);
    }
  }, [raceProgress]);

  const getHorseEmoji = (index: number) => {
    const emojis = ['🐎', '🐴', '🦄', '🏇', '🐎', '🐴', '🦄', '🏇', '🐎', '🐴'];
    return emojis[index];
  };

  const getPosition = (horseNumber: number) => {
    if (winningHorses.length === 0) return null;
    const position = winningHorses.indexOf(horseNumber);
    if (position === -1) return null;
    return position + 1;
  };

  const getPositionEmoji = (position: number | null) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  return (
    <div className="bg-gradient-to-b from-cowboy-sand to-cowboy-tan rounded-lg border-4 border-cowboy-leather p-6 relative overflow-hidden">
      {/* Track background */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-cowboy-brown to-transparent" />
      </div>

      {/* Title */}
      <div className="text-center mb-6 relative z-10">
        <h2 className="font-cowboy text-2xl font-bold text-cowboy-dark flex items-center justify-center">
          <span className="mr-2">🏁</span>
          The Race Track
          <span className="ml-2">🏁</span>
        </h2>
        {isRacing && (
          <motion.p
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-cowboy-rust font-western mt-2"
          >
            And they're off! Dust is flying!
          </motion.p>
        )}
      </div>

      {/* Race lanes */}
      <div className="space-y-3 relative z-10">
        {HORSE_NAMES.map((name, index) => {
          const horseNumber = index + 1;
          const progress = raceProgress[index];
          const position = getPosition(horseNumber);
          
          return (
            <div key={horseNumber} className="relative">
              {/* Lane background */}
              <div className="bg-cowboy-cream/30 rounded-full h-12 border-2 border-cowboy-leather/50 relative overflow-hidden">
                
                {/* Horse */}
                <motion.div
                  animate={{
                    x: `${progress}%`,
                    rotate: isRacing ? [0, 2, -2, 0] : 0,
                  }}
                  transition={{
                    x: { type: "spring", damping: 20 },
                    rotate: { duration: 0.3, repeat: isRacing ? Infinity : 0 }
                  }}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 text-2xl z-20"
                  style={{ marginLeft: '-12px' }}
                >
                  {getHorseEmoji(index)}
                </motion.div>

                {/* Dust trail */}
                {isRacing && progress > 5 && (
                  <motion.div
                    animate={{ opacity: [0.6, 0.2, 0.6] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="absolute top-1/2 transform -translate-y-1/2 text-sm opacity-40"
                    style={{ left: `${Math.max(0, progress - 10)}%` }}
                  >
                    💨💨
                  </motion.div>
                )}

                {/* Progress bar */}
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", damping: 20 }}
                  className="h-full bg-gradient-to-r from-cowboy-gold/30 to-cowboy-rust/30 rounded-full"
                />

                {/* Finish line */}
                <div className="absolute right-0 top-0 w-1 h-full bg-cowboy-dark" />
              </div>

              {/* Horse info */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center">
                  <span className="font-bold text-cowboy-dark text-sm">#{horseNumber}</span>
                  <span className="ml-2 font-western text-xs text-cowboy-leather">{name}</span>
                </div>
                
                {position && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center"
                  >
                    <span className="text-lg">{getPositionEmoji(position)}</span>
                    <span className="ml-1 font-bold text-cowboy-dark">{position}st</span>
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Finish line flag */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-4xl">
        🏁
      </div>

      {/* Western decorations */}
      <div className="absolute top-4 left-4 text-2xl opacity-30">🤠</div>
      <div className="absolute bottom-4 right-4 text-2xl opacity-30">🏇</div>
    </div>
  );
};