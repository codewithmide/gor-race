import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey } from "@solana/web3.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;
  const player = provider.wallet as anchor.Wallet;

  // Check if a specific player address was provided
  const targetPlayerAddress = process.argv[2];
  let targetPlayer: PublicKey;
  
  if (targetPlayerAddress) {
    try {
      targetPlayer = new PublicKey(targetPlayerAddress);
      console.log("👤 Viewing profile for:", targetPlayerAddress);
    } catch (error) {
      console.error("❌ Invalid player address provided");
      process.exit(1);
    }
  } else {
    targetPlayer = player.publicKey;
    console.log("👤 Your Profile");
  }

  // Derive player profile PDA
  const [playerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player_profile"), targetPlayer.toBuffer()],
    program.programId
  );

  try {
    // Fetch profile
    const profile = await program.account.playerProfile.fetch(playerProfilePda);
    
    console.log("=".repeat(50));
    console.log("🏇 GOR Race Profile");
    console.log("=".repeat(50));

    console.log("\n📝 Basic Info:");
    console.log("Username:", profile.username);
    console.log("Player address:", profile.player.toString());
    console.log("Profile created:", new Date(profile.createdAt.toNumber() * 1000).toLocaleString());
    console.log("Last updated:", new Date(profile.updatedAt.toNumber() * 1000).toLocaleString());

    console.log("\n🎯 Race Statistics:");
    console.log("Total races:", profile.totalRaces);
    console.log("Total wins (1st place):", profile.totalWins);
    console.log("Total podium finishes:", profile.totalPodiums);
    console.log("Total earnings:", (profile.totalEarnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "GOR");

    // Calculate and display rates
    if (profile.totalRaces > 0) {
      const winRate = (profile.totalWins / profile.totalRaces) * 100;
      const podiumRate = (profile.totalPodiums / profile.totalRaces) * 100;
      
      console.log("\n📊 Performance:");
      console.log("Win rate:", winRate.toFixed(1) + "%");
      console.log("Podium rate:", podiumRate.toFixed(1) + "%");
      console.log("Average earnings per race:", ((profile.totalEarnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL) / profile.totalRaces).toFixed(4), "GOR");
    } else {
      console.log("\n📊 Performance:");
      console.log("No races participated yet");
    }

    // Show ranking/achievements
    console.log("\n🏆 Achievements:");
    if (profile.totalWins >= 10) {
      console.log("🎖️  Champion - 10+ wins");
    } else if (profile.totalWins >= 5) {
      console.log("🥇 Winner - 5+ wins");
    } else if (profile.totalWins >= 1) {
      console.log("🏅 First Victory");
    }

    if (profile.totalRaces >= 50) {
      console.log("🎪 Veteran - 50+ races");
    } else if (profile.totalRaces >= 20) {
      console.log("🏃 Active Player - 20+ races");
    } else if (profile.totalRaces >= 10) {
      console.log("👟 Regular - 10+ races");
    } else if (profile.totalRaces >= 1) {
      console.log("🌟 Newcomer - First race");
    }

    if (profile.totalEarnings.toNumber() >= 10 * anchor.web3.LAMPORTS_PER_SOL) {
      console.log("💰 Big Earner - 10+ GOR earned");
    } else if (profile.totalEarnings.toNumber() >= 5 * anchor.web3.LAMPORTS_PER_SOL) {
      console.log("💸 Money Maker - 5+ GOR earned");
    } else if (profile.totalEarnings.toNumber() >= 1 * anchor.web3.LAMPORTS_PER_SOL) {
      console.log("💵 First Earnings - 1+ GOR earned");
    }

    if (profile.totalRaces === 0) {
      console.log("🎮 Ready to race!");
    }

    console.log("\n" + "=".repeat(50));

    // Show comparison with other players if viewing own profile
    if (targetPlayer.equals(player.publicKey)) {
      try {
        const allProfiles = await program.account.playerProfile.all();
        const playerCount = allProfiles.length;
        const betterWins = allProfiles.filter(p => p.account.totalWins > profile.totalWins).length;
        const betterRaces = allProfiles.filter(p => p.account.totalRaces > profile.totalRaces).length;
        
        console.log("📈 Your Ranking:");
        console.log(`Wins: #${betterWins + 1} out of ${playerCount} players`);
        console.log(`Races: #${betterRaces + 1} out of ${playerCount} players`);
        
        console.log("\n💡 Quick Actions:");
        console.log("- View leaderboard: npm run leaderboard");
        console.log("- Join a race: npm run join-race <REFERRAL_CODE> <HORSE_NUMBER>");
        console.log("- Create a race: npm run create-race [WAIT_TIME]");
      } catch (error) {
        // Ignore ranking errors
      }
    }

  } catch (error) {
    if (error.message && error.message.includes("AccountNotFound")) {
      if (targetPlayer.equals(player.publicKey)) {
        console.error("❌ You don't have a profile yet!");
        console.error("💡 Create one with: npm run create-profile <USERNAME>");
      } else {
        console.error("❌ Player profile not found for the provided address");
      }
    } else {
      console.error("❌ Error fetching profile:", error);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });