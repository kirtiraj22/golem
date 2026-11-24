//! Black Market: Stock Wars - minimal Solana + MagicBlock program.
//!
//! On-chain: per-wallet balance, bid escrow, auction settlement, balance credits for
//! sale proceeds, VRF reveal of storage-unit contents. Everything else (NPCs, timers,
//! catalogues, prices, news, usernames) is off-chain.
//!
//! NOTE: public ER state is NOT private. Nothing here relies on secrecy; the VRF
//! guarantees the contents are unpredictable and verifiable, not hidden.
//!
//! NOT COMPILED OR TESTED. See the accompanying notes for unverified SDK details.

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

// TODO(you): REPLACE with your existing project's program ID (also in Anchor.toml).
// This is the default Anchor placeholder ID, valid but temporary.
declare_id!("GZNyBfvyMZZ67cXugKMz9uagcv2fsWP3F64ZhdAQPEiV");

/// This program's scoped VRF identity PDA, derived at compile time (SDK 0.18 API).
const PROGRAM_IDENTITY: Pubkey = program_identity_pubkey(&crate::ID);

#[ephemeral] // required by the SDK for the commit/undelegate builder
#[program]
pub mod stock_wars {
    use super::*;

    // ------------------------------------------------------------------
    // BASE LAYER (Solana)
    // ------------------------------------------------------------------

    /// Create the wallet's PlayerState on first use; no-op for a returning player.
    ///
    /// TRUST ASSUMPTION (faucet): `starting_balance` is supplied by the caller and is
    /// not validated, so any wallet can mint itself any starting balance. Acceptable
    /// for a hackathon demo; production would require the game authority to co-sign or
    /// fix the amount. The frontend/backend decides the value (nothing hardcoded here).
    ///
    /// Must be called on the base layer while the account is NOT delegated.
    /// Frontend: if the account exists (delegated or not), skip this call.
    pub fn init_player(ctx: Context<InitPlayer>, starting_balance: u64) -> Result<()> {
        let player = &mut ctx.accounts.player_state;
        // Freshly created accounts are zeroed, so authority == default means "new".
        if player.authority == Pubkey::default() {
            player.authority = ctx.accounts.payer.key();
            player.balance = starting_balance;
            player.escrow = 0;
            player.auction_id = 0;
            player.phase = AuctionPhase::Idle;
            player.reveal_nonce = 0;
            player.reveal_random = [0u8; 32];
            player.bump = ctx.bumps.player_state;
        }
        Ok(())
    }

