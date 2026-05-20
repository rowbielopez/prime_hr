# CSU PRIME-HR — Testing Checklist

## Pre-Implementation Checklist

Before writing any code:

- [ ] Read `AGENTS.md` for project-wide conventions
- [ ] Read the relevant `docs/` file for the domain
- [ ] Inspect related source files in `src/features/<domain>/`
- [ ] Inspect `supabase/migrations/` for any tables or columns involved
- [ ] Identify all files that will be created or modified
- [ ] Check if a similar pattern already exists in another domain
- [ ] Confirm no destructive DB operations are involved (or get explicit confirmation)
- [ ] Plan the implementation before writing code

---

## Post-Implementation Checklist

After implementing changes:

- [ ] Run `npm run verify` (typecheck + lint + build) — must pass with zero errors
- [ ] No new TypeScript `any` casts without justification comment
- [ ] No new console.log/debug statements left in production code
- [ ] All new server actions call `requirePermission()`
- [ ] All new server actions validate input with Zod
- [ ] All new DB queries filter soft-deleted rows (`is deleted_at null`)
- [ ] All new mutations call `writeAuditLog()`
- [ ] All new mutations call `revalidatePath()` appropriately
- [ ] All existing imports still work (no broken references)
- [ ] List all files created or modified

---

## UI Regression Checklist

After any UI change:

- [ ] Page renders without errors on desktop (1280px)
- [ ] Page renders without errors on tablet (768px)
- [ ] Empty state displays correctly when no data
- [ ] Loading state displays correctly while fetching
- [ ] Error state displays correctly when action fails
- [ ] Form validation messages display inline
- [ ] Success/error toasts appear after form submission
- [ ] Modal opens and closes correctly
- [ ] Confirm dialog appears before destructive actions
- [ ] Pagination works correctly
- [ ] Search and filters work correctly
- [ ] No layout breaks or overflow issues
- [ ] Breadcrumb and page title are correct

---

## Database Migration Checklist

Before running a new migration:

- [ ] Migration file is numbered correctly (next in sequence)
- [ ] Migration file uses `begin;` / `commit;`
- [ ] All new tables have `id uuid primary key default gen_random_uuid()`
- [ ] All new tables have `created_at` and `updated_at` timestamps
- [ ] All new tables have `deleted_at timestamptz null` if soft-delete is needed
- [ ] All new FK references are to existing tables
- [ ] RLS policies are defined for new tables
- [ ] Indexes are created for FK columns and commonly filtered columns
- [ ] `set_updated_at()` trigger is applied to `updated_at` columns
- [ ] No `DROP TABLE` or destructive operations without explicit approval
- [ ] Migration tested on local Supabase (`npm run db:reset`)

---

## PDS Export Checklist

Before releasing a PDS export feature:

- [ ] All 10 PDS sections are included (C1 through C4)
- [ ] Field labels match official CSC Form 212 Rev. 2025 labels
- [ ] Section order matches official form order
- [ ] Date fields are formatted as MM/DD/YYYY (per CSC standard)
- [ ] All government ID fields are included
- [ ] Declaration questions Q34–Q40 are included
- [ ] Signature/thumbmark placeholder is included
- [ ] Administering officer fields are included
- [ ] Export requires `pds.generate` permission
- [ ] Generated file is not publicly accessible (signed URL)
- [ ] Test with complete PDS data
- [ ] Test with partial/incomplete PDS data (graceful handling)

---

## Authentication and Authorization Checklist

- [ ] New pages require a permission check (server-side)
- [ ] New server actions call `requirePermission()` first
- [ ] Campus-scoped actions verify the actor's campus scope
- [ ] Employee self-service actions use `pds.self.read` / `pds.self.write`
- [ ] HR admin actions use `employee.records.write` or appropriate permission
- [ ] Inactive users cannot access protected pages
- [ ] Deleted/archived records are not accessible
- [ ] RLS prevents cross-campus data access

---

## Build / Lint / Typecheck Checklist

- [ ] `npm run verify` passes (all three: typecheck, lint, build)
- [ ] `npm run test` passes (vitest unit tests, if any exist for the changed domain)
- [ ] No TypeScript errors in modified files
- [ ] No ESLint errors or warnings (unless pre-existing)
- [ ] No unused imports
- [ ] No unreachable code
- [ ] Build output size is not unexpectedly large

---

## Manual QA Checklist

For each new feature, test manually:

- [ ] Happy path: normal usage by intended user role
- [ ] Edge cases: empty data, single record, maximum records
- [ ] Permission edge cases: test with a lower-privilege role
- [ ] Error path: submit invalid data, trigger server error
- [ ] Navigation: breadcrumb and back button work correctly
- [ ] Refresh: page state survives a browser refresh
- [ ] Concurrent edit: what happens if two users edit the same record
