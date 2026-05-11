import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { PlanFormInput, PlanItemFormInput } from "@/features/learning/plans/schemas/plan-form.schema";
import type { AnnualPlanDetail, AnnualPlanItem, AnnualPlanListItem } from "@/features/learning/types";

type PlanRow = {
  id: string;
  year: number;
  title: string;
  campus_id: string;
  status: AnnualPlanListItem["status"];
  notes: string | null;
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function mapPlanRow(row: PlanRow): AnnualPlanListItem {
  return {
    id: row.id,
    year: row.year,
    title: row.title,
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export async function listAnnualPlans(context?: AuthorizationContext): Promise<AnnualPlanListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("ld_annual_plans")
    .select("id, year, title, campus_id, status, notes, updated_at, campus:campuses(name)")
    .is("deleted_at", null)
    .order("year", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return ((data ?? []) as PlanRow[]).map(mapPlanRow);
}

export async function getAnnualPlanById(planId: string, context?: AuthorizationContext): Promise<AnnualPlanDetail | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("ld_annual_plans")
    .select("id, year, title, campus_id, status, notes, updated_at, campus:campuses(name)")
    .eq("id", planId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(baseQuery, context).maybeSingle();
  if (error || !data) return null;
  const row = data as PlanRow;
  const items = await listPlanItems(planId);
  return {
    ...mapPlanRow(row),
    notes: row.notes,
    items,
  };
}

async function listPlanItems(planId: string): Promise<AnnualPlanItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_annual_plan_items")
    .select("id, program_id, quarter, notes, program:ld_training_programs(title)")
    .eq("plan_id", planId)
    .order("quarter", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    program_id: string;
    quarter: number;
    notes: string | null;
    program: { title: string } | Array<{ title: string }> | null;
  }>).map((r) => ({
    id: r.id,
    programId: r.program_id,
    programTitle: Array.isArray(r.program) ? (r.program[0]?.title ?? "?") : (r.program?.title ?? "?"),
    quarter: r.quarter,
    notes: r.notes,
  }));
}

export async function getAnnualPlanScopeById(planId: string): Promise<{ campusId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_annual_plans")
    .select("campus_id")
    .eq("id", planId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return { campusId: (data as { campus_id: string }).campus_id };
}

function buildPlanPayload(input: PlanFormInput) {
  return {
    year: input.year,
    title: input.title.trim(),
    campus_id: input.campusId,
    status: input.status,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };
}

export async function createAnnualPlan(input: PlanFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_annual_plans")
    .insert(buildPlanPayload(input) as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, planId: (data as { id: string } | null)?.id ?? null };
}

export async function updateAnnualPlan(planId: string, input: PlanFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_annual_plans").update(buildPlanPayload(input) as never).eq("id", planId);
  return { ok: !error, error: error?.message };
}

export async function addPlanItem(planId: string, input: PlanItemFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_annual_plan_items").insert({
    plan_id: planId,
    program_id: input.programId,
    quarter: input.quarter,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  } as never);
  return { ok: !error, error: error?.message };
}

export async function removePlanItem(itemId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_annual_plan_items").delete().eq("id", itemId);
  return { ok: !error, error: error?.message };
}
