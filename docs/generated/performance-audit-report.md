# Performance Audit — PRIME-HR

**Date:** 2026-05-28

---

## Findings Table

| #    | Page / Feature                          | Problem                                                                       | Likely Cause                                         | Recommended Optimization                                             | Priority |
| ---- | --------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| P-01 | `/recruitment/vacancies`                | `listVacancies()` has no `.limit()`                                           | Returns up to PostgREST default 1000 rows            | Add `.limit(200)` or `.range()` + UI pagination                      | Medium   |
| P-02 | `/recruitment/applicants`               | `listApplicants()` has no `.limit()`                                          | Same                                                 | Add `.limit(200)` + UI pagination                                    | Medium   |
| P-03 | `/me/requests`                          | Unbounded but RLS-scoped to single employee                                   | Implicit safety from RLS                             | Add `.limit(100)` for safety                                         | Low      |
| P-04 | Applicant detail page                   | 3 parallel queries on every detail load (applications, screening, interviews) | `Promise.all` parallelism is fine; not N+1           | OK; keep as is                                                       | —        |
| P-05 | Public `/careers` list                  | Reads from SQL view `public_vacancies`; cached at DB level via index          | Probably OK                                          | Add `revalidate` or HTTP cache headers for anonymous users           | Low      |
| P-06 | Dashboard                               | Many parallel queries (`Promise.all`)                                         | Acceptable                                           | Add per-card `Suspense` boundaries so slow queries don't block paint | Medium   |
| P-07 | PDS workspace `/pds`                    | All 9 sections eagerly rendered                                               | Heavy form bundle                                    | Lazy-load section components per accordion tab                       | Medium   |
| P-08 | PDS print page                          | Renders full PDS server-side                                                  | Acceptable for print                                 | Verify file size; monitor TTFB                                       | Low      |
| P-09 | Excel export (`pds-excel-generator.ts`) | Sync ExcelJS build in server action                                           | OK for typical PDS size                              | Set max body size limit; stream for large datasets                   | Low      |
| P-10 | Rate limiter                            | In-memory `Map`                                                               | Not shared across instances; also constantly grows   | Move to Redis (Upstash) + TTL eviction                               | High     |
| P-11 | Images / logos                          | Not inspected; no Next `<Image>` usage verified                               | Possible unoptimized assets                          | Use `next/image` for `public/` brand assets                          | Low      |
| P-12 | Bundle size                             | Not measured                                                                  | Unknown                                              | Run `next build` analyzer                                            | Low      |
| P-13 | Loading states                          | `TableSkeleton` / `DashboardCardsSkeleton` exist; not all pages use them      | Perceived slowness                                   | Wrap async sections in `Suspense` w/ skeleton fallbacks              | Medium   |
| P-14 | List pages with filters                 | Filters re-fetch full list (no debounce visible)                              | OK in most domains; recheck `EmployeeListManagement` | Add debounce + server-side filtering                                 | Low      |
| P-15 | Public application submit               | Server action does duplicate query + insert + audit log                       | Acceptable                                           | Disable submit button while pending (verify all forms)               | Low      |

---

## Performance Targets vs Current

| Target                                              | Status                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| Public pages load quickly                           | ⚠ Not measured; SQL view query should be fast                            |
| Employee portal not slow                            | ⚠ Not measured; PDS section count is the main risk                       |
| Admin dashboard does not block on non-critical data | ⚠ All queries currently awaited in `Promise.all`; use streaming/Suspense |
| List pages use pagination or limit                  | ⚠ Most do; vacancies + applicants do not                                 |
| Detail pages lazy-load heavy sections               | ❌ PDS workspace renders all sections                                    |
| Public submit disables while processing             | ⚠ Verify form `isPending` state covers everything                        |

---

## Recommended Order

1. Add `.limit(200)` to `listVacancies()` and `listApplicants()` (low-risk, immediate).
2. Wrap dashboard cards in `Suspense` with skeleton fallbacks.
3. Lazy-load PDS sections inside `/pds`.
4. Migrate rate limiter to Upstash.
5. Audit all submit buttons for `isPending` disable.
