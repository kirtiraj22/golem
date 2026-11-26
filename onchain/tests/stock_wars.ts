/**
 * Black Market: Stock Wars - TypeScript tests.
 *
 * Tier 1 (always runs, plain local validator via `anchor test`):
 *   everything that does not need MagicBlock infrastructure. The PlayerState PDA is NOT
 *   delegated here, so place_bid / settle_auction / credit_balance run on the base layer.
 *
 * Tier 2 (opt-in, RUN_ER=1, needs devnet + a MagicBlock ER endpoint):
 *   delegate -> bid on ER -> settle -> VRF reveal -> commit & undelegate.
 *
 * NOT RUN BY THE AUTHOR OF THIS FILE - first execution is yours.
 *
 * PREREQUISITE: constants.rs GAME_AUTHORITY must equal the key returned by
 * loadGameAuthority() (see the test-only pubkey printed in the first test).
 */
import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";
import { StockWars } from "../target/types/stock_wars";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.StockWars as Program<StockWars>;

const U64_MAX = new BN("18446744073709551615");
const ZERO_32 = new Array(32).fill(0);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Test-only authority. Pubkey must be pasted into constants.rs GAME_AUTHORITY. */
function loadGameAuthority(): Keypair {
  const path = process.env.GAME_AUTHORITY_KEYPAIR;
  if (path) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8")))
    );
  }
  // 32 bytes exactly; derives GZ1vGvyHCZHc5uqxRDigfK1tUEyjWZPD2XcdMxecvtGp
  return Keypair.fromSeed(Buffer.from("stockwars-test-game-authority-v1"));
}
const gameAuthority = loadGameAuthority();

function playerPda(wallet: PublicKey, programId = program.programId): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("player"), wallet.toBuffer()],
    programId
  )[0];
}

async function airdrop(to: PublicKey, sol = 0.1) {
  const sig = await provider.connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
  const bh = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
}

/** Asserts the promise rejects and the error mentions `code` (Anchor error name). */
async function expectErr(p: Promise<unknown>, code: string) {
  try {
    await p;
  } catch (e: any) {
    const text = [e?.error?.errorCode?.code, e?.message, ...(e?.logs ?? [])]
      .filter(Boolean)
      .join(" | ");
    expect(text, `expected error ${code}`).to.include(code);
    return;
  }
  expect.fail(`expected transaction to fail with ${code}, but it succeeded`);
}

const initPlayer = (kp: Keypair, startingBalance: number | BN) =>
  program.methods
    .initPlayer(new BN(startingBalance))
    .accountsPartial({ payer: kp.publicKey, playerState: playerPda(kp.publicKey) })
    .signers([kp])
    .rpc();

const placeBid = (kp: Keypair, auctionId: number, amount: number) =>
  program.methods
    .placeBid(new BN(auctionId), new BN(amount))
    .accountsPartial({ payer: kp.publicKey, playerState: playerPda(kp.publicKey) })
    .signers([kp])
    .rpc();

const settle = (
  player: PublicKey,
  auctionId: number,
  won: boolean,
  price: number,
  signer: Keypair = gameAuthority
) =>
  program.methods
    .settleAuction(new BN(auctionId), won, new BN(price))
    .accountsPartial({
      gameAuthority: signer.publicKey,
      playerState: playerPda(player),
    })
    .signers([signer])
    .rpc();

const credit = (player: PublicKey, amount: number | BN, signer: Keypair = gameAuthority) =>
  program.methods
    .creditBalance(new BN(amount))
    .accountsPartial({
      gameAuthority: signer.publicKey,
      playerState: playerPda(player),
    })
    .signers([signer])
    .rpc();

const fetchState = (wallet: PublicKey) =>
  program.account.playerState.fetch(playerPda(wallet));

const phaseOf = (s: { phase: object }) => Object.keys(s.phase)[0];

async function newPlayer(startingBalance = 1000): Promise<Keypair> {
  const kp = Keypair.generate();
  await airdrop(kp.publicKey);
  await initPlayer(kp, startingBalance);
  return kp;
}

// ===========================================================================
// TIER 1 - base layer (no MagicBlock infrastructure needed)
// ===========================================================================

