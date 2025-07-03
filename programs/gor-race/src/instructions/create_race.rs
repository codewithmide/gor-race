use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::constants::*;
use crate::utils::*;
use crate::errors::GorRaceError;

#[derive(Accounts)]
#[instruction(race_id: u64)]
pub struct CreateRace<'info> {
    #[account(
        init,
        payer = creator,
        space = Race::SIZE,
        seeds = [RACE_SEED, &race_id.to_le_bytes()],
        bump
    )]
    pub race: Account<'info, Race>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    
    /// CHECK: Used for getting current time
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<CreateRace>, race_id: u64, wait_time: Option<i64>) -> Result<()> {
    let race = &mut ctx.accounts.race;
    let clock = &ctx.accounts.clock;
    
    // Validate wait_time parameter
    let wait_time = wait_time.unwrap_or(DEFAULT_WAIT_TIME);
    require!(wait_time >= MIN_WAIT_TIME && wait_time <= MAX_WAIT_TIME, GorRaceError::InvalidWaitTime);
    
    // Generate random horse names for this race
    let horse_names = select_random_horses(clock.slot);
    
    // Generate referral code from race_id
    let referral_code = generate_referral_code(race_id);
    
    race.race_id = race_id;
    race.creator = ctx.accounts.creator.key();
    race.status = RaceStatus::Pending;
    race.horse_names = horse_names;
    race.total_pool = 0;
    race.platform_fee = 0;
    race.entry_count = 0;
    race.max_players = MAX_PLAYERS_PER_RACE;
    race.wait_time = wait_time;
    race.referral_code = referral_code;
    race.start_time = clock.unix_timestamp;
    race.race_start_time = None;
    race.end_time = None;
    race.winning_horses = [0, 0, 0];
    race.bump = ctx.bumps.race;

    Ok(())
}

