"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LandingNav } from "./nav/LandingNav";
import { HeroSection } from "./sections/HeroSection";
import { IntroSection } from "./sections/IntroSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { TransformSection } from "./sections/TransformSection";
import { PrimeHrmSection } from "./sections/PrimeHrmSection";
import { StatsSection } from "./sections/StatsSection";
import { CtaSection } from "./sections/CtaSection";
import { LoginSection } from "./sections/LoginSection";
import { FooterSection } from "./sections/FooterSection";

function normalizeRedirectPath(nextPath?: string): string {
  if (!nextPath) return "/dashboard";
  if (!nextPath.startsWith("/")) return "/dashboard";
  if (nextPath.startsWith("//")) return "/dashboard";
  return nextPath;
}

export function LoginCard({ error, nextPath }: { error?: string; nextPath?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const safeNext = normalizeRedirectPath(nextPath);

  // Enable smooth scrolling for anchor links on this page
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  async function signInWithGoogle() {
    setIsLoading(true);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", safeNext);
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });
      if (signInError) throw signInError;
    } catch (e) {
      toast.error("Sign-in failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-canvas">
      <LandingNav />
      <HeroSection onSignIn={signInWithGoogle} isLoading={isLoading} />
      <IntroSection />
      <FeaturesSection />
      <TransformSection />
      <PrimeHrmSection />
      <StatsSection />
      <CtaSection />
      <LoginSection
        error={error}
        nextPath={safeNext}
        isLoading={isLoading}
        onSignIn={signInWithGoogle}
      />
      <FooterSection />
    </div>
  );
}