describe("stock_wars: base-layer logic", () => {
  it("uses the test game authority (paste this into constants.rs GAME_AUTHORITY)", () => {
    console.log("      test GAME_AUTHORITY pubkey:", gameAuthority.publicKey.toBase58());
  });

  // ------------------------------------------------------------------ init
  describe("init_player", () => {
    it("creates a player with the requested starting balance", async () => {
      const kp = await newPlayer(1234);
      const s = await fetchState(kp.publicKey);
      expect(s.authority.toBase58()).to.equal(kp.publicKey.toBase58());
      expect(s.balance.toString()).to.equal("1234");
      expect(s.escrow.toString()).to.equal("0");
      expect(s.auctionId.toString()).to.equal("0");
      expect(s.revealNonce).to.equal(0);
      expect(phaseOf(s)).to.equal("idle");
      expect(Array.from(s.revealRandom)).to.deep.equal(ZERO_32);
    });

    it("is idempotent: a returning wallet does not error and keeps its state", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 400); // change state so a reset would be visible
      await initPlayer(kp, 999_999); // must neither fail nor re-grant balance
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("600");
      expect(s.escrow.toString()).to.equal("400");
      expect(phaseOf(s)).to.equal("bidding");
    });

    it("lets many wallets register independently (no PDA collisions)", async () => {
      const players = await Promise.all([newPlayer(10), newPlayer(20), newPlayer(30)]);
      const balances = await Promise.all(players.map((p) => fetchState(p.publicKey)));
      expect(balances.map((b) => b.balance.toString())).to.deep.equal(["10", "20", "30"]);
    });
  });

  // ------------------------------------------------------------- place_bid
  describe("place_bid", () => {
    it("locks the bid in escrow and starts the auction", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 300);
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("700");
      expect(s.escrow.toString()).to.equal("300");
      expect(s.auctionId.toString()).to.equal("1");
      expect(phaseOf(s)).to.equal("bidding");
    });

    it("raising a bid locks only the difference", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 300);
      await placeBid(kp, 1, 450);
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("550");
      expect(s.escrow.toString()).to.equal("450");
    });

    it("rejects a bid that is not higher than the current escrow", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 300);
      await expectErr(placeBid(kp, 1, 300), "BidTooLow");
      await expectErr(placeBid(kp, 1, 100), "BidTooLow");
    });

    it("rejects a bid above the available balance", async () => {
      const kp = await newPlayer(100);
      await expectErr(placeBid(kp, 1, 101), "InsufficientBalance");
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("100");
      expect(phaseOf(s)).to.equal("idle"); // failed tx must not leave state behind
    });

    it("prevents double-spending: locked funds cannot be bid again", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 700); // balance 300, escrow 700
      // raising to 1200 needs 500 more but only 300 is free
      await expectErr(placeBid(kp, 1, 1200), "InsufficientBalance");
      await placeBid(kp, 1, 1000); // exactly uses the remaining 300
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("0");
      expect(s.escrow.toString()).to.equal("1000");
    });

    it("rejects auction id 0", async () => {
      const kp = await newPlayer(1000);
      await expectErr(placeBid(kp, 0, 100), "AuctionIdNotIncreasing");
    });

    it("rejects a different auction id while one is still bidding", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 5, 100);
      await expectErr(placeBid(kp, 6, 200), "AuctionBusy");
    });

    it("cannot be used by a different wallet on someone else's state", async () => {
      const victim = await newPlayer(1000);
      const attacker = await newPlayer(1000);
      await expectErr(
        program.methods
          .placeBid(new BN(1), new BN(100))
          .accountsPartial({
            payer: attacker.publicKey,
            playerState: playerPda(victim.publicKey),
          })
          .signers([attacker])
          .rpc(),
        "ConstraintSeeds"
      );
      const s = await fetchState(victim.publicKey);
      expect(s.balance.toString()).to.equal("1000");
    });
  });

  // -------------------------------------------------------- settle_auction
  describe("settle_auction", () => {
    it("rejects anyone but the game authority", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 300);
      // player tries to refund themselves by pretending to be the authority
      await expectErr(settle(kp.publicKey, 1, false, 0, kp), "UnauthorizedAuthority");
      const s = await fetchState(kp.publicKey);
      expect(phaseOf(s)).to.equal("bidding");
      expect(s.escrow.toString()).to.equal("300");
    });

    it("loss: refunds the whole escrow and returns to idle", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 300);
      await settle(kp.publicKey, 1, false, 0);
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("1000");
      expect(s.escrow.toString()).to.equal("0");
      expect(phaseOf(s)).to.equal("idle");
    });

    it("loss: ignores the price argument", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 300);
      await settle(kp.publicKey, 1, false, 999_999);
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("1000");
    });

    it("win: charges the backend price and refunds the remainder", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 300);
      await settle(kp.publicKey, 1, true, 250);
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("750"); // 1000 - 300 + 50 refund
      expect(s.escrow.toString()).to.equal("0");
      expect(phaseOf(s)).to.equal("won");
    });

    it("win: a player cannot underpay by escrowing less than the real price", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 1); // escrow far below the true winning price
      await expectErr(settle(kp.publicKey, 1, true, 500), "PriceExceedsEscrow");
      const s = await fetchState(kp.publicKey);
      expect(phaseOf(s)).to.equal("bidding");
    });

    it("rejects a mismatched auction id", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 3, 100);
      await expectErr(settle(kp.publicKey, 4, false, 0), "WrongAuction");
    });

    it("cannot settle twice", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 100);
      await settle(kp.publicKey, 1, true, 100);
      await expectErr(settle(kp.publicKey, 1, false, 0), "InvalidPhase");
    });

    it("cannot bid again while a won auction awaits its reveal", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 100);
      await settle(kp.publicKey, 1, true, 100);
      await expectErr(placeBid(kp, 2, 100), "AuctionBusy");
    });

    it("auction ids must strictly increase across auctions", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 10, 100);
      await settle(kp.publicKey, 10, false, 0); // lost -> idle
      await expectErr(placeBid(kp, 10, 100), "AuctionIdNotIncreasing"); // same id
      await expectErr(placeBid(kp, 9, 100), "AuctionIdNotIncreasing"); // lower id
      await placeBid(kp, 11, 100); // higher id works
      const s = await fetchState(kp.publicKey);
      expect(s.auctionId.toString()).to.equal("11");
      expect(phaseOf(s)).to.equal("bidding");
    });
  });

  // -------------------------------------------------------- credit_balance
  describe("credit_balance", () => {
    it("lets the game authority credit sale proceeds", async () => {
      const kp = await newPlayer(1000);
      await credit(kp.publicKey, 250);
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("1250");
    });

    it("works regardless of auction phase and does not touch escrow", async () => {
      const kp = await newPlayer(1000);
      await placeBid(kp, 1, 400);
      await credit(kp.publicKey, 100);
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("700"); // 600 + 100
      expect(s.escrow.toString()).to.equal("400");
    });

    it("rejects anyone but the game authority", async () => {
      const kp = await newPlayer(1000);
      await expectErr(credit(kp.publicKey, 1_000_000, kp), "UnauthorizedAuthority");
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("1000");
    });

    it("fails with MathOverflow instead of wrapping", async () => {
      const kp = await newPlayer(1000);
      await expectErr(credit(kp.publicKey, U64_MAX), "MathOverflow");
      const s = await fetchState(kp.publicKey);
      expect(s.balance.toString()).to.equal("1000");
    });
  });

  // NOT covered here (cannot be exercised without MagicBlock infrastructure):
  //  - request_reveal / callback_reveal: need the VRF program, oracle queue and the
  //    scoped VRF identity signer. Covered by the opt-in ER tier below.
  //  - delegate_player / commit_and_undelegate: need the delegation + magic programs.
});

