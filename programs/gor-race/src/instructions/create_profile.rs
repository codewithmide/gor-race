use anchor_lang::prelude::*;
use crate::state::PlayerProfile;
use crate::errors::GorRaceError;

#[derive(Accounts)]
#[instruction(username: String)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = player,
        space = PlayerProfile::LEN,
        seeds = [b"player_profile", player.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<CreateProfile>, username: String) -> Result<()> {
    let player_profile = &mut ctx.accounts.player_profile;
    let player = ctx.accounts.player.key();
    let current_time = ctx.accounts.clock.unix_timestamp;

    // Validate username
    if username.len() > 32 {
        return Err(GorRaceError::UsernameTooLong.into());
    }
    
    if username.trim().is_empty() {
        return Err(GorRaceError::UsernameEmpty.into());
    }

    // Check for invalid characters (only alphanumeric and basic symbols allowed)
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c == '.') {
        return Err(GorRaceError::UsernameEmpty.into()); // Reuse error for simplicity
    }

    // Initialize the player profile
    let new_profile = PlayerProfile::new(player, username.clone(), current_time)?;
    player_profile.player = new_profile.player;
    player_profile.username = new_profile.username;
    player_profile.total_races = new_profile.total_races;
    player_profile.total_wins = new_profile.total_wins;
    player_profile.total_podiums = new_profile.total_podiums;
    player_profile.total_earnings = new_profile.total_earnings;
    player_profile.created_at = new_profile.created_at;
    player_profile.updated_at = new_profile.updated_at;

    msg!("Player profile created for: {}", username);
    msg!("Player address: {}", player);

    Ok(())
}