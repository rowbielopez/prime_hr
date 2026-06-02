import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { ApplicantFormInput } from "@/features/recruitment/applicants/schemas/applicant-form.schema";
import type { ApplicationCreateInput } from "@/features/recruitment/applicants/schemas/application-form.schema";
import type {
  InterviewRecordInput,
  ScreeningResultInput,
} from "@/features/recruitment/applicants/schemas/screening-and-interview.schema";
import type {
  ApplicantDetail,
  ApplicantListItem,
  ApplicantStatus,
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusHistoryItem,
  DuplicateApplicantMatch,
  InterviewRecord,
  ScreeningResult,
} from "@/features/recruitment/applicants/types";

type ApplicantRow = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string | null;
  mobile_no: string | null;
  campus_id: string;
  office_id: string | null;
  status: ApplicantListItem["status"];
  notes: string | null;
  source: string | null;
  converted_employee_id: string | null;
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function fullName(input: {
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
}) {
  return [input.firstName, input.middleName, input.lastName, input.suffix]
    .filter(Boolean)
    .join(" ");
}

function normalizeNullable(input?: string | null) {
  if (!input) return null;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildApplicantPayload(input: ApplicantFormInput) {
  return {
    first_name: input.firstName.trim(),
    middle_name: normalizeNullable(input.middleName),
    last_name: input.lastName.trim(),
    suffix: normalizeNullable(input.suffix),
    email: normalizeNullable(input.email),
    mobile_no: normalizeNullable(input.mobileNo),
    campus_id: input.campusId,
    office_id: normalizeNullable(input.officeId),
    status: input.status,
    notes: normalizeNullable(input.notes),
  };
}

type AppVacancyShape = {
  title: string;
  plantilla_item_no: string | null;
  employment_type: string | null;
};
type AppRow = {
  id: string;
  applicant_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  updated_at: string;
  vacancy: AppVacancyShape | AppVacancyShape[] | null;
};
type AppEntry = {
  id: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  vacancyTitle: string | null;
  plantillaItemNo: string | null;
  employmentType: string | null;
  count: number;
};

export async function listApplicants(
  context?: AuthorizationContext,
): Promise<ApplicantListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applicants")
    .select(
      "id, first_name, middle_name, last_name, suffix, email, mobile_no, campus_id, office_id, status, source, converted_employee_id, updated_at, campus:campuses(name), office:offices(name)",
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  const rows = (data ?? []) as ApplicantRow[];

  // Fetch all applications with vacancy enrichment in a single query
  const appsQuery = supabase
    .from("recruitment_applications")
    .select(
      "id, applicant_id, status, applied_at, updated_at, vacancy:recruitment_vacancies(title, plantilla_item_no, employment_type)",
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data: appsData } = await applyAuthorizationScope(appsQuery, context);

  // Build per-applicant map: first entry = most-recently-updated application
  const appsMap = new Map<string, AppEntry>();
  ((appsData ?? []) as AppRow[]).forEach((app) => {
    const vacancy = Array.isArray(app.vacancy) ? app.vacancy[0] : app.vacancy;
    const existing = appsMap.get(app.applicant_id);
    if (!existing) {
      appsMap.set(app.applicant_id, {
        id: app.id,
        status: app.status,
        appliedAt: app.applied_at,
        vacancyTitle: vacancy?.title ?? null,
        plantillaItemNo: vacancy?.plantilla_item_no ?? null,
        employmentType: vacancy?.employment_type ?? null,
        count: 1,
      });
    } else {
      existing.count += 1;
    }
  });

  return rows.map((row) => {
    const appEntry = appsMap.get(row.id);
    return {
      id: row.id,
      fullName: fullName({
        firstName: row.first_name,
        middleName: row.middle_name,
        lastName: row.last_name,
        suffix: row.suffix,
      }),
      email: row.email,
      mobileNo: row.mobile_no,
      campusId: row.campus_id,
      campusName: resolveName(row.campus) ?? "Unknown",
      officeId: row.office_id,
      officeName: resolveName(row.office),
      status: row.status,
      source: row.source,
      applicationsCount: appEntry?.count ?? 0,
      convertedEmployeeId: row.converted_employee_id,
      updatedAt: row.updated_at,
      latestApplicationId: appEntry?.id ?? null,
      latestApplicationStatus: appEntry?.status ?? null,
      latestApplicationAppliedAt: appEntry?.appliedAt ?? null,
      latestVacancyTitle: appEntry?.vacancyTitle ?? null,
      latestPlantillaItemNo: appEntry?.plantillaItemNo ?? null,
      latestVacancyEmploymentType: appEntry?.employmentType ?? null,
    };
  });
}

export async function getApplicantById(
  applicantId: string,
  context?: AuthorizationContext,
): Promise<ApplicantDetail | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applicants")
    .select(
      "id, first_name, middle_name, last_name, suffix, email, mobile_no, campus_id, office_id, status, notes, source, converted_employee_id, updated_at, campus:campuses(name), office:offices(name)",
    )
    .eq("id", applicantId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(
    baseQuery,
    context,
  ).maybeSingle();
  if (error || !data) return null;
  const row = data as ApplicantRow;
  const [applications, screeningResults, interviews] = await Promise.all([
    listApplicationsByApplicantId(applicantId, context),
    listScreeningResultsByApplicantId(applicantId),
    listInterviewsByApplicantId(applicantId),
  ]);
  const statusHistory = await listApplicationStatusHistoryByApplicationIds(
    applications.map((application) => application.id),
    context,
  );

  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    suffix: row.suffix,
    fullName: fullName({
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      suffix: row.suffix,
    }),
    email: row.email,
    mobileNo: row.mobile_no,
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    officeId: row.office_id,
    officeName: resolveName(row.office),
    status: row.status,
    notes: row.notes,
    source: row.source,
    convertedEmployeeId: row.converted_employee_id,
    updatedAt: row.updated_at,
    applications,
    screeningResults,
    interviews,
    statusHistory,
  };
}

