use anchor_lang::prelude::*;
use crate::state::{PlayerProfile, Race, PlayerEntry};

#[derive(Accounts)]
pub struct UpdateStats<'info> {
    #[account(
        mut,
        seeds = [b"player_profile", player.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(
        seeds = [b"race", race.race_id.to_le_bytes().as_ref()],
        bump,
        constraint = race.status == crate::state::RaceStatus::Completed
    )]
    pub race: Account<'info, Race>,

    #[account(
        mut,
        seeds = [b"player_entry", race.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_entry: Account<'info, PlayerEntry>,

    /// CHECK: This is the player whose stats are being updated
    pub player: UncheckedAccount<'info>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<UpdateStats>) -> Result<()> {
    let player_profile = &mut ctx.accounts.player_profile;
    let race = &ctx.accounts.race;
    let player_entry = &mut ctx.accounts.player_entry;
    let current_time = ctx.accounts.clock.unix_timestamp;

    // Check if this race has already been counted for this player
    // (This prevents double counting if the instruction is called multiple times)
    if player_entry.stats_updated {
        return Ok(()); // Already updated, do nothing
    }

    // Add race participation
    player_profile.add_race_participation(current_time);

    // Check if player won any position
    let horse_number = player_entry.horse_number;
    if let Some(position) = race.winning_horses.iter().position(|&h| h == horse_number) {
        let prize_amount = player_entry.prize_amount;
        
        if position == 0 {
            // First place
            player_profile.add_win(prize_amount, current_time);
        } else {
            // 2nd or 3rd place
            player_profile.add_podium(prize_amount, current_time);
        }
    }

    // Mark stats as updated
    player_entry.stats_updated = true;

    msg!("Stats updated for player: {}", player_profile.username);
    msg!("Total races: {}", player_profile.total_races);
    msg!("Total wins: {}", player_profile.total_wins);
    msg!("Total podiums: {}", player_profile.total_podiums);

    Ok(())
}