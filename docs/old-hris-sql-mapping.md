# CSU PRIME-HR - Old HRIS SQL Mapping Audit

Analysis date: 2026-05-19  
Legacy dump: `public/hris.sql`  
Status: Audit and mapping only. No data was imported, no database was modified, and no destructive SQL was executed.

## Executive Summary

`public/hris.sql` was found and can be mined for reusable Prime-HR data, but it should not be loaded directly into the current Supabase database. The dump is a phpMyAdmin export from MariaDB/MySQL (`MariaDB 10.4.32`, phpMyAdmin `5.2.1`) with `utf8mb4_general_ci` collation. It contains 64 tables and about 34,336 inserted rows.

The most useful data is employee master data, PDS sections, service records, government IDs, contacts, addresses, education, civil service eligibility, children/family records, skills, recognitions, memberships, and training records. The safest path is a staging-first, preview-first import flow using the existing `public.migration_batches`, `public.legacy_record_map`, and `public.legacy_staging_*` infrastructure.

Do not import legacy `users`, `token`, `logs_tbl`, settings, point-calculation tables, or old workflow/request rows into live Prime-HR tables without separate review. Legacy leave data exists, but the current Prime-HR schema does not yet define a leave or service-credit ledger, so leave/credit rows should remain staging-only until a leave module exists.

## Files and Schema Inspected

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `docs/database-schema.md`
- `docs/pds-rev-2025-integration.md`
- `docs/old-hris-sql-mapping.md`
- `public/hris.sql`
- `supabase/seed.sql`
- `supabase/migrations/0002_foundation_tables.sql`
- `supabase/migrations/0017_employee_master_enhancements.sql`
- `supabase/migrations/0018_organization_campus_office_enhancements.sql`
- `supabase/migrations/0043_platform_notifications_and_secure_documents.sql`
- `supabase/migrations/0044_pds_2025_foundation.sql`
- `supabase/migrations/0045_legacy_migration_infrastructure.sql`
- `supabase/migrations/0046_pds_source_and_legacy_link.sql`
- `supabase/migrations/0047_legacy_staging_to_public_schema.sql`
- `supabase/migrations/0048_seed_campuses_offices_from_legacy.sql`
- `supabase/migrations/0049_employee_cabinet_no.sql`
- `supabase/migrations/0052_employee_service_records.sql`
- `src/lib/db/types.ts`
- `src/features/migration/legacy-hris/mapping.ts`
- `src/features/migration/legacy-hris/types.ts`
- `src/features/migration/legacy-hris/transformers.ts`
- `src/features/migration/legacy-hris/validators.ts`
- `src/features/employees/repository/employees.repository.ts`
- `src/features/employees/schemas/employee-form.schema.ts`
- `src/features/pds/constants.ts`
- `src/features/pds/completion.ts`
- `src/features/pds/types.ts`
- `src/features/service-records/schemas/service-record.schema.ts`
- `src/features/service-records/service-records.actions.ts`

## Phase 1 - Legacy Dump Inspection

| Check | Finding |
|---|---|
| Found | Yes |
| Location | `public/hris.sql` |
| File size | 7,501,456 bytes |
| Dump tool | phpMyAdmin SQL Dump 5.2.1 |
| Source database | `hris` |
| Source engine style | MySQL/MariaDB |
| Server version | MariaDB 10.4.32 |
| SQL mode | `NO_AUTO_VALUE_ON_ZERO` |
| Charset setup | `SET NAMES utf8mb4` |
| Table engine/collation | InnoDB, `utf8mb4_general_ci` |
| Table count | 64 |
| Inserted row count | About 34,336 |
| Foreign keys | No explicit foreign key constraints detected in the parsed dump; relationships are implied by shared `employee_id`, `emp_id`, `campus`, `department`, `training_id`, and similar columns. |
| Primary keys/indexes | Mostly added after inserts through `ALTER TABLE ... ADD PRIMARY KEY`, plus a few unique/index keys. |
| Encoding concerns | 815 HTML entity patterns detected, for example `&Ntilde;`; decode before import. |
| Empty/sentinel values | 113,120 empty-string tokens and 12,945 `N/A` variants detected; normalize to null where appropriate. |
| Date formats | Mostly `YYYY-MM-DD`; 42 slash-date patterns detected. Some dates are sentinel-like years such as `1000-01-01` and must not be treated as real civil-service dates. |
| Invalid `0000-00-00` dates | None detected by text scan. |
| Employee ID patterns | Mixed codes such as regular numeric values, `R-*`, `COS-*`, `TEMP-*`, `CSU-*`, and campus/role prefixes. Treat as legacy employee numbers, not UUIDs. |

## Phase 2 - Current Prime-HR Schema Inspection

Current import targets verified from migrations and code:

| Prime-HR Area | Current Tables / Notes |
|---|---|
| Organization | `public.campuses`, `public.offices`; seeded from legacy campus/office names in migrations and seed data. |
| Users/Auth | `public.app_users` links to Supabase Auth and has `employee_id`; do not import legacy passwords or tokens. |
| Employee master | `public.employees` with `employee_no`, names, birth/contact fields, campus/office, position, employment status, date hired, statutory IDs, addresses, `external_ref`, and `cabinet_no`. |
| PDS profile | `public.employee_pds_profiles` with `source`, `legacy_employee_code`, `migrated_at`, and `migration_batch_id` added by legacy linkage migration. |
| PDS personal info | `public.employee_personal_information`; includes names, birth data, statutory IDs, address JSON, phone/mobile/email. |
| PDS family | `public.employee_family_background`, `public.employee_children`. |
| PDS education/eligibility | `public.employee_education`, `public.employee_eligibilities`. |
| PDS work experience | `public.employee_work_experiences`; employee-editable CSC PDS work history. |
| Official HR service records | `public.employee_service_records`; HR-managed official record, separate from PDS work experience. |
| PDS L&D and other info | `public.employee_learning_development`, `public.employee_other_skills`, `public.employee_recognitions`, `public.employee_memberships`. |
| PDS references/declaration | `public.employee_references`, `public.employee_government_ids`, `public.employee_pds_declarations`. |
| Documents | `public.document_assets`, `public.employee_documents`, `public.employee_pds_attachments`; only import file references after storage paths are verified. |
| Legacy staging/tracking | `public.migration_batches`, `public.legacy_record_map`, and `public.legacy_staging_*` tables exist. |
| Leave/service credits | No current leave ledger or service-credit balance schema was found. Legacy leave rows need staging/manual review only. |

