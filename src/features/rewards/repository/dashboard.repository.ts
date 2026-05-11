import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { RewardDashboardSummary, RewardStatusCount } from "@/features/rewards/types";

export async function getRewardsDashboardSummary(context?: AuthorizationContext): Promise<RewardDashboardSummary> {
  const supabase = await createSupabaseServerClient();
  let awardsQuery = supabase
    .from("rewards_awards")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("deleted_at", null);
  let nominationsQuery = supabase.from("rewards_nominations").select("id, status, campus_id");
  if (context && !context.isSuperAdmin && context.campusScopes.length > 0) {
    awardsQuery = awardsQuery.in("campus_id", context.campusScopes);
    nominationsQuery = nominationsQuery.in("campus_id", context.campusScopes);
  }
  const [awards, nominations] = await Promise.all([awardsQuery, nominationsQuery]);
  const rows = (nominations.data ?? []) as Array<{ status: string }>;
  return {
    activeAwards: awards.count ?? 0,
    totalNominations: rows.length,
    pendingReviews: rows.filter((r) => r.status === "submitted" || r.status === "under_review").length,
    approvedNominations: rows.filter((r) => r.status === "approved").length,
    awardedCount: rows.filter((r) => r.status === "awarded").length,
  };
}

export async function listRewardStatusCounts(context?: AuthorizationContext): Promise<RewardStatusCount[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase.from("rewards_nominations").select("status, campus_id");
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ status: string }>) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({
    status: status as RewardStatusCount["status"],
    count,
  }));
}

