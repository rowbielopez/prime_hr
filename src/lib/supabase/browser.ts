import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseClientConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/db/types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  // Reuse a singleton in browser runtime to avoid redundant client instances.
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabaseClientConfig();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}