Important naming correction: older docs used names like `employee_pds_personal_info` and `employee_pds_work_experience`, but the actual current migration creates `employee_personal_information`, `employee_work_experiences`, `employee_education`, `employee_eligibilities`, `employee_learning_development`, `employee_government_ids`, and related tables.

## Phase 3 - Old HRIS Table Inventory

Priority scale: High = likely useful for employee/PDS/service records; Medium = useful after cleanup or future module work; Low = old system data, logs, settings, or not a direct import; Unknown = needs manual review.

| Old Table | Purpose Guess | Inserted Rows | Key Columns | Possible PK/FK | Relevant Prime-HR Module | Import Priority |
|---|---|---:|---|---|---|---|
| `address` | Employee permanent/residential address and phones | 264 | `a_id`, `employee_id`, `per_address`, `res_address` | PK `a_id`; implied FK `employee_id -> employee_profile.emp_id` | Employees, PDS personal information | High |
| `announcement` | Portal announcements with optional upload path | 3 | `id`, `title`, `source`, `created_at` | PK `id` | Platform content, documents | Low |
| `campus` | Legacy campus master data | 10 | `campus_id`, `campus_name`, `campus_head` | PK `campus_id` | Campuses | Medium |
| `children` | Employee children | 381 | `child_id`, `child_name`, `birth_date`, `employee_id` | PK `child_id`; implied employee FK | PDS family background | High |
| `com_service` | Community service activity records | 0 | `cs_id`, `employee_id`, `activity_title` | PK `cs_id` | Future service/extension module | Low |
| `com_service_points` | Community service point calculations | 0 | `com_id`, `cs_id`, `emp_id` | PK `com_id`; implied service/employee FK | Evaluation/points | Low |
| `compensation_benefits` | Compensation and deduction snapshot | 4 | `cb_id`, `employee_id`, salary/benefit amounts | PK `cb_id`; implied employee FK | Payroll/benefits, not current core HR | Medium |
| `concern` | User-submitted concern/messages | 8 | `ID`, `Email`, `FullName`, `Concern` | PK `ID` | Support/audit only | Low |
| `contacts` | Employee email, telephone, mobile | 1176 | `c_id`, `employee_id`, `email`, `mobile` | PK `c_id`; implied employee FK | Employees, PDS personal information | High |
| `departments` | Legacy office/department master data | 59 | `dept_id`, `dept_code`, `dept_name` | PK `dept_id` | Offices | Medium |
| `designation_points` | Designation point calculations | 0 | `designation_id`, `emp_id`, `des_id` | PK `designation_id` | Evaluation/points | Low |
| `designations` | Employee designation assignments | 0 | `des_id`, `employee_id`, `des_title` | PK `des_id` | Service records/assignments | Medium |
| `educ_award_points` | Education award point calculations | 0 | `pts_id`, `award_id`, `emp_id` | PK `pts_id` | Evaluation/points | Low |
| `educ_awards` | Academic awards/honors | 215 | `award_id`, `employee_id`, `educ_id`, `awards` | PK `award_id`; implied employee/education FK | PDS education, recognitions | Medium |
| `educ_scholar` | Scholarships tied to education | 10 | `scholar_id`, `employee_id`, `educ_id`, `scholarship` | PK `scholar_id`; implied employee/education FK | PDS education | Medium |
| `educ_scholar_points` | Scholarship point calculations | 0 | `pts_id`, `emp_id`, `educ_id` | PK `pts_id` | Evaluation/points | Low |
| `educational_bg` | Employee education records | 2316 | `bg_id`, `employee_id`, `level`, `school_name`, `degree` | PK `bg_id`; implied employee FK | PDS education | High |
| `eligibility` | Civil service/professional eligibility | 1387 | `e_id`, `employee_id`, `type`, `rating`, `license_number` | PK `e_id`; implied employee FK | PDS civil service eligibility | High |
| `eligibility_points` | Eligibility point calculations | 0 | `elgibility_id`, `e_id`, `emp_id` | PK `elgibility_id` | Evaluation/points | Low |
| `employee_leave` | Leave credit/days by employee/month/year | 921 | `l_id`, `employee_id`, `credit_id`, `days` | PK `l_id`; implied employee/leave credit FK | Future leave module | Medium |
| `employee_loan` | Employee loan/amortization records | 5 | `loan_id`, `employee_id`, `loan_name`, amounts | PK `loan_id`; implied employee FK | Payroll/benefits, not current core HR | Low |
| `employee_profile` | Master employee profile and PDS personal data | 460 | `id`, `emp_id`, names, campus, department, position | PK `id`; unique `emp_id`; indexes `campus`, `department` | Employees, PDS personal information | High |
| `eval_setting` | Legacy evaluation setting | 1 | `ev_id`, `eval_status` | PK `ev_id` | Platform/evaluation config | Low |
| `evaluation_points` | Evaluation scoring cache | 0 | `points_id`, `emp_id`, point columns | PK `points_id` | Evaluation/points | Low |
| `evaluation_points_c` | Evaluation scoring cache variant | 0 | `points_id`, `emp_id`, point columns | PK `points_id` | Evaluation/points | Low |
| `events` | Calendar events | 27 | `id`, `title`, `start_date`, `end_date` | PK `id` | Platform calendar | Low |
| `family` | Spouse, parent, and family data | 167 | `f_id`, `employee_id`, spouse/parent fields | PK `f_id`; implied employee FK | PDS family background | High |
| `government_id` | GSIS, Pag-IBIG, TIN, SSS, PhilHealth, National ID | 1987 | `g_id`, `employee_id`, statutory IDs | PK `g_id`; implied employee FK | Employees, PDS personal information, government IDs | High |
| `individual_training` | Individual training records | 0 | `inv_id`, `employee_id`, training fields | PK `inv_id` | PDS L&D | Medium |
| `leave_credits` | Leave type lookup | 12 | `lc_id`, `type_of_leave`, `days` | PK `lc_id` | Future leave module | Medium |
| `leave_history` | Dated leave events | 3 | `id`, `employee_id`, `lc_id`, `leave_date` | PK `id`; implied employee/leave credit FK | Future leave module | Medium |
| `logs_tbl` | Legacy change log | 2671 | `log_id`, `sql_type`, `target_table`, `emp_id`, `user_id` | PK `log_id` | Historical audit only | Low |
| `monthly_deduction` | Recurring deduction records | 0 | `id`, `employee_id`, deduction fields | PK `id` | Payroll/benefits | Low |
| `organization_points` | Organization point calculations | 0 | `pts_id`, `org_id`, `emp_id` | PK `pts_id` | Evaluation/points | Low |
| `organizations` | Employee organization memberships | 6 | `org_id`, `employee_id`, `org_name`, `role` | PK `org_id`; implied employee FK | PDS memberships | High |
| `other_information` | Extra demographics/flags | 0 | `id`, `employee_id`, flags | PK `id` | PDS/manual review | Unknown |
| `positions` | Position/salary master data | 229 | `pos_id`, `pos_name`, `salary_grade`, `step`, `basic_salary` | PK `pos_id` | Employees, service records, recruitment references | Medium |
| `qce_points` | QCE point calculations | 0 | `qce_id`, `emp_id`, `yr` | PK `qce_id` | Evaluation/points | Low |
| `rc_employee` | Research completed employee links | 38 | `id`, `rc_id`, `employee_id` | PK `id`; implied research/employee FK | Research/rewards/future module | Medium |
| `recognition` | Recognitions/awards | 12 | `r_id`, `employee_id`, `recog_name`, `level` | PK `r_id`; implied employee FK | PDS recognitions | High |
| `recognition_points` | Recognition point calculations | 0 | `recog_id`, `r_id`, `emp_id` | PK `recog_id` | Evaluation/points | Low |
| `research_completed` | Completed research records | 4 | `rc_id`, `employee_id`, research fields | PK `rc_id`; implied employee FK | Research/rewards/future module | Medium |
| `research_patent` | Patent records | 1 | `rpa_id`, `employee_id`, patent fields | PK `rpa_id`; implied employee FK | Research/rewards/future module | Medium |
| `research_published` | Publication records | 1 | `rp_id`, `employee_id`, publication fields | PK `rp_id`; implied employee FK | Research/rewards/future module | Medium |
| `salary_day_hr` | Daily/hourly salary reference per employee | 740 | `sdh_id`, `employee_id`, `basic_salary`, `s_type` | PK `sdh_id`; unique `employee_id` | Service records/payroll reference | Medium |
| `salary_grade` | Salary grade/step lookup | 259 | `sg_id`, `sg_step`, `basic_salary` | PK `sg_id`; unique `sg_step` | Service records/salary references | Medium |
| `service_record` | Historical employment/service records | 17780 | `sr_id`, `employee_id`, dates, position, salary, office | PK `sr_id`; implied employee FK | Official service records, PDS work experience | High |
| `service_record_points` | Service record point calculations | 0 | `srp_id`, `sr_id`, `emp_id` | PK `srp_id` | Evaluation/points | Low |
| `settings` | Legacy app settings | 2 | `id`, `name`, `status`, `type` | PK `id` | Platform config | Low |
| `skills` | Skills/hobbies | 2548 | `sk_id`, `employee_id`, `skill_hobby` | PK `sk_id`; implied employee FK | PDS other skills | High |
| `specialization` | Employee specialization/field | 10 | `sp_id`, `employee_id`, `field` | PK `sp_id`; implied employee FK | PDS skills or future competency module | Medium |
| `sr_request` | Service record request workflow | 8 | `id`, `employee_id`, `status`, `purpose` | PK `id`; implied employee FK | Service record request history | Low |
| `tbl_criteria_01` | Evaluation criteria form/cache | 0 | `id`, `emp_id`, criteria columns | PK `id` | Evaluation/points | Low |
| `tbl_criteria_2` | Evaluation criteria form/cache | 0 | `id`, `emp_id`, criteria columns | PK `id` | Evaluation/points | Low |
| `token` | Password/reset or access tokens | 92 | `id`, `email`, `token`, `type` | PK `id` | Auth | Low - do not import |
| `training_application` | Employee training application/request | 6 | `id`, `training_id`, `employee_id`, status and cost fields | PK `id`; implied training/employee FK | Learning, PDS L&D | Medium |
| `training_participants` | Participants for training posts | 315 | `trp_id`, `employee_id`, `training_id` | PK `trp_id`; implied employee/training FK | PDS L&D | High |
| `training_points` | Training point calculations | 0 | `pts_id`, `emp_id`, `tr_id` | PK `pts_id` | Evaluation/points | Low |
| `training_post` | Training/seminar event catalog | 9 | `id`, title, sponsor, venue, dates | PK `id` | Learning, PDS L&D | Medium |
| `trainings` | PDS-like training records | 2 | `tr_id`, title, conducted_by, dates, hours | PK `tr_id` | PDS L&D | High |
| `tranche` | Salary tranche config | 0 | `id`, code/year fields | PK `id` | Payroll/config | Low |
| `update_request` | Employee profile update requests | 2 | `id`, `employee_id`, `fields`, `status` | PK `id`; implied employee FK | Historical workflow | Low |
| `users` | Legacy user accounts | 184 | `user_id`, `employee_id`, `emp_id`, `email`, role/status fields | PK `user_id` | Account reference only | Low - do not import auth |
| `web_email` | Legacy web/email setting | 1 | `id`, `email` | PK `id` | Platform config | Low |

