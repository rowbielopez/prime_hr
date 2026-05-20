<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# CSU PRIME-HR — AI Agent Instructions

## A. Project Overview

**Prime-HR** is the Human Resource Information System for Caraga State University (CSU).

### What it manages
- Employee master records (profile, appointment, status, campus/office assignment)
- Personal Data Sheet (PDS) — CSC Form 212 Rev. 2025 — self-service and HR-managed
- Civil Service eligibilities, educational background, work experience, family background
- Recruitment pipeline (vacancies, applicants, screening, ranking, recommendations)
- Compliance monitoring (evidence, indicators, action plans)
- Learning and Development (training programs, nominations, competency assessments)
- Performance management (IPCR-style reviews, ratings, finalization)
- Rewards and recognition (nominations, committee workflow, approvals)
- Legacy HRIS data migration (old SQL database → new schema)
- Audit logs for all sensitive mutations

### Main users
- **super_admin** — full system access
- **central_hr_admin** — system-wide HR operations
- **campus_hr_officer** — campus-scoped HR operations
- **office_unit_head** — limited office/unit scope
- **committee_member** — compliance and rewards committee access
- **employee** — self-service (PDS, training requests, performance self-assessment)

### Technology stack
- **Next.js** (App Router, Server Components) — inspect `node_modules/next/dist/docs/` before using any API
- **Supabase** (PostgreSQL, Auth, Storage, RLS)
- **TypeScript** — strict mode, build must always pass
- **shadcn/ui** + **Tailwind CSS**
- **Zod** — all input validation at action boundaries

---

## B. Development Principles

1. **Analyze before editing.** Read the relevant files first. Never assume structure.
2. **Do not rewrite working modules** unless the user explicitly asks for a rewrite.
3. **Preserve existing behavior** unless the user asks for a change.
4. **Prefer maintainable, readable code.** Clarity over cleverness.
5. **Prefer reusable components and utilities.** Do not duplicate logic.
6. **Keep changes focused and incremental.** One concern per change.
7. **No TypeScript `any` casts** without `// eslint-disable-next-line @typescript-eslint/no-explicit-any` plus a justification comment.
8. **Run `npm run verify`** (typecheck + lint + build) before marking any task complete.

---

## C. Architecture Rules

### Source structure
```
src/
  app/                          # Next.js App Router pages
    (protected)/                # Auth-gated routes
      admin/                    # User and org management
      compliance/               # Compliance monitoring
      dashboard/                # Main dashboard
      employees/                # Employee records
      learning/                 # L&D
      pds/                      # Self-service PDS workspace
      performance/              # Performance reviews
      recruitment/              # Recruitment pipeline
      rewards/                  # Rewards and recognition
    auth/                       # OAuth callback
    login/                      # Login page
  components/
    ui/                         # shadcn/ui primitives
    foundation/                 # Shared layout components (PageHeader, etc.)
    features/<domain>/          # Domain-specific UI components
  features/<domain>/            # Domain logic
    <domain>.actions.ts         # "use server" mutations
    repository/                 # DB read functions
    schemas/                    # Zod validation schemas
    types.ts                    # Client-safe types
  lib/
    constants/roles.ts          # AppRole enum
    rbac/permissions.ts         # Permission definitions and role map
    supabase/                   # Supabase client helpers
    db/types.ts                 # Generated Supabase types
  server/
    pds/                        # PDS server utilities
supabase/
  migrations/                   # Numbered SQL migration files (0001–0047+)
  seed.sql                      # Reference/lookup data only
```

### Key conventions
- **Server actions:** `"use server"` at top, always call `requirePermission()`, validate with Zod
- **Repository layer:** Pure DB reads, no mutations — lives in `repository/*.repository.ts`
- **Page files:** Async Server Components — fetch data server-side, pass to client shell
- **Client components:** Only when state, events, or transitions are needed — mark `"use client"`
- **Imports:** Use `@/` alias for all internal imports

### Do not invent new patterns
If a similar feature already exists in another domain, follow that exact pattern. Read before writing.

---

## D. UI/UX Rules

