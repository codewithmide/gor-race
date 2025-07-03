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

  // Get referral code or race ID from command line
  const input = process.argv[2];
  let raceId: number;
  let racePda: PublicKey;

  if (!input) {
    console.error("Usage: npm run claim-prize <REFERRAL_CODE_OR_RACE_ID>");
    console.error("Example: npm run claim-prize XYVSYS00");
    console.error("Example: npm run claim-prize 1751510633");
    process.exit(1);
  }

  console.log("Claiming prize...");
  console.log("Player:", player.publicKey.toString());

  if (input.length === 8 && isNaN(Number(input))) {
    // Assume it's a referral code
    console.log("Referral Code:", input);
    
    raceId = decodeReferralCode(input);
    if (!raceId) {
      console.error("❌ Invalid referral code format");
      process.exit(1);
    }
    console.log("Decoded Race ID:", raceId);
  } else {
    // Assume it's a race ID
    raceId = parseInt(input);
    if (isNaN(raceId)) {
      console.error("❌ Invalid race ID format");
      process.exit(1);
    }
    console.log("Race ID:", raceId);
  }

  // Derive PDAs
  const [racePda_derived] = PublicKey.findProgramAddressSync(
    [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  racePda = racePda_derived;

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
    // First check if race exists and is completed
    let race, playerEntry;
    
    try {
      race = await program.account.race.fetch(racePda);
    } catch (error) {
      console.error("❌ Race not found. Please check the referral code or race ID.");
      process.exit(1);
    }

    // Check race status
    const raceStatus = Object.keys(race.status)[0];
    if (raceStatus !== 'completed') {
      console.error(`❌ Race is not completed yet. Current status: ${raceStatus}`);
      if (raceStatus === 'pending') {
        console.error("   Wait for players to join and race to start.");
      } else if (raceStatus === 'racing') {
        console.error("   Race simulation is in progress. Wait for it to finish.");
      } else if (raceStatus === 'cancelled') {
        console.error("   Race was cancelled due to insufficient players.");
      }
      process.exit(1);
    }

    // Check if player participated in this race
    try {
      playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
    } catch (error) {
      console.error("❌ You did not participate in this race.");
      console.error("   Make sure you joined this race before trying to claim prizes.");
      process.exit(1);
    }

    // Display race results
    console.log("\\n🏁 Race Results:");
    console.log("🥇 1st place: Horse", race.winningHorses[0], "-", race.horseNames[race.winningHorses[0] - 1]);
    console.log("🥈 2nd place: Horse", race.winningHorses[1], "-", race.horseNames[race.winningHorses[1] - 1]);
    console.log("🥉 3rd place: Horse", race.winningHorses[2], "-", race.horseNames[race.winningHorses[2] - 1]);
    
    console.log("\\n🐎 Your Horse:");
    console.log("You selected: Horse", playerEntry.horseNumber, "-", race.horseNames[playerEntry.horseNumber - 1]);
    
    // Check if player won
    const wonPosition = race.winningHorses.findIndex(h => h === playerEntry.horseNumber);
    if (wonPosition === -1) {
      console.log("\\n❌ Sorry, your horse didn't win any position this time.");
      console.log("💔 Better luck next race!");
      console.log("\\n💡 Tip: Join more races to increase your chances of winning!");
      console.log("💡 Tip: Update your stats with: npm run update-stats", input);
      return;
    }

    const positionNames = ["🥇 1st", "🥈 2nd", "🥉 3rd"];
    console.log(`\\n🎉 Congratulations! Your horse won ${positionNames[wonPosition]} place!`);
    
    // Check if already claimed
    if (Object.keys(playerEntry.claimStatus)[0] === 'claimed') {
      console.log("\\n⚠️  You have already claimed your prize for this race.");
      return;
    }

    console.log("\\n💰 Claiming your prize...");

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

    console.log("✅ Prize claimed successfully!");
    console.log("📋 Transaction signature:", tx);

    // Show prize details
    const updatedPlayerEntry = await program.account.playerEntry.fetch(playerEntryPda);
    const prizeAmount = updatedPlayerEntry.prizeAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL;
    console.log("💰 Prize amount:", prizeAmount, "GOR");

    // Check updated balance
    const balance = await provider.connection.getBalance(player.publicKey);
    console.log("💳 Updated GOR balance:", balance / anchor.web3.LAMPORTS_PER_SOL);
    
    console.log("\\n💡 Next Steps:");
    console.log("- Update your stats: npm run update-stats", input);
    console.log("- View your profile: npm run profile");
    console.log("- Check leaderboard: npm run leaderboard");

  } catch (error) {
    if (error.message && error.message.includes("AccountNotFound")) {
      console.error("❌ Race or player entry not found. Please check the referral code.");
    } else {
      console.error("❌ Error claiming prize:", error);
    }
    process.exit(1);
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