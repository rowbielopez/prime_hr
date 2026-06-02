# PRIME-HR — Codebase Memory

> Reusable project context for **CSU PRIME-HR**, the HRIS for Caraga State University.
> Purpose: preserve architecture, conventions, flows, and known risks so future work skips re-discovery.
> Pair this with `AGENTS.md` (authoritative rules) — this file is the *map*, `AGENTS.md` is the *law*.
> Last analyzed: 2026-06-02 · ~518 TS/TSX files · 60 SQL migrations.

---

## 1. Stack & Tooling

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.2** (App Router, RSC) | ⚠️ Treat as unfamiliar — read `node_modules/next/dist/docs/` before using APIs. Middleware is `src/proxy.ts` (renamed from `middleware.ts` in Next 16). |
| Runtime | **React 19.2** | |
| DB / Auth / Storage | **Supabase** (Postgres + RLS + Google OAuth + Storage) | RLS active on all tables. `legacy` schema is **service-role only**. |
| Language | **TypeScript strict** | No `any` without eslint-disable + justification. |
| UI | **shadcn/ui** + **Tailwind v4** + `@base-ui/react` | 23 primitives in `src/components/ui/`. |
| Forms / Validation | **react-hook-form** + **Zod v4** (`@hookform/resolvers`) | Zod at every action boundary. |
| Misc | framer-motion, recharts, sonner (toasts), date-fns, lucide-react | |
| Server-only heavy deps | **pdfkit**, **exceljs** | PDS/report export. Keep server-side. |
| Rate limiting | **@upstash/ratelimit + @upstash/redis** | In-memory fallback when env absent (dev). |

**Scripts:** `npm run verify` = `typecheck && lint && build` (run before completing any task). DB: `db:reset`, `db:push`, `db:gen-types`. Legacy migration: `legacy:analyze|dump|load|validate|migrate`. Tests: `vitest` (only one spec exists today: `transformers.spec.ts`).

---

## 2. Directory Map (the conventions that matter)

```
src/
  app/
    (protected)/        # auth-gated routes — admin, compliance, employees, learning,
                        #   performance, recruitment, rewards, me, pds, requests, service-records
    (public)/careers/   # public job board + application (unauthenticated)
    auth/callback/      # Google OAuth callback (route.ts) — domain gate + provisioning
    login/  forbidden/
  components/
    ui/                 # shadcn primitives
    foundation/         # shared layout/data primitives (see §6)
    features/<domain>/  # domain-specific client components
  features/<domain>/    # DOMAIN LOGIC (the core pattern — see §3)
    actions.ts          # "use server" mutations  (NOTE: file is actions.ts, NOT <domain>.actions.ts)
    repository/*.repository.ts   # pure DB reads
    schemas/*.schema.ts # Zod
    server/             # extra server-only helpers
    types.ts            # client-safe types
  lib/
    constants/roles.ts  # APP_ROLES / AppRole
    rbac/permissions.ts # AppPermission union + rolePermissionsMap + resolvePermissions()
    rbac/scopes.ts      # hasPermission / canAccessCampus / canAccessOffice
    db/types.ts, db/scoped-query.ts
    supabase/           # browser / server / admin / middleware-client / config
    security/rate-limiter.ts
    env.ts              # Zod-validated lazy env getters
  server/pds/templates/ # CS-Form-No-212-Revised-2025.xlsx (PDS export template)
  proxy.ts              # Next.js middleware (auth redirect gate)
supabase/migrations/    # 0001 → 0060 (numbered, additive only)
docs/                   # architecture, database-schema, pds-rev-2025-integration, security-and-privacy, etc.
```

**Domains:** `admin` (users/organization), `audit`, `auth`, `compliance` (evidence/indicators), `dashboard`, `employees`, `learning` (programs/sessions/requests/plans/competencies/participants/reports), `me` (self-service), `migration/legacy-hris`, `pds`, `performance`, `platform` (audit/notifications/storage), `recruitment` (vacancies/applicants/recommendations/public), `reports`, `requests`, `rewards`, `service-records`.

---

## 3. Core Patterns (follow these exactly — do not invent new ones)

### Server action
```ts
"use server";
export async function fooAction(input: FooInput): Promise<ActionResult> {
  const context = await requirePermission({ permission: "domain.x.write", campusId, officeId });
  const parsed = fooSchema.safeParse(input);          // Zod at boundary
  if (!parsed.success) return failure(...);
  // ...repository call / supabase mutation...
  await writeAuditLog({ eventType, action, entityType, entityId, campusId, metadata });
  revalidatePath("/...");
  return success();
}
```
- `ActionResult = { ok: true } | { ok: false; error: string }` (per-domain variants).
- **Always** `requirePermission()` (or `requireAuthorizedUser()` for self-service) first.
- **Never** pass `actorUserId` to `writeAuditLog` — derived from session.

