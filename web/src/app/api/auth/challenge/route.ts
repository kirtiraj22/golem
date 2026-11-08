import { json, readJson, route } from "@/lib/errors";
import { challengeBodySchema } from "@/lib/schemas";
import { createChallenge } from "@/lib/server/auth";


export const POST = route<unknown>(async (request) => {
  const body = challengeBodySchema.parse(await readJson(request));
  const challenge = await createChallenge(body.wallet);
  return json(challenge);
});