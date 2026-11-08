use anchor_lang::{
    prelude::*, solana_program::instruction::Instruction, system_program, InstructionData,
    ToAccountMetas,
};
use litesvm::LiteSVM;
use onchain::state::{Asset, AssetResult, Campaign, CampaignStatus, Classification, Vote};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;

const SOL: u64 = 1_000_000_000;

struct Env {
    svm: LiteSVM,
}

impl Env {
    fn new() -> Self {
        let mut svm = LiteSVM::new();
        let _ = svm.add_program(
            onchain::ID,
            include_bytes!("../../../target/deploy/onchain.so"),
        );
        let mut env = Env { svm };
        env.set_time(1_700_000_000);
        env
    }

    fn funded(&mut self, sol: u64) -> Keypair {
        let keypair = Keypair::new();
        self.svm.airdrop(&keypair.pubkey(), sol * SOL).unwrap();
        keypair
    }

    fn now(&self) -> i64 {
        self.svm.get_sysvar::<Clock>().unix_timestamp
    }

    fn set_time(&mut self, timestamp: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp = timestamp;
        self.svm.set_sysvar(&clock);
    }

    fn send(&mut self, ixs: &[Instruction], signers: &[&Keypair]) -> std::result::Result<(), String> {
        self.svm.expire_blockhash();
        let payer = signers[0].pubkey();
        let message = Message::new(ixs, Some(&payer));
        let tx = Transaction::new(&signers.to_vec(), message, self.svm.latest_blockhash());
        self.svm
            .send_transaction(tx)
            .map(|_| ())
            .map_err(|e| format!("{:?}", e.err))
    }

    fn campaign(&self, key: &Pubkey) -> Campaign {
        let account = self.svm.get_account(key).unwrap();
        Campaign::try_deserialize(&mut account.data.as_slice()).unwrap()
    }

    fn asset(&self, key: &Pubkey) -> Asset {
        let account = self.svm.get_account(key).unwrap();
        Asset::try_deserialize(&mut account.data.as_slice()).unwrap()
    }

    fn vote(&self, key: &Pubkey) -> Vote {
        let account = self.svm.get_account(key).unwrap();
        Vote::try_deserialize(&mut account.data.as_slice()).unwrap()
    }

    fn balance(&self, key: &Pubkey) -> u64 {
        self.svm.get_balance(key).unwrap_or(0)
    }
}

fn campaign_pda(company: &Pubkey, id: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[b"campaign", company.as_ref(), &id.to_le_bytes()],
        &onchain::ID,
    )
    .0
}

fn asset_pda(campaign: &Pubkey, index: u32) -> Pubkey {
    Pubkey::find_program_address(
        &[b"asset", campaign.as_ref(), &index.to_le_bytes()],
        &onchain::ID,
    )
    .0
}

fn vote_pda(asset: &Pubkey, participant: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"vote", asset.as_ref(), participant.as_ref()],
        &onchain::ID,
    )
    .0
}

fn ix_create(
    company: Pubkey,
    campaign: Pubkey,
    id: u64,
    count: u32,
    budget: u64,
    min_votes: u64,
    voting_deadline: i64,
    claim_deadline: i64,
) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::CreateCampaign {
            company,
            campaign,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: onchain::instruction::CreateCampaign {
            campaign_id: id,
            expected_asset_count: count,
            total_budget: budget,
            min_votes,
            voting_deadline,
            claim_deadline,
        }
        .data(),
    }
}

fn ix_register(company: Pubkey, campaign: Pubkey, index: u32) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::RegisterAsset {
            company,
            campaign,
            asset: asset_pda(&campaign, index),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: onchain::instruction::RegisterAsset {
            asset_index: index,
            content_hash: [index as u8 + 1; 32],
        }
        .data(),
    }
}

fn ix_fund(company: Pubkey, campaign: Pubkey) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::FundCampaign {
            company,
            campaign,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: onchain::instruction::FundCampaign {}.data(),
    }
}

fn ix_vote(
    participant: Pubkey,
    campaign: Pubkey,
    asset: Pubkey,
    classification: Classification,
) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::CastVote {
            participant,
            campaign,
            asset,
            vote: vote_pda(&asset, &participant),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: onchain::instruction::Vote { classification }.data(),
    }
}

