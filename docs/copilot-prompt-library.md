# CSU PRIME-HR — Copilot Prompt Library

A library of reusable prompts for common development workflows in Prime-HR. Copy and paste the appropriate prompt when starting a task.

---

## A. Architecture Audit Prompt

Use when: evaluating a new feature, planning a large change, or reviewing the impact of a proposed change.

```
Read AGENTS.md and docs/architecture.md first.
Then read .agents/architect.md.

I want to implement: [describe feature or change]

Please:
1. Analyze the current relevant source files in src/ and supabase/migrations/.
2. Identify all modules, files, and tables that will be affected.
3. Check if a similar pattern already exists — if so, describe it.
4. Produce an implementation plan (files to create, files to modify, DB changes, risks).
5. Do NOT implement yet — wait for my confirmation.
```

---

## B. UI/UX Audit Prompt

Use when: auditing an existing page or component for consistency and usability issues.

```
Read AGENTS.md Section D (UI/UX Rules) and docs/ui-design-system.md.
Then read .agents/ui-ux-auditor.md.

Audit the following page/component: [path or description]

Please:
1. Read the current implementation of the page/component.
2. Run the UI/UX audit checklist from .agents/ui-ux-auditor.md.
3. List all issues found (layout, forms, tables, modals, buttons, empty states, loading states).
4. Prioritize issues by impact (High / Medium / Low).
5. Do NOT implement fixes yet — wait for my confirmation.
```

---

## C. Database Mapping Prompt

Use when: designing new tables, adding columns, or reviewing the schema for a new feature.

```
Read AGENTS.md Section E (Database and Supabase Rules) and docs/database-schema.md.
Then read .agents/database-specialist.md.

I need to: [describe the database change needed]

Please:
1. Inspect the relevant migration files in supabase/migrations/.
2. Identify the next migration number.
3. Check RLS policies for affected tables.
4. Propose the migration SQL (following safe migration conventions).
5. List any foreign key relationships and indexes needed.
6. Do NOT apply the migration yet — wait for my confirmation.
```

---

## D. Old HRIS SQL Extraction Prompt

Use when: mapping, validating, or importing legacy HRIS data.

```
Read AGENTS.md Section E (Database Rules) and docs/old-hris-sql-mapping.md.
Then read .agents/database-specialist.md.
Then inspect src/features/migration/legacy-hris/ — especially mapping.ts and types.ts.

I want to: [describe what legacy data to extract or map]

Please:
1. Identify the relevant legacy tables and columns.
2. Map them to the new schema (use the mapping table format in docs/old-hris-sql-mapping.md).
3. Identify transformation requirements (dates, names, enums, address splitting, etc.).
4. List any ambiguous or unknown fields.
5. Identify migration risks.
6. Do NOT run the migration yet — wait for my confirmation.
```

---

## E. PDS Rev. 2025 Integration Prompt

Use when: adding, modifying, or debugging any PDS section or workflow.

```
Read AGENTS.md Section F (PDS Rev. 2025 Rules) and docs/pds-rev-2025-integration.md.
Then read .agents/pds-specialist.md.
Then inspect supabase/migrations/0044_pds_2025_foundation.sql and src/features/pds/.

I need to: [describe the PDS change or feature]

Please:
1. Identify the affected PDS section(s) and their database tables.
2. Confirm the field names match the official CSC Form 212 Rev. 2025.
3. Check if the change affects data capture, validation, or export/print — or all three.
4. Propose the implementation plan.
5. List any compliance risks.
6. Do NOT implement yet — wait for my confirmation.
```

---

## F. Modal and Datatable Standardization Prompt

Use when: ensuring that a modal or datatable follows project conventions.

```
Read docs/ui-design-system.md and .agents/ui-ux-auditor.md.

Standardize the following modal/datatable: [path or description]

Please:
1. Read the current implementation.
2. Check it against the modal/datatable rules in docs/ui-design-system.md.
3. List all deviations from the standard (missing search, missing empty state, wrong button variant, etc.).
4. Propose the changes needed.
5. Implement the changes incrementally (one concern at a time).
6. Run npm run verify after each change.
```

---

## G. Security Audit Prompt

Use when: reviewing a new or existing feature for security vulnerabilities.

```
Read AGENTS.md Section G (Security Rules) and docs/security-and-privacy.md.
Then read .agents/security-auditor.md.

Audit the following feature/module for security issues: [path or description]

Please:
1. Check all server actions: requirePermission(), Zod validation, audit logging.
2. Check all DB queries: RLS reliance, soft-delete filters, is_active filters.
3. Check for PII in logs or error messages.
4. Check file upload handling (if applicable).
5. Check export/download handling (if applicable).
6. List all issues found with severity (Critical / High / Medium / Low).
7. Do NOT fix issues yet — wait for my confirmation.
```

---

## H. QA Regression Prompt

Use when: verifying that a feature or fix has not broken anything.

```
Read docs/testing-checklist.md and .agents/qa-tester.md.

I just implemented: [describe the change]
Affected files: [list files]

Please:
1. Run npm run verify — report the result.
2. Identify which other modules are at risk of regression from this change.
3. List manual test cases for the changed feature (happy path, edge cases, permission cases, error cases).
4. Flag any existing test cases that might now fail.
5. Summarize the QA pass result.
```

---

## I. Deployment Readiness Prompt

Use when: preparing a release or checking if a feature is ready for production.

```
Read docs/implementation-roadmap.md, docs/security-and-privacy.md, and docs/testing-checklist.md.

Check deployment readiness for: [describe feature or module]

Please:
1. Confirm npm run verify passes.
2. Audit all server actions for requirePermission() and Zod validation.
3. Confirm RLS is enabled on all new tables.
4. Confirm audit logs are written for all sensitive mutations.
5. Confirm no service-role key or secrets are exposed to the browser.
6. Confirm all PDS sections are complete (if PDS is involved).
7. Confirm all UI states (loading, empty, error) are handled.
8. List any unresolved risks or pending follow-up tasks.
```

---

## Quick Reference: Project Conventions

| Topic | Reference |
|---|---|
| Overall project rules | `AGENTS.md` |
| Architecture | `docs/architecture.md` |
| Database schema | `docs/database-schema.md` |
| Legacy HRIS mapping | `docs/old-hris-sql-mapping.md` |
| PDS Rev. 2025 | `docs/pds-rev-2025-integration.md` |
| UI/UX standards | `docs/ui-design-system.md` |
| Security rules | `docs/security-and-privacy.md` |
| Testing checklist | `docs/testing-checklist.md` |
| Roadmap | `docs/implementation-roadmap.md` |
| Architect role | `.agents/architect.md` |
| Database role | `.agents/database-specialist.md` |
| UI/UX role | `.agents/ui-ux-auditor.md` |
| PDS role | `.agents/pds-specialist.md` |
| Security role | `.agents/security-auditor.md` |
| QA role | `.agents/qa-tester.md` |
