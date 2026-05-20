# CSU PRIME-HR — Project Overview

## What is Prime-HR?

**CSU PRIME-HR** (Personnel Records and Information Management for HR) is the official Human Resource Information System of **Caraga State University**. It replaces the legacy HRIS SQL database with a modern, secure, web-based platform.

---

## Main Users

| Role | Scope | Key Actions |
|---|---|---|
| `super_admin` | System-wide | Full access to all modules and settings |
| `central_hr_admin` | System-wide | HR operations, PDS review, employee records |
| `campus_hr_officer` | Campus-scoped | Employee records, PDS, recruitment, compliance |
| `office_unit_head` | Office-scoped | Limited employee data, compliance review |
| `committee_member` | Committee-scoped | Compliance review, rewards committee |
| `employee` | Self-service | PDS, training requests, performance self-assessment |

---

## Main Modules

### 1. Employee Records (`/employees`)
- Employee master data: name, employment status, campus, office, appointment
- Profile view, edit, archive, soft delete
- Linked system account management
- Document index

### 2. Personal Data Sheet — PDS Rev. 2025 (`/pds`, `/employees/[id]/pds`)
- CSC Form 212 Rev. 2025 compliance
- Self-service workspace for employees
- HR admin view for review and verification
- Sections: Personal Info, Family Background, Education, Eligibility, Work Experience, Voluntary Work, L&D, Other Info, References, Declaration
- Draft → Under Review → Verified → Generated workflow

### 3. Recruitment (`/recruitment`)
- Vacancy management
- Applicant tracking
- Screening and interview scheduling
- Ranking and recommendations

### 4. Compliance Monitoring (`/compliance`)
- Compliance indicators
- Evidence submission and attachments
- Action plans
- Status tracking and dashboards

### 5. Learning and Development (`/learning`)
- Training program catalog
- Nomination and training requests
- Competency assessments
- Training history and reports

### 6. Performance Management (`/performance`)
- IPCR-style performance reviews
- Rating configuration
- Finalization workflow
- Audit history

### 7. Rewards and Recognition (`/rewards`)
- Nomination workflow
- Committee review and approval
- Decision snapshots and history

### 8. Admin (`/admin`)
- User management (role, campus, office assignment)
- Organization management (campuses, offices)

### 9. Legacy HRIS Migration
- Import infrastructure for old SQL database
- Field mapping pipeline
- Dry-run and live migration modes
- Migration batch tracking and audit

---

## Main Goals

1. Centralize all HR data for CSU employees in one system.
2. Support CSC PDS Rev. 2025 compliance fully.
3. Replace the old HRIS SQL database with a clean, auditable migration.
4. Provide role-based self-service for employees and HR staff.
5. Maintain a complete audit trail for all sensitive HR actions.

---

## Current Known Scope

- ✅ Employee master records
- ✅ PDS self-service workspace (CSC Form 212 Rev. 2025)
- ✅ HR admin PDS view and edit
- ✅ Recruitment pipeline (vacancies → recommendations)
- ✅ Compliance monitoring
- ✅ Learning and Development
- ✅ Performance management
- ✅ Rewards and recognition
- ✅ User and organization management
- ✅ Legacy HRIS migration infrastructure
- ✅ Audit logs

---

## Future Scope

- PDS export: PDF and XLSX generation matching the official CSC Form 212 Rev. 2025 layout
- Leave management module
- Appointments and service records module
- Reports and analytics dashboard
- Automated HRIS data validation reports
- Mobile-friendly UX improvements

---

## Notes on Legacy HRIS SQL

The old HRIS SQL database (`public/hris.sql`) contains employee records, PDS data, training records, and eligibility data. The migration pipeline is at `src/features/migration/legacy-hris/`. It uses a `legacy` Supabase schema (service-role only) as a staging area before migrating rows to the public schema.

See `docs/old-hris-sql-mapping.md` for the full field mapping.

---

## Notes on PDS Rev. 2025

The CSC Form 212 Rev. 2025 is a legally required government document. The system must:
- Capture all fields as defined by CSC
- Validate completeness and format
- Export in the official format

See `docs/pds-rev-2025-integration.md` for integration details.
