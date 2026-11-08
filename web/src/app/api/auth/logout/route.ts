import { json, route } from "@/lib/errors";
import { requireSession, revokeSession } from "@/lib/server/auth";


export const POST = route<unknown>(async (request) => {
  const session = await requireSession(request);
  await revokeSession(session.sessionId);
  return json({ ok: true });
});