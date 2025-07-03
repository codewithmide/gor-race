use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::recent_blockhashes::RecentBlockhashes;
use crate::constants::*;

/// Select random horse names from the pool for a race
pub fn select_random_horses(slot: u64) -> [String; MAX_HORSES] {
    let mut selected_names = Vec::with_capacity(MAX_HORSES);
    let mut used_indices = Vec::new();
    let mut seed = slot;
    
    for _ in 0..MAX_HORSES {
        loop {
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let index = (seed % HORSE_NAME_POOL.len() as u64) as usize;
            
            if !used_indices.contains(&index) {
                used_indices.push(index);
                selected_names.push(HORSE_NAME_POOL[index].to_string());
                break;
            }
        }
    }
    
    selected_names.try_into().unwrap()
}


/// Generate race results using on-chain randomness
pub fn generate_race_results(
    recent_blockhashes: &Sysvar<RecentBlockhashes>,
    slot: u64,
    race_id: u64,
) -> [u8; 3] {
    let recent_blockhash = recent_blockhashes
        .iter()
        .next()
        .map(|entry| entry.blockhash)
        .unwrap_or_default();
    
    let mut seed = 0u64;
    for (i, byte) in recent_blockhash.to_bytes().iter().enumerate() {
        seed = seed.wrapping_add(*byte as u64)
            .wrapping_mul(i as u64 + 1)
            .wrapping_add(slot)
            .wrapping_add(race_id);
    }
    
    let mut winners = [0u8; 3];
    let mut used_horses = Vec::new();
    
    for i in 0..3 {
        loop {
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let horse = ((seed % MAX_HORSES as u64) + 1) as u8;
            
            if !used_horses.contains(&horse) {
                used_horses.push(horse);
                winners[i] = horse;
                break;
            }
        }
    }
    
    winners
}

/// Calculate prize distribution for winners
pub fn calculate_winner_shares(
    entries: &[(Pubkey, u8)],
    winning_horses: &[u8; 3],
    prize_pool: u64,
) -> Vec<(Pubkey, u64)> {
    let mut winner_shares = Vec::new();
    
    for (position, &winning_horse) in winning_horses.iter().enumerate() {
        let position_winners: Vec<Pubkey> = entries
            .iter()
            .filter(|(_, horse)| *horse == winning_horse)
            .map(|(player, _)| *player)
            .collect();
        
        if !position_winners.is_empty() {
            let position_prize = prize_pool
                .checked_mul(PRIZE_DISTRIBUTION[position] as u64)
                .unwrap()
                .checked_div(10000)
                .unwrap();
            
            let share_per_winner = position_prize
                .checked_div(position_winners.len() as u64)
                .unwrap();
            
            for winner in position_winners {
                winner_shares.push((winner, share_per_winner));
            }
        }
    }
    
    winner_shares
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_random_horses() {
        let horses = select_random_horses(12345);
        assert_eq!(horses.len(), MAX_HORSES);
        
        // Check all horses are unique
        let mut unique_horses = horses.to_vec();
        unique_horses.sort();
        unique_horses.dedup();
        assert_eq!(unique_horses.len(), MAX_HORSES);
    }

    #[test]
    fn test_calculate_winner_shares() {
        let entries = vec![
            (Pubkey::new_unique(), 1),
            (Pubkey::new_unique(), 1),
            (Pubkey::new_unique(), 2),
            (Pubkey::new_unique(), 3),
        ];
        
        let winning_horses = [1, 2, 3];
        let prize_pool = 1_000_000_000; // 1 GOR
        
        let shares = calculate_winner_shares(&entries, &winning_horses, prize_pool);
        
        // First place (horse 1) has 2 winners, each gets 25%
        assert_eq!(shares.len(), 4);
        assert_eq!(shares[0].1, 250_000_000); // 0.25 GOR each
        assert_eq!(shares[1].1, 250_000_000);
        
        // Second place (horse 2) has 1 winner, gets 30%
        assert_eq!(shares[2].1, 300_000_000); // 0.3 GOR
        
        // Third place (horse 3) has 1 winner, gets 15%
        assert_eq!(shares[3].1, 150_000_000); // 0.15 GOR
    }
}