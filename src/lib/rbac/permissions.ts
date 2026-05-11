import type { AppRole } from "@/lib/constants/roles";

export type AppPermission =
  | "dashboard.read"
  | "admin.users.read"
  | "admin.users.write"
  | "admin.organization.read"
  | "admin.organization.write"
  | "recruitment.vacancies.read"
  | "recruitment.vacancies.write"
  | "recruitment.applicants.read"
  | "recruitment.applicants.write"
  | "recruitment.recommendations.read"
  | "recruitment.recommendations.write"
  | "compliance.evidence.read"
  | "compliance.evidence.write"
  | "compliance.review.write"
  | "compliance.indicators.write"
  | "compliance.dashboard.read"
  | "audit.logs.read"
  | "employee.records.read"
  | "employee.records.write"
  | "learning.read"
  | "learning.write"
  | "learning.access"
  | "learning.reports.read"
  | "learning.competencies.read"
  | "learning.competencies.write"
  | "learning.competencies.assess.read"
  | "learning.competencies.assess.write"
  | "performance.read"
  | "performance.write"
  | "performance.review"
  | "performance.finalize"
  | "performance.dashboard.read"
  | "rewards.read"
  | "rewards.catalog.read"
  | "rewards.catalog.write"
  | "rewards.nomination.create"
  | "rewards.nomination.read"
  | "rewards.nomination.review"
  | "rewards.nomination.approve"
  | "rewards.history.read"
  | "rewards.reports.read";

const rolePermissionsMap: Record<AppRole, AppPermission[]> = {
  super_admin: [
    "dashboard.read",
    "admin.users.read",
    "admin.users.write",
    "admin.organization.read",
    "admin.organization.write",
    "recruitment.vacancies.read",
    "recruitment.vacancies.write",
    "recruitment.applicants.read",
    "recruitment.applicants.write",
    "recruitment.recommendations.read",
    "recruitment.recommendations.write",
    "compliance.evidence.read",
    "compliance.evidence.write",
    "compliance.review.write",
    "compliance.indicators.write",
    "compliance.dashboard.read",
    "audit.logs.read",
    "employee.records.read",
    "employee.records.write",
    "learning.read",
    "learning.write",
    "learning.access",
    "learning.reports.read",
    "learning.competencies.read",
    "learning.competencies.write",
    "learning.competencies.assess.read",
    "learning.competencies.assess.write",
    "performance.read",
    "performance.write",
    "performance.review",
    "performance.finalize",
    "performance.dashboard.read",
    "rewards.read",
    "rewards.catalog.read",
    "rewards.catalog.write",
    "rewards.nomination.create",
    "rewards.nomination.read",
    "rewards.nomination.review",
    "rewards.nomination.approve",
    "rewards.history.read",
    "rewards.reports.read",
  ],
  central_hr_admin: [
    "dashboard.read",
    "admin.users.read",
    "admin.users.write",
    "admin.organization.read",
    "recruitment.vacancies.read",
    "recruitment.vacancies.write",
    "recruitment.applicants.read",
    "recruitment.applicants.write",
    "recruitment.recommendations.read",
    "recruitment.recommendations.write",
    "compliance.evidence.read",
    "compliance.evidence.write",
    "compliance.review.write",
    "compliance.indicators.write",
    "compliance.dashboard.read",
    "audit.logs.read",
    "employee.records.read",
    "employee.records.write",
    "learning.read",
    "learning.write",
    "learning.access",
    "learning.reports.read",
    "learning.competencies.read",
    "learning.competencies.write",
    "learning.competencies.assess.read",
    "learning.competencies.assess.write",
    "performance.read",
    "performance.write",
    "performance.review",
    "performance.finalize",
    "performance.dashboard.read",
    "rewards.read",
    "rewards.catalog.read",
    "rewards.catalog.write",
    "rewards.nomination.create",
    "rewards.nomination.read",
    "rewards.nomination.review",
    "rewards.nomination.approve",
    "rewards.history.read",
    "rewards.reports.read",
  ],
  campus_hr_officer: [
    "dashboard.read",
    "recruitment.vacancies.read",
    "recruitment.vacancies.write",
    "recruitment.applicants.read",
    "recruitment.applicants.write",
    "recruitment.recommendations.read",
    "recruitment.recommendations.write",
    "compliance.evidence.read",
    "compliance.evidence.write",
    "compliance.dashboard.read",
    "employee.records.read",
    "employee.records.write",
    "learning.read",
    "learning.write",
    "learning.access",
    "learning.reports.read",
    "learning.competencies.read",
    "learning.competencies.write",
    "learning.competencies.assess.read",
    "learning.competencies.assess.write",
    "performance.read",
    "performance.write",
    "performance.review",
    "performance.finalize",
    "performance.dashboard.read",
    "rewards.read",
    "rewards.catalog.read",
    "rewards.catalog.write",
    "rewards.nomination.create",
    "rewards.nomination.read",
    "rewards.nomination.review",
    "rewards.nomination.approve",
    "rewards.history.read",
    "rewards.reports.read",
  ],
  office_unit_head: [
    "dashboard.read",
    "recruitment.vacancies.read",
    "recruitment.applicants.read",
    "recruitment.recommendations.read",
    "compliance.evidence.read",
    "compliance.evidence.write",
    "compliance.dashboard.read",
    "employee.records.read",
    "learning.read",
    "learning.access",
    "learning.reports.read",
    "learning.competencies.read",
    "learning.competencies.assess.read",
    "performance.read",
    "performance.review",
    "performance.dashboard.read",
    "rewards.read",
    "rewards.catalog.read",
    "rewards.nomination.read",
    "rewards.nomination.review",
    "rewards.history.read",
  ],
  committee_member: [
    "dashboard.read",
    "compliance.evidence.read",
    "compliance.review.write",
    "compliance.dashboard.read",
    "learning.read",
    "learning.access",
    "learning.competencies.read",
    "learning.competencies.assess.read",
    "performance.read",
    "rewards.read",
    "rewards.nomination.read",
    "rewards.nomination.review",
    "rewards.history.read",
  ],
  employee: [
    "dashboard.read",
    "compliance.evidence.read",
    "compliance.dashboard.read",
    "employee.records.read",
    "learning.access",
    "learning.competencies.assess.read",
    "performance.read",
    "performance.write",
    "rewards.read",
    "rewards.nomination.create",
    "rewards.nomination.read",
    "rewards.history.read",
  ],
};

export function can(role: AppRole, permission: AppPermission): boolean {
  return rolePermissionsMap[role].includes(permission);
}

export function resolvePermissions(roles: AppRole[]): AppPermission[] {
  return [...new Set(roles.flatMap((role) => rolePermissionsMap[role]))];
}

