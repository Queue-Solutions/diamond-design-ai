"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
let browserSupabaseClient: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  browserSupabaseClient ??= createClient(supabaseUrl, supabaseAnonKey);
  return browserSupabaseClient;
}
