# GOR Race - Solana Horse Racing Betting Game

A decentralized horse racing betting game built on Solana using Anchor framework, deployed on Gorbagana testnet.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Setup](#setup)
- [Deployment](#deployment)
- [Usage](#usage)
- [Testing](#testing)

## 🏇 Overview

GOR Race is a dynamic horse racing betting game where players can bet on horses using GOR tokens. The game features automatic race execution, fair prize distribution, and on-chain randomness for race results.

## ✨ Features

- **Dynamic Participation**: Unlimited players can join races
- **10 Horse Selection**: Choose from 10 randomly named horses per race
- **Entry Fee**: 0.1 GOR tokens per entry
- **Prize Distribution**:
  - 1st place: 50% of pool
  - 2nd place: 30% of pool
  - 3rd place: 15% of pool
- **Platform Fee**: 5% to platform vault
- **Automatic Race Start**: Races begin 60 seconds after first entry
- **Fair Prize Splitting**: Multiple winners share prizes equally

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
3. **PlayerEntry**: Individual player's race entry
4. **TokenVault**: Holds race entry fees until distribution

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
