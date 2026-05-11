import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { RequestPipelineRow, SessionUtilizationRow } from "@/features/learning/reports/types";

export async function listRequestPipelineRows(context?: AuthorizationContext): Promise<RequestPipelineRow[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("v_ld_request_pipeline")
    .select("campus_id, campus_name, request_kind, status, request_count")
    .order("campus_name");
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    campus_id: string;
    campus_name: string;
    request_kind: "self_request" | "nomination";
    status: string;
    request_count: number | string;
  }>).map((row) => ({
    campusId: row.campus_id,
    campusName: row.campus_name,
    requestKind: row.request_kind,
    status: row.status,
    requestCount: Number(row.request_count),
  }));
}

export async function listSessionUtilizationRows(context?: AuthorizationContext): Promise<SessionUtilizationRow[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("v_ld_session_utilization")
    .select(
      "session_id, campus_id, campus_name, session_title, starts_at, capacity, status, participant_count, attended_count, absent_count, completed_count"
    )
    .order("starts_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    session_id: string;
    campus_id: string;
    campus_name: string;
    session_title: string;
    starts_at: string;
    capacity: number | null;
    status: string;
    participant_count: number | string;
    attended_count: number | string;
    absent_count: number | string;
    completed_count: number | string;
  }>).map((row) => ({
    sessionId: row.session_id,
    campusId: row.campus_id,
    campusName: row.campus_name,
    sessionTitle: row.session_title,
    startsAt: row.starts_at,
    capacity: row.capacity,
    status: row.status,
    participantCount: Number(row.participant_count),
    attendedCount: Number(row.attended_count),
    absentCount: Number(row.absent_count),
    completedCount: Number(row.completed_count),
  }));
}