## Phase 4 - Field Mapping Report

Use masked examples only. Government ID and account-sensitive examples must remain masked in generated reports.

| Old Table | Old Column | Meaning | Sample Value | New Table | New Column | Mapping Confidence | Transformation Needed | Notes |
|---|---|---|---|---|---|---|---|---|
| `employee_profile` | `emp_id` | Legacy employee number | `R-***`, `COS-****`, `TEMP-****` | `public.employees` | `employee_no` | High | Trim, normalize duplicates, preserve original | Primary matching key if unique. Also store in `external_ref` or `legacy_employee_code`. |
| `employee_profile` | `csu_id` | Alternate employee/CSU ID | `R-***` | `public.employees` | `external_ref` | Medium | Rename field; compare with `emp_id` | May duplicate `emp_id`; preserve as reference if different. |
| `employee_profile` | `fname` | First name | `[name]` | `public.employees` | `first_name` | High | Trim, normalize case | Required in Prime-HR. |
| `employee_profile` | `mid_name` | Middle name | `[name]` | `public.employees` | `middle_name` | High | Trim, empty to null |  |
| `employee_profile` | `lname` | Last name | `[name]` | `public.employees` | `last_name` | High | Trim, normalize case | Required in Prime-HR. |
| `employee_profile` | `name_ext` | Suffix/name extension | `Jr.` or empty | `public.employees` | `suffix` | High | Normalize suffix | Also maps to PDS `name_extension`. |
| `employee_profile` | `date_hired` | Hiring date | `2013-06-10` | `public.employees` | `date_hired` | High | Convert date format; reject invalid/sentinel dates |  |
| `employee_profile` | `campus` | Legacy campus ID/reference | `1` | `public.employees` | `campus_id` | Medium | Map old campus ID/name to current UUID | Must use `campus` table and current `public.campuses`. |
| `employee_profile` | `department` | Legacy department ID/reference | `13` | `public.employees` | `office_id` | Medium | Map old department ID/name to current office UUID | Must use `departments` and seeded offices. |
| `employee_profile` | `position` | Position ID or text reference | `1` | `public.employees` | `position_title` | Medium | Resolve through `positions`, fallback text | Do not assume it is already title text. |
| `employee_profile` | `pos_des` | Position/designation text | `CLERK` | `public.employees` | `position_title` | Medium | Prefer as fallback/compare with `positions.pos_name` | Also useful for service records. |
| `employee_profile` | `sg_id` | Salary grade lookup ID | `1` | `public.employee_service_records` | `salary_grade_step` | Low | Lookup in `salary_grade`; validate | May also inform `employee_work_experiences`. |
| `employee_profile` | `classification` | Employment classification/type | `Regular` / `COS` pattern | `public.employees` | `employment_type` | Medium | Normalize text | Map to controlled labels before import. |
| `employee_profile` | `employment_status` | Legacy employment status | `Active` pattern | `public.employees` | `employment_status` | Medium | Map to enum `active`, `on_leave`, `separated`, `retired` | Must not activate separated/deleted employees by default. |
| `employee_profile` | `birth_date` | Date of birth | `YYYY-MM-DD` | `public.employees` | `birth_date` | High | Convert date format; validate | Important matching field with full name. |
| `employee_profile` | `birth_place` | Place of birth | `[place text]` | `public.employee_personal_information` | `birth_place` | High | Trim, normalize HTML entities | PDS C1. |
| `employee_profile` | `civil_status` | Civil status | `Single` | `public.employees` | `civil_status` | High | Normalize values | Also maps to PDS personal info. |
| `employee_profile` | `sex` | Sex/gender marker | `M`, `F`, `Male`, `Female` | `public.employees` | `sex` | High | Normalize to `male`, `female`, `other`, `unknown` | Also PDS `sex_at_birth`. |
| `employee_profile` | `citizenship` | Citizenship | `Filipino` | `public.employee_personal_information` | `citizenship` | High | Normalize text | PDS C1. |
| `employee_profile` | `if_dual_citizenship` | Dual citizenship details | empty / text | `public.employee_personal_information` | `dual_citizenship_type` | Low | Manual validation | May not match Rev. 2025 expected values. |
| `employee_profile` | `country` | Dual citizenship country | `[country]` | `public.employee_personal_information` | `dual_citizenship_country` | Medium | Normalize country text |  |
| `employee_profile` | `height` | Height | `1.65` pattern | `public.employee_personal_information` | `height_m` | Medium | Parse numeric meters | Validate units before import. |
| `employee_profile` | `weight` | Weight | `60` pattern | `public.employee_personal_information` | `weight_kg` | Medium | Parse numeric kg | Validate units before import. |
| `employee_profile` | `blood_type` | Blood type | `O+` | `public.employee_personal_information` | `blood_type` | High | Normalize text |  |
| `employee_profile` | `appointment_date` | Appointment/effectivity date | `YYYY-MM-DD` | `public.employee_service_records` | `date_from` | Low | Compare with service record dates | Not enough alone; use official service records when available. |
| `employee_profile` | `cabinet_no` | Physical HR file cabinet number | `A-01` pattern | `public.employees` | `cabinet_no` | High | Trim | Current migration added `cabinet_no`. |
| `employee_profile` | `separation_cause` | Separation reason code/text | text | `public.employees` | `separation_reason` | Medium | Normalize; map status | Also service record `separation_cause`. |
| `employee_profile` | `separation_cause_specify` | Separation reason details | text | `public.employees` | `separation_reason` | Medium | Combine fields | Do not overwrite reviewed current data automatically. |
| `employee_profile` | `Active_Status` | Legacy active flag | `1` / text | `public.employees` | `employment_status` | Medium | Map carefully | Must distinguish inactive, separated, retired, deleted. |
| `employee_profile` | `validation_level` | Legacy validation workflow state | number/text | `public.employee_pds_profiles` | `validation_summary` | Low | Preserve as metadata only | Do not treat as HR verification. |
| `employee_profile` | `pic` | Legacy picture/file path | file path | `public.document_assets` | `storage_path` | Low | Verify file existence and storage bucket | Do not import missing file references. |
| `employee_profile` | `created_by` | Legacy creator | user ID/text | `public.legacy_record_map` | `warnings` / metadata | Low | Preserve in staging metadata | Do not map to current actor IDs. |
| `employee_profile` | `updated_on` | Legacy update timestamp | timestamp | `public.legacy_record_map` | `warnings` / metadata | Medium | Parse timestamp | Historical metadata only. |
| `address` | `per_address` | Permanent address text | `[address text]` | `public.employee_personal_information` | `permanent_address` | Medium | Split or store structured JSON; empty/N/A to null | Current PDS address fields are JSON, not a separate address table. |
| `address` | `per_zip` | Permanent ZIP | `3524` | `public.employee_personal_information` | `permanent_address` | Medium | Normalize 4-digit ZIP inside JSON |  |
| `address` | `per_tel` | Permanent telephone | `N/A` / phone | `public.employee_personal_information` | `telephone_no` | Low | Normalize phone; likely redundant with contact table | Prefer `contacts.telephone` if newer. |
| `address` | `res_address` | Residential address text | `[address text]` | `public.employee_personal_information` | `residential_address` | Medium | Split or store structured JSON |  |
| `address` | `res_zip` | Residential ZIP | `3524` | `public.employee_personal_information` | `residential_address` | Medium | Normalize 4-digit ZIP inside JSON |  |
| `address` | `res_tel` | Residential telephone | `N/A` / phone | `public.employee_personal_information` | `telephone_no` | Low | Normalize; compare with contacts |  |
| `address` | `employee_id` | Legacy employee link | `R-***` | `public.employees` | `employee_no` | High | Match to migrated employee | Not a UUID. |
| `contacts` | `email` | Email address | `a***@example.com` | `public.employees` | `email` | High | Lowercase; validate; duplicate check | Also PDS `email`. |
| `contacts` | `telephone` | Telephone | masked phone / `N/A` | `public.employee_personal_information` | `telephone_no` | Medium | Normalize phone; empty/N/A to null |  |
| `contacts` | `mobile` | Mobile number | `*******1234` | `public.employees` | `mobile_no` | High | Normalize PH format to `+63XXXXXXXXXX` where possible | Also PDS `mobile_no`. |
| `government_id` | `gsis` | GSIS number | masked | `public.employees` | `gsis_no` | High | Normalize format; mask in reports | Also PDS personal info. |
| `government_id` | `pagibig` | Pag-IBIG number | masked | `public.employees` | `pagibig_no` | High | Normalize format; mask in reports |  |
| `government_id` | `tin` | TIN | masked | `public.employees` | `tin` | High | Normalize format; mask in reports |  |
| `government_id` | `sss` | SSS number | masked | `public.employee_personal_information` | `sss_no` | High | Normalize format; mask in reports | Employee master has no `sss_no`. |
| `government_id` | `philhealth` | PhilHealth number | masked | `public.employees` | `philhealth_no` | High | Normalize format; mask in reports |  |
| `government_id` | `National_ID` | National/PhilSys ID | masked | `public.employee_personal_information` | `philsys_no` | Medium | Normalize format; mask in reports | Could also create `employee_government_ids` row. |
| `family` | `spouse_name` | Spouse full name | `[name]` | `public.employee_family_background` | spouse name fields | Medium | Split full name into surname/first/middle/suffix | Needs manual review for compound names. |
| `family` | `occupation` | Spouse occupation | `N/A` / text | `public.employee_family_background` | `spouse_occupation` | High | Empty/N/A to null |  |
| `family` | `employer_bus_name` | Spouse employer/business | `[name]` | `public.employee_family_background` | `spouse_employer_business_name` | High | Trim |  |
| `family` | `bus_address` | Spouse business address | `[address text]` | `public.employee_family_background` | `spouse_business_address` | High | Trim |  |
| `family` | `telephone` | Spouse telephone | masked / `N/A` | `public.employee_family_background` | `spouse_telephone_no` | High | Normalize phone |  |
| `family` | `father_name` | Father full name | `[name]` | `public.employee_family_background` | father name fields | Medium | Split full name |  |
| `family` | `mother_name` | Mother full/maiden name | `[name]` | `public.employee_family_background` | mother name fields | Medium | Split full name; validate maiden fields |  |
| `children` | `child_name` | Child full name | `[name]` | `public.employee_children` | `full_name` | High | Trim, normalize case |  |
| `children` | `birth_date` | Child birth date | `2010-06-12` | `public.employee_children` | `birth_date` | High | Convert date format; validate |  |
| `educational_bg` | `level` | Education level | `ELEMENTARY` | `public.employee_education` | `level` | High | Normalize level labels | Must match PDS levels. |
| `educational_bg` | `school_name` | School name | `[school]` | `public.employee_education` | `school_name` | High | Trim, decode HTML entities |  |
| `educational_bg` | `degree` | Degree/course | `BS...` | `public.employee_education` | `degree_course` | High | Combine with `major` when present |  |
| `educational_bg` | `major` | Major/specialization | text | `public.employee_education` | `degree_course` | Medium | Combine fields | Avoid duplicate degree text. |
| `educational_bg` | `yr_grad` | Year graduated | `1979` | `public.employee_education` | `year_graduated` | High | Parse year; validate 1900-2200 |  |
| `educational_bg` | `units_earned` | Highest level/units | `GRADUATE` | `public.employee_education` | `highest_level_units` | High | Normalize text |  |
| `educational_bg` | `d_from` | Attendance from year/date | `1973` | `public.employee_education` | `period_from_year` | Medium | Extract year | Reject invalid ranges. |
| `educational_bg` | `d_to` | Attendance to year/date | `1979` | `public.employee_education` | `period_to_year` | Medium | Extract year | Reject invalid ranges. |
| `educational_bg` | `a_tor` | Attachment/TOR marker | path/flag | `public.employee_pds_attachments` | `document_asset_id` | Low | Verify file path first | Do not import file refs blindly. |
| `educ_awards` | `awards` | Education honors/awards | `Cum Laude` | `public.employee_education` | `scholarship_honors` | Medium | Join onto matching `educ_id` | Could also be recognition. |
| `educ_scholar` | `scholarship` | Scholarship | text | `public.employee_education` | `scholarship_honors` | Medium | Join onto matching `educ_id` |  |
| `eligibility` | `type` | Eligibility title | `PD-907...` | `public.employee_eligibilities` | `eligibility_name` | High | Trim, normalize names |  |
| `eligibility` | `rating` | Rating | `1` | `public.employee_eligibilities` | `rating` | High | Keep as text | Some values are not numeric. |
| `eligibility` | `date_taken` | Exam/conferment date | `1000-01-01` | `public.employee_eligibilities` | `examination_date` | Medium | Convert date; treat sentinel years as null/review | Years before 1900 should be flagged. |
| `eligibility` | `place` | Exam/conferment place | `N/A` / text | `public.employee_eligibilities` | `examination_place` | High | Empty/N/A to null |  |
| `eligibility` | `license_number` | License number | masked | `public.employee_eligibilities` | `license_number` | High | Normalize, mask in reports |  |
| `eligibility` | `valid_date` | License valid until | `2022-06-30` | `public.employee_eligibilities` | `license_valid_until` | High | Convert date |  |
| `service_record` | `date_from` | Service period start | `1999-07-26` | `public.employee_service_records` | `date_from` | High | Convert date; required | Also can map to PDS work experience. |
| `service_record` | `date_to` | Service period end | `1999-09-30` | `public.employee_service_records` | `date_to` | High | Convert date; blank/current handling | Validate no date reversal. |
| `service_record` | `sr_position` | Position title | text/blank | `public.employee_service_records` | `position_title` | Medium | Prefer `sr_position`, fallback `pos_des` | Required in service records. |
| `service_record` | `pos_des` | Position/designation text | `CLERK` | `public.employee_service_records` | `position_title` | High | Trim; fallback position title |  |
| `service_record` | `appointment_status` | Appointment status | `CASUAL` | `public.employee_service_records` | `appointment_status` | High | Normalize text |  |
| `service_record` | `is_gov` | Government service flag | `Y` | `public.employee_work_experiences` | `is_government_service` | High | Map Y/N to boolean | Official service record has no boolean column. |
| `service_record` | `branch` | Branch | text | `public.employee_service_records` | `branch` | High | Normalize text |  |
| `service_record` | `lv_wpay` | Leave without pay | text | `public.employee_service_records` | `leave_without_pay` | High | Normalize text |  |
| `service_record` | `sp_date` | Separation date | date | `public.employee_service_records` | `separation_date` | High | Convert date |  |
| `service_record` | `sp_cause` | Separation cause | text | `public.employee_service_records` | `separation_cause` | High | Normalize text |  |
| `service_record` | `salary` | Salary | numeric/text | `public.employee_service_records` | `monthly_salary` | Medium | Parse numeric; reject negative/non-salary text | Also PDS work experience salary. |
| `service_record` | `office` | Office/station text | text | `public.employee_service_records` | `station_place` | Medium | Map to current office where possible; otherwise text | Do not force ambiguous old offices into UUIDs. |
| `service_record` | `category` | Employment category/type | text | `public.employee_service_records` | `employment_type` | Medium | Normalize text |  |
| `service_record` | `organization` | Agency/company/organization | text | `public.employee_work_experiences` | `department_agency_office_company` | High | Trim |  |
| `positions` | `pos_name` | Position name | `[position]` | `public.employees` | `position_title` | Medium | Lookup by `employee_profile.position` | Also service record fallback. |
| `positions` | `salary_grade` | Salary grade | `20` | `public.employee_service_records` | `salary_grade_step` | Medium | Combine with `step` |  |
| `positions` | `basic_salary` | Basic salary | `68087.00` | `public.employee_service_records` | `monthly_salary` | Low | Use only when service record salary is missing and verified |  |
| `campus` | `campus_name` | Legacy campus name | `Lasam`, `Sanchez Mira` pattern | `public.campuses` | `name` | High | Match to seeded campus; do not duplicate | Current seed includes 10 campuses. |
| `departments` | `dept_name` | Legacy office/department name | `[office]` | `public.offices` | `name` | Medium | Normalize and map within campus | Seed includes 58 office templates per campus. |
| `skills` | `skill_hobby` | Skill or hobby | `GRAPHIC DESIGNING` | `public.employee_other_skills` | `skill_name` | High | Trim, normalize case, deduplicate per employee |  |
| `organizations` | `org_name` | Organization membership | `[organization]` | `public.employee_memberships` | `organization_name` | High | Trim, deduplicate | `role` can be preserved in notes only unless schema adds role. |
| `recognition` | `recog_name` | Recognition title | `[recognition]` | `public.employee_recognitions` | `recognition_title` | High | Trim | `level` can be appended or stored in metadata if needed. |
| `specialization` | `field` | Field/specialization | `WEB DEVELOPMENT...` | `public.employee_other_skills` | `skill_name` | Medium | Split comma-separated values | Could later map to competencies. |
| `trainings` | `title` | Training title | text | `public.employee_learning_development` | `title` | High | Trim | Needs employee link from source or participants. |
| `trainings` | `conducted_by` | Sponsor/conducted by | text | `public.employee_learning_development` | `conducted_by` | High | Trim |  |
| `trainings` | `date_from` | Training start | date | `public.employee_learning_development` | `date_from` | High | Convert date |  |
| `trainings` | `date_to` | Training end | date | `public.employee_learning_development` | `date_to` | High | Convert date |  |
| `trainings` | `hours` | Training hours | number/text | `public.employee_learning_development` | `hours_count` | High | Parse numeric |  |
| `trainings` | `type` / `category` | L&D type/category | text | `public.employee_learning_development` | `learning_type` | Medium | Normalize labels |  |
| `training_post` | `title` | Training event title | `ABCD` | `public.employee_learning_development` | `title` | Medium | Join via `training_participants.training_id` | Useful when participant rows identify employees. |
| `training_participants` | `employee_id` | Employee attendee | `TEMP-****` | `public.employees` | `employee_no` | High | Match to employee |  |
| `training_participants` | `training_id` | Training post reference | `5` | `training_post` | `id` | High | Join before import |  |
| `training_application` | `status`, `cstatus` | Legacy request status | `3`, `1` | `public.training_requests` | status fields | Low | Manual mapping | Import only if L&D request history is required. |
| `employee_leave` | `credit_id` | Leave type reference | `2` | none currently | none | Low | Stage only | No current leave ledger schema. |
| `employee_leave` | `days`, `month`, `year` | Leave balance/use by period | `0.000`, `2025` | none currently | none | Low | Stage only | Needs future leave module. |
| `leave_credits` | `type_of_leave` | Leave type | `Vacation` | none currently | none | Low | Stage only | Can seed future leave lookup. |
| `leave_history` | `leave_date` | Leave date list | comma-separated dates | none currently | none | Low | Split date list; stage only | Needs future leave module. |
| `users` | `email` | Legacy login email | `a***@csu.edu.ph` | `public.app_users` | `email` | Low | Account-link reference only | Do not create Supabase Auth users from this dump. |
| `users` | `password`, `token`-like fields | Legacy credentials | `[redacted]` | none | none | High confidence do not import | Do not import | Credentials are incompatible and sensitive. |
| `logs_tbl` | all columns | Legacy logs | mixed | none | none | Low | Preserve in staging only | Do not copy into `public.audit_logs`; actor IDs are not current users. |
| `employee_profile` | `pic` and file-like columns elsewhere | File reference | path-like text | `public.document_assets` | storage fields | Low | Verify file exists, validate type/size/checksum | Do not create document rows from stale paths. |

