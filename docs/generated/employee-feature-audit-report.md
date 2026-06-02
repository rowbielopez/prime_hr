# Employee Feature Audit Report

Generated: 2026-05-20

## Executive Summary

Employee-related features in CSU PRIME-HR are **mostly working**. Core employee master data, scoped admin CRUD, account linking, PDS self-service/review, service records, safe contact updates, employee portal profile/employment/documents/service-record views, and legacy import infrastructure are present.

The largest remaining gaps are employee document upload/download/verification, general requests and corrections, leave/service credits, real notification delivery, employee export/reporting, stronger PDS validation/version exposure, and list performance at scale.

The security baseline is strong: route permissions, server action permission checks, RLS, scoped campus/office patterns, audit logs for sensitive mutations, and PDS self-access RLS are present. The main security hardening items are avoiding raw database error messages in PDS actions and minimizing PII in employee audit metadata.

## Overall Status

- Status: Mostly working
- Confidence: Medium-high from route, repository, server action, component, and migration inspection
- Production readiness: Admin employee records, PDS, and service records are usable for internal testing; employee portal is useful but incomplete; documents, requests, leave, and notifications need real workflows before being called complete

## Feature Inventory Table

| Area | Status | Evidence | Notes |
|---|---|---|---|
| Admin employee list | Working | `src/app/(protected)/employees/page.tsx`, `EmployeeListManagement`, `listEmployees` | Client-side search/filter/pagination over fully fetched records. |
| Employee create | Working | `CreateEmployeeDialog`, `createEmployeeAction`, `employeeFormSchema` | Multi-step create, duplicate check, validation, audit, revalidate. |
| Duplicate detection | Working | `findPossibleDuplicates` | Employee number checked globally with admin client; email/mobile RLS-scoped. |
| Employee detail edit | Working | `EmployeeDetailsManagement`, `updateEmployeeAction` | Profile fields editable with permission checks; non-super-admin email editing blocked. |
| Archive/separate | Working | `archiveEmployeeAction` | Sets employment status to separated. |
| Soft delete | Working | `softDeleteEmployeeAction` | Sets `deleted_at`; list hides deleted rows. |
| Account linking | Working | `linkAppUserToEmployeeAction`, `relinkAppUserByEmailAction`, `unlinkAppUserFromEmployeeAction` | Links app users by email and supports relink/unlink. |
| Employee documents list | Partially working | `listEmployeeDocumentsForEmployee`, `/me/documents` | Lists metadata only; no upload/download/verification UI. |
| Employee portal dashboard | Working/partial | `/me/page.tsx`, me repository | Useful entry point, but some quick links lead to placeholders. |
| My profile/employment | Working/partial | `/me/profile`, `/me/employment` | Read-only data and correction CTA; correction workflow missing. |
| Safe contact/settings | Working | `me.actions.ts`, `safe-contact.schema.ts`, `safe-contact-form.tsx` | Employee can update safe contact info. |
| My service record | Working | `/me/service-record`, `getMyServiceRecord` | Read-only employee service record view. |
| Admin service records | Working | `/service-records`, service-record actions/repository | CRUD, archive, overlap/current checks, warnings, print route. |
| Service credits | Missing | No schema/actions/routes found | Only `leave_without_pay` text exists in service records. |
| PDS self workspace | Working/partial | `/pds`, `PdsWorkspaceShell`, `pds-workspace.actions.ts` | All sections have UI/actions; validation is basic. |
| HR PDS view/edit | Working/partial | `/employees/[employeeId]/pds`, `/edit`, `pds-edit.actions.ts` | HR can inspect/edit PDS sections with employee write permission. |
| PDS review queue | Working/partial | `/pds/review`, `pds-review.actions.ts`, `PdsReviewQueue` | Approve/reject returns for correction; workflow exists. |
| PDS print/download | Working/unclear | print page, download route, generator files | Routes exist; needs manual export fidelity testing. |
| PDS versions/attachments | Partially implemented | migration 0044 | DB exists; user-facing history/attachment workflows mostly absent. |
| Leave management | Placeholder | `/me/leave` | Coming soon page only. |
| General requests | Placeholder | `/me/requests` | Coming soon page only. |
| Notifications | Placeholder/infra only | migration 0043, `/me/notifications` | Table/RLS exists; page is static/no real feed triggers. |
| Legacy HRIS import | Working/partial | `src/features/migration/legacy-hris`, migrations 0045-0047 | Transform/mapping infrastructure exists; operational UX/reporting likely incomplete. |

