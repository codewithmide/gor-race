use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::*;
use crate::constants::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct WithdrawPlatformFees<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_VAULT_SEED],
        bump = platform_vault.bump,
        constraint = platform_vault.authority == authority.key() @ GorRaceError::Unauthorized
    )]
    pub platform_vault: Account<'info, PlatformVault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawPlatformFees>, amount: u64) -> Result<()> {
    require!(
        **ctx.accounts.platform_vault.to_account_info().lamports.borrow() >= amount,
        GorRaceError::InsufficientFunds
    );
    
    // Transfer native GOR from platform vault to authority
    **ctx.accounts.platform_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount;
    
    Ok(())
}