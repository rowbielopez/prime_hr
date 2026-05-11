import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllowedEmailDomains } from "@/lib/env";
import { provisionAndAuthorizeUser } from "@/features/auth/server/provision-and-authorize-user";
import { buildLoginUrl } from "@/features/auth/auth-errors";

function isAllowedEmail(email: string, allowedDomains: string[]) {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  const domain = normalized.slice(at + 1);
  return allowedDomains.includes(domain);
}

function readGoogleHostedDomain(user: { user_metadata?: Record<string, unknown> | null }): string | null {
  const metadata = user.user_metadata;
  if (!metadata) return null;
  const hd = metadata.hd;
  return typeof hd === "string" && hd.trim().length > 0 ? hd.trim().toLowerCase() : null;
}

async function signOutWithFallback(input: {
  request: NextRequest;
  origin: string;
  nextPath: string;
  errorCode:
    | "unauthorized_domain"
    | "unverified_email"
    | "invalid_hosted_domain"
    | "access_pending"
    | "unauthorized_access"
    | "ambiguous_employee_match"
    | "profile_resolution_failed";
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const signOutResult = await input.supabase.auth.signOut();
  const finalError = signOutResult.error ? "session_reset_failed" : input.errorCode;
  const response = NextResponse.redirect(
    new URL(buildLoginUrl({ error: finalError, next: input.nextPath }), input.origin)
  );

  // Ensure auth cookies are invalidated even if upstream sign-out failed.
  for (const cookie of input.request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }

  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next");

  const normalizedNextPath = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  const redirectTo = new URL(normalizedNextPath, url.origin);

  if (!code) {
    return NextResponse.redirect(new URL(buildLoginUrl({ error: "oauth_code_missing", next: normalizedNextPath }), url.origin));
  }

  const supabase = await createSupabaseServerClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(buildLoginUrl({ error: "oauth_exchange_failed", next: normalizedNextPath }), url.origin)
    );
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user?.email) {
    return NextResponse.redirect(new URL(buildLoginUrl({ error: "oauth_user_read_failed", next: normalizedNextPath }), url.origin));
  }
  if (!data.user.email_confirmed_at) {
    return signOutWithFallback({
      request,
      origin: url.origin,
      nextPath: normalizedNextPath,
      errorCode: "unverified_email",
      supabase,
    });
  }

  const allowedDomains = getAllowedEmailDomains();
  if (!isAllowedEmail(data.user.email, allowedDomains)) {
    return signOutWithFallback({
      request,
      origin: url.origin,
      nextPath: normalizedNextPath,
      errorCode: "unauthorized_domain",
      supabase,
    });
  }
  const hostedDomain = readGoogleHostedDomain(data.user);
  if (hostedDomain && !allowedDomains.includes(hostedDomain)) {
    return signOutWithFallback({
      request,
      origin: url.origin,
      nextPath: normalizedNextPath,
      errorCode: "invalid_hosted_domain",
      supabase,
    });
  }

  const authzResult = await provisionAndAuthorizeUser(data.user);
  if (!authzResult.allowed) {
    return signOutWithFallback({
      request,
      origin: url.origin,
      nextPath: normalizedNextPath,
      errorCode: authzResult.reason,
      supabase,
    });
  }

  return NextResponse.redirect(redirectTo);
}

