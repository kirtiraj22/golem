use anchor_lang::prelude::*;

declare_id!("HuyRx42nkwqRnmZWP1wHiqStyL35shayb6UEzcVU99SR");

#[program]
pub mod onchain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
