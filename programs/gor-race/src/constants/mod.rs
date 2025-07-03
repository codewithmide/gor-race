use anchor_lang::prelude::*;

pub const MAX_HORSES: usize = 10;
pub const ENTRY_FEE: u64 = 100_000_000; 
pub const DEFAULT_WAIT_TIME: i64 = 60; // 60 seconds default
pub const MIN_WAIT_TIME: i64 = 30; // 30 seconds minimum
pub const MAX_WAIT_TIME: i64 = 180; // 3 minutes maximum
pub const RACE_DURATION: i64 = 60; // 1 minute race simulation
pub const MIN_PLAYERS_TO_START: u32 = 1; // Minimum 1 players to start race
pub const PLATFORM_FEE_BPS: u16 = 500; // 5%
pub const MAX_PLAYERS_PER_RACE: u32 = 100;

pub const PLATFORM_VAULT_SEED: &[u8] = b"platform_vault";
pub const RACE_SEED: &[u8] = b"race";
pub const PLAYER_ENTRY_SEED: &[u8] = b"player_entry";
pub const RACE_VAULT_SEED: &[u8] = b"race_vault";

pub const PRIZE_DISTRIBUTION: [u16; 3] = [5000, 3000, 1500]; // 50%, 30%, 15% in basis points

pub const HORSE_NAME_POOL: [&str; 30] = [
    "Bonk", "Samo", "Orca", "Raydium", "Marinade",
    "Serum", "Mango", "Drift", "Jupiter", "Phantom",
    "Solend", "Saber", "Mercurial", "Tulip", "Francium",
    "Port", "Oxygen", "Bonfida", "Step", "Grape",
    "Sunny", "Quarry", "Aldrin", "Cyclos", "Lifinity",
    "Hubble", "Kamino", "Marginfi", "Cypher", "Zeta"
];