'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfile } from './useProfile';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@/lib/constants';
import * as anchor from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export interface RaceInfo {
  raceId: number;
  referralCode: string;
  creator: PublicKey;
  status: 'Pending' | 'Racing' | 'Completed' | 'Cancelled';
  startTime: number;
  waitTime: number;
  raceStartTime?: number;
  endTime?: number;
  entryCount: number;
  totalPool: number;
  winningHorses: number[];
  horseNames: string[];
}

export interface PlayerEntry {
  player: PublicKey;
  horseNumber: number;
  prizeAmount: number;
  claimStatus: 'Unclaimed' | 'Claimed';
}

export const useRaceManager = () => {
  const { program, publicKey, connected } = useProfile();
  const [currentRace, setCurrentRace] = useState<RaceInfo | null>(null);
  const [playerEntry, setPlayerEntry] = useState<PlayerEntry | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [racePhase, setRacePhase] = useState<'waiting' | 'racing' | 'completed' | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Refs to store functions to avoid circular dependencies
  const executeRaceRef = useRef<((referralCode: string) => Promise<void>) | null>(null);
  const checkWinnerAndCelebrateRef = useRef<(() => void) | null>(null);
  const updateStatsRef = useRef<((referralCode: string) => Promise<void>) | null>(null);

  // Timer effect for countdown - IMPROVED
  useEffect(() => {
    if (!currentRace || racePhase !== 'waiting') {
      console.log('⏸️ Timer paused:', { hasRace: !!currentRace, phase: racePhase });
      return;
    }

    console.log('▶️ Timer started for race:', currentRace.referralCode);
    
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const raceStartTime = currentRace.startTime + currentRace.waitTime;
      const remaining = raceStartTime - now;
      
      console.log('⏱️ Timer tick:', { remaining, now, raceStartTime });

      if (remaining <= 0) {
        console.log('🏁 Timer expired - executing race');
        setTimeRemaining(0);
        if (executeRaceRef.current) {
          executeRaceRef.current(currentRace.referralCode);
        }
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => {
      console.log('🛑 Timer cleanup');
      clearInterval(interval);
    };
  }, [currentRace, racePhase]);

  // Load race data by referral code
  const loadRaceByReferralCode = useCallback(async (referralCode: string) => {
    if (!program) return null;

    try {
      // Convert referral code back to race ID
      const raceId = referralCodeToRaceId(referralCode);
      
      console.log('🔍 Loading race:', { referralCode, raceId });
      console.log('📝 Race conversion details:', {
        originalReferralCode: referralCode,
        convertedRaceId: raceId,
        programExists: !!program
      });
      
      // Calculate race PDA
      const [racePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      console.log('📍 Calculated race PDA:', racePda.toString());
      
      const raceData = await program.account.race.fetch(racePda);
      console.log('✅ Raw race data fetched:', raceData);
      
      const race: RaceInfo = {
        raceId: raceData.raceId?.toNumber() || 0,
        referralCode: raceData.referralCode,
        creator: raceData.creator,
        status: Object.keys(raceData.status)[0] as any,
        startTime: raceData.startTime?.toNumber() || 0,
        waitTime: raceData.waitTime?.toNumber() || 0,
        raceStartTime: raceData.raceStartTime?.toNumber(),
        endTime: raceData.endTime?.toNumber(),
        entryCount: raceData.entryCount || 0,
        totalPool: raceData.totalPool?.toNumber() || 0,
        winningHorses: raceData.winningHorses || [],
        horseNames: raceData.horseNames || [],
      };

      console.log('✅ Race loaded:', race);
      console.log('🔍 Race details:', {
        raceId: race.raceId,
        referralCode: race.referralCode,
        status: race.status,
        startTime: race.startTime,
        waitTime: race.waitTime,
        creator: race.creator.toString()
      });
      
      setCurrentRace(race);
      
      // Determine race phase and set timer - IMPROVED LOGIC
      const now = Math.floor(Date.now() / 1000);
      console.log('⏰ Timer calculation:', {
        status: race.status,
        startTime: race.startTime,
        waitTime: race.waitTime,
        currentTime: now,
        raceStartTime: race.startTime + race.waitTime
      });
      
      if (race.status === 'Pending') {
        const raceStartTime = race.startTime + race.waitTime;
        const remaining = raceStartTime - now;
        console.log('⏱️ Timer remaining:', remaining);
        setTimeRemaining(Math.max(0, remaining));
        setRacePhase('waiting');
        console.log('📍 Race phase set to waiting with', remaining, 'seconds remaining');
      } else if (race.status === 'Racing') {
        setTimeRemaining(0);
        setRacePhase('racing');
        console.log('📍 Race phase set to racing');
      } else {
        setTimeRemaining(0);
        setRacePhase('completed');
        console.log('📍 Race phase set to completed');
      }

      return race;
    } catch (error) {
      console.error('❌ Failed to load race:', error);
      console.error('🔍 Error details:', {
        referralCode,
        convertedRaceId: referralCodeToRaceId(referralCode),
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown'
      });
      return null;
    }
  }, [program]);

  // Load player entry for current race
  const loadPlayerEntry = useCallback(async () => {
    if (!program || !publicKey || !currentRace) return;

    try {
      const [racePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), new anchor.BN(currentRace.raceId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      const [playerEntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const entryData = await program.account.playerEntry.fetch(playerEntryPda);
      
      const entry: PlayerEntry = {
        player: entryData.player,
        horseNumber: entryData.horseNumber,
        prizeAmount: entryData.prizeAmount?.toNumber() || 0,
        claimStatus: Object.keys(entryData.claimStatus)[0] as any,
      };

      setPlayerEntry(entry);
    } catch (error) {
      console.log('No player entry found for this race');
      setPlayerEntry(null);
    }
  }, [program, publicKey, currentRace]);

  // Execute race when timer ends
  const executeRace = useCallback(async (referralCode: string) => {
    if (!program || !currentRace) return;

    setLoading(true);
    try {
      const [racePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), new anchor.BN(currentRace.raceId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      const [raceVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race_vault"), racePda.toBuffer()],
        PROGRAM_ID
      );

      const [platformVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_vault")],
        PROGRAM_ID
      );

      await program.methods
        .executeRace()
        .accounts({
          race: racePda,
          raceVault: raceVaultPda,
          platformVault: platformVaultPda,
          recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      toast.success('🏁 Race started! The horses are running!');
      setRacePhase('racing');

      // Simulate 60-second race duration
      setTimeout(async () => {
        console.log('🏆 Race completed - loading results');
        await loadRaceByReferralCode(referralCode);
        await loadPlayerEntry();
        if (checkWinnerAndCelebrateRef.current) {
          checkWinnerAndCelebrateRef.current();
        }
        if (updateStatsRef.current) {
          await updateStatsRef.current(referralCode);
        }
      }, 60000);

    } catch (error: any) {
      console.error('Failed to execute race:', error);
      toast.error('Failed to start race');
    } finally {
      setLoading(false);
    }
  }, [program, currentRace, loadRaceByReferralCode, loadPlayerEntry]);

  // Assign functions to refs to avoid circular dependencies
  executeRaceRef.current = executeRace;

  // Check if player won and trigger celebration
  const checkWinnerAndCelebrate = useCallback(() => {
    if (!currentRace || !playerEntry) return;

    const playerHorse = playerEntry.horseNumber;
    const winningHorses = currentRace.winningHorses;

    if (winningHorses.includes(playerHorse)) {
      // Player won! Trigger celebration
      const position = winningHorses.indexOf(playerHorse) + 1;
      let message = '';
      
      if (position === 1) {
        message = '🥇 WINNER! You came in 1st place!';
        triggerHorseRaceCelebration();
      } else if (position === 2) {
        message = '🥈 Great job! You came in 2nd place!';
        triggerHorseRaceCelebration();
      } else if (position === 3) {
        message = '🥉 Well done! You came in 3rd place!';
        triggerHorseRaceCelebration();
      }

      toast.success(message, { duration: 8000 });
    } else {
      toast.error('🐎 Better luck next time, partner! Your horse didn\'t place in the top 3.', {
        duration: 5000
      });
      
      // Take user back to salon after 3 seconds
      setTimeout(() => {
        setCurrentRace(null);
        setPlayerEntry(null);
        setRacePhase(null);
      }, 3000);
    }
  }, [currentRace, playerEntry, setCurrentRace, setPlayerEntry, setRacePhase]);

  // Assign checkWinnerAndCelebrate to ref
  checkWinnerAndCelebrateRef.current = checkWinnerAndCelebrate;

  // Horse race themed celebration
  const triggerHorseRaceCelebration = () => {
    // Gold and brown confetti for horse race theme
    const colors = ['#FFD700', '#8B4513', '#DAA520', '#CD853F'];
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });
    
    // Second burst with different settings
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
    }, 250);
    
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
    }, 400);
  };

  // Claim prize
  const claimPrize = async () => {
    if (!program || !publicKey || !currentRace) return false;

    setLoading(true);
    try {
      const [racePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), new anchor.BN(currentRace.raceId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      const [playerEntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [raceVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race_vault"), racePda.toBuffer()],
        PROGRAM_ID
      );

      const [platformVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_vault")],
        PROGRAM_ID
      );

      await program.methods
        .claimPrize()
        .accounts({
          race: racePda,
          playerEntry: playerEntryPda,
          player: publicKey,
          raceVault: raceVaultPda,
          platformVault: platformVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      toast.success('💰 Prize claimed successfully! Yeehaw!');
      await loadPlayerEntry(); // Refresh entry status
      return true;
    } catch (error: any) {
      console.error('Failed to claim prize:', error);
      toast.error('Failed to claim prize');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update player statistics (equivalent to npm run update-stats)
  const updateStats = useCallback(async (referralCode: string) => {
    if (!program || !publicKey || !currentRace) return;

    try {
      const [racePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), new anchor.BN(currentRace.raceId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      const [playerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_profile"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [playerEntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .updateStats()
        .accounts({
          playerProfile: playerProfilePda,
          race: racePda,
          playerEntry: playerEntryPda,
          player: publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      console.log('✅ Player statistics updated successfully');
    } catch (error: any) {
      console.error('Failed to update stats:', error);
    }
  }, [program, publicKey, currentRace]);

  // Assign updateStats to ref
  updateStatsRef.current = updateStats;

  // Utility: Convert referral code back to race ID
  const referralCodeToRaceId = (referralCode: string): number => {
    let raceId = 0;
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    console.log('🔄 Converting referral code:', referralCode);
    
    for (let i = 0; i < referralCode.length; i++) {
      const char = referralCode[i];
      const value = chars.indexOf(char);
      const contribution = value * Math.pow(36, i);
      raceId += contribution;
      console.log(`   Position ${i}: '${char}' -> ${value} * 36^${i} = ${contribution}`);
    }
    
    console.log('🎯 Final converted race ID:', raceId);
    
    // Test: Generate referral code from converted ID to verify
    const testCode = generateReferralCodeFromId(raceId);
    console.log('🧪 Test conversion back:', { original: referralCode, regenerated: testCode, matches: referralCode === testCode });
    
    return raceId;
  };

  // Test helper: Generate referral code from race ID (same as useProfile)
  const generateReferralCodeFromId = (raceId: number): string => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    let remaining = raceId;
    
    for (let i = 0; i < 8; i++) {
      code += chars[remaining % 36];
      remaining = Math.floor(remaining / 36);
    }
    
    return code;
  };

  // Format time remaining for display
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check for existing race by creator (for persistence across tabs)
  const loadCreatorRace = useCallback(async () => {
    if (!program || !publicKey) return null;

    try {
      // Get all race accounts and filter by creator
      const allRaces = await program.account.race.all();
      const userRaces = allRaces.filter(race => 
        race.account.creator.toString() === publicKey.toString() &&
        (race.account.status as any).pending !== undefined
      );

      if (userRaces.length > 0) {
        const latestRace = userRaces[userRaces.length - 1];
        console.log('🔍 Found existing race for creator:', latestRace.account.referralCode);
        return await loadRaceByReferralCode(latestRace.account.referralCode);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load creator race:', error);
      return null;
    }
  }, [program, publicKey, loadRaceByReferralCode]);

  // Check for existing races when component mounts
  useEffect(() => {
    if (connected && program && publicKey && !currentRace) {
      console.log('🔍 Checking for existing races on mount');
      loadCreatorRace();
    }
  }, [connected, program, publicKey, currentRace, loadCreatorRace]);

  return {
    // State
    currentRace,
    playerEntry,
    timeRemaining,
    racePhase,
    loading,
    
    // Actions
    loadRaceByReferralCode,
    loadPlayerEntry,
    loadCreatorRace,
    executeRace,
    claimPrize,
    updateStats,
    
    // Utilities
    formatTimeRemaining,
    setCurrentRace,
    setRacePhase,
    setTimeRemaining,
  };
};