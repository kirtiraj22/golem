use anchor_lang::prelude::*;

use crate::errors::GolemError;
use crate::events::VoteCast;
use crate::state::{
    Asset, Campaign, CampaignStatus, Classification, Vote, ASSET_SEED, CAMPAIGN_SEED, VOTE_SEED,
};

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,
    #[account(
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
        init,
        payer = participant,
        space = 8 + Vote::INIT_SPACE,
        seeds = [VOTE_SEED, asset.key().as_ref(), participant.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, Vote>,
    pub system_program: Program<'info, System>,
}

pub fn cast_vote_handler(ctx: Context<CastVote>, classification: Classification) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let campaign = &ctx.accounts.campaign;
    require!(
        campaign.status == CampaignStatus::Active && now < campaign.voting_deadline,
        GolemError::VotingNotOpen
    );

    let asset_key = ctx.accounts.asset.key();
    let campaign_key = ctx.accounts.campaign.key();
    let participant_key = ctx.accounts.participant.key();
    let asset = &mut ctx.accounts.asset;
    match classification {
        Classification::AiGenerated => {
            asset.ai_votes = asset
                .ai_votes
                .checked_add(1)
                .ok_or(error!(GolemError::MathOverflow))?;
        }
        Classification::HumanCreated => {
            asset.human_votes = asset
                .human_votes
                .checked_add(1)
                .ok_or(error!(GolemError::MathOverflow))?;
        }
    }
    asset.total_votes = asset
        .total_votes
        .checked_add(1)
        .ok_or(error!(GolemError::MathOverflow))?;

    let vote = &mut ctx.accounts.vote;
    vote.asset = asset_key;
    vote.participant = participant_key;
    vote.classification = classification;
    vote.claimed = false;
    vote.bump = ctx.bumps.vote;

    emit!(VoteCast {
        campaign: campaign_key,
        asset: asset_key,
        participant: participant_key,
        classification,
        ai_votes: ctx.accounts.asset.ai_votes,
        human_votes: ctx.accounts.asset.human_votes,
        total_votes: ctx.accounts.asset.total_votes,
    });
    Ok(())
}