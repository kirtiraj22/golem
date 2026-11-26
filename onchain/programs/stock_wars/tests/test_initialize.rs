//! Local instruction-level tests (LiteSVM) against the compiled SBF binary built with
//! `--features test-authority`. These run the REAL program bytecode but WITHOUT MagicBlock:
//! accounts are never delegated, so this verifies pure game logic and account constraints only.
//! NOT covered here (needs devnet / ER): delegate_*, commit_and_undelegate_*, request_reveal's
//! VRF CPI, callback_reveal, ER transaction semantics.
use anchor_lang::{
    solana_program::{instruction::Instruction, system_program},
    AccountDeserialize, InstructionData, ToAccountMetas,
};
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;
use stock_wars::{constants::*, errors::GameError, state::*};

const SO: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../out-test/stock_wars.so");

fn err_code(e: GameError) -> String {
    format!("Custom({})", 6000 + e as u32)
}

struct Env {
    svm: LiteSVM,
    auth: Keypair,
}

impl Env {
    fn new() -> Self {
        let mut svm = LiteSVM::new();
        svm.add_program_from_file(stock_wars::ID, SO).unwrap();
        let auth = Keypair::new_from_array([7u8; 32]);
        assert_eq!(auth.pubkey(), GAME_AUTHORITY, "build the .so with --features test-authority");
        svm.airdrop(&auth.pubkey(), 10_000_000_000).unwrap();
        Env { svm, auth }
    }
    fn player(&mut self) -> Keypair {
        let k = Keypair::new();
        self.svm.airdrop(&k.pubkey(), 10_000_000_000).unwrap();
        k
    }
    fn send(&mut self, ix: Instruction, payer: &Keypair) -> Result<(), String> {
        self.svm.expire_blockhash(); // makes identical txs distinct (no AlreadyProcessed)
        let tx = Transaction::new(
            &[payer],
            Message::new(&[ix], Some(&payer.pubkey())),
            self.svm.latest_blockhash(),
        );
        self.svm.send_transaction(tx).map(|_| ()).map_err(|e| format!("{:?}", e.err))
    }
    fn expect_err(&mut self, ix: Instruction, payer: &Keypair, want: GameError) {
        let e = self.send(ix, payer).expect_err("expected failure");
        assert!(e.contains(&err_code(want)), "wanted {:?}, got {}", want, e);
    }
    fn player_pda(w: &solana_keypair::Keypair) -> anchor_lang::prelude::Pubkey {
        anchor_lang::prelude::Pubkey::find_program_address(&[PLAYER_SEED, w.pubkey().as_ref()], &stock_wars::ID).0
    }
    fn lot_pda(w: &anchor_lang::prelude::Pubkey, listing: u64) -> anchor_lang::prelude::Pubkey {
        anchor_lang::prelude::Pubkey::find_program_address(
            &[LOT_SEED, w.as_ref(), &listing.to_le_bytes()],
            &stock_wars::ID,
        )
        .0
    }
    fn ps(&self, w: &Keypair) -> PlayerState {
        let a = self.svm.get_account(&Self::player_pda(w)).unwrap();
        PlayerState::try_deserialize(&mut &a.data[..]).unwrap()
    }
    fn lot(&self, w: &Keypair, listing: u64) -> LotBid {
        let a = self.svm.get_account(&Self::lot_pda(&w.pubkey(), listing)).unwrap();
        LotBid::try_deserialize(&mut &a.data[..]).unwrap()
    }

