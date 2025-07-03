use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("4aAooA2UyfiT27nVGKNkeKr8PgQGguppWnRFZZFiAsjs");

#[program]
pub mod gor_race {
    use super::*;

    /// Initialize the platform vault and set platform parameters
    pub fn initialize(ctx: Context<Initialize>, platform_fee_bps: u16) -> Result<()> {
        instructions::initialize::handler(ctx, platform_fee_bps)
    }

    /// Create a new race that players can join
    pub fn create_race(ctx: Context<CreateRace>) -> Result<()> {
        instructions::create_race::handler(ctx)
    }

    /// Join a race by selecting a horse and paying entry fee
    pub fn join_race(ctx: Context<JoinRace>, horse_number: u8) -> Result<()> {
        instructions::join_race::handler(ctx, horse_number)
    }

    /// Execute the race after timeout or when conditions are met
    pub fn execute_race(ctx: Context<ExecuteRace>) -> Result<()> {
        instructions::execute_race::handler(ctx)
    }

    /// Claim prize after race completion
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::handler(ctx)
    }

    /// Update platform fee (authority only)
    pub fn update_platform_fee(
        ctx: Context<UpdatePlatformFee>,
        new_fee_bps: u16,
    ) -> Result<()> {
        instructions::update_platform_fee::handler(ctx, new_fee_bps)
    }

    /// Withdraw platform fees (authority only)
    pub fn withdraw_platform_fees(
        ctx: Context<WithdrawPlatformFees>,
        amount: u64,
    ) -> Result<()> {
        instructions::withdraw_platform_fees::handler(ctx, amount)
    }
}