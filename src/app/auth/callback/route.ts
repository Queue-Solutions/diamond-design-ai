import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"));
  const redirectUrl = new URL(next, url.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/?authError=missing_code", url.origin));
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/?authError=supabase_not_configured", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Supabase auth callback failed.", error.message);
    return NextResponse.redirect(new URL("/?authError=callback_failed", url.origin));
  }

  return NextResponse.redirect(redirectUrl);
}

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/chat";
  }

  return value;
}