## Working Features

1. Scoped employee directory route with `employee.records.read` protection.
2. Employee list with search, campus filter, employment status filter, row actions, and pagination UI.
3. Employee creation with Zod validation, duplicate warnings, campus/office validation, success state, audit log, and path revalidation.
4. Employee update with permission checks for old and new scope, campus/office consistency checks, and Super Admin-only email changes.
5. Employee archive/separation and soft-delete actions with confirmation dialogs and audit logs.
6. Employee account linking by email, relinking through admin client, and unlinking.
7. Employee portal profile, employment, documents metadata, service record, settings, and PDS routes.
8. PDS self-service workspace with all major CSC sections represented in UI/actions.
9. PDS HR review queue with approve and return-for-correction actions.
10. Official service records module with admin list/detail, employee self-view, quality warnings, overlap/current validations, archive action, and print route.
11. Employee training history page links into learning/training data.
12. Legacy HRIS migration mapping and transformer infrastructure for employees/PDS/service-related legacy tables.

## Partially Working Features

1. Employee documents: DB table and read/list views exist, but upload, secure download, signed URLs, validation, verification, archive, and employee upload requests are absent from UI/actions.
2. PDS validation: submission blocks only key section existence, not full CSC Form 212 completeness or field-level legal validation.
3. PDS status locking/versioning: UI explains future draft/version behavior, but version/history UX is not exposed as a complete workflow.
4. PDS exports: print/download routes and generator files exist, but export fidelity and generated export records need manual verification.
5. Notifications: table/RLS infrastructure exists, but employee notification page is static and no employee workflow appears to emit notifications.
6. Account linking: functional, but manual and dependent on matching email/sign-in account provisioning; needs health checks and admin reporting.
7. Legacy import: mapping/transformers/migrations exist, but admin import review, rollback, duplicate resolution, and operational reports need hardening.
8. Employee list performance: repository fetches all rows in 1000-row pages, then client-side filters/paginates. Works for small/medium data, risky at scale.

## Broken Features

No confirmed runtime-broken employee feature was identified from source inspection.

Potentially risky behavior rather than proven breakage:

- PDS actions often return raw DB error messages.
- Employee update audit metadata stored full before/after snapshots containing sensitive fields before this implementation pass.

## Missing Features

1. Employee document upload workflow for HR.
2. Employee document secure download/view workflow with signed URLs.
3. Employee document verification/rejection/status workflow.
4. Employee-initiated document upload/request workflow.
5. General employee request/correction workflow beyond safe contact and PDS correction status.
6. Leave applications, leave balances, leave approvals, and leave history.
7. Service credits model/workflow.
8. Employee export/reporting/roster generation.
9. Bulk employee import UI outside the legacy migration tooling.
10. Account-linking health dashboard for unlinked employees, inactive users, duplicate emails, and mismatched employee/account email.
11. Notification feed backed by real queries and event triggers.
12. PDS attachment UI and PDS version/history UI.
13. Automated smoke/role tests for employee, PDS, and service-record access paths.

## Placeholder/Fake Features

- `/me/leave`: explicitly says leave management is coming soon and file leave button is coming soon.
- `/me/requests`: explicitly says requests are coming soon and new request button is coming soon.
- `/me/notifications`: shows static empty state rather than real notification query/feed.
- `/me/employment`: includes `Request a correction (coming soon)`.
- Admin employee documents section states Storage uploads can be wired in a follow-up.

## Security and Permission Findings

