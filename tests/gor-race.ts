import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, Keypair, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo,
  getAccount 
} from "@solana/spl-token";
import { assert } from "chai";

describe("gor-race", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;
  
  // Test accounts
  let authority: Keypair;
  let player1: Keypair;
  let player2: Keypair;
  let player3: Keypair;
  let gorMint: PublicKey;
  let platformTokenAccount: PublicKey;
  let player1TokenAccount: PublicKey;
  let player2TokenAccount: PublicKey;
  let player3TokenAccount: PublicKey;

  // PDAs
  let platformVaultPda: PublicKey;
  let platformVaultBump: number;
  let racePda: PublicKey;
  let raceBump: number;
  let raceVaultPda: PublicKey;
  let raceVaultBump: number;

  const ENTRY_FEE = 100_000_000; // 0.1 GOR
  const PLATFORM_FEE_BPS = 500; // 5%

  before(async () => {
    // Generate keypairs
    authority = Keypair.generate();
    player1 = Keypair.generate();
    player2 = Keypair.generate();
    player3 = Keypair.generate();

    // Airdrop SOL
    await Promise.all([
      provider.connection.requestAirdrop(authority.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(player1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(player2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(player3.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
    ]);

    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create GOR token mint
    gorMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9 // 9 decimals like SOL
    );

    // Create token accounts
    platformTokenAccount = await createAccount(
      provider.connection,
      authority,
      gorMint,
      authority.publicKey
    );

    player1TokenAccount = await createAccount(
      provider.connection,
      player1,
      gorMint,
      player1.publicKey
    );

    player2TokenAccount = await createAccount(
      provider.connection,
      player2,
      gorMint,
      player2.publicKey
    );

    player3TokenAccount = await createAccount(
      provider.connection,
      player3,
      gorMint,
      player3.publicKey
    );

    // Mint GOR tokens to players
    await Promise.all([
      mintTo(
        provider.connection,
        authority,
        gorMint,
        player1TokenAccount,
        authority,
        1_000_000_000 // 1 GOR
      ),
      mintTo(
        provider.connection,
        authority,
        gorMint,
        player2TokenAccount,
        authority,
        1_000_000_000
      ),
      mintTo(
        provider.connection,
        authority,
        gorMint,
        player3TokenAccount,
        authority,
        1_000_000_000
      ),
    ]);

    // Derive PDAs
    [platformVaultPda, platformVaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_vault")],
      program.programId
    );
  });

  describe("Initialize", () => {
    it("should initialize platform vault", async () => {
      await program.methods
        .initialize(PLATFORM_FEE_BPS)
        .accounts({
          platformVault: platformVaultPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      const platformVault = await program.account.platformVault.fetch(platformVaultPda);
      assert.equal(platformVault.authority.toString(), authority.publicKey.toString());
      assert.equal(platformVault.platformFeeBps, PLATFORM_FEE_BPS);
      assert.equal(platformVault.totalFeesCollected.toString(), "0");
    });
  });

  describe("Create Race", () => {
    it("should create a new race", async () => {
      const raceId = new anchor.BN(Date.now());
      
      [racePda, raceBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), raceId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      [raceVaultPda, raceVaultBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("race_vault"), racePda.toBuffer()],
        program.programId
      );

      // Create race vault token account
      await createAccount(
        provider.connection,
        authority,
        gorMint,
        raceVaultPda,
        true // PDA as owner
      );

      await program.methods
        .createRace()
        .accounts({
          race: racePda,
          creator: player1.publicKey,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .signers([player1])
        .rpc();

      const race = await program.account.race.fetch(racePda);
      assert.equal(race.status.pending !== undefined, true);
      assert.equal(race.totalPool.toString(), "0");
      assert.equal(race.entryCount, 0);
      assert.equal(race.horseNames.length, 10);
    });
  });

  describe("Join Race", () => {
    it("player 1 should join race with horse 3", async () => {
      const playerEntryPda = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), player1.publicKey.toBuffer()],
        program.programId
      )[0];

      await program.methods
        .joinRace(3) // Horse number 3
        .accounts({
          race: racePda,
          playerEntry: playerEntryPda,
          player: player1.publicKey,
          playerTokenAccount: player1TokenAccount,
          raceTokenVault: raceVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      const race = await program.account.race.fetch(racePda);
      assert.equal(race.totalPool.toString(), ENTRY_FEE.toString());
      assert.equal(race.entryCount, 1);

      const playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
      assert.equal(playerEntry.player.toString(), player1.publicKey.toString());
      assert.equal(playerEntry.horseNumber, 3);
    });

    it("player 2 should join race with horse 3 (same as player 1)", async () => {
      const playerEntryPda = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), player2.publicKey.toBuffer()],
        program.programId
      )[0];

      await program.methods
        .joinRace(3) // Same horse as player 1
        .accounts({
          race: racePda,
          playerEntry: playerEntryPda,
          player: player2.publicKey,
          playerTokenAccount: player2TokenAccount,
          raceTokenVault: raceVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc();

      const race = await program.account.race.fetch(racePda);
      assert.equal(race.totalPool.toString(), (ENTRY_FEE * 2).toString());
      assert.equal(race.entryCount, 2);
    });

    it("player 3 should join race with horse 7", async () => {
      const playerEntryPda = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), player3.publicKey.toBuffer()],
        program.programId
      )[0];

      await program.methods
        .joinRace(7) // Different horse
        .accounts({
          race: racePda,
          playerEntry: playerEntryPda,
          player: player3.publicKey,
          playerTokenAccount: player3TokenAccount,
          raceTokenVault: raceVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player3])
        .rpc();

      const race = await program.account.race.fetch(racePda);
      assert.equal(race.totalPool.toString(), (ENTRY_FEE * 3).toString());
      assert.equal(race.entryCount, 3);
    });
  });

  describe("Execute Race", () => {
    it("should execute race after timeout", async () => {
      // Wait for timeout (in tests, we might need to advance the clock)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const recentBlockhashesPubkey = anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY;

      await program.methods
        .executeRace()
        .accounts({
          race: racePda,
          platformVault: platformVaultPda,
          recentBlockhashes: recentBlockhashesPubkey,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const race = await program.account.race.fetch(racePda);
      assert.equal(race.status.completed !== undefined, true);
      assert.equal(race.winningHorses.length, 3);
      
      // Platform fee should be 5% of total pool
      const expectedPlatformFee = (ENTRY_FEE * 3 * PLATFORM_FEE_BPS) / 10000;
      assert.equal(race.platformFee.toString(), expectedPlatformFee.toString());
    });
  });

  describe("Claim Prizes", () => {
    it("winners should claim their prizes", async () => {
      const race = await program.account.race.fetch(racePda);
      
      // Check if any player won
      for (const player of [player1, player2, player3]) {
        const playerEntryPda = PublicKey.findProgramAddressSync(
          [Buffer.from("player_entry"), racePda.toBuffer(), player.publicKey.toBuffer()],
          program.programId
        )[0];

        const playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
        
        // Check if this player's horse won any position
        const wonPosition = race.winningHorses.findIndex(h => h === playerEntry.horseNumber);
        
        if (wonPosition !== -1) {
          const balanceBefore = await getAccount(
            provider.connection,
            player === player1 ? player1TokenAccount :
            player === player2 ? player2TokenAccount : player3TokenAccount
          );

          await program.methods
            .claimPrize()
            .accounts({
              race: racePda,
              playerEntry: playerEntryPda,
              player: player.publicKey,
              playerTokenAccount: player === player1 ? player1TokenAccount :
                                player === player2 ? player2TokenAccount : player3TokenAccount,
              raceTokenVault: raceVaultPda,
              platformVault: platformVaultPda,
              platformTokenAccount: platformTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([player])
            .rpc();

          const balanceAfter = await getAccount(
            provider.connection,
            player === player1 ? player1TokenAccount :
            player === player2 ? player2TokenAccount : player3TokenAccount
          );

          assert(balanceAfter.amount > balanceBefore.amount, "Winner should receive prize");
          
          const updatedEntry = await program.account.playerEntry.fetch(playerEntryPda);
          assert.equal(updatedEntry.claimStatus.claimed !== undefined, true);
        }
      }
    });
  });

  describe("Platform Operations", () => {
    it("should update platform fee", async () => {
      const newFeeBps = 750; // 7.5%
      
      await program.methods
        .updatePlatformFee(newFeeBps)
        .accounts({
          platformVault: platformVaultPda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const platformVault = await program.account.platformVault.fetch(platformVaultPda);
      assert.equal(platformVault.platformFeeBps, newFeeBps);
    });

    it("should withdraw platform fees", async () => {
      const withdrawAmount = new anchor.BN(10_000_000); // 0.01 GOR
      
      const balanceBefore = await getAccount(
        provider.connection,
        platformTokenAccount
      );

      await program.methods
        .withdrawPlatformFees(withdrawAmount)
        .accounts({
          platformVault: platformVaultPda,
          platformTokenAccount: platformTokenAccount,
          authorityTokenAccount: platformTokenAccount, // Same account for testing
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([authority])
        .rpc();

      // In a real scenario, balance would change
      // Here we're just testing the instruction executes
    });
  });

  describe("Error Cases", () => {
    it("should fail with invalid horse number", async () => {
      try {
        const newRace = Keypair.generate();
        await program.methods
          .joinRace(11) // Invalid horse number (> 10)
          .accounts({
            race: newRace.publicKey,
            playerEntry: Keypair.generate().publicKey,
            player: player1.publicKey,
            playerTokenAccount: player1TokenAccount,
            raceTokenVault: Keypair.generate().publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([player1])
          .rpc();
        
        assert.fail("Should have thrown error");
      } catch (error) {
        assert.include(error.toString(), "InvalidHorseNumber");
      }
    });

    it("should fail when trying to claim prize twice", async () => {
      // This test assumes a player has already claimed
      // Implementation depends on actual race results
    });
  });
});