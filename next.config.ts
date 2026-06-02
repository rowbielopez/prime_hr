import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Content-Security-Policy
//
// `unsafe-inline` in script-src is required by Next.js App Router (inline
// bootstrapping scripts). `unsafe-eval` is added in development only — React
// requires it for call-stack reconstruction and Fast Refresh; it is never
// present in the production CSP.
// Supabase URL is included in connect-src so the browser client can reach it.
// Google accounts is included for OAuth redirects.
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isDev = process.env.NODE_ENV === "development";

// React requires eval() in development for call-stack reconstruction and
// Fast Refresh. It is never used in production, so we exclude it there.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline scripts for bootstrapping.
  scriptSrc,
  // Tailwind and shadcn/ui use inline styles.
  "style-src 'self' 'unsafe-inline'",
  // Allow data URIs for images (e.g. avatars generated as data URLs).
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  // Supabase REST + Storage + Auth, Google accounts for OAuth.
  `connect-src 'self' ${supabaseUrl} https://accounts.google.com`,
  // No iframing of this app.
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // Block plugins (Flash, etc.).
  "object-src 'none'",
  // Prevent base-tag hijacking.
  "base-uri 'self'",
  // Form submissions must stay on the same origin.
  "form-action 'self' https://accounts.google.com",
  // Upgrade HTTP to HTTPS where possible.
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    // Deny rendering in iframes to prevent clickjacking.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME-type sniffing.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Only send origin on same-origin navigations; no referrer on cross-origin.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Opt out of FLoC / interest-cohort advertising.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
