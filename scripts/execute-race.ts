import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram } from "@solana/web3.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;

  // Get referral code from command line or race ID
  const input = process.argv[2];
  let raceId: number;
  let racePda: PublicKey;

  if (input && input.length === 8) {
    // Assume it's a referral code
    console.log("Executing race...");
    console.log("Referral Code:", input);
    
    raceId = decodeReferralCode(input);
    if (!raceId) {
      console.error("Invalid referral code format");
      process.exit(1);
    }
    console.log("Decoded Race ID:", raceId);
  } else if (input) {
    // Assume it's a race ID
    raceId = parseInt(input);
    console.log("Executing race...");
    console.log("Race ID:", raceId);
  } else {
    console.error("Usage: npm run execute-race <REFERRAL_CODE_OR_RACE_ID>");
    console.error("Example: npm run execute-race XYVSYS00");
    console.error("Example: npm run execute-race 1751510633");
    process.exit(1);
  }

  // Derive PDAs
  const [racePda_derived] = PublicKey.findProgramAddressSync(
    [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  racePda = racePda_derived;

  const [platformVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_vault")],
    program.programId
  );

  const [raceVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("race_vault"), racePda.toBuffer()],
    program.programId
  );

  try {
    // First, check race status and timing
    const race = await program.account.race.fetch(racePda);
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log("\\nRace Info:");
    console.log("Status:", Object.keys(race.status)[0]);
    console.log("Entry count:", race.entryCount);
    console.log("Wait time:", race.waitTime.toNumber(), "seconds");
    console.log("Start time:", new Date(race.startTime.toNumber() * 1000).toLocaleString());
    
    const waitEndTime = race.startTime.toNumber() + race.waitTime.toNumber();
    console.log("Wait ends at:", new Date(waitEndTime * 1000).toLocaleString());
    console.log("Current time:", new Date(currentTime * 1000).toLocaleString());
    
    if (race.raceStartTime) {
      const raceEndTime = race.raceStartTime.toNumber() + 60; // RACE_DURATION
      console.log("Race started at:", new Date(race.raceStartTime.toNumber() * 1000).toLocaleString());
      console.log("Race ends at:", new Date(raceEndTime * 1000).toLocaleString());
    }
    
    // Check if we can execute
    const status = Object.keys(race.status)[0];
    if (status === 'pending') {
      if (currentTime < waitEndTime) {
        console.log("\\n❌ Cannot start race yet. Wait time not expired.");
        console.log("Time remaining:", waitEndTime - currentTime, "seconds");
        return;
      }
      if (race.entryCount < 1) { // MIN_PLAYERS_TO_START = 1 (changed from 3)
        console.log("\\n❌ Cannot start race. Not enough players. Need at least 1 player.");
        return;
      }
      console.log("\\n✅ Starting race simulation...");
    } else if (status === 'racing') {
      if (!race.raceStartTime) {
        console.log("\\n❌ Race is in racing status but no start time found.");
        return;
      }
      const raceEndTime = race.raceStartTime.toNumber() + 60;
      if (currentTime < raceEndTime) {
        console.log("\\n❌ Race simulation still in progress.");
        console.log("Time remaining:", raceEndTime - currentTime, "seconds");
        return;
      }
      console.log("\\n✅ Finishing race and determining winners...");
    } else {
      console.log("\\n❌ Race cannot be executed. Status:", status);
      return;
    }

    // Execute race
    const tx = await program.methods
      .executeRace()
      .accounts({
        race: racePda,
        raceVault: raceVaultPda,
        platformVault: platformVaultPda,
        recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Race executed successfully!");
    console.log("Transaction signature:", tx);

    // Fetch updated race results
    const updatedRace = await program.account.race.fetch(racePda);
    console.log("\n🏁 Updated Race Status:");
    console.log("Status:", Object.keys(updatedRace.status)[0]);
    
    if (Object.keys(updatedRace.status)[0] === 'racing') {
      console.log("🏃 Race simulation started!");
      console.log("Duration: 60 seconds");
      console.log("Come back in 1 minute to finish the race and see results!");
    } else if (Object.keys(updatedRace.status)[0] === 'completed') {
      console.log("🏆 Race Results:");
      console.log("Winning horses:");
      console.log("  🥇 1st place: Horse", updatedRace.winningHorses[0], "-", updatedRace.horseNames[updatedRace.winningHorses[0] - 1]);
      console.log("  🥈 2nd place: Horse", updatedRace.winningHorses[1], "-", updatedRace.horseNames[updatedRace.winningHorses[1] - 1]);
      console.log("  🥉 3rd place: Horse", updatedRace.winningHorses[2], "-", updatedRace.horseNames[updatedRace.winningHorses[2] - 1]);
      console.log("💰 Total pool:", updatedRace.totalPool.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");
      console.log("💸 Platform fee:", updatedRace.platformFee.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");
      console.log("🏁 Race completed at:", new Date(updatedRace.endTime.toNumber() * 1000).toLocaleString());
    } else if (Object.keys(updatedRace.status)[0] === 'cancelled') {
      console.log("❌ Race was cancelled - not enough players joined.");
    }

  } catch (error) {
    console.error("Error executing race:", error);
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