use anchor_lang::prelude::*;

pub const MAX_HORSES: usize = 10;
pub const ENTRY_FEE: u64 = 100_000_000; 
pub const RACE_TIMEOUT_SECONDS: i64 = 60;
pub const PLATFORM_FEE_BPS: u16 = 500; // 5%
pub const MAX_ENTRIES: usize = 100;

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