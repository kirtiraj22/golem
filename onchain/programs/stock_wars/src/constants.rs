use anchor_lang::prelude::*;

/// Seed for the single PDA of this program: ["player", wallet].
pub const PLAYER_SEED: &[u8] = b"player";

/// The ONLY key allowed to finalize auction results (`settle_auction`).
///
/// Trust model: NPCs and auction timing live off-chain, so the program cannot know
/// who won. The game backend (Next.js server) holds this key and signs the result.
///
/// TODO(you): replace with your backend signer's PUBLIC key before deploying.
/// The placeholder below is the System Program address: nobody holds its private key,
/// so until you replace it `settle_auction` can never succeed (fails safe).
pub const GAME_AUTHORITY: Pubkey = pubkey!("5qxyM8obs6fzEGmjNAhszXahzrAqGX6oWPfXP6ABrcGm");