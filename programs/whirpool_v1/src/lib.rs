use anchor_lang::prelude::*;

declare_id!("6Zx9KWVKQQkqryW2UrbHinTYTGeTrvH7jG1YTe6SRMGR");

#[program]
pub mod whirpool_v1 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
            Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
