import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { VacancyFormInput } from "@/features/recruitment/vacancies/schemas/vacancy-form.schema";
import type { VacancyDetail, VacancyListItem } from "@/features/recruitment/vacancies/types";

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
  };
}

export async function listVacancies(context?: AuthorizationContext): Promise<VacancyListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_vacancies")
    .select(
      "id, title, plantilla_item_no, campus_id, office_id, employment_type, item_count, status, posted_at, closing_at, updated_at, campus:campuses(name), office:offices(name)"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  const rows = (data ?? []) as VacancyRow[];
  return rows.map((row) => ({
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
  }));
}

export async function getVacancyById(vacancyId: string, context?: AuthorizationContext): Promise<VacancyDetail | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_vacancies")
    .select(
      "id, title, description, qualification_notes, plantilla_item_no, campus_id, office_id, employment_type, item_count, status, posted_at, closing_at, remarks, updated_at, campus:campuses(name), office:offices(name)"
    )
    .eq("id", vacancyId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(baseQuery, context).maybeSingle();
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
    updatedAt: row.updated_at,
  };
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
  const { data, error } = await supabase
    .from("recruitment_vacancies")
    .insert(buildPayload(input) as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, vacancyId: (data as { id: string } | null)?.id ?? null };
}

export async function updateVacancy(vacancyId: string, input: VacancyFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("recruitment_vacancies").update(buildPayload(input) as never).eq("id", vacancyId);
  return { ok: !error, error: error?.message };
}

export async function updateVacancyStatus(vacancyId: string, status: VacancyListItem["status"]) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("recruitment_vacancies").update({ status } as never).eq("id", vacancyId);
  return { ok: !error, error: error?.message };
}
