# 🏇 GOR Race - Solana Horse Racing Game

A decentralized horse racing betting game built on Solana where players can create races, join with referral codes, and compete for prizes using native GOR tokens.

## 🎯 Overview

GOR Race is a blockchain-based horse racing simulation where:

- Anyone can create races with configurable wait times
- Players join races using unique referral codes
- Races have a two-phase system: joining period + 60-second race simulation
- Winners are determined randomly and can claim their prizes
- Platform takes a 5% fee from the total pool
- Players can create profiles with usernames and track their statistics
- Comprehensive leaderboard system ranks players by various metrics

## 🏗️ System Architecture

### Race Lifecycle

1. **Profile Creation**: Players create profiles with usernames for leaderboard tracking
2. **Race Creation**: Race creator sets wait time (30-180 seconds) and receives a referral code
3. **Joining**: Players use referral codes to join races and select horses (1-10)
4. **Execution Phase 1**: After wait time expires, race simulation begins (60 seconds)
5. **Execution Phase 2**: Race completes, winners are determined
6. **Prize Claiming**: Winners can claim their share of the prize pool
7. **Stats Update**: Players update their statistics for leaderboard tracking

### Race States

- **Pending**: Waiting for players to join
- **Racing**: 60-second race simulation in progress
- **Completed**: Race finished, prizes available
- **Cancelled**: Not enough players joined (minimum 1 player required)

## 🚀 Quick Start

### Prerequisites

- Node.js and npm installed
- Solana CLI configured
- Anchor framework installed
- Wallet with GOR tokens on the GOR network

### Installation

```bash
git clone <repository-url>
cd gor-race
npm install
```

### Environment Setup

```bash
# Set your Solana cluster
export ANCHOR_PROVIDER_URL="https://rpc.gorbagana.wtf"
export ANCHOR_WALLET="~/.config/solana/id.json"
```

### Build and Deploy

```bash
# Build the program
npm run build

# Deploy to GOR network
npm run deploy

# Initialize the platform (one-time setup)
npm run initialize
```

## 🎮 Commands Reference

### 👤 Player Profile Management

#### Create Profile

Create a player profile with a username for leaderboard tracking.

```bash
# Create profile with username
npm run create-profile HorseRacer123
npm run create-profile CryptoJockey
npm run create-profile SpeedDemon
```

**Requirements:**
- Username must be unique per wallet
- Max 32 characters
- Only letters, numbers, underscore (_), dash (-), and dot (.) allowed
- Cannot be empty

**Output:**
- Profile creation confirmation
- Profile details display
- Next steps guidance

---

#### View Profile

View your own profile or another player's profile.

```bash
# View your own profile
npm run profile

# View another player's profile by wallet address
npm run profile <PLAYER_WALLET_ADDRESS>
```

**Output:**
- Username and basic info
- Race statistics (races, wins, podiums, earnings)
- Performance metrics (win rate, podium rate)
- Achievements and rankings
- Comparison with other players

---

### 🏆 Leaderboard

View the leaderboard with various sorting options.

```bash
# Default leaderboard (sorted by score, top 10)
npm run leaderboard

# Sort by different metrics
npm run leaderboard wins       # Sort by total wins
npm run leaderboard races      # Sort by total races
npm run leaderboard earnings   # Sort by total earnings
npm run leaderboard winrate    # Sort by win percentage
npm run leaderboard podiums    # Sort by podium finishes

# Specify number of players to show
npm run leaderboard score 20   # Top 20 by score
npm run leaderboard wins 5     # Top 5 by wins
```

**Sorting Options:**
- `score` (default): Weighted ranking considering wins, podiums, and consistency
- `wins`: Total number of 1st place finishes
- `races`: Total number of races participated
- `earnings`: Total GOR earned from prizes
- `winrate`: Win percentage (wins/races)
- `podiums`: Total podium finishes (1st, 2nd, 3rd)

**Output:**
- Ranked list of players with statistics
- Performance metrics for each player
- Total player counts and activity stats

---

### 📊 Update Statistics

Update your player statistics after completing a race.

```bash
# Update stats using referral code
npm run update-stats XYVSYS00

# Update stats using race ID
npm run update-stats 1751510633
```

**Requirements:**
- Must have participated in the race
- Race must be completed
- Player profile must exist

**Output:**
- Race results display
- Statistics update confirmation
- Updated player statistics

---

### 🏁 Create Race

Create a new horse race with configurable wait time.

```bash
# Create race with default wait time (60 seconds)
npm run create-race

# Create race with custom wait time (30-180 seconds)
npm run create-race 90
npm run create-race 120
npm run create-race 180
```

**Output:**

