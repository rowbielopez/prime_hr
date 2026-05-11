import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import type { LearningDashboardSummary } from "@/features/learning/types";

export async function getLearningDashboardSummary(context?: AuthorizationContext): Promise<LearningDashboardSummary> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const in90 = new Date(now);
  in90.setDate(in90.getDate() - 90);

  let programsQuery = supabase
    .from("ld_training_programs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("deleted_at", null);
  if (context && !context.isSuperAdmin && context.campusScopes.length > 0) {
    const ids = context.campusScopes.join(",");
    programsQuery = programsQuery.or(`campus_id.is.null,campus_id.in.(${ids})`);
  }

  let sessionsQuery = supabase
    .from("ld_training_sessions")
    .select("id", { count: "exact", head: true })
    .in("status", ["scheduled", "in_progress"])
    .gte("starts_at", now.toISOString())
    .is("deleted_at", null);
  if (context && !context.isSuperAdmin && context.campusScopes.length > 0) {
    sessionsQuery = sessionsQuery.in("campus_id", context.campusScopes);
  }

  let requestsQuery = supabase
    .from("ld_training_requests")
    .select("id", { count: "exact", head: true })
    .in("status", ["submitted", "under_review"]);
  if (context && !context.isSuperAdmin && context.campusScopes.length > 0) {
    requestsQuery = requestsQuery.in("campus_id", context.campusScopes);
  }

  const completedQuery = supabase
    .from("ld_session_participants")
    .select("id", { count: "exact", head: true })
    .eq("completion", "completed")
    .gte("completed_at", in90.toISOString());

  const [programs, sessions, requests, completed] = await Promise.all([
    programsQuery,
    sessionsQuery,
    requestsQuery,
    completedQuery,
  ]);

  return {
    activePrograms: programs.count ?? 0,
    upcomingSessions: sessions.count ?? 0,
    pendingRequests: requests.count ?? 0,
    completedLast90Days: completed.count ?? 0,
  };
}