export async function getApplicantScopeById(
  applicantId: string,
): Promise<{ campusId: string; officeId: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_applicants")
    .select("campus_id, office_id")
    .eq("id", applicantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { campus_id: string; office_id: string | null };
  return { campusId: row.campus_id, officeId: row.office_id };
}

export async function createApplicant(input: ApplicantFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_applicants")
    .insert(buildApplicantPayload(input) as never)
    .select("id")
    .single();
  return {
    ok: !error,
    error: error?.message,
    applicantId: (data as { id: string } | null)?.id ?? null,
  };
}

export async function updateApplicant(
  applicantId: string,
  input: ApplicantFormInput,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("recruitment_applicants")
    .update(buildApplicantPayload(input) as never)
    .eq("id", applicantId);
  return { ok: !error, error: error?.message };
}

export async function updateApplicantStatus(
  applicantId: string,
  status: ApplicantStatus,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("recruitment_applicants")
    .update({ status } as never)
    .eq("id", applicantId)
    .is("deleted_at", null);
  return { ok: !error, error: error?.message };
}

export async function createApplication(input: ApplicationCreateInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    applicant_id: input.applicantId,
    vacancy_id: input.vacancyId,
    status: input.status,
    applied_at: normalizeNullable(input.appliedAt),
    remarks: normalizeNullable(input.remarks),
  };
  const { data, error } = await supabase
    .from("recruitment_applications")
    .insert(payload as never)
    .select("id")
    .single();
  return {
    ok: !error,
    error: error?.message,
    applicationId: (data as { id: string } | null)?.id ?? null,
  };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  remarks?: string | null,
) {
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("recruitment_applications")
    .select("status")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();
  const { error } = await supabase
    .from("recruitment_applications")
    .update({ status, remarks: normalizeNullable(remarks) } as never)
    .eq("id", applicationId);
  if (error) return { ok: false, error: error.message };
  const fromStatus =
    (before as { status: ApplicationStatus } | null)?.status ?? null;
  await supabase.from("recruitment_application_status_history").insert({
    application_id: applicationId,
    from_status: fromStatus,
    to_status: status,
    remarks: normalizeNullable(remarks),
  } as never);
  return { ok: true };
}

export async function getApplicationScopeById(applicationId: string): Promise<{
  campusId: string;
  officeId: string | null;
  applicantId: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_applications")
    .select("applicant_id, campus_id, office_id")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    applicant_id: string;
    campus_id: string;
    office_id: string | null;
  };
  return {
    applicantId: row.applicant_id,
    campusId: row.campus_id,
    officeId: row.office_id,
  };
}

export async function listApplicationsByApplicantId(
  applicantId: string,
  context?: AuthorizationContext,
): Promise<ApplicationRecord[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applications")
    .select(
      "id, applicant_id, vacancy_id, campus_id, office_id, status, applied_at, remarks, updated_at, vacancy:recruitment_vacancies(title, plantilla_item_no, employment_type), campus:campuses(name), office:offices(name)",
    )
    .eq("applicant_id", applicantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return (
    (data ?? []) as Array<{
      id: string;
      applicant_id: string;
      vacancy_id: string;
      campus_id: string;
      office_id: string | null;
      status: ApplicationStatus;
      applied_at: string | null;
      remarks: string | null;
      updated_at: string;
      vacancy:
        | {
            title: string;
            plantilla_item_no: string | null;
            employment_type: string | null;
          }
        | Array<{
            title: string;
            plantilla_item_no: string | null;
            employment_type: string | null;
          }>
        | null;
      campus: { name: string } | Array<{ name: string }> | null;
      office: { name: string } | Array<{ name: string }> | null;
    }>
  ).map((row) => {
    const vacancy = Array.isArray(row.vacancy) ? row.vacancy[0] : row.vacancy;
    return {
      id: row.id,
      applicantId: row.applicant_id,
      vacancyId: row.vacancy_id,
      vacancyTitle: vacancy?.title ?? "Unknown Vacancy",
      plantillaItemNo: vacancy?.plantilla_item_no ?? null,
      employmentType: vacancy?.employment_type ?? null,
      campusId: row.campus_id,
      campusName: resolveName(row.campus) ?? "Unknown Campus",
      officeId: row.office_id,
      officeName: resolveName(row.office),
      status: row.status,
      appliedAt: row.applied_at,
      remarks: row.remarks,
      updatedAt: row.updated_at,
    };
  });
}

export async function createScreeningResult(input: ScreeningResultInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_screening_results")
    .insert({
      applicant_id: input.applicantId,
      result: input.result,
      remarks: normalizeNullable(input.remarks),
      screened_at: input.screenedAt,
    } as never)
    .select("id")
    .single();
  return {
    ok: !error,
    error: error?.message,
    id: (data as { id: string } | null)?.id ?? null,
  };
}

export async function createInterviewRecord(input: InterviewRecordInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_interviews")
    .insert({
      applicant_id: input.applicantId,
      application_id: normalizeNullable(input.applicationId),
      scheduled_at: input.scheduledAt,
      interview_mode: input.interviewMode,
      panel_remarks: normalizeNullable(input.panelRemarks),
      outcome: input.outcome,
      decided_at: normalizeNullable(input.decidedAt),
    } as never)
    .select("id")
    .single();
  return {
    ok: !error,
    error: error?.message,
    id: (data as { id: string } | null)?.id ?? null,
  };
}

async function listScreeningResultsByApplicantId(
  applicantId: string,
): Promise<ScreeningResult[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_screening_results")
    .select("id, applicant_id, result, remarks, screened_at")
    .eq("applicant_id", applicantId)
    .order("screened_at", { ascending: false });
  if (error) return [];
  return (
    (data ?? []) as Array<{
      id: string;
      applicant_id: string;
      result: "pass" | "fail" | "hold";
      remarks: string | null;
      screened_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    applicantId: row.applicant_id,
    result: row.result,
    remarks: row.remarks,
    screenedAt: row.screened_at,
  }));
}

async function listInterviewsByApplicantId(
  applicantId: string,
): Promise<InterviewRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_interviews")
    .select(
      "id, applicant_id, application_id, scheduled_at, interview_mode, panel_remarks, outcome, decided_at",
    )
    .eq("applicant_id", applicantId)
    .order("scheduled_at", { ascending: false });
  if (error) return [];
  return (
    (data ?? []) as Array<{
      id: string;
      applicant_id: string;
      application_id: string | null;
      scheduled_at: string;
      interview_mode: "in_person" | "online" | "phone";
      panel_remarks: string | null;
      outcome: "pending" | "pass" | "fail" | "no_show";
      decided_at: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    applicantId: row.applicant_id,
    applicationId: row.application_id,
    scheduledAt: row.scheduled_at,
    interviewMode: row.interview_mode,
    panelRemarks: row.panel_remarks,
    outcome: row.outcome,
    decidedAt: row.decided_at,
  }));
}

async function listApplicationStatusHistoryByApplicationIds(
  applicationIds: string[],
  context?: AuthorizationContext,
): Promise<ApplicationStatusHistoryItem[]> {
  if (applicationIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_application_status_history")
    .select(
      "id, application_id, from_status, to_status, remarks, created_at, app:recruitment_applications!inner(campus_id,office_id)",
    )
    .in("application_id", applicationIds)
    .order("created_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return (
    (data ?? []) as Array<{
      id: string;
      application_id: string;
      from_status: ApplicationStatus | null;
      to_status: ApplicationStatus;
      remarks: string | null;
      created_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    remarks: row.remarks,
    changedAt: row.created_at,
  }));
}

