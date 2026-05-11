import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  /**
   * Comma-separated domains, e.g. "csu.edu.ph,carsu.edu.ph"
   * Used to enforce post-login authorization gates.
   */
  ALLOWED_EMAIL_DOMAINS: z.string().min(1),
});

const adminEnvSchema = publicEnvSchema.extend({
  ALLOWED_EMAIL_DOMAINS: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type AdminEnv = z.infer<typeof adminEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;
let cachedAdminEnv: AdminEnv | null = null;

/**
 * Lazily validates environment variables.
 *
 * Why lazy: Next.js may import route modules during build/collect phases.
 * We want strict validation at runtime without breaking installs/builds
 * when `.env.local` isn't set yet.
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    // Allow `next build` to run before `.env.local` is set up.
    // Runtime (dev server / deployed) still fails fast.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      cachedPublicEnv = {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-placeholder",
      };
      return cachedPublicEnv;
    }

    // Intentionally throw a non-Zod error to keep logs concise.
    throw new Error(
      "Missing required public environment variables. Copy `.env.example` to `.env.local` and fill in Supabase values."
    );
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS,
  });

  if (!parsed.success) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      cachedServerEnv = {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-placeholder",
        ALLOWED_EMAIL_DOMAINS: "example.com",
      };
      return cachedServerEnv;
    }

    throw new Error(
      "Missing required server environment variables. Copy `.env.example` to `.env.local` and fill in Supabase + ALLOWED_EMAIL_DOMAINS."
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getAdminEnv(): AdminEnv {
  if (cachedAdminEnv) return cachedAdminEnv;

  const parsed = adminEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Missing required admin environment variables. Ensure SUPABASE_SERVICE_ROLE_KEY is set in `.env.local`."
    );
  }

  cachedAdminEnv = parsed.data;
  return cachedAdminEnv;
}

export function getAllowedEmailDomains(): string[] {
  return getServerEnv()
    .ALLOWED_EMAIL_DOMAINS.split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

