import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  RewardsApprovalTurnaroundMonthlyRow,
  RewardsApprovalTurnaroundSummary,
  RewardsAwardDistributionByCampusRow,
  RewardsReportPeriod,
} from "@/features/rewards/types";

function inPeriod(isoDate: string | null, period: RewardsReportPeriod) {
  if (!isoDate) return false;
  const value = new Date(isoDate);
  if (Number.isNaN(value.getTime())) return false;
  if (period.from) {
    const from = new Date(`${period.from}T00:00:00.000Z`);
    if (value < from) return false;
  }
  if (period.to) {
    const to = new Date(`${period.to}T23:59:59.999Z`);
    if (value > to) return false;
  }
  return true;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

export async function getRewardsApprovalTurnaroundSummary(
  period: RewardsReportPeriod,
  context?: AuthorizationContext
): Promise<RewardsApprovalTurnaroundSummary> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_nominations")
    .select("submitted_at, approved_at, awarded_at, status, campus_id")
    .in("status", ["approved", "awarded"]);
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) {
    return { consideredCount: 0, averageDays: null, medianDays: null, within7Days: 0, within14Days: 0 };
  }

  const durations = ((data ?? []) as Array<{
    submitted_at: string | null;
    approved_at: string | null;
    awarded_at: string | null;
  }>)
    .map((row) => {
      const submittedAt = row.submitted_at ? new Date(row.submitted_at) : null;
      const decisionAtRaw = row.approved_at ?? row.awarded_at;
      if (!submittedAt || !decisionAtRaw) return null;
      if (!inPeriod(decisionAtRaw, period)) return null;
      const decisionAt = new Date(decisionAtRaw);
      const diffMs = decisionAt.getTime() - submittedAt.getTime();
      if (!Number.isFinite(diffMs) || diffMs < 0) return null;
      return diffMs / (1000 * 60 * 60 * 24);
    })
    .filter((value): value is number => value != null);

  if (durations.length === 0) {
    return { consideredCount: 0, averageDays: null, medianDays: null, within7Days: 0, within14Days: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;

  return {
    consideredCount: durations.length,
    averageDays: round2(average),
    medianDays: round2(median),
    within7Days: durations.filter((value) => value <= 7).length,
    within14Days: durations.filter((value) => value <= 14).length,
  };
}

export async function listRewardsApprovalTurnaroundMonthly(
  period: RewardsReportPeriod,
  context?: AuthorizationContext
): Promise<RewardsApprovalTurnaroundMonthlyRow[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_nominations")
    .select("submitted_at, approved_at, awarded_at, status, campus_id")
    .in("status", ["approved", "awarded"]);
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];

  const bucket = new Map<string, { count: number; totalDays: number }>();

  for (const row of (data ?? []) as Array<{
    submitted_at: string | null;
    approved_at: string | null;
    awarded_at: string | null;
  }>) {
    const decisionAtRaw = row.approved_at ?? row.awarded_at;
    if (!row.submitted_at || !decisionAtRaw || !inPeriod(decisionAtRaw, period)) continue;
    const submittedAt = new Date(row.submitted_at);
    const decisionAt = new Date(decisionAtRaw);
    const diffDays = (decisionAt.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (!Number.isFinite(diffDays) || diffDays < 0) continue;
    const month = decisionAt.toISOString().slice(0, 7);
    const current = bucket.get(month) ?? { count: 0, totalDays: 0 };
    current.count += 1;
    current.totalDays += diffDays;
    bucket.set(month, current);
  }

  return Array.from(bucket.entries())
    .map(([month, value]) => ({
      month,
      count: value.count,
      averageDays: round2(value.totalDays / value.count),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function listRewardsAwardDistributionByCampus(
  period: RewardsReportPeriod,
  context?: AuthorizationContext
): Promise<RewardsAwardDistributionByCampusRow[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_awardees")
    .select("campus_id, awarded_at, campus:campuses(name)")
    .order("awarded_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];

  const counts = new Map<string, RewardsAwardDistributionByCampusRow>();

  for (const row of (data ?? []) as Array<{
    campus_id: string | null;
    awarded_at: string;
    campus: { name: string } | Array<{ name: string }> | null;
  }>) {
    if (!inPeriod(row.awarded_at, period)) continue;
    const key = row.campus_id ?? "unscoped";
    const campusName = row.campus ? (Array.isArray(row.campus) ? (row.campus[0]?.name ?? "Unknown campus") : row.campus.name) : "Unknown campus";
    const current = counts.get(key) ?? {
      campusId: row.campus_id,
      campusName,
      awardeeCount: 0,
    };
    current.awardeeCount += 1;
    counts.set(key, current);
  }

  return Array.from(counts.values()).sort((a, b) => b.awardeeCount - a.awardeeCount);
}

