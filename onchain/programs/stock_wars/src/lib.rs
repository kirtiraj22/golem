use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral, vrf, vrf_callback};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;
use ephemeral_rollups_sdk::vrf::{
    self,
    consts::program_identity_pubkey,
    instructions::{create_request_randomness_ix_const, RequestRandomnessParams},
    types::SerializableAccountMeta,
};

pub mod constants;
pub mod errors;
pub mod state;

use constants::*;
use errors::GameError;
use state::*;

// Program ID unchanged from your file.
declare_id!("GZNyBfvyMZZ67cXugKMz9uagcv2fsWP3F64ZhdAQPEiV");

const PROGRAM_IDENTITY: Pubkey = program_identity_pubkey(&crate::ID);

#[ephemeral]
#[program]
pub mod stock_wars {
    use super::*;

    // ================= BASE LAYER (account NOT delegated) =================

    /// Create the wallet's PlayerState with balance 0 (no faucet: the caller can no longer
    /// choose its own balance). The backend then seeds the balance from the existing
    /// Supabase save via `apply_delta` (nonce 1). No-op for a returning player.
    pub fn init_player(ctx: Context<InitPlayer>) -> Result<()> {
        let p = &mut ctx.accounts.player_state;
        if p.authority == Pubkey::default() {
            p.authority = ctx.accounts.payer.key();
            p.balance = 0;
            p.sync_nonce = 0;
            p.bump = ctx.bumps.player_state;
        }
        Ok(())
    }

