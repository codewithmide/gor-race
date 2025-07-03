import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;
  const player = provider.wallet as anchor.Wallet;

  // Get username from command line
  const username = process.argv[2];
  
  if (!username) {
    console.error("Usage: npm run create-profile <USERNAME>");
    console.error("Example: npm run create-profile HorseRacer123");
    console.error("\nUsername requirements:");
    console.error("- Max 32 characters");
    console.error("- Only letters, numbers, underscore, dash, and dot allowed");
    console.error("- Cannot be empty");
    process.exit(1);
  }

  console.log("Creating player profile...");
  console.log("Player:", player.publicKey.toString());
  console.log("Username:", username);

  // Derive player profile PDA
  const [playerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player_profile"), player.publicKey.toBuffer()],
    program.programId
  );

  try {
    // Check if profile already exists
    try {
      const existingProfile = await program.account.playerProfile.fetch(playerProfilePda);
      console.error("❌ Profile already exists for this wallet!");
      console.error(`   Current username: ${existingProfile.username}`);
      console.error("   Each wallet can only have one profile.");
      console.error("   To view your profile, use: npm run profile");
      process.exit(1);
    } catch (error) {
      // Profile doesn't exist, which is what we want
    }

    // Validate username locally
    if (username.length > 32) {
      console.error("❌ Username too long (max 32 characters)");
      process.exit(1);
    }

    if (username.trim().length === 0) {
      console.error("❌ Username cannot be empty");
      process.exit(1);
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      console.error("❌ Username contains invalid characters");
      console.error("   Only letters, numbers, underscore (_), dash (-), and dot (.) are allowed");
      process.exit(1);
    }

    // Create profile
    const tx = await program.methods
      .createProfile(username)
      .accounts({
        playerProfile: playerProfilePda,
        player: player.publicKey,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    console.log("✅ Profile created successfully!");
    console.log("📋 Transaction signature:", tx);

    // Fetch and display the created profile
    const profile = await program.account.playerProfile.fetch(playerProfilePda);
    console.log("\n👤 Profile Details:");
    console.log("Username:", profile.username);
    console.log("Player address:", profile.player.toString());
    console.log("Created at:", new Date(profile.createdAt.toNumber() * 1000).toLocaleString());
    
    console.log("\n🎯 Statistics:");
    console.log("Total races:", profile.totalRaces);
    console.log("Total wins:", profile.totalWins);
    console.log("Total podiums:", profile.totalPodiums);
    console.log("Total earnings:", profile.totalEarnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "GOR");

    console.log("\n🎮 Next Steps:");
    console.log("- Join races: npm run join-race <REFERRAL_CODE> <HORSE_NUMBER>");
    console.log("- View leaderboard: npm run leaderboard");
    console.log("- View your profile: npm run profile");

  } catch (error) {
    if (error.message && error.message.includes("already in use")) {
      console.error("❌ Account already exists - profile creation failed");
    } else if (error.message && error.message.includes("UsernameTooLong")) {
      console.error("❌ Username too long (max 32 characters)");
    } else if (error.message && error.message.includes("UsernameEmpty")) {
      console.error("❌ Username is empty or contains invalid characters");
    } else {
      console.error("❌ Error creating profile:", error);
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