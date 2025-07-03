use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ClaimStatus {
    Unclaimed,
    Claimed,
}

#[account]
pub struct PlayerEntry {
    pub player: Pubkey,
    pub race: Pubkey,
    pub horse_number: u8,
    pub entry_amount: u64,
    pub claim_status: ClaimStatus,
    pub prize_amount: u64,
    pub stats_updated: bool,
    pub bump: u8,
}

impl PlayerEntry {
    pub const SIZE: usize = 8 + // discriminator
        32 + // player
        32 + // race
        1 + // horse_number
        8 + // entry_amount
        1 + // claim_status
        8 + // prize_amount
        1 + // stats_updated
        1; // bump
}