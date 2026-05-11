"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function normalizeRedirectPath(nextPath?: string): string {
  if (!nextPath) return "/dashboard";
  if (!nextPath.startsWith("/")) return "/dashboard";
  if (nextPath.startsWith("//")) return "/dashboard";
  return nextPath;
}

function getErrorMessage(error?: string): string | undefined {
  if (!error) return undefined;
  if (error === "unauthorized_domain") {
    return "Unauthorized account. Please sign in using an authorized CSU email domain.";
  }
  if (error === "unverified_email") {
    return "Your Google account email is not verified. Please verify your email and try again.";
  }
  if (error === "invalid_hosted_domain") {
    return "Your Google Workspace hosted domain is not allowed for this system.";
  }
  if (error === "access_pending") {
    return "Your account was created but is pending administrator approval. Please contact Central HR or your campus HR officer.";
  }
  if (error === "unauthorized_access") {
    return "Your account is signed in but not yet authorized for this system. Please request role and campus assignment.";
  }
  if (error === "ambiguous_employee_match") {
    return "We found multiple employee records for your email address. Contact HR support for account linking.";
  }
  if (error === "profile_resolution_failed") {
    return "Unable to resolve your local profile. Please contact system support.";
  }
  if (error === "oauth_exchange_failed") {
    return "Google sign-in exchange failed. Please try again. If this keeps happening, contact system support.";
  }
  if (error === "oauth_code_missing") {
    return "Missing OAuth callback code. Please restart sign-in from the login page.";
  }
  if (error === "oauth_user_read_failed") {
    return "Unable to read your signed-in Google account profile. Please try again.";
  }
  if (error === "session_reset_failed") {
    return "Sign-out after an authorization failure did not complete cleanly. Please close this browser and sign in again.";
  }
  return error;
}

export function LoginCard({ error, nextPath }: { error?: string; nextPath?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const safeNext = normalizeRedirectPath(nextPath);
  const errorMessage = getErrorMessage(error);

  async function signInWithGoogle() {
    setIsLoading(true);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", safeNext);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });
      if (error) throw error;
    } catch (e) {
      toast.error("Sign-in failed", { description: e instanceof Error ? e.message : "Please try again." });
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/50 p-6">
      <Card className="w-full max-w-md border-border/70 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">CSU PRIME-HR</div>
            <CardTitle className="text-2xl">Sign in to your account</CardTitle>
          </div>
          <CardDescription>Use your authorized CSU Google account to access PRIME-HR workflows.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
              {errorMessage}
            </div>
          ) : null}
          <Button onClick={signInWithGoogle} disabled={isLoading} className="h-10">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
              <path
                d="M21.35 11.1H12v2.98h5.36c-.23 1.48-1.72 4.33-5.36 4.33-3.22 0-5.84-2.67-5.84-5.96 0-3.3 2.62-5.97 5.84-5.97 1.84 0 3.07.79 3.78 1.47l2.58-2.5C16.7 3.92 14.57 3 12 3 6.96 3 2.88 7.03 2.88 12s4.08 9 9.12 9c5.26 0 8.74-3.69 8.74-8.88 0-.6-.07-1.02-.14-1.42Z"
                fill="currentColor"
              />
            </svg>
            {isLoading ? "Redirecting..." : "Sign in with Google"}
          </Button>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Access is restricted to authorized CSU accounts.</p>
            <p>Authentication is validated against local role, campus, and office assignments.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

