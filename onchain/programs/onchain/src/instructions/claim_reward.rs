use anchor_lang::prelude::*;

use crate::errors::GolemError;
use crate::events::RewardClaimed;
use crate::state::{
    Asset, AssetResult, Campaign, CampaignStatus, Classification, Vote, ASSET_SEED, CAMPAIGN_SEED,
    VOTE_SEED,
};

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,
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
    #[account(
        mut,
        has_one = asset @ GolemError::AssetCampaignMismatch,
        has_one = participant @ GolemError::Unauthorized,
        seeds = [VOTE_SEED, asset.key().as_ref(), participant.key().as_ref()],
        bump = vote.bump
    )]
    pub vote: Account<'info, Vote>,
}

pub fn claim_reward_handler(ctx: Context<ClaimReward>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let campaign_key = ctx.accounts.campaign.key();
    let asset_key = ctx.accounts.asset.key();
    let participant_key = ctx.accounts.participant.key();

    let campaign = &mut ctx.accounts.campaign;
    let asset = &mut ctx.accounts.asset;
    let vote = &mut ctx.accounts.vote;

    require!(
        campaign.status == CampaignStatus::Closed,
        GolemError::InvalidCampaignStatus
    );
    require!(asset.finalized, GolemError::AssetNotFinalized);
    require!(now <= campaign.claim_deadline, GolemError::ClaimWindowClosed);
    require!(!vote.claimed, GolemError::AlreadyClaimed);

    let winning = match asset.result {
        AssetResult::AiGenerated => Classification::AiGenerated,
        AssetResult::HumanCreated => Classification::HumanCreated,
        _ => return err!(GolemError::NoRewardAvailable),
    };
    require!(vote.classification == winning, GolemError::NotWinningVote);

    let reward = asset
        .reward_pool
        .checked_div(asset.winning_votes)
        .ok_or(error!(GolemError::NoRewardAvailable))?;
    require!(reward > 0, GolemError::NoRewardAvailable);

    let new_asset_claimed = asset
        .total_claimed
        .checked_add(reward)
        .ok_or(error!(GolemError::MathOverflow))?;
    require!(
        new_asset_claimed <= asset.reward_pool,
        GolemError::InsufficientEscrow
    );
    let new_campaign_claimed = campaign
        .total_claimed
        .checked_add(reward)
        .ok_or(error!(GolemError::MathOverflow))?;
    require!(
        new_campaign_claimed <= campaign.total_budget,
        GolemError::InsufficientEscrow
    );

    vote.claimed = true;
    asset.total_claimed = new_asset_claimed;
    campaign.total_claimed = new_campaign_claimed;

    let campaign_info = ctx.accounts.campaign.to_account_info();
    let participant_info = ctx.accounts.participant.to_account_info();
    let min_balance = Rent::get()?.minimum_balance(campaign_info.data_len());
    let campaign_after = campaign_info
        .lamports()
        .checked_sub(reward)
        .ok_or(error!(GolemError::InsufficientEscrow))?;
    require!(campaign_after >= min_balance, GolemError::InsufficientEscrow);
    let participant_after = participant_info
        .lamports()
        .checked_add(reward)
        .ok_or(error!(GolemError::MathOverflow))?;
    **campaign_info.try_borrow_mut_lamports()? = campaign_after;
    **participant_info.try_borrow_mut_lamports()? = participant_after;

    emit!(RewardClaimed {
        campaign: campaign_key,
        asset: asset_key,
        participant: participant_key,
        amount: reward,
    });
    Ok(())
}