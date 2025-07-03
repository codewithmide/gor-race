'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CowboyCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: 'wood' | 'leather' | 'parchment';
  padding?: 'sm' | 'md' | 'lg';
}

export const CowboyCard: React.FC<CowboyCardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  variant = 'wood',
  padding = 'md',
}) => {
  const variants = {
    wood: `
      bg-gradient-to-br from-cowboy-brown to-cowboy-dark
      border-cowboy-leather text-cowboy-cream
      shadow-2xl
    `,
    leather: `
      bg-gradient-to-br from-cowboy-leather to-cowboy-rust
      border-cowboy-dark text-cowboy-cream
      shadow-xl
    `,
    parchment: `
      bg-gradient-to-br from-cowboy-cream to-cowboy-tan
      border-cowboy-brown text-cowboy-dark
      shadow-lg
    `,
  };

  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative border-4 rounded-lg
        ${variants[variant]}
        ${paddings[padding]}
        ${className}
      `}
    >
      {/* Decorative corner elements */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-current opacity-40" />
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-current opacity-40" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-current opacity-40" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-current opacity-40" />

      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="font-cowboy text-xl font-bold mb-2 flex items-center">
              <span className="mr-2">🤠</span>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="font-western text-sm opacity-80">{subtitle}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-wood-grain rounded-lg pointer-events-none" />
    </motion.div>
  );
};