- All modals, datatables, buttons, cards, forms, alerts, tabs, filters, pagination, empty states, and loading states must look **consistent** with existing pages.
- Use `src/components/ui/` (shadcn/ui) for all base components.
- Use `src/components/foundation/` for layout primitives (PageHeader, ContentSection, etc.).
- All forms must have: labels, validation messages, loading states, and success/error toasts via `sonner`.
- All data tables must have: search, filters, pagination, empty states, and loading skeletons.
- Pages must be **responsive** (mobile and desktop).
- HR staff are not always technical — use **clear labels, helper text, and confirmation dialogs** for destructive actions.
- Avoid random one-off styling. If a style override is needed, note why.
- Prefer accessible colors, readable contrast, and consistent spacing.

---

## E. Database and Supabase Rules

- **Never assume column names.** Inspect `supabase/migrations/` before referencing any table or column.
- **Never perform destructive operations** (DROP, TRUNCATE, DELETE without WHERE) without explicit user instruction and confirmation.
- All schema changes must be done via **new numbered migration files** (`supabase/migrations/`).
- `supabase/seed.sql` is for initial reference/lookup data only. Never seed production data there.
- **RLS is active on all tables.** Check existing policies before adding new queries.
- The `legacy` schema is **service-role only** — do not query it from client code or server actions.
- Document any assumptions about column mappings or transformations.
- For old HRIS SQL integration: inspect `src/features/migration/legacy-hris/` and `supabase/migrations/0045_legacy_migration_infrastructure.sql` before touching anything.

### Known legacy table → new table mappings (from `mapping.ts`)
| Legacy Table | New Target |
|---|---|
| `employee_profile` | `public.employees` |
| `address` | `public.employee_pds_addresses` |
| `contacts` | `public.employee_pds_contacts` |
| `family` | `public.employee_pds_family_background` |
| `children` | `public.employee_pds_children` |
| `educational_bg` | `public.employee_pds_education` |
| `eligibility` | `public.employee_pds_civil_service_eligibility` |
| `service_record` | `public.employee_pds_work_experience` |
| `government_id` | `public.employee_pds_government_ids` |
| `skills` | `public.employee_pds_other_info_skills` |
| `organizations` | `public.employee_pds_other_info_memberships` |
| `recognition` | `public.employee_pds_other_info_recognitions` |
| `trainings` | `public.employee_training_programs` |

---

## F. PDS Rev. 2025 Rules

- CSC Form 212 Rev. 2025 is a **legally compliant government document**. Treat it as compliance-sensitive.
- Do not guess field names, section order, or validation rules.
- Always refer to `docs/pds-rev-2025-integration.md` and migration `0044_pds_2025_foundation.sql`.
- **Separate concerns strictly:** data capture → validation → export/print are three distinct steps.
- Never silently omit a PDS field or section.
- The PDS workspace is at `/pds` (self-service) and `/employees/[id]/pds` (HR admin view).

### PDS sections (in order)
1. Personal Information (C1)
2. Family Background (C1)
3. Educational Background (C1)
4. Civil Service Eligibility (C2)
5. Work Experience (C2)
6. Voluntary Work (C3)
7. Learning and Development (C3)
8. Other Information — Skills, Recognitions, Memberships (C3)
9. References (C4)
10. Declaration — Legal questions, government ID, signature (C4)

---

## G. Security Rules

- Sensitive personal data (employee PII, PDS fields) must **never be logged** or exposed in error messages.
- All mutations must call `requirePermission()` with the correct permission string.
- Validate all inputs with Zod schemas at the action boundary.
- File uploads must validate type and size on the server.
- Exports (PDS PDF/XLSX) must enforce the same permission checks as data access.
- Do not bypass `is_active`, `deleted_at`, or RLS filters.
- Audit log all sensitive HR actions via `writeAuditLog()` from `src/features/audit/server/write-audit-log.ts`.
  - Signature: `writeAuditLog({ eventType, action, entityType, entityId?, campusId?, metadata? })`
  - **Do NOT pass `actorUserId`** — it is derived automatically from the session.

---

## H. Quality Rules

Before marking any task complete:

1. Run `npm run verify` (typecheck + lint + build).
2. Confirm no TypeScript errors in affected files.
3. Verify no existing imports were broken.
4. List all files created or modified.
5. Note any follow-up tasks or risks.

### Planning protocol (for multi-file or schema changes)
1. **Analyze** — read all relevant files first.
2. **Plan** — list all changes and their order.
3. **Confirm** with the user if changes are risky or destructive.
4. **Implement** incrementally.
5. **Verify** with `npm run verify`.
6. **Report** — changed files, risks, next steps.