## Phase 5 - Reusable Data Categories

### A. Safe to Import After Preview Approval

These fields have clear targets but still require duplicate checks and admin approval.

| Table | Columns | Reason | Risk Level | Recommended Action |
|---|---|---|---|---|
| `employee_profile` | `emp_id`, names, birth date, sex, civil status, date hired, cabinet no | Direct employee/PDS mapping | Medium | Stage, validate, preview, then import approved rows only. |
| `contacts` | `email`, `telephone`, `mobile` | Direct employee/PDS contact mapping | Medium | Normalize and duplicate-check email/mobile. |
| `government_id` | statutory ID columns | Direct employee/PDS ID mapping | High | Mask in reports, duplicate-check IDs, import only after validation. |
| `children` | `child_name`, `birth_date` | Direct PDS section | Medium | Match employee first, normalize dates. |
| `educational_bg` | education fields | Direct PDS section | Medium | Normalize years and levels. |
| `eligibility` | eligibility fields | Direct PDS section | Medium | Treat sentinel dates as null/review. |
| `skills`, `organizations`, `recognition` | item names | Direct PDS other-info sections | Low | Deduplicate per employee. |

### B. Import With Cleanup

| Table | Columns | Reason | Risk Level | Recommended Action |
|---|---|---|---|---|
| `address` | full address text, ZIP, phone | Needs structured JSON or text fallback | Medium | Normalize, store raw text in address JSON, split later if needed. |
| `family` | spouse/father/mother full-name fields | Requires name splitting | Medium | Import only when split confidence is acceptable; otherwise queue review. |
| `service_record` | service periods, position, salary, office, appointment status | Strong official HR value, but high duplicate/overlap risk | High | Import to staging, detect overlaps, preview before writing official service records. |
| `training_post`, `training_participants`, `trainings`, `training_application` | training data | Useful for PDS L&D and L&D history | Medium | Join event/participant rows; avoid duplicating training records. |
| `campus`, `departments`, `positions`, `salary_grade` | master/reference data | Useful lookup data, current seed already exists | Medium | Use for mapping only; do not blindly insert duplicates. |
| `educ_awards`, `educ_scholar`, `specialization` | honors/scholarships/specialization | Useful but needs merging/splitting | Medium | Map to education honors, recognitions, or skills after review. |

