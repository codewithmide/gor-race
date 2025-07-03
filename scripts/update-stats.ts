import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
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

  if (!input) {
    console.error("Usage: npm run update-stats <REFERRAL_CODE_OR_RACE_ID>");
    console.error("Example: npm run update-stats XYVSYS00");
    console.error("Example: npm run update-stats 1751510633");
    process.exit(1);
  }

  console.log("Updating player statistics...");
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
  const [racePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [playerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player_profile"), player.publicKey.toBuffer()],
    program.programId
  );

  const [playerEntryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player_entry"), racePda.toBuffer(), player.publicKey.toBuffer()],
    program.programId
  );

  try {
    // Check if race exists and is completed
    const race = await program.account.race.fetch(racePda);
    const raceStatus = Object.keys(race.status)[0];
    
    if (raceStatus !== 'completed') {
      console.error(`❌ Race is not completed yet. Current status: ${raceStatus}`);
      console.error("   Stats can only be updated for completed races.");
      process.exit(1);
    }

    // Check if player participated
    let playerEntry;
    try {
      playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
    } catch (error) {
      console.error("❌ You did not participate in this race.");
      process.exit(1);
    }

    // Check if stats already updated
    if (playerEntry.statsUpdated) {
      console.log("ℹ️  Stats already updated for this race.");
      return;
    }

    // Check if player profile exists
    let playerProfile;
    try {
      playerProfile = await program.account.playerProfile.fetch(playerProfilePda);
    } catch (error) {
      console.error("❌ Player profile not found.");
      console.error("💡 Create a profile first with: npm run create-profile <USERNAME>");
      process.exit(1);
    }

    console.log("\n🏁 Race Results:");
    console.log("🥇 1st place: Horse", race.winningHorses[0], "-", race.horseNames[race.winningHorses[0] - 1]);
    console.log("🥈 2nd place: Horse", race.winningHorses[1], "-", race.horseNames[race.winningHorses[1] - 1]);
    console.log("🥉 3rd place: Horse", race.winningHorses[2], "-", race.horseNames[race.winningHorses[2] - 1]);
    
    console.log("\n🐎 Your Horse:");
    console.log("You selected: Horse", playerEntry.horseNumber, "-", race.horseNames[playerEntry.horseNumber - 1]);

    // Show what will be updated
    const wonPosition = race.winningHorses.findIndex(h => h === playerEntry.horseNumber);
    console.log("\n📊 Stats Update:");
    console.log("Race participation: +1");
    
    if (wonPosition !== -1) {
      const positionNames = ["🥇 1st", "🥈 2nd", "🥉 3rd"];
      console.log(`Prize position: ${positionNames[wonPosition]} place`);
      
      if (wonPosition === 0) {
        console.log("Wins: +1");
      }
      console.log("Podium finishes: +1");
      console.log("Earnings: +", (playerEntry.prizeAmount / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "GOR");
    } else {
      console.log("No prize won this race");
    }

    // Update stats
    const tx = await program.methods
      .updateStats()
      .accounts({
        playerProfile: playerProfilePda,
        race: racePda,
        playerEntry: playerEntryPda,
        player: player.publicKey,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    console.log("\n✅ Stats updated successfully!");
    console.log("📋 Transaction signature:", tx);

    // Fetch and display updated profile
    const updatedProfile = await program.account.playerProfile.fetch(playerProfilePda);
    console.log("\n📈 Updated Statistics:");
    console.log("Username:", updatedProfile.username);
    console.log("Total races:", updatedProfile.totalRaces);
    console.log("Total wins:", updatedProfile.totalWins);
    console.log("Total podiums:", updatedProfile.totalPodiums);
    console.log("Total earnings:", (updatedProfile.totalEarnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "GOR");
    
    if (updatedProfile.totalRaces > 0) {
      const winRate = (updatedProfile.totalWins / updatedProfile.totalRaces) * 100;
      const podiumRate = (updatedProfile.totalPodiums / updatedProfile.totalRaces) * 100;
      console.log("Win rate:", winRate.toFixed(1) + "%");
      console.log("Podium rate:", podiumRate.toFixed(1) + "%");
    }

    console.log("\n💡 Next Steps:");
    console.log("- View your profile: npm run profile");
    console.log("- Check leaderboard: npm run leaderboard");
    console.log("- Join another race: npm run join-race <REFERRAL_CODE> <HORSE_NUMBER>");

  } catch (error) {
    if (error.message && error.message.includes("AccountNotFound")) {
      console.error("❌ Race, player entry, or profile not found.");
    } else {
      console.error("❌ Error updating stats:", error);
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