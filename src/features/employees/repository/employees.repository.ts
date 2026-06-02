import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import type { EmployeeFormInput } from "@/features/employees/schemas/employee-form.schema";
import { employeeSexValues, type EmployeeSexValue } from "@/features/employees/schemas/employee-form.schema";
import type { AuthorizationContext } from "@/features/auth/types";
import type { PossibleDuplicateEmployee } from "@/features/employees/types";
import type {
  EmployeeCampusOption,
  EmployeeDetail,
  EmployeeDocumentListItem,
  EmployeeProfileDocumentSummary,
  EmployeeProfileHubSummary,
  EmployeeProfileIssue,
  EmployeeProfilePdsSummary,
  EmployeeProfileRecruitmentSummary,
  EmployeeProfileServiceRecordSummary,
  EmployeeListItem,
  EmployeeOfficeOption,
  LinkedAppUserSummary,
} from "@/features/employees/types";
import type { ServiceRecordEmployeeDetail } from "@/features/service-records/types";

type EmployeeRow = {
  id: string;
  employee_no: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  birth_date: string | null;
  sex: string | null;
  email: string | null;
  mobile_no: string | null;
  campus_id: string;
  office_id: string | null;
  position_title: string | null;
  plantilla_item_no: string | null;
  employment_status: "active" | "on_leave" | "separated" | "retired";
  date_hired: string | null;
  civil_status: string | null;
  tin: string | null;
  gsis_no: string | null;
  philhealth_no: string | null;
  pagibig_no: string | null;
  employment_type: string | null;
  date_separated: string | null;
  separation_reason: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  present_address: string | null;
  permanent_address: string | null;
  cabinet_no: string | null;
  external_ref: string | null;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
};

const sexSet = new Set<string>(employeeSexValues);

function coerceSex(raw: string | null): EmployeeSexValue | null {
  if (!raw) return null;
  return sexSet.has(raw) ? (raw as EmployeeSexValue) : null;
}

function displayName(input: {
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
}) {
  return [input.firstName, input.middleName, input.lastName, input.suffix].filter(Boolean).join(" ");
}

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

const REQUIRED_EMPLOYEE_DOCUMENTS = [
  { key: "pds", label: "Personal Data Sheet" },
  { key: "appointment", label: "Appointment Paper" },
  { key: "oath", label: "Oath of Office" },
  { key: "assumption", label: "Assumption to Duty" },
  { key: "service_record", label: "Service Record" },
  { key: "eligibility", label: "Eligibility / PRC License" },
  { key: "tor", label: "Transcript of Records" },
  { key: "government_id", label: "Government ID" },
] as const;

