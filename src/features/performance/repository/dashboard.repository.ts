import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import type { PerformanceCycleProgressRow, PerformanceDashboardSummary, PerformanceStatusCount } from "@/features/performance/types";

export async function getPerformanceDashboardSummary(context?: AuthorizationContext): Promise<PerformanceDashboardSummary> {
  const supabase = await createSupabaseServerClient();
  let activeCyclesQuery = supabase
    .from("performance_cycles")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("deleted_at", null);
  let recordsQuery = supabase.from("performance_records").select("id, status, campus_id");
  if (context && !context.isSuperAdmin && context.campusScopes.length > 0) {
    activeCyclesQuery = activeCyclesQuery.in("campus_id", context.campusScopes);
    recordsQuery = recordsQuery.in("campus_id", context.campusScopes);
  }
  const [activeCycles, records] = await Promise.all([activeCyclesQuery, recordsQuery]);
  const rows = (records.data ?? []) as Array<{ status: string }>;
  const submittedRecords = rows.filter((r) => r.status === "submitted" || r.status === "under_review").length;
  return {
    activeCycles: activeCycles.count ?? 0,
    totalRecords: rows.length,
    submittedRecords,
    finalizedRecords: rows.filter((r) => r.status === "finalized").length,
    pendingReviews: submittedRecords,
    rejectedRecords: rows.filter((r) => r.status === "rejected").length,
  };
}

export async function listPerformanceStatusCounts(context?: AuthorizationContext): Promise<PerformanceStatusCount[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("performance_records").select("status, campus_id");
  if (context && !context.isSuperAdmin && context.campusScopes.length > 0) {
    query = query.in("campus_id", context.campusScopes);
  }
  const { data, error } = await query;
  if (error) return [];
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ status: string }>) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({
    status: status as PerformanceStatusCount["status"],
    count,
  }));
}

export async function listPerformanceCycleProgress(context?: AuthorizationContext): Promise<PerformanceCycleProgressRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("performance_records")
    .select("cycle_id, status, cycle:performance_cycles(name)");
  if (context && !context.isSuperAdmin && context.campusScopes.length > 0) {
    query = query.in("campus_id", context.campusScopes);
  }
  const { data, error } = await query;
  if (error) return [];
  const rows = (data ?? []) as Array<{
    cycle_id: string;
    status: string;
    cycle: { name: string } | Array<{ name: string }> | null;
  }>;
  const byCycle = new Map<
    string,
    { name: string; total: number; finalized: number; pendingReview: number }
  >();
  for (const row of rows) {
    const cname = row.cycle
      ? Array.isArray(row.cycle)
        ? (row.cycle[0]?.name ?? "?")
        : row.cycle.name
      : "?";
    if (!byCycle.has(row.cycle_id)) {
      byCycle.set(row.cycle_id, { name: cname, total: 0, finalized: 0, pendingReview: 0 });
    }
    const b = byCycle.get(row.cycle_id)!;
    b.total += 1;
    if (row.status === "finalized") b.finalized += 1;
    if (row.status === "submitted" || row.status === "under_review") b.pendingReview += 1;
  }
  return [...byCycle.entries()]
    .map(([cycleId, v]) => ({
      cycleId,
      cycleName: v.name,
      totalRecords: v.total,
      finalized: v.finalized,
      pendingReview: v.pendingReview,
    }))
    .sort((a, b) => a.cycleName.localeCompare(b.cycleName));
}
