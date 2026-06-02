import { getReportDefinition } from "@/features/reports/report-catalog";
import type {
  ReportColumn,
  ReportDataset,
  ReportDocument,
  ReportFilters,
  ReportKey,
  ReportSummaryItem,
} from "@/features/reports/types";
import type { AuthorizationContext } from "@/features/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_REPORT_ROWS = 1000;
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

type NamedRelation = { name: string | null } | null;
type PersonName = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
};

type ScopedFilterBuilder<T> = {
  eq(column: string, value: string): T;
  in(column: string, values: string[]): T;
  gte(column: string, value: string): T;
  lte(column: string, value: string): T;
};

type EmployeeRosterRow = PersonName & {
  id: string;
  employee_no: string | null;
  email: string | null;
  campus_id: string;
  office_id: string | null;
  position_title: string | null;
  employment_status: string | null;
  date_hired: string | null;
  campus: NamedRelation;
  office: NamedRelation;
};

type PdsProfileRow = {
  id: string;
  employee_id: string;
  status: string;
  completion_score: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  campus: NamedRelation;
  office: NamedRelation;
  employee:
    | (PersonName & {
        employee_no: string | null;
        position_title: string | null;
      })
    | null;
};

type ServiceRecordRow = {
  employee_id: string;
  is_current: boolean | null;
  date_from: string | null;
  date_to: string | null;
  archived_at: string | null;
};

type EmployeeRequestRow = {
  id: string;
  request_type: string;
  subject: string;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
  campus: NamedRelation;
  office: NamedRelation;
  employee: (PersonName & { employee_no: string | null }) | null;
};

type VacancyRow = {
  id: string;
  title: string;
  plantilla_item_no: string | null;
  employment_type: string | null;
  item_count: number | null;
  status: string;
  posted_at: string | null;
  closing_at: string | null;
  campus: NamedRelation;
  office: NamedRelation;
};

type ApplicationRow = {
  id: string;
  status: string;
  applied_at: string | null;
  updated_at: string | null;
  campus: NamedRelation;
  office: NamedRelation;
  applicant: PersonName | null;
  vacancy: { title: string | null; plantilla_item_no: string | null } | null;
};

type ComplianceEvidenceRow = {
  id: string;
  title: string;
  reporting_period: string;
  due_date: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  campus: NamedRelation;
  office: NamedRelation;
  area: { name: string | null } | null;
  indicator: { code: string | null; title: string | null } | null;
};

type ComplianceActionPlanRow = {
  id: string;
  gap_summary: string;
  corrective_action: string;
  owner_name: string;
  due_date: string;
  status: string;
  evidence: {
    campus_id: string;
    office_id: string | null;
    title: string | null;
    campus: NamedRelation;
    office: NamedRelation;
    area: { name: string | null } | null;
  } | null;
};

const rosterColumns: ReportColumn[] = [
  { key: "employeeNo", header: "Employee No.", width: 16 },
  { key: "name", header: "Name", width: 28 },
  { key: "campus", header: "Campus", width: 22 },
  { key: "office", header: "Office", width: 24 },
  { key: "position", header: "Position", width: 26 },
  { key: "status", header: "Status", width: 14 },
  { key: "dateHired", header: "Date Hired", width: 14 },
  { key: "email", header: "Email", width: 28 },
];

