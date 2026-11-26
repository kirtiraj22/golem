use anchor_lang::prelude::*;

/// One per wallet. Holds the AUTHORITATIVE spendable currency (free balance only;
/// bid deposits live in LotBid.escrow, never double-counted).
#[account]
#[derive(InitSpace)]
pub struct PlayerState {
    pub authority: Pubkey,
    /// Free, spendable in-game coins ("c" in the UI).
    pub balance: u64,
    /// Last applied off-chain balance sync (`apply_delta`). Makes backend retries idempotent.
    pub sync_nonce: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum LotStatus {
    /// Accepting bids; deposit locked in `escrow`.
    Open,
    /// Player's bid beat the rival's: `price_paid` charged, VRF reveal allowed.
    Won,
    /// Rival won (or no bid): deposit refunded to balance.
    Lost,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum RevealState {
    None,
    Pending,
    Done,
}

/// One per (player, lot). `listing` = the game's `StorageLot.listingNumber`
/// (monotonic per player in `state.nextListingNumber`, so unique per wallet).
/// Escrow is per-lot, so a player can hold bids on several lots at once,
/// exactly like the existing game (state.lots[].playerBid).
#[account]
#[derive(InitSpace)]
pub struct LotBid {
    pub player: Pubkey,
    pub listing: u64,
    /// Player's current (total) bid, locked while Open. Zero after settlement.
    pub escrow: u64,
    /// Rival's final bid, supplied by GAME_AUTHORITY at settlement (rival is a server simulation).
    pub rival_bid: u64,
    /// What the winner paid (== winning escrow). Zero unless Won.
    pub price_paid: u64,
    pub status: LotStatus,
    pub reveal: RevealState,
    /// Incremented per VRF request; callback only accepts the current value.
    pub reveal_nonce: u32,
    /// Verified VRF output. Valid when reveal == Done. Backend maps it to contents.
    pub reveal_random: [u8; 32],
    pub bump: u8,
}