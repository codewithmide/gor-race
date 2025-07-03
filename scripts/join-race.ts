import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;
  const player = provider.wallet.payer;

  // Get race ID from command line or use latest
  const raceId = process.argv[2] || getLatestRaceId();
  const horseNumber = parseInt(process.argv[3] || "1");

  console.log("Joining race...");
  console.log("Player:", player.publicKey.toString());
  console.log("Race ID:", raceId);
  console.log("Horse Number:", horseNumber);

  // Check player GOR balance (native token)
  const balance = await provider.connection.getBalance(player.publicKey);
  console.log("Player GOR balance:", balance / anchor.web3.LAMPORTS_PER_SOL);

  if (balance < 100_000_000) { // 0.1 GOR
    throw new Error("Insufficient GOR balance. Need at least 0.1 GOR to join race.");
  }

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
    // Join race
    const tx = await program.methods
      .joinRace(horseNumber)
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
    const race = await program.account.race.fetch(racePda);
    console.log("\nRace Status:");
    console.log("Total pool:", race.totalPool.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");
    console.log("Entry count:", race.entryCount);

  } catch (error) {
    console.error("Error joining race:", error);
    throw error;
  }
}

function getLatestRaceId(): string {
  const racesPath = path.join(__dirname, "..", "races");
  if (!fs.existsSync(racesPath)) {
    throw new Error("No races found. Create a race first.");
  }

  const files = fs.readdirSync(racesPath);
  const raceFiles = files.filter(f => f.startsWith("race_") && f.endsWith(".json"));
  
  if (raceFiles.length === 0) {
    throw new Error("No races found. Create a race first.");
  }

  // Get the latest race
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