function normalizeDocumentToken(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function documentStatusRank(status: string) {
  const normalized = normalizeDocumentToken(status);
  if (normalized.includes("verified") || normalized.includes("approved")) return 4;
  if (normalized.includes("reject") || normalized.includes("replace")) return 1;
  if (normalized.includes("pending") || normalized.includes("review") || normalized.includes("submitted")) return 2;
  return 3;
}

function toRequiredDocumentStatus(status: string | null): EmployeeProfileDocumentSummary["requiredDocuments"][number]["status"] {
  if (!status) return "missing";
  const normalized = normalizeDocumentToken(status);
  if (normalized.includes("verified") || normalized.includes("approved")) return "verified";
  if (normalized.includes("reject") || normalized.includes("replace")) return "rejected";
  if (normalized.includes("pending") || normalized.includes("review") || normalized.includes("submitted")) return "pending_review";
  return "uploaded";
}

function documentMatchesRequiredType(documentType: string, requiredKey: string) {
  const normalizedType = normalizeDocumentToken(documentType);
  if (requiredKey === "pds") return normalizedType.includes("pds") || normalizedType.includes("personal_data_sheet");
  if (requiredKey === "appointment") return normalizedType.includes("appointment");
  if (requiredKey === "oath") return normalizedType.includes("oath");
  if (requiredKey === "assumption") return normalizedType.includes("assumption");
  if (requiredKey === "service_record") return normalizedType.includes("service_record");
  if (requiredKey === "eligibility") return normalizedType.includes("eligibility") || normalizedType.includes("prc") || normalizedType.includes("license");
  if (requiredKey === "tor") return normalizedType.includes("tor") || normalizedType.includes("transcript");
  if (requiredKey === "government_id") return normalizedType.includes("government") || normalizedType.includes("id");
  return normalizedType.includes(requiredKey);
}

function hasValue(input: string | null | undefined) {
  return Boolean(input?.trim());
}

function buildCompletion(input: {
  employee: EmployeeDetail;
  linkedAppUser: LinkedAppUserSummary | null;
  pds: EmployeeProfilePdsSummary;
  documents: EmployeeProfileDocumentSummary;
  serviceRecord: EmployeeProfileServiceRecordSummary;
}) {
  const { employee, linkedAppUser, pds, documents, serviceRecord } = input;
  const checks = [
    { label: "Employee number", complete: hasValue(employee.employeeNo) },
    { label: "Complete name", complete: hasValue(employee.firstName) && hasValue(employee.lastName) },
    { label: "Birth date", complete: hasValue(employee.birthDate) },
    { label: "Sex", complete: employee.sex !== null },
    { label: "Civil status", complete: hasValue(employee.civilStatus) },
    { label: "Email", complete: hasValue(employee.email) },
    { label: "Mobile number", complete: hasValue(employee.mobileNo) },
    { label: "Present address", complete: hasValue(employee.presentAddress) },
    { label: "Permanent address", complete: hasValue(employee.permanentAddress) },
    { label: "Emergency contact", complete: hasValue(employee.emergencyContactName) && hasValue(employee.emergencyContactPhone) },
    { label: "Campus assignment", complete: hasValue(employee.campusName) && employee.campusName !== "Unknown" },
    { label: "Position title", complete: hasValue(employee.positionTitle) },
    { label: "Employment type", complete: hasValue(employee.employmentType) },
    { label: "Date hired", complete: hasValue(employee.dateHired) },
    { label: "Government IDs", complete: hasValue(employee.tin) || hasValue(employee.gsisNo) || hasValue(employee.philhealthNo) || hasValue(employee.pagibigNo) },
    { label: "PDS profile", complete: pds.status !== null },
    { label: "Service record", complete: serviceRecord.entriesCount > 0 },
    { label: "Required documents", complete: documents.missingCount === 0 },
    { label: "Linked sign-in account", complete: linkedAppUser !== null },
  ];
  const completedItems = checks.filter((check) => check.complete).length;
  return {
    percentage: Math.round((completedItems / checks.length) * 100),
    completedItems,
    totalItems: checks.length,
    missingItems: checks.filter((check) => !check.complete).map((check) => check.label),
  };
}

function buildProfileIssues(input: {
  employee: EmployeeDetail;
  linkedAppUser: LinkedAppUserSummary | null;
  pds: EmployeeProfilePdsSummary;
  documents: EmployeeProfileDocumentSummary;
  serviceRecord: EmployeeProfileServiceRecordSummary;
}): EmployeeProfileIssue[] {
  const { employee, linkedAppUser, pds, documents, serviceRecord } = input;
  const issues: EmployeeProfileIssue[] = [];

  if (!hasValue(employee.email)) {
    issues.push({ key: "missing-email", label: "Missing employee email", description: "Add an email so account matching and HR communications work correctly.", severity: "warning" });
  }
  if (!linkedAppUser) {
    issues.push({ key: "account-unlinked", label: "No linked sign-in account", description: "The employee cannot use employee self-service until a system account is linked.", severity: "warning" });
  }
  if (linkedAppUser && employee.email && linkedAppUser.email.toLowerCase() !== employee.email.toLowerCase()) {
    issues.push({ key: "email-mismatch", label: "Employee email differs from login email", description: "Review the employee email and linked sign-in account before updating login-related fields.", severity: "warning" });
  }
  if (!pds.status) {
    issues.push({ key: "pds-missing", label: "No PDS profile yet", description: "Open the PDS workspace to create and complete the employee Personal Data Sheet.", severity: "warning" });
  } else if (pds.status === "returned_for_correction") {
    issues.push({ key: "pds-returned", label: "PDS returned for correction", description: pds.returnReason ?? "The PDS needs employee or HR correction before it can be verified.", severity: "warning" });
  }
  if (serviceRecord.entriesCount === 0) {
    issues.push({ key: "service-record-missing", label: "No service record entries", description: "Add the employee's official service history before printing or certifying records.", severity: "critical" });
  } else if (!serviceRecord.hasCurrentRecord && employee.employmentStatus === "active") {
    issues.push({ key: "service-record-no-current", label: "No current service record", description: "Active employees should have one current official service entry.", severity: "warning" });
  }
  if (serviceRecord.warningsCount > 0) {
    issues.push({ key: "service-record-warnings", label: "Service record needs review", description: `${serviceRecord.warningsCount} service record warning${serviceRecord.warningsCount === 1 ? "" : "s"} found.`, severity: "warning" });
  }
  if (employee.employmentStatus === "active" && employee.dateSeparated) {
    issues.push({ key: "active-with-separated-date", label: "Active status has a separation date", description: "Review employment status or clear the separation date.", severity: "critical" });
  }
  if ((employee.employmentStatus === "separated" || employee.employmentStatus === "retired") && !employee.dateSeparated) {
    issues.push({ key: "separated-without-date", label: "Missing separation date", description: "Separated or retired employees should have a date separated.", severity: "warning" });
  }
  if (documents.missingCount > 0) {
    issues.push({ key: "documents-missing", label: "Required documents missing", description: `${documents.missingCount} expected document${documents.missingCount === 1 ? " is" : "s are"} not on file yet.`, severity: "info" });
  }

  return issues;
}

function mapRowToDetail(row: EmployeeRow): EmployeeDetail {
  return {
    id: row.id,
    employeeNo: row.employee_no,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    suffix: row.suffix,
    birthDate: row.birth_date,
    sex: coerceSex(row.sex),
    email: row.email,
    mobileNo: row.mobile_no,
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    officeId: row.office_id,
    officeName: resolveName(row.office),
    positionTitle: row.position_title,
    plantillaItemNo: row.plantilla_item_no,
    employmentStatus: row.employment_status,
    dateHired: row.date_hired,
    civilStatus: row.civil_status,
    tin: row.tin,
    gsisNo: row.gsis_no,
    philhealthNo: row.philhealth_no,
    pagibigNo: row.pagibig_no,
    employmentType: row.employment_type,
    dateSeparated: row.date_separated,
    separationReason: row.separation_reason,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    presentAddress: row.present_address,
    permanentAddress: row.permanent_address,
    cabinetNo: row.cabinet_no,
    externalRef: row.external_ref,
  };
}

/**
 * Employee visibility is enforced by RLS (`authz_scoped_campus_office_access`). Do not add
 * `applyAuthorizationScope` filters here: AND-ing `office_id IN (...)` would hide rows with a null office.
 */
export async function listEmployees(): Promise<EmployeeListItem[]> {
  const supabase = await createSupabaseServerClient();
  // Supabase hosted PostgREST enforces a hard max_rows=1000 cap regardless of
  // the client-specified limit. Paginate in 1000-row pages to fetch all records.
  const PAGE_SIZE = 1000;
  const COLS = "id, employee_no, first_name, middle_name, last_name, suffix, email, campus_id, office_id, employment_status, position_title, campus:campuses(name), office:offices(name)";
  const allRows: EmployeeRow[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("employees")
      .select(COLS)
      .is("deleted_at", null)
      .order("last_name", { ascending: true })
      .range(from, to);
    if (error || !data || data.length === 0) break;
    allRows.push(...(data as EmployeeRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return allRows.map((row) => ({
    id: row.id,
    employeeNo: row.employee_no,
    fullName: displayName({
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      suffix: row.suffix,
    }),
    email: row.email,
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    officeId: row.office_id,
    officeName: resolveName(row.office),
    employmentStatus: row.employment_status,
    positionTitle: row.position_title,
  }));
}

export async function getEmployeeById(employeeId: string): Promise<EmployeeDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, employee_no, first_name, middle_name, last_name, suffix, birth_date, sex, email, mobile_no, campus_id, office_id, position_title, plantilla_item_no, employment_status, date_hired, civil_status, tin, gsis_no, philhealth_no, pagibig_no, employment_type, date_separated, separation_reason, emergency_contact_name, emergency_contact_phone, present_address, permanent_address, cabinet_no, external_ref, campus:campuses(name), office:offices(name)"
    )
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;

  return mapRowToDetail(data as EmployeeRow);
}

export async function getLinkedAppUserForEmployee(employeeId: string): Promise<LinkedAppUserSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, email, status, is_active")
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; email: string; status: LinkedAppUserSummary["status"]; is_active: boolean };
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    isActive: row.is_active,
  };
}

