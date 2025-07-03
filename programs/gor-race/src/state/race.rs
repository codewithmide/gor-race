use anchor_lang::prelude::*;
use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RaceStatus {
    Pending,    // Waiting for players to join
    Racing,     // Race simulation in progress (1 minute)
    Completed,  // Race finished, results available
    Cancelled,  // Not enough players
}

#[account]
pub struct Race {
    pub race_id: u64,
    pub creator: Pubkey,
    pub status: RaceStatus,
    pub horse_names: [String; MAX_HORSES],
    pub total_pool: u64,
    pub platform_fee: u64,
    pub entry_count: u32,
    pub max_players: u32,
    pub wait_time: i64, // in seconds
    pub referral_code: String,
    pub start_time: i64, // When race was created (for wait time)
    pub race_start_time: Option<i64>, // When actual race simulation begins
    pub end_time: Option<i64>,
    pub winning_horses: [u8; 3], // 1st, 2nd, 3rd place horse numbers
    pub bump: u8,
}

impl Race {
    pub const SIZE: usize = 8 + // discriminator
        8 + // race_id
        32 + // creator
        1 + // status enum
        (32 * MAX_HORSES) + // horse_names (assuming max 32 chars each)
        8 + // total_pool
        8 + // platform_fee
        4 + // entry_count
        4 + // max_players
        8 + // wait_time
        16 + // referral_code (up to 16 chars)
        8 + // start_time
        1 + 8 + // race_start_time Option
        1 + 8 + // end_time Option
        3 + // winning_horses
        1; // bump

    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time >= self.start_time + self.wait_time
    }

    pub fn is_full(&self) -> bool {
        self.entry_count >= self.max_players
    }

    pub fn can_execute(&self, current_time: i64) -> bool {
        self.status == RaceStatus::Pending && 
        self.is_expired(current_time) && 
        self.entry_count >= MIN_PLAYERS_TO_START
    }
    
    pub fn can_start_race(&self, current_time: i64) -> bool {
        self.status == RaceStatus::Pending && 
        self.is_expired(current_time) && 
        self.entry_count >= MIN_PLAYERS_TO_START
    }
    
    pub fn is_race_finished(&self, current_time: i64) -> bool {
        if let Some(race_start) = self.race_start_time {
            current_time >= race_start + RACE_DURATION
        } else {
            false
        }
    }
}