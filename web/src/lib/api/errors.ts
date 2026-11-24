import { NextResponse } from "next/server";
import { SupabaseConfigError } from "~/lib/supabase/server";

export function apiErrorResponse(
  error: unknown,
  fallbackMessage: string
): NextResponse {
  if (error instanceof SupabaseConfigError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  console.error(fallbackMessage, error);

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