### Page (Server Component)
Async RSC fetches data server-side via repository + resolves auth, then passes to a `"use client"` shell. Helper `withProtectedPageMeta({ pathname, permission })` resolves auth context + breadcrumb `PageMeta` in one call.

### Repository
Pure reads in `repository/*.repository.ts`. Use the per-request **server client** (RLS-enforced) by default; the **admin client** (service-role, RLS-bypassing) only for deliberate global lookups (see §4 cautions).

---

## 4. Auth & RBAC (the security backbone)

**Flow:** `proxy.ts` (redirect unauth on protected paths) → `/auth/callback` (OAuth) → `provisionAndAuthorizeUser` → page/action `requirePermission` → `resolveAuthorizationContext`.

- **Roles** (`AppRole`): `super_admin`, `central_hr_admin`, `campus_hr_officer`, `office_unit_head`, `committee_member`, `employee`.
- **Permissions:** string union `AppPermission` in `lib/rbac/permissions.ts`; static `rolePermissionsMap`. `resolvePermissions(roles)` flattens+dedupes.
- **`AuthorizationContext`** (the object threaded everywhere): `{ authUserId, appUserId, email, roles, permissions, campusScopes[], officeScopes[], primaryCampusId, primaryOfficeId, isSuperAdmin }`.
- **`requirePermission({ permission, campusId?, officeId? })`** → checks `hasPermission` + `canAccessCampus` + `canAccessOffice`; `redirect()` to `/forbidden?reason=...` on failure. Returns the context.
- **Scope rules** (`lib/rbac/scopes.ts`): `super_admin` bypasses all scope checks; null campus/office = allowed; otherwise must be in `campusScopes`/`officeScopes`.
- **`resolveAuthorizationContext`** queries `app_users` → `user_roles` (filters active + effective date window via `isRoleActiveForDate`) → `user_role_offices`. Inactive/suspended user or no active role ⇒ `null` ⇒ unauthorized.

**OAuth callback gate** (`/auth/callback/route.ts`), in order: code exchange → `email_confirmed_at` → `ALLOWED_EMAIL_DOMAINS` check → Google hosted-domain (`hd`) check → `provisionAndAuthorizeUser`. Any failure → sign out + clear `sb-*` cookies + redirect to login with error code. `next` path is validated (`startsWith("/")`, not `//`) to prevent open redirect.

**Provisioning** (`provision-and-authorize-user.ts`, uses **admin client**): first login creates an `inactive` `app_users` row (no role) ⇒ `access_pending`; admin must activate + assign role + link employee. Does **not** auto-link `employee_id` (unique constraint `uq_app_users_employee_id`). On email-unique conflict (23505) it **reclaims** the existing row by re-pointing `auth_user_id` (justified by Google email ownership + domain gate already passed).

---

## 5. Supabase Clients (pick the right one)

| Client | File | RLS | Use for |
|---|---|---|---|
| Browser | `supabase/browser.ts` | enforced | client components |
| Server | `supabase/server.ts` (per-request, cookie-bound) | **enforced** | default for reads/writes |
| Middleware | `supabase/middleware-client.ts` | enforced | `proxy.ts` only |
| **Admin** | `supabase/admin.ts` (singleton, service-role) | **BYPASSED** | global uniqueness, provisioning, unauthenticated public flows, audit log writes |

**Admin client is used in 12 files** — every one is a potential cross-campus data-exposure point if a scope filter is missing. Audited usages today are guarded: `me.actions` derives `employeeId` from session then `.eq("id", employeeId)`; `employees.repository.findPossibleDuplicates` is intentionally global; `public-careers.actions` is unauthenticated-by-design (guarded by rate limit + honeypot + duplicate check). **Rule: any new admin-client query MUST manually apply the same scope the RLS policy would have.**

`lib/db/scoped-query.ts` → `applyAuthorizationScope(query, context)` adds `.in("campus_id", campusScopes)` for non-super-admins (deliberately omits office filter — RLS remains source of truth).

---

## 6. Foundation / UI primitives (reuse, don't rebuild)