    // ---- instruction builders ----
    fn init_player(&mut self, w: &Keypair) {
        let ix = Instruction {
            program_id: stock_wars::ID,
            accounts: stock_wars::accounts::InitPlayer {
                payer: w.pubkey(),
                player_state: Self::player_pda(w),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: stock_wars::instruction::InitPlayer {}.data(),
        };
        self.send(ix, w).unwrap();
    }
    fn init_lot(&mut self, w: &Keypair, listing: u64) {
        let ix = Instruction {
            program_id: stock_wars::ID,
            accounts: stock_wars::accounts::InitLotBid {
                payer: w.pubkey(),
                lot_bid: Self::lot_pda(&w.pubkey(), listing),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: stock_wars::instruction::InitLotBid { listing }.data(),
        };
        self.send(ix, w).unwrap();
    }
    fn delta_ix(&self, w: &Keypair, nonce: u64, credit: u64, debit: u64) -> Instruction {
        Instruction {
            program_id: stock_wars::ID,
            accounts: stock_wars::accounts::ApplyDelta {
                game_authority: self.auth.pubkey(),
                player_state: Self::player_pda(w),
            }
            .to_account_metas(None),
            data: stock_wars::instruction::ApplyDelta { nonce, credit, debit }.data(),
        }
    }
    fn delta(&mut self, w: &Keypair, nonce: u64, credit: u64, debit: u64) -> Result<(), String> {
        let ix = self.delta_ix(w, nonce, credit, debit);
        let a = Keypair::new_from_array([7u8; 32]);
        self.send(ix, &a)
    }
    fn bid_ix(&self, signer: &Keypair, player_pda_of: &Keypair, lot_owner: &Keypair, listing: u64, amount: u64) -> Instruction {
        Instruction {
            program_id: stock_wars::ID,
            accounts: stock_wars::accounts::PlaceBid {
                payer: signer.pubkey(),
                player_state: Self::player_pda(player_pda_of),
                lot_bid: Self::lot_pda(&lot_owner.pubkey(), listing),
            }
            .to_account_metas(None),
            data: stock_wars::instruction::PlaceBid { amount }.data(),
        }
    }
    fn bid(&mut self, w: &Keypair, listing: u64, amount: u64) -> Result<(), String> {
        let ix = self.bid_ix(w, w, w, listing, amount);
        self.send(ix, w)
    }
    fn settle_ix(&self, signer: &Keypair, player_of: &Keypair, lot_owner: &Keypair, listing: u64, rival: u64) -> Instruction {
        Instruction {
            program_id: stock_wars::ID,
            accounts: stock_wars::accounts::SettleLot {
                game_authority: signer.pubkey(),
                player_state: Self::player_pda(player_of),
                lot_bid: Self::lot_pda(&lot_owner.pubkey(), listing),
            }
            .to_account_metas(None),
            data: stock_wars::instruction::SettleLot { rival_bid: rival }.data(),
        }
    }
    fn settle(&mut self, w: &Keypair, listing: u64, rival: u64) -> Result<(), String> {
        let a = Keypair::new_from_array([7u8; 32]);
        let ix = self.settle_ix(&a, w, w, listing, rival);
        self.send(ix, &a)
    }
    /// player with `coins` balance (seeded via nonce 1) and lots 1..=n initialised
    fn seeded(&mut self, coins: u64, lots: u64) -> Keypair {
        let w = self.player();
        self.init_player(&w);
        self.delta(&w, 1, coins, 0).unwrap();
        for l in 1..=lots {
            self.init_lot(&w, l);
        }
        w
    }
}

// ---------------- init / seeding ----------------

#[test]
fn init_player_starts_at_zero_and_is_noop_on_repeat() {
    let mut e = Env::new();
    let w = e.player();
    e.init_player(&w);
    let p = e.ps(&w);
    assert_eq!((p.balance, p.sync_nonce, p.authority), (0, 0, w.pubkey()));
    e.delta(&w, 1, 500, 0).unwrap();
    e.init_player(&w); // must not reset
    assert_eq!(e.ps(&w).balance, 500);
}

#[test]
fn only_game_authority_can_seed_or_adjust_balance() {
    let mut e = Env::new();
    let w = e.player();
    e.init_player(&w);
    // the player itself tries to sign as "game_authority"
    let ix = Instruction {
        program_id: stock_wars::ID,
        accounts: stock_wars::accounts::ApplyDelta {
            game_authority: w.pubkey(),
            player_state: Env::player_pda(&w),
        }
        .to_account_metas(None),
        data: stock_wars::instruction::ApplyDelta { nonce: 1, credit: 1_000_000, debit: 0 }.data(),
    };
    e.expect_err(ix, &w, GameError::UnauthorizedAuthority);
    assert_eq!(e.ps(&w).balance, 0);
}

// ---------------- apply_delta: nonce / idempotency / escrow safety ----------------

#[test]
fn apply_delta_nonce_is_strict_and_retry_is_idempotent() {
    let mut e = Env::new();
    let w = e.player();
    e.init_player(&w);
    assert!(e.delta(&w, 2, 100, 0).unwrap_err().contains(&err_code(GameError::BadSyncNonce))); // skip ahead
    assert!(e.delta(&w, 0, 100, 0).unwrap_err().contains(&err_code(GameError::BadSyncNonce))); // zero
    e.delta(&w, 1, 2400, 0).unwrap();
    // duplicate / retried request with the SAME nonce is rejected: no double credit
    assert!(e.delta(&w, 1, 2400, 0).unwrap_err().contains(&err_code(GameError::BadSyncNonce)));
    assert_eq!(e.ps(&w).balance, 2400);
    e.delta(&w, 2, 100, 40).unwrap(); // credit then debit in one atomic op
    assert_eq!((e.ps(&w).balance, e.ps(&w).sync_nonce), (2460, 2));
    // out-of-order (old nonce arrives late) is rejected
    assert!(e.delta(&w, 1, 5, 0).unwrap_err().contains(&err_code(GameError::BadSyncNonce)));
    assert_eq!(e.ps(&w).balance, 2460);
}

#[test]
fn apply_delta_failure_does_not_advance_nonce() {
    let mut e = Env::new();
    let w = e.seeded(100, 0);
    assert!(e.delta(&w, 2, 0, 101).unwrap_err().contains(&err_code(GameError::InsufficientBalance)));
    let p = e.ps(&w);
    assert_eq!((p.balance, p.sync_nonce), (100, 1)); // nonce 2 still available for the corrected retry
    e.delta(&w, 2, 0, 100).unwrap();
    assert_eq!(e.ps(&w).balance, 0);
}

#[test]
fn apply_delta_overflow_rejected() {
    let mut e = Env::new();
    let w = e.seeded(10, 0);
    assert!(e.delta(&w, 2, u64::MAX, 0).is_err());
    assert_eq!(e.ps(&w).balance, 10);
}

#[test]
fn debit_cannot_consume_locked_escrow() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    e.bid(&w, 1, 800).unwrap(); // free = 200, escrow = 800
    assert!(e.delta(&w, 2, 0, 300).unwrap_err().contains(&err_code(GameError::InsufficientBalance)));
    assert_eq!(e.lot(&w, 1).escrow, 800);
    e.delta(&w, 2, 0, 200).unwrap();
    assert_eq!((e.ps(&w).balance, e.lot(&w, 1).escrow), (0, 800));
}

// ---------------- place_bid ----------------

#[test]
fn bid_locks_only_the_increase_and_must_strictly_rise() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    e.bid(&w, 1, 300).unwrap();
    assert_eq!((e.ps(&w).balance, e.lot(&w, 1).escrow), (700, 300));
    e.bid(&w, 1, 500).unwrap(); // only +200 newly locked
    assert_eq!((e.ps(&w).balance, e.lot(&w, 1).escrow), (500, 500));
    for same_or_lower in [500u64, 499, 0] {
        assert!(e.bid(&w, 1, same_or_lower).unwrap_err().contains(&err_code(GameError::BidTooLow)));
    }
    assert_eq!((e.ps(&w).balance, e.lot(&w, 1).escrow), (500, 500));
}

#[test]
fn bid_rejects_insufficient_balance_and_house_limit() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    assert!(e.bid(&w, 1, 1001).unwrap_err().contains(&err_code(GameError::InsufficientBalance)));
    e.delta(&w, 2, 10_000_000, 0).unwrap();
    assert!(e.bid(&w, 1, MAX_BID + 1).unwrap_err().contains(&err_code(GameError::BidTooHigh)));
    e.bid(&w, 1, MAX_BID).unwrap();
    assert_eq!(e.ps(&w).balance, 1000 + 10_000_000 - MAX_BID);
}

#[test]
fn cannot_bid_with_someone_elses_lot_or_balance() {
    let mut e = Env::new();
    let alice = e.seeded(1000, 1);
    let bob = e.seeded(1000, 1);
    // bob signs, but points at alice's lot
    let ix = e.bid_ix(&bob, &bob, &alice, 1, 100);
    e.expect_err(ix, &bob, GameError::NotLotOwner);
    // bob signs, uses alice's player_state: PDA seed (payer) mismatch -> constraint error
    let ix = e.bid_ix(&bob, &alice, &bob, 1, 100);
    assert!(e.send(ix, &bob).is_err());
    assert_eq!((e.ps(&alice).balance, e.lot(&alice, 1).escrow), (1000, 0));
    assert_eq!((e.ps(&bob).balance, e.lot(&bob, 1).escrow), (1000, 0));
}

#[test]
fn bid_on_uninitialised_lot_fails() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    assert!(e.bid(&w, 99, 100).is_err());
    assert_eq!(e.ps(&w).balance, 1000);
}

// ---------------- multiple simultaneous lots ----------------

#[test]
fn multiple_lots_hold_independent_escrows_and_conserve_coins() {
    let mut e = Env::new();
    let w = e.seeded(2400, 3);
    e.bid(&w, 1, 500).unwrap();
    e.bid(&w, 2, 700).unwrap();
    e.bid(&w, 3, 300).unwrap();
    e.bid(&w, 2, 900).unwrap(); // raise one of them
    assert_eq!((e.lot(&w, 1).escrow, e.lot(&w, 2).escrow, e.lot(&w, 3).escrow), (500, 900, 300));
    assert_eq!(e.ps(&w).balance, 2400 - 500 - 900 - 300);
    // 700 free left: can't open a bid that exceeds it
    assert!(e.bid(&w, 1, 1300).unwrap_err().contains(&err_code(GameError::InsufficientBalance)));

    // settle: lot1 won (rival 400), lot2 lost (rival 1000), lot3 tie (rival 300 -> lost)
    e.settle(&w, 1, 400).unwrap();
    e.settle(&w, 2, 1000).unwrap();
    e.settle(&w, 3, 300).unwrap();
    assert_eq!(e.lot(&w, 1).status, LotStatus::Won);
    assert_eq!(e.lot(&w, 2).status, LotStatus::Lost);
    assert_eq!(e.lot(&w, 3).status, LotStatus::Lost);
    // coins: start 2400, only lot1's 500 was spent
    assert_eq!(e.ps(&w).balance, 2400 - 500);
    assert_eq!(e.lot(&w, 1).price_paid, 500);
}

// ---------------- settle_lot ----------------

#[test]
fn settle_win_charges_escrow_as_price_without_extra_debit() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    e.bid(&w, 1, 600).unwrap();
    e.settle(&w, 1, 599).unwrap();
    let l = e.lot(&w, 1);
    assert_eq!((l.status, l.escrow, l.price_paid, l.rival_bid), (LotStatus::Won, 0, 600, 599));
    assert_eq!(e.ps(&w).balance, 400); // unchanged by settlement: already paid at bid time
}

#[test]
fn settle_loss_refunds_full_deposit_and_tie_goes_to_rival() {
    let mut e = Env::new();
    let w = e.seeded(1000, 2);
    e.bid(&w, 1, 600).unwrap();
    e.bid(&w, 2, 300).unwrap();
    e.settle(&w, 1, 700).unwrap(); // outbid
    e.settle(&w, 2, 300).unwrap(); // tie: playerBid > rivalBid is false
    assert_eq!((e.lot(&w, 1).status, e.lot(&w, 2).status), (LotStatus::Lost, LotStatus::Lost));
    assert_eq!(e.ps(&w).balance, 1000);
    assert_eq!((e.lot(&w, 1).escrow, e.lot(&w, 2).escrow, e.lot(&w, 1).price_paid), (0, 0, 0));
}

#[test]
fn settle_with_no_bid_is_a_loss_even_if_rival_bid_is_zero() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    e.settle(&w, 1, 0).unwrap(); // escrow 0 must not "win"
    assert_eq!(e.lot(&w, 1).status, LotStatus::Lost);
    assert_eq!(e.ps(&w).balance, 1000);
}

#[test]
fn settlement_is_idempotent_and_final() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    e.bid(&w, 1, 600).unwrap();
    e.settle(&w, 1, 100).unwrap();
    let before = (e.ps(&w).balance, e.lot(&w, 1).price_paid);
    // duplicate settle (even with a different rival bid) cannot flip the result or double-refund
    for rival in [100u64, 0, 5000] {
        assert!(e.settle(&w, 1, rival).unwrap_err().contains(&err_code(GameError::LotClosed)));
    }
    assert_eq!((e.ps(&w).balance, e.lot(&w, 1).price_paid), before);
    assert_eq!(e.lot(&w, 1).status, LotStatus::Won);
    // and no further bids after settlement
    assert!(e.bid(&w, 1, 900).unwrap_err().contains(&err_code(GameError::LotClosed)));
}

#[test]
fn only_game_authority_can_settle() {
    let mut e = Env::new();
    let w = e.seeded(1000, 1);
    e.bid(&w, 1, 600).unwrap();
    let ix = e.settle_ix(&w, &w, &w, 1, 0); // player signs as "authority" to force a win
    e.expect_err(ix, &w, GameError::UnauthorizedAuthority);
    assert_eq!(e.lot(&w, 1).status, LotStatus::Open);
}

#[test]
fn settle_rejects_mismatched_player_state() {
    let mut e = Env::new();
    let alice = e.seeded(1000, 1);
    let bob = e.seeded(1000, 1);
    e.bid(&alice, 1, 600).unwrap();
    // refund of alice's lot must never be routed into bob's PlayerState
    let a = Keypair::new_from_array([7u8; 32]);
    let ix = e.settle_ix(&a, &bob, &alice, 1, 9999);
    assert!(e.send(ix, &a).is_err());
    assert_eq!(e.ps(&bob).balance, 1000);
    assert_eq!(e.lot(&alice, 1).status, LotStatus::Open);
}

// ---------------- reveal guards that don't need the VRF program ----------------

#[test]
fn close_lot_bid_rules() {
    let mut e = Env::new();
    let w = e.seeded(1000, 3);
    e.bid(&w, 1, 600).unwrap();
    e.bid(&w, 2, 100).unwrap();
    let close = |e: &mut Env, w: &Keypair, l: u64| {
        let ix = Instruction {
            program_id: stock_wars::ID,
            accounts: stock_wars::accounts::CloseLotBid {
                payer: w.pubkey(),
                lot_bid: Env::lot_pda(&w.pubkey(), l),
            }
            .to_account_metas(None),
            data: stock_wars::instruction::CloseLotBid {}.data(),
        };
        e.send(ix, w)
    };
    assert!(close(&mut e, &w, 1).unwrap_err().contains(&err_code(GameError::CannotClose))); // Open
    e.settle(&w, 1, 0).unwrap(); // Won, reveal None
    assert!(close(&mut e, &w, 1).unwrap_err().contains(&err_code(GameError::CannotClose))); // un-revealed prize
    e.settle(&w, 2, 500).unwrap(); // Lost
    let before = e.svm.get_balance(&w.pubkey()).unwrap();
    close(&mut e, &w, 2).unwrap();
    assert!(e.svm.get_balance(&w.pubkey()).unwrap() > before - 10_000); // rent returned
    assert!(e.svm.get_account(&Env::lot_pda(&w.pubkey(), 2)).map_or(true, |a| a.data.is_empty()));
}