- Positive: Employee admin routes use `withProtectedPageMeta` with `employee.records.read`; HR PDS edit uses `employee.records.write`; PDS self uses `pds.self.read/write`; review uses `pds.review.read/write`; print/download use `pds.generate`.
- Positive: PDS self-access RLS is present in migration 0044 via `authz_employee_pds_self_access`, PDS profile select/write helpers, and policies on PDS tables.
- Positive: Service-record RLS is present in migration 0052 with scoped select and HR write policies.
- Positive: `office_unit_head` has `employee.records.read` but not `employee.records.write` in `permissions.ts`, while HR/admin roles have write.
- Positive: Employee and service-record mutations call `requirePermission`.
- Risk: Some PDS actions returned raw database error messages before this implementation pass.
- Risk: Employee update audit metadata stored full before/after employee detail snapshots before this implementation pass.
- Risk: Some account-linking audit metadata includes email. Email may be operationally necessary, but audit policy should decide whether to store email or redacted hash/reference.
- Risk: PDS review rejection audit metadata stores a freeform reason. Ensure HR does not enter unnecessary PII.

## UI/UX Findings

- Admin employee list/detail follows existing foundation components and has clear labels/actions.
- Create employee flow is strong: form, duplicate check, review, success, add another.
- Employee detail has useful linked sections, but documents area visibly admits upload is not wired.
- Portal pages are clear, but placeholders can mislead unless navigation labels are marked as unavailable/coming soon.
- PDS workspace is feature-rich but dense; completion is computed from a small set of checks and can overstate readiness for compliance-sensitive forms.
- Service records include quality warnings and print route, which is useful for HR review.

## Performance Findings

- `listEmployees` fetches all matching employee rows in 1000-row pages and then client-side filters/paginates. This avoids Supabase max row caps but will grow slow with large employee datasets.
- `listServiceRecordEmployees` fetches all employees with nested service records in 1000-row pages and computes summaries client-side on the server. This can be heavy as records grow.
- PDS read loads all sections in parallel, which is reasonable for one employee but should not be used for bulk reports.
- Recommended future work: server-side pagination/filtering for employee and service-record list pages, targeted count queries, and database-side summaries for large reports.

## Database/Schema Findings

- Employee master schema exists in migration 0002 and enhancements in 0017.
- `app_users.employee_id` linking exists via migration 0003 and later account-link flows.
- Employee documents table exists with storage bucket/path columns, RLS, status, archive/deleted fields, and sync-campuses trigger, but app UI/actions do not yet manage files.
- PDS Rev. 2025 schema exists in migration 0044 with PDS profile, section tables, statuses, versions, change logs, attachments, and generated exports.
- Notifications and secure document infrastructure exists in migration 0043.
- Service records schema exists in migration 0052 with one-current-active unique index and RLS.
- Leave/service credit/request schemas were not found beyond employment status `on_leave` and service record `leave_without_pay` text.

## Employee Portal Findings

- Working: `/me`, `/me/profile`, `/me/employment`, `/me/documents`, `/me/settings`, `/me/service-record`, `/pds`.
- Placeholder: `/me/leave`, `/me/requests`, `/me/notifications` static empty state.
- Employee self-service value is currently strongest around PDS, service record view, safe contact, and read-only employment details.
- Recommended: make placeholder quick actions visibly disabled or hide them until implemented.

## Admin Employee Management Findings

- Working: list, create, duplicate detection, detail edit, archive/separate, soft delete, account link/relink/unlink, document metadata listing, PDS links, service-record links, training history links.
- Partial: no employee export, bulk import status UI, linked-account health checks, document upload, and user deactivation workflow from employee profile.
- High-value improvement: add an employee operations panel showing PDS status, service-record status, linked account status, document count, training count, and unresolved requests.

## PDS Findings

- Working: PDS profile creation, self-edit of all major sections, HR view/edit, review queue, submit for review, approve, return for correction, print/download route surface.
- Verified security: migration 0044 has self-access and HR/scoped RLS policies; self writes are limited to not started/draft/incomplete/returned statuses.
- Partial: validation only checks presence of selected required sections; Civil Service Eligibility is shown in UI completion checks but not required by submit action, which may be intentional only if no eligibility is allowed.
- Partial: versioning, change logs, attachments, and generated export records exist in schema but are not presented as complete user workflows.
- Risk: raw DB errors from many PDS section actions should be mapped to friendly messages.

