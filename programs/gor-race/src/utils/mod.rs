pub mod random;

pub use random::*;

use anchor_lang::solana_program::clock::Clock;
use anchor_lang::prelude::SolanaSysvar;

pub fn get_race_id() -> u64 {
    let clock = Clock::get().unwrap();
    clock.unix_timestamp as u64
}

pub fn generate_referral_code(race_id: u64) -> String {
    // Generate a simple referral code from race_id
    // Using base36 encoding for better readability
    let mut code = String::new();
    let mut id = race_id;
    let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    for _ in 0..8 {
        let idx = (id % 36) as usize;
        code.push(chars.chars().nth(idx).unwrap());
        id /= 36;
    }
    
    code
}

pub fn decode_referral_code(referral_code: &str) -> Option<u64> {
    // Decode referral code back to race_id
    if referral_code.len() != 8 {
        return None;
    }
    
    let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let mut race_id = 0u64;
    let mut multiplier = 1u64;
    
    for c in referral_code.chars() {
        if let Some(idx) = chars.find(c) {
            race_id += (idx as u64) * multiplier;
            multiplier *= 36;
        } else {
            return None;
        }
    }
    
    Some(race_id)
}