import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const PLATFORM_FEE_BPS = 500; // 5%

async function main() {
  // Configure provider - this will use your existing keypair from solana config
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;
  
  console.log("Program ID:", program.programId.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);

  // Your existing keypair is automatically loaded as the authority
  const authority = provider.wallet as anchor.Wallet;
  console.log("Authority:", authority.publicKey.toString());
  
  // Check GOR balance (native token)
  const balance = await provider.connection.getBalance(authority.publicKey);
  console.log("Authority GOR balance:", balance / anchor.web3.LAMPORTS_PER_SOL);

  // Derive platform vault PDA
  const [platformVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_vault")],
    program.programId
  );

  console.log("Platform Vault PDA:", platformVaultPda.toString());

  try {
    // Check if already initialized
    const accountInfo = await provider.connection.getAccountInfo(platformVaultPda);
    if (accountInfo) {
      console.log("Platform vault already initialized!");
      const platformVault = await program.account.platformVault.fetch(platformVaultPda);
      console.log("Current authority:", platformVault.authority.toString());
      console.log("Current fee:", platformVault.platformFeeBps / 100, "%");
      return;
    }

    // Initialize platform vault
    console.log("Initializing platform vault...");
    const tx = await program.methods
      .initialize(PLATFORM_FEE_BPS)
      .accounts({
        platformVault: platformVaultPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Platform vault initialized!");
    console.log("Transaction signature:", tx);
    
    // Save deployment info
    const deploymentInfo = {
      programId: program.programId.toString(),
      platformVaultPda: platformVaultPda.toString(),
      authority: authority.publicKey.toString(),
      platformFeeBps: PLATFORM_FEE_BPS,
      cluster: provider.connection.rpcEndpoint,
      timestamp: new Date().toISOString(),
    };

    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", deploymentPath);

  } catch (error) {
    console.error("Error initializing platform:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
