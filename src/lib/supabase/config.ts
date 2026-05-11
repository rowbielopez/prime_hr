import { getPublicEnv } from "@/lib/env";

export function getSupabaseClientConfig() {
  const env = getPublicEnv();
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

