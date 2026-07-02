import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/config/env";

export function createServerSupabaseClient(accessToken?: string) {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseAnonKey) {
    return null;
  }

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined
  });
}

