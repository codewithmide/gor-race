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

  // Generate race ID
  const raceId = new anchor.BN(Date.now());
  
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
      .createRace()
      .accounts({
        race: racePda,
        raceVault: raceVaultPda,
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
    console.log("Start time:", new Date(race.startTime.toNumber() * 1000).toLocaleString());
    console.log("Horse names:");
    race.horseNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });

    // Save race info
    const raceInfo = {
      raceId: raceId.toString(),
      racePda: racePda.toString(),
      raceVaultPda: raceVaultPda.toString(),
      creator: creator.publicKey.toString(),
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