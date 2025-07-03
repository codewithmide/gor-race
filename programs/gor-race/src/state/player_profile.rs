use anchor_lang::prelude::*;

#[account]
pub struct PlayerProfile {
    /// The player's wallet address
    pub player: Pubkey,
    /// The player's chosen username (max 32 characters)
    pub username: String,
    /// Total number of races participated in
    pub total_races: u32,
    /// Total number of wins (1st place)
    pub total_wins: u32,
    /// Total number of podium finishes (1st, 2nd, 3rd place)
    pub total_podiums: u32,
    /// Total GOR earned from prizes
    pub total_earnings: u64,
    /// Account creation timestamp
    pub created_at: i64,
    /// Last updated timestamp
    pub updated_at: i64,
}

impl PlayerProfile {
    pub const LEN: usize = 8 + // discriminator
        32 + // player
        4 + 32 + // username (String with max 32 chars)
        4 + // total_races
        4 + // total_wins
        4 + // total_podiums
        8 + // total_earnings
        8 + // created_at
        8; // updated_at

    pub fn new(player: Pubkey, username: String, current_time: i64) -> Result<Self> {
        if username.len() > 32 {
            return Err(crate::errors::GorRaceError::UsernameTooLong.into());
        }
        
        if username.trim().is_empty() {
            return Err(crate::errors::GorRaceError::UsernameEmpty.into());
        }

        Ok(Self {
            player,
            username,
            total_races: 0,
            total_wins: 0,
            total_podiums: 0,
            total_earnings: 0,
            created_at: current_time,
            updated_at: current_time,
        })
    }

    pub fn add_race_participation(&mut self, current_time: i64) {
        self.total_races += 1;
        self.updated_at = current_time;
    }

    pub fn add_win(&mut self, prize_amount: u64, current_time: i64) {
        self.total_wins += 1;
        self.total_podiums += 1;
        self.total_earnings += prize_amount;
        self.updated_at = current_time;
    }

    pub fn add_podium(&mut self, prize_amount: u64, current_time: i64) {
        self.total_podiums += 1;
        self.total_earnings += prize_amount;
        self.updated_at = current_time;
    }

    pub fn win_rate(&self) -> f64 {
        if self.total_races == 0 {
            0.0
        } else {
            (self.total_wins as f64) / (self.total_races as f64)
        }
    }

    pub fn podium_rate(&self) -> f64 {
        if self.total_races == 0 {
            0.0
        } else {
            (self.total_podiums as f64) / (self.total_races as f64)
        }
    }
}