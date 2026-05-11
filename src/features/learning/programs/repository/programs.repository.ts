import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import { applyLearningProgramScope } from "@/features/learning/scope";
import type { ProgramFormInput } from "@/features/learning/programs/schemas/program-form.schema";
import type { ProgramStatus } from "@/features/learning/types";
import type { TrainingProgramDetail, TrainingProgramListItem } from "@/features/learning/types";

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
  modality: TrainingProgramListItem["modality"];
  duration_hours: string | number;
  campus_id: string | null;
  office_id: string | null;
  status: TrainingProgramListItem["status"];
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function mapRowToList(row: ProgramRow): TrainingProgramListItem {
  return {
    id: row.id,
    title: row.title,
    modality: row.modality,
    durationHours: typeof row.duration_hours === "string" ? Number(row.duration_hours) : row.duration_hours,
    campusId: row.campus_id,
    campusName: resolveName(row.campus),
    officeId: row.office_id,
    officeName: resolveName(row.office),
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function buildPayload(input: ProgramFormInput) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    modality: input.modality,
    duration_hours: input.durationHours,
    campus_id: input.campusId,
    office_id: input.officeId,
    status: input.status,
  };
}

export async function listTrainingPrograms(context?: AuthorizationContext): Promise<TrainingProgramListItem[]> {
  const supabase = await createSupabaseServerClient();
  let baseQuery = supabase
    .from("ld_training_programs")
    .select(
      "id, title, modality, duration_hours, campus_id, office_id, status, updated_at, campus:campuses(name), office:offices(name)"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  baseQuery = applyLearningProgramScope(baseQuery, context) as typeof baseQuery;
  const { data, error } = await baseQuery;
  if (error) return [];
  return ((data ?? []) as ProgramRow[]).map(mapRowToList);
}

export async function getTrainingProgramById(
  programId: string,
  context?: AuthorizationContext
): Promise<TrainingProgramDetail | null> {
  const supabase = await createSupabaseServerClient();
  let baseQuery = supabase
    .from("ld_training_programs")
    .select(
      "id, title, description, modality, duration_hours, campus_id, office_id, status, updated_at, campus:campuses(name), office:offices(name)"
    )
    .eq("id", programId)
    .is("deleted_at", null);
  baseQuery = applyLearningProgramScope(baseQuery, context) as typeof baseQuery;
  const { data, error } = await baseQuery.maybeSingle();
  if (error || !data) return null;
  const row = data as ProgramRow;
  return { ...mapRowToList(row), description: row.description };
}

export async function getTrainingProgramScopeById(
  programId: string
): Promise<{ campusId: string | null; officeId: string | null; status: ProgramStatus } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_training_programs")
    .select("campus_id, office_id, status")
    .eq("id", programId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { campus_id: string | null; office_id: string | null; status: ProgramStatus };
  return { campusId: row.campus_id, officeId: row.office_id, status: row.status };
}

export async function createTrainingProgram(input: ProgramFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_training_programs")
    .insert(buildPayload(input) as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, programId: (data as { id: string } | null)?.id ?? null };
}

export async function updateTrainingProgram(programId: string, input: ProgramFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_training_programs").update(buildPayload(input) as never).eq("id", programId);
  return { ok: !error, error: error?.message };
}

export async function updateTrainingProgramStatus(programId: string, status: ProgramStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ld_training_programs")
    .update({ status } as never)
    .eq("id", programId)
    .is("deleted_at", null);
  return { ok: !error, error: error?.message };
}

export async function softDeleteTrainingProgram(programId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ld_training_programs")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", programId);
  return { ok: !error, error: error?.message };
}

export async function listTrainingProgramsForOptions(context?: AuthorizationContext): Promise<
  Array<{ id: string; title: string }>
> {
  const rows = await listTrainingPrograms(context);
  return rows.filter((r) => r.status === "active").map((r) => ({ id: r.id, title: r.title }));
}
