use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::*;
use crate::constants::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(
        constraint = race.status == RaceStatus::Completed @ GorRaceError::RaceNotCompleted
    )]
    pub race: Account<'info, Race>,
    
    #[account(
        mut,
        seeds = [PLAYER_ENTRY_SEED, race.key().as_ref(), player.key().as_ref()],
        bump = player_entry.bump,
        constraint = player_entry.claim_status == ClaimStatus::Unclaimed @ GorRaceError::AlreadyClaimed,
        constraint = player_entry.player == player.key()
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
    pub race_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [PLATFORM_VAULT_SEED],
        bump
    )]
    pub platform_vault: Account<'info, PlatformVault>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimPrize>) -> Result<()> {
    let race = &ctx.accounts.race;
    let player_entry = &mut ctx.accounts.player_entry;
    
    // Calculate prize amount
    let prize_pool = race.total_pool
        .checked_sub(race.platform_fee)
        .ok_or(GorRaceError::MathOverflow)?;
    
    let mut prize_amount = 0u64;
    
    // Check if player won any position
    for (i, &winning_horse) in race.winning_horses.iter().enumerate() {
        if winning_horse == player_entry.horse_number {
            prize_amount = prize_pool
                .checked_mul(PRIZE_DISTRIBUTION[i] as u64)
                .ok_or(GorRaceError::MathOverflow)?
                .checked_div(10000)
                .ok_or(GorRaceError::MathOverflow)?;
            break;
        }
    }
    
    require!(prize_amount > 0, GorRaceError::NoPrize);
    
    // Prepare seeds for signing
    let race_key = race.key();
    let race_vault_seeds = &[
        RACE_VAULT_SEED,
        race_key.as_ref(),
        &[ctx.bumps.race_vault],
    ];
    
    // Transfer prize to player
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.race_vault.to_account_info(),
                to: ctx.accounts.player.to_account_info(),
            },
            &[&race_vault_seeds[..]],
        ),
        prize_amount,
    )?;
    
    // Handle platform fee transfer if needed
    if race.platform_fee > 0 && !ctx.accounts.platform_vault.fees_transferred {
        // Get account info without holding a mutable reference
        let platform_vault_account = ctx.accounts.platform_vault.to_account_info();
        
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.race_vault.to_account_info(),
                    to: platform_vault_account,
                },
                &[&race_vault_seeds[..]],
            ),
            race.platform_fee,
        )?;
        
        // Now update the platform vault fields
        let platform_vault = &mut ctx.accounts.platform_vault;
        platform_vault.total_fees_collected = platform_vault.total_fees_collected
            .checked_add(race.platform_fee)
            .ok_or(GorRaceError::MathOverflow)?;
        platform_vault.fees_transferred = true;
    }
    
    // Update player entry
    player_entry.prize_amount = prize_amount;
    player_entry.claim_status = ClaimStatus::Claimed;
    
    Ok(())
}