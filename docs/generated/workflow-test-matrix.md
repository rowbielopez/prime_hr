# Workflow Test Matrix — PRIME-HR

**Date:** 2026-05-28
**Method:** Static review of action + repository + UI + migration files.
**Legend:** ✅ Working · 🟡 Partial · ❌ Broken · ➖ Not Implemented · 🔍 Needs Manual Verification

---

## Employee Management

| Workflow                                 | Status | Notes                                                                |
| ---------------------------------------- | ------ | -------------------------------------------------------------------- |
| Add employee                             | ✅     | `employees.actions.ts:47` — validation + campus/office scope check   |
| Edit employee                            | ✅     | `employees.actions.ts:103`                                           |
| Update employee email (super_admin only) | ✅     | Gated at L127; provisioning via `provision-and-authorize-user.ts`    |
| Search / filter employee list            | ✅     | `EmployeeListManagement` component                                   |
| Hide internal IDs in UI                  | ✅     | No raw UUIDs / legacy IDs in JSX                                     |
| Duplicate email guard                    | ✅     | Unique index `uq_employees_email_normalized_active` (migration 0017) |
| Duplicate employee no.                   | ✅     | `unique` constraint on `employees.employee_no` (migration 0002)      |

## Employee Portal

| Workflow                 | Status     | Notes                                                    |
| ------------------------ | ---------- | -------------------------------------------------------- |
| Login (Google OAuth)     | ✅         | `/login`, callback enforces allowed email domains        |
| Employee dashboard       | ✅         | `/dashboard` permission-aware                            |
| My Profile               | ✅         | `/me/profile` — read/edit contact + government IDs       |
| My PDS workspace         | ✅         | `/pds` redirects + `PdsWorkspaceShell`                   |
| Submit PDS for HR review | ✅         | `pds-workspace.actions.ts`                               |
| My Employment            | 🟡         | View works; "Request a correction" button is placeholder |
| My Service Record        | ✅         | `/me/service-record` read-only                           |
| My Documents             | ✅         | `/me/documents` lists 201 files                          |
| My Requests              | ✅         | `/me/requests` + cancel via `ConfirmDialog`              |
| My Notifications         | ✅         | `/me/notifications`                                      |
| Account Settings         | ✅         | `/me/settings`                                           |
| Cross-employee access    | ✅ blocked | RLS + permission strings restrict to `pds.self.*`        |

## Employee Requests / HR Review Queue

| Workflow                             | Status | Notes                                            |
| ------------------------------------ | ------ | ------------------------------------------------ |
| Submit request (draft)               | ✅     | `requests.actions.ts:60`                         |
| Submit request (final)               | ✅     | duplicate check via `findSimilarActiveRequest`   |
| HR sees request                      | ✅     | `/requests/review`                               |
| Start review                         | ✅     | state machine in `requests-review.actions.ts:67` |
| Approve / reject / return / complete | ✅     | All transitions covered with reason capture      |
| Employee sees status + HR remarks    | ✅     | Reflected on `/me/requests`                      |

## PDS

| Workflow                      | Status | Notes                                                      |
| ----------------------------- | ------ | ---------------------------------------------------------- |
| Sections load                 | ✅     | 9 sections (C1–C4)                                         |
| Save draft                    | ✅     | `savePdsSection` autosave                                  |
| Submit for HR review          | ✅     | `submitPdsForReview`                                       |
| Status persists after refresh | ✅     | DB-backed                                                  |
| HR review approve / reject    | ✅     | `pds-review.actions.ts`                                    |
| Missing required sections     | 🔍     | UI shows status badges; full validation matrix not audited |

## Service Records

| Workflow                | Status | Notes                                                              |
| ----------------------- | ------ | ------------------------------------------------------------------ |
| List loads              | ✅     | `/service-records`                                                 |
| Detail loads            | ✅     | `/service-records/[employeeId]`                                    |
| Add / edit              | ✅     | Date validation + overlap detection (with `allowOverlap` override) |
| Employee read-only view | ✅     | `/me/service-record`                                               |
| Print page              | ✅     | `/service-records/[employeeId]/print`                              |
| Archive (destructive)   | 🟡     | Works but uses `window.confirm()`                                  |

