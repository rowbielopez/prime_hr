# Pre-Shipping Action Plan — PRIME-HR

**Date:** 2026-05-28
**Verdict:** Almost Ready. No CRITICAL blockers. Address HIGH items before public rollout.

---

## Critical Fixes Before Shipping

_None. All identified issues are HIGH or below._

> A `Critical` flag is reserved for: broken core save/submit flow, exposed secrets, complete RBAC bypass, or production-breaking build error. None observed.

---

## High Priority (must fix before public rollout)

### 1. Move rate limiter to Upstash/Redis

- **Why it matters:** In-memory `Map` does not survive between serverless instances. The 5/15-min + 20/24h IP cap and 3/24h email+vacancy cap can be bypassed by hitting different instances. Honeypot still filters dumb bots but real abuse is unmitigated.
- **Files:** `src/lib/security/rate-limiter.ts`, callers in `src/features/recruitment/public/public-careers.actions.ts`.
- **Suggested fix:** Add `@upstash/ratelimit` + `@upstash/redis`. Keep in-memory fallback for dev when `UPSTASH_*` env vars are absent.
- **Risk:** Low (additive). Test with `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- **Complexity:** Small.

### 2. Replace `window.confirm()` with `ConfirmDialog`

- **Why it matters:** Off-brand, not accessible, mobile-hostile. Foundation `ConfirmDialog` is already used everywhere else.
- **Files:**
  - `src/components/features/service-records/service-record-detail-management.tsx:51`
  - `src/components/features/compliance/evidence/evidence-attachments.tsx:94`
- **Suggested fix:** Import `ConfirmDialog`, hold a `useState` for open/loading, run the action in `onConfirm`.
- **Risk:** Low.
- **Complexity:** Small.

### 3. Add security headers in `next.config.ts`

- **Why it matters:** No CSP, X-Frame-Options, HSTS, or Referrer-Policy currently set. Production deployment leaves cookies and same-origin assumptions undefended.
- **Files:** `next.config.ts`.
- **Suggested fix:** Add a `headers()` function returning sensible defaults; tune CSP for Supabase URL allow-list and Google OAuth.
- **Risk:** Medium (CSP can break inline scripts).
- **Complexity:** Medium.

### 4. Enforce MIME whitelist on uploads

- **Why it matters:** Evidence and secure document upload currently validate size only. A user could upload `.exe` or `.html` disguised by extension.
- **Files:** `src/features/compliance/evidence/actions.ts`, `src/features/platform/storage/actions.ts`.
- **Suggested fix:** Maintain `ALLOWED_MIME_TYPES = new Set([...])`; reject if `!set.has(file.type)`.
- **Risk:** Low.
- **Complexity:** Small.

### 5. Production deployment checklist

- **Why it matters:** README references "prior deployment review" but the doc is missing. Risk: production callback URLs not allow-listed in Supabase Auth / Google OAuth Web client.
- **Files:** `docs/deployment-checklist.md` (new).
- **Suggested contents:** Vercel env vars, Supabase Auth → Redirect URLs, Google OAuth Web client redirect URIs, `ALLOWED_EMAIL_DOMAINS`, Storage bucket configuration, Upstash credentials.
- **Risk:** None (documentation).
- **Complexity:** Small.

---

## Medium Priority

### 6. Add pagination guards to list reads

- `listVacancies()` and `listApplicants()` have no `.limit()`. Add `.limit(200)` and surface UI pagination once the page does paging.
- **Files:** `src/features/recruitment/vacancies/repository/vacancies.repository.ts`, `src/features/recruitment/applicants/repository/applicants.repository.ts`.
- **Risk:** Low.

### 7. Add `employment_status` ↔ `date_separated` consistency

- **Suggested migration:**
  ```sql
  alter table public.employees
    add constraint employees_separation_status_chk
    check (
      (employment_status <> 'separated' and date_separated is null)
      or (employment_status = 'separated' and date_separated is not null)
    );
  ```
- **Risk:** Must inspect existing rows first to avoid CHECK failures on `db:push`.

### 8. Toast feedback for server-action callers

- A handful of mutating client buttons do not surface a `toast.success` / `toast.error`. Standardize via a small helper.
- **Files:** TBD via sweep of `src/components/features/**` for `await ...Action(...)` without subsequent toast.

### 9. Add `aria-label` to icon-only buttons

- Especially row actions in tables (learning sessions, service-records, requests).

### 10. Wrap wide tables in `overflow-x-auto`

- Service-record list, learning session participants, performance records, ranking — all have `min-w-[...]` columns. Wrap their parent in `overflow-x-auto md:overflow-visible`.

### 11. Lazy-load PDS sections

- `/pds` workspace currently renders all 9 sections. Use `dynamic(() => import(...), { ssr: true })` per section accordion.

### 12. Suspense + skeleton fallbacks on dashboard

- Today `Promise.all` blocks first paint until all metrics return. Wrap each card in `Suspense` with `DashboardCardsSkeleton`.

### 13. Document or remove `as any` casts

- 8 occurrences across PDS and service-records repositories.

### 14. Add captcha (Turnstile / hCaptcha) to public application form

- Defense-in-depth on top of honeypot.

---

## Low Priority / Nice to Have

- Remove `/me/leave` placeholder from sidebar until the feature ships, or replace with a banner-only "Coming soon" page.
- Wire `/me/employment` "Request a correction" button to `/me/requests/new`.
- Add `robots.txt` and `sitemap.xml` (or `app/sitemap.ts`) for the `/careers/*` public pages.
- Resolve 33 ESLint `no-unused-vars` warnings.
- Add error.tsx and not-found.tsx for selected route groups with branded UX.
- Persist sidebar collapsed-section state to user preferences.
- Add a global `/dashboard` activity feed entry for every audit-logged event.

---

## What to Add / Update / Remove / Keep

### Add

- Redis-backed rate limiter.
- Security headers config.
- Deployment checklist doc.
- MIME whitelist guard.
- Captcha for public form.
- `app/sitemap.ts` and `app/robots.ts` for `/careers`.

### Update

- `ConfirmDialog` adoption in archive/delete flows.
- Pagination on vacancies / applicants list reads.
- DB constraint for `employment_status` ↔ `date_separated`.
- Toast wrappers for server actions.
- A11y on icon-only buttons.
- Responsive table wrappers.

### Remove / Simplify

- `/me/leave` placeholder page (or feature-flag it out of nav).
- `/me/employment` "Request a correction (coming soon)" button.
- 8 `as any` casts in PDS + service-records repositories (or annotate).

### Keep Unchanged

- Foundation component library — excellent shape.
- Permission catalog and role mapping.
- Audit log pattern and `safeAuditLog` wrapper.
- OAuth callback handler — strong domain enforcement.
- RLS coverage — complete.
- Public careers SQL view pattern.
- Server Action + Repository + Schemas + Zod architecture.

---

## Suggested Next-Prompt to the Agent

> "Implement High items 1–4 from `docs/generated/pre-shipping-action-plan.md`: (a) replace `window.confirm()` with `ConfirmDialog` in service-record archive and evidence delete flows, (b) migrate the public-application rate limiter to Upstash with in-memory fallback in dev, (c) add CSP / X-Frame-Options / HSTS / Referrer-Policy headers in `next.config.ts`, (d) enforce a MIME whitelist on the compliance evidence and secure document upload actions. Then write `docs/deployment-checklist.md` covering Vercel env vars, Supabase Auth Redirect URLs, Google OAuth Web client URIs, `ALLOWED_EMAIL_DOMAINS`, Storage buckets, and Upstash credentials. Run `npm run verify` after each step and report all changed files."
