'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HORSE_NAMES } from '@/lib/constants';

interface HorseSelectorProps {
  selectedHorse: number | null;
  onSelectHorse: (horseNumber: number) => void;
  disabled?: boolean;
}

export const HorseSelector: React.FC<HorseSelectorProps> = ({
  selectedHorse,
  onSelectHorse,
  disabled = false,
}) => {
  const [hoveredHorse, setHoveredHorse] = useState<number | null>(null);

  const getHorseEmoji = (index: number) => {
    const emojis = ['🐎', '🐴', '🦄', '🏇', '🐎', '🐴', '🦄', '🏇', '🐎', '🐴'];
    return emojis[index];
  };

  return (
    <div className="space-y-4">
      <h3 className="font-cowboy text-xl font-bold text-black flex items-center">
        <span className="mr-2">🏇</span>
        Choose Your Steed, Partner!
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {HORSE_NAMES.map((name, index) => {
          const horseNumber = index + 1;
          const isSelected = selectedHorse === horseNumber;
          const isHovered = hoveredHorse === horseNumber;
          
          return (
            <motion.button
              key={horseNumber}
              whileHover={{ scale: disabled ? 1 : 1.05 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
              onHoverStart={() => !disabled && setHoveredHorse(horseNumber)}
              onHoverEnd={() => setHoveredHorse(null)}
              onClick={() => !disabled && onSelectHorse(horseNumber)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                font-western text-sm font-bold
                ${isSelected 
                  ? 'bg-cowboy-gold border-cowboy-dark text-cowboy-dark shadow-lg' 
                  : 'bg-cowboy-tan border-cowboy-leather text-cowboy-dark hover:bg-cowboy-sand'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                disabled:hover:bg-cowboy-tan
              `}
            >
              {/* Horse animation */}
              <motion.div
                animate={isSelected || isHovered ? { x: [0, 2, 0] } : {}}
                transition={{ duration: 0.5, repeat: isSelected || isHovered ? Infinity : 0 }}
                className="text-2xl mb-2"
              >
                {getHorseEmoji(index)}
              </motion.div>
              
              {/* Horse name */}
              <div className="text-xs leading-tight">
                <div className="font-bold">#{horseNumber}</div>
                <div>{name}</div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-cowboy-gold border-2 border-cowboy-dark rounded-full flex items-center justify-center"
                >
                  <span className="text-xs">✓</span>
                </motion.div>
              )}

              {/* Dust effect on hover */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs opacity-60"
                >
                  💨
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {selectedHorse && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-3 bg-cowboy-gold/20 border border-cowboy-rust rounded-lg"
        >
          <p className="font-western text-cowboy-brown">
            🤠 You've chosen <strong>{HORSE_NAMES[selectedHorse - 1]}</strong> (#{selectedHorse})
          </p>
          <p className="text-sm text-cowboy-brown mt-1">
            That's a fine choice, cowpoke! This steed's got spirit!
          </p>
        </motion.div>
      )}
    </div>
  );
};