    /// Delegate the player's PDA to the Ephemeral Rollup. An optional validator may be
    /// passed as the first remaining account.
    pub fn delegate_player(ctx: Context<DelegatePlayer>) -> Result<()> {
        let payer_key = ctx.accounts.payer.key();
        ctx.accounts.delegate_player_state(
            &ctx.accounts.payer,
            &[PLAYER_SEED, payer_key.as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    // ------------------------------------------------------------------
    // EPHEMERAL ROLLUP (all instructions below run on the ER)
    // NOTE: the ER does not auto-commit on a timer; balances reach Solana only when
    // `commit_and_undelegate` runs.
    // ------------------------------------------------------------------

    /// Place or raise a bid. `amount` is the NEW TOTAL bid; only the difference is
    /// newly locked. Funds move balance -> escrow, so they can't be spent twice.
    ///
    /// AUCTION IDS MUST INCREASE MONOTONICALLY PER PLAYER: starting a new auction
    /// requires `auction_id > player.auction_id` (the id of the player's previous
    /// auction). The backend must issue strictly increasing ids per wallet.
    pub fn place_bid(ctx: Context<PlaceBid>, auction_id: u64, amount: u64) -> Result<()> {
        let player = &mut ctx.accounts.player_state;

        match player.phase {
            AuctionPhase::Idle | AuctionPhase::Revealed => {
                // Starting a fresh auction. Also rejects id 0 (initial auction_id is 0).
                require!(
                    auction_id > player.auction_id,
                    GameError::AuctionIdNotIncreasing
                );
                player.auction_id = auction_id;
                player.phase = AuctionPhase::Bidding;
                player.reveal_nonce = 0;
                player.reveal_random = [0u8; 32];
            }
            AuctionPhase::Bidding => {
                require!(auction_id == player.auction_id, GameError::AuctionBusy);
            }
            AuctionPhase::Won | AuctionPhase::RevealPending => {
                return err!(GameError::AuctionBusy);
            }
        }

        require!(amount > player.escrow, GameError::BidTooLow);
        let delta = amount
            .checked_sub(player.escrow)
            .ok_or(GameError::MathOverflow)?;
        require!(delta <= player.balance, GameError::InsufficientBalance);

        player.balance = player
            .balance
            .checked_sub(delta)
            .ok_or(GameError::MathOverflow)?;
        player.escrow = amount;
        Ok(())
    }

    /// Finalize the auction result. Callable ONLY by GAME_AUTHORITY (backend signer).
    ///
    /// won = true : the backend-determined `price` is charged from escrow and the
    ///              remainder of the escrow is refunded; phase -> Won. The price comes
    ///              from the backend (not from the player-controlled escrow size) so a
    ///              player cannot underpay by escrowing less than the real winning bid.
    ///              Fails if `price` > escrow (backend should then settle as a loss).
    /// won = false: the whole escrow is refunded; phase -> Idle. `price` is ignored.
    pub fn settle_auction(
        ctx: Context<SettleAuction>,
        auction_id: u64,
        won: bool,
        price: u64,
    ) -> Result<()> {
        let player = &mut ctx.accounts.player_state;
        require!(player.phase == AuctionPhase::Bidding, GameError::InvalidPhase);
        require!(player.auction_id == auction_id, GameError::WrongAuction);

        let refund = if won {
            require!(price <= player.escrow, GameError::PriceExceedsEscrow);
            player
                .escrow
                .checked_sub(price)
                .ok_or(GameError::MathOverflow)?
        } else {
            player.escrow
        };

        player.balance = player
            .balance
            .checked_add(refund)
            .ok_or(GameError::MathOverflow)?;
        player.escrow = 0;
        player.phase = if won {
            AuctionPhase::Won
        } else {
            AuctionPhase::Idle
        };
        Ok(())
    }

    /// Credit in-game currency (e.g. proceeds from selling assets to NPCs / the market).
    /// Callable ONLY by GAME_AUTHORITY. Sales are simulated off-chain, so the backend
    /// is trusted to credit only legitimate amounts. Independent of auction phase.
    pub fn credit_balance(ctx: Context<CreditBalance>, amount: u64) -> Result<()> {
        let player = &mut ctx.accounts.player_state;
        player.balance = player
            .balance
            .checked_add(amount)
            .ok_or(GameError::MathOverflow)?;
        Ok(())
    }

    /// Request VRF randomness for the won storage unit.
    ///
    /// RETRY SEMANTICS (verified from MagicBlock docs: each request is enqueued with a
    /// unique id mixing caller_seed, slot, slot hash, time and queue index, so a repeated
    /// request is NOT deduplicated; every request gets fulfilled and billed separately):
    ///  - first request (phase Won): only the player's wallet may call it.
    ///  - retry (phase RevealPending): only GAME_AUTHORITY may call it, so a player can
    ///    never re-roll. Each request increments `reveal_nonce`, and the callback only
    ///    accepts the CURRENT nonce, so a stale/duplicate in-flight request can still be
    ///    fulfilled by the oracle but its callback is rejected and changes no state.
    pub fn request_reveal(ctx: Context<RequestReveal>, auction_id: u64) -> Result<()> {
        let payer_key = ctx.accounts.payer.key();
        let player_key = ctx.accounts.player_state.key();

        let (authority, nonce) = {
            let player = &mut ctx.accounts.player_state;
            require!(player.auction_id == auction_id, GameError::WrongAuction);
            match player.phase {
                AuctionPhase::Won => {
                    require!(payer_key == player.authority, GameError::UnauthorizedAuthority);
                }
                AuctionPhase::RevealPending => {
                    require!(payer_key == GAME_AUTHORITY, GameError::UnauthorizedAuthority);
                }
                _ => return err!(GameError::InvalidPhase),
            }
            player.phase = AuctionPhase::RevealPending;
            player.reveal_nonce = player
                .reveal_nonce
                .checked_add(1)
                .ok_or(GameError::MathOverflow)?;
            (player.authority, player.reveal_nonce)
        };

        // Per-request entropy: wallet bytes mixed with auction id and nonce.
        let mut caller_seed = authority.to_bytes();
        for (i, b) in auction_id
            .to_le_bytes()
            .iter()
            .chain(nonce.to_le_bytes().iter())
            .enumerate()
        {
            caller_seed[i] ^= *b;
        }

        // Forwarded to the callback after `randomness`: (auction_id: u64, nonce: u32).
        let mut callback_args = auction_id.to_le_bytes().to_vec();
        callback_args.extend_from_slice(&nonce.to_le_bytes());

        let params = RequestRandomnessParams {
            payer: payer_key,
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: crate::instruction::CallbackReveal::DISCRIMINATOR.to_vec(),
            caller_seed,
            // Accounts the callback needs
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: player_key,
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

    /// VRF callback (called by the VRF program; scoped identity enforced by
    /// #[vrf_callback]). Stores the randomness only if it matches the player's pending
    /// auction id AND the current request nonce.
    pub fn callback_reveal(
        ctx: Context<CallbackReveal>,
        randomness: [u8; 32],
        auction_id: u64,
        nonce: u32,
    ) -> Result<()> {
        let player = &mut ctx.accounts.player_state;
        require!(
            player.phase == AuctionPhase::RevealPending,
            GameError::InvalidPhase
        );
        require!(player.auction_id == auction_id, GameError::WrongAuction);
        require!(player.reveal_nonce == nonce, GameError::StaleRevealRequest);

        player.reveal_random = randomness;
        player.phase = AuctionPhase::Revealed;
        Ok(())
    }

    /// Commit state to Solana and undelegate. Refused while a VRF reveal is pending
    /// (the callback must land on the ER while the account is still delegated).
    pub fn commit_and_undelegate(ctx: Context<CommitAndUndelegate>) -> Result<()> {
        require!(
            ctx.accounts.player_state.phase != AuctionPhase::RevealPending,
            GameError::RevealPending
        );
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.player_state.to_account_info()])
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

#[delegate] // injects delegation buffer/record/metadata/program accounts
#[derive(Accounts)]
pub struct DelegatePlayer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: the caller's own PlayerState PDA (seeds include the signer).
    #[account(mut, del, seeds = [PLAYER_SEED, payer.key().as_ref()], bump)]
    pub player_state: AccountInfo<'info>,
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
}

#[derive(Accounts)]
pub struct SettleAuction<'info> {
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
pub struct CreditBalance<'info> {
    #[account(address = GAME_AUTHORITY @ GameError::UnauthorizedAuthority)]
    pub game_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, player_state.authority.as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
}

#[vrf] // injects program_identity, vrf_program, slot_hashes, system_program + invoke_signed_vrf
#[derive(Accounts)]
pub struct RequestReveal<'info> {
    /// The player's wallet (first request) or GAME_AUTHORITY (retry); checked in the handler.
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, player_state.authority.as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
    /// CHECK: VRF oracle queue; this runs on the ER, so only the delegated queues are allowed.
    #[account(
        mut,
        constraint = oracle_queue.key() == vrf::consts::DEFAULT_EPHEMERAL_QUEUE
            || oracle_queue.key() == vrf::consts::DEFAULT_EPHEMERAL_TEST_QUEUE
    )]
    pub oracle_queue: UncheckedAccount<'info>,
}

#[vrf_callback] // injects `vrf_program_identity: Signer` bound to this program's scoped VRF identity
#[derive(Accounts)]
pub struct CallbackReveal<'info> {
    #[account(
        mut,
        seeds = [PLAYER_SEED, player_state.authority.as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
}

#[commit] // injects magic_context + magic_program
#[derive(Accounts)]
pub struct CommitAndUndelegate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, payer.key().as_ref()],
        bump = player_state.bump
    )]
    pub player_state: Account<'info, PlayerState>,
}