### C. Needs Manual Review

| Table | Columns | Reason | Risk Level | Recommended Action |
|---|---|---|---|---|
| `research_completed`, `research_patent`, `research_published`, `rc_employee` | research records | No direct current research module target | Medium | Preserve for future module or map to recognitions only with HR approval. |
| `compensation_benefits`, `salary_day_hr`, `employee_loan`, `monthly_deduction` | payroll/loan/deduction data | Sensitive and not current module surface | High | Stage only; import later only after payroll/benefits schema exists. |
| `employee_leave`, `leave_credits`, `leave_history` | leave balances/history | No current leave/service-credit ledger | High | Stage only; design leave module first. |
| `update_request`, `sr_request`, `concern` | old workflow records | Historical context, unclear business value | Medium | Keep out of core tables; archive/stage only. |
| `pic`, `source`, `supporting_document`, attachment-like columns | file paths | Paths may not exist and may expose PII | High | Verify storage and files before any document import. |

### D. Do Not Import Into Live Prime-HR Tables

| Table | Columns | Reason | Risk Level | Recommended Action |
|---|---|---|---|---|
| `users` | `password`, role/status fields, legacy user IDs | Supabase Auth is authoritative; passwords incompatible/sensitive | Critical | Do not import; use email only for possible employee matching review. |
| `token` | all | Sensitive auth/reset token data | Critical | Do not import; exclude from reports or redact. |
| `logs_tbl` | all | Actor IDs and semantics do not match current audit model | Medium | Preserve in staging only if legal/audit needs require. |
| `settings`, `eval_setting`, `events`, `announcement`, `web_email` | system/content config | Not employee/PDS data | Low | Do not import into HR records. |
| `*_points`, `tbl_criteria_*`, empty scoring tables | point-calculation cache | Derived/obsolete and mostly empty | Low | Do not import; recompute in future modules if needed. |

