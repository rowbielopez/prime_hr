# Security Audit — PRIME-HR

**Date:** 2026-05-28
**Scope:** Auth, authorization, RLS, public endpoints, secrets, input validation, file uploads, audit logging.

---

## TL;DR

- ✅ RLS is enabled on **all 110+ tables**.
- ✅ Every audited server action calls `requirePermission()`.
- ✅ Service role key is server-only; no client exposure detected.
- ✅ OAuth callback enforces `ALLOWED_EMAIL_DOMAINS` and Google `hd` claim.
- ✅ Audit logging covers all sampled mutations.
- ⚠ **HIGH:** Rate limiter is in-memory only (not safe on serverless).
- ⚠ **HIGH (fixed in this audit):** Proxy/middleware was missing 4 protected path prefixes.
- ⚠ **MEDIUM:** File upload MIME whitelist not enforced; size limit only.
- ⚠ **MEDIUM:** 8 `as any` Supabase client casts hide type-safety guarantees.

---

## Findings Table

| #    | Issue                                                                                                                      | Location                                                                                                                                                                                                | Severity           | Risk                                                                            | Recommended Fix                                                                                                | Priority |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| S-01 | Middleware (`proxy.ts`) did not protect `/me`, `/pds`, `/requests`, `/service-records` — relied on layout-level check only | `src/proxy.ts`                                                                                                                                                                                          | High               | Defense-in-depth gap                                                            | **FIXED** in this audit: added the 4 path prefixes                                                             | Done     |
| S-02 | Rate limiter uses in-memory `Map` — each serverless instance has its own counter                                           | `src/lib/security/rate-limiter.ts`                                                                                                                                                                      | High               | Public application form can be abused at scale despite honeypot + per-email cap | Move to Redis/Upstash; fall back to in-memory in dev                                                           | High     |
| S-03 | Destructive UI actions still use browser `window.confirm()`                                                                | `src/components/features/service-records/service-record-detail-management.tsx:51`, `src/components/features/compliance/evidence/evidence-attachments.tsx:94`                                            | High (UX/security) | Easy to mis-tap on mobile; bypasses app focus model                             | Replace with `ConfirmDialog` foundation component                                                              | High     |
| S-04 | File upload validates size only, not MIME whitelist                                                                        | `src/features/compliance/evidence/actions.ts` (~L256), `src/features/platform/storage/actions.ts`                                                                                                       | Medium             | Malicious executables/HTML can be stored under user filename                    | Enforce allow-list (PDF, DOCX, XLSX, PNG, JPG) server-side                                                     | High     |
| S-05 | 8 `as any` Supabase casts in PDS and service records                                                                       | `src/features/pds/pds-workspace.actions.ts:26`, `src/features/pds/pds-review.actions.ts:18,43`, `src/features/service-records/repository/service-records.repository.ts:165,201,250,265,286,329,341,353` | Medium             | Hides type/schema drift bugs                                                    | Either regenerate types or add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + JSDoc reason | Medium   |
| S-06 | Dashboard query result includes `error.message`                                                                            | `src/features/dashboard/repository/prime-dashboard.repository.ts:38, 98`                                                                                                                                | Low                | Could surface DB internals in JSON shape                                        | Map to friendly enum; log details server-side                                                                  | Medium   |
| S-07 | Public `careers` actions swallow rate-limit lookup errors                                                                  | `src/features/recruitment/public/public-careers.actions.ts:40,186,191`                                                                                                                                  | Low                | Intentional obfuscation; acceptable but undocumented                            | Add brief comment to clarify                                                                                   | Low      |
| S-08 | No CSP / security headers configured                                                                                       | `next.config.ts` is empty                                                                                                                                                                               | Medium             | Missing X-Frame-Options, CSP, Strict-Transport-Security                         | Add `headers()` in `next.config.ts`                                                                            | High     |
| S-09 | No CSRF token on server actions (Next handles via origin check, but no explicit allow-list)                                | Global                                                                                                                                                                                                  | Low                | Next 16 same-origin enforcement covers most cases                               | Verify `experimental.serverActions.allowedOrigins` is set for production                                       | Medium   |
| S-10 | No bot protection beyond honeypot on `/careers/[slug]/apply`                                                               | `src/features/recruitment/public/public-careers.actions.ts`                                                                                                                                             | Medium             | Could be scripted                                                               | Consider Turnstile/hCaptcha for production                                                                     | Medium   |

---

## Detailed Findings

### Authentication & Authorization