// ===========================================================================
// TIER 2 - MagicBlock ER lifecycle (opt-in)
//
// RUN_ER=1 \
// ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
// GAME_AUTHORITY_KEYPAIR=/path/to/authority.json   (must match constants.rs on devnet)
// anchor test --skip-build --skip-deploy --skip-local-validator
//
// Requires: program deployed to devnet at the ID in the IDL, a funded provider wallet.
// Optional: EPHEMERAL_PROVIDER_ENDPOINT, EPHEMERAL_WS_ENDPOINT, ER_VALIDATOR.
// ===========================================================================

const RUN_ER = process.env.RUN_ER === "1";

(RUN_ER ? describe : describe.skip)("stock_wars: ER lifecycle (devnet)", function () {
  this.timeout(240_000);

  // From MagicBlock docs: devnet delegated VRF queue and the Asia devnet validator.
  const EPHEMERAL_QUEUE = new PublicKey("5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc");
  const ER_VALIDATOR = new PublicKey(
    process.env.ER_VALIDATOR || "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"
  );

  const erConnection = new anchor.web3.Connection(
    process.env.EPHEMERAL_PROVIDER_ENDPOINT || "https://devnet-as.magicblock.app/",
    {
      wsEndpoint: process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet-as.magicblock.app/",
      commitment: "confirmed",
    }
  );
  const erProvider = new anchor.AnchorProvider(erConnection, provider.wallet, {
    commitment: "confirmed",
  });
  const erProgram = new Program<StockWars>(program.idl as StockWars, erProvider);

  async function waitFor<T>(
    label: string,
    fn: () => Promise<T | null | undefined | false>,
    timeoutMs = 60_000,
    intervalMs = 1_000
  ): Promise<T> {
    const start = Date.now();
    for (;;) {
      try {
        const v = await fn();
        if (v) return v;
      } catch {
        /* keep polling */
      }
      if (Date.now() - start > timeoutMs) throw new Error(`timeout waiting for ${label}`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  it("delegate -> bid -> settle -> VRF reveal -> commit & undelegate", async () => {
    const kp = Keypair.generate();
    const pda = playerPda(kp.publicKey);

    // fund the player on devnet from the provider wallet (airdrops are rate-limited)
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: kp.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      )
    );

    // --- base layer: create + delegate
    await initPlayer(kp, 1000);
    await program.methods
      .delegatePlayer()
      .accountsPartial({ payer: kp.publicKey })
      .remainingAccounts([{ pubkey: ER_VALIDATOR, isSigner: false, isWritable: false }])
      .signers([kp])
      .rpc();

    await waitFor("account to appear on the ER", async () =>
      erConnection.getAccountInfo(pda)
    );

    // --- ER: bid and settle (as the game authority)
    await erProgram.methods
      .placeBid(new BN(1), new BN(300))
      .accountsPartial({ payer: kp.publicKey, playerState: pda })
      .signers([kp])
      .rpc({ skipPreflight: true });

    await waitFor("bid to land on the ER", async () => {
      const s = await erProgram.account.playerState.fetch(pda);
      return s.escrow.toString() === "300";
    });

    await erProgram.methods
      .settleAuction(new BN(1), true, new BN(250))
      .accountsPartial({ gameAuthority: gameAuthority.publicKey, playerState: pda })
      .signers([gameAuthority])
      .rpc({ skipPreflight: true });

    const won = await waitFor("won phase on the ER", async () => {
      const s = await erProgram.account.playerState.fetch(pda);
      return phaseOf(s) === "won" ? s : null;
    });
    expect(won.balance.toString()).to.equal("750");

    // --- ER: request VRF reveal as the player, wait for the callback
    await erProgram.methods
      .requestReveal(new BN(1))
      .accountsPartial({
        payer: kp.publicKey,
        playerState: pda,
        oracleQueue: EPHEMERAL_QUEUE,
      })
      .signers([kp])
      .rpc({ skipPreflight: true });

    const revealed = await waitFor(
      "VRF callback",
      async () => {
        const s = await erProgram.account.playerState.fetch(pda);
        return phaseOf(s) === "revealed" ? s : null;
      },
      90_000
    );
    expect(revealed.revealNonce).to.equal(1);
    expect(Array.from(revealed.revealRandom)).to.not.deep.equal(ZERO_32);

    // --- ER: commit + undelegate back to Solana
    await erProgram.methods
      .commitAndUndelegate()
      .accountsPartial({ payer: kp.publicKey, playerState: pda })
      .signers([kp])
      .rpc({ skipPreflight: true });

    await waitFor("undelegation (owner back to the program)", async () => {
      const info = await provider.connection.getAccountInfo(pda);
      return info && info.owner.equals(program.programId);
    });

    const finalState = await fetchState(kp.publicKey);
    expect(finalState.balance.toString()).to.equal("750");
    expect(phaseOf(finalState)).to.equal("revealed");
    expect(Array.from(finalState.revealRandom)).to.deep.equal(
      Array.from(revealed.revealRandom)
    );
  });
});