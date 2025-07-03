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
        constraint = (race.status == RaceStatus::Pending && race.can_start_race(clock.unix_timestamp)) || 
                    (race.status == RaceStatus::Racing && race.is_race_finished(clock.unix_timestamp)) @ GorRaceError::RaceNotReady
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
    
    match race.status {
        RaceStatus::Pending => {
            // Check if we can start the race
            require!(race.can_start_race(clock.unix_timestamp), GorRaceError::RaceNotReady);
            
            // Check minimum players
            if race.entry_count < MIN_PLAYERS_TO_START {
                // Cancel race - not enough players
                race.status = RaceStatus::Cancelled;
                return Ok(());
            }
            
            // Start the race simulation
            race.status = RaceStatus::Racing;
            race.race_start_time = Some(clock.unix_timestamp);
            
            msg!("Race started! {} players racing for {} seconds", race.entry_count, RACE_DURATION);
        },
        
        RaceStatus::Racing => {
            // Check if race simulation is finished
            require!(race.is_race_finished(clock.unix_timestamp), GorRaceError::RaceNotReady);
            
            // Calculate platform fee
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
            
            // Transfer platform fee
            if platform_fee > 0 {
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
                
                let platform_vault = &mut ctx.accounts.platform_vault;
                platform_vault.total_fees_collected = platform_vault.total_fees_collected
                    .checked_add(platform_fee)
                    .ok_or(GorRaceError::MathOverflow)?;
            }
            
            // Generate race results
            let winning_horses = generate_race_results(
                &ctx.accounts.recent_blockhashes,
                clock.slot,
                race.race_id,
            );
            
            race.platform_fee = platform_fee;
            race.winning_horses = winning_horses;
            race.status = RaceStatus::Completed;
            race.end_time = Some(clock.unix_timestamp);
            
            msg!("Race completed! Winners: 1st: {}, 2nd: {}, 3rd: {}", 
                 winning_horses[0], winning_horses[1], winning_horses[2]);
        },
        
        _ => {
            return Err(GorRaceError::RaceNotReady.into());
        }
    }

    Ok(())
}