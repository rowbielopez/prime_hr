# CSU PRIME-HR — Implementation Roadmap

> This document tracks the high-level implementation phases for Prime-HR. Update each phase as work progresses.

---

## Phase 1: Documentation and Architecture Audit ✅ (Complete)

**Goal:** Establish the AI instruction system, architecture documentation, and project context.

- [x] `AGENTS.md` — primary AI instruction file
- [x] `.github/copilot-instructions.md` — GitHub Copilot instructions
- [x] `CLAUDE.md` — Claude Code instructions
- [x] `docs/project-overview.md`
- [x] `docs/architecture.md`
- [x] `docs/database-schema.md`
- [x] `docs/old-hris-sql-mapping.md`
- [x] `docs/pds-rev-2025-integration.md`
- [x] `docs/ui-design-system.md`
- [x] `docs/security-and-privacy.md`
- [x] `docs/testing-checklist.md`
- [x] `docs/implementation-roadmap.md`
- [x] `.agents/` role files
- [x] `docs/copilot-prompt-library.md`

---

## Phase 2: Database and Legacy HRIS SQL Mapping ✅ (Foundation Complete)

**Goal:** Establish the new schema and map all legacy HRIS data to the new structure.

- [x] Foundation tables (campuses, offices, roles, users, employees) — migrations 0001–0006
- [x] Recruitment tables — migrations 0009–0013
- [x] Compliance tables — migrations 0011, 0020–0024
- [x] L&D tables — migrations 0025–0033
- [x] Performance tables — migrations 0034–0039
- [x] Rewards tables — migrations 0040–0042
- [x] PDS Rev. 2025 tables — migration 0044
- [x] Legacy HRIS migration infrastructure — migrations 0045–0047
- [ ] **Pending:** Full field-level mapping documentation in `docs/old-hris-sql-mapping.md`
- [ ] **Pending:** Dry-run migration and issue report
- [ ] **Pending:** Live migration execution and verification

---

## Phase 3: PDS Rev. 2025 Data Model and Forms ✅ (Data Capture Complete)

**Goal:** Implement complete PDS data capture for all sections.

- [x] Employee self-service PDS workspace (`/pds`) — all 12 sections
- [x] HR admin PDS view (`/employees/[id]/pds`)
- [x] HR admin PDS edit form (`/employees/[id]/pds/edit`) — all sections
- [x] Server actions for all PDS sections (self-service and admin)
- [x] PDS profile status workflow
- [ ] **Pending:** HR review workflow UI (under_hr_review, returned_for_correction, verified states)
- [ ] **Pending:** PDS completion score calculation and display improvements
- [ ] **Pending:** PDS version history

---

## Phase 4: PDS Export / Print Template 🔴 (Not Started)

**Goal:** Generate PDS in PDF and XLSX format matching the official CSC Form 212 Rev. 2025 layout.

- [ ] Select export engine (React-PDF, Puppeteer, server-side XLSX)
- [ ] Implement PDF template matching official form layout
- [ ] Implement XLSX template
- [ ] Enforce `pds.generate` permission for exports
- [ ] Use signed URLs for generated files
- [ ] Test with complete and partial PDS data
- [ ] Validate output against official CSC form layout

---

## Phase 5: UI/UX Standardization 🟡 (In Progress)

**Goal:** Ensure all modules have consistent, modern, accessible UI.

- [x] Employee module UI
- [x] PDS workspace shell UI
- [x] Recruitment module UI
- [x] Compliance module UI
- [x] L&D module UI
- [x] Performance module UI
- [x] Rewards module UI
- [x] Admin module UI
- [ ] **Pending:** Admin PDS edit form — voluntary work tab
- [ ] **Pending:** HR PDS review workflow UI
- [ ] **Pending:** Mobile responsiveness audit across all modules
- [ ] **Pending:** Empty state and loading skeleton audit across all modules

---

## Phase 6: Security and QA 🟡 (In Progress)

**Goal:** Ensure all security rules are enforced and all features are regression-tested.

- [x] RLS on all tables
- [x] `requirePermission()` on all server actions
- [x] Zod validation on all server actions
- [x] Audit log on all sensitive mutations
- [x] Soft delete enforced throughout
- [ ] **Pending:** Permission matrix audit across all roles
- [ ] **Pending:** PDS export security (signed URLs, permission check)
- [ ] **Pending:** File upload security hardening
- [ ] **Pending:** Full regression test pass

---

## Phase 7: Deployment Readiness 🔴 (Not Started)

**Goal:** Prepare the system for production deployment.

- [ ] Environment variable audit (no secrets in code)
- [ ] Production Supabase project configuration
- [ ] Google OAuth redirect URIs configured for production domain
- [ ] Vercel deployment configuration
- [ ] Database migration apply plan for production
- [ ] Backup and recovery plan
- [ ] Performance audit (query times, page load times)
- [ ] Security audit (OWASP Top 10 review)
- [ ] User acceptance testing with HR staff
- [ ] Training documentation for HR staff

---

## Notes

- Phases are not strictly sequential — some overlap.
- Priority: Phase 3 completion → Phase 4 (export) → Phase 6 security audit → Phase 7.
- Phase 2 legacy migration can proceed in parallel with other phases.
