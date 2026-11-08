import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";
import { serverEnv } from "@/lib/env";

function create() {
  const env = serverEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

let client: ReturnType<typeof create> | null = null;

export function supabaseAdmin() {
  client ??= create();
  return client;
}