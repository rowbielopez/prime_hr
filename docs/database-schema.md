# CSU PRIME-HR — Database Schema Reference

## Location

- **Supabase project** (hosted or local via `npx supabase start`)
- Migrations: `supabase/migrations/` — numbered `0001` to `0047+`
- Seed: `supabase/seed.sql` — reference/lookup data only
- Hand-maintained types: `src/lib/db/types.ts` — the primary types file in use
- Auto-generated types (not yet committed): run `npm run db:gen-types` → outputs to `src/lib/db/database.generated.ts`

> ⚠️ **Never assume column names.** Always inspect the relevant migration file before querying or mutating a table.

---

## Migration Index

| File | Purpose |
|---|---|
| `0001_init_foundation.sql` | Placeholder — foundation DDL is in 0002 |
| `0002_foundation_tables.sql` | Core tables: campuses, offices, roles, app_users, employees, audit_logs |
| `0003_app_users_employee_link.sql` | `employee_id` FK on `app_users` |
| `0004_security_rls.sql` | Base RLS policies |
| `0005_user_role_offices.sql` | `user_roles`, `user_role_offices` tables |
| `0006_integrity_constraints.sql` | Additional integrity constraints |
| `0007_rls_write_policies.sql` | Write-side RLS policies |
| `0008_auth_hardening.sql` | Auth security hardening |
| `0009_recruitment_vacancies.sql` | `recruitment_vacancies` table |
| `0010_recruitment_applicants_and_applications.sql` | Applicants and applications |
| `0011_compliance_foundation.sql` | Compliance indicators and evidence |
| `0012_recruitment_screening_and_interviews.sql` | Screening and interview tables |
| `0013_recruitment_ranking_and_recommendations.sql` | Ranking and recommendations |
| `0014_schema_audit_fixes.sql` | Audit schema fixes |
| `0015_campus_office_write_rls.sql` | Campus/office write RLS |
| `0016_user_management_governance.sql` | User management functions and governance |
| `0017_employee_master_enhancements.sql` | Employee master enhancements and RLS |
| `0018_organization_campus_office_enhancements.sql` | Org structure enhancements |
| `0019_phase5_stabilization.sql` | Phase 5 stabilization |
| `0020_phase6_compliance_hardening.sql` | Compliance hardening |
| `0021_evidence_storage_hardening.sql` | Evidence storage hardening |
| `0022_evidence_attachment_soft_delete.sql` | Evidence soft delete |
| `0023_compliance_status_and_action_plan_hardening.sql` | Compliance status hardening |
| `0024_phase6_dashboard_and_action_plan_constraints.sql` | Dashboard and action plan constraints |
| `0025_learning_development.sql` | L&D foundation tables |
| `0026_ld_training_programs_office.sql` | Training program office scope |
| `0027_ld_training_requests_nomination.sql` | Training requests and nominations |
| `0028_ld_status_transition_guards.sql` | Status transition guards |
| `0029_ld_lifecycle_timestamps_and_integrity.sql` | Lifecycle timestamps |
| `0030_ld_scalability_indexes.sql` | Indexes for L&D |
| `0031_ld_reporting_views.sql` | L&D reporting views |
| `0032_ld_competencies.sql` | Competencies tables |
| `0033_ld_competency_assessment_transition_guards.sql` | Competency assessment guards |
| `0034_performance_mvp_foundation.sql` | Performance review foundation |
| `0035_performance_stage31_hardening.sql` | Performance hardening |
| `0036_performance_finalization_audit_history.sql` | Performance finalization and audit |
| `0037_performance_review_reject_status.sql` | Reject status for reviews |
| `0038_performance_scope_actor_and_rating_config.sql` | Scope and rating config |
| `0039_performance_rating_band_audit_columns.sql` | Rating band and audit columns |
| `0040_rewards_mvp_foundation.sql` | Rewards foundation |
| `0041_rewards_committee_workflow_hardening.sql` | Committee workflow hardening |
| `0042_rewards_status_history_decision_snapshot.sql` | Status history and decision snapshot |
| `0043_platform_notifications_and_secure_documents.sql` | Notifications and secure documents |
| `0044_pds_2025_foundation.sql` | PDS Rev. 2025 tables and types |
| `0045_legacy_migration_infrastructure.sql` | Legacy HRIS migration infrastructure |
| `0046_pds_source_and_legacy_link.sql` | PDS source and legacy link |
| `0047_legacy_staging_to_public_schema.sql` | Legacy staging to public schema |

---

## Known Major Tables

### Organization
- `public.campuses` — campus list
- `public.offices` — offices per campus

### Users and Auth
- `public.app_users` — system accounts; `employee_id` FK links to employee
- `public.roles` — role definitions
- `public.user_roles` — active role assignments per user
- `public.user_role_offices` — office scoping for roles

### Employees
- `public.employees` — employee master record

### PDS (CSC Form 212 Rev. 2025)
- `public.employee_pds_profiles` — PDS profile per employee (status, version, completion score)
- `public.employee_pds_personal_info` — personal information section
- `public.employee_pds_family_background` — spouse, father, mother
- `public.employee_pds_children` — children list
- `public.employee_pds_education` — educational background
- `public.employee_pds_civil_service_eligibility` — CSC eligibilities
- `public.employee_pds_work_experience` — work/service records
- `public.employee_voluntary_work` — voluntary work
- `public.employee_pds_learning_development` — L&D / training in PDS
- `public.employee_pds_other_info_skills` — skills
- `public.employee_pds_other_info_recognitions` — recognitions/awards
- `public.employee_pds_other_info_memberships` — org memberships
- `public.employee_pds_references` — character references
- `public.employee_pds_declaration` — legal questions, declaration
- `public.employee_pds_government_ids` — government-issued IDs

### Recruitment
- `public.recruitment_vacancies`
- `public.recruitment_applicants`
- `public.recruitment_applications`

### Compliance
- `public.compliance_indicators`
- `public.compliance_evidence`

### Learning and Development
- `public.training_programs`
- `public.training_requests`
- `public.competencies`

### Performance
- `public.performance_reviews`

### Rewards
- `public.reward_nominations`

### Migration
- `public.migration_batches` — migration run tracking
- `public.legacy_record_map` — maps legacy rows to new rows
- `legacy.*` — staging schema (service-role only)

### Platform
- `public.audit_logs` — audit trail for all sensitive actions
- `public.notifications`
- `public.employee_documents`

---

## Important Conventions

- All tables use `uuid` primary keys (`gen_random_uuid()`).
- All tables have `created_at` and `updated_at` timestamps.
- Soft delete uses `deleted_at timestamptz null` — always filter `is deleted_at null`.
- `is_active boolean` supplements soft delete for users and employees.
- RLS is enabled on all public tables. Check existing policies before writing queries.
- The `legacy` schema is strictly service-role only.

---

## Pending Database Documentation Tasks

- [ ] Full column listing for each table (pending auto-generation from migration files)
- [ ] RLS policy matrix per role
- [ ] Index documentation
- [ ] Foreign key relationship diagram
