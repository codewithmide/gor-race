use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = PlatformVault::SIZE,
        seeds = [PLATFORM_VAULT_SEED],
        bump
    )]
    pub platform_vault: Account<'info, PlatformVault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, platform_fee_bps: u16) -> Result<()> {
    require!(
        platform_fee_bps <= 1000, // Max 10%
        GorRaceError::InvalidPlatformFee
    );

    let platform_vault = &mut ctx.accounts.platform_vault;
    platform_vault.authority = ctx.accounts.authority.key();
    platform_vault.platform_fee_bps = platform_fee_bps;
    platform_vault.total_fees_collected = 0;
    platform_vault.bump = ctx.bumps.platform_vault;

    Ok(())
}