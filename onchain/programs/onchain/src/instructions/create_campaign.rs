use anchor_lang::prelude::*;

use crate::errors::GolemError;
use crate::events::CampaignCreated;
use crate::state::{Campaign, CampaignStatus, CAMPAIGN_SEED, MAX_ASSETS};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub company: Signer<'info>,
    #[account(
        init,
        payer = company,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [CAMPAIGN_SEED, company.key().as_ref(), campaign_id.to_le_bytes().as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    pub system_program: Program<'info, System>,
}

pub fn create_campaign_handler(
    ctx: Context<CreateCampaign>,
    campaign_id: u64,
    expected_asset_count: u32,
    total_budget: u64,
    min_votes: u64,
    voting_deadline: i64,
    claim_deadline: i64,
) -> Result<()> {
    require!(
        expected_asset_count >= 1 && expected_asset_count <= MAX_ASSETS,
        GolemError::InvalidAssetCount
    );
    require!(
        total_budget >= expected_asset_count as u64,
        GolemError::InvalidBudget
    );
    require!(min_votes >= 1, GolemError::InvalidMinVotes);
    let now = Clock::get()?.unix_timestamp;
    require!(
        voting_deadline > now && claim_deadline > voting_deadline,
        GolemError::InvalidDeadlines
    );

    let campaign_key = ctx.accounts.campaign.key();
    let company_key = ctx.accounts.company.key();
    let campaign = &mut ctx.accounts.campaign;
    campaign.company = company_key;
    campaign.campaign_id = campaign_id;
    campaign.total_budget = total_budget;
    campaign.expected_asset_count = expected_asset_count;
    campaign.registered_asset_count = 0;
    campaign.min_votes = min_votes;
    campaign.voting_deadline = voting_deadline;
    campaign.claim_deadline = claim_deadline;
    campaign.status = CampaignStatus::Draft;
    campaign.finalized_asset_count = 0;
    campaign.total_claimed = 0;
    campaign.bump = ctx.bumps.campaign;

    emit!(CampaignCreated {
        campaign: campaign_key,
        company: company_key,
        campaign_id,
        total_budget,
        expected_asset_count,
        min_votes,
        voting_deadline,
        claim_deadline,
    });
    Ok(())
}