    pub fn delegate_player(ctx: Context<DelegatePlayer>) -> Result<()> {
        let k = ctx.accounts.payer.key();
        ctx.accounts.delegate_player_state(
            &ctx.accounts.payer,
            &[PLAYER_SEED, k.as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|a| a.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Create this player's bid account for one lot. Bundle with `delegate_lot_bid` in ONE
    /// transaction (one wallet approval) before the first bid on that lot.
    pub fn init_lot_bid(ctx: Context<InitLotBid>, listing: u64) -> Result<()> {
        let l = &mut ctx.accounts.lot_bid;
        if l.player == Pubkey::default() {
            l.player = ctx.accounts.payer.key();
            l.listing = listing;
            l.escrow = 0;
            l.rival_bid = 0;
            l.price_paid = 0;
            l.status = LotStatus::Open;
            l.reveal = RevealState::None;
            l.reveal_nonce = 0;
            l.reveal_random = [0u8; 32];
            l.bump = ctx.bumps.lot_bid;
        }
        Ok(())
    }

    pub fn delegate_lot_bid(ctx: Context<DelegateLotBid>, listing: u64) -> Result<()> {
        let k = ctx.accounts.payer.key();
        ctx.accounts.delegate_lot_bid(
            &ctx.accounts.payer,
            &[LOT_SEED, k.as_ref(), &listing.to_le_bytes()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|a| a.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Reclaim rent once a lot is finished and undelegated (Lost, or Won + revealed).
    pub fn close_lot_bid(ctx: Context<CloseLotBid>) -> Result<()> {
        let l = &ctx.accounts.lot_bid;
        require!(
            l.status == LotStatus::Lost
                || (l.status == LotStatus::Won && l.reveal == RevealState::Done),
            GameError::CannotClose
        );
        Ok(())
    }

    // ================= GAME AUTHORITY (works on whichever layer the account lives) =================

    /// Apply ONE off-chain balance change atomically: `credit` first, then `debit`.
    /// Covers every non-auction currency mutation in state.ts: sell (credit), sell-good (credit),
    /// buy-good (debit), plus the initial import of an existing save.
    /// `nonce` must be exactly sync_nonce+1, so a retried backend call can never double-apply.
    /// TRUST: the backend can move a player's FREE balance only (never escrow), and only through
    /// this narrow instruction. It cannot touch a bid already locked in a lot.
    pub fn apply_delta(ctx: Context<ApplyDelta>, nonce: u64, credit: u64, debit: u64) -> Result<()> {
        let p = &mut ctx.accounts.player_state;
        require!(
            nonce == p.sync_nonce.checked_add(1).ok_or(GameError::MathOverflow)?,
            GameError::BadSyncNonce
        );
        p.balance = p
            .balance
            .checked_add(credit)
            .ok_or(GameError::MathOverflow)?
            .checked_sub(debit)
            .ok_or(GameError::InsufficientBalance)?;
        p.sync_nonce = nonce;
        Ok(())
    }

    // ================= EPHEMERAL ROLLUP (both accounts delegated) =================

    /// Place or raise a bid. `amount` is the NEW TOTAL bid on this lot; only the increase is
    /// newly locked (balance -> escrow), so funds cannot be spent twice. Per-lot escrow lets a
    /// player hold bids on several lots simultaneously.
    /// The "must beat the current/rival bid" rule stays off-chain (the rival is simulated):
    /// an under-rival bid cannot win and is fully refunded at settlement, so it can't hurt anyone.
    pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
        let p = &mut ctx.accounts.player_state;
        let l = &mut ctx.accounts.lot_bid;
        require!(l.status == LotStatus::Open, GameError::LotClosed);
        require!(amount <= MAX_BID, GameError::BidTooHigh);
        require!(amount > l.escrow, GameError::BidTooLow);
        let delta = amount.checked_sub(l.escrow).ok_or(GameError::MathOverflow)?;
        require!(delta <= p.balance, GameError::InsufficientBalance);
        p.balance = p.balance.checked_sub(delta).ok_or(GameError::MathOverflow)?;
        l.escrow = amount;
        Ok(())
    }

    /// Close a lot. Callable ONLY by GAME_AUTHORITY, once the backend's clock says the lot ended.
    /// The backend supplies ONLY the rival's final bid; the contract derives the winner and the
    /// price from the on-chain escrow (same rule as refreshLots: escrow > 0 && escrow > rival_bid).
    /// Won : escrow is consumed as the price (it was already deducted at bid time).
    /// Lost: escrow is refunded to the player's balance.
    pub fn settle_lot(ctx: Context<SettleLot>, rival_bid: u64) -> Result<()> {
        let p = &mut ctx.accounts.player_state;
        let l = &mut ctx.accounts.lot_bid;
        require!(l.status == LotStatus::Open, GameError::LotClosed);
        l.rival_bid = rival_bid;
        if l.escrow > 0 && l.escrow > rival_bid {
            l.status = LotStatus::Won;
            l.price_paid = l.escrow;
        } else {
            l.status = LotStatus::Lost;
            p.balance = p.balance.checked_add(l.escrow).ok_or(GameError::MathOverflow)?;
        }
        l.escrow = 0;
        Ok(())
    }

    /// Request VRF randomness for a WON lot.
    /// First request: the lot's owner only. Retry while Pending: GAME_AUTHORITY only (no re-rolls).
    /// Each request bumps `reveal_nonce`; the callback accepts only the current nonce.
    pub fn request_reveal(ctx: Context<RequestReveal>) -> Result<()> {
        let payer_key = ctx.accounts.payer.key();
        let lot_key = ctx.accounts.lot_bid.key();
        let (player, listing, nonce) = {
            let l = &mut ctx.accounts.lot_bid;
            require!(l.status == LotStatus::Won, GameError::LotNotWon);
            match l.reveal {
                RevealState::None => {
                    require!(payer_key == l.player, GameError::NotLotOwner)
                }
                RevealState::Pending => {
                    require!(payer_key == GAME_AUTHORITY, GameError::UnauthorizedAuthority)
                }
                RevealState::Done => return err!(GameError::RevealAlreadyRequested),
            }
            l.reveal = RevealState::Pending;
            l.reveal_nonce = l.reveal_nonce.checked_add(1).ok_or(GameError::MathOverflow)?;
            (l.player, l.listing, l.reveal_nonce)
        };

        let mut caller_seed = player.to_bytes();
        for (i, b) in listing
            .to_le_bytes()
            .iter()
            .chain(nonce.to_le_bytes().iter())
            .enumerate()
        {
            caller_seed[i] ^= *b;
        }

        // Forwarded to the callback after `randomness`: (nonce: u32).
        let callback_args = nonce.to_le_bytes().to_vec();

        let params = RequestRandomnessParams {
            payer: payer_key,
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: crate::instruction::CallbackReveal::DISCRIMINATOR.to_vec(),
            caller_seed,
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: lot_key,
                is_signer: false,
                is_writable: true,
            }]),
            callback_args: Some(callback_args),
            ..Default::default()
        };
        let ix = create_request_randomness_ix_const(params, PROGRAM_IDENTITY);
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    /// VRF callback. Stores randomness only if a request is pending AND nonce is current.
    pub fn callback_reveal(
        ctx: Context<CallbackReveal>,
        randomness: [u8; 32],
        nonce: u32,
    ) -> Result<()> {
        let l = &mut ctx.accounts.lot_bid;
        require!(l.reveal == RevealState::Pending, GameError::RevealNotRequested);
        require!(l.reveal_nonce == nonce, GameError::StaleRevealRequest);
        l.reveal_random = randomness;
        l.reveal = RevealState::Done;
        Ok(())
    }

    /// Commit + undelegate the player's balance account (does not depend on any lot).
    pub fn commit_and_undelegate_player(ctx: Context<CommitPlayer>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.player_state.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    /// Commit + undelegate a finished lot. Refused while Open or while a reveal is pending
    /// (the VRF callback must land while the account is still delegated).
    pub fn commit_and_undelegate_lot(ctx: Context<CommitLot>) -> Result<()> {
        let l = &ctx.accounts.lot_bid;
        require!(l.status != LotStatus::Open, GameError::LotStillOpen);
        require!(l.reveal != RevealState::Pending, GameError::RevealPending);
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.lot_bid.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

// ----------------------------------------------------------------------
// Account contexts
// ----------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitPlayer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + PlayerState::INIT_SPACE,
        seeds = [PLAYER_SEED, payer.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegatePlayer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: caller's own PlayerState PDA (seeds include the signer).
    #[account(mut, del, seeds = [PLAYER_SEED, payer.key().as_ref()], bump)]
    pub player_state: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(listing: u64)]
pub struct InitLotBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + LotBid::INIT_SPACE,
        seeds = [LOT_SEED, payer.key().as_ref(), &listing.to_le_bytes()],
        bump
    )]
    pub lot_bid: Account<'info, LotBid>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(listing: u64)]
pub struct DelegateLotBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: caller's own LotBid PDA (seeds include the signer and listing).
    #[account(mut, del, seeds = [LOT_SEED, payer.key().as_ref(), &listing.to_le_bytes()], bump)]
    pub lot_bid: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CloseLotBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        close = payer,
        constraint = lot_bid.player == payer.key() @ GameError::NotLotOwner,
        seeds = [LOT_SEED, lot_bid.player.as_ref(), &lot_bid.listing.to_le_bytes()],
        bump = lot_bid.bump
    )]
    pub lot_bid: Account<'info, LotBid>,
}

#[derive(Accounts)]
pub struct ApplyDelta<'info> {
    #[account(address = GAME_AUTHORITY @ GameError::UnauthorizedAuthority)]
    pub game_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, player_state.authority.as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, payer.key().as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(
        mut,
        constraint = lot_bid.player == payer.key() @ GameError::NotLotOwner,
        seeds = [LOT_SEED, lot_bid.player.as_ref(), &lot_bid.listing.to_le_bytes()],
        bump = lot_bid.bump
    )]
    pub lot_bid: Account<'info, LotBid>,
}

