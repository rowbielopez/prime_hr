# CSU PRIME-HR — Security and Privacy

## Overview

Prime-HR handles highly sensitive personal employee data: names, addresses, birthdates, civil status, government IDs, financial information, health information, and legal declarations. Security and privacy must be treated as first-class requirements throughout the system.

---

## Sensitive Data Categories

| Category | Examples | Sensitivity |
|---|---|---|
| Employee identity | Full name, birthdate, birthplace | High |
| Government IDs | GSIS, SSS, TIN, PhilHealth, Pag-IBIG, PhilSys | High |
| Contact information | Mobile, email, address | Medium |
| Family data | Spouse, children, parents | High |
| Civil status | Marital status, dependency details | High |
| Legal declarations | Q34–Q40 (PDS declaration section) | Very High |
| Salary and benefits | Salary grade, monthly salary | High |
| Performance data | Review scores, ratings | High |
| Health information | Blood type, height, weight | Medium |
| Audit records | Login history, action logs | Medium |

---

## Role-Based Access Control (RBAC)

- All access is controlled through `src/lib/rbac/permissions.ts`.
- Every server action must call `requirePermission()` with the correct permission string.
- Do not use client-side permission checks as the sole security gate — always enforce on the server.
- Roles: `super_admin`, `central_hr_admin`, `campus_hr_officer`, `office_unit_head`, `committee_member`, `employee`.
- Campus scoping: `campus_hr_officer` can only access employees from their assigned campus.
- Office scoping: `office_unit_head` is further scoped to their office.

---

## Row-Level Security (RLS)

- Supabase RLS is active on all public tables.
- Never disable RLS to fix a query — fix the query or the policy instead.
- When writing new queries, test against all relevant roles to confirm RLS works correctly.
- The `legacy` schema has RLS set to deny all access from `authenticated` users — only `service_role` can access it.
- The `employee` role may only access their own PDS data (via `pds.self.read` / `pds.self.write`).

---

## Input Validation

- All server action inputs must be validated with a Zod schema at the action boundary.
- Never trust client-supplied data without server-side validation.
- UUIDs: always validate as UUID format before using in queries.
- File uploads: validate MIME type and file size on the server — never trust the client's Content-Type header.
- Text fields: trim whitespace, check max length.

---

## Logging Rules

- **Never log sensitive personal data** (names, IDs, addresses, PDS fields, legal declarations).
- `console.error()` is allowed for infrastructure failures (DB errors, auth errors) — do not include PII in the message.
- Use `writeAuditLog()` from `src/features/audit/server/write-audit-log.ts` for all sensitive HR mutations.
- Audit log entries must include: `eventType`, `action`, `entityType`, `entityId?`, `campusId?`, and a safe `metadata?` object (no PII).
- **Do NOT pass `actorUserId` to `writeAuditLog()` — it is derived automatically from the current session.** The actual signature is: `writeAuditLog({ eventType, action, entityType, entityId?, campusId?, metadata? })`.

---

## File Upload Security

- Validate file type server-side (do not trust Content-Type from client).
- Enforce max file size server-side.
- Store files in Supabase Storage with appropriate bucket policies.
- File download URLs should be signed and time-limited.
- Never expose internal storage paths or bucket names to the client unnecessarily.

---

## Export and Print Security

- PDS PDF/XLSX export must check `pds.generate` permission before generating.
- Export functions must respect the same RLS rules as data access.
- Generated files must not be publicly accessible — use signed URLs with short expiry.
- Do not include server-side paths or debug information in generated files.

---

## Authentication Security

- Authentication is handled by Supabase Auth + Google OAuth.
- Only email domains in `ALLOWED_EMAIL_DOMAINS` are permitted to sign in.
- New users are provisioned as inactive — HR must activate accounts before use.
- `app_users.is_active` and `app_users.status` are checked on every sign-in via `provisionAndAuthorizeUser()`.
- Do not bypass the `is_active` or `deleted_at` checks anywhere.

---

## Database Access Rules

- Use `createSupabaseServerClient()` for authenticated server-side queries (inherits user's RLS context).
- Use `createSupabaseAdminClient()` (service-role) only in migration scripts, provisioning, and `writeAuditLog()` — never in page routes or server actions.
- Never expose the `service_role` key to the browser.
- Always filter soft-deleted rows: `is(deleted_at, null)`.
- Always filter inactive records where appropriate: `.eq("is_active", true)`.

---

## Audit Log Recommendations

All of the following actions must be audit-logged:

| Action | Event Type |
|---|---|
| Employee created | `employee.created` |
| Employee updated | `employee.updated` |
| Employee archived | `employee.archived` |
| Employee deleted | `employee.soft_deleted` |
| Account linked to employee | `employee.account_linked` |
| PDS submitted for review | `pds.submitted` |
| PDS verified | `pds.verified` |
| PDS returned | `pds.returned` |
| PDS generated | `pds.generated` |
| User role assigned | `user.role_assigned` |
| User activated/deactivated | `user.status_changed` |
| Migration batch started | `migration.batch_started` |
| Migration batch completed | `migration.batch_completed` |

---

## Supabase Environment Security

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-safe, restricted by RLS
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to browser
- `ALLOWED_EMAIL_DOMAINS` — restricts which emails can sign in
- All secrets must be in environment variables — never hardcoded in source files
