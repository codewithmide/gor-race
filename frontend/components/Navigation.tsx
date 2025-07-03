'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { CowboyButton } from './CowboyButton';

interface NavigationProps {
  currentPage: 'dashboard' | 'create' | 'join' | 'leaderboard';
  onNavigate: (page: 'dashboard' | 'create' | 'join' | 'leaderboard') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const { connected, publicKey } = useWallet();

  const navItems = [
    { id: 'dashboard', label: 'Saloon', icon: '🏛️' },
    { id: 'create', label: 'Start Race', icon: '🏇' },
    { id: 'join', label: 'Join Race', icon: '🎯' },
    { id: 'leaderboard', label: 'Hall of Fame', icon: '🏆' },
  ] as const;

  return (
    <nav className="bg-gradient-to-r from-cowboy-brown to-cowboy-leather border-b-4 border-cowboy-dark shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo and Title */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-4xl mr-3"
            >
              🤠
            </motion.div>
            <div>
              <h1 className="font-cowboy text-2xl font-bold text-cowboy-gold text-shadow-western">
                GOR RACE
              </h1>
              <p className="font-western text-xs text-cowboy-cream opacity-80">
                Wild West Racing
              </p>
            </div>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate(item.id)}
                className={`
                  px-4 py-2 rounded-lg font-western text-sm font-bold
                  transition-all duration-200 flex items-center space-x-2
                  ${currentPage === item.id
                    ? 'bg-cowboy-gold text-cowboy-dark shadow-lg'
                    : 'text-cowboy-cream hover:bg-cowboy-rust/30 hover:text-cowboy-gold'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {connected && publicKey && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden sm:flex items-center space-x-2 bg-cowboy-gold/20 px-3 py-2 rounded-lg border border-cowboy-gold"
              >
                <span className="text-lg">💰</span>
                <span className="font-western text-xs text-cowboy-gold">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
              </motion.div>
            )}
            
            <WalletMultiButton className="!bg-gradient-to-r !from-cowboy-gold !to-cowboy-rust !border-2 !border-cowboy-dark !text-cowboy-dark !font-bold !font-cowboy !rounded-lg hover:!from-cowboy-rust hover:!to-cowboy-gold" />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex justify-around space-x-1">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate(item.id)}
                className={`
                  flex-1 py-2 rounded-lg font-western text-xs font-bold
                  transition-all duration-200 flex flex-col items-center space-y-1
                  ${currentPage === item.id
                    ? 'bg-cowboy-gold text-cowboy-dark'
                    : 'text-cowboy-cream hover:bg-cowboy-rust/30'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};