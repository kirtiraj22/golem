use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Signer is not the game authority")]
    UnauthorizedAuthority,
    #[msg("Signer does not own this lot bid")]
    NotLotOwner,
    #[msg("This lot is already settled")]
    LotClosed,
    #[msg("This lot is not settled yet")]
    LotStillOpen,
    #[msg("Only a won lot can be revealed")]
    LotNotWon,
    #[msg("New bid must be higher than your currently locked bid")]
    BidTooLow,
    #[msg("Bid is outside the house limit")]
    BidTooHigh,
    #[msg("Insufficient available balance")]
    InsufficientBalance,
    #[msg("Balance sync nonce is not the next expected value")]
    BadSyncNonce,
    #[msg("Reveal already requested or completed")]
    RevealAlreadyRequested,
    #[msg("No reveal has been requested")]
    RevealNotRequested,
    #[msg("Stale or duplicate VRF request; nonce does not match")]
    StaleRevealRequest,
    #[msg("Cannot undelegate while a VRF reveal is pending")]
    RevealPending,
    #[msg("Lot cannot be closed yet")]
    CannotClose,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}