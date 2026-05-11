import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { CompetencyDetail, CompetencyListItem, ProgramCompetencyMapItem } from "@/features/learning/types";
import type { CompetencyFormInput } from "@/features/learning/competencies/schemas/competency-form.schema";

type CompetencyRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  campus_id: string | null;
  office_id: string | null;
  status: CompetencyListItem["status"];
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null): string | null {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function mapRow(row: CompetencyRow): CompetencyDetail {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category,
    campusId: row.campus_id,
    campusName: resolveName(row.campus),
    officeId: row.office_id,
    officeName: resolveName(row.office),
    status: row.status,
    updatedAt: row.updated_at,
  };
}

const competencySelect =
  "id, code, title, description, category, campus_id, office_id, status, updated_at, campus:campuses(name), office:offices(name)";

export async function listCompetencies(context?: AuthorizationContext): Promise<CompetencyListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("ld_competencies")
    .select(competencySelect)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as CompetencyRow[]).map(mapRow);
}

export async function getCompetencyById(id: string, context?: AuthorizationContext): Promise<CompetencyDetail | null> {
  const supabase = await createSupabaseServerClient();
  const base = supabase.from("ld_competencies").select(competencySelect).eq("id", id).is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(base, context).maybeSingle();
  if (error || !data) return null;
  return mapRow(data as CompetencyRow);
}

function buildPayload(input: CompetencyFormInput) {
  return {
    code: input.code.trim().toUpperCase(),
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    category: input.category?.trim() ? input.category.trim() : null,
    campus_id: input.campusId,
    office_id: input.officeId,
    status: input.status,
  };
}

export async function createCompetency(input: CompetencyFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_competencies")
    .insert(buildPayload(input) as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, competencyId: (data as { id: string } | null)?.id ?? null };
}

export async function updateCompetency(competencyId: string, input: CompetencyFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_competencies").update(buildPayload(input) as never).eq("id", competencyId);
  return { ok: !error, error: error?.message };
}

export async function listProgramCompetencyMappings(programId: string): Promise<ProgramCompetencyMapItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_program_competencies")
    .select("id, program_id, competency_id, weight, competency:ld_competencies(code, title)")
    .eq("program_id", programId);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    program_id: string;
    competency_id: string;
    weight: number | string;
    competency: { code: string; title: string } | Array<{ code: string; title: string }> | null;
  }>).map((row) => ({
    id: row.id,
    programId: row.program_id,
    competencyId: row.competency_id,
    competencyCode: row.competency ? (Array.isArray(row.competency) ? row.competency[0]?.code ?? "?" : row.competency.code) : "?",
    competencyTitle: row.competency ? (Array.isArray(row.competency) ? row.competency[0]?.title ?? "?" : row.competency.title) : "?",
    weight: Number(row.weight),
  }));
}
