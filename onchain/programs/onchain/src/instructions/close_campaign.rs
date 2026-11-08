use anchor_lang::prelude::*;

use crate::errors::GolemError;
use crate::events::CampaignClosed;
use crate::state::{Campaign, CampaignStatus, CAMPAIGN_SEED};

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [CAMPAIGN_SEED, campaign.company.as_ref(), campaign.campaign_id.to_le_bytes().as_ref()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
}

pub fn close_campaign_handler(ctx: Context<CloseCampaign>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let caller_key = ctx.accounts.caller.key();
    let campaign_key = ctx.accounts.campaign.key();
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.status == CampaignStatus::Active,
        GolemError::InvalidCampaignStatus
    );
    require!(
        caller_key == campaign.company || now >= campaign.voting_deadline,
        GolemError::Unauthorized
    );
    campaign.status = CampaignStatus::Closed;

    emit!(CampaignClosed {
        campaign: campaign_key,
        closed_by: caller_key,
    });
    Ok(())
}