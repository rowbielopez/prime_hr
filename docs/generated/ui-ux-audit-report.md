# UI/UX & Responsiveness Audit — PRIME-HR

**Date:** 2026-05-28

---

## Foundation system: ✅ Excellent

`src/components/foundation/` provides:

- **Layout:** `AppShell`, `SidebarNav`, `TopHeader`, `UserMenu`, `PageHeader`, `InspectorLayout`, `Breadcrumbs`, `StickyPageHeader`
- **Data:** `AdminDataTable`, `DataTableWrapper`, `SearchFilterBar`, `FilterSelect`
- **Forms:** `FormLayout`, `ConfirmDialog`, `DrawerForm`, `FileUploader`, `Stepper`, `AutosaveIndicator`
- **Feedback:** `EmptyState`, `ErrorState`, `StatusBadge`, `TableSkeleton`, `DashboardCardsSkeleton`, `FormSkeleton`

~90% of pages adopt the foundation consistently. Sidebar nav is generated from a single registry (`src/components/foundation/routing/route-registry.ts`) with permission filtering — no orphan or duplicate menu items.

---

## UI/UX Findings

| #    | Area                                               | Issue                                                                             | Impact                                            | Recommended Fix                                           | Severity |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | -------- |
| U-01 | Service-record archive                             | Uses `window.confirm()` instead of `ConfirmDialog`                                | Unstyled native dialog; off-brand; mobile-hostile | Replace with `ConfirmDialog`                              | **High** |
| U-02 | Compliance evidence delete                         | Uses `window.confirm()`                                                           | Same as above                                     | Replace with `ConfirmDialog`                              | **High** |
| U-03 | Icon-only row buttons                              | Several lack `aria-label` (e.g., learning session participants panel actions)     | Screen reader hostile                             | Add `aria-label` props                                    | Medium   |
| U-04 | `/me/leave` placeholder                            | Live nav item showing "Coming soon"                                               | Users expect a working feature                    | Remove from sidebar registry OR ship MVP                  | Medium   |
| U-05 | `/me/employment` placeholder                       | "Request a correction (coming soon)" button                                       | Dead button                                       | Hide or wire to `requests/new`                            | Medium   |
| U-06 | Toast feedback gaps                                | Some server-action callers do not show `toast.success`/`toast.error`              | User unsure if save succeeded                     | Add toast wrappers consistently                           | Medium   |
| U-07 | Login page custom layout                           | Decorative blur circles `w-[500px]`, `w-[600px]`, `h-[680px]` with `blur-[100px]` | Possible overflow on narrow viewports             | Constrain with `max-w` and `overflow-hidden` on container | Low      |
| U-08 | Foundation `EmptyState` adoption                   | `AdminDataTable` uses it; ad-hoc tables don't always                              | Inconsistency                                     | Audit pass; force adoption                                | Low      |
| U-09 | Form label coverage                                | Not systematically audited                                                        | Possible a11y gaps                                | Manual axe-core sweep                                     | Low      |
| U-10 | Sidebar collapsible "Insights" / "System" sections | OK, but no localStorage persistence of collapsed state                            | Minor                                             | Persist in user prefs                                     | Low      |

---

## Responsiveness Findings

Tested viewports were not opened in a browser; analysis based on Tailwind class inspection.

| Page / Component                     | Mobile (360–390px)                                                    | Tablet (768px) | Desktop (≥1024px) | Recommended Fix                                          |
| ------------------------------------ | --------------------------------------------------------------------- | -------------- | ----------------- | -------------------------------------------------------- |
| `AppShell` sidebar                   | ✅ Drawer via `Sheet`                                                 | ✅             | ✅                | —                                                        |
| `TopHeader`                          | ✅ Sticky + responsive menu button                                    | ✅             | ✅                | —                                                        |
| `/dashboard`                         | ✅ Responsive grid (`md:`/`lg:`)                                      | ✅             | ✅                | —                                                        |
| `/employees` list                    | ⚠ Table wide; relies on browser h-scroll                              | ✅             | ✅                | Ensure parent has `overflow-x-auto`                      |
| `/service-records` list              | ⚠ `min-w-[140–240px]` per column → horizontal scroll on small screens | ✅             | ✅                | Add `overflow-x-auto` wrapper; consider card view < `md` |
| Learning session participants panel  | ⚠ Same `min-w` issue + `max-w-[240px]` text                           | ✅             | ✅                | Wrap in `overflow-x-auto`                                |
| `/careers` (public)                  | ✅ `CareersHero` responsive                                           | ✅             | ✅                | —                                                        |
| `/careers/[slug]/apply`              | ✅                                                                    | ✅             | ✅                | Verify file input is touch-friendly                      |
| `/me/pds`                            | ⚠ Multi-section form; not fully audited at 360px                      | ✅             | ✅                | Manual check at 360px                                    |
| `/login`                             | ⚠ Decorative blur circles can overflow                                | ✅             | ✅                | Add `overflow-hidden` to parent                          |
| `/forbidden`                         | ✅ Centered card                                                      | ✅             | ✅                | —                                                        |
| Recruitment vacancy detail           | ✅                                                                    | ✅             | ✅                | —                                                        |
| Recruitment ranking table            | ⚠ Wide table                                                          | ✅             | ✅                | Wrap in `overflow-x-auto`                                |
| Performance records table            | ⚠ Wide table                                                          | ✅             | ✅                | Wrap in `overflow-x-auto`                                |
| HR Review queue (`/requests/review`) | ✅ has empty state                                                    | ✅             | ✅                | —                                                        |
| PDS review queue (`/pds/review`)     | ✅ has empty state                                                    | ✅             | ✅                | —                                                        |

**Browser portability:** No vendor-specific CSS or APIs; should work on Chrome, Edge, Firefox, Safari, modern mobile browsers. `framer-motion` v12 is broadly supported.

---

## Quick wins (safe in this audit cycle — NOT executed)

- Replace 2× `window.confirm` with `ConfirmDialog`. (See `pre-shipping-action-plan.md`.)
- Add `aria-label` props to icon-only buttons (5–10 spots).
- Add `overflow-x-auto` wrapper to 4–5 wide tables.
- Add `max-w` to login background blur container.
