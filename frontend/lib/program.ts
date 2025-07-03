import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { GorRace } from '../types/gor_race';
import { PROGRAM_ID, RPC_ENDPOINT } from './constants';
import idl from '../types/gor_race.json';

export class GorRaceProgram {
  private program: Program<GorRace>;
  private provider: AnchorProvider;
  private wallet: Wallet | AnchorWallet;
  private publicKey: PublicKey;

  constructor(wallet: Wallet | AnchorWallet, connection?: Connection, publicKey?: PublicKey) {
    const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
    this.wallet = wallet;
    this.publicKey = publicKey || (wallet as any).publicKey || (wallet as any).adapter?.publicKey!;
    this.provider = new AnchorProvider(conn, wallet, {
      commitment: 'confirmed',
    });
    this.program = new Program(idl as any, PROGRAM_ID, this.provider);
    
    console.log('GorRaceProgram initialized with publicKey:', this.publicKey?.toString());
  }

  // PDA derivations
  getPlatformVaultPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("platform_vault")],
      PROGRAM_ID
    );
  }

  getPlayerProfilePda(player: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("player_profile"), player.toBuffer()],
      PROGRAM_ID
    );
  }

  getRacePda(raceId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    );
  }

  getRaceVaultPda(racePda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("race_vault"), racePda.toBuffer()],
      PROGRAM_ID
    );
  }

  getPlayerEntryPda(racePda: PublicKey, player: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("player_entry"), racePda.toBuffer(), player.toBuffer()],
      PROGRAM_ID
    );
  }

  // Core program methods
  async createProfile(username: string): Promise<string> {
    if (!this.publicKey) {
      console.error('No publicKey available in GorRaceProgram');
      throw new Error('PublicKey not available in program instance');
    }
    
    console.log('Creating profile for player:', this.publicKey.toString());
    const [playerProfilePda] = this.getPlayerProfilePda(this.publicKey);
    console.log('Player profile PDA:', playerProfilePda.toString());

    const tx = await this.program.methods
      .createProfile(username)
      .accounts({
        playerProfile: playerProfilePda,
        player: this.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    return tx;
  }

  async createRace(waitTime: number): Promise<{ raceId: number; txSignature: string }> {
    const raceId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
    const [racePda] = this.getRacePda(raceId);

    const tx = await this.program.methods
      .createRace(new anchor.BN(raceId), new anchor.BN(waitTime))
      .accounts({
        race: racePda,
        creator: this.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    return { raceId, txSignature: tx };
  }

  async joinRace(raceId: number, horseNumber: number, referralCode: string): Promise<string> {
    const [racePda] = this.getRacePda(raceId);
    const [raceVaultPda] = this.getRaceVaultPda(racePda);
    const [playerEntryPda] = this.getPlayerEntryPda(racePda, this.publicKey);

    const tx = await this.program.methods
      .joinRace(horseNumber, referralCode)
      .accounts({
        race: racePda,
        playerEntry: playerEntryPda,
        player: this.publicKey,
        raceVault: raceVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async executeRace(raceId: number): Promise<string> {
    const [racePda] = this.getRacePda(raceId);
    const [raceVaultPda] = this.getRaceVaultPda(racePda);
    const [platformVaultPda] = this.getPlatformVaultPda();

    const tx = await this.program.methods
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

    return tx;
  }

  async claimPrize(raceId: number): Promise<string> {
    const [racePda] = this.getRacePda(raceId);
    const [raceVaultPda] = this.getRaceVaultPda(racePda);
    const [platformVaultPda] = this.getPlatformVaultPda();
    const [playerEntryPda] = this.getPlayerEntryPda(racePda, this.publicKey);

    const tx = await this.program.methods
      .claimPrize()
      .accounts({
        race: racePda,
        playerEntry: playerEntryPda,
        player: this.publicKey,
        raceVault: raceVaultPda,
        platformVault: platformVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Data fetching methods
  async getRace(raceId: number) {
    const [racePda] = this.getRacePda(raceId);
    try {
      return await this.program.account.race.fetch(racePda);
    } catch (error) {
      return null;
    }
  }

  async getPlayerProfile(player: PublicKey) {
    const [playerProfilePda, bump] = this.getPlayerProfilePda(player);
    console.log('Fetching profile for player:', player.toString());
    console.log('Player profile PDA:', playerProfilePda.toString());
    console.log('PDA bump:', bump);
    
    try {
      const profile = await this.program.account.playerProfile.fetch(playerProfilePda);
      console.log('Successfully fetched profile:', profile);
      return profile;
    } catch (error: any) {
      console.error('Error fetching profile from PDA:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check if it's specifically an account not found error
      if (error.message?.includes('Account does not exist') ||
          error.message?.includes('AccountNotFound') ||
          error.name === 'AccountNotFoundError') {
        console.log('Account not found - profile does not exist');
      }
      
      return null;
    }
  }

  async getPlayerEntry(raceId: number, player: PublicKey) {
    const [racePda] = this.getRacePda(raceId);
    const [playerEntryPda] = this.getPlayerEntryPda(racePda, player);
    try {
      return await this.program.account.playerEntry.fetch(playerEntryPda);
    } catch (error) {
      return null;
    }
  }

  // Utility methods
  generateReferralCode(raceId: number): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    let remaining = raceId;
    
    for (let i = 0; i < 8; i++) {
      code += chars[remaining % 36];
      remaining = Math.floor(remaining / 36);
    }
    
    return code;
  }
}