export async function listEmployeeDocumentsForEmployee(employeeId: string): Promise<EmployeeDocumentListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employee_documents")
    .select("id, title, document_type, file_name, status, created_at")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    title: string;
    document_type: string;
    file_name: string;
    status: string;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    fileName: row.file_name,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function buildEmployeeDocumentSummary(documents: EmployeeDocumentListItem[]): EmployeeProfileDocumentSummary {
  const requiredDocuments = REQUIRED_EMPLOYEE_DOCUMENTS.map((required) => {
    const matches = documents
      .filter((document) => documentMatchesRequiredType(document.documentType, required.key))
      .sort((left, right) => documentStatusRank(right.status) - documentStatusRank(left.status));
    return {
      key: required.key,
      label: required.label,
      status: toRequiredDocumentStatus(matches[0]?.status ?? null),
    };
  });
  return {
    totalUploaded: documents.length,
    verifiedCount: documents.filter((document) => toRequiredDocumentStatus(document.status) === "verified").length,
    pendingCount: documents.filter((document) => toRequiredDocumentStatus(document.status) === "pending_review").length,
    rejectedCount: documents.filter((document) => toRequiredDocumentStatus(document.status) === "rejected").length,
    missingCount: requiredDocuments.filter((document) => document.status === "missing").length,
    lastUploadedAt: documents[0]?.createdAt ?? null,
    requiredDocuments,
  };
}

