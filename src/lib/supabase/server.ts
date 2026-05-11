import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseClientConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/db/types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseClientConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

