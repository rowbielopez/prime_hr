import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ParticipantAddInput, ParticipantUpdateInput } from "@/features/learning/participants/schemas/participant-form.schema";
import type {
  CompletionStatus,
  MyTrainingRow,
  ProgramParticipantOverviewRow,
  SessionParticipantRow,
  TrainingHistoryRow,
} from "@/features/learning/types";

export async function listSessionParticipants(sessionId: string): Promise<SessionParticipantRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ld_session_participants")
    .select("id, employee_id, source, attendance, completion, completed_at, notes")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    employee_id: string;
    source: SessionParticipantRow["source"];
    attendance: SessionParticipantRow["attendance"];
    completion: SessionParticipantRow["completion"];
    completed_at: string | null;
    notes: string | null;
  }>;
  const empIds = [...new Set(rows.map((r) => r.employee_id))];
  const { data: emps } = await supabase
    .from("employees")
    .select("id, employee_no, first_name, middle_name, last_name, suffix")
    .in("id", empIds);
  const map = new Map(
    ((emps ?? []) as Array<{
      id: string;
      employee_no: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      suffix: string | null;
    }>).map((e) => [
      e.id,
      {
        name: [e.first_name, e.middle_name, e.last_name, e.suffix].filter(Boolean).join(" "),
        no: e.employee_no,
      },
    ])
  );
  return rows.map((row) => {
    const e = map.get(row.employee_id);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: e?.name ?? "?",
      employeeNo: e?.no ?? "?",
      source: row.source,
      attendance: row.attendance,
      completion: row.completion,
      completedAt: row.completed_at,
      notes: row.notes,
    };
  });
}

export async function listParticipantsForProgramOverview(programId: string): Promise<ProgramParticipantOverviewRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: sessions, error: sErr } = await supabase
    .from("ld_training_sessions")
    .select("id, title, starts_at")
    .eq("program_id", programId)
    .is("deleted_at", null);
  if (sErr || !sessions?.length) return [];
  const sessionMeta = new Map(
    (sessions as { id: string; title: string; starts_at: string }[]).map((s) => [s.id, { title: s.title, startsAt: s.starts_at }])
  );
  const sessionIds = [...sessionMeta.keys()];
  const { data: parts, error: pErr } = await supabase
    .from("ld_session_participants")
    .select("id, session_id, employee_id, source, attendance, completion, completed_at, notes")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });
  if (pErr || !parts?.length) return [];
  const rows = parts as Array<{
    id: string;
    session_id: string;
    employee_id: string;
    source: ProgramParticipantOverviewRow["source"];
    attendance: ProgramParticipantOverviewRow["attendance"];
    completion: ProgramParticipantOverviewRow["completion"];
    completed_at: string | null;
    notes: string | null;
  }>;
  const empIds = [...new Set(rows.map((r) => r.employee_id))];
  const { data: emps } = await supabase
    .from("employees")
    .select("id, employee_no, first_name, middle_name, last_name, suffix")
    .in("id", empIds);
  const empMap = new Map(
    ((emps ?? []) as Array<{
      id: string;
      employee_no: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      suffix: string | null;
    }>).map((e) => [
      e.id,
      {
        name: [e.first_name, e.middle_name, e.last_name, e.suffix].filter(Boolean).join(" "),
        no: e.employee_no,
      },
    ])
  );
  const mapped = rows.map((row) => {
    const meta = sessionMeta.get(row.session_id);
    const e = empMap.get(row.employee_id);
    return {
      participantId: row.id,
      sessionId: row.session_id,
      sessionTitle: meta?.title ?? "?",
      sessionStartsAt: meta?.startsAt ?? "",
      employeeName: e?.name ?? "?",
      employeeNo: e?.no ?? "?",
      source: row.source,
      attendance: row.attendance,
      completion: row.completion,
      completedAt: row.completed_at,
      remarks: row.notes,
    };
  });
  mapped.sort((a, b) => {
    const t = new Date(b.sessionStartsAt).getTime() - new Date(a.sessionStartsAt).getTime();
    if (t !== 0) return t;
    return a.employeeName.localeCompare(b.employeeName);
  });
  return mapped;
}