export async function getEmployeePdsSummary(employeeId: string): Promise<EmployeeProfilePdsSummary> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employee_pds_profiles")
    .select("status, completion_score, updated_at, submitted_at, reviewed_at, verified_at, returned_at, return_reason")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) {
    return { status: null, completionScore: null, updatedAt: null, submittedAt: null, reviewedAt: null, verifiedAt: null, returnedAt: null, returnReason: null };
  }
  const row = data as {
    status: string;
    completion_score: number | string | null;
    updated_at: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    verified_at: string | null;
    returned_at: string | null;
    return_reason: string | null;
  };
  return {
    status: row.status,
    completionScore: row.completion_score === null ? null : Number(row.completion_score),
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    verifiedAt: row.verified_at,
    returnedAt: row.returned_at,
    returnReason: row.return_reason,
  };
}

export async function getEmployeeRecruitmentSummary(employeeId: string): Promise<EmployeeProfileRecruitmentSummary> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_applicants")
    .select("id, first_name, middle_name, last_name, suffix, status, updated_at")
    .eq("converted_employee_id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    status: string;
    updated_at: string;
  };
  return {
    applicantId: row.id,
    applicantName: [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(" "),
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export function buildEmployeeServiceRecordSummary(detail: ServiceRecordEmployeeDetail | null): EmployeeProfileServiceRecordSummary {
  if (!detail) {
    return { entriesCount: 0, hasCurrentRecord: false, needsReview: true, currentPosition: null, currentDateFrom: null, currentDateTo: null, latestServiceDate: null, lastUpdated: null, warningsCount: 0 };
  }
  const latest = [...detail.entries].sort((left, right) => right.dateFrom.localeCompare(left.dateFrom))[0] ?? null;
  return {
    entriesCount: detail.entries.filter((entry) => !entry.archivedAt).length,
    hasCurrentRecord: detail.currentEntry !== null,
    needsReview: detail.warnings.length > 0 || detail.entries.length === 0,
    currentPosition: detail.currentEntry?.positionTitle ?? null,
    currentDateFrom: detail.currentEntry?.dateFrom ?? null,
    currentDateTo: detail.currentEntry?.dateTo ?? null,
    latestServiceDate: latest?.dateFrom ?? null,
    lastUpdated: detail.entries.reduce<string | null>((latestUpdate, entry) => {
      if (!latestUpdate || entry.updatedAt > latestUpdate) return entry.updatedAt;
      return latestUpdate;
    }, null),
    warningsCount: detail.warnings.length,
  };
}

export function buildEmployeeProfileHubSummary(input: {
  employee: EmployeeDetail;
  linkedAppUser: LinkedAppUserSummary | null;
  documents: EmployeeDocumentListItem[];
  pds: EmployeeProfilePdsSummary;
  serviceRecordDetail: ServiceRecordEmployeeDetail | null;
  recruitment: EmployeeProfileRecruitmentSummary;
}): EmployeeProfileHubSummary {
  const documents = buildEmployeeDocumentSummary(input.documents);
  const serviceRecord = buildEmployeeServiceRecordSummary(input.serviceRecordDetail);
  const completion = buildCompletion({ employee: input.employee, linkedAppUser: input.linkedAppUser, pds: input.pds, documents, serviceRecord });
  const issues = buildProfileIssues({ employee: input.employee, linkedAppUser: input.linkedAppUser, pds: input.pds, documents, serviceRecord });
  return {
    completion,
    issues,
    pds: input.pds,
    documents,
    serviceRecord,
    recruitment: input.recruitment,
  };
}

export async function getEmployeeScopeById(employeeId: string): Promise<{ campusId: string; officeId: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("campus_id, office_id")
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { campus_id: string; office_id: string | null };
  return { campusId: row.campus_id, officeId: row.office_id };
}

function normalizeNullable(input?: string | null) {
  if (!input) return null;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildEmployeeWritePayload(input: EmployeeFormInput) {
  return {
    employee_no: input.employeeNo.trim(),
    first_name: input.firstName.trim(),
    middle_name: normalizeNullable(input.middleName),
    last_name: input.lastName.trim(),
    suffix: normalizeNullable(input.suffix),
    birth_date: normalizeNullable(input.birthDate),
    sex: input.sex ?? null,
    email: (() => {
      const e = normalizeNullable(input.email);
      return e ? e.toLowerCase() : null;
    })(),
    mobile_no: normalizeNullable(input.mobileNo),
    campus_id: input.campusId,
    office_id: normalizeNullable(input.officeId),
    position_title: normalizeNullable(input.positionTitle),
    plantilla_item_no: normalizeNullable(input.plantillaItemNo),
    employment_status: input.employmentStatus,
    date_hired: normalizeNullable(input.dateHired),
    civil_status: normalizeNullable(input.civilStatus),
    tin: normalizeNullable(input.tin),
    gsis_no: normalizeNullable(input.gsisNo),
    philhealth_no: normalizeNullable(input.philhealthNo),
    pagibig_no: normalizeNullable(input.pagibigNo),
    employment_type: normalizeNullable(input.employmentType),
    date_separated: normalizeNullable(input.dateSeparated),
    separation_reason: normalizeNullable(input.separationReason),
    emergency_contact_name: normalizeNullable(input.emergencyContactName),
    emergency_contact_phone: normalizeNullable(input.emergencyContactPhone),
    present_address: normalizeNullable(input.presentAddress),
    permanent_address: normalizeNullable(input.permanentAddress),
    cabinet_no: normalizeNullable(input.cabinetNo),
    external_ref: normalizeNullable(input.externalRef),
  };
}

function classifyUniqueViolation(message: string): "email" | "employee_no" | "other_duplicate" | null {
  if (message.includes("uq_employees_email_normalized_active")) return "email";
  // Postgres auto-names the unique column constraint from 0002_foundation_tables.sql
  if (message.includes("employees_employee_no_key")) return "employee_no";
  // Fallback: any other duplicate key error
  if (message.includes("duplicate key")) return "other_duplicate";
  return null;
}

export async function createEmployee(input: EmployeeFormInput, actorAppUserId: string | null) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    ...buildEmployeeWritePayload(input),
    created_by_user_id: actorAppUserId,
    updated_by_user_id: actorAppUserId,
  };
  const { data, error } = await supabase.from("employees").insert(payload as never).select("id").single();

  return {
    ok: !error,
    error: error
      ? (() => {
        const kind = classifyUniqueViolation(error.message);
        if (kind === "employee_no")
          return `Employee number "${input.employeeNo.trim()}" is already in use. The record may belong to a campus outside your access. Contact your System Administrator.`;
        if (kind === "email")
          return "An employee with this email already exists.";
        if (kind === "other_duplicate")
          return "A duplicate record was detected. Check employee number, email, or contact details.";
        return "We could not create the employee record. Please review the details and try again.";
      })()
      : undefined,
    employeeId: (data as { id: string } | null)?.id ?? null,
  };
}

export async function updateEmployee(employeeId: string, input: EmployeeFormInput, actorAppUserId: string | null) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    ...buildEmployeeWritePayload(input),
    updated_by_user_id: actorAppUserId,
  };
  const { error } = await supabase.from("employees").update(payload as never).eq("id", employeeId);
  return {
    ok: !error,
    error: error
      ? (() => {
        const kind = classifyUniqueViolation(error.message);
        if (kind === "employee_no")
          return `Employee number "${input.employeeNo.trim()}" is already in use by another record.`;
        if (kind === "email")
          return "This email is already used by another active employee.";
        if (kind === "other_duplicate")
          return "A duplicate record was detected. Check employee number, email, or contact details.";
        return "We could not update the employee record. Please review the details and try again.";
      })()
      : undefined,
  };
}

