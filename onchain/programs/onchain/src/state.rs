use anchor_lang::prelude::*;

pub const CAMPAIGN_SEED: &[u8] = b"campaign";
pub const ASSET_SEED: &[u8] = b"asset";
pub const VOTE_SEED: &[u8] = b"vote";
pub const MAX_ASSETS: u32 = 500;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum CampaignStatus {
    Draft,
    Active,
    Closed,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum Classification {
    AiGenerated,
    HumanCreated,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum AssetResult {
    Pending,
    AiGenerated,
    HumanCreated,
    Tie,
    InsufficientVotes,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub company: Pubkey,
    pub campaign_id: u64,
    pub total_budget: u64,
    pub expected_asset_count: u32,
    pub registered_asset_count: u32,
    pub min_votes: u64,
    pub voting_deadline: i64,
    pub claim_deadline: i64,
    pub status: CampaignStatus,
    pub finalized_asset_count: u32,
    pub total_claimed: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Asset {
    pub campaign: Pubkey,
    pub asset_index: u32,
    pub content_hash: [u8; 32],
    pub ai_votes: u64,
    pub human_votes: u64,
    pub total_votes: u64,
    pub result: AssetResult,
    pub winning_votes: u64,
    pub reward_pool: u64,
    pub total_claimed: u64,
    pub finalized: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Vote {
    pub asset: Pubkey,
    pub participant: Pubkey,
    pub classification: Classification,
    pub claimed: bool,
    pub bump: u8,
}