use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use solana_program::sysvar::recent_blockhashes::RecentBlockhashes;
use crate::state::*;
use crate::constants::*;
use crate::errors::*;
use crate::utils::*;

#[derive(Accounts)]
pub struct ExecuteRace<'info> {
    #[account(
        mut,
        constraint = race.can_execute(clock.unix_timestamp) @ GorRaceError::RaceNotReady
    )]
    pub race: Account<'info, Race>,
    
    #[account(
        mut,
        seeds = [RACE_VAULT_SEED, race.key().as_ref()],
        bump
    )]
    /// CHECK: This is safe as it's just holding native tokens
    pub race_vault: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [PLATFORM_VAULT_SEED],
        bump
    )]
    pub platform_vault: Account<'info, PlatformVault>,
    
    /// CHECK: Used for randomness generation
    pub recent_blockhashes: Sysvar<'info, RecentBlockhashes>,
    
    /// CHECK: Used for getting current time
    pub clock: Sysvar<'info, Clock>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteRace>) -> Result<()> {
    let race = &mut ctx.accounts.race;
    let clock = &ctx.accounts.clock;
    
    // Calculate platform fee first (only need immutable access)
    let platform_fee = {
        let platform_vault = &ctx.accounts.platform_vault;
        race.total_pool
            .checked_mul(platform_vault.platform_fee_bps as u64)
            .ok_or(GorRaceError::MathOverflow)?
            .checked_div(10000)
            .ok_or(GorRaceError::MathOverflow)?
    };
    
    // Prepare seeds for signing
    let race_key = race.key();
    let seeds = &[
        RACE_VAULT_SEED,
        race_key.as_ref(),
        &[ctx.bumps.race_vault]
    ];
    
    // Transfer platform fee if not already done
    if platform_fee > 0 && !ctx.accounts.platform_vault.fees_transferred {
        // Get platform vault account info without mutable reference
        let platform_vault_account = ctx.accounts.platform_vault.to_account_info();
        
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.race_vault.to_account_info(),
                    to: platform_vault_account,
                },
                &[seeds]
            ),
            platform_fee,
        )?;
        
        // Now get mutable reference to update state
        let platform_vault = &mut ctx.accounts.platform_vault;
        platform_vault.total_fees_collected = platform_vault.total_fees_collected
            .checked_add(platform_fee)
            .ok_or(GorRaceError::MathOverflow)?;
        platform_vault.fees_transferred = true;
    }
    
    // Update race state
    race.platform_fee = platform_fee;
    
    // Generate race results
    let winning_horses = generate_race_results(
        &ctx.accounts.recent_blockhashes,
        clock.slot,
        race.race_id,
    );
    
    race.winning_horses = winning_horses;
    race.status = RaceStatus::Completed;
    race.end_time = Some(clock.unix_timestamp);

    Ok(())
}