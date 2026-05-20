# GitHub Copilot Instructions — CSU PRIME-HR

## Identity

This repository is **CSU PRIME-HR** — a Human Resource Information System (HRIS) for Caraga State University. It handles employee profiles, PDS (Personal Data Sheet) data per CSC Form 212 Rev. 2025, HR records, recruitment, compliance, performance, learning and development, rewards, and legacy HRIS data migration.

---

## Step 0 — Always Read First

Before writing any code in this repository:

1. Read `AGENTS.md` — it is the primary AI instruction file.
2. Read the relevant file in `docs/` for the domain you are working in.
3. Read the relevant `.agents/` role file if specialized guidance applies.
4. Inspect actual source files in `src/` and `supabase/migrations/` before assuming anything.

---

## Architecture

- **Framework:** Next.js App Router (`src/app/`)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Language:** TypeScript — strict mode; the build must pass without errors
- **UI Library:** shadcn/ui components with Tailwind CSS
- **Feature organization:** `src/features/<domain>/` — each domain owns its repository, types, actions, and schemas
- **Server actions:** All mutations go through `"use server"` action files
- **Auth:** Supabase Auth + Google OAuth; provisioned via `provision-and-authorize-user.ts`
- **RBAC:** Role-based via `src/lib/rbac/permissions.ts` and `requirePermission()`

> ⚠️ This is Next.js with App Router. Server Components are the default. Use `"use client"` only when needed (state, events, transitions). Read `node_modules/next/dist/docs/` before using any API you are unsure about.

---

## Coding Standards

### General
- Analyze before editing. Read the relevant files first.
- Make incremental, focused changes — do not rewrite working modules.
- Preserve existing business logic unless explicitly told to change it.
- Keep TypeScript strict. No `any` casts without `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and a comment explaining why.
- Prefer reusable components and utilities. Avoid duplicated logic.
- Do not place business logic directly in UI components when a `repository` or `actions` pattern already exists.

### File conventions
- Server actions: `src/features/<domain>/<domain>.actions.ts` — top `"use server"`, uses `requirePermission()`
- Repository (DB reads): `src/features/<domain>/repository/<domain>.repository.ts`
- Types: `src/features/<domain>/types.ts` (client-safe) or `repository/<domain>.types.ts`
- Schemas (Zod validation): `src/features/<domain>/schemas/`
- UI components: `src/components/features/<domain>/`
- Pages: `src/app/(protected)/<route>/page.tsx`

### Naming
- Files: `kebab-case`
- Types and interfaces: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database columns: `snake_case` (Postgres); TypeScript fields: `camelCase`

---

## Database Rules

- **Never assume column names.** Always inspect `supabase/migrations/` before referencing any table or column.
- **Never make destructive database changes** (DROP, TRUNCATE, DELETE without WHERE) without explicit user instruction and user confirmation.
- All schema changes must be done via numbered migration files in `supabase/migrations/`.
- Use `supabase/seed.sql` only for initial reference/lookup data.
- Row-Level Security (RLS) is active on all tables. Always check existing policies before adding new queries.
- The `legacy` schema is isolated (service-role only). Do not query it from client code.
- Document any assumptions about column mappings or transformations.

---

## PDS Rev. 2025 Rules

- CSC Form 212 Rev. 2025 is a legally compliant government document. Treat it as compliance-sensitive.
- Do not guess field names, section order, or validation rules.
- Always refer to `docs/pds-rev-2025-integration.md` and the actual migration `0044_pds_2025_foundation.sql`.
- Separate concerns: data capture → validation → export/print are three distinct steps.
- Never silently omit a PDS field or section.

---

## UI/UX Rules

- All UI must be consistent with existing pages. Inspect similar pages before adding new components.
- Use shadcn/ui components from `src/components/ui/`.
- Use foundation components from `src/components/foundation/`.
- All forms must have: proper labels, validation messages, loading states, and success/error feedback via `sonner` toasts.
- All data tables must have: search, filters, pagination, empty states, and loading skeletons where applicable.
- Pages must be responsive.
- HR staff are not always technical — use clear labels, helper text, and confirmation dialogs for destructive actions.

---

## Security Rules

- Sensitive personal data (employee PII, PDS fields) must never be logged or exposed in error messages.
- All mutations must call `requirePermission()` with the correct permission string.
- Validate all inputs with Zod schemas at the action boundary.
- File uploads must validate type and size on the server.
- Exports (PDS PDF/XLSX) must enforce the same permission checks as data access.
- Do not bypass `is_active`, `deleted_at`, or RLS filters.
- Audit log all sensitive HR actions via `writeAuditLog()` from `src/features/audit/server/write-audit-log.ts`.
  - Signature: `writeAuditLog({ eventType, action, entityType, entityId?, campusId?, metadata? })`
  - **Do NOT pass `actorUserId`** — it is derived automatically from the session.

---

## Quality Checks

Before marking any task complete:

1. Run `npm run verify` (typecheck + lint + build).
2. Check for TypeScript errors in affected files.
3. Verify no existing imports were broken.
4. List all files created or modified.
5. Note any follow-up tasks or risks.

---

## Planning Protocol

For any task that modifies more than one file or touches database schema:

1. **Analyze** — read all relevant files first.
2. **Plan** — write out the list of changes and their order.
3. **Confirm** with the user if the changes are risky or destructive.
4. **Implement** incrementally.
5. **Verify** with `npm run verify`.
6. **Report** — list changed files, risks, and next steps.
