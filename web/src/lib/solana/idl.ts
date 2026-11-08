import type { Idl } from "@anchor-lang/core";

import rawIdl from "./idl/onchain.json";

export const GOLEM_IDL = rawIdl as unknown as Idl;