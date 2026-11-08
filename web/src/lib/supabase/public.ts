import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";

let client: ReturnType<typeof create> | null = null;

function create() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase public environment variables");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabasePublic() {
  client ??= create();
  return client;
}