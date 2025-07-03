import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;
  const creator = provider.wallet as anchor.Wallet;

  console.log("Creating new race...");
  console.log("Creator:", creator.publicKey.toString());
  
  // Get wait time from command line args or use default
  const args = process.argv.slice(2);
  const waitTime = args.length > 0 ? parseInt(args[0]) : null;
  
  if (waitTime !== null) {
    if (waitTime < 30 || waitTime > 180) {
      console.error("Wait time must be between 30 and 180 seconds");
      process.exit(1);
    }
    console.log("Wait time:", waitTime, "seconds");
  } else {
    console.log("Using default wait time: 60 seconds");
  }

  // Generate race ID using same method as program (unix timestamp)
  const raceId = new anchor.BN(Math.floor(Date.now() / 1000));
  
  // Derive race PDA
  const [racePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("race"), raceId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // Derive race vault PDA (for holding native GOR)
  const [raceVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("race_vault"), racePda.toBuffer()],
    program.programId
  );

  console.log("Race ID:", raceId.toString());
  console.log("Race PDA:", racePda.toString());
  console.log("Race Vault PDA:", raceVaultPda.toString());

  try {
    // Create race
    const tx = await program.methods
      .createRace(raceId, waitTime ? new anchor.BN(waitTime) : null)
      .accounts({
        race: racePda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    console.log("Race created successfully!");
    console.log("Transaction signature:", tx);

    // Fetch race data
    const race = await program.account.race.fetch(racePda);
    console.log("\nRace Details:");
    console.log("Status:", Object.keys(race.status)[0]);
    console.log("Creator:", race.creator.toString());
    console.log("Max Players:", race.maxPlayers);
    console.log("Wait Time:", race.waitTime.toNumber(), "seconds");
    console.log("Referral Code:", race.referralCode);
    console.log("Start time:", new Date(race.startTime.toNumber() * 1000).toLocaleString());
    console.log("Race will expire at:", new Date((race.startTime.toNumber() + race.waitTime.toNumber()) * 1000).toLocaleString());
    console.log("\nHorse names:");
    race.horseNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    console.log("\n🎯 Share this referral code with players:");
    console.log(`📋 REFERRAL CODE: ${race.referralCode}`);
    console.log(`📍 Race PDA: ${racePda.toString()}`);
    console.log("\nPlayers can use this code to join the race!");

    // Save race info
    const raceInfo = {
      raceId: raceId.toString(),
      racePda: racePda.toString(),
      raceVaultPda: raceVaultPda.toString(),
      creator: creator.publicKey.toString(),
      maxPlayers: race.maxPlayers,
      waitTime: race.waitTime.toNumber(),
      referralCode: race.referralCode,
      startTime: race.startTime.toNumber(),
      horseNames: race.horseNames,
      timestamp: new Date().toISOString(),
    };

    const racesPath = path.join(__dirname, "..", "races");
    if (!fs.existsSync(racesPath)) {
      fs.mkdirSync(racesPath);
    }

    const raceFilePath = path.join(racesPath, `race_${raceId}.json`);
    fs.writeFileSync(raceFilePath, JSON.stringify(raceInfo, null, 2));
    console.log("\nRace info saved to:", raceFilePath);

  } catch (error) {
    console.error("Error creating race:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });