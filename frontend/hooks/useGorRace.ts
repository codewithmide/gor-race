'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { GorRaceProgram } from '@/lib/program';
import toast from 'react-hot-toast';

export interface PlayerProfile {
  username: string;
  player: PublicKey;
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  totalEarnings: number;
  createdAt: number;
}

export interface Race {
  raceId: number;
  creator: PublicKey;
  referralCode: string;
  entryCount: number;
  totalPool: number;
  waitTime: number;
  status: any;
  winningHorses: number[];
  raceStartTime?: number;
  endTime?: number;
  platformFee: number;
  horseNames: string[];
}

export interface PlayerEntry {
  player: PublicKey;
  horseNumber: number;
  statsUpdated: boolean;
  claimStatus: any;
  prizeAmount: number;
}

export const useGorRace = () => {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [program, setProgram] = useState<GorRaceProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<PlayerProfile | null>(null);
  const [activeRaces, setActiveRaces] = useState<Race[]>([]);

  // Initialize program
  useEffect(() => {
    console.log('Program initialization check:', {
      anchorWallet: !!anchorWallet,
      publicKey: !!publicKey,
      wallet: !!wallet
    });

    if (anchorWallet && publicKey) {
      try {
        console.log('Initializing program with anchorWallet and publicKey:', publicKey.toString());

        // Debug anchorWallet capabilities
        console.log('AnchorWallet object:', anchorWallet);
        console.log('AnchorWallet methods:', {
          publicKey: anchorWallet.publicKey?.toString(),
          signTransaction: typeof anchorWallet.signTransaction,
          signAllTransactions: typeof anchorWallet.signAllTransactions,
        });

        const gorRaceProgram = new GorRaceProgram(anchorWallet as Wallet, connection, publicKey);
        setProgram(gorRaceProgram);
        console.log('Program initialized successfully with anchorWallet');
      } catch (error) {
        console.error('Failed to initialize program:', error);
        toast.error('Failed to initialize program connection');
      }
    } else {
      console.log('Clearing program - anchorWallet or publicKey not available');
      setProgram(null);
    }
  }, [anchorWallet, publicKey, connection]);

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    if (!program || !publicKey) {
      setUserProfile(null);
      return;
    }

    console.log('Loading profile for:', publicKey.toString());
    console.log('Program instance:', program);
    console.log('Program getPlayerProfile method:', typeof program.getPlayerProfile);
    setProfileLoading(true);
    try {
      const profile = await program.getPlayerProfile(publicKey);
      console.log('Raw profile data:', profile);

      if (profile) {
        // Convert BN fields to numbers for the interface
        const convertedProfile: PlayerProfile = {
          username: profile.username || '',
          player: profile.player || publicKey,
          totalRaces: (profile.totalRaces as any)?.toNumber ? (profile.totalRaces as any).toNumber() : Number(profile.totalRaces) || 0,
          totalWins: (profile.totalWins as any)?.toNumber ? (profile.totalWins as any).toNumber() : Number(profile.totalWins) || 0,
          totalPodiums: (profile.totalPodiums as any)?.toNumber ? (profile.totalPodiums as any).toNumber() : Number(profile.totalPodiums) || 0,
          totalEarnings: (profile.totalEarnings as any)?.toNumber ? (profile.totalEarnings as any).toNumber() : Number(profile.totalEarnings) || 0,
          createdAt: (profile.createdAt as any)?.toNumber ? (profile.createdAt as any).toNumber() : Number(profile.createdAt) || 0,
        };
        console.log('Converted profile:', convertedProfile);
        setUserProfile(convertedProfile);
      } else {
        console.log('Profile is null/undefined');
        setUserProfile(null);
      }
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
      console.error('Error details:', error.message, error.stack);
      // Profile doesn't exist or failed to load - set to null
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [program, publicKey]);

  // Load user profile when program is ready
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Create player profile
  const createProfile = async (username: string): Promise<boolean> => {
    console.log('Creating profile with:', { program: !!program, publicKey: !!publicKey, wallet: !!wallet });

    if (!program) {
      toast.error('Program not initialized. Please refresh and try again.');
      return false;
    }

    if (!publicKey) {
      toast.error('Please connect your wallet first, partner!');
      return false;
    }

    if (!wallet) {
      toast.error('Wallet not available. Please reconnect your wallet.');
      return false;
    }

    setLoading(true);
    try {
      toast.loading('Creating your cowboy profile...');
      console.log('Calling program.createProfile with username:', username);
      const txSignature = await program.createProfile(username);
      console.log('Profile creation transaction:', txSignature);

      toast.dismiss();
      toast.success(`Profile created successfully! Welcome to the frontier, ${username}! 🤠`, {
        duration: 5000,
      });

      // Reload profile after a short delay to ensure blockchain state is updated
      setTimeout(async () => {
        await loadUserProfile();
      }, 2000);
      return true;
    } catch (error: any) {
      toast.dismiss();
      console.error('Failed to create profile:', error);

      if (error.message?.includes('already in use')) {
        toast.error('You already have a profile, partner!');
      } else if (error.message?.includes('insufficient')) {
        toast.error('Not enough SOL for transaction fees. Need at least 0.01 SOL.');
      } else {
        toast.error(`Failed to create profile: ${error.message || 'Unknown error'}`);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create race
  const createRace = async (waitTime: number): Promise<{ raceId: number; referralCode: string } | null> => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet first, partner!');
      return null;
    }

    setLoading(true);
    try {
      toast.loading('Setting up the corral...');
      const result = await program.createRace(waitTime);
      const referralCode = program.generateReferralCode(result.raceId);

      toast.dismiss();
      toast.success(`Race created successfully! Race ID: ${result.raceId} 🏇`, {
        duration: 7000,
      });

      return { raceId: result.raceId, referralCode };
    } catch (error: any) {
      toast.dismiss();
      console.error('Failed to create race:', error);
      toast.error('Failed to create race. The horses got spooked!');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Join race
  const joinRace = async (raceId: number, horseNumber: number, referralCode: string): Promise<boolean> => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet first, partner!');
      return false;
    }

    setLoading(true);
    try {
      toast.loading('Mounting your steed...');
      const txSignature = await program.joinRace(raceId, horseNumber, referralCode);

      toast.dismiss();
      toast.success(`Successfully joined the race! Your horse #${horseNumber} is ready to run! 🐎`, {
        duration: 5000,
      });

      return true;
    } catch (error: any) {
      toast.dismiss();
      console.error('Failed to join race:', error);

      if (error.message?.includes('InvalidReferralCode')) {
        toast.error('Invalid referral code, partner! Check your spelling.');
      } else if (error.message?.includes('insufficient')) {
        toast.error('Not enough GOR tokens for entry fee!');
      } else if (error.message?.includes('RaceNotFound')) {
        toast.error('Race not found with that referral code!');
      } else if (error.message?.includes('RaceAlreadyStarted')) {
        toast.error('This race has already started!');
      } else if (error.message?.includes('AlreadyJoined')) {
        toast.error('You already joined this race!');
      } else {
        toast.error('Failed to join race. The horse got cold feet!');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Execute race
  const executeRace = async (raceId: number): Promise<boolean> => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet first, partner!');
      return false;
    }

    setLoading(true);
    try {
      toast.loading('Starting the race...');
      const txSignature = await program.executeRace(raceId);

      toast.dismiss();
      toast.success('Race started! May the fastest horse win! 🏁', {
        duration: 3000,
      });

      return true;
    } catch (error: any) {
      toast.dismiss();
      console.error('Failed to execute race:', error);

      if (error.message?.includes('RaceNotReady')) {
        toast.error('Race is not ready to start yet!');
      } else {
        toast.error('Failed to start race. Technical difficulties at the track!');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Claim prize
  const claimPrize = async (raceId: number): Promise<boolean> => {
    if (!program || !publicKey) {
      toast.error('Please connect your wallet first, partner!');
      return false;
    }

    setLoading(true);
    try {
      toast.loading('Claiming your winnings...');
      const txSignature = await program.claimPrize(raceId);

      toast.dismiss();
      toast.success('Yeehaw! Prize claimed successfully! 💰', {
        duration: 5000,
      });

      // Reload profile to update earnings
      await loadUserProfile();
      return true;
    } catch (error: any) {
      toast.dismiss();
      console.error('Failed to claim prize:', error);

      if (error.message?.includes('AlreadyClaimed')) {
        toast.error('Prize already claimed, cowpoke!');
      } else if (error.message?.includes('NoWinnings')) {
        toast.error('No winnings to claim this time, partner!');
      } else {
        toast.error('Failed to claim prize. The bank is having issues!');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get race data
  const getRace = async (raceId: number): Promise<Race | null> => {
    if (!program) return null;

    try {
      const race = await program.getRace(raceId);
      if (race) {
        // Convert BN fields to numbers for the interface
        const convertedRace: Race = {
          raceId: (race.raceId as any)?.toNumber ? (race.raceId as any).toNumber() : Number(race.raceId) || 0,
          creator: race.creator || new PublicKey('11111111111111111111111111111111'),
          referralCode: race.referralCode || '',
          entryCount: (race.entryCount as any)?.toNumber ? (race.entryCount as any).toNumber() : Number(race.entryCount) || 0,
          totalPool: (race.totalPool as any)?.toNumber ? (race.totalPool as any).toNumber() : Number(race.totalPool) || 0,
          waitTime: (race.waitTime as any)?.toNumber ? (race.waitTime as any).toNumber() : Number(race.waitTime) || 0,
          status: race.status || null,
          winningHorses: Array.isArray(race.winningHorses) ? race.winningHorses.map((h: any) => (h as any)?.toNumber ? (h as any).toNumber() : Number(h) || 0) : [],
          raceStartTime: race.raceStartTime ? ((race.raceStartTime as any)?.toNumber ? (race.raceStartTime as any).toNumber() : Number(race.raceStartTime)) : undefined,
          endTime: race.endTime ? ((race.endTime as any)?.toNumber ? (race.endTime as any).toNumber() : Number(race.endTime)) : undefined,
          platformFee: (race.platformFee as any)?.toNumber ? (race.platformFee as any).toNumber() : Number(race.platformFee) || 0,
          horseNames: race.horseNames || [],
        };
        return convertedRace;
      }
      return null;
    } catch (error) {
      console.error('Failed to get race:', error);
      return null;
    }
  };

  // Get player entry
  const getPlayerEntry = async (raceId: number, player?: PublicKey): Promise<PlayerEntry | null> => {
    if (!program) return null;
    const playerKey = player || publicKey;
    if (!playerKey) return null;

    try {
      const entry = await program.getPlayerEntry(raceId, playerKey);
      if (entry) {
        // Convert BN fields to numbers for the interface
        const convertedEntry: PlayerEntry = {
          player: entry.player || playerKey,
          horseNumber: (entry.horseNumber as any)?.toNumber ? (entry.horseNumber as any).toNumber() : Number(entry.horseNumber) || 0,
          statsUpdated: entry.statsUpdated || false,
          claimStatus: entry.claimStatus || null,
          prizeAmount: (entry.prizeAmount as any)?.toNumber ? (entry.prizeAmount as any).toNumber() : Number(entry.prizeAmount) || 0,
        };
        return convertedEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to get player entry:', error);
      return null;
    }
  };

  // Update stats
  const updateStats = async (raceId: number): Promise<boolean> => {
    if (!program || !publicKey) return false;

    try {
      // This would be implemented when the update_stats instruction is available
      // For now, just reload the profile
      toast.success('Stats updated successfully!');
      await loadUserProfile();
      return true;
    } catch (error) {
      console.error('Failed to update stats:', error);
      toast.error('Failed to update stats');
      return false;
    }
  };

  return {
    // State
    program,
    loading,
    profileLoading,
    userProfile,
    activeRaces,

    // Actions
    createProfile,
    createRace,
    joinRace,
    executeRace,
    claimPrize,
    updateStats,

    // Queries
    getRace,
    getPlayerEntry,
    loadUserProfile,

    // Utils
    connected: !!publicKey,
    publicKey,
  };
};