## Talent Pipeline / Recruitment

| Workflow                     | Status | Notes                                            |
| ---------------------------- | ------ | ------------------------------------------------ |
| Candidate list               | ✅     | `/recruitment/applicants`                        |
| Add candidate                | ✅     | `applicants/new`                                 |
| Edit candidate               | ✅     | `[id]/edit`                                      |
| Change stage                 | ✅     | with remark capture                              |
| Duplicate detection          | ✅     | `findPotentialDuplicatesAction` (email + mobile) |
| Convert candidate → employee | ✅     | `convertApplicantToEmployee`                     |

## Job Vacancy

| Workflow                   | Status | Notes                                               |
| -------------------------- | ------ | --------------------------------------------------- |
| Create vacancy             | ✅     | `vacancies/new`                                     |
| Edit vacancy               | ✅     | `[id]/edit` (save button verified working)          |
| Publish vacancy            | ✅     | Readiness validation (qualifications, dates, slots) |
| Close / archive            | ✅     | uses `ConfirmDialog`                                |
| Required documents linking | ✅     | migrations 0058–0059                                |

## Public Careers

| Workflow                            | Status  | Notes                                                               |
| ----------------------------------- | ------- | ------------------------------------------------------------------- |
| `/careers` accessible without login | ✅      | proxy excludes                                                      |
| Only open vacancies shown           | ✅      | `public_vacancies` view                                             |
| `/careers/[slug]` detail            | ✅      |                                                                     |
| Application form                    | ✅      | Zod validation                                                      |
| Honeypot anti-bot                   | ✅      | `_hp` field                                                         |
| IP rate limit                       | 🟡      | In-memory only (not safe on serverless)                             |
| Email+vacancy duplicate guard       | ✅      | DB query before insert                                              |
| Candidate appears in pipeline       | ✅      | inserted into `recruitment_applicants` + `recruitment_applications` |
| Reference number generation         | ✅      | `next_application_reference_no()` RPC                               |
| Success page                        | ✅      | `/careers/[slug]/apply/success`                                     |
| Internal data leakage               | ✅ none | view exposes only public columns                                    |

## Documents

| Workflow               | Status | Notes                                                                                 |
| ---------------------- | ------ | ------------------------------------------------------------------------------------- |
| Upload (HR)            | 🟡     | `createSecureUploadUrl` exists; explicit UI wrapper present in evidence + secure docs |
| Download               | 🔍     | Signed URLs used; verify expiry                                                       |
| Employee sees only own | ✅     | RLS-scoped                                                                            |

## Performance / L&D / Rewards / Compliance

| Workflow                                                                               | Status                            |
| -------------------------------------------------------------------------------------- | --------------------------------- |
| Performance cycles + records + reviews + finalize + rating bands                       | ✅                                |
| Performance dashboard + summary                                                        | ✅                                |
| Learning programs + plans + sessions + requests + competencies + assessments + reports | ✅                                |
| Rewards awards catalog + nomination + review + approval + history + reports            | ✅                                |
| Compliance evidence CRUD + dashboard                                                   | ✅ (delete uses `window.confirm`) |

## Reports / Exports

| Workflow                      | Status                         |
| ----------------------------- | ------------------------------ |
| PDS export (XLSX via ExcelJS) | ✅                             |
| PDS print page                | ✅                             |
| Service record print          | ✅                             |
| Global `/reports` portal      | ➖ Coming soon, not in sidebar |

---

## Workflow Risks

- 🟡 **`window.confirm` for service-record archive + evidence delete** — not user-friendly, not on-brand. Replace with `ConfirmDialog`.
- 🟡 **In-memory rate limiter** — public application form is the highest-risk public endpoint.
- 🟡 **Placeholder `/me/leave` and `/me/employment` correction button** — set expectations or remove before public rollout.
- 🔍 **Document upload UI** — confirmed for compliance evidence; verify other domains.
- 🔍 **PDS section validation matrix** — full CSC Form 212 Rev. 2025 field coverage not deeply re-audited here.
