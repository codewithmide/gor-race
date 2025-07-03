use anchor_lang::prelude::*;
use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RaceStatus {
    Pending,
    Active,
    Completed,
    Cancelled,
}

#[account]
pub struct Race {
    pub race_id: u64,
    pub status: RaceStatus,
    pub horse_names: [String; MAX_HORSES],
    pub total_pool: u64,
    pub platform_fee: u64,
    pub entry_count: u32,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub winning_horses: [u8; 3], // 1st, 2nd, 3rd place horse numbers
    pub bump: u8,
}

impl Race {
    pub const SIZE: usize = 8 + // discriminator
        8 + // race_id
        1 + // status enum
        (32 * MAX_HORSES) + // horse_names (assuming max 32 chars each)
        8 + // total_pool
        8 + // platform_fee
        4 + // entry_count
        8 + // start_time
        1 + 8 + // end_time Option
        3 + // winning_horses
        1; // bump

    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time >= self.start_time + RACE_TIMEOUT_SECONDS
    }

    pub fn can_execute(&self, current_time: i64) -> bool {
        self.status == RaceStatus::Pending && self.is_expired(current_time)
    }
}