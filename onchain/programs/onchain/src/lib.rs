use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;

declare_id!("HuyRx42nkwqRnmZWP1wHiqStyL35shayb6UEzcVU99SR");

#[program]
pub mod onchain {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        expected_asset_count: u32,
        total_budget: u64,
        min_votes: u64,
        voting_deadline: i64,
        claim_deadline: i64,
    ) -> Result<()> {
        instructions::create_campaign::create_campaign_handler(
            ctx,
            campaign_id,
            expected_asset_count,
            total_budget,
            min_votes,
            voting_deadline,
            claim_deadline,
        )
    }

    pub fn register_asset(
        ctx: Context<RegisterAsset>,
        asset_index: u32,
        content_hash: [u8; 32],
    ) -> Result<()> {
        instructions::register_asset::register_asset_handler(ctx, asset_index, content_hash)
    }

    pub fn fund_campaign(ctx: Context<FundCampaign>) -> Result<()> {
        instructions::fund_campaign::fund_campaign_handler(ctx)
    }

    pub fn vote(ctx: Context<CastVote>, classification: Classification) -> Result<()> {
        instructions::cast_vote::cast_vote_handler(ctx, classification)
    }

    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        instructions::close_campaign::close_campaign_handler(ctx)
    }

    pub fn finalize_asset(ctx: Context<FinalizeAsset>) -> Result<()> {
        instructions::finalize_asset::finalize_asset_handler(ctx)
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        instructions::claim_reward::claim_reward_handler(ctx)
    }

    pub fn refund_campaign(ctx: Context<RefundCampaign>) -> Result<()> {
        instructions::refund_campaign::refund_campaign_handler(ctx)
    }
}