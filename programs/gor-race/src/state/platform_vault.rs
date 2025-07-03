use anchor_lang::prelude::*;

#[account]
pub struct PlatformVault {
    pub authority: Pubkey,
    pub platform_fee_bps: u16, // Basis points (100 = 1%)
    pub total_fees_collected: u64,
    pub fees_transferred: bool, // Track if fees were transferred for current race
    pub bump: u8,
}

impl PlatformVault {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        2 + // platform_fee_bps
        8 + // total_fees_collected
        1 + // fees_transferred
        1; // bump
}