fn ix_close(caller: Pubkey, campaign: Pubkey) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::CloseCampaign { caller, campaign }.to_account_metas(None),
        data: onchain::instruction::CloseCampaign {}.data(),
    }
}

fn ix_finalize(campaign: Pubkey, asset: Pubkey) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::FinalizeAsset { campaign, asset }.to_account_metas(None),
        data: onchain::instruction::FinalizeAsset {}.data(),
    }
}

fn ix_claim(participant: Pubkey, campaign: Pubkey, asset: Pubkey) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::ClaimReward {
            participant,
            campaign,
            asset,
            vote: vote_pda(&asset, &participant),
        }
        .to_account_metas(None),
        data: onchain::instruction::ClaimReward {}.data(),
    }
}

fn ix_refund(company: Pubkey, campaign: Pubkey) -> Instruction {
    Instruction {
        program_id: onchain::ID,
        accounts: onchain::accounts::RefundCampaign { company, campaign }.to_account_metas(None),
        data: onchain::instruction::RefundCampaign {}.data(),
    }
}

struct Setup {
    campaign: Pubkey,
    assets: Vec<Pubkey>,
    voting_deadline: i64,
    claim_deadline: i64,
}

fn setup_funded(env: &mut Env, company: &Keypair, count: u32, budget: u64, min_votes: u64) -> Setup {
    let start = env.now();
    let voting_deadline = start + 1_000;
    let claim_deadline = start + 2_000;
    let campaign = campaign_pda(&company.pubkey(), 1);
    env.send(
        &[ix_create(
            company.pubkey(),
            campaign,
            1,
            count,
            budget,
            min_votes,
            voting_deadline,
            claim_deadline,
        )],
        &[company],
    )
    .unwrap();
    let mut assets = Vec::new();
    for index in 0..count {
        env.send(&[ix_register(company.pubkey(), campaign, index)], &[company])
            .unwrap();
        assets.push(asset_pda(&campaign, index));
    }
    env.send(&[ix_fund(company.pubkey(), campaign)], &[company])
        .unwrap();
    Setup {
        campaign,
        assets,
        voting_deadline,
        claim_deadline,
    }
}

