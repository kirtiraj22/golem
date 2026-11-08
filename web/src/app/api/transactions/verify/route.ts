import { json, readJson, route } from "@/lib/errors";
import { signatureBodySchema } from "@/lib/schemas";
import { indexTransaction } from "@/lib/server/index-tx";
import { verifyTransaction } from "@/lib/server/verify-tx";


export const POST = route<unknown>(async (request) => {
  const body = signatureBodySchema.parse(await readJson(request));
  const verified = await verifyTransaction(body.signature);
  const result = await indexTransaction(verified);
  return json({
    ...result,
    slot: verified.slot,
    blockTime: verified.blockTime,
    instructions: verified.instructions.map((ix) => ({
      index: ix.index,
      name: ix.name,
      campaign: ix.campaign,
      asset: ix.asset,
      wallet: ix.wallet,
      amountLamports: ix.amountLamports,
    })),
  });
});