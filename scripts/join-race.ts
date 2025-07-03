import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;
  const player = provider.wallet as anchor.Wallet;

  // Get referral code and horse number from command line
  const referralCode = process.argv[2];
  const horseNumber = parseInt(process.argv[3] || "1");
  
  if (!referralCode) {
    console.error("Usage: npm run join-race <REFERRAL_CODE> [HORSE_NUMBER]");
    console.error("Example: npm run join-race XYVSYS00 3");
    process.exit(1);
  }
  
  if (referralCode.length !== 8) {
    console.error("Referral code must be exactly 8 characters");
    process.exit(1);
  }
  
  if (horseNumber < 1 || horseNumber > 10) {
    console.error("Horse number must be between 1 and 10");
    process.exit(1);
  }

  console.log("Joining race...");
  console.log("Player:", player.publicKey.toString());
  console.log("Referral Code:", referralCode);
  console.log("Horse Number:", horseNumber);

  // Check player GOR balance (native token)
  const balance = await provider.connection.getBalance(player.publicKey);
  console.log("Player GOR balance:", balance / anchor.web3.LAMPORTS_PER_SOL);

  if (balance < 100_000_000) { // 0.1 GOR
    throw new Error("Insufficient GOR balance. Need at least 0.1 GOR to join race.");
  }

  // Decode referral code to race ID
  const raceId = decodeReferralCode(referralCode);
  if (!raceId) {
    console.error("Invalid referral code format");
    process.exit(1);
  }
  
  console.log("Decoded Race ID:", raceId);
  
  // Derive PDAs
  const [racePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [playerEntryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player_entry"), racePda.toBuffer(), player.publicKey.toBuffer()],
    program.programId
  );

  const [raceVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("race_vault"), racePda.toBuffer()],
    program.programId
  );

  try {
    // Verify race exists and get race data
    const race = await program.account.race.fetch(racePda);
    console.log("\nRace Info:");
    console.log("Status:", Object.keys(race.status)[0]);
    console.log("Current players:", race.entryCount, "/", race.maxPlayers);
    console.log("Wait time:", race.waitTime.toNumber(), "seconds");
    console.log("Referral code:", race.referralCode);
    
    // Verify referral code matches
    if (race.referralCode !== referralCode) {
      console.error("Referral code does not match this race!");
      console.error("Expected:", race.referralCode);
      console.error("Provided:", referralCode);
      process.exit(1);
    }
    
    // Check if race is full
    if (race.entryCount >= race.maxPlayers) {
      console.error("Race is full! Maximum players:", race.maxPlayers);
      process.exit(1);
    }
    
    // Check if race is still open
    if (Object.keys(race.status)[0] !== 'pending') {
      console.error("Race is no longer accepting players. Status:", Object.keys(race.status)[0]);
      process.exit(1);
    }
    
    console.log("\nSelected horse:", race.horseNames[horseNumber - 1]);
    console.log("Entry fee: 0.1 GOR");
    
    // Join race
    const tx = await program.methods
      .joinRace(horseNumber, referralCode)
      .accounts({
        race: racePda,
        playerEntry: playerEntryPda,
        player: player.publicKey,
        raceVault: raceVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Successfully joined race!");
    console.log("Transaction signature:", tx);

    // Fetch updated race data
    const updatedRace = await program.account.race.fetch(racePda);
    console.log("\nUpdated Race Status:");
    console.log("Total pool:", updatedRace.totalPool.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");
    console.log("Entry count:", updatedRace.entryCount, "/", updatedRace.maxPlayers);
    
    // Fetch player entry data
    const playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
    console.log("\nYour Entry:");
    console.log("Horse:", playerEntry.horseNumber, "-", updatedRace.horseNames[playerEntry.horseNumber - 1]);
    console.log("Entry amount:", playerEntry.entryAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");
    
    const currentTime = Math.floor(Date.now() / 1000);
    const raceEndTime = updatedRace.startTime.toNumber() + updatedRace.waitTime.toNumber();
    const timeLeft = raceEndTime - currentTime;
    
    if (timeLeft > 0) {
      console.log("\nRace will start in:", timeLeft, "seconds");
      console.log("Race end time:", new Date(raceEndTime * 1000).toLocaleString());
    } else {
      console.log("\nRace should be executed! Time expired.");
    }

  } catch (error) {
    console.error("Error joining race:", error);
    throw error;
  }
}

function decodeReferralCode(referralCode: string): number | null {
  // Decode referral code back to race_id
  if (referralCode.length !== 8) {
    return null;
  }
  
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let raceId = 0;
  let multiplier = 1;
  
  for (let i = 0; i < referralCode.length; i++) {
    const c = referralCode[i];
    const idx = chars.indexOf(c);
    if (idx === -1) {
      return null;
    }
    raceId += idx * multiplier;
    multiplier *= 36;
  }
  
  return raceId;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });