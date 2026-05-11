import { createSupabaseServerClient } from "@/lib/supabase/server";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import type { EmployeeFormInput } from "@/features/employees/schemas/employee-form.schema";
import { employeeSexValues, type EmployeeSexValue } from "@/features/employees/schemas/employee-form.schema";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  EmployeeCampusOption,
  EmployeeDetail,
  EmployeeDocumentListItem,
  EmployeeListItem,
  EmployeeOfficeOption,
  LinkedAppUserSummary,
} from "@/features/employees/types";

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
    externalRef: row.external_ref,
  };
}

/**
 * Employee visibility is enforced by RLS (`authz_scoped_campus_office_access`). Do not add
 * `applyAuthorizationScope` filters here: AND-ing `office_id IN (...)` would hide rows with a null office.
 */
export async function listEmployees(): Promise<EmployeeListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, employee_no, first_name, middle_name, last_name, suffix, email, campus_id, office_id, employment_status, position_title, campus:campuses(name), office:offices(name)"
    )
    .is("deleted_at", null)
    .order("last_name", { ascending: true });
  if (error) return [];

  const rows = (data ?? []) as EmployeeRow[];
  return rows.map((row) => ({
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
      "id, employee_no, first_name, middle_name, last_name, suffix, birth_date, sex, email, mobile_no, campus_id, office_id, position_title, plantilla_item_no, employment_status, date_hired, civil_status, tin, gsis_no, philhealth_no, pagibig_no, employment_type, date_separated, separation_reason, emergency_contact_name, emergency_contact_phone, present_address, permanent_address, external_ref, campus:campuses(name), office:offices(name)"
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
    external_ref: normalizeNullable(input.externalRef),
  };
}

function isUniqueEmailViolation(message: string): boolean {
  return message.includes("uq_employees_email_normalized_active") || message.includes("duplicate key");
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
      ? isUniqueEmailViolation(error.message)
        ? "An employee with this email already exists."
        : error.message
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
      ? isUniqueEmailViolation(error.message)
        ? "Another employee already uses this email."
        : error.message
      : undefined,
  };
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