- `src/proxy.ts` (Next.js 16 middleware) — redirects unauthenticated requests on protected prefixes. **Now covers all 12 protected route folders** after the patch.
- `src/app/(protected)/layout.tsx` → `requireAuthorizedUser()` provides per-page auth (server component).
- `src/app/auth/callback/route.ts`:
  - Exchanges OAuth code → session.
  - Requires `email_confirmed_at`.
  - Enforces `ALLOWED_EMAIL_DOMAINS` via `isAllowedEmail()`.
  - Validates Google Workspace `hd` claim against allowed list.
  - Safe redirect handling (falls back to `/dashboard`).
  - On any failure: signs out + clears `sb-*` cookies + redirects to `/login?error=...`.
- `requirePermission(...)` used by every audited mutating action.

### Role-Based Access (`src/lib/rbac/permissions.ts`)

- 55 permission strings across 7 domains.
- 6 roles: `super_admin`, `central_hr_admin`, `campus_hr_officer`, `office_unit_head`, `committee_member`, `employee`.
- **Employee role intentionally minimal** — only `dashboard.read`, `pds.self.*`, `learning.access`, `performance.read/write`, `rewards.read/nomination.create/read`, `rewards.history.read`. Cannot reach admin/HR queues even by URL (proxy + layout + action all reject).

### RLS Spot-Checks (migrations)

| Table                         | RLS | Read                                                  | Write               |
| ----------------------------- | --- | ----------------------------------------------------- | ------------------- |
| `employees`                   | ✅  | scoped to role + campus                               | admin/HR only       |
| `employee_pds_*` (14 tables)  | ✅  | owner + HR reviewer                                   | owner + HR reviewer |
| `employee_requests`           | ✅  | owner + HR reviewer                                   | owner + HR reviewer |
| `employee_service_records`    | ✅  | role-scoped                                           | HR only             |
| `recruitment_*` (8 tables)    | ✅  | HR/recruiter                                          | HR/recruiter        |
| `public_vacancies` (SQL view) | ✅  | `anon`, `authenticated` SELECT only on open vacancies | n/a                 |
| `audit_logs`                  | ✅  | `super_admin`, `central_hr_admin`                     | system inserts      |
| `notifications`               | ✅  | owner                                                 | system + admin      |

### Public Endpoint Controls (`/careers`)

| Control                                                           | Present                         |
| ----------------------------------------------------------------- | ------------------------------- |
| Zod validation (`publicApplicationSchema`)                        | ✅                              |
| Honeypot (`_hp` field)                                            | ✅                              |
| IP rate limit (5/15min, 20/24h)                                   | ✅ (in-memory)                  |
| Email+vacancy rate limit (3/24h)                                  | ✅ (in-memory)                  |
| Duplicate guard (same email on same vacancy)                      | ✅ DB query before insert       |
| Vacancy status filter (only `open`, not deleted, within deadline) | ✅ via `public_vacancies` view  |
| Audit log on submission                                           | ✅                              |
| CSRF / origin check                                               | Relies on Next 16 default       |
| Captcha                                                           | ❌ (recommended for production) |

### Service Role Key

- Loaded via `src/lib/env.ts` → `getAdminEnv()`.
- Only consumed by `src/lib/supabase/admin.ts` singleton.
- 19 importers — all in `*.actions.ts`, `*.repository.ts`, or `src/server/**`. **No client component imports**.

### Audit Log Coverage (sampled)

- Recruitment vacancies, applicants, ranking, recommendations — ✅
- Employees CRUD + email change — ✅
- PDS workspace + review — ✅
- Employee requests + HR review queue — ✅
- Service-record sync / backfill — ✅
- Compliance evidence + attachments — ✅
- Rewards nominations + reviews + approvals + committee — ✅
- Admin users + campuses + offices — ✅

Pattern is consistent: each action wraps `writeAuditLog()` in a `safeAuditLog()` helper that catches failures so they cannot break the user-facing flow.

### Secrets / Hardcoded Values

- No hardcoded production URLs, API keys, UUIDs, or emails.
- `localhost:54321` appears only as a dev fallback in `src/lib/env.ts`.
- `.env.example` documents `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_EMAIL_DOMAINS`.

### Console Logging

- `console.error("audit_log_failed", error)` is the only logging on hot paths.
- No `console.log` of user/employee/PDS data.

---

## Recommended Order of Fixes

1. (Done) Close proxy path gap.
2. Add CSP / X-Frame-Options / HSTS via `next.config.ts` `headers()`.
3. Replace in-memory rate limiter with Redis/Upstash.
4. Replace 2× `window.confirm` with `ConfirmDialog`.
5. Enforce MIME whitelist on uploads.
6. Add captcha to `/careers/[slug]/apply` for production.
7. Document `as any` casts (or remove with regenerated types).
