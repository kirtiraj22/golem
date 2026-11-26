use anchor_lang::prelude::*;

/// ["player", wallet]  -> PlayerState (balance). One per wallet.
pub const PLAYER_SEED: &[u8] = b"player";
/// ["lot", wallet, listing_number_le] -> LotBid (this player's bid on one lot). One per player per lot.
pub const LOT_SEED: &[u8] = b"lot";

/// Backend signer. Allowed to: sync off-chain balance changes (`apply_delta`),
/// close a lot with the rival's final bid (`settle_lot`), and retry a stuck VRF request.
/// UNCHANGED from your file.
#[cfg(not(feature = "test-authority"))]
pub const GAME_AUTHORITY: Pubkey = pubkey!("GZ1vGvyHCZHc5uqxRDigfK1tUEyjWZPD2XcdMxecvtGp");
/// TEST ONLY (litesvm): deterministic key from seed [7u8; 32]. Never build/deploy with this feature.
#[cfg(feature = "test-authority")]
pub const GAME_AUTHORITY: Pubkey = pubkey!("GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB");

/// Mirrors the backend's "outside the house limit" check (state.ts: 9_000_000).
pub const MAX_BID: u64 = 9_000_000;