// ── Duplicate detection ──────────────────────────────────────────────────────

function normalizeMobile(value: string) {
  return value.replace(/\D+/g, "");
}

export async function findPotentialDuplicateApplicants(
  input: {
    email?: string | null;
    mobileNo?: string | null;
    excludeApplicantId?: string | null;
  },
  context?: AuthorizationContext,
): Promise<DuplicateApplicantMatch[]> {
  const email = normalizeNullable(input.email)?.toLowerCase() ?? null;
  const mobileDigits = input.mobileNo ? normalizeMobile(input.mobileNo) : "";
  if (!email && mobileDigits.length < 7) return [];

  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applicants")
    .select(
      "id, first_name, middle_name, last_name, suffix, email, mobile_no, status, campus:campuses(name), applications:recruitment_applications(updated_at, vacancy:recruitment_vacancies(title))",
    )
    .is("deleted_at", null)
    .limit(5);

  let scopedQuery = baseQuery;
  if (email) {
    scopedQuery = scopedQuery.ilike("email", email);
  }
  // We can't easily do OR with PostgREST + normalized digits, so we run email-first
  // then mobile suffix-match as a separate query when email yielded nothing.
  const { data, error } = await applyAuthorizationScope(scopedQuery, context);
  let rows = !error && data ? (data as MatchRow[]) : [];

  if (rows.length === 0 && mobileDigits.length >= 7) {
    const tail = mobileDigits.slice(-9);
    const mobQuery = supabase
      .from("recruitment_applicants")
      .select(
        "id, first_name, middle_name, last_name, suffix, email, mobile_no, status, campus:campuses(name), applications:recruitment_applications(updated_at, vacancy:recruitment_vacancies(title))",
      )
      .is("deleted_at", null)
      .ilike("mobile_no", `%${tail}%`)
      .limit(5);
    const { data: mobData, error: mobErr } = await applyAuthorizationScope(
      mobQuery,
      context,
    );
    if (!mobErr && mobData) rows = mobData as MatchRow[];
  }

  const excluded = input.excludeApplicantId ?? null;
  return rows
    .filter((row) => row.id !== excluded)
    .map((row) => {
      const applications = (row.applications ?? []) as Array<{
        updated_at: string;
        vacancy: { title: string } | Array<{ title: string }> | null;
      }>;
      const latest = applications
        .slice()
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
      const latestTitle = latest
        ? Array.isArray(latest.vacancy)
          ? (latest.vacancy[0]?.title ?? null)
          : (latest.vacancy?.title ?? null)
        : null;
      return {
        id: row.id,
        fullName: fullName({
          firstName: row.first_name,
          middleName: row.middle_name,
          lastName: row.last_name,
          suffix: row.suffix,
        }),
        email: row.email,
        mobileNo: row.mobile_no,
        status: row.status,
        campusName: resolveName(row.campus) ?? "Unknown",
        latestTargetPosition: latestTitle,
      };
    });
}

type MatchRow = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string | null;
  mobile_no: string | null;
  status: ApplicantListItem["status"];
  campus: { name: string } | Array<{ name: string }> | null;
  applications: Array<{
    updated_at: string;
    vacancy: { title: string } | Array<{ title: string }> | null;
  }> | null;
};

// ── Applicant -> Employee conversion ─────────────────────────────────────────

export async function getApplicantConversionState(
  applicantId: string,
): Promise<{
  status: ApplicantListItem["status"];
  convertedEmployeeId: string | null;
  email: string | null;
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_applicants")
    .select("status, converted_employee_id, email")
    .eq("id", applicantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    status: ApplicantListItem["status"];
    converted_employee_id: string | null;
    email: string | null;
  };
  return {
    status: row.status,
    convertedEmployeeId: row.converted_employee_id,
    email: row.email,
  };
}

export async function findActiveEmployeeByEmail(
  email: string,
): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .ilike("email", email.trim())
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string };
}

export async function linkApplicantToEmployeeAndMarkHired(
  applicantId: string,
  employeeId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("recruitment_applicants")
    .update({ converted_employee_id: employeeId, status: "hired" } as never)
    .eq("id", applicantId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
