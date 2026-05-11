import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  TrainingNominationFormInput,
  TrainingRequestFormInput,
  TrainingRequestReviewInput,
} from "@/features/learning/requests/schemas/request-form.schema";
import type { TrainingRequestKind, TrainingRequestListItem } from "@/features/learning/types";

type RequestRow = {
  id: string;
  campus_id: string;
  requester_employee_id: string;
  request_kind: string;
  submitted_by_employee_id: string | null;
  program_id: string | null;
  custom_title: string | null;
  justification: string;
  remarks: string | null;
  status: TrainingRequestListItem["status"];
  reviewer_notes: string | null;
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  program: { title: string } | Array<{ title: string }> | null;
};

type EmployeeMini = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  employee_no: string;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function displayName(e: EmployeeMini) {
  return [e.first_name, e.middle_name, e.last_name, e.suffix].filter(Boolean).join(" ");
}

function mapKind(raw: string): TrainingRequestKind {
  return raw === "nomination" ? "nomination" : "self_request";
}

async function loadEmployeesByIds(ids: string[]): Promise<Map<string, EmployeeMini>> {
  if (ids.length === 0) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, middle_name, last_name, suffix, employee_no")
    .in("id", ids);
  if (error || !data) return new Map();
  return new Map(
    (data as EmployeeMini[]).map((e) => [
      e.id,
      e,
    ])
  );
}

function mapRow(
  row: RequestRow,
  employees: Map<string, EmployeeMini>
): TrainingRequestListItem {
  const subject = employees.get(row.requester_employee_id);
  const submitterId = row.submitted_by_employee_id;
  const submitter = submitterId ? employees.get(submitterId) : null;
  const p = row.program;
  const programTitle = p ? (Array.isArray(p) ? p[0]?.title : p.title) : null;
  const kind = mapKind(row.request_kind);
  const submittedByName =
    submitterId && submitterId !== row.requester_employee_id
      ? submitter
        ? displayName(submitter)
        : "Unknown"
      : null;

  return {
    id: row.id,
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    requesterEmployeeId: row.requester_employee_id,
    requesterName: subject ? displayName(subject) : "Unknown",
    requestKind: kind,
    submittedByEmployeeId: submitterId,
    submittedByName,
    programId: row.program_id,
    programTitle: programTitle ?? null,
    customTitle: row.custom_title,
    status: row.status,
    justification: row.justification,
    remarks: row.remarks,
    reviewerNotes: row.reviewer_notes,
    updatedAt: row.updated_at,
  };
}

const requestSelect = [
  "id",
  "campus_id",
  "requester_employee_id",
  "request_kind",
  "submitted_by_employee_id",
  "program_id",
  "custom_title",
  "justification",
  "remarks",
  "status",
  "reviewer_notes",
  "updated_at",
  "campus:campuses(name)",
  "program:ld_training_programs(title)",
].join(", ");

export async function listTrainingRequests(context?: AuthorizationContext): Promise<TrainingRequestListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase.from("ld_training_requests").select(requestSelect).order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  const rows = (data ?? []) as RequestRow[];
  const empIds = [
    ...new Set(
      rows.flatMap((r) => [r.requester_employee_id, r.submitted_by_employee_id].filter(Boolean) as string[])
    ),
  ];
  const employees = await loadEmployeesByIds(empIds);
  return rows.map((row) => mapRow(row, employees));
}

export async function listMyTrainingRequests(employeeId: string): Promise<TrainingRequestListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_training_requests")
    .select(requestSelect)
    .or(`requester_employee_id.eq.${employeeId},submitted_by_employee_id.eq.${employeeId}`)
    .order("updated_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as RequestRow[];
  const empIds = [
    ...new Set(
      rows.flatMap((r) => [r.requester_employee_id, r.submitted_by_employee_id].filter(Boolean) as string[])
    ),
  ];
  const employees = await loadEmployeesByIds(empIds);
  return rows.map((row) => mapRow(row, employees));
}

export async function getTrainingRequestById(
  requestId: string,
  context?: AuthorizationContext
): Promise<TrainingRequestListItem | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase.from("ld_training_requests").select(requestSelect).eq("id", requestId);
  const { data, error } = await applyAuthorizationScope(baseQuery, context).maybeSingle();
  if (error || !data) return null;
  const row = data as RequestRow;
  const empIds = [row.requester_employee_id, row.submitted_by_employee_id].filter(Boolean) as string[];
  const employees = await loadEmployeesByIds(empIds);
  return mapRow(row, employees);
}

export async function getTrainingRequestScopeById(requestId: string): Promise<{ campusId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_training_requests")
    .select("campus_id")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !data) return null;
  return { campusId: (data as { campus_id: string }).campus_id };
}

async function insertTrainingRequest(payload: {
  campusId: string;
  subjectEmployeeId: string;
  submittedByEmployeeId: string | null;
  requestKind: TrainingRequestKind;
  programId: string | null;
  customTitle: string | null;
  justification: string;
  remarks: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_training_requests")
    .insert({
      campus_id: payload.campusId,
      requester_employee_id: payload.subjectEmployeeId,
      submitted_by_employee_id: payload.submittedByEmployeeId,
      request_kind: payload.requestKind,
      program_id: payload.programId,
      custom_title: payload.customTitle,
      justification: payload.justification,
      remarks: payload.remarks,
      status: "submitted",
    } as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, requestId: (data as { id: string } | null)?.id ?? null };
}

export async function createSelfTrainingRequest(subjectEmployeeId: string, submittedByEmployeeId: string, input: TrainingRequestFormInput) {
  return insertTrainingRequest({
    campusId: input.campusId,
    subjectEmployeeId,
    submittedByEmployeeId,
    requestKind: "self_request",
    programId: input.programId,
    customTitle: input.customTitle?.trim() ? input.customTitle.trim() : null,
    justification: input.justification.trim(),
    remarks: input.remarks?.trim() ? input.remarks.trim() : null,
  });
}

export async function createNominationRequest(
  subjectEmployeeId: string,
  submittedByEmployeeId: string | null,
  input: TrainingNominationFormInput
) {
  return insertTrainingRequest({
    campusId: input.campusId,
    subjectEmployeeId,
    submittedByEmployeeId,
    requestKind: "nomination",
    programId: input.programId,
    customTitle: input.customTitle?.trim() ? input.customTitle.trim() : null,
    justification: input.justification.trim(),
    remarks: input.remarks?.trim() ? input.remarks.trim() : null,
  });
}

export async function updateTrainingRequestReview(requestId: string, input: TrainingRequestReviewInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ld_training_requests")
    .update({
      status: input.status,
      reviewer_notes: input.reviewerNotes?.trim() ? input.reviewerNotes.trim() : null,
    } as never)
    .eq("id", requestId);
  return { ok: !error, error: error?.message };
}

export async function withdrawTrainingRequest(requestId: string, employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ld_training_requests")
    .update({ status: "withdrawn" } as never)
    .eq("id", requestId)
    .or(`requester_employee_id.eq.${employeeId},submitted_by_employee_id.eq.${employeeId}`);
  return { ok: !error, error: error?.message };
}
