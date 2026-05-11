import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { ApplicantFormInput } from "@/features/recruitment/applicants/schemas/applicant-form.schema";
import type { ApplicationCreateInput } from "@/features/recruitment/applicants/schemas/application-form.schema";
import type { InterviewRecordInput, ScreeningResultInput } from "@/features/recruitment/applicants/schemas/screening-and-interview.schema";
import type {
  ApplicantDetail,
  ApplicantListItem,
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusHistoryItem,
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
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function fullName(input: { firstName: string; middleName: string | null; lastName: string; suffix: string | null }) {
  return [input.firstName, input.middleName, input.lastName, input.suffix].filter(Boolean).join(" ");
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

export async function listApplicants(context?: AuthorizationContext): Promise<ApplicantListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applicants")
    .select("id, first_name, middle_name, last_name, suffix, email, mobile_no, campus_id, office_id, status, updated_at, campus:campuses(name), office:offices(name)")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  const rows = (data ?? []) as ApplicantRow[];

  const appCountsQuery = supabase
    .from("recruitment_applications")
    .select("applicant_id, campus_id, office_id")
    .is("deleted_at", null);
  const { data: appCounts } = await applyAuthorizationScope(appCountsQuery, context);
  const countMap = new Map<string, number>();
  ((appCounts ?? []) as Array<{ applicant_id: string }>).forEach((row) => {
    countMap.set(row.applicant_id, (countMap.get(row.applicant_id) ?? 0) + 1);
  });

  return rows.map((row) => ({
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
    applicationsCount: countMap.get(row.id) ?? 0,
    updatedAt: row.updated_at,
  }));
}

export async function getApplicantById(applicantId: string, context?: AuthorizationContext): Promise<ApplicantDetail | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applicants")
    .select("id, first_name, middle_name, last_name, suffix, email, mobile_no, campus_id, office_id, status, notes, updated_at, campus:campuses(name), office:offices(name)")
    .eq("id", applicantId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(baseQuery, context).maybeSingle();
  if (error || !data) return null;
  const row = data as ApplicantRow;
  const [applications, screeningResults, interviews] = await Promise.all([
    listApplicationsByApplicantId(applicantId, context),
    listScreeningResultsByApplicantId(applicantId),
    listInterviewsByApplicantId(applicantId),
  ]);
  const statusHistory = await listApplicationStatusHistoryByApplicationIds(
    applications.map((application) => application.id),
    context
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
    updatedAt: row.updated_at,
    applications,
    screeningResults,
    interviews,
    statusHistory,
  };
}

export async function getApplicantScopeById(applicantId: string): Promise<{ campusId: string; officeId: string | null } | null> {
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
  return { ok: !error, error: error?.message, applicantId: (data as { id: string } | null)?.id ?? null };
}

export async function updateApplicant(applicantId: string, input: ApplicantFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("recruitment_applicants")
    .update(buildApplicantPayload(input) as never)
    .eq("id", applicantId);
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
  return { ok: !error, error: error?.message, applicationId: (data as { id: string } | null)?.id ?? null };
}

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus, remarks?: string | null) {
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
  const fromStatus = (before as { status: ApplicationStatus } | null)?.status ?? null;
  await supabase.from("recruitment_application_status_history").insert({
    application_id: applicationId,
    from_status: fromStatus,
    to_status: status,
    remarks: normalizeNullable(remarks),
  } as never);
  return { ok: true };
}

export async function getApplicationScopeById(applicationId: string): Promise<{ campusId: string; officeId: string | null; applicantId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_applications")
    .select("applicant_id, campus_id, office_id")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { applicant_id: string; campus_id: string; office_id: string | null };
  return { applicantId: row.applicant_id, campusId: row.campus_id, officeId: row.office_id };
}

export async function listApplicationsByApplicantId(applicantId: string, context?: AuthorizationContext): Promise<ApplicationRecord[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applications")
    .select("id, applicant_id, vacancy_id, campus_id, office_id, status, applied_at, remarks, updated_at, vacancy:recruitment_vacancies(title), campus:campuses(name), office:offices(name)")
    .eq("applicant_id", applicantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    applicant_id: string;
    vacancy_id: string;
    campus_id: string;
    office_id: string | null;
    status: ApplicationStatus;
    applied_at: string | null;
    remarks: string | null;
    updated_at: string;
    vacancy: { title: string } | Array<{ title: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
    office: { name: string } | Array<{ name: string }> | null;
  }>).map((row) => ({
    id: row.id,
    applicantId: row.applicant_id,
    vacancyId: row.vacancy_id,
    vacancyTitle: Array.isArray(row.vacancy) ? (row.vacancy[0]?.title ?? "Unknown Vacancy") : (row.vacancy?.title ?? "Unknown Vacancy"),
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown Campus",
    officeId: row.office_id,
    officeName: resolveName(row.office),
    status: row.status,
    appliedAt: row.applied_at,
    remarks: row.remarks,
    updatedAt: row.updated_at,
  }));
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
  return { ok: !error, error: error?.message, id: (data as { id: string } | null)?.id ?? null };
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
  return { ok: !error, error: error?.message, id: (data as { id: string } | null)?.id ?? null };
}

async function listScreeningResultsByApplicantId(applicantId: string): Promise<ScreeningResult[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_screening_results")
    .select("id, applicant_id, result, remarks, screened_at")
    .eq("applicant_id", applicantId)
    .order("screened_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    applicant_id: string;
    result: "pass" | "fail" | "hold";
    remarks: string | null;
    screened_at: string;
  }>).map((row) => ({
    id: row.id,
    applicantId: row.applicant_id,
    result: row.result,
    remarks: row.remarks,
    screenedAt: row.screened_at,
  }));
}

async function listInterviewsByApplicantId(applicantId: string): Promise<InterviewRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_interviews")
    .select("id, applicant_id, application_id, scheduled_at, interview_mode, panel_remarks, outcome, decided_at")
    .eq("applicant_id", applicantId)
    .order("scheduled_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    applicant_id: string;
    application_id: string | null;
    scheduled_at: string;
    interview_mode: "in_person" | "online" | "phone";
    panel_remarks: string | null;
    outcome: "pending" | "pass" | "fail" | "no_show";
    decided_at: string | null;
  }>).map((row) => ({
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
  context?: AuthorizationContext
): Promise<ApplicationStatusHistoryItem[]> {
  if (applicationIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_application_status_history")
    .select("id, application_id, from_status, to_status, remarks, created_at, app:recruitment_applications!inner(campus_id,office_id)")
    .in("application_id", applicationIds)
    .order("created_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    application_id: string;
    from_status: ApplicationStatus | null;
    to_status: ApplicationStatus;
    remarks: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    remarks: row.remarks,
    changedAt: row.created_at,
  }));
}
