use anchor_lang::prelude::*;

#[error_code]
pub enum GolemError {
    #[msg("Expected asset count is out of range")]
    InvalidAssetCount,
    #[msg("Budget must be at least one lamport per asset")]
    InvalidBudget,
    #[msg("Minimum votes must be at least one")]
    InvalidMinVotes,
    #[msg("Deadlines are invalid")]
    InvalidDeadlines,
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Campaign is not in the required status")]
    InvalidCampaignStatus,
    #[msg("All declared assets are already registered")]
    AllAssetsRegistered,
    #[msg("Not all declared assets are registered")]
    AssetsNotAllRegistered,
    #[msg("Asset index must equal the number of registered assets")]
    InvalidAssetIndex,
    #[msg("Voting is not open")]
    VotingNotOpen,
    #[msg("Voting period has not ended")]
    VotingStillOpen,
    #[msg("Asset does not belong to this campaign")]
    AssetCampaignMismatch,
    #[msg("Asset is already finalized")]
    AssetAlreadyFinalized,
    #[msg("Asset is not finalized")]
    AssetNotFinalized,
    #[msg("No reward is available for this asset")]
    NoRewardAvailable,
    #[msg("Vote does not match the winning classification")]
    NotWinningVote,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Claim period has ended")]
    ClaimWindowClosed,
    #[msg("Claim period has not ended")]
    ClaimWindowOpen,
    #[msg("Not all assets are finalized")]
    AssetsNotFinalized,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Escrow does not hold enough spendable lamports")]
    InsufficientEscrow,
}