import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { VacancyFormInput } from "@/features/recruitment/vacancies/schemas/vacancy-form.schema";
import type {
  VacancyApplicationRecord,
  VacancyApplicationStatus,
  VacancyApplicationStatusCounts,
  VacancyDetail,
  VacancyListItem,
} from "@/features/recruitment/vacancies/types";

type VacancyRow = {
  id: string;
  title: string;
  description: string | null;
  qualification_notes: string | null;
  plantilla_item_no: string | null;
  campus_id: string;
  office_id: string | null;
  employment_type: string | null;
  item_count: number;
  status: VacancyListItem["status"];
  posted_at: string | null;
  closing_at: string | null;
  remarks: string | null;
  required_documents: string[] | null;
  public_slug: string | null;
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function normalizeNullable(input?: string | null) {
  if (!input) return null;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : null;
}

function emptyApplicationStatusCounts(): VacancyApplicationStatusCounts {
  return {
    submitted: 0,
    screening: 0,
    interview: 0,
    for_offer: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0,
  };
}

function fullName(input: {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
}) {
  return [input.first_name, input.middle_name, input.last_name, input.suffix].filter(Boolean).join(" ");
}

function buildPayload(input: VacancyFormInput) {
  return {
    title: input.title.trim(),
    description: normalizeNullable(input.description),
    qualification_notes: normalizeNullable(input.qualificationNotes),
    plantilla_item_no: normalizeNullable(input.plantillaItemNo),
    campus_id: input.campusId,
    office_id: normalizeNullable(input.officeId),
    employment_type: normalizeNullable(input.employmentType),
    item_count: input.itemCount,
    status: input.status,
    posted_at: normalizeNullable(input.postedAt),
    closing_at: normalizeNullable(input.closingAt),
    remarks: normalizeNullable(input.remarks),
    // Only include required_documents when migration 0058 has been applied.
    // Guarded by a try/catch in createVacancy / updateVacancy.
    required_documents: input.requiredDocuments ?? [],
  };
}

/** Payload without the required_documents column, used as a fallback when migration 0058 is not yet applied. */
function buildCompatPayload(input: VacancyFormInput) {
  const { required_documents: _, ...rest } = buildPayload(input);
  return rest;
}

export async function listVacancies(context?: AuthorizationContext): Promise<VacancyListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_vacancies")
    .select(
      "id, title, plantilla_item_no, campus_id, office_id, employment_type, item_count, status, posted_at, closing_at, public_slug, updated_at, campus:campuses(name), office:offices(name)"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  const rows = (data ?? []) as VacancyRow[];
  const vacancyIds = rows.map((row) => row.id);
  const applicantCounts = new Map<string, VacancyApplicationStatusCounts>();

  if (vacancyIds.length > 0) {
    const applicationsQuery = supabase
      .from("recruitment_applications")
      .select("vacancy_id, status, campus_id, office_id")
      .in("vacancy_id", vacancyIds)
      .is("deleted_at", null);
    const { data: applications } = await applyAuthorizationScope(applicationsQuery, context);
    ((applications ?? []) as Array<{ vacancy_id: string; status: VacancyApplicationStatus }>).forEach((application) => {
      const counts = applicantCounts.get(application.vacancy_id) ?? emptyApplicationStatusCounts();
      counts[application.status] += 1;
      applicantCounts.set(application.vacancy_id, counts);
    });
  }

  return rows.map((row) => ({
    ...(() => {
      const applicationStatusCounts = applicantCounts.get(row.id) ?? emptyApplicationStatusCounts();
      return {
        applicantsCount: Object.values(applicationStatusCounts).reduce((total, count) => total + count, 0),
        applicationStatusCounts,
      };
    })(),
    id: row.id,
    title: row.title,
    plantillaItemNo: row.plantilla_item_no,
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    officeId: row.office_id,
    officeName: resolveName(row.office),
    employmentType: row.employment_type,
    itemCount: row.item_count,
    status: row.status,
    postedAt: row.posted_at,
    closingAt: row.closing_at,
    updatedAt: row.updated_at,
    publicSlug: row.public_slug,
  }));
}

export async function getVacancyById(vacancyId: string, context?: AuthorizationContext): Promise<VacancyDetail | null> {
  const supabase = await createSupabaseServerClient();

  async function runQuery(select: string) {
    const base = supabase
      .from("recruitment_vacancies")
      .select(select)
      .eq("id", vacancyId)
      .is("deleted_at", null);
    return applyAuthorizationScope(base, context).maybeSingle();
  }

  // Try with required_documents (migration 0058). If the column doesn't exist yet,
  // fall back to the compat select so the page still loads.
  let { data, error } = await runQuery(
    "id, title, description, qualification_notes, plantilla_item_no, campus_id, office_id, employment_type, item_count, status, posted_at, closing_at, remarks, required_documents, public_slug, updated_at, campus:campuses(name), office:offices(name)"
  );
  if (error) {
    const compat = await runQuery(
      "id, title, description, qualification_notes, plantilla_item_no, campus_id, office_id, employment_type, item_count, status, posted_at, closing_at, remarks, public_slug, updated_at, campus:campuses(name), office:offices(name)"
    );
    data = compat.data;
    error = compat.error;
  }

  if (error || !data) return null;
  const row = data as VacancyRow;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    qualificationNotes: row.qualification_notes,
    plantillaItemNo: row.plantilla_item_no,
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    officeId: row.office_id,
    officeName: resolveName(row.office),
    employmentType: row.employment_type,
    itemCount: row.item_count,
    status: row.status,
    postedAt: row.posted_at,
    closingAt: row.closing_at,
    remarks: row.remarks,
    requiredDocuments: row.required_documents ?? [],
    updatedAt: row.updated_at,
    publicSlug: row.public_slug,
    applicantsCount: 0,
    applicationStatusCounts: emptyApplicationStatusCounts(),
  };
}