- `foundation/data/`: `admin-data-table.tsx` (+ `.helpers.ts`, `use-admin-table-state.ts`), `data-table-wrapper.tsx`, `search-filter-bar.tsx`, `filter-controls.tsx` — all tables get search/filter/pagination/empty/skeleton from here.
- `foundation/page/`: `page-header.tsx`, `sticky-page-header.tsx`, `content-section.tsx`, `section-header.tsx`, `page-tabs.tsx`, `inspector-layout.tsx`, `breadcrumbs.ts` (`getPageMeta`).
- `foundation/routing/`: `route-registry.ts` (central route → label/icon/permission/module-color map), `build-app-nav.ts`, `nav-visuals.ts`.
- `foundation/`: `command/`, `dashboard/`, `feedback/`, `forms/` (`controls/form-select.tsx`, `form-layout.tsx`), `motion/`, `theme/` (`theme-provider`, `theme-toggle`), `layout/` (`sidebar-nav`, `build-app-nav`).
- Toasts via **sonner**. Module accent colors: people / compliance / recruitment / learning / performance / rewards / platform (mirror `--module-*` tokens in `globals.css`).

---

## 7. Domain Flows (high level)

- **Recruitment:** vacancies → applicants → screening/interviews → ranking → recommendations. Public job board at `(public)/careers/[slug]/apply` posts via `submitPublicApplicationAction` (admin client, rate-limited, honeypot `_hp`, reference no via RPC `next_application_reference_no`).
- **PDS (CSC Form 212 Rev 2025):** self-service `/pds`, HR view `/employees/[id]/pds`, edit/print/download. Sections 1–10 must stay in order, never silently omit a field. Export template: `src/server/pds/templates/CS-Form-No-212-Revised-2025.xlsx`. See `docs/pds-rev-2025-integration.md` + migration `0044`.
- **Compliance:** indicators + evidence (with attachments, soft-delete, storage hardening) + action plans + dashboard + committee review.
- **Learning & Development:** programs → sessions → requests/nominations → participants; competencies + assessments; reporting views (migration `0031`). Status-transition guards enforced in DB (migrations `0028`, `0033`).
- **Performance:** cycles → records → reviews → finalization (audit history `0036`), rating bands/config.
- **Rewards:** catalog/awards → nominations → committee reviews → approvals; status history + decision snapshot (`0042`).
- **Employee requests** (`/requests`, `/me/requests`): submission + review workflow (`0053`–`0055`).
- **Legacy migration** (`features/migration/legacy-hris/`): SQL → NDJSON → staging → public. Mappings in `mapping.ts` / `transformers.ts` (see AGENTS.md table). Infra in migration `0045`–`0047`. `legacy` schema service-role only.
- **Platform:** notifications, secure documents (storage), audit. Audit log via `writeAuditLog()` (`features/audit/server/write-audit-log.ts`); platform audit via `logPlatformAudit` + `AUDIT_EVENTS`.

---

## 8. Migrations (additive, numbered 0001–0060)

Schema changes are **new numbered files only** — never edit existing ones. Notable: `0004/0007/0015/0060` RLS policies & campus scoping, `0008` auth hardening, `0044` PDS 2025, `0045–0047` legacy infra, `0050` auth user lookup RPC, `0056–0059` public careers. `seed.sql` = reference/lookup data only. **Never assume column names — grep the migration before referencing a table/column.**

---

## 9. Security Findings

### Confirmed gaps / things to fix
1. **File-size not enforced server-side.** `requestSecureDocumentUploadAction` validates MIME *only when declared* (null/empty allowed) and stores `fileSizeBytes` without checking a max. AGENTS.md §G requires server-side type **and size** validation. **Fix:** reject missing/oversized files; consider requiring MIME for non-presigned flows. *(Priority: High)*
2. **PII in server logs.** `console.error("[provision] ...", error)` and ~49 `console.*` calls in `src/features` may surface emails / error details. AGENTS.md §G forbids logging PII. **Fix:** scrub identifiers from logs; log codes, not payloads. *(Priority: High)*
3. **Spoofable client IP for rate limiting.** `getClientIp()` trusts leftmost `x-forwarded-for`. An attacker can rotate the header to evade the public-careers IP limit; the email+vacancy limit (3/24h) still applies. **Fix:** trust only the platform-injected forwarded header / use a hardened source on the deploy target. *(Priority: Medium)*
4. **Rate-limiter in-memory fallback in prod.** If `UPSTASH_*` envs are missing in production, limits are per-process and effectively bypassable across instances. **Fix:** assert Upstash config at boot in production. *(Priority: Medium)*
5. **Admin-client RLS bypass surface (12 files).** Correct today, but fragile: a future query missing a manual scope filter silently leaks cross-campus data. **Fix:** add a lint/code-review checklist + helper that forces explicit scoping. *(Priority: Medium — ongoing)*
6. **CSP `script-src 'unsafe-inline'`** in production (Next.js inline bootstrap requirement). Accepted, but it weakens XSS defense. Revisit nonce-based CSP if Next supports it cleanly. *(Priority: Low)*
7. **Email-based account reclaim on 23505.** Auto re-points `auth_user_id` by email. Safe given the domain gate runs first, but it's a sensitive auto-link — keep the audit event (`auth.account_reclaimed_by_email`) and monitor it. *(Priority: Low — by design)*

