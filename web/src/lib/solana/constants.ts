import { PublicKey, clusterApiUrl } from "@solana/web3.js";

import { GOLEM_IDL } from "./idl";

const programAddress =
  process.env.NEXT_PUBLIC_GOLEM_PROGRAM_ID ?? GOLEM_IDL.address;

if (programAddress !== GOLEM_IDL.address) {
  throw new Error(
    "NEXT_PUBLIC_GOLEM_PROGRAM_ID does not match the address in the IDL",
  );
}

export const PROGRAM_ID = new PublicKey(programAddress);
export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");
export const COMMITMENT = "confirmed" as const;