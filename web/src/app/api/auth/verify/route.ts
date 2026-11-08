import { json, readJson, route } from "@/lib/errors";
import { verifyChallengeBodySchema } from "@/lib/schemas";
import { completeChallenge } from "@/lib/server/auth";


export const POST = route<unknown>(async (request) => {
  const body = verifyChallengeBodySchema.parse(await readJson(request));
  const session = await completeChallenge(body.wallet, body.nonce, body.signature);
  return json({
    token: session.token,
    expiresAt: session.expiresAt,
    wallet: body.wallet,
  });
});