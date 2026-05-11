import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { SessionFormInput } from "@/features/learning/sessions/schemas/session-form.schema";
import type { TrainingSessionDetail, TrainingSessionListItem } from "@/features/learning/types";

type SessionRow = {
  id: string;
  program_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  campus_id: string;
  capacity: number | null;
  status: TrainingSessionListItem["status"];
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  program: { title: string } | Array<{ title: string }> | null;
};

function resolveName(input: { name: string } | Array<{ name: string }> | null) {
  if (!input) return null;
  return Array.isArray(input) ? (input[0]?.name ?? null) : input.name;
}

function programTitle(row: SessionRow) {
  const p = row.program;
  if (!p) return "?";
  return Array.isArray(p) ? (p[0]?.title ?? "?") : p.title;
}

function mapList(row: SessionRow): TrainingSessionListItem {
  return {
    id: row.id,
    title: row.title,
    programId: row.program_id,
    programTitle: programTitle(row),
    campusId: row.campus_id,
    campusName: resolveName(row.campus) ?? "Unknown",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venue: row.venue,
    capacity: row.capacity,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function buildPayload(input: SessionFormInput) {
  return {
    program_id: input.programId,
    title: input.title.trim(),
    campus_id: input.campusId,
    venue: input.venue?.trim() ? input.venue.trim() : null,
    capacity: input.capacity ?? null,
    status: input.status,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  };
}

export async function listTrainingSessions(context?: AuthorizationContext): Promise<TrainingSessionListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("ld_training_sessions")
    .select(
      "id, program_id, title, starts_at, ends_at, venue, campus_id, capacity, status, updated_at, campus:campuses(name), program:ld_training_programs(title)"
    )
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return ((data ?? []) as SessionRow[]).map(mapList);
}

export async function listTrainingSessionsForProgram(
  programId: string,
  context?: AuthorizationContext
): Promise<TrainingSessionListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("ld_training_sessions")
    .select(
      "id, program_id, title, starts_at, ends_at, venue, campus_id, capacity, status, updated_at, campus:campuses(name), program:ld_training_programs(title)"
    )
    .eq("program_id", programId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return ((data ?? []) as SessionRow[]).map(mapList);
}

export async function getParticipantCountsBySessionIds(sessionIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (sessionIds.length === 0) return map;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("ld_session_participants").select("session_id").in("session_id", sessionIds);
  if (error || !data) return map;
  for (const row of data as { session_id: string }[]) {
    map.set(row.session_id, (map.get(row.session_id) ?? 0) + 1);
  }
  return map;
}

export async function getTrainingSessionById(
  sessionId: string,
  context?: AuthorizationContext
): Promise<TrainingSessionDetail | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("ld_training_sessions")
    .select(
      "id, program_id, title, starts_at, ends_at, venue, campus_id, capacity, status, updated_at, campus:campuses(name), program:ld_training_programs(title)"
    )
    .eq("id", sessionId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(baseQuery, context).maybeSingle();
  if (error || !data) return null;
  const row = data as SessionRow;
  const supabase2 = await createSupabaseServerClient();
  const { count } = await supabase2
    .from("ld_session_participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  return {
    ...mapList(row),
    participantCount: count ?? 0,
  };
}

export async function getTrainingSessionScopeById(sessionId: string): Promise<{ campusId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_training_sessions")
    .select("campus_id")
    .eq("id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return { campusId: (data as { campus_id: string }).campus_id };
}

export async function createTrainingSession(input: SessionFormInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_training_sessions")
    .insert(buildPayload(input) as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, sessionId: (data as { id: string } | null)?.id ?? null };
}

export async function updateTrainingSession(sessionId: string, input: SessionFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_training_sessions").update(buildPayload(input) as never).eq("id", sessionId);
  return { ok: !error, error: error?.message };
}
