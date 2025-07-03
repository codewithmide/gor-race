use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::constants::*;
use crate::utils::*;

#[derive(Accounts)]
pub struct CreateRace<'info> {
    #[account(
        init,
        payer = creator,
        space = Race::SIZE,
        seeds = [RACE_SEED, &get_race_id().to_le_bytes()],
        bump
    )]
    pub race: Account<'info, Race>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    
    /// CHECK: Used for getting current time
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<CreateRace>) -> Result<()> {
    let race = &mut ctx.accounts.race;
    let clock = &ctx.accounts.clock;
    
    // Generate random horse names for this race
    let horse_names = select_random_horses(clock.slot);
    
    race.race_id = get_race_id();
    race.status = RaceStatus::Pending;
    race.horse_names = horse_names;
    race.total_pool = 0;
    race.platform_fee = 0;
    race.entry_count = 0;
    race.start_time = clock.unix_timestamp;
    race.end_time = None;
    race.winning_horses = [0, 0, 0];
    race.bump = ctx.bumps.race;

    Ok(())
}

