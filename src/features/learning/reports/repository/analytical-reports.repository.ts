import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { CompletionKpiDailyRow, DeliveryLoadMonthlyRow } from "@/features/learning/reports/types";

export async function listCompletionKpiDaily(context?: AuthorizationContext): Promise<CompletionKpiDailyRow[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("mv_ld_completion_kpis_daily")
    .select("metric_date, campus_id, program_id, participant_count, completed_count, attended_count")
    .order("metric_date", { ascending: false })
    .limit(365);
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    metric_date: string;
    campus_id: string;
    program_id: string;
    participant_count: number | string;
    completed_count: number | string;
    attended_count: number | string;
  }>).map((row) => ({
    metricDate: row.metric_date,
    campusId: row.campus_id,
    programId: row.program_id,
    participantCount: Number(row.participant_count),
    completedCount: Number(row.completed_count),
    attendedCount: Number(row.attended_count),
  }));
}

export async function listDeliveryLoadMonthly(context?: AuthorizationContext): Promise<DeliveryLoadMonthlyRow[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("mv_ld_delivery_load_monthly")
    .select("metric_month, campus_id, program_id, session_count, planned_capacity, enrolled_count")
    .order("metric_month", { ascending: false })
    .limit(60);
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    metric_month: string;
    campus_id: string;
    program_id: string;
    session_count: number | string;
    planned_capacity: number | string;
    enrolled_count: number | string;
  }>).map((row) => ({
    metricMonth: row.metric_month,
    campusId: row.campus_id,
    programId: row.program_id,
    sessionCount: Number(row.session_count),
    plannedCapacity: Number(row.planned_capacity),
    enrolledCount: Number(row.enrolled_count),
  }));
}