export async function findPossibleDuplicates(input: {
  employeeNo: string;
  email: string | null | undefined;
  firstName: string;
  lastName: string;
  birthDate: string | null | undefined;
  mobileNo: string | null | undefined;
}): Promise<PossibleDuplicateEmployee[]> {
  const supabase = await createSupabaseServerClient();
  // employee_no is globally unique — check it with the admin client so RLS
  // doesn't hide conflicts from other campuses.
  const admin = createSupabaseAdminClient();

  const trimmedNo = input.employeeNo.trim();
  const trimmedEmail = input.email?.trim().toLowerCase();
  const trimmedMobile = input.mobileNo?.trim();

  type DupRow = {
    id: string;
    employee_no: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    birth_date: string | null;
    email: string | null;
    mobile_no: string | null;
    campus: { name: string } | Array<{ name: string }> | null;
    office: { name: string } | Array<{ name: string }> | null;
  };

  const resultMap = new Map<string, DupRow & { reasons: string[] }>();

  // 1. Check employee_no globally (bypasses RLS so cross-campus conflicts surface)
  if (trimmedNo.length >= 2) {
    const { data } = await admin
      .from("employees")
      .select("id, employee_no, first_name, middle_name, last_name, suffix, birth_date, email, mobile_no, campus:campuses(name), office:offices(name)")
      .ilike("employee_no", trimmedNo)
      .is("deleted_at", null)
      .limit(5);
    for (const row of (data ?? []) as DupRow[]) {
      const entry = resultMap.get(row.id) ?? { ...row, reasons: [] };
      entry.reasons.push("same employee number");
      resultMap.set(row.id, entry);
    }
  }

  // 2. Check email and mobile via RLS-scoped client (user's visible scope)
  const orParts: string[] = [];
  if (trimmedEmail) orParts.push(`email.ilike.${trimmedEmail}`);
  if (trimmedMobile && trimmedMobile.length >= 7) orParts.push(`mobile_no.eq.${trimmedMobile}`);

  if (orParts.length > 0) {
    const { data } = await supabase
      .from("employees")
      .select("id, employee_no, first_name, middle_name, last_name, suffix, birth_date, email, mobile_no, campus:campuses(name), office:offices(name)")
      .or(orParts.join(","))
      .is("deleted_at", null)
      .limit(5);
    for (const row of (data ?? []) as DupRow[]) {
      const entry = resultMap.get(row.id) ?? { ...row, reasons: [] };
      if (trimmedEmail && row.email?.toLowerCase() === trimmedEmail) entry.reasons.push("same email");
      if (trimmedMobile && row.mobile_no === trimmedMobile) entry.reasons.push("same mobile number");
      resultMap.set(row.id, entry);
    }
  }

  return Array.from(resultMap.values()).map((row) => ({
    id: row.id,
    employeeNo: row.employee_no,
    fullName: displayName({ firstName: row.first_name, middleName: row.middle_name, lastName: row.last_name, suffix: row.suffix }),
    campusName: resolveName(row.campus) ?? "Unknown",
    officeName: resolveName(row.office),
    matchReason: row.reasons.length > 0 ? row.reasons.join(", ") : "name or contact match",
  }));
}

