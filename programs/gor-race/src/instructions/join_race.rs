use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::*;
use crate::constants::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct JoinRace<'info> {
    #[account(
        mut,
        constraint = race.status == RaceStatus::Pending @ GorRaceError::RaceNotPending,
        constraint = race.entry_count < MAX_ENTRIES as u32 @ GorRaceError::RaceFull
    )]
    pub race: Account<'info, Race>,
    
    #[account(
        init,
        payer = player,
        space = PlayerEntry::SIZE,
        seeds = [PLAYER_ENTRY_SEED, race.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_entry: Account<'info, PlayerEntry>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(
        mut,
        seeds = [RACE_VAULT_SEED, race.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA that holds native GOR tokens
    pub race_vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinRace>, horse_number: u8) -> Result<()> {
    require!(
        horse_number > 0 && horse_number <= MAX_HORSES as u8,
        GorRaceError::InvalidHorseNumber
    );

    let race = &mut ctx.accounts.race;
    let player_entry = &mut ctx.accounts.player_entry;
    
    // Transfer entry fee to race vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.race_vault.to_account_info(),
        }
    );
    transfer(cpi_context, ENTRY_FEE)?;
    
    // Update race state
    race.total_pool = race.total_pool
        .checked_add(ENTRY_FEE)
        .ok_or(GorRaceError::MathOverflow)?;
    race.entry_count = race.entry_count
        .checked_add(1)
        .ok_or(GorRaceError::MathOverflow)?;
    
    // Initialize player entry
    player_entry.player = ctx.accounts.player.key();
    player_entry.race = race.key();
    player_entry.horse_number = horse_number;
    player_entry.entry_amount = ENTRY_FEE;
    player_entry.claim_status = ClaimStatus::Unclaimed;
    player_entry.prize_amount = 0;
    player_entry.bump = ctx.bumps.player_entry;

    Ok(())
}