use anchor_lang::prelude::*;

use crate::errors::GolemError;
use crate::events::AssetRegistered;
use crate::state::{Asset, AssetResult, Campaign, CampaignStatus, ASSET_SEED, CAMPAIGN_SEED};

#[derive(Accounts)]
#[instruction(asset_index: u32)]
pub struct RegisterAsset<'info> {
    #[account(mut)]
    pub company: Signer<'info>,
    #[account(
        mut,
        has_one = company @ GolemError::Unauthorized,
        seeds = [CAMPAIGN_SEED, campaign.company.as_ref(), campaign.campaign_id.to_le_bytes().as_ref()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init,
        payer = company,
        space = 8 + Asset::INIT_SPACE,
        seeds = [ASSET_SEED, campaign.key().as_ref(), asset_index.to_le_bytes().as_ref()],
        bump
    )]
    pub asset: Account<'info, Asset>,
    pub system_program: Program<'info, System>,
}

pub fn register_asset_handler(
    ctx: Context<RegisterAsset>,
    asset_index: u32,
    content_hash: [u8; 32],
) -> Result<()> {
    let campaign_key = ctx.accounts.campaign.key();
    let asset_key = ctx.accounts.asset.key();
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.status == CampaignStatus::Draft,
        GolemError::InvalidCampaignStatus
    );
    require!(
        campaign.registered_asset_count < campaign.expected_asset_count,
        GolemError::AllAssetsRegistered
    );
    require!(
        asset_index == campaign.registered_asset_count,
        GolemError::InvalidAssetIndex
    );
    campaign.registered_asset_count = campaign
        .registered_asset_count
        .checked_add(1)
        .ok_or(error!(GolemError::MathOverflow))?;

    let asset = &mut ctx.accounts.asset;
    asset.campaign = campaign_key;
    asset.asset_index = asset_index;
    asset.content_hash = content_hash;
    asset.ai_votes = 0;
    asset.human_votes = 0;
    asset.total_votes = 0;
    asset.result = AssetResult::Pending;
    asset.winning_votes = 0;
    asset.reward_pool = 0;
    asset.total_claimed = 0;
    asset.finalized = false;
    asset.bump = ctx.bumps.asset;

    emit!(AssetRegistered {
        campaign: campaign_key,
        asset: asset_key,
        asset_index,
        content_hash,
    });
    Ok(())
}