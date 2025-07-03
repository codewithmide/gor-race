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

  console.log("Claiming prize...");
  console.log("Player:", player.publicKey.toString());
  console.log("Race ID:", raceId);

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

  const [platformVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_vault")],
    program.programId
  );

  try {
    // Check player's entry and if they won
    const playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
    const race = await program.account.race.fetch(racePda);
    
    const wonPosition = race.winningHorses.findIndex(h => h === playerEntry.horseNumber);
    if (wonPosition === -1) {
      console.log("Sorry, your horse didn't win any position.");
      return;
    }

    console.log(`Congratulations! Your horse won position ${wonPosition + 1}!`);

    // Claim prize
    const tx = await program.methods
      .claimPrize()
      .accounts({
        race: racePda,
        playerEntry: playerEntryPda,
        player: player.publicKey,
        raceVault: raceVaultPda,
        platformVault: platformVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Prize claimed successfully!");
    console.log("Transaction signature:", tx);

    // Check updated balance
    const balance = await provider.connection.getBalance(player.publicKey);
    console.log("Updated GOR balance:", balance / anchor.web3.LAMPORTS_PER_SOL);

  } catch (error) {
    console.error("Error claiming prize:", error);
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