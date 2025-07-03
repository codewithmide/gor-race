import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import { PublicKey, Keypair, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { assert } from "chai";
import * as dotenv from "dotenv";
import bs58 from "bs58";

// Load environment variables from .env file
dotenv.config();

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

  // PDAs
  let platformVaultPda: PublicKey;
  let racePda: PublicKey;
  let raceVaultPda: PublicKey;
  let player1ProfilePda: PublicKey;
  let player2ProfilePda: PublicKey;
  let player3ProfilePda: PublicKey;

  // Test data
  let raceId: number;
  let referralCode: string;
  const ENTRY_FEE = 100_000_000; // 0.1 GOR in lamports
  const PLATFORM_FEE_BPS = 500; // 5%

  before(async () => {
    // Use your local wallet as authority
    authority = (provider.wallet as anchor.Wallet).payer;
    
    // Use wallets with $GOR tokens
    player1 = Keypair.fromSecretKey(bs58.decode("2dCvRVJtJekan2S89u7Eyd5ZMn4HhJyZswpZBS5zztWL2k2eWAVj2eMV8Vjjo8Gc6YnFLLvQtuoeHmf2upU9xjNc"));
    player2 = Keypair.fromSecretKey(bs58.decode("ct5TgRvKVcG8wh69b5Qq9XXNmrxSXz4tAvvcXjjaiv6uzaR1brN5aniu7HELxyEDr5hN3m438kcumQ1dL8o8AE4"));
    player3 = Keypair.fromSecretKey(bs58.decode("2hx7kAwmsdZpcNZh2TaBtNQx2wy81g9qKZz63faBGBndubu5Y6d3duqBarmdBVutXu7T5AeiEKpULbNmvAt1msSJ"));

    // Check balances
    console.log("Authority balance:", await provider.connection.getBalance(authority.publicKey));
    console.log("Player1 balance:", await provider.connection.getBalance(player1.publicKey));
    console.log("Player2 balance:", await provider.connection.getBalance(player2.publicKey));
    console.log("Player3 balance:", await provider.connection.getBalance(player3.publicKey));

    // Derive PDAs
    [platformVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_vault")],
      program.programId
    );

    [player1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_profile"), player1.publicKey.toBuffer()],
      program.programId
    );

    [player2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_profile"), player2.publicKey.toBuffer()],
      program.programId
    );

    [player3ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_profile"), player3.publicKey.toBuffer()],
      program.programId
    );

    // Generate race ID and derive related PDAs with random component
    raceId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
    [racePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("race"), new anchor.BN(raceId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [raceVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("race_vault"), racePda.toBuffer()],
      program.programId
    );

    // Generate referral code for testing
    referralCode = generateReferralCode(raceId);
  });

  describe("Platform Initialization", () => {
    it("should initialize platform vault or skip if exists", async () => {
      try {
        await program.methods
          .initialize(PLATFORM_FEE_BPS)
          .accounts({
            platformVault: platformVaultPda,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc();
        console.log("Platform vault initialized successfully");
      } catch (error) {
        if (error.toString().includes("already in use")) {
          console.log("Platform vault already exists, skipping initialization");
        } else {
          throw error;
        }
      }

      const platformVault = await program.account.platformVault.fetch(platformVaultPda);
      assert.equal(platformVault.authority.toString(), authority.publicKey.toString());
      // Platform fee might have been updated in previous tests, so we just verify it exists
      console.log("Platform vault fee BPS:", platformVault.platformFeeBps);
      console.log("Platform vault total fees collected:", platformVault.totalFeesCollected.toString());
    });
  });

  describe("Player Profile Management", () => {
    it("should create player profiles with usernames or skip if exists", async () => {
      // Try to create profiles for all players, skip if already exists
      try {
        await program.methods
          .createProfile("SpeedDemon")
          .accounts({
            playerProfile: player1ProfilePda,
            player: player1.publicKey,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .signers([player1])
          .rpc();
        console.log("Player1 profile created successfully");
      } catch (error) {
        if (error.toString().includes("already in use")) {
          console.log("Player1 profile already exists, skipping creation");
        } else {
          throw error;
        }
      }

      try {
        await program.methods
          .createProfile("CryptoJockey")
          .accounts({
            playerProfile: player2ProfilePda,
            player: player2.publicKey,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .signers([player2])
          .rpc();
        console.log("Player2 profile created successfully");
      } catch (error) {
        if (error.toString().includes("already in use")) {
          console.log("Player2 profile already exists, skipping creation");
        } else {
          throw error;
        }
      }

      try {
        await program.methods
          .createProfile("HorseRacer123")
          .accounts({
            playerProfile: player3ProfilePda,
            player: player3.publicKey,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .signers([player3])
          .rpc();
        console.log("Player3 profile created successfully");
      } catch (error) {
        if (error.toString().includes("already in use")) {
          console.log("Player3 profile already exists, skipping creation");
        } else {
          throw error;
        }
      }

      // Verify profiles were created correctly
      const profile1 = await program.account.playerProfile.fetch(player1ProfilePda);
      assert.equal(profile1.username, "SpeedDemon");
      assert.equal(profile1.player.toString(), player1.publicKey.toString());
      assert.equal(profile1.totalRaces, 0);
      assert.equal(profile1.totalWins, 0);
      assert.equal(profile1.totalPodiums, 0);
      assert.equal(profile1.totalEarnings.toString(), "0");

      const profile2 = await program.account.playerProfile.fetch(player2ProfilePda);
      assert.equal(profile2.username, "CryptoJockey");
      
      const profile3 = await program.account.playerProfile.fetch(player3ProfilePda);
      assert.equal(profile3.username, "HorseRacer123");
    });

    it("should fail to create profile with invalid username", async () => {
      const invalidPlayer = Keypair.generate();
      // TODO: Use a wallet with $GOR tokens instead of airdrop
      // await provider.connection.requestAirdrop(invalidPlayer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      // await new Promise(resolve => setTimeout(resolve, 1000));

      const [invalidProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_profile"), invalidPlayer.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createProfile("") // Empty username
          .accounts({
            playerProfile: invalidProfilePda,
            player: invalidPlayer.publicKey,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .signers([invalidPlayer])
          .rpc();
        
        assert.fail("Should have thrown error for empty username");
      } catch (error) {
        assert.include(error.toString(), "UsernameEmpty");
      }
    });
  });

  describe("Race Creation and Management", () => {
    it("should create a new race with referral code", async () => {
      const waitTime = 30; // 30 seconds wait time

      await program.methods
        .createRace(new anchor.BN(raceId), new anchor.BN(waitTime))
        .accounts({
          race: racePda,
          creator: player1.publicKey,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .signers([player1])
        .rpc();

      const race = await program.account.race.fetch(racePda);
      assert.equal(race.raceId.toString(), raceId.toString());
      assert.equal(race.creator.toString(), player1.publicKey.toString());
      assert.equal(race.waitTime.toString(), waitTime.toString());
      assert.equal(race.referralCode, referralCode);
      assert.equal(race.entryCount, 0);
      assert.equal(race.totalPool.toString(), "0");
      assert.equal(race.horseNames.length, 10);
      assert.equal(Object.keys(race.status)[0], "pending");
    });
  });

  describe("Race Participation", () => {
    it("should allow players to join race using referral code", async () => {
      // Player 1 joins with horse 3
      const [player1EntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), player1.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .joinRace(3, referralCode)
        .accounts({
          race: racePda,
          playerEntry: player1EntryPda,
          player: player1.publicKey,
          raceVault: raceVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      // Player 2 joins with horse 5
      const [player2EntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), player2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .joinRace(5, referralCode)
        .accounts({
          race: racePda,
          playerEntry: player2EntryPda,
          player: player2.publicKey,
          raceVault: raceVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc();

      // Player 3 joins with horse 7
      const [player3EntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), player3.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .joinRace(7, referralCode)
        .accounts({
          race: racePda,
          playerEntry: player3EntryPda,
          player: player3.publicKey,
          raceVault: raceVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([player3])
        .rpc();

      // Verify race state
      const race = await program.account.race.fetch(racePda);
      assert.equal(race.entryCount, 3);
      assert.equal(race.totalPool.toString(), (ENTRY_FEE * 3).toString());

      // Verify player entries
      const entry1 = await program.account.playerEntry.fetch(player1EntryPda);
      assert.equal(entry1.horseNumber, 3);
      assert.equal(entry1.statsUpdated, false);
      assert.equal(Object.keys(entry1.claimStatus)[0], "unclaimed");

      const entry2 = await program.account.playerEntry.fetch(player2EntryPda);
      assert.equal(entry2.horseNumber, 5);

      const entry3 = await program.account.playerEntry.fetch(player3EntryPda);
      assert.equal(entry3.horseNumber, 7);
    });

    it("should fail to join with invalid referral code", async () => {
      const newPlayer = Keypair.generate();
      // TODO: Use a wallet with $GOR tokens instead of airdrop
      // await provider.connection.requestAirdrop(newPlayer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      // await new Promise(resolve => setTimeout(resolve, 1000));

      const [newPlayerEntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), newPlayer.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .joinRace(1, "INVALID1") // Invalid referral code
          .accounts({
            race: racePda,
            playerEntry: newPlayerEntryPda,
            player: newPlayer.publicKey,
            raceVault: raceVaultPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([newPlayer])
          .rpc();
        
        assert.fail("Should have thrown error for invalid referral code");
      } catch (error) {
        assert.include(error.toString(), "InvalidReferralCode");
      }
    });
  });

  describe("Race Execution", () => {
    it("should execute race in two phases", async () => {
      // Wait for wait time to expire (30 seconds + buffer)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Phase 1: Start race simulation
      await program.methods
        .executeRace()
        .accounts({
          race: racePda,
          raceVault: raceVaultPda,
          platformVault: platformVaultPda,
          recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          clock: SYSVAR_CLOCK_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      let race = await program.account.race.fetch(racePda);
      assert.equal(Object.keys(race.status)[0], "racing");
      assert.isNotNull(race.raceStartTime);

      // Wait for race simulation to complete (60 seconds + buffer)
      // In testing, we'll use a shorter wait to speed up tests
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Phase 2: Complete race and determine winners
      await program.methods
        .executeRace()
        .accounts({
          race: racePda,
          raceVault: raceVaultPda,
          platformVault: platformVaultPda,
          recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          clock: SYSVAR_CLOCK_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      race = await program.account.race.fetch(racePda);
      assert.equal(Object.keys(race.status)[0], "completed");
      assert.equal(race.winningHorses.length, 3);
      assert.isNotNull(race.endTime);
      
      // Verify platform fee calculation
      const expectedPlatformFee = (ENTRY_FEE * 3 * PLATFORM_FEE_BPS) / 10000;
      assert.equal(race.platformFee.toString(), expectedPlatformFee.toString());
    });
  });

  describe("Prize Claiming", () => {
    it("should allow winners to claim prizes", async () => {
      const race = await program.account.race.fetch(racePda);
      const winningHorses = race.winningHorses;

      // Check each player to see if they won
      const players = [player1, player2, player3];
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const [playerEntryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("player_entry"), racePda.toBuffer(), player.publicKey.toBuffer()],
          program.programId
        );

        const playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
        const wonPosition = winningHorses.findIndex(h => h === playerEntry.horseNumber);

        if (wonPosition !== -1) {
          // Player won, try to claim prize
          const balanceBefore = await provider.connection.getBalance(player.publicKey);

          await program.methods
            .claimPrize()
            .accounts({
              race: racePda,
              playerEntry: playerEntryPda,
              player: player.publicKey,
              raceVault: raceVaultPda,
              platformVault: platformVaultPda,
              systemProgram: SystemProgram.programId,
            })
            .signers([player])
            .rpc();

          const balanceAfter = await provider.connection.getBalance(player.publicKey);
          const updatedEntry = await program.account.playerEntry.fetch(playerEntryPda);

          assert(balanceAfter > balanceBefore, "Winner should receive prize");
          assert.equal(Object.keys(updatedEntry.claimStatus)[0], "claimed");
          assert(updatedEntry.prizeAmount.gt(new anchor.BN(0)), "Prize amount should be > 0");
        }
      }
    });

    it("should prevent double claiming", async () => {
      const race = await program.account.race.fetch(racePda);
      const winningHorses = race.winningHorses;

      // Find a winner to test double claiming
      for (const player of [player1, player2, player3]) {
        const [playerEntryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("player_entry"), racePda.toBuffer(), player.publicKey.toBuffer()],
          program.programId
        );

        const playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
        const wonPosition = winningHorses.findIndex(h => h === playerEntry.horseNumber);

        if (wonPosition !== -1 && Object.keys(playerEntry.claimStatus)[0] === "claimed") {
          try {
            await program.methods
              .claimPrize()
              .accounts({
                race: racePda,
                playerEntry: playerEntryPda,
                player: player.publicKey,
                raceVault: raceVaultPda,
                platformVault: platformVaultPda,
                systemProgram: SystemProgram.programId,
              })
              .signers([player])
              .rpc();
            
            assert.fail("Should have prevented double claiming");
          } catch (error) {
            assert.include(error.toString(), "AlreadyClaimed");
          }
          break;
        }
      }
    });
  });

  describe("Statistics Update", () => {
    it("should update player statistics after race completion", async () => {
      const race = await program.account.race.fetch(racePda);

      // Update stats for all players
      for (const player of [player1, player2, player3]) {
        const [playerEntryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("player_entry"), racePda.toBuffer(), player.publicKey.toBuffer()],
          program.programId
        );

        const [playerProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("player_profile"), player.publicKey.toBuffer()],
          program.programId
        );

        const profileBefore = await program.account.playerProfile.fetch(playerProfilePda);

        await program.methods
          .updateStats()
          .accounts({
            playerProfile: playerProfilePda,
            race: racePda,
            playerEntry: playerEntryPda,
            player: player.publicKey,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();

        const profileAfter = await program.account.playerProfile.fetch(playerProfilePda);
        const updatedEntry = await program.account.playerEntry.fetch(playerEntryPda);

        // Verify stats were updated
        assert.equal(profileAfter.totalRaces, profileBefore.totalRaces + 1);
        assert.equal(updatedEntry.statsUpdated, true);

        // Check if player won and stats reflect that
        const playerEntry = await program.account.playerEntry.fetch(playerEntryPda);
        const wonPosition = race.winningHorses.findIndex(h => h === playerEntry.horseNumber);

        if (wonPosition !== -1) {
          assert(profileAfter.totalPodiums > profileBefore.totalPodiums, "Podium count should increase");
          if (wonPosition === 0) {
            assert(profileAfter.totalWins > profileBefore.totalWins, "Win count should increase for 1st place");
          }
          if (playerEntry.prizeAmount.gt(new anchor.BN(0))) {
            assert(profileAfter.totalEarnings.gt(profileBefore.totalEarnings), "Earnings should increase");
          }
        }
      }
    });

    it("should prevent duplicate stats updates", async () => {
      const [player1EntryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_entry"), racePda.toBuffer(), player1.publicKey.toBuffer()],
        program.programId
      );

      // Try to update stats again (should be idempotent)
      await program.methods
        .updateStats()
        .accounts({
          playerProfile: player1ProfilePda,
          race: racePda,
          playerEntry: player1EntryPda,
          player: player1.publicKey,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      // Should complete without error but not change stats
      const entry = await program.account.playerEntry.fetch(player1EntryPda);
      assert.equal(entry.statsUpdated, true);
    });
  });

  describe("Platform Administration", () => {
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
      const withdrawAmount = new anchor.BN(1_000_000); // 0.001 GOR

      await program.methods
        .withdrawPlatformFees(withdrawAmount)
        .accounts({
          platformVault: platformVaultPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      // Test passes if no error is thrown
    });
  });

  describe("Error Cases", () => {
    it("should fail with invalid horse number", async () => {
      const newRaceId = Math.floor(Date.now() / 1000) + 1000;
      const [newRacePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("race"), new anchor.BN(newRaceId).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      try {
        const [playerEntryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("player_entry"), newRacePda.toBuffer(), player1.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .joinRace(11, "TESTCODE") // Invalid horse number (> 10)
          .accounts({
            race: newRacePda,
            playerEntry: playerEntryPda,
            player: player1.publicKey,
            raceVault: PublicKey.default,
            systemProgram: SystemProgram.programId,
          })
          .signers([player1])
          .rpc();
        
        assert.fail("Should have thrown error");
      } catch (error) {
        assert.include(error.toString(), "InvalidHorseNumber");
      }
    });

    it("should fail to create duplicate profile", async () => {
      try {
        await program.methods
          .createProfile("DuplicateUser")
          .accounts({
            playerProfile: player1ProfilePda,
            player: player1.publicKey,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .signers([player1])
          .rpc();
        
        assert.fail("Should have thrown error for duplicate profile");
      } catch (error) {
        // Should fail because account already exists
        assert.include(error.toString(), "already in use");
      }
    });
  });
});

// Helper function to generate referral code from race ID
function generateReferralCode(raceId: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  let remaining = raceId;
  
  for (let i = 0; i < 8; i++) {
    code += chars[remaining % 36];
    remaining = Math.floor(remaining / 36);
  }
  
  return code;
}