function fullName(person: PersonName | null): string {
  if (!person) return "Unassigned";
  return [
    person.last_name,
    person.suffix,
    person.first_name,
    person.middle_name,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

function ageInDays(from: string | null, to = new Date()): number | null {
  if (!from) return null;
  const started = new Date(from);
  if (Number.isNaN(started.getTime())) return null;
  return Math.max(
    0,
    Math.floor((to.getTime() - started.getTime()) / 86_400_000),
  );
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function summaryFromCounts(
  counts: Record<string, number>,
): ReportSummaryItem[] {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function isGlobalReportsUser(context: AuthorizationContext): boolean {
  return context.isSuperAdmin || context.roles.includes("central_hr_admin");
}

function resolveCampusIds(
  context: AuthorizationContext,
  filters: ReportFilters,
): string[] | null {
  if (isGlobalReportsUser(context)) {
    return filters.campusId ? [filters.campusId] : null;
  }
  if (filters.campusId) {
    return context.campusScopes.includes(filters.campusId)
      ? [filters.campusId]
      : [];
  }
  return context.campusScopes;
}

function applyScopedFilters<T extends ScopedFilterBuilder<T>>(
  query: T,
  context: AuthorizationContext,
  filters: ReportFilters,
): T {
  const campusIds = resolveCampusIds(context, filters);
  let scopedQuery = query;
  if (campusIds) {
    scopedQuery = scopedQuery.in(
      "campus_id",
      campusIds.length > 0 ? campusIds : [EMPTY_UUID],
    );
  }
  if (filters.officeId) {
    scopedQuery = scopedQuery.eq("office_id", filters.officeId);
  }
  return scopedQuery;
}

function applyDateFilters<T extends ScopedFilterBuilder<T>>(
  query: T,
  filters: ReportFilters,
  column: string,
): T {
  let filteredQuery = query;
  if (filters.from) {
    filteredQuery = filteredQuery.gte(column, filters.from);
  }
  if (filters.to) {
    filteredQuery = filteredQuery.lte(column, filters.to);
  }
  return filteredQuery;
}

function scopeLabel(
  context: AuthorizationContext,
  filters: ReportFilters,
): string {
  if (filters.campusId) return "Selected campus";
  if (filters.officeId) return "Selected office";
  if (isGlobalReportsUser(context)) return "All authorized campuses";
  return context.campusScopes.length === 1
    ? "Assigned campus"
    : "Assigned campuses";
}

async function listEmployees(
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<EmployeeRosterRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("employees")
    .select(
      "id, employee_no, first_name, middle_name, last_name, suffix, email, campus_id, office_id, position_title, employment_status, date_hired, campus:campuses(name), office:offices(name)",
    )
    .is("deleted_at", null);
  query = applyScopedFilters(query, context, filters);
  const { data, error } = await query
    .order("last_name", { ascending: true })
    .limit(MAX_REPORT_ROWS);
  if (error) throw new Error(error.message);
  return (data ?? []) as EmployeeRosterRow[];
}

async function buildEmployeeRoster(
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<{ summary: ReportSummaryItem[]; datasets: ReportDataset[] }> {
  const employees = await listEmployees(context, filters);
  const statusCounts = countBy(
    employees.map((row) => row.employment_status ?? "unknown"),
  );
  return {
    summary: [
      { label: "Employees", value: employees.length },
      ...summaryFromCounts(statusCounts),
    ],
    datasets: [
      {
        title: "Employee Roster",
        columns: rosterColumns,
        rows: employees.map((row) => ({
          employeeNo: row.employee_no ?? "-",
          name: fullName(row),
          campus: row.campus?.name ?? "-",
          office: row.office?.name ?? "-",
          position: row.position_title ?? "-",
          status: row.employment_status ?? "-",
          dateHired: formatDate(row.date_hired),
          email: row.email ?? "-",
        })),
      },
    ],
  };
}

async function buildPdsStatus(
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<{ summary: ReportSummaryItem[]; datasets: ReportDataset[] }> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("employee_pds_profiles")
    .select(
      "id, employee_id, status, completion_score, submitted_at, reviewed_at, updated_at, campus:campuses(name), office:offices(name), employee:employees(employee_no, first_name, middle_name, last_name, suffix, position_title)",
    )
    .is("deleted_at", null);
  query = applyScopedFilters(query, context, filters);
  query = applyDateFilters(query, filters, "updated_at");
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(MAX_REPORT_ROWS);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PdsProfileRow[];
  const counts = countBy(rows.map((row) => row.status));
  return {
    summary: [
      { label: "PDS Profiles", value: rows.length },
      ...summaryFromCounts(counts),
    ],
    datasets: [
      {
        title: "PDS Status Queue",
        columns: [
          { key: "employeeNo", header: "Employee No.", width: 16 },
          { key: "name", header: "Name", width: 28 },
          { key: "campus", header: "Campus", width: 22 },
          { key: "office", header: "Office", width: 24 },
          { key: "position", header: "Position", width: 26 },
          { key: "status", header: "PDS Status", width: 20 },
          { key: "completion", header: "Completion", width: 14 },
          { key: "submittedAt", header: "Submitted", width: 14 },
          { key: "reviewedAt", header: "Reviewed", width: 14 },
        ],
        rows: rows.map((row) => ({
          employeeNo: row.employee?.employee_no ?? "-",
          name: fullName(row.employee),
          campus: row.campus?.name ?? "-",
          office: row.office?.name ?? "-",
          position: row.employee?.position_title ?? "-",
          status: row.status,
          completion: `${Number(row.completion_score ?? 0).toFixed(0)}%`,
          submittedAt: formatDate(row.submitted_at),
          reviewedAt: formatDate(row.reviewed_at),
        })),
      },
    ],
  };
}

async function buildServiceRecordCompleteness(
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<{ summary: ReportSummaryItem[]; datasets: ReportDataset[] }> {
  const employees = await listEmployees(context, filters);
  const supabase = await createSupabaseServerClient();
  let serviceQuery = supabase
    .from("employee_service_records")
    .select(
      "employee_id, is_current, date_from, date_to, archived_at, campus_id, office_id",
    )
    .is("deleted_at", null)
    .is("archived_at", null);
  serviceQuery = applyScopedFilters(serviceQuery, context, filters);
  const { data, error } = await serviceQuery.limit(MAX_REPORT_ROWS);
  if (error) throw new Error(error.message);
  const serviceRows = (data ?? []) as ServiceRecordRow[];
  const byEmployee = new Map<string, ServiceRecordRow[]>();
  for (const row of serviceRows) {
    byEmployee.set(row.employee_id, [
      ...(byEmployee.get(row.employee_id) ?? []),
      row,
    ]);
  }
  const reportRows = employees.map((employee) => {
    const records = byEmployee.get(employee.id) ?? [];
    const current = records.find((record) => record.is_current);
    const latest = records
      .slice()
      .sort((left, right) =>
        (right.date_from ?? "").localeCompare(left.date_from ?? ""),
      )[0];
    return {
      employeeNo: employee.employee_no ?? "-",
      name: fullName(employee),
      campus: employee.campus?.name ?? "-",
      office: employee.office?.name ?? "-",
      position: employee.position_title ?? "-",
      serviceRecords: records.length,
      hasCurrentRecord: current ? "Yes" : "No",
      latestFrom: formatDate(latest?.date_from ?? null),
      latestTo: latest?.date_to
        ? formatDate(latest.date_to)
        : current
          ? "Present"
          : "-",
    };
  });
  const missingCurrent = reportRows.filter(
    (row) => row.hasCurrentRecord === "No",
  ).length;
  return {
    summary: [
      { label: "Employees", value: employees.length },
      {
        label: "With current service record",
        value: employees.length - missingCurrent,
      },
      { label: "Needs current service record", value: missingCurrent },
    ],
    datasets: [
      {
        title: "Service Record Completeness",
        columns: [
          { key: "employeeNo", header: "Employee No.", width: 16 },
          { key: "name", header: "Name", width: 28 },
          { key: "campus", header: "Campus", width: 22 },
          { key: "office", header: "Office", width: 24 },
          { key: "position", header: "Position", width: 26 },
          { key: "serviceRecords", header: "Records", width: 10 },
          { key: "hasCurrentRecord", header: "Current Record", width: 16 },
          { key: "latestFrom", header: "Latest From", width: 14 },
          { key: "latestTo", header: "Latest To", width: 14 },
        ],
        rows: reportRows,
      },
    ],
  };
}

async function buildEmployeeRequestsAging(
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<{ summary: ReportSummaryItem[]; datasets: ReportDataset[] }> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("employee_requests")
    .select(
      "id, request_type, subject, status, submitted_at, updated_at, campus:campuses(name), office:offices(name), employee:employees(employee_no, first_name, middle_name, last_name, suffix)",
    )
    .is("deleted_at", null);
  query = applyScopedFilters(query, context, filters);
  query = applyDateFilters(query, filters, "submitted_at");
  const { data, error } = await query
    .order("submitted_at", { ascending: false })
    .limit(MAX_REPORT_ROWS);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as EmployeeRequestRow[];
  const counts = countBy(rows.map((row) => row.status));
  return {
    summary: [
      { label: "Requests", value: rows.length },
      ...summaryFromCounts(counts),
    ],
    datasets: [
      {
        title: "Employee Requests Aging",
        columns: [
          { key: "employeeNo", header: "Employee No.", width: 16 },
          { key: "name", header: "Name", width: 28 },
          { key: "type", header: "Request Type", width: 24 },
          { key: "subject", header: "Subject", width: 32 },
          { key: "status", header: "Status", width: 18 },
          { key: "ageDays", header: "Age (Days)", width: 12 },
          { key: "submittedAt", header: "Submitted", width: 14 },
          { key: "office", header: "Office", width: 24 },
        ],
        rows: rows.map((row) => ({
          employeeNo: row.employee?.employee_no ?? "-",
          name: fullName(row.employee),
          type: row.request_type,
          subject: row.subject,
          status: row.status,
          ageDays: ageInDays(row.submitted_at) ?? "-",
          submittedAt: formatDate(row.submitted_at),
          office: row.office?.name ?? "-",
        })),
      },
    ],
  };
}

async function buildRecruitmentPipeline(
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<{ summary: ReportSummaryItem[]; datasets: ReportDataset[] }> {
  const supabase = await createSupabaseServerClient();
  let vacancyQuery = supabase
    .from("recruitment_vacancies")
    .select(
      "id, title, plantilla_item_no, employment_type, item_count, status, posted_at, closing_at, campus:campuses(name), office:offices(name)",
    )
    .is("deleted_at", null);
  vacancyQuery = applyScopedFilters(vacancyQuery, context, filters);
  vacancyQuery = applyDateFilters(vacancyQuery, filters, "posted_at");
  const { data: vacancyData, error: vacancyError } = await vacancyQuery
    .order("updated_at", { ascending: false })
    .limit(MAX_REPORT_ROWS);
  if (vacancyError) throw new Error(vacancyError.message);

  let applicationQuery = supabase
    .from("recruitment_applications")
    .select(
      "id, status, applied_at, updated_at, campus:campuses(name), office:offices(name), applicant:recruitment_applicants(first_name, middle_name, last_name, suffix), vacancy:recruitment_vacancies(title, plantilla_item_no)",
    )
    .is("deleted_at", null);
  applicationQuery = applyScopedFilters(applicationQuery, context, filters);
  applicationQuery = applyDateFilters(applicationQuery, filters, "applied_at");
  const { data: applicationData, error: applicationError } =
    await applicationQuery
      .order("updated_at", { ascending: false })
      .limit(MAX_REPORT_ROWS);
  if (applicationError) throw new Error(applicationError.message);

  const vacancies = (vacancyData ?? []) as VacancyRow[];
  const applications = (applicationData ?? []) as ApplicationRow[];
  return {
    summary: [
      { label: "Vacancies", value: vacancies.length },
      { label: "Applications", value: applications.length },
      ...summaryFromCounts(countBy(applications.map((row) => row.status))),
    ],
    datasets: [
      {
        title: "Vacancies",
        columns: [
          { key: "title", header: "Vacancy", width: 30 },
          { key: "plantillaItem", header: "Plantilla Item", width: 16 },
          { key: "campus", header: "Campus", width: 22 },
          { key: "office", header: "Office", width: 24 },
          { key: "employmentType", header: "Employment Type", width: 18 },
          { key: "itemCount", header: "Items", width: 10 },
          { key: "status", header: "Status", width: 14 },
          { key: "postedAt", header: "Posted", width: 14 },
          { key: "closingAt", header: "Closing", width: 14 },
        ],
        rows: vacancies.map((row) => ({
          title: row.title,
          plantillaItem: row.plantilla_item_no ?? "-",
          campus: row.campus?.name ?? "-",
          office: row.office?.name ?? "-",
          employmentType: row.employment_type ?? "-",
          itemCount: row.item_count ?? 0,
          status: row.status,
          postedAt: formatDate(row.posted_at),
          closingAt: formatDate(row.closing_at),
        })),
      },
      {
        title: "Applications",
        columns: [
          { key: "applicant", header: "Applicant", width: 28 },
          { key: "vacancy", header: "Vacancy", width: 30 },
          { key: "plantillaItem", header: "Plantilla Item", width: 16 },
          { key: "campus", header: "Campus", width: 22 },
          { key: "office", header: "Office", width: 24 },
          { key: "status", header: "Status", width: 16 },
          { key: "appliedAt", header: "Applied", width: 14 },
        ],
        rows: applications.map((row) => ({
          applicant: fullName(row.applicant),
          vacancy: row.vacancy?.title ?? "-",
          plantillaItem: row.vacancy?.plantilla_item_no ?? "-",
          campus: row.campus?.name ?? "-",
          office: row.office?.name ?? "-",
          status: row.status,
          appliedAt: formatDate(row.applied_at),
        })),
      },
    ],
  };
}

async function buildComplianceStatusGaps(
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<{ summary: ReportSummaryItem[]; datasets: ReportDataset[] }> {
  const supabase = await createSupabaseServerClient();
  let evidenceQuery = supabase
    .from("compliance_evidence")
    .select(
      "id, title, reporting_period, due_date, status, submitted_at, approved_at, campus:campuses(name), office:offices(name), area:compliance_areas(name), indicator:compliance_indicators(code, title)",
    )
    .is("deleted_at", null);
  evidenceQuery = applyScopedFilters(evidenceQuery, context, filters);
  evidenceQuery = applyDateFilters(evidenceQuery, filters, "submitted_at");
  const { data: evidenceData, error: evidenceError } = await evidenceQuery
    .order("updated_at", { ascending: false })
    .limit(MAX_REPORT_ROWS);
  if (evidenceError) throw new Error(evidenceError.message);

  let gapQuery = supabase
    .from("compliance_action_plans")
    .select(
      "id, gap_summary, corrective_action, owner_name, due_date, status, evidence:compliance_evidence(campus_id, office_id, title, campus:campuses(name), office:offices(name), area:compliance_areas(name))",
    );
  gapQuery = applyDateFilters(gapQuery, filters, "due_date");
  const { data: gapData, error: gapError } = await gapQuery
    .order("due_date", { ascending: true })
    .limit(MAX_REPORT_ROWS);
  if (gapError) throw new Error(gapError.message);

  const evidence = (evidenceData ?? []) as ComplianceEvidenceRow[];
  const actionPlans = (gapData ?? []) as ComplianceActionPlanRow[];
  const campusIds = resolveCampusIds(context, filters);
  const scopedGapRows = actionPlans.filter((row) => {
    if (!row.evidence) return false;
    const campusMatches =
      !campusIds || campusIds.includes(row.evidence.campus_id);
    const officeMatches =
      !filters.officeId || row.evidence.office_id === filters.officeId;
    return campusMatches && officeMatches;
  });
  return {
    summary: [
      { label: "Evidence", value: evidence.length },
      { label: "Action Plans", value: scopedGapRows.length },
      ...summaryFromCounts(countBy(evidence.map((row) => row.status))),
    ],
    datasets: [
      {
        title: "Compliance Evidence",
        columns: [
          { key: "title", header: "Evidence", width: 32 },
          { key: "area", header: "Area", width: 22 },
          { key: "indicator", header: "Indicator", width: 28 },
          { key: "campus", header: "Campus", width: 22 },
          { key: "office", header: "Office", width: 24 },
          { key: "period", header: "Period", width: 14 },
          { key: "status", header: "Status", width: 14 },
          { key: "dueDate", header: "Due", width: 14 },
          { key: "submittedAt", header: "Submitted", width: 14 },
        ],
        rows: evidence.map((row) => ({
          title: row.title,
          area: row.area?.name ?? "-",
          indicator:
            [row.indicator?.code, row.indicator?.title]
              .filter(Boolean)
              .join(" - ") || "-",
          campus: row.campus?.name ?? "-",
          office: row.office?.name ?? "-",
          period: row.reporting_period,
          status: row.status,
          dueDate: formatDate(row.due_date),
          submittedAt: formatDate(row.submitted_at),
        })),
      },
      {
        title: "Compliance Action Plans",
        columns: [
          { key: "evidence", header: "Evidence", width: 30 },
          { key: "area", header: "Area", width: 22 },
          { key: "campus", header: "Campus", width: 22 },
          { key: "office", header: "Office", width: 24 },
          { key: "gap", header: "Gap", width: 32 },
          { key: "action", header: "Corrective Action", width: 32 },
          { key: "owner", header: "Owner", width: 20 },
          { key: "status", header: "Status", width: 14 },
          { key: "dueDate", header: "Due", width: 14 },
        ],
        rows: scopedGapRows.map((row) => ({
          evidence: row.evidence?.title ?? "-",
          area: row.evidence?.area?.name ?? "-",
          campus: row.evidence?.campus?.name ?? "-",
          office: row.evidence?.office?.name ?? "-",
          gap: row.gap_summary,
          action: row.corrective_action,
          owner: row.owner_name,
          status: row.status,
          dueDate: formatDate(row.due_date),
        })),
      },
    ],
  };
}

export async function buildCampusOperationsReport(
  reportKey: ReportKey,
  context: AuthorizationContext,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const definition = getReportDefinition(reportKey);
  if (!definition) throw new Error("Unknown report.");

  const content = await (async () => {
    switch (reportKey) {
      case "employee-roster":
        return buildEmployeeRoster(context, filters);
      case "pds-status":
        return buildPdsStatus(context, filters);
      case "service-record-completeness":
        return buildServiceRecordCompleteness(context, filters);
      case "employee-requests-aging":
        return buildEmployeeRequestsAging(context, filters);
      case "recruitment-pipeline":
        return buildRecruitmentPipeline(context, filters);
      case "compliance-status-gaps":
        return buildComplianceStatusGaps(context, filters);
    }
  })();

  return {
    definition,
    filters,
    generatedAt: new Date().toISOString(),
    scopeLabel: scopeLabel(context, filters),
    summary: content.summary,
    datasets: content.datasets,
  };
}