export async function listApplicationsByVacancyId(
  vacancyId: string,
  context?: AuthorizationContext
): Promise<VacancyApplicationRecord[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_applications")
    .select(
      "id, applicant_id, status, applied_at, remarks, updated_at, campus_id, office_id, applicant:recruitment_applicants(first_name, middle_name, last_name, suffix, email, mobile_no, status, source)"
    )
    .eq("vacancy_id", vacancyId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];

  return ((data ?? []) as Array<{
    id: string;
    applicant_id: string;
    status: VacancyApplicationStatus;
    applied_at: string | null;
    remarks: string | null;
    updated_at: string;
    applicant:
    | {
      first_name: string;
      middle_name: string | null;
      last_name: string;
      suffix: string | null;
      email: string | null;
      mobile_no: string | null;
      status: VacancyApplicationRecord["applicantStatus"];
      source: string | null;
    }
    | Array<{
      first_name: string;
      middle_name: string | null;
      last_name: string;
      suffix: string | null;
      email: string | null;
      mobile_no: string | null;
      status: VacancyApplicationRecord["applicantStatus"];
      source: string | null;
    }>
    | null;
  }>).map((row) => {
    const applicant = Array.isArray(row.applicant) ? row.applicant[0] : row.applicant;
    return {
      id: row.id,
      applicantId: row.applicant_id,
      applicantName: applicant ? fullName(applicant) : "Unknown applicant",
      applicantEmail: applicant?.email ?? null,
      applicantMobileNo: applicant?.mobile_no ?? null,
      applicantStatus: applicant?.status ?? "new",
      applicantSource: applicant?.source ?? null,
      applicationStatus: row.status,
      appliedAt: row.applied_at,
      remarks: row.remarks,
      updatedAt: row.updated_at,
    };
  });
}

export async function getVacancyScopeById(vacancyId: string): Promise<{ campusId: string; officeId: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_vacancies")
    .select("campus_id, office_id")
    .eq("id", vacancyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { campus_id: string; office_id: string | null };
  return { campusId: row.campus_id, officeId: row.office_id };
}

export async function createVacancy(input: VacancyFormInput) {
  const supabase = await createSupabaseServerClient();
  // Try full payload first; if required_documents column doesn't exist yet, use compat payload.
  let { data, error } = await supabase
    .from("recruitment_vacancies")
    .insert(buildPayload(input) as never)
    .select("id")
    .single();
  if (error?.message?.includes("required_documents")) {
    const result = await supabase
      .from("recruitment_vacancies")
      .insert(buildCompatPayload(input) as never)
      .select("id")
      .single();
    data = result.data;
    error = result.error;
  }
  return { ok: !error, error: error?.message, vacancyId: (data as { id: string } | null)?.id ?? null };
}

export async function updateVacancy(vacancyId: string, input: VacancyFormInput) {
  const supabase = await createSupabaseServerClient();
  // Try full payload first; if required_documents column doesn't exist yet, use compat payload.
  let { error } = await supabase
    .from("recruitment_vacancies")
    .update(buildPayload(input) as never)
    .eq("id", vacancyId)
    .is("deleted_at", null);
  if (error?.message?.includes("required_documents")) {
    const result = await supabase
      .from("recruitment_vacancies")
      .update(buildCompatPayload(input) as never)
      .eq("id", vacancyId)
      .is("deleted_at", null);
    error = result.error;
  }
  return { ok: !error, error: error?.message };
}

export async function updateVacancyStatus(vacancyId: string, status: VacancyListItem["status"]) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("recruitment_vacancies")
    .update({ status } as never)
    .eq("id", vacancyId)
    .is("deleted_at", null);
  return { ok: !error, error: error?.message };
}
