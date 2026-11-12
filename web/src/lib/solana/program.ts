import { AnchorProvider, Program, type Idl } from "@anchor-lang/core";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

import { COMMITMENT, RPC_URL } from "./constants";
import { GOLEM_IDL } from "./idl";

export type WalletLike = {
  publicKey: PublicKey | null;
  signTransaction?: <T extends Transaction | VersionedTransaction>(
    transaction: T,
  ) => Promise<T>;
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ) => Promise<T[]>;
};

export type GolemProgram = Program<Idl>;

let sharedConnection: Connection | null = null;

export function createConnection(): Connection {
  sharedConnection ??= new Connection(RPC_URL, COMMITMENT);
  return sharedConnection;
}

export function createProvider(
  wallet: WalletLike,
  connection: Connection = createConnection(),
): AnchorProvider {
  const publicKey = wallet.publicKey;
  const signTransaction = wallet.signTransaction;
  if (!publicKey || !signTransaction) {
    throw new Error("Connect a wallet that can sign transactions");
  }
  const signAll = wallet.signAllTransactions;
  const adapter = {
    publicKey,
    signTransaction,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      transactions: T[],
    ): Promise<T[]> => {
      if (signAll) return signAll(transactions);
      const signed: T[] = [];
      for (const transaction of transactions) {
        signed.push(await signTransaction(transaction));
      }
      return signed;
    },
  };
  return new AnchorProvider(connection, adapter, {
    commitment: COMMITMENT,
    preflightCommitment: COMMITMENT,
  });
}

export function createProgram(
  wallet: WalletLike,
  connection: Connection = createConnection(),
): GolemProgram {
  return new Program(GOLEM_IDL, createProvider(wallet, connection));
}

export function requireWalletKey(program: GolemProgram): PublicKey {
  const key = program.provider.publicKey;
  if (!key) throw new Error("Wallet is not connected");
  return key;
}