#[derive(Accounts)]
pub struct SettleLot<'info> {
    #[account(address = GAME_AUTHORITY @ GameError::UnauthorizedAuthority)]
    pub game_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, lot_bid.player.as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(
        mut,
        seeds = [LOT_SEED, lot_bid.player.as_ref(), &lot_bid.listing.to_le_bytes()],
        bump = lot_bid.bump
    )]
    pub lot_bid: Account<'info, LotBid>,
}

#[vrf]
#[derive(Accounts)]
pub struct RequestReveal<'info> {
    /// Lot owner (first request) or GAME_AUTHORITY (retry); checked in the handler.
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [LOT_SEED, lot_bid.player.as_ref(), &lot_bid.listing.to_le_bytes()],
        bump = lot_bid.bump
    )]
    pub lot_bid: Account<'info, LotBid>,
    /// CHECK: VRF oracle queue; only the delegated ER queues are allowed.
    #[account(
        mut,
        constraint = oracle_queue.key() == vrf::consts::DEFAULT_EPHEMERAL_QUEUE
            || oracle_queue.key() == vrf::consts::DEFAULT_EPHEMERAL_TEST_QUEUE
    )]
    pub oracle_queue: UncheckedAccount<'info>,
}

#[vrf_callback]
#[derive(Accounts)]
pub struct CallbackReveal<'info> {
    #[account(
        mut,
        seeds = [LOT_SEED, lot_bid.player.as_ref(), &lot_bid.listing.to_le_bytes()],
        bump = lot_bid.bump
    )]
    pub lot_bid: Account<'info, LotBid>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitPlayer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, payer.key().as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitLot<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        constraint = lot_bid.player == payer.key() @ GameError::NotLotOwner,
        seeds = [LOT_SEED, lot_bid.player.as_ref(), &lot_bid.listing.to_le_bytes()],
        bump = lot_bid.bump
    )]
    pub lot_bid: Account<'info, LotBid>,
}