- Race ID and PDAs
- Unique 8-character referral code (e.g., `XYVSYS00`)
- Race details (horses, timing, max players)

**Parameters:**

- `wait_time` (optional): 30-180 seconds, defaults to 60

---

### 🐎 Join Race

Join an existing race using its referral code.

```bash
# Join race with referral code, select horse 1-10
npm run join-race XYVSYS00 3
npm run join-race R3ZSYS00 7

# Default to horse 1 if not specified
npm run join-race XYVSYS00
```

**Requirements:**

- Valid referral code (8 characters)
- Horse number 1-10
- 0.1 GOR entry fee
- Race must be in `Pending` status
- Race must not be full (max 100 players)

**Output:**

- Confirmation of race joining
- Selected horse information
- Updated race statistics

---

### 🏃 Execute Race

Execute race transitions - from joining to racing, and from racing to completed.

```bash
# Execute using referral code
npm run execute-race XYVSYS00

# Execute using race ID
npm run execute-race 1751510633
```

**Two-Phase Execution:**

**Phase 1: Start Race Simulation**

- Triggered when wait time expires + minimum 1 player joined
- Changes status from `Pending` → `Racing`
- Begins 60-second race simulation

**Phase 2: Complete Race**

- Triggered after 60-second simulation completes
- Changes status from `Racing` → `Completed`
- Determines winners and distributes prizes

**Output:**

- Race status updates
- Timing information
- Winner announcements (in Phase 2)

---

### 🏆 Claim Prize

Claim winnings after race completion.

```bash
# Claim using referral code
npm run claim-prize XYVSYS00

# Claim using race ID
npm run claim-prize 1751510633
```

**Requirements:**

- Race must be completed
- Player must have participated in the race
- Player's horse must have won (1st, 2nd, or 3rd place)
- Prize not already claimed

**Prize Distribution:**

- 🥇 1st Place: 50% of total pool
- 🥈 2nd Place: 30% of total pool  
- 🥉 3rd Place: 15% of total pool
- Platform Fee: 5% of total pool

**Output for Winners:**

- Race results display
- Prize amount
- Transaction confirmation
- Updated GOR balance

**Output for Non-Winners:**

- Race results with all horses
- Encouraging message
- Tips for future races

---

### 🔧 Utility Commands

```bash
# Player Management
npm run create-profile <USERNAME>    # Create player profile
npm run profile [PLAYER_ADDRESS]     # View profile
npm run leaderboard [SORT] [LIMIT]   # View leaderboard
npm run update-stats <RACE_REF>      # Update race statistics

# Race Management  
npm run create-race [WAIT_TIME]      # Create new race
npm run join-race <CODE> [HORSE]     # Join race
npm run execute-race <RACE_REF>      # Execute race
npm run claim-prize <RACE_REF>       # Claim winnings

# Development
npm run build                        # Build program
npm run deploy                       # Deploy program
npm run initialize                   # Initialize platform (one-time)
npm run clean                        # Clean build artifacts
npm run test                         # Run tests
npm run lint                         # Lint code
```

## 🏗️ Architecture

### Folder Structure

```
gor-race/
├── programs/
│   └── gor-race/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── state/
│       │   │   ├── mod.rs
│       │   │   ├── race.rs
│       │   │   ├── player_entry.rs
│       │   │   └── platform_vault.rs
│       │   ├── instructions/
│       │   │   ├── mod.rs
│       │   │   ├── initialize.rs
│       │   │   ├── create_race.rs
│       │   │   ├── join_race.rs
│       │   │   ├── execute_race.rs
│       │   │   └── claim_prize.rs
│       │   ├── errors/
│       │   │   └── mod.rs
│       │   ├── constants/
│       │   │   └── mod.rs
│       │   └── utils/
│       │       ├── mod.rs
│       │       └── random.rs
│       ├── Cargo.toml
│       └── Xargo.toml
├── tests/
│   └── gor-race.ts
├── migrations/
│   └── deploy.ts
├── Anchor.toml
├── Cargo.toml
├── package.json
├── tsconfig.json
└── README.md
```

### Program Accounts

1. **PlatformVault**: Stores platform configuration and fee collection
2. **Race**: Stores race state, participants, and results  
3. **PlayerEntry**: Individual player's race entry with stats tracking
4. **PlayerProfile**: Player's username and statistics for leaderboard
5. **TokenVault**: Holds race entry fees until distribution

### Leaderboard Scoring System

The leaderboard uses a weighted scoring system that considers multiple factors:

**Base Score Calculation:**
- 🥇 Wins: 10 points each
- 🏆 Podium finishes: 3 points each  
- 🎯 Race participation: 1 point each
- 💰 Earnings: 1 point per GOR earned