## Service Records / Service Credits Findings

- Service records: Working.
- Service records support HR CRUD, archiving, employee self-read, print, one-current-entry guard, overlap guard with confirmation, quality warnings, salary/date validation, audit logs, and RLS.
- Service records are separate from PDS Work Experience, which is correct because PDS work experience is a self-reported form section while official service record is HR-controlled.
- Service credits: Missing. No standalone schema/routes/actions found.

## Documents Findings

- Working: database table, RLS, document metadata listed on admin employee detail and employee `/me/documents`.
- Missing: upload, download, preview, signed URL access, virus/type/size validation, verification/rejection, archive/restore, employee upload requests, audit logs for document file access.
- Recommendation: use existing secure document/storage infrastructure from migration 0043 and `employee_documents` metadata, not a separate ad hoc model.

## Requests/Corrections Findings

- Working: safe contact update exists; PDS return-for-correction status exists.
- Missing: general request/correction ticket table and workflow for employment correction, document requests, service-record correction, leave request, and profile data correction.
- Placeholders: `/me/requests`, `/me/employment` correction CTA.

## Account Linking Findings

- Working: employee detail shows linked system account and supports link, change account, unlink.
- Provisioning model: users can be created/claimed through app user provisioning; employees link via `app_users.employee_id`.
- Gap: no dashboard/report for unlinked active employees, inactive linked users, duplicate emails, mismatched login email vs employee email, or accounts waiting for activation.
- Security note: relink uses admin client intentionally to update another user's `app_users` row; keep that constrained to `employee.records.write` and audited.

## Legacy HRIS Import Findings

- Working/partial: migration infrastructure and transformers/mapping exist for legacy HRIS employee/PDS/service data.
- Known mappings include legacy employee profile to `employees`, service record to PDS work experience, training to employee training programs, and other PDS tables.
- Gaps: live admin import workflow, duplicate-resolution UI, rollback/retry controls, import dashboards, and post-import quality reports need explicit hardening before production import runs.

## Add / Update / Remove / Keep Plan

- Keep: current employee CRUD, account linking, PDS workspace/review, service records, scoped RLS, audit patterns, soft-delete/archive distinction.
- Update: employee audit metadata minimization, PDS friendly errors, PDS completion/submit validation, employee/service-record list server-side pagination, portal placeholder states, account-link health checks.
- Add: employee document file workflow, request/correction workflow, notification feed and triggers, leave model only after requirements, service credits after requirements, employee reports/exports, automated role/security tests.
- Remove/Simplify: remove or disable visible placeholder CTAs until implemented; simplify duplicated PDS action code over time by sharing helpers after behavior is stable; avoid exposing fake upload/download affordances until secured.

## Priority Roadmap

1. Critical: minimize sensitive audit metadata for employee updates and map raw PDS DB errors to safe messages.
2. High: implement employee document upload/download/verification with signed URLs, validation, permission checks, and audit logs.
3. High: implement general request/correction workflow for employment corrections, document requests, and service-record correction requests.
4. High: strengthen PDS completion/submit validation and expose returned-for-correction guidance clearly.
5. High: add automated role/smoke tests for employee admin, employee self, PDS self/review/generate, and service-record access.
6. Medium: add PDS version/history and attachment UI using migration 0044 tables.
7. Medium: add account-linking health dashboard/report.
8. Medium: convert employee and service-record list pages to server-side pagination/filtering.
9. Medium: implement notification feed and event triggers for PDS review, document actions, request status, and account changes.
10. Later: leave and service credits after HR requirements are documented.

## Recommended Next Prompts

1. Build the employee documents workflow using existing `employee_documents` and secure storage infrastructure: HR upload, employee/admin signed download, verification status, audit logs, and file validation.
2. Build an employee requests/corrections module for employment corrections, document requests, and service-record correction requests, with HR review and notifications.
3. Harden PDS completion and review: field-level validation, version history UI, correction reason display, and generated export tracking.
4. Add employee feature smoke/role tests covering admin, campus HR, office head, employee, and committee roles.
5. Convert employee and service-record list pages to server-side pagination/filtering with count summaries.

