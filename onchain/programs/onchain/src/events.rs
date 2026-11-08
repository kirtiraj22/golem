use anchor_lang::prelude::*;

use crate::state::{AssetResult, Classification};

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub company: Pubkey,
    pub campaign_id: u64,
    pub total_budget: u64,
    pub expected_asset_count: u32,
    pub min_votes: u64,
    pub voting_deadline: i64,
    pub claim_deadline: i64,
}

#[event]
pub struct AssetRegistered {
    pub campaign: Pubkey,
    pub asset: Pubkey,
    pub asset_index: u32,
    pub content_hash: [u8; 32],
}

#[event]
pub struct CampaignFunded {
    pub campaign: Pubkey,
    pub company: Pubkey,
    pub amount: u64,
}

#[event]
pub struct VoteCast {
    pub campaign: Pubkey,
    pub asset: Pubkey,
    pub participant: Pubkey,
    pub classification: Classification,
    pub ai_votes: u64,
    pub human_votes: u64,
    pub total_votes: u64,
}

#[event]
pub struct CampaignClosed {
    pub campaign: Pubkey,
    pub closed_by: Pubkey,
}

#[event]
pub struct AssetFinalized {
    pub campaign: Pubkey,
    pub asset: Pubkey,
    pub asset_index: u32,
    pub result: AssetResult,
    pub ai_votes: u64,
    pub human_votes: u64,
    pub total_votes: u64,
    pub winning_votes: u64,
    pub reward_pool: u64,
}

#[event]
pub struct RewardClaimed {
    pub campaign: Pubkey,
    pub asset: Pubkey,
    pub participant: Pubkey,
    pub amount: u64,
}

#[event]
pub struct CampaignRefunded {
    pub campaign: Pubkey,
    pub company: Pubkey,
    pub amount: u64,
}