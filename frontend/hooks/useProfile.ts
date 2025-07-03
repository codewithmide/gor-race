'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { GorRace } from '@/types/gor_race';
import { PROGRAM_ID } from '@/lib/constants';
import idl from '@/types/gor_race.json';
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

export const useProfile = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  
  const [program, setProgram] = useState<Program<GorRace> | null>(null);
  const [userProfile, setUserProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Initialize program when wallet connects
  useEffect(() => {
    console.log('🔧 Program initialization check:', {
      hasAnchorWallet: !!anchorWallet,
      connected,
      publicKey: publicKey?.toString()
    });
    
    if (anchorWallet && connected) {
      try {
        console.log('🏗️ Initializing Anchor program...');
        const provider = new AnchorProvider(connection, anchorWallet, {
          commitment: 'confirmed',
        });
        
        const anchorProgram = new Program(idl as any, PROGRAM_ID, provider);
        setProgram(anchorProgram);
        console.log('✅ Program initialized successfully!');
      } catch (error) {
        console.error('❌ Failed to initialize program:', error);
      }
    } else {
      console.log('🧹 Clearing program and profile');
      setProgram(null);
      setUserProfile(null);
    }
  }, [anchorWallet, connected, connection]);

  // Load user profile IMMEDIATELY when wallet connects
  useEffect(() => {
    console.log('🔍 Profile check trigger:', {
      hasProgram: !!program,
      hasPublicKey: !!publicKey,
      connected,
      publicKeyString: publicKey?.toString()
    });
    
    if (program && publicKey && connected) {
      console.log('✅ All conditions met - starting profile check immediately!');
      loadUserProfile();
    } else {
      console.log('❌ Conditions not met - clearing profile');
      setUserProfile(null);
    }
  }, [program, publicKey, connected]);

  const loadUserProfile = async () => {
    if (!program || !publicKey) {
      console.log('❌ loadUserProfile: Missing program or publicKey');
      return;
    }

    console.log('🚀 Starting profile load for:', publicKey.toString());
    setProfileLoading(true);
    
    try {
      // Calculate PDA exactly like the CLI does
      const [playerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_profile"), publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      console.log('📍 Calculated PDA:', playerProfilePda.toString());
      console.log('🔗 Using Program ID:', PROGRAM_ID.toString());
      
      // Fetch profile exactly like the CLI does
      console.log('📡 Fetching profile from blockchain...');
      console.log('🔍 Available accounts:', Object.keys(program.account));
      const profile = await program.account.playerProfile.fetch(playerProfilePda);
      
      console.log('✅ Raw profile data received:', profile);
      
      // Convert to our interface
      const convertedProfile: PlayerProfile = {
        username: profile.username,
        player: profile.player,
        totalRaces: (profile.totalRaces as any)?.toNumber ? (profile.totalRaces as any).toNumber() : Number(profile.totalRaces) || 0,
        totalWins: (profile.totalWins as any)?.toNumber ? (profile.totalWins as any).toNumber() : Number(profile.totalWins) || 0,
        totalPodiums: (profile.totalPodiums as any)?.toNumber ? (profile.totalPodiums as any).toNumber() : Number(profile.totalPodiums) || 0,
        totalEarnings: (profile.totalEarnings as any)?.toNumber ? (profile.totalEarnings as any).toNumber() : Number(profile.totalEarnings) || 0,
        createdAt: (profile.createdAt as any)?.toNumber ? (profile.createdAt as any).toNumber() : Number(profile.createdAt) || 0,
      };
      
      console.log('🎯 Converted profile:', convertedProfile);
      setUserProfile(convertedProfile);
      
    } catch (error: any) {
      console.log('❌ Profile fetch failed:', error.message);
      console.log('🔍 Error details:', {
        name: error.name,
        message: error.message,
        logs: error.logs
      });
      
      // Profile doesn't exist - this is expected for new users
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
      console.log('✅ Profile loading complete');
    }
  };

  const createRace = async (waitTime: number = 60): Promise<{ raceId: number; referralCode: string } | null> => {
    if (!program || !publicKey || !anchorWallet) {
      toast.error('Please connect your wallet first!');
      return null;
    }

    setLoading(true);
    try {
      // Generate a unique race ID using timestamp + random component
      const raceId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
      
      // Calculate PDA for the race
      const [racePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
      
      console.log('🏁 Creating race with ID:', raceId);
      console.log('📍 Race PDA:', racePda.toString());
      
      // Create race using the program
      await program.methods
        .createRace(new anchor.BN(raceId), new anchor.BN(waitTime))
        .accounts({
          race: racePda,
          creator: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
      
      // Generate referral code (8-character alphanumeric based on race ID)
      const referralCode = generateReferralCode(raceId);
      
      toast.success(`Race created successfully! Race ID: ${raceId} 🏇`);
      
      return { raceId, referralCode };
    } catch (error: any) {
      console.error('Failed to create race:', error);
      toast.error('Failed to create race. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (username: string): Promise<boolean> => {
    if (!program || !publicKey || !anchorWallet) {
      toast.error('Please connect your wallet first!');
      return false;
    }

    setLoading(true);
    try {
      // Calculate PDA exactly like the CLI does
      const [playerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_profile"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Create profile exactly like the CLI does
      await program.methods
        .createProfile(username)
        .accounts({
          playerProfile: playerProfilePda,
          player: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      toast.success(`Profile created successfully! Welcome ${username}! 🤠`);
      
      // Reload profile after a short delay
      setTimeout(() => {
        loadUserProfile();
      }, 2000);
      
      return true;
    } catch (error: any) {
      console.error('Failed to create profile:', error);
      
      if (error.message?.includes('already in use')) {
        toast.error('You already have a profile!');
      } else {
        toast.error('Failed to create profile. Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Utility function to generate referral code from race ID
  const generateReferralCode = (raceId: number): string => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    let remaining = raceId;
    
    for (let i = 0; i < 8; i++) {
      code += chars[remaining % 36];
      remaining = Math.floor(remaining / 36);
    }
    
    return code;
  };
  

  return {
    // State
    connected,
    publicKey,
    userProfile,
    loading,
    profileLoading,
    
    // Actions
    program,
    createProfile,
    createRace,
    loadUserProfile,
  };
};