## Files Reviewed

- `AGENTS.md`
- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/ui-design-system.md`
- `docs/security-and-privacy.md`
- `docs/pds-rev-2025-integration.md`
- `src/app/(protected)/employees/page.tsx`
- `src/app/(protected)/employees/[employeeId]/page.tsx`
- `src/app/(protected)/employees/[employeeId]/pds/page.tsx`
- `src/app/(protected)/employees/[employeeId]/pds/edit/page.tsx`
- `src/app/(protected)/employees/[employeeId]/pds/print/page.tsx`
- `src/app/(protected)/employees/[employeeId]/pds/download/route.ts`
- `src/app/(protected)/employees/[employeeId]/training/page.tsx`
- `src/app/(protected)/me/page.tsx`
- `src/app/(protected)/me/profile/page.tsx`
- `src/app/(protected)/me/employment/page.tsx`
- `src/app/(protected)/me/documents/page.tsx`
- `src/app/(protected)/me/settings/page.tsx`
- `src/app/(protected)/me/service-record/page.tsx`
- `src/app/(protected)/me/leave/page.tsx`
- `src/app/(protected)/me/requests/page.tsx`
- `src/app/(protected)/me/notifications/page.tsx`
- `src/app/(protected)/pds/page.tsx`
- `src/app/(protected)/pds/review/page.tsx`
- `src/app/(protected)/service-records/page.tsx`
- `src/app/(protected)/service-records/[employeeId]/page.tsx`
- `src/app/(protected)/service-records/[employeeId]/print/page.tsx`
- `src/components/features/employees/employee-list-management.tsx`
- `src/components/features/employees/create-employee-dialog.tsx`
- `src/components/features/employees/employee-form-fields.tsx`
- `src/components/features/employees/employee-details-management.tsx`
- `src/components/features/pds/pds-workspace-shell.tsx`
- `src/components/features/pds/pds-review-queue.tsx`
- `src/components/features/service-records/service-records-list-management.tsx`
- `src/components/features/service-records/service-record-detail-management.tsx`
- `src/components/features/service-records/my-service-record-view.tsx`
- `src/features/employees/actions.ts`
- `src/features/employees/repository/employees.repository.ts`
- `src/features/employees/pds-edit.actions.ts`
- `src/features/employees/repository/pds.repository.ts`
- `src/features/me/me.actions.ts`
- `src/features/me/repository/me.repository.ts`
- `src/features/pds/pds-workspace.actions.ts`
- `src/features/pds/pds-review.actions.ts`
- `src/features/pds/completion.ts`
- `src/features/service-records/service-records.actions.ts`
- `src/features/service-records/repository/service-records.repository.ts`
- `src/lib/rbac/permissions.ts`
- `supabase/migrations/0002_foundation_tables.sql`
- `supabase/migrations/0003_app_users_employee_link.sql`
- `supabase/migrations/0004_security_rls.sql`
- `supabase/migrations/0007_rls_write_policies.sql`
- `supabase/migrations/0014_schema_audit_fixes.sql`
- `supabase/migrations/0043_platform_notifications_and_secure_documents.sql`
- `supabase/migrations/0044_pds_2025_foundation.sql`
- `supabase/migrations/0045_legacy_migration_infrastructure.sql`
- `supabase/migrations/0046_pds_source_and_legacy_link.sql`
- `supabase/migrations/0047_legacy_staging_to_public_schema.sql`
- `supabase/migrations/0052_employee_service_records.sql`

## Files Created Or Updated By Implementation

- `docs/generated/employee-feature-audit-report.md`
- `src/features/employees/actions.ts`
- `src/features/pds/pds-workspace.actions.ts`
- `src/features/employees/pds-edit.actions.ts`
- `src/features/pds/pds-review.actions.ts`

## Follow-up Risks

- PDS export fidelity still needs manual verification against CSC Form 212 Rev. 2025.
- Document workflows remain metadata-only until upload/download/verification is implemented.
- Leave, requests, service credits, and real notifications remain future work.
