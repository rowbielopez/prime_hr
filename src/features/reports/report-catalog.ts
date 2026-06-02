import type { ReportDefinition, ReportKey } from "@/features/reports/types";

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    key: "employee-roster",
    title: "Employee Roster",
    description:
      "Active employee roster with campus, office, position, and employment status.",
    category: "Campus HR Operations",
  },
  {
    key: "pds-status",
    title: "PDS Status Queue",
    description:
      "PDS completion and review status by employee for HR follow-up.",
    category: "Campus HR Operations",
  },
  {
    key: "service-record-completeness",
    title: "Service Record Completeness",
    description:
      "Employees with or without official service records and current assignments.",
    category: "Campus HR Operations",
  },
  {
    key: "employee-requests-aging",
    title: "Employee Requests Aging",
    description:
      "Submitted HR service and correction requests grouped by workflow status and age.",
    category: "Campus HR Operations",
  },
  {
    key: "recruitment-pipeline",
    title: "Recruitment Pipeline",
    description:
      "Vacancies and applications by status for campus hiring operations.",
    category: "Campus HR Operations",
  },
  {
    key: "compliance-status-gaps",
    title: "Compliance Status & Gaps",
    description: "Compliance evidence status and open corrective action plans.",
    category: "Campus HR Operations",
  },
];

export const REPORT_DEFINITION_BY_KEY = new Map<ReportKey, ReportDefinition>(
  REPORT_DEFINITIONS.map((definition) => [definition.key, definition]),
);

export function getReportDefinition(
  reportKey: string,
): ReportDefinition | null {
  return REPORT_DEFINITION_BY_KEY.get(reportKey as ReportKey) ?? null;
}
