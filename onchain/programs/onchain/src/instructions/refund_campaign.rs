use anchor_lang::prelude::*;

use crate::errors::GolemError;
use crate::events::CampaignRefunded;
use crate::state::{Campaign, CampaignStatus, CAMPAIGN_SEED};

#[derive(Accounts)]
pub struct RefundCampaign<'info> {
    #[account(mut)]
    pub company: Signer<'info>,
    #[account(
        mut,
        has_one = company @ GolemError::Unauthorized,
        seeds = [CAMPAIGN_SEED, campaign.company.as_ref(), campaign.campaign_id.to_le_bytes().as_ref()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
}

pub fn refund_campaign_handler(ctx: Context<RefundCampaign>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let campaign_key = ctx.accounts.campaign.key();
    let company_key = ctx.accounts.company.key();
    let campaign = &mut ctx.accounts.campaign;

    require!(
        campaign.status == CampaignStatus::Closed,
        GolemError::InvalidCampaignStatus
    );
    require!(now > campaign.claim_deadline, GolemError::ClaimWindowOpen);
    require!(
        campaign.finalized_asset_count == campaign.expected_asset_count,
        GolemError::AssetsNotFinalized
    );
    campaign.status = CampaignStatus::Settled;

    let campaign_info = ctx.accounts.campaign.to_account_info();
    let company_info = ctx.accounts.company.to_account_info();
    let min_balance = Rent::get()?.minimum_balance(campaign_info.data_len());
    let amount = campaign_info
        .lamports()
        .checked_sub(min_balance)
        .ok_or(error!(GolemError::InsufficientEscrow))?;
    let company_after = company_info
        .lamports()
        .checked_add(amount)
        .ok_or(error!(GolemError::MathOverflow))?;
    **campaign_info.try_borrow_mut_lamports()? = min_balance;
    **company_info.try_borrow_mut_lamports()? = company_after;

    emit!(CampaignRefunded {
        campaign: campaign_key,
        company: company_key,
        amount,
    });
    Ok(())
}