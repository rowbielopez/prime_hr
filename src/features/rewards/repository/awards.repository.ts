import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { RewardAwardListItem } from "@/features/rewards/types";
import type { RewardAwardFormInput } from "@/features/rewards/schemas/award-form.schema";

export async function listRewardsAwards(context?: AuthorizationContext): Promise<RewardAwardListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_awards")
    .select("id, code, title, status, updated_at, campus:campuses(name), office:offices(name)")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    code: string;
    title: string;
    status: RewardAwardListItem["status"];
    updated_at: string;
    campus: { name: string } | Array<{ name: string }> | null;
    office: { name: string } | Array<{ name: string }> | null;
  }>).map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    status: row.status,
    campusName: Array.isArray(row.campus) ? (row.campus[0]?.name ?? null) : (row.campus?.name ?? null),
    officeName: Array.isArray(row.office) ? (row.office[0]?.name ?? null) : (row.office?.name ?? null),
    updatedAt: row.updated_at,
  }));
}

export type RewardAwardDetail = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  nominationStartDate: string | null;
  nominationEndDate: string | null;
  reviewEndDate: string | null;
  campusId: string | null;
  officeId: string | null;
  campusName: string | null;
  officeName: string | null;
  status: RewardAwardListItem["status"];
};

const awardSelect =
  "id, code, title, description, nomination_start_date, nomination_end_date, review_end_date, campus_id, office_id, status, campus:campuses(name), office:offices(name)";

export async function getRewardAwardById(awardId: string, context?: AuthorizationContext): Promise<RewardAwardDetail | null> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_awards")
    .select(awardSelect)
    .eq("id", awardId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(base, context).maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    code: string;
    title: string;
    description: string | null;
    nomination_start_date: string | null;
    nomination_end_date: string | null;
    review_end_date: string | null;
    campus_id: string | null;
    office_id: string | null;
    campus: { name: string } | Array<{ name: string }> | null;
    office: { name: string } | Array<{ name: string }> | null;
    status: RewardAwardListItem["status"];
  };
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    nominationStartDate: row.nomination_start_date,
    nominationEndDate: row.nomination_end_date,
    reviewEndDate: row.review_end_date,
    campusId: row.campus_id,
    officeId: row.office_id,
    campusName: Array.isArray(row.campus) ? (row.campus[0]?.name ?? null) : (row.campus?.name ?? null),
    officeName: Array.isArray(row.office) ? (row.office[0]?.name ?? null) : (row.office?.name ?? null),
    status: row.status,
  };
}

function payload(input: RewardAwardFormInput) {
  return {
    code: input.code.trim(),
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    nomination_start_date: input.nominationStartDate,
    nomination_end_date: input.nominationEndDate,
    review_end_date: input.reviewEndDate,
    campus_id: input.campusId,
    office_id: input.officeId,
    status: input.status,
  };
}

export async function createRewardAward(input: RewardAwardFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_awards")
    .insert(payload(input) as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, awardId: (data as { id: string } | null)?.id ?? null };
}

export async function updateRewardAward(awardId: string, input: RewardAwardFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("rewards_awards").update(payload(input) as never).eq("id", awardId);
  return { ok: !error, error: error?.message };
}

export async function listActiveRewardAwardOptions(context?: AuthorizationContext): Promise<Array<{ id: string; title: string }>> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_awards")
    .select("id, title")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("title", { ascending: true });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return (data ?? []) as Array<{ id: string; title: string }>;
}

