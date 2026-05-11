import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { PerformanceCycleDetail, PerformanceCycleListItem } from "@/features/performance/types";
import type { PerformanceCycleFormInput } from "@/features/performance/schemas/cycle-form.schema";

type CycleRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  submission_deadline: string;
  review_deadline: string;
  end_date: string;
  campus_id: string | null;
  office_id: string | null;
  status: PerformanceCycleListItem["status"];
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null): string | null {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function mapCycle(row: CycleRow): PerformanceCycleDetail {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    submissionDeadline: row.submission_deadline,
    reviewDeadline: row.review_deadline,
    endDate: row.end_date,
    campusId: row.campus_id,
    campusName: resolveName(row.campus),
    officeId: row.office_id,
    officeName: resolveName(row.office),
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function payload(input: PerformanceCycleFormInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    start_date: input.startDate,
    submission_deadline: input.submissionDeadline,
    review_deadline: input.reviewDeadline,
    end_date: input.endDate,
    campus_id: input.campusId,
    office_id: input.officeId,
    status: input.status,
  };
}

const cycleSelect =
  "id, name, description, start_date, submission_deadline, review_deadline, end_date, campus_id, office_id, status, updated_at, campus:campuses(name), office:offices(name)";

export async function listPerformanceCycles(context?: AuthorizationContext): Promise<PerformanceCycleListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_cycles")
    .select(cycleSelect)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as CycleRow[]).map(mapCycle);
}

export async function getPerformanceCycleById(cycleId: string, context?: AuthorizationContext): Promise<PerformanceCycleDetail | null> {
  const supabase = await createSupabaseServerClient();
  const base = supabase.from("performance_cycles").select(cycleSelect).eq("id", cycleId).is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(base, context).maybeSingle();
  if (error || !data) return null;
  return mapCycle(data as CycleRow);
}

export async function createPerformanceCycle(input: PerformanceCycleFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("performance_cycles").insert(payload(input) as never).select("id").single();
  return { ok: !error, error: error?.message, cycleId: (data as { id: string } | null)?.id ?? null };
}

export async function updatePerformanceCycle(cycleId: string, input: PerformanceCycleFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("performance_cycles").update(payload(input) as never).eq("id", cycleId);
  return { ok: !error, error: error?.message };
}

export async function listActivePerformanceCycles(context?: AuthorizationContext): Promise<PerformanceCycleListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_cycles")
    .select(cycleSelect)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("start_date", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as CycleRow[]).map(mapCycle);
}
