use anchor_lang::prelude::*;

#[error_code]
pub enum GorRaceError {
    #[msg("Invalid horse number selected")]
    InvalidHorseNumber,
    
    #[msg("Race already started or completed")]
    RaceNotPending,
    
    #[msg("Race not ready for execution")]
    RaceNotReady,
    
    #[msg("Player already joined this race")]
    AlreadyJoined,
    
    #[msg("Prize already claimed")]
    AlreadyClaimed,
    
    #[msg("No prize to claim")]
    NoPrize,
    
    #[msg("Invalid platform fee")]
    InvalidPlatformFee,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Race is full")]
    RaceFull,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Race not completed")]
    RaceNotCompleted,
    
    #[msg("Invalid wait time")]
    InvalidWaitTime,
    
    #[msg("Invalid referral code")]
    InvalidReferralCode,
    
    #[msg("Username too long (max 32 characters)")]
    UsernameTooLong,
    
    #[msg("Username cannot be empty")]
    UsernameEmpty,
    
    #[msg("Username already taken")]
    UsernameAlreadyTaken,
    
    #[msg("Player profile not found")]
    ProfileNotFound,
}