import { redirect } from "next/navigation";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import { resolveAuthorizationContext } from "@/features/auth/server/resolve-authorization-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginCard } from "./LoginCard";

function normalizeRedirectPath(nextPath?: string): string {
  if (!nextPath) return "/dashboard";
  if (!nextPath.startsWith("/")) return "/dashboard";
  if (nextPath.startsWith("//")) return "/dashboard";
  return nextPath;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawError = resolvedParams?.error;
  const rawNext = resolvedParams?.next;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  const safeNext = normalizeRedirectPath(next);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const context = await resolveAuthorizationContext(user);
    if (context) {
      redirect(safeNext);
    }
    redirect(buildForbiddenUrl("unauthorized_access"));
  }

  return <LoginCard error={error} nextPath={safeNext} />;
}

