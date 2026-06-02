# PRIME-HR Shipping Readiness Audit

**Date:** 2026-05-28
**Repository:** CSU PRIME-HR (Next.js 16 App Router + Supabase)
**Branch:** main (working tree)
**Auditor:** AI Code Review (GitHub Copilot)

> **Scope:** Full system-wide readiness audit covering security, RBAC, UI/UX, responsiveness, performance, workflows, data integrity, deployment posture, and build health. No destructive changes performed. One small low-risk fix applied (see "Fixes Applied").

---

## 1. Overall Verdict

**Readiness:** **Almost Ready** — strong fundamentals, no critical blockers, several MEDIUM issues should be addressed before public rollout.

**Readiness Score: 82 / 100**

| Category              | Score   | Notes                                                                                                 |
| --------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Security              | 17 / 20 | Strong RLS + RBAC + audit; rate limiter is in-memory; some `as any` in PDS                            |
| Core Workflows        | 19 / 20 | Every major workflow is implemented and consistent                                                    |
| UI/UX                 | 12 / 15 | Foundation system is excellent; 2 `window.confirm`, missing aria-labels                               |
| Mobile/Responsiveness | 11 / 15 | Sidebar drawer + responsive grids OK; tables have `min-w` constraints                                 |
| Performance           | 8 / 10  | A few unbounded list reads; in-memory rate limiter                                                    |
| Data Integrity        | 8 / 10  | Strong constraints; `employment_status` vs `date_separated` not enforced                              |
| Deployment Readiness  | 7 / 10  | `.env.example` present; no production callback verification, no `robots.txt`/`sitemap` for `/careers` |

**Build status (verified locally):**

| Check     | Command                 | Result                                      |
| --------- | ----------------------- | ------------------------------------------- |
| Typecheck | `npm run typecheck`     | ✅ Passes                                   |
| Lint      | `npm run lint`          | ✅ 0 errors / 33 warnings (all unused-vars) |
| Build     | `npm run build`         | ✅ Passes (prior terminal run, exit code 0) |
| Tests     | `npm run test` (vitest) | ⚠ Not executed in this audit                |

---

## 2. System Inventory

**Total routes:** 117 (3 root/auth, 4 public, 110 protected)
**Sidebar workspaces:** 8 (My Workspace, Command Center, People Ops, Governance, Talent Pipeline, Growth & Performance, Recognition, Insights, System)
**Migrations applied:** 0001 → 0059 (59 numbered migrations)
**Source domains:** 17 (`src/features/*`)

### Working modules (verified)

- Admin: `users`, `campuses`, `offices`, `compliance-indicators`
- Employees: list, detail, PDS view/edit/print, training, requests review
- Service Records: list, detail, print, employee self-view
- PDS: self-service workspace, HR review queue, employee HR edit
- Recruitment: vacancies (CRUD + publish), applicants (CRUD + convert), ranking, recommendations, reports
- Public Careers: listing, detail (`/careers/[slug]`), application form, success page
- Compliance: evidence (CRUD), dashboard
- Learning: programs, plans, sessions, requests, competencies + assessments, reports
- Performance: cycles, records, reviews, self-assessment, dashboard, finalizations, rating bands
- Rewards: awards catalog, nominations, reviews, approvals, history, reports
- Employee self-service: profile, employment, service-record, documents, PDS, requests, notifications, settings

### Placeholder / not implemented

- `/me/leave` (visible "coming soon" placeholder)
- `/me/employment` — "Request a correction (coming soon)" button only
- `/payroll`, `/benefits`, `/audit/logs`, `/reports`, `/settings` — flagged `isComingSoon: true` in route registry, **filtered out of the sidebar** (no broken nav entries)

### Confirmed access control

- Layout: `src/app/(protected)/layout.tsx` calls `requireAuthorizedUser()` for every protected page.
- Proxy (Next 16 middleware): `src/proxy.ts` — **patched in this audit** to also cover `/me`, `/pds`, `/requests`, `/service-records` (previously missing).
- Server actions: every audited `*.actions.ts` calls `requirePermission(...)`.
- Public pages: read only from SQL view `public_vacancies` (open + non-deleted + within deadline).

---

## 3. Severity Summary

| Severity | Count | Examples                                                                                                                                                                                                                                                                                                     |
| -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Critical | 0     | —                                                                                                                                                                                                                                                                                                            |
| High     | 3     | 2× `window.confirm` for destructive actions; in-memory rate limiter on serverless; missing production deployment checklist                                                                                                                                                                                   |
| Medium   | 9     | 8× `as any` Supabase casts, unbounded `listVacancies`/`listApplicants`, missing `aria-label` on icon buttons, separation status not constrained, table `min-w`, no toast feedback from a few server actions, no MIME whitelist on uploads, no robots/sitemap for `/careers`, `/me/leave` placeholder visible |
| Low      | 12    | Dashboard error string in metric, login decorative blur sizes, login page custom layout, unused-vars lint warnings, removed `auth/callback` page (route used), etc.                                                                                                                                          |

See `security-audit-report.md`, `ui-ux-audit-report.md`, `performance-audit-report.md` for the granular tables.

---

## 4. Critical / High Issues (must address before public rollout)

### H1. In-memory rate limiter on serverless

- **File:** `src/lib/security/rate-limiter.ts`
- **Risk:** On Vercel/Lambda, each instance has its own counter — a determined attacker can bypass the 5/15-min and 20/24h caps by hitting different instances. Honeypot still filters dumb bots, but real abuse is not prevented globally.
- **Fix:** Move to Redis/Upstash. Keep in-memory fallback for dev.

### H2. Destructive actions use `window.confirm()` (UX + a11y regression)

- **Files:**
  - `src/components/features/service-records/service-record-detail-management.tsx:51`
  - `src/components/features/compliance/evidence/evidence-attachments.tsx:94`
- **Fix:** Replace with `ConfirmDialog` (already used everywhere else).

### H3. No production deployment checklist / OAuth callback URL list

- Hosted Supabase Auth allow-list and Google OAuth Web client redirect URIs must include the production origin. Not verifiable from repo.
- README mentions "see prior deployment review" but the document is not in `docs/`.
- **Fix:** Add `docs/deployment-checklist.md` (see Action Plan).

---

## 5. Fixes Applied During This Audit

| File           | Change                                                                                                                                                                                                                         | Risk                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `src/proxy.ts` | Added `/me`, `/pds`, `/requests`, `/service-records` to `isProtectedPath()` so unauthenticated requests are redirected to `/login` at the edge (defense-in-depth alongside the existing layout-level `requireAuthorizedUser`). | Low — purely additive; matches existing pattern |

No database, schema, or feature behavior was modified.

---

## 6. Recommended Next Implementation Prompt

> "Implement the High-priority pre-shipping fixes from `docs/generated/pre-shipping-action-plan.md`: (1) replace `window.confirm()` with `ConfirmDialog` in the service-record archive and evidence-attachment delete flows, (2) add a Redis/Upstash-backed rate limiter to `src/lib/security/rate-limiter.ts` with an in-memory fallback for dev, (3) add `.limit(200)` paging to `listVacancies()` and `listApplicants()`, (4) add an `employment_status` ↔ `date_separated` consistency check via a new migration. Run `npm run verify` after each step."

---

## 7. Generated Reports (this audit)

- `docs/generated/shipping-readiness-audit.md` (this file)
- `docs/generated/security-audit-report.md`
- `docs/generated/ui-ux-audit-report.md`
- `docs/generated/performance-audit-report.md`
- `docs/generated/workflow-test-matrix.md`
- `docs/generated/pre-shipping-action-plan.md`