### Good practices already in place
- Strong security headers in `next.config.ts` (CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy).
- Env validated with Zod (`lib/env.ts`); service-role key never in `NEXT_PUBLIC_*`.
- OAuth domain + hosted-domain + email-confirmed gates; cookie cleanup on rejection; open-redirect-safe `next`.
- Zod at action boundaries; audit logging for sensitive mutations; soft-delete (`deleted_at`) + `is_active` filters.
- Honeypot + duplicate guard + reference-number RPC on public application.

---

## 10. Optimization Findings

1. **Double `auth.getUser()` per navigation.** `proxy.ts` calls `getUser()` (network round-trip to Supabase Auth) on every non-static request (broad matcher), then the page re-resolves auth via `requireAuth`/`resolveAuthorizationContext`. **Fix:** rely on middleware result downstream, or narrow the matcher. *(High impact on latency.)*
2. **No per-request memoization of auth context.** `resolveAuthorizationContext` issues 3 sequential Supabase queries (`app_users` → `user_roles` → `user_role_offices`) and is called by every protected page/action with no caching. **Fix:** wrap in React `cache()` (none used today) so a single request resolves it once.
3. **Sequential queries in hot paths.** e.g. `findPossibleDuplicates` runs several `await`ed queries in series; some could be `Promise.all`. General pattern: prefer parallelizing independent reads.
4. **Bundle weight.** `recharts` + `framer-motion` are client-heavy; ensure they're only imported where rendered (dynamic import for chart-heavy dashboards). `pdfkit`/`exceljs` are server-only — keep them out of client bundles.
5. **Caching opportunities.** Reference/lookup data (campuses, offices, roles, indicators) is stable — cache with `revalidate`/tags instead of refetching per request. Use granular `revalidatePath`/`revalidateTag` after mutations rather than broad invalidation.
6. **Scalability.** Indexes exist for L&D (`0030`); verify hot filters elsewhere (audit logs, employees by campus/office, applications by vacancy) are indexed. Audit-log table grows unbounded — plan partitioning/retention.

---

## 11. Recommended Improvements (prioritized)

**Quick wins**
- Enforce file size + required MIME in `requestSecureDocumentUploadAction`.
- Wrap `resolveAuthorizationContext` in React `cache()`.
- Scrub PII from `console.*`; route through a redacting logger.
- Assert `UPSTASH_*` present in production at startup.

**Refactors / deeper review**
- Eliminate redundant `getUser()` between `proxy.ts` and pages.
- Add a guarded admin-client wrapper that requires an explicit scope, plus a review checklist for the 12 call sites.
- Parallelize independent repository reads; audit for N+1 in list pages with related lookups (`campus:campuses(name)` joins are fine; sequential awaits are the concern).
- Expand test coverage — only one spec exists; prioritize RBAC scope checks, the OAuth callback gate, and Zod schemas.

**Areas needing deeper review**
- RLS policy completeness vs. admin-client queries (defense-in-depth parity).
- Legacy migration data integrity (`migration/legacy-hris/`), especially service-record mismatches (`legacy:mismatch` script).
- PDS export correctness/completeness (legal document — no silent field omission).

---

## 12. Gotchas / Reminders

- This is **not** the Next.js in training data — read `node_modules/next/dist/docs/` first. Middleware lives in `src/proxy.ts`.
- Action files are `actions.ts` (not `<domain>.actions.ts`, despite AGENTS.md prose).
- `writeAuditLog` derives the actor — never pass `actorUserId`.
- Run `npm run verify` before declaring done; strict TS, no `any` without justification.
- Don't query the `legacy` schema from client/server-action code (service-role only).
- Recent work (git log) is a **navigation/dashboard/modal/table redesign** + hydration-warning fixes — UI foundation is actively churning; check `foundation/` before restyling.
