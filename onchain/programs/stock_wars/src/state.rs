use anchor_lang::prelude::*;

/// Where this player's single active auction currently is.
///
/// Idle -> Bidding -> (lost) Idle
///                 -> (won)  Won -> RevealPending -> Revealed -> (next auction) Bidding
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum AuctionPhase {
    /// No auction in progress, no funds locked.
    Idle,
    /// Escrow is locked for `auction_id`; waiting for the game authority's result.
    Bidding,
    /// Player won; escrow has been charged. VRF reveal not yet requested.
    Won,
    /// VRF requested for `auction_id`; waiting for the callback.
    RevealPending,
    /// `reveal_random` holds the verified randomness for `auction_id`.
    Revealed,
}

/// The only account in the program. One per wallet: seeds = ["player", wallet].
/// This is the account that is delegated to the Ephemeral Rollup.
#[account]
#[derive(InitSpace)]
pub struct PlayerState {
    /// Wallet that owns this state (only it can bid / request reveals / undelegate).
    pub authority: Pubkey,
    /// Spendable in-game currency (neutral name; currency name is undecided).
    pub balance: u64,
    /// Amount currently locked for the active auction's bid.
    pub escrow: u64,
    /// Off-chain auction / storage-unit id that escrow and reveal are bound to. 0 = none.
    /// Must increase monotonically per player (enforced in `place_bid`).
    pub auction_id: u64,
    pub phase: AuctionPhase,
    /// Incremented on every VRF request for the current auction; the callback only
    /// accepts the current value, so stale/duplicate requests cannot overwrite the result.
    pub reveal_nonce: u32,
    /// Verified VRF output for `auction_id` (valid only when phase == Revealed).
    /// The frontend maps these 32 bytes to assets + quantities using its off-chain catalogue.
    pub reveal_random: [u8; 32],
    pub bump: u8,
}