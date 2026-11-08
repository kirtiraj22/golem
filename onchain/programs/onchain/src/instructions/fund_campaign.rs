use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::errors::GolemError;
use crate::events::CampaignFunded;
use crate::state::{Campaign, CampaignStatus, CAMPAIGN_SEED};

#[derive(Accounts)]
pub struct FundCampaign<'info> {
    #[account(mut)]
    pub company: Signer<'info>,
    #[account(
        mut,
        has_one = company @ GolemError::Unauthorized,
        seeds = [CAMPAIGN_SEED, campaign.company.as_ref(), campaign.campaign_id.to_le_bytes().as_ref()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    pub system_program: Program<'info, System>,
}

pub fn fund_campaign_handler(ctx: Context<FundCampaign>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.status == CampaignStatus::Draft,
        GolemError::InvalidCampaignStatus
    );
    require!(
        campaign.registered_asset_count == campaign.expected_asset_count,
        GolemError::AssetsNotAllRegistered
    );
    require!(now < campaign.voting_deadline, GolemError::VotingNotOpen);
    campaign.status = CampaignStatus::Active;
    let amount = campaign.total_budget;

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.company.to_account_info(),
                to: ctx.accounts.campaign.to_account_info(),
            },
        ),
        amount,
    )?;

    emit!(CampaignFunded {
        campaign: ctx.accounts.campaign.key(),
        company: ctx.accounts.company.key(),
        amount,
    });
    Ok(())
}