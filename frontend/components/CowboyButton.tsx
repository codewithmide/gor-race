'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CowboyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const CowboyButton: React.FC<CowboyButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}) => {
  const baseStyles = `
    relative font-cowboy font-bold border-2 transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-cowboy-gold/50
    disabled:opacity-50 disabled:cursor-not-allowed
    transform hover:scale-105 active:scale-95
  `;

  const variants = {
    primary: `
      bg-gradient-to-b from-cowboy-gold to-cowboy-rust
      border-cowboy-dark text-cowboy-dark
      hover:from-cowboy-rust hover:to-cowboy-gold
      shadow-lg hover:shadow-xl
    `,
    secondary: `
      bg-gradient-to-b from-cowboy-tan to-cowboy-sand
      border-cowboy-leather text-cowboy-dark
      hover:from-cowboy-sand hover:to-cowboy-tan
      shadow-md hover:shadow-lg
    `,
    danger: `
      bg-gradient-to-b from-western-sunset to-cowboy-rust
      border-cowboy-dark text-white
      hover:from-cowboy-rust hover:to-western-sunset
      shadow-lg hover:shadow-xl
    `,
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <div className="relative flex items-center justify-center">
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        )}
        <span className={loading ? 'ml-6' : ''}>{children}</span>
      </div>
      
      {/* Western-style decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-current opacity-30" />
      <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-current opacity-30" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-current opacity-30" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-current opacity-30" />
    </motion.button>
  );
};