#[test]
fn full_lifecycle_with_remainder_and_refund() {
    let mut env = Env::new();
    let company = env.funded(20);
    let voters: Vec<Keypair> = (0..4).map(|_| env.funded(2)).collect();
    let budget = SOL;
    let s = setup_funded(&mut env, &company, 2, budget, 3);

    let campaign_state = env.campaign(&s.campaign);
    assert_eq!(campaign_state.status, CampaignStatus::Active);
    assert_eq!(campaign_state.registered_asset_count, 2);

    use Classification::{AiGenerated as Ai, HumanCreated as Human};
    let plan_asset0 = [Ai, Ai, Human, Ai];
    let plan_asset1 = [Ai, Ai, Human, Human];
    for (i, voter) in voters.iter().enumerate() {
        env.send(
            &[ix_vote(voter.pubkey(), s.campaign, s.assets[0], plan_asset0[i])],
            &[voter],
        )
        .unwrap();
        env.send(
            &[ix_vote(voter.pubkey(), s.campaign, s.assets[1], plan_asset1[i])],
            &[voter],
        )
        .unwrap();
    }

    let a0 = env.asset(&s.assets[0]);
    assert_eq!((a0.ai_votes, a0.human_votes, a0.total_votes), (3, 1, 4));

    assert!(env
        .send(&[ix_finalize(s.campaign, s.assets[0])], &[&voters[0]])
        .is_err());

    env.set_time(s.voting_deadline + 1);
    assert!(env
        .send(
            &[ix_vote(voters[0].pubkey(), s.campaign, s.assets[0], Ai)],
            &[&voters[0]]
        )
        .is_err());

    env.send(&[ix_finalize(s.campaign, s.assets[0])], &[&voters[0]])
        .unwrap();
    env.send(&[ix_finalize(s.campaign, s.assets[1])], &[&voters[0]])
        .unwrap();
    assert!(env
        .send(&[ix_finalize(s.campaign, s.assets[0])], &[&voters[0]])
        .is_err());

    let a0 = env.asset(&s.assets[0]);
    let a1 = env.asset(&s.assets[1]);
    assert_eq!(a0.result, AssetResult::AiGenerated);
    assert_eq!(a0.winning_votes, 3);
    assert_eq!(a0.reward_pool, budget / 2);
    assert_eq!(a1.result, AssetResult::Tie);
    assert_eq!(a1.reward_pool, 0);
    assert_eq!(env.campaign(&s.campaign).status, CampaignStatus::Closed);

    let reward = (budget / 2) / 3;

    let before = env.balance(&voters[0].pubkey());
    env.send(
        &[ix_claim(voters[0].pubkey(), s.campaign, s.assets[0])],
        &[&voters[0]],
    )
    .unwrap();
    assert!(env.balance(&voters[0].pubkey()) + 10_000 >= before + reward);
    assert!(env.vote(&vote_pda(&s.assets[0], &voters[0].pubkey())).claimed);

    assert!(env
        .send(
            &[ix_claim(voters[0].pubkey(), s.campaign, s.assets[0])],
            &[&voters[0]]
        )
        .is_err());
    assert!(env
        .send(
            &[ix_claim(voters[2].pubkey(), s.campaign, s.assets[0])],
            &[&voters[2]]
        )
        .is_err());
    assert!(env
        .send(
            &[ix_claim(voters[0].pubkey(), s.campaign, s.assets[1])],
            &[&voters[0]]
        )
        .is_err());

    for index in [1usize, 3usize] {
        env.send(
            &[ix_claim(voters[index].pubkey(), s.campaign, s.assets[0])],
            &[&voters[index]],
        )
        .unwrap();
    }

    let a0 = env.asset(&s.assets[0]);
    assert_eq!(a0.total_claimed, reward * 3);
    assert_eq!(env.campaign(&s.campaign).total_claimed, reward * 3);

    assert!(env
        .send(&[ix_refund(company.pubkey(), s.campaign)], &[&company])
        .is_err());

    env.set_time(s.claim_deadline + 1);
    assert!(env
        .send(&[ix_refund(voters[0].pubkey(), s.campaign)], &[&voters[0]])
        .is_err());

    let company_before = env.balance(&company.pubkey());
    env.send(&[ix_refund(company.pubkey(), s.campaign)], &[&company])
        .unwrap();
    let expected_refund = budget - reward * 3;
    let company_after = env.balance(&company.pubkey());
    assert!(company_after <= company_before + expected_refund);
    assert!(company_after + 10_000 >= company_before + expected_refund);

    let escrow = env.svm.get_account(&s.campaign).unwrap();
    let rent = env.svm.get_sysvar::<Rent>().minimum_balance(escrow.data.len());
    assert_eq!(escrow.lamports, rent);
    assert_eq!(env.campaign(&s.campaign).status, CampaignStatus::Settled);

    assert!(env
        .send(&[ix_refund(company.pubkey(), s.campaign)], &[&company])
        .is_err());
}

#[test]
fn claim_after_deadline_fails_and_full_budget_refunds() {
    let mut env = Env::new();
    let company = env.funded(20);
    let voters: Vec<Keypair> = (0..3).map(|_| env.funded(2)).collect();
    let budget = 2 * SOL;
    let s = setup_funded(&mut env, &company, 1, budget, 3);

    for voter in &voters {
        env.send(
            &[ix_vote(
                voter.pubkey(),
                s.campaign,
                s.assets[0],
                Classification::HumanCreated,
            )],
            &[voter],
        )
        .unwrap();
    }

    env.set_time(s.voting_deadline + 1);
    env.send(&[ix_close(voters[0].pubkey(), s.campaign)], &[&voters[0]])
        .unwrap();
    env.send(&[ix_finalize(s.campaign, s.assets[0])], &[&voters[0]])
        .unwrap();
    assert_eq!(env.asset(&s.assets[0]).result, AssetResult::HumanCreated);

    env.set_time(s.claim_deadline + 1);
    assert!(env
        .send(
            &[ix_claim(voters[0].pubkey(), s.campaign, s.assets[0])],
            &[&voters[0]]
        )
        .is_err());

    let company_before = env.balance(&company.pubkey());
    env.send(&[ix_refund(company.pubkey(), s.campaign)], &[&company])
        .unwrap();
    assert!(env.balance(&company.pubkey()) + 10_000 >= company_before + budget);
}