export async function archiveEmployee(employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ employment_status: "separated" } as never)
    .eq("id", employeeId)
    .is("deleted_at", null);
  return { ok: !error, error: error?.message };
}

export async function softDeleteEmployee(employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", employeeId)
    .is("deleted_at", null);
  return { ok: !error, error: error?.message };
}

export async function listEmployeeCampusOptions(context?: AuthorizationContext): Promise<EmployeeCampusOption[]> {
  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from("campuses")
    .select("id, code, name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  const scopedQuery =
    context && !context.isSuperAdmin && context.campusScopes.length > 0 ? query.in("id", context.campusScopes) : query;
  const { data, error } = await scopedQuery;
  if (error) return [];
  return (data ?? []) as EmployeeCampusOption[];
}

export async function listEmployeeOfficeOptions(context?: AuthorizationContext): Promise<EmployeeOfficeOption[]> {
  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from("offices")
    .select("id, campus_id, code, name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  let scopedQuery = query;
  if (context && !context.isSuperAdmin) {
    if (context.campusScopes.length > 0) {
      scopedQuery = scopedQuery.in("campus_id", context.campusScopes);
    }
    if (context.officeScopes.length > 0) {
      scopedQuery = scopedQuery.in("id", context.officeScopes);
    }
  }
  const { data, error } = await scopedQuery;
  if (error) return [];
  return ((data ?? []) as Array<{ id: string; campus_id: string; code: string; name: string }>).map((row) => ({
    id: row.id,
    campusId: row.campus_id,
    code: row.code,
    name: row.name,
  }));
}

export async function validateOfficeCampusScope(input: { officeId: string; campusId: string }): Promise<boolean> {
  return officeBelongsToCampus(input);
}
