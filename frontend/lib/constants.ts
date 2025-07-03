import { PublicKey } from '@solana/web3.js';

// Program constants
export const PROGRAM_ID = new PublicKey("2Xov1MEbY8DdK3MDci83RDJmAK1SHJxg4HtoiCLcBUen");
export const RPC_ENDPOINT = "https://rpc.gorbagana.wtf";

// Game constants
export const ENTRY_FEE = 100_000_000; // 0.1 GOR in lamports
export const NUM_HORSES = 10;
export const RACE_DURATION = 60; // seconds

// Horse names with cowboy theme
export const HORSE_NAMES = [
  "Thunder Stallion", "Desert Wind", "Midnight Maverick", "Golden Lasso",
  "Wild Spirit", "Dusty Trail", "Lightning Buck", "Prairie Fire", 
  "Silver Bullet", "Iron Horse"
];

// Cowboy-themed messages
export const COWBOY_MESSAGES = {
  welcome: "Howdy, Partner! Ready to rustle up some winnings?",
  connecting: "Saddling up your wallet...",
  creating: "Building the corral...",
  joining: "Mounting your steed...",
  racing: "And they're off! Dust is flying!",
  winner: "Yeehaw! You struck gold!",
  loser: "Better luck next time, cowpoke!",
  noWallet: "You'll need a trusty wallet to ride with us, partner!",
};