#[test]
fn insufficient_votes_yield_no_rewards() {
    let mut env = Env::new();
    let company = env.funded(20);
    let voter = env.funded(2);
    let s = setup_funded(&mut env, &company, 1, SOL, 3);

    env.send(
        &[ix_vote(
            voter.pubkey(),
            s.campaign,
            s.assets[0],
            Classification::AiGenerated,
        )],
        &[&voter],
    )
    .unwrap();

    env.send(&[ix_close(company.pubkey(), s.campaign)], &[&company])
        .unwrap();
    env.send(&[ix_finalize(s.campaign, s.assets[0])], &[&voter])
        .unwrap();
    assert_eq!(
        env.asset(&s.assets[0]).result,
        AssetResult::InsufficientVotes
    );
    assert!(env
        .send(
            &[ix_claim(voter.pubkey(), s.campaign, s.assets[0])],
            &[&voter]
        )
        .is_err());
}

#[test]
fn guards_on_registration_funding_voting_and_closing() {
    let mut env = Env::new();
    let company = env.funded(20);
    let stranger = env.funded(2);
    let start = env.now();
    let campaign = campaign_pda(&company.pubkey(), 7);

    env.send(
        &[ix_create(
            company.pubkey(),
            campaign,
            7,
            2,
            SOL,
            1,
            start + 1_000,
            start + 2_000,
        )],
        &[&company],
    )
    .unwrap();

    assert!(env
        .send(&[ix_register(stranger.pubkey(), campaign, 0)], &[&stranger])
        .is_err());
    assert!(env
        .send(&[ix_register(company.pubkey(), campaign, 1)], &[&company])
        .is_err());
    env.send(&[ix_register(company.pubkey(), campaign, 0)], &[&company])
        .unwrap();
    assert!(env
        .send(&[ix_register(company.pubkey(), campaign, 0)], &[&company])
        .is_err());
    assert!(env
        .send(&[ix_fund(company.pubkey(), campaign)], &[&company])
        .is_err());
    env.send(&[ix_register(company.pubkey(), campaign, 1)], &[&company])
        .unwrap();
    assert!(env
        .send(&[ix_register(company.pubkey(), campaign, 2)], &[&company])
        .is_err());

    assert!(env
        .send(&[ix_fund(stranger.pubkey(), campaign)], &[&stranger])
        .is_err());
    env.send(&[ix_fund(company.pubkey(), campaign)], &[&company])
        .unwrap();
    assert!(env
        .send(&[ix_fund(company.pubkey(), campaign)], &[&company])
        .is_err());

    let asset0 = asset_pda(&campaign, 0);
    env.send(
        &[ix_vote(
            stranger.pubkey(),
            campaign,
            asset0,
            Classification::AiGenerated,
        )],
        &[&stranger],
    )
    .unwrap();
    assert!(env
        .send(
            &[ix_vote(
                stranger.pubkey(),
                campaign,
                asset0,
                Classification::HumanCreated,
            )],
            &[&stranger]
        )
        .is_err());
    let a0 = env.asset(&asset0);
    assert_eq!((a0.ai_votes, a0.human_votes, a0.total_votes), (1, 0, 1));

    assert!(env
        .send(&[ix_close(stranger.pubkey(), campaign)], &[&stranger])
        .is_err());
    env.send(&[ix_close(company.pubkey(), campaign)], &[&company])
        .unwrap();
    assert!(env
        .send(&[ix_close(company.pubkey(), campaign)], &[&company])
        .is_err());

    let other = env.funded(2);
    assert!(env
        .send(
            &[ix_vote(
                other.pubkey(),
                campaign,
                asset0,
                Classification::AiGenerated,
            )],
            &[&other]
        )
        .is_err());
}