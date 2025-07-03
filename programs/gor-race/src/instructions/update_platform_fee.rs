use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct UpdatePlatformFee<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_VAULT_SEED],
        bump = platform_vault.bump,
        constraint = platform_vault.authority == authority.key() @ GorRaceError::Unauthorized
    )]
    pub platform_vault: Account<'info, PlatformVault>,
    
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdatePlatformFee>, new_fee_bps: u16) -> Result<()> {
    require!(
        new_fee_bps <= 1000, // Max 10%
        GorRaceError::InvalidPlatformFee
    );
    
    let platform_vault = &mut ctx.accounts.platform_vault;
    platform_vault.platform_fee_bps = new_fee_bps;
    
    Ok(())
}