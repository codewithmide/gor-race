import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;

  // Get race ID from command line or use latest
  const raceId = process.argv[2] || getLatestRaceId();

  console.log("Executing race...");
  console.log("Race ID:", raceId);

  // Derive PDAs
  const [racePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [platformVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_vault")],
    program.programId
  );

  try {
    // Execute race
    const tx = await program.methods
      .executeRace()
      .accounts({
        race: racePda,
        platformVault: platformVaultPda,
        recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    console.log("Race executed successfully!");
    console.log("Transaction signature:", tx);

    // Fetch race results
    const race = await program.account.race.fetch(racePda);
    console.log("\nRace Results:");
    console.log("Status:", Object.keys(race.status)[0]);
    console.log("Winning horses:");
    console.log("  1st place: Horse", race.winningHorses[0]);
    console.log("  2nd place: Horse", race.winningHorses[1]);
    console.log("  3rd place: Horse", race.winningHorses[2]);
    console.log("Total pool:", race.totalPool.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");
    console.log("Platform fee:", race.platformFee.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");

  } catch (error) {
    console.error("Error executing race:", error);
    throw error;
  }
}

function getLatestRaceId(): string {
  const racesPath = path.join(__dirname, "..", "races");
  if (!fs.existsSync(racesPath)) {
    throw new Error("No races found.");
  }

  const files = fs.readdirSync(racesPath);
  const raceFiles = files.filter(f => f.startsWith("race_") && f.endsWith(".json"));
  
  if (raceFiles.length === 0) {
    throw new Error("No races found.");
  }

  const latestFile = raceFiles.sort().pop();
  const raceData = JSON.parse(fs.readFileSync(path.join(racesPath, latestFile), "utf-8"));
  return raceData.raceId;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });