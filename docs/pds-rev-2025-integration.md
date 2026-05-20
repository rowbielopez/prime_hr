# CSU PRIME-HR — PDS Rev. 2025 Integration

## Purpose

The CSC Form 212 (Revised 2025) — Personal Data Sheet — is a legally required government document that all CSU employees must submit. Prime-HR implements full PDS Rev. 2025 data capture, validation, review workflow, and export generation.

> ⚠️ **Compliance Note:** This is a government-mandated form. Do not guess, omit, or reorder fields. All changes to PDS logic must be verified against the official CSC Form 212 Rev. 2025.

---

## System Entry Points

| Route | Access | Purpose |
|---|---|---|
| `/pds` | Employee (self-service) | PDS workspace wizard |
| `/employees/[id]/pds` | HR admin | View employee PDS |
| `/employees/[id]/pds/edit` | HR admin | Edit employee PDS sections |

---

## PDS Profile Workflow

```
not_started
  └─> draft              (employee begins filling)
        └─> incomplete   (auto-detected: required fields missing)
        └─> ready_for_review  (employee submits)
              └─> under_hr_review  (HR opens review)
                    └─> returned_for_correction  (HR returns)
                    └─> verified                 (HR accepts)
                          └─> generated          (PDF/XLSX exported)
```

Status is tracked in `public.employee_pds_profiles.status` (`pds_profile_status` enum).

---

## Database Foundation

Migration: `supabase/migrations/0044_pds_2025_foundation.sql`

Key tables:
- `employee_pds_profiles` — one per employee, tracks status and completion score
- `employee_pds_personal_info` — C1: personal details
- `employee_pds_family_background` — C1: spouse and parents
- `employee_pds_children` — C1: children list
- `employee_pds_education` — C1: educational background
- `employee_pds_civil_service_eligibility` — C2: CSC eligibilities
- `employee_pds_work_experience` — C2: work/service records
- `employee_voluntary_work` — C3: voluntary work
- `employee_pds_learning_development` — C3: training/L&D
- `employee_pds_other_info_skills` — C3: skills
- `employee_pds_other_info_recognitions` — C3: recognitions
- `employee_pds_other_info_memberships` — C3: org memberships
- `employee_pds_references` — C4: character references
- `employee_pds_declaration` — C4: legal questions, declaration
- `employee_pds_government_ids` — C4: government-issued ID

---

## PDS Sections (in official order)

### Sheet C1

#### 1. Personal Information
Key fields:
- Surname, first name, middle name, name extension (Jr., Sr., III, etc.)
- Date of birth, place of birth
- Sex at birth, civil status
- Height (meters), weight (kg), blood type
- Citizenship (Philippine or dual; if dual: by birth or naturalization, country)
- Residential address (house/lot/block, street, subdivision, barangay, city/municipality, province, zip code)
- Permanent address (same fields)
- Telephone no., mobile no., email address
- Government IDs: GSIS, Pag-IBIG, PhilHealth, SSS, TIN, PhilSys ID, Agency Employee No.

#### 2. Family Background
Key fields:
- Spouse: surname, first name, middle name, name extension, occupation, employer, business address, telephone no.
- Father: surname, first name, middle name, name extension
- Mother (maiden name): surname, first name, middle name
- Children: full name, date of birth (up to N entries)

#### 3. Educational Background
One row per level. Key fields per row:
- Level (elementary, secondary, vocational, college, graduate studies)
- Name of school
- Basic education/degree/course
- Period of attendance: from–to (years)
- Highest level/units earned (if not graduated)
- Year graduated
- Scholarship/academic honors received

---

### Sheet C2

#### 4. Civil Service Eligibility
Key fields per entry:
- Career service/RA/board/bar examination title
- Rating (if applicable)
- Date of examination/conferment
- Place of examination/conferment
- License number (if applicable)
- Date of validity (if applicable)

#### 5. Work Experience
Key fields per entry:
- Inclusive dates: from–to
- Position title
- Department/agency/office/company
- Monthly salary
- Salary grade/step (for government positions)
- Status of appointment
- Government service: Yes/No

---

### Sheet C3

#### 6. Voluntary Work or Involvement in Civic/Non-Government/People/Voluntary Organization
Key fields per entry:
- Name and address of organization
- Inclusive dates: from–to
- Number of hours
- Position/nature of work

#### 7. Learning and Development Interventions/Training Programs Attended
Key fields per entry:
- Title of L&D/training program
- Inclusive dates: from–to
- Number of hours
- Type of L&D (managerial, supervisory, technical, foundational)
- Conducted/sponsored by

#### 8. Other Information
Three sub-sections:

**a) Special Skills and Hobbies**
- Free text list of skills/hobbies

**b) Non-Academic Distinctions/Recognition**
- Free text list of recognitions

**c) Membership in Association/Organization**
- Free text list of memberships

---

### Sheet C4

#### 9. References
Three references. Key fields per reference:
- Name
- Address
- Telephone no.

#### 10. Declaration (Questions 34–40 + Signature)
Legal questions (Yes/No + explanation if Yes):
- Q34: Relationship to third degree of consanguinity or affinity with current officials
- Q35a: Found guilty of administrative offense
- Q35b: Criminal charge filed
- Q36: Convicted of any crime
- Q37: Separated from service
- Q38: Candidate in any election
- Q39: Resigned from government to run for office
- Q40: Immigrant/permanent resident status

Additional declaration fields:
- Government-issued ID: ID type, ID number, date of issuance/place of issuance
- Signature over printed name
- Date accomplished
- Thumbmark field
- Administering officer: name, position, title, agency
- Date subscribed and sworn

---

## Separation of Concerns

The PDS implementation must maintain strict separation:

1. **Data Capture** — forms, validation, draft saving (self-service workspace + HR admin edit)
2. **Data Validation** — completeness checks, format checks, required field checks
3. **Export/Print** — PDF and XLSX generation matching the official CSC layout

These are three distinct steps. Do not mix rendering/export logic into data capture code.

---

## PDS Workspace Tabs vs Official Sections

The workspace UI (`/pds`) has **12 tabs** defined in `src/features/pds/constants.ts`:

| Tab key | Sheet | Note |
|---|---|---|
| `overview` | Workspace | Status, linkage, and readiness — **not an official PDS section** |
| `personal_information` | C1 | Official section 1 |
| `family_background` | C1 | Official section 2 |
| `educational_background` | C1 | Official section 3 |
| `civil_service_eligibility` | C2 | Official section 4 |
| `work_experience` | C2 | Official section 5 |
| `voluntary_work` | C3 | Official section 6 |
| `learning_development` | C3 | Official section 7 |
| `other_information` | C3 | Official section 8 |
| `references` | C4 | Official section 9 |
| `declaration` | C4 | Official section 10 |
| `review_generate` | Workspace | Validation summary and export — **not an official PDS section** |

The official CSC form has **10 sections** (C1–C4). The two workspace-only tabs (`overview`, `review_generate`) are implementation concerns, not form sections. Do not include them in export or completion score calculations.

---

## Field Mapping Notes

### From Legacy HRIS
Legacy `address` table → personal info addresses (residential + permanent split)  
Legacy `family` → family background (spouse + parents)  
Legacy `children` → children list  
Legacy `educational_bg` → educational background  
Legacy `eligibility` → civil service eligibility  
Legacy `service_record` → work experience  
Legacy `government_id` → government IDs (declared in C4)  
Legacy `skills` → other info: skills  
Legacy `organizations` → other info: memberships  
Legacy `recognition` → other info: recognitions  
Legacy `trainings` → L&D section  

### Transformation requirements
- Date formats: normalize to `YYYY-MM-DD` from legacy `DD/MM/YYYY` or mixed formats
- Address fields: legacy may store address as a single text field — must be split into structured fields
- Name fields: trim extra whitespace, normalize case
- Salary: legacy may store as text — parse to numeric

---

## Compliance Notes

- Do NOT add, remove, or reorder PDS sections without explicit CSC approval.
- Field labels in the UI should match official CSC Form 212 Rev. 2025 labels as closely as possible.
- Export must reproduce the official form layout — a generated PDS must be acceptable to CSC offices.
- PDS data is personally identifiable information (PII) — apply all security rules in `docs/security-and-privacy.md`.

---

## Pending PDS Integration Tasks

- [ ] PDF export engine selection and implementation
- [ ] XLSX export matching official template
- [ ] PDS version history (when an employee updates their PDS after verification)
- [ ] HR review workflow UI
- [ ] Bulk PDS status dashboard for HR