## Phase 6 - Employee Matching Strategy

Never match solely by full name. Use a scored matching strategy and queue ambiguous rows for HR review.

Recommended priority:

| Priority | Match Key | Source | Notes |
|---:|---|---|---|
| 1 | Employee number | `employee_profile.emp_id`, linked table `employee_id`; Prime-HR `employees.employee_no` | Strongest reusable key if unique. Normalize case, spaces, and hyphen variants first. |
| 2 | Email | `contacts.email`, `users.email`; Prime-HR `employees.email`, `app_users.email` | Lowercase and trim. Detect duplicate emails before matching. |
| 3 | Government ID | `government_id.tin`, `gsis`, `pagibig`, `philhealth`, `sss`, `National_ID` | Strong but sensitive; mask in reports and require exact normalized match. |
| 4 | Full name + birth date | `employee_profile` names and `birth_date` | Accept only when birth date is valid and names normalize cleanly. |
| 5 | Manual review | Any unresolved/ambiguous row | Required for conflicting keys, missing employee no, or multiple possible matches. |

Duplicate warnings should be generated for:

- Same normalized employee number.
- Same normalized email.
- Same full name plus same birth date.
- Same normalized TIN, GSIS, Pag-IBIG, PhilHealth, SSS, or PhilSys/National ID.
- Same normalized mobile number.
- Conflicting employee number with same email or same government ID.
- Same employee with overlapping service record periods.
- Same employee with duplicate PDS rows for the same section and same effective dates/titles.

Recommended duplicate review states:

| State | Meaning | Import Behavior |
|---|---|---|
| `exact_match` | One current employee matched by employee number or government ID | Allow preview, still require admin approval. |
| `probable_match` | Email or name+birth date matches one employee | Queue for HR confirmation. |
| `conflict` | Multiple employees match one key, or keys point to different employees | Block import until resolved. |
| `new_candidate` | No current employee match found | Allow staged preview as new employee candidate only. |
| `rejected` | Bad or obsolete legacy row | Preserve issue reason; do not import. |

## Phase 7 - Data Cleaning Rules

Apply these rules before preview generation and never silently delete questionable records.

| Data Area | Cleaning Rule | Review Trigger |
|---|---|---|
| Empty values | Convert empty strings, `N/A`, `NA`, `none`, `null`, `-`, and similar sentinels to null where the target allows null. | Required target field becomes null. |
| Dates | Normalize to `YYYY-MM-DD`; accept MySQL ISO and common PH slash formats. | Date cannot parse, year before 1900, future date not allowed, or period start > end. |
| HTML entities | Decode entities such as `&Ntilde;`, `&ntilde;`, `&amp;`. | Unknown entity remains after decoding. |
| Employee numbers | Trim, collapse spaces, preserve hyphenated code; compare case-insensitively. | Duplicate, blank, or multiple legacy IDs for one person. |
| Emails | Lowercase, trim, validate syntax. | Duplicate email, invalid email, or email conflicts with app user. |
| Mobile numbers | Normalize Philippine mobile numbers to `+63XXXXXXXXXX` when possible. | Non-standard phone remains after normalization. |
| Names | Trim, collapse whitespace, normalize all-caps where safe, preserve suffixes. | Full-name split is ambiguous or missing first/last name. |
| Suffix | Normalize `Jr`, `JR.`, `III`, etc. | Suffix embedded in last name or first name. |
| Sex/gender | Map `M`, `Male` to `male`; `F`, `Female` to `female`; unknowns to review or `unknown`. | Value is not recognized. |
| Civil status | Normalize common values like single, married, widowed, separated. | Non-standard or conflicting civil status. |
| Campus/office | Map old IDs/names to current `campuses`/`offices` UUIDs. | No match, multiple matches, inactive target, or campus/office mismatch. |
| Employment type/status | Normalize regular, casual, COS, job order, active, separated, retired, on leave. | Status conflicts with separation date/cause. |
| Position titles | Resolve through `positions`, fallback to text; trim. | Old position ID missing from `positions`. |
| Salary | Strip commas/currency symbols and parse numeric. | Negative, blank required salary, or implausible amount. |
| Government IDs | Strip spaces/dashes only for comparison, preserve display format if approved; mask in reports. | Duplicate ID across employees or invalid length/pattern. |
| Addresses | Preserve raw address text, optionally split later; normalize ZIP to 4 digits. | Address text is `N/A`, too short, or ZIP invalid. |
| Service periods | Sort by employee/date, detect overlaps and one-current-record violations. | Overlap, missing date_from, invalid range, or multiple current records. |
| File paths | Validate path exists, file type, size, checksum, and ownership. | Missing file, unsupported type, or untrusted path. |

## Phase 8 - Safe Import Design

Recommended import process, not yet executed:

1. Parse `public/hris.sql` offline with a read-only script.
2. Extract rows into generated JSON/CSV previews or staging tables only.
3. Normalize and clean values using pure transformers.
4. Map old campus, department, position, salary grade, and employee codes to current Prime-HR master data.
5. Detect duplicates and cross-key conflicts.
6. Generate an import preview that masks government IDs and sensitive values.
7. Let an authorized HR admin review and approve candidate rows.
8. Import only approved records, in dependency order.
9. Store legacy references in `public.legacy_record_map`, `employees.external_ref`, and `employee_pds_profiles.legacy_employee_code` as appropriate.
10. Generate a post-import summary with counts, skipped rows, warnings, and blocking issues.

Existing staging/tracking infrastructure:

- `public.migration_batches`
- `public.legacy_record_map`
- `public.legacy_staging_employee_profile`
- `public.legacy_staging_address`
- `public.legacy_staging_contacts`
- `public.legacy_staging_family`
- `public.legacy_staging_children`
- `public.legacy_staging_educational_bg`
- `public.legacy_staging_eligibility`
- `public.legacy_staging_service_record`
- `public.legacy_staging_government_id`
- `public.legacy_staging_skills`
- `public.legacy_staging_organizations`
- `public.legacy_staging_recognition`
- `public.legacy_staging_trainings`
- `public.legacy_staging_training_participants`
- `public.legacy_staging_training_post`
- `public.legacy_staging_users`
- `public.legacy_staging_logs_tbl`

Additional staging tables may be needed before a full import:

| Proposed Table | Purpose | Create Now? |
|---|---|---|
| `legacy_employee_imports` | Normalized employee candidates and match state | No, propose only. |
| `legacy_service_record_imports` | Normalized service record preview with overlap findings | No, propose only. |
| `legacy_pds_imports` | Normalized PDS section preview | No, propose only. |
| `legacy_import_issues` | Row-level validation issues | No, propose only. |
| `legacy_import_batches` | Optional richer staging metadata if `migration_batches` is insufficient | No, propose only. |

## Phase 9 - Migration Script Recommendation

It is safe to create an offline analysis/preview script next, but it should not import data or connect to production by default.

Recommended script files:

- `scripts/analyze-hris-sql.ts`
- `scripts/parse-hris-sql.ts`
- `scripts/preview-legacy-import.ts`

Required script behavior:

- Read `public/hris.sql` as text.
- Extract table definitions, columns, indexes, insert counts, and row previews.
- Parse selected rows into normalized in-memory objects.
- Produce masked reports under `docs/generated/` or local-only output under `scripts/output/`.
- Never connect to Supabase unless an explicit `--use-local-staging` or similar flag is provided.
- Never modify production by default.
- Mask TIN, GSIS, Pag-IBIG, PhilHealth, SSS, PhilSys/National ID, emails, mobile numbers, and legacy tokens in reports.
- Generate duplicate and issue reports before any import command exists.

Possible outputs:

- `docs/generated/hris-sql-table-inventory.md`
- `docs/generated/hris-sql-field-mapping.md`
- `scripts/output/hris-table-summary.json`
- `scripts/output/hris-import-preview.csv`
- `scripts/output/hris-import-issues.csv`

Do not commit unmasked generated reports that include employee PII.

## Phase 10 - Risk Checklist

- [ ] Duplicate employees by employee number.
- [ ] Duplicate employees by email.
- [ ] Duplicate employees by government ID.
- [ ] Duplicate employees by mobile number.
- [ ] Wrong employee matching due to reused or mistyped legacy employee codes.
- [ ] Full-name-only matches creating false positives.
- [ ] Incomplete old employee records missing first name, last name, campus, or employee number.
- [ ] Old campus IDs/names not matching current `public.campuses`.
- [ ] Old department IDs/names not matching current `public.offices`.
- [ ] Collation and encoding issues, especially HTML entities.
- [ ] Invalid, sentinel, or ambiguous dates.
- [ ] Conflicting employment statuses or separation data.
- [ ] Multiple service records for the same person with overlapping periods.
- [ ] Multiple records for the same PDS section that may duplicate current employee-entered data.
- [ ] Missing required fields in Prime-HR target tables.
- [ ] Old deleted/inactive/separated employees accidentally imported as active.
- [ ] Sensitive data exposure in logs, generated reports, or committed CSV/JSON files.
- [ ] Legacy file paths that no longer exist.
- [ ] Auth/login email conflicts between old `users` and Supabase Auth users.
- [ ] Old passwords/tokens imported accidentally.
- [ ] Legacy audit logs incorrectly copied into current audit logs with invalid actors.
- [ ] Leave and payroll data imported before target modules exist.
- [ ] Official service records imported without HR approval or overlap review.

## Recommended Import Approach

1. Build an offline parser/preview script first.
2. Generate a masked table inventory and field-level preview.
3. Create normalized staging previews for employees, PDS sections, and service records.
4. Have HR review matching and duplicate issues.
5. Only after approval, create or extend migrations for missing staging/issue tables if needed.
6. Run a dry-run migrator against a local Supabase instance.
7. Compare counts and spot-check records.
8. Only then consider an approved production import plan.

## Next Implementation Prompt

Use this as the next prompt when ready to build tooling:

```text
Create a read-only TypeScript script at scripts/analyze-hris-sql.ts that parses public/hris.sql without connecting to Supabase. It should extract table definitions, row counts, insert samples with PII masking, candidate employee/PDS/service-record mappings, duplicate-risk signals, invalid date/empty-string/HTML-entity counts, and write reports to docs/generated/ and scripts/output/. Do not import data, do not create migrations, and do not print unmasked government IDs, emails, phone numbers, passwords, or tokens.
```

## Final Determination

Yes, reusable data can be extracted safely from `public/hris.sql`, but only through a staged, masked, reviewable process. The best first import candidates are employee master records, PDS personal/contact/address/government ID records, family/children, education, eligibility, skills, memberships, recognitions, training/L&D, and service records. The highest-risk areas are matching employees correctly, handling duplicate/sensitive IDs, importing service records without overlap review, and touching leave/payroll/user-auth data before Prime-HR has approved target workflows.
