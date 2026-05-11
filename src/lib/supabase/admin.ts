import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAdminEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

let adminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const env = getAdminEnv();
  adminClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}