**Consistency Bonus:**
Players with 10+ races get additional multipliers based on win rate:
- 30%+ win rate: 1.5x multiplier
- 20%+ win rate: 1.3x multiplier  
- 10%+ win rate: 1.1x multiplier

This rewards both high performance and consistent participation.

## 🚀 Setup

### Prerequisites

- Rust 1.75.0+
- Solana CLI 1.17.0+
- Anchor CLI 0.29.0
- Node.js 18+
- Yarn or npm
- Existing Solana keypair with GOR tokens

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/gor-race.git
cd gor-race
```

2. **Install dependencies**

```bash
yarn install
```

3. **Build the program**

```bash
anchor build
```

4. **Configure Solana CLI for Gorbagana testnet**

```bash
solana config set --url https://rpc.gorbagana.wtf
```

5. **Use your existing keypair**

```bash
# Set your existing keypair as the default
solana config set --keypair ~/.config/solana/id.json
```

6. **Check GOR balance**

```bash
# GOR is the native token, check balance with:
solana balance
```

## 📦 Deployment

### 1. Update Anchor.toml

```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
gor_race = "YOUR_PROGRAM_ID"

[programs.testnet]
gor_race = "YOUR_PROGRAM_ID"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "https://rpc.gorbagana.wtf"
wallet = "~/.config/solana/gor-race.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 2. Deploy the program

```bash
# Set program keypair
anchor keys sync

# Deploy to Gorbagana testnet
anchor deploy --provider.cluster https://rpc.gorbagana.wtf

# Note the deployed program ID
```

### 3. Initialize platform vault

```bash
# Run initialization script
anchor run initialize
```

## 🎮 Usage

### Initialize Platform (Admin only)

```typescript
await program.methods
  .initialize(platformFeeBps)
  .accounts({
    platformVault: platformVaultPda,
    authority: authority.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([authority])
  .rpc();
```

### Create a Race

```typescript
await program.methods
  .createRace()
  .accounts({
    race: racePda,
    creator: creator.publicKey,
    systemProgram: SystemProgram.programId,
    clock: SYSVAR_CLOCK_PUBKEY,
  })
  .signers([creator])
  .rpc();
```

### Join a Race

```typescript
await program.methods
  .joinRace(horseNumber)
  .accounts({
    race: racePda,
    playerEntry: playerEntryPda,
    player: player.publicKey,
    playerTokenAccount: playerTokenAccount,
    raceTokenVault: raceTokenVault,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([player])
  .rpc();
```

### Execute Race (Automatic after 60 seconds)

```typescript
await program.methods
  .executeRace()
  .accounts({
    race: racePda,
    randomnessOracle: randomnessOracle,
    clock: SYSVAR_CLOCK_PUBKEY,
  })
  .rpc();
```

### Claim Prize

```typescript
await program.methods
  .claimPrize()
  .accounts({
    race: racePda,
    playerEntry: playerEntryPda,
    player: player.publicKey,
    playerTokenAccount: playerTokenAccount,
    raceTokenVault: raceTokenVault,
    platformVault: platformVaultPda,
    platformTokenAccount: platformTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([player])
  .rpc();
```

## 🧪 Testing

### Run all tests

```bash
anchor test --provider.cluster https://rpc.gorbagana.wtf
```

### Run specific test

```bash
anchor test --provider.cluster https://rpc.gorbagana.wtf -- --grep "should create race"
```

## 🔐 Security Considerations

1. **Randomness**: Uses on-chain randomness combining slot hashes and timestamps
2. **Reentrancy Protection**: State transitions prevent double claims
3. **Authority Checks**: Only authority can modify platform settings
4. **Overflow Protection**: Uses checked math operations
5. **Time-based Execution**: Races auto-execute after timeout

## 📊 Horse Names Pool

The program randomly selects 10 horses from this pool for each race:

- Bonk, Samo, Orca, Raydium, Marinade
- Serum, Mango, Drift, Jupiter, Phantom
- Solend, Saber, Mercurial, Tulip, Francium
- Port, Oxygen, Bonfida, Step, Grape
- Sunny, Quarry, Aldrin, Cyclos, Lifinity
- Hubble, Kamino, Marginfi, Cypher, Zeta

## 🛠️ Troubleshooting

### Common Issues

1. **Insufficient GOR tokens**
   - Ensure you have enough GOR for transactions and rent
   - Request from Gorbagana faucet

2. **Program deployment fails**
   - Check wallet balance
   - Verify RPC endpoint is correct
   - Ensure program size is within limits

3. **Transaction fails**
   - Check account ownership
   - Verify PDA derivation
   - Ensure proper token accounts exist

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues and questions:

- Open GitHub issue
- Join Gorbagana Discord
- Contact <team@gorbagana.wtf>