export async function addSessionParticipant(sessionId: string, input: ParticipantAddInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_session_participants").insert({
    session_id: sessionId,
    employee_id: input.employeeId,
    source: input.source,
  } as never);
  return { ok: !error, error: error?.message };
}

export async function updateSessionParticipant(participantId: string, input: ParticipantUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("ld_session_participants")
    .select("completed_at, completion")
    .eq("id", participantId)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  const prev = existing as { completed_at: string | null; completion: string } | null;
  let completedAt: string | null = null;
  if (input.completion === "completed") {
    completedAt =
      prev?.completion === "completed" && prev.completed_at ? prev.completed_at : new Date().toISOString();
  }
  const { error } = await supabase
    .from("ld_session_participants")
    .update({
      attendance: input.attendance,
      completion: input.completion,
      completed_at: completedAt,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    } as never)
    .eq("id", participantId);
  return { ok: !error, error: error?.message };
}

export async function removeSessionParticipant(participantId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ld_session_participants").delete().eq("id", participantId);
  return { ok: !error, error: error?.message };
}

export type EmployeeTrainingHistoryFilters = {
  year?: number;
  completion?: CompletionStatus | "all";
};

async function fetchTrainingHistoryRows(employeeId: string): Promise<TrainingHistoryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: parts, error } = await supabase
    .from("ld_session_participants")
    .select("id, session_id, attendance, completion, completed_at, notes")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error || !parts?.length) return [];
  const sessionIds = [...new Set((parts as { session_id: string }[]).map((p) => p.session_id))];
  const { data: sessions } = await supabase
    .from("ld_training_sessions")
    .select("id, title, starts_at, ends_at, program_id, campus:campuses(name), program:ld_training_programs(title)")
    .in("id", sessionIds);
  type SessionMini = {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    program_id: string;
    campus: { name: string } | Array<{ name: string }> | null;
    program: { title: string } | Array<{ title: string }> | null;
  };
  const sMap = new Map((sessions as SessionMini[] | null)?.map((s) => [s.id, s]) ?? []);
  return (parts as Array<{
    id: string;
    session_id: string;
    attendance: TrainingHistoryRow["attendance"];
    completion: TrainingHistoryRow["completion"];
    completed_at: string | null;
    notes: string | null;
  }>).map((row) => {
    const s = sMap.get(row.session_id);
    const campusName = s?.campus
      ? Array.isArray(s.campus)
        ? (s.campus[0]?.name ?? "?")
        : s.campus.name
      : "?";
    const programTitle = s?.program
      ? Array.isArray(s.program)
        ? (s.program[0]?.title ?? "?")
        : s.program.title
      : "?";
    return {
      id: row.id,
      sessionId: row.session_id,
      programId: s?.program_id ?? "",
      sessionTitle: s?.title ?? "?",
      programTitle,
      campusName,
      startsAt: s?.starts_at ?? "",
      endsAt: s?.ends_at ?? "",
      attendance: row.attendance,
      completion: row.completion,
      completedAt: row.completed_at,
      notes: row.notes,
    };
  });
}

function applyTrainingHistoryFilters(
  rows: TrainingHistoryRow[],
  filters?: EmployeeTrainingHistoryFilters
): TrainingHistoryRow[] {
  let out = rows;
  if (filters?.year !== undefined && !Number.isNaN(filters.year)) {
    out = out.filter((r) => new Date(r.startsAt).getFullYear() === filters.year);
  }
  if (filters?.completion && filters.completion !== "all") {
    out = out.filter((r) => r.completion === filters.completion);
  }
  return out;
}

/** One load: distinct calendar years in data + filtered rows (for employee training history page). */
export async function getEmployeeTrainingHistoryView(
  employeeId: string,
  filters?: EmployeeTrainingHistoryFilters
): Promise<{ years: number[]; rows: TrainingHistoryRow[] }> {
  const all = await fetchTrainingHistoryRows(employeeId);
  const years = [...new Set(all.map((r) => new Date(r.startsAt).getFullYear()))].sort((a, b) => b - a);
  const rows = applyTrainingHistoryFilters(all, filters);
  return { years, rows };
}

export async function listMyTrainingHistory(employeeId: string): Promise<MyTrainingRow[]> {
  const { rows } = await getEmployeeTrainingHistoryView(employeeId);
  return rows;
}
