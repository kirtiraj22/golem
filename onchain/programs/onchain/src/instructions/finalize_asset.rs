use anchor_lang::prelude::*;

use crate::errors::GolemError;
use crate::events::AssetFinalized;
use crate::state::{Asset, AssetResult, Campaign, CampaignStatus, ASSET_SEED, CAMPAIGN_SEED};

#[derive(Accounts)]
pub struct FinalizeAsset<'info> {
    #[account(
        mut,
        seeds = [CAMPAIGN_SEED, campaign.company.as_ref(), campaign.campaign_id.to_le_bytes().as_ref()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        has_one = campaign @ GolemError::AssetCampaignMismatch,
        seeds = [ASSET_SEED, campaign.key().as_ref(), asset.asset_index.to_le_bytes().as_ref()],
        bump = asset.bump
    )]
    pub asset: Account<'info, Asset>,
}

pub fn finalize_asset_handler(ctx: Context<FinalizeAsset>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let campaign_key = ctx.accounts.campaign.key();
    let asset_key = ctx.accounts.asset.key();
    let campaign = &mut ctx.accounts.campaign;
    let asset = &mut ctx.accounts.asset;

    require!(!asset.finalized, GolemError::AssetAlreadyFinalized);
    match campaign.status {
        CampaignStatus::Closed => {}
        CampaignStatus::Active => {
            require!(now >= campaign.voting_deadline, GolemError::VotingStillOpen);
            campaign.status = CampaignStatus::Closed;
        }
        _ => return err!(GolemError::InvalidCampaignStatus),
    }

    let result = if asset.total_votes < campaign.min_votes {
        AssetResult::InsufficientVotes
    } else if asset.ai_votes > asset.human_votes {
        AssetResult::AiGenerated
    } else if asset.human_votes > asset.ai_votes {
        AssetResult::HumanCreated
    } else {
        AssetResult::Tie
    };

    let (winning_votes, reward_pool) = match result {
        AssetResult::AiGenerated => (asset.ai_votes, per_asset_pool(campaign)?),
        AssetResult::HumanCreated => (asset.human_votes, per_asset_pool(campaign)?),
        _ => (0, 0),
    };

    asset.result = result;
    asset.winning_votes = winning_votes;
    asset.reward_pool = reward_pool;
    asset.finalized = true;
    campaign.finalized_asset_count = campaign
        .finalized_asset_count
        .checked_add(1)
        .ok_or(error!(GolemError::MathOverflow))?;

    emit!(AssetFinalized {
        campaign: campaign_key,
        asset: asset_key,
        asset_index: asset.asset_index,
        result,
        ai_votes: asset.ai_votes,
        human_votes: asset.human_votes,
        total_votes: asset.total_votes,
        winning_votes,
        reward_pool,
    });
    Ok(())
}

fn per_asset_pool(campaign: &Campaign) -> Result<u64> {
    campaign
        .total_budget
        .checked_div(campaign.expected_asset_count as u64)
        .ok_or(error!(GolemError::MathOverflow))
}