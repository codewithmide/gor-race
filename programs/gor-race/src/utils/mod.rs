pub mod random;

pub use random::*;

use anchor_lang::solana_program::clock::Clock;
use anchor_lang::prelude::SolanaSysvar;

pub fn get_race_id() -> u64 {
    let clock = Clock::get().unwrap();
    clock.unix_timestamp as u64
}