use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Signer is not the game authority")]
    UnauthorizedAuthority,
    #[msg("Auction id must be greater than the player's previous auction id")]
    AuctionIdNotIncreasing,
    #[msg("Auction id does not match the player's current auction")]
    WrongAuction,
    #[msg("A previous auction is still unresolved for this player")]
    AuctionBusy,
    #[msg("New bid must be higher than the currently locked bid")]
    BidTooLow,
    #[msg("Settlement price exceeds the locked escrow")]
    PriceExceedsEscrow,
    #[msg("Stale or duplicate VRF request; nonce does not match")]
    StaleRevealRequest,
    #[msg("Insufficient available balance")]
    InsufficientBalance,
    #[msg("Auction is not in the required phase for this instruction")]
    InvalidPhase,
    #[msg("Cannot undelegate while a VRF reveal is pending")]
    RevealPending,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}