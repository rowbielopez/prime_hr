import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated Supabase user for the current request.
 *
 * Wrapped in React `cache()` so the underlying `auth.getUser()` round-trip
 * runs at most once per request, even when several `requireAuth` /
 * `requirePermission` calls fire across a page and its server actions.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireAuth(redirectTo = "/login") {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

