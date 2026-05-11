import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { PerformanceFinalSummaryRow, PerformanceRatingBand, PerformanceRecordStatus } from "@/features/performance/types";
import type { PerformanceRecordDraftInput, PerformanceReviewDecisionInput } from "@/features/performance/schemas/record-form.schema";

export type PerformanceRecordListItem = {
  id: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  campusId: string;
  campusName: string;
  status: PerformanceRecordStatus;
  updatedAt: string;
};

export type PerformanceRecordDetail = {
  id: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  status: PerformanceRecordStatus;
  employeeComments: string | null;
  finalScore: number | null;
  finalRating: PerformanceRatingBand | null;
  finalizerComments: string | null;
  finalizedAt: string | null;
  objectives: Array<{
    id: string;
    title: string;
    metric: string | null;
    targetValue: string | null;
    weight: number;
    reviewerScore: number | null;
    accomplishments: Array<{
      id: string;
      periodDate: string;
      accomplishmentText: string;
      evidenceLink: string | null;
    }>;
  }>;
  reviews: Array<{
    id: string;
    decision: "approve" | "request_revision" | "reject";
    comments: string | null;
    reviewerName: string;
    createdAt: string;
  }>;
};

export type PerformanceStatusHistoryItem = {
  id: string;
  fromStatus: PerformanceRecordStatus | null;
  toStatus: PerformanceRecordStatus;
  changedAt: string;
  changedByUserId: string | null;
  changedByName: string | null;
};

export type PerformanceFinalizationHistoryItem = {
  id: string;
  finalizedAt: string;
  finalScore: number;
  finalRating: PerformanceRatingBand;
  finalizerComments: string | null;
  snapshotAt: string;
  finalizedByUserId: string | null;
  finalizedByName: string | null;
};

async function employeeMapByIds(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  if (ids.length === 0) return new Map<string, { name: string; no: string }>();
  const { data } = await supabase
    .from("employees")
    .select("id, employee_no, first_name, middle_name, last_name, suffix")
    .in("id", ids);
  return new Map(
    ((data ?? []) as Array<{
      id: string;
      employee_no: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      suffix: string | null;
    }>).map((row) => [
      row.id,
      {
        name: [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(" "),
        no: row.employee_no,
      },
    ])
  );
}

async function appUserNameMapByIds(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("app_users")
    .select("id, first_name, middle_name, last_name, suffix, email")
    .in("id", ids);
  return new Map(
    ((data ?? []) as Array<{
      id: string;
      first_name: string | null;
      middle_name: string | null;
      last_name: string | null;
      suffix: string | null;
      email: string | null;
    }>).map((row) => {
      const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(" ").trim();
      return [row.id, fullName || row.email || row.id];
    })
  );
}

export async function listMyPerformanceRecords(employeeId: string): Promise<PerformanceRecordListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("performance_records")
    .select("id, cycle_id, employee_id, campus_id, status, updated_at, cycle:performance_cycles(name), campus:campuses(name)")
    .eq("employee_id", employeeId)
    .order("updated_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    cycle_id: string;
    employee_id: string;
    campus_id: string;
    status: PerformanceRecordStatus;
    updated_at: string;
    cycle: { name: string } | Array<{ name: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
  }>;
  const emps = await employeeMapByIds([employeeId]);
  const e = emps.get(employeeId);
  return rows.map((row) => ({
    id: row.id,
    cycleId: row.cycle_id,
    cycleName: row.cycle ? (Array.isArray(row.cycle) ? row.cycle[0]?.name ?? "?" : row.cycle.name) : "?",
    employeeId: row.employee_id,
    employeeName: e?.name ?? "?",
    employeeNo: e?.no ?? "?",
    campusId: row.campus_id,
    campusName: row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "?" : row.campus.name) : "?",
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export async function listReviewQueueRecords(context?: AuthorizationContext): Promise<PerformanceRecordListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_records")
    .select("id, cycle_id, employee_id, campus_id, status, updated_at, cycle:performance_cycles(name), campus:campuses(name)")
    .in("status", ["submitted", "under_review"])
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    cycle_id: string;
    employee_id: string;
    campus_id: string;
    status: PerformanceRecordStatus;
    updated_at: string;
    cycle: { name: string } | Array<{ name: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
  }>;
  const empMap = await employeeMapByIds([...new Set(rows.map((r) => r.employee_id))]);
  return rows.map((row) => {
    const e = empMap.get(row.employee_id);
    return {
      id: row.id,
      cycleId: row.cycle_id,
      cycleName: row.cycle ? (Array.isArray(row.cycle) ? row.cycle[0]?.name ?? "?" : row.cycle.name) : "?",
      employeeId: row.employee_id,
      employeeName: e?.name ?? "?",
      employeeNo: e?.no ?? "?",
      campusId: row.campus_id,
      campusName: row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "?" : row.campus.name) : "?",
      status: row.status,
      updatedAt: row.updated_at,
    };
  });
}

export async function getPerformanceRecordById(recordId: string, context?: AuthorizationContext): Promise<PerformanceRecordDetail | null> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_records")
    .select("id, cycle_id, employee_id, status, employee_comments, final_score, final_rating, finalizer_comments, finalized_at, cycle:performance_cycles(name)")
    .eq("id", recordId);
  const { data, error } = await applyAuthorizationScope(base, context).maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    cycle_id: string;
    employee_id: string;
    status: PerformanceRecordStatus;
    employee_comments: string | null;
    final_score: number | string | null;
    final_rating: PerformanceRatingBand | null;
    finalizer_comments: string | null;
    finalized_at: string | null;
    cycle: { name: string } | Array<{ name: string }> | null;
  };
  const empMap = await employeeMapByIds([row.employee_id]);
  const e = empMap.get(row.employee_id);
  const { data: objectives } = await supabase
    .from("performance_objectives")
    .select("id, title, metric, target_value, weight, reviewer_score")
    .eq("record_id", recordId)
    .order("created_at", { ascending: true });
  const objectiveRows = (objectives ?? []) as Array<{
    id: string;
    title: string;
    metric: string | null;
    target_value: string | null;
    weight: number | string;
    reviewer_score: number | string | null;
  }>;
  const objectiveIds = objectiveRows.map((o) => o.id);
  const { data: accomplishments } = objectiveIds.length
    ? await supabase
        .from("performance_accomplishments")
        .select("id, objective_id, period_date, accomplishment_text, evidence_link")
        .in("objective_id", objectiveIds)
        .order("period_date", { ascending: false })
    : { data: [] as never[] };
  const grouped = new Map<string, Array<{ id: string; periodDate: string; accomplishmentText: string; evidenceLink: string | null }>>();
  for (const row2 of (accomplishments ?? []) as Array<{
    id: string;
    objective_id: string;
    period_date: string;
    accomplishment_text: string;
    evidence_link: string | null;
  }>) {
    if (!grouped.has(row2.objective_id)) grouped.set(row2.objective_id, []);
    grouped.get(row2.objective_id)?.push({
      id: row2.id,
      periodDate: row2.period_date,
      accomplishmentText: row2.accomplishment_text,
      evidenceLink: row2.evidence_link,
    });
  }
  const { data: reviews } = await supabase
    .from("performance_reviews")
    .select("id, reviewer_employee_id, decision, comments, created_at")
    .eq("record_id", recordId)
    .order("created_at", { ascending: false });
  const reviewerIds = [...new Set(((reviews ?? []) as Array<{ reviewer_employee_id: string }>).map((r) => r.reviewer_employee_id))];
  const reviewers = await employeeMapByIds(reviewerIds);
  return {
    id: row.id,
    cycleId: row.cycle_id,
    cycleName: row.cycle ? (Array.isArray(row.cycle) ? row.cycle[0]?.name ?? "?" : row.cycle.name) : "?",
    employeeId: row.employee_id,
    employeeName: e?.name ?? "?",
    employeeNo: e?.no ?? "?",
    status: row.status,
    employeeComments: row.employee_comments,
    finalScore: row.final_score == null ? null : Number(row.final_score),
    finalRating: row.final_rating,
    finalizerComments: row.finalizer_comments,
    finalizedAt: row.finalized_at,
    objectives: objectiveRows.map((obj) => ({
      id: obj.id,
      title: obj.title,
      metric: obj.metric,
      targetValue: obj.target_value,
      weight: Number(obj.weight),
      reviewerScore: obj.reviewer_score == null ? null : Number(obj.reviewer_score),
      accomplishments: grouped.get(obj.id) ?? [],
    })),
    reviews: ((reviews ?? []) as Array<{
      id: string;
      reviewer_employee_id: string;
      decision: "approve" | "request_revision" | "reject";
      comments: string | null;
      created_at: string;
    }>).map((rev) => ({
      id: rev.id,
      decision: rev.decision,
      comments: rev.comments,
      reviewerName: reviewers.get(rev.reviewer_employee_id)?.name ?? "?",
      createdAt: rev.created_at,
    })),
  };
}

export async function getPerformanceRecordScopeById(recordId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("performance_records")
    .select("id, campus_id, office_id, employee_id, supervisor_employee_id, reviewer_employee_id, status")
    .eq("id", recordId)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    campus_id: string;
    office_id: string | null;
    employee_id: string;
    supervisor_employee_id: string | null;
    reviewer_employee_id: string | null;
    status: PerformanceRecordStatus;
  };
}

export async function updatePerformanceRecordDraft(recordId: string, input: PerformanceRecordDraftInput) {
  const supabase = await createSupabaseServerClient();
  const { error: recordErr } = await supabase
    .from("performance_records")
    .update({ employee_comments: input.employeeComments?.trim() ? input.employeeComments.trim() : null } as never)
    .eq("id", recordId);
  if (recordErr) return { ok: false, error: recordErr.message };

  const { data: existingObjectives } = await supabase.from("performance_objectives").select("id").eq("record_id", recordId);
  const existingObjectiveIds = ((existingObjectives ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (existingObjectiveIds.length > 0) {
    await supabase.from("performance_accomplishments").delete().in("objective_id", existingObjectiveIds);
  }
  await supabase.from("performance_objectives").delete().eq("record_id", recordId);

  const { data: insertedObjectives, error: objErr } = await supabase
    .from("performance_objectives")
    .insert(
      input.objectives.map((row) => ({
        record_id: recordId,
        title: row.title.trim(),
        metric: row.metric?.trim() ? row.metric.trim() : null,
        target_value: row.targetValue?.trim() ? row.targetValue.trim() : null,
        weight: row.weight,
      })) as never
    )
    .select("id");
  if (objErr) return { ok: false, error: objErr.message };
  const objectiveIdList = (insertedObjectives ?? []) as Array<{ id: string }>;
  const accomplishmentPayload: Array<{
    objective_id: string;
    period_date: string;
    accomplishment_text: string;
    evidence_link: string | null;
  }> = [];
  input.objectives.forEach((obj, idx) => {
    const objectiveId = objectiveIdList[idx]?.id;
    if (!objectiveId) return;
    obj.accomplishments.forEach((acc) => {
      accomplishmentPayload.push({
        objective_id: objectiveId,
        period_date: acc.periodDate,
        accomplishment_text: acc.accomplishmentText.trim(),
        evidence_link: acc.evidenceLink?.trim() ? acc.evidenceLink.trim() : null,
      });
    });
  });
  if (accomplishmentPayload.length > 0) {
    const { error: accErr } = await supabase.from("performance_accomplishments").insert(accomplishmentPayload as never);
    if (accErr) return { ok: false, error: accErr.message };
  }
  return { ok: true as const };
}

export async function updatePerformanceRecordStatus(recordId: string, status: PerformanceRecordStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("performance_records").update({ status } as never).eq("id", recordId);
  return { ok: !error, error: error?.message };
}

export async function setPerformanceObjectiveReviewerScores(
  recordId: string,
  rows: Array<{ objectiveId: string; reviewerScore: number }>
) {
  const supabase = await createSupabaseServerClient();
  const { data: objectives, error: objErr } = await supabase
    .from("performance_objectives")
    .select("id")
    .eq("record_id", recordId);
  if (objErr) return { ok: false, error: objErr.message };
  const validIds = new Set(((objectives ?? []) as Array<{ id: string }>).map((o) => o.id));
  for (const row of rows) {
    if (!validIds.has(row.objectiveId)) return { ok: false, error: "Objective does not belong to this record." };
  }
  for (const row of rows) {
    const { error } = await supabase
      .from("performance_objectives")
      .update({ reviewer_score: row.reviewerScore } as never)
      .eq("id", row.objectiveId)
      .eq("record_id", recordId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true as const };
}

export async function finalizePerformanceRecord(input: {
  recordId: string;
  finalScore: number;
  finalRating: PerformanceRatingBand;
  finalizerComments: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("performance_records")
    .update({
      final_score: input.finalScore,
      final_rating: input.finalRating,
      finalizer_comments: input.finalizerComments,
      status: "finalized",
    } as never)
    .eq("id", input.recordId);
  return { ok: !error, error: error?.message };
}

export async function createPerformanceRecordForEmployee(input: {
  cycleId: string;
  employeeId: string;
  campusId: string;
  officeId: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("performance_records")
    .insert({
      cycle_id: input.cycleId,
      employee_id: input.employeeId,
      campus_id: input.campusId,
      office_id: input.officeId,
      status: "draft",
    } as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, recordId: (data as { id: string } | null)?.id ?? null };
}

export async function addPerformanceReview(
  recordId: string,
  reviewerEmployeeId: string,
  input: PerformanceReviewDecisionInput
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("performance_reviews").insert({
    record_id: recordId,
    reviewer_employee_id: reviewerEmployeeId,
    decision: input.decision,
    comments: input.comments?.trim() ? input.comments.trim() : null,
  } as never);
  return { ok: !error, error: error?.message };
}

export async function listFinalizationQueueRecords(context?: AuthorizationContext): Promise<PerformanceRecordListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_records")
    .select("id, cycle_id, employee_id, campus_id, status, updated_at, cycle:performance_cycles(name), campus:campuses(name)")
    .eq("status", "approved")
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    cycle_id: string;
    employee_id: string;
    campus_id: string;
    status: PerformanceRecordStatus;
    updated_at: string;
    cycle: { name: string } | Array<{ name: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
  }>;
  const empMap = await employeeMapByIds([...new Set(rows.map((r) => r.employee_id))]);
  return rows.map((row) => ({
    id: row.id,
    cycleId: row.cycle_id,
    cycleName: row.cycle ? (Array.isArray(row.cycle) ? row.cycle[0]?.name ?? "?" : row.cycle.name) : "?",
    employeeId: row.employee_id,
    employeeName: empMap.get(row.employee_id)?.name ?? "?",
    employeeNo: empMap.get(row.employee_id)?.no ?? "?",
    campusId: row.campus_id,
    campusName: row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "?" : row.campus.name) : "?",
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export async function listFinalizedSummaryRows(context?: AuthorizationContext): Promise<PerformanceFinalSummaryRow[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_records")
    .select("id, cycle_id, employee_id, campus_id, final_score, final_rating, finalized_at, cycle:performance_cycles(name), campus:campuses(name)")
    .eq("status", "finalized")
    .order("finalized_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    cycle_id: string;
    employee_id: string;
    campus_id: string;
    final_score: number | string | null;
    final_rating: PerformanceRatingBand | null;
    finalized_at: string | null;
    cycle: { name: string } | Array<{ name: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
  }>;
  const empMap = await employeeMapByIds([...new Set(rows.map((r) => r.employee_id))]);
  const mapped = rows
    .filter((row) => row.final_score != null && row.final_rating && row.finalized_at)
    .map((row) => ({
      id: row.id,
      cycleId: row.cycle_id,
      cycleName: row.cycle ? (Array.isArray(row.cycle) ? row.cycle[0]?.name ?? "?" : row.cycle.name) : "?",
      employeeId: row.employee_id,
      employeeName: empMap.get(row.employee_id)?.name ?? "?",
      employeeNo: empMap.get(row.employee_id)?.no ?? "?",
      campusName: row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "?" : row.campus.name) : "?",
      finalScore: Number(row.final_score),
      finalRating: row.final_rating as PerformanceRatingBand,
      finalizedAt: row.finalized_at as string,
      latestSnapshotAt: null,
      snapshotCount: 0,
    }));
  const recordIds = mapped.map((row) => row.id);
  if (recordIds.length === 0) return mapped;
  const { data: historyRows } = await supabase
    .from("performance_finalization_history")
    .select("record_id, snapshot_at")
    .in("record_id", recordIds)
    .order("snapshot_at", { ascending: false });
  const snapshotMap = new Map<string, { latestSnapshotAt: string | null; snapshotCount: number }>();
  for (const row of (historyRows ?? []) as Array<{ record_id: string; snapshot_at: string }>) {
    const existing = snapshotMap.get(row.record_id);
    if (!existing) {
      snapshotMap.set(row.record_id, { latestSnapshotAt: row.snapshot_at, snapshotCount: 1 });
    } else {
      existing.snapshotCount += 1;
    }
  }
  return mapped.map((row) => {
    const snap = snapshotMap.get(row.id);
    return {
      ...row,
      latestSnapshotAt: snap?.latestSnapshotAt ?? null,
      snapshotCount: snap?.snapshotCount ?? 0,
    };
  });
}

export async function listFinalizationHistoryByRecordId(
  recordId: string,
  context?: AuthorizationContext
): Promise<PerformanceFinalizationHistoryItem[]> {
  const supabase = await createSupabaseServerClient();
  const access = await getPerformanceRecordById(recordId, context);
  if (!access) return [];
  const { data, error } = await supabase
    .from("performance_finalization_history")
    .select("id, finalized_at, final_score, final_rating, finalizer_comments, snapshot_at, finalized_by_user_id")
    .eq("record_id", recordId)
    .order("snapshot_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    finalized_at: string;
    final_score: number | string;
    final_rating: PerformanceRatingBand;
    finalizer_comments: string | null;
    snapshot_at: string;
    finalized_by_user_id: string | null;
  }>;
  const nameMap = await appUserNameMapByIds(
    [...new Set(rows.map((row) => row.finalized_by_user_id).filter(Boolean))] as string[]
  );
  return rows.map((row) => ({
    id: row.id,
    finalizedAt: row.finalized_at,
    finalScore: Number(row.final_score),
    finalRating: row.final_rating,
    finalizerComments: row.finalizer_comments,
    snapshotAt: row.snapshot_at,
    finalizedByUserId: row.finalized_by_user_id,
    finalizedByName: row.finalized_by_user_id ? (nameMap.get(row.finalized_by_user_id) ?? row.finalized_by_user_id) : null,
  }));
}

export async function listPerformanceStatusHistoryByRecordId(
  recordId: string,
  context?: AuthorizationContext
): Promise<PerformanceStatusHistoryItem[]> {
  const supabase = await createSupabaseServerClient();
  const access = await getPerformanceRecordById(recordId, context);
  if (!access) return [];
  const { data, error } = await supabase
    .from("performance_status_history")
    .select("id, from_status, to_status, changed_at, changed_by_user_id")
    .eq("record_id", recordId)
    .order("changed_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    from_status: PerformanceRecordStatus | null;
    to_status: PerformanceRecordStatus;
    changed_at: string;
    changed_by_user_id: string | null;
  }>;
  const nameMap = await appUserNameMapByIds(
    [...new Set(rows.map((row) => row.changed_by_user_id).filter(Boolean))] as string[]
  );
  return rows.map((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at,
    changedByUserId: row.changed_by_user_id,
    changedByName: row.changed_by_user_id ? (nameMap.get(row.changed_by_user_id) ?? row.changed_by_user_id) : null,
  }));
}

export async function listPerformanceManagementRecords(context?: AuthorizationContext): Promise<PerformanceRecordListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_records")
    .select("id, cycle_id, employee_id, campus_id, status, updated_at, cycle:performance_cycles(name), campus:campuses(name)")
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    cycle_id: string;
    employee_id: string;
    campus_id: string;
    status: PerformanceRecordStatus;
    updated_at: string;
    cycle: { name: string } | Array<{ name: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
  }>;
  const empMap = await employeeMapByIds([...new Set(rows.map((r) => r.employee_id))]);
  return rows.map((row) => ({
    id: row.id,
    cycleId: row.cycle_id,
    cycleName: row.cycle ? (Array.isArray(row.cycle) ? row.cycle[0]?.name ?? "?" : row.cycle.name) : "?",
    employeeId: row.employee_id,
    employeeName: empMap.get(row.employee_id)?.name ?? "?",
    employeeNo: empMap.get(row.employee_id)?.no ?? "?",
    campusId: row.campus_id,
    campusName: row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "?" : row.campus.name) : "?",
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export type PerformanceCycleRecordStats = {
  total: number;
  byStatus: Partial<Record<PerformanceRecordStatus, number>>;
};

export async function getPerformanceCycleRecordStats(
  cycleId: string,
  context?: AuthorizationContext
): Promise<PerformanceCycleRecordStats | null> {
  const supabase = await createSupabaseServerClient();
  const base = supabase.from("performance_records").select("id, status").eq("cycle_id", cycleId);
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return null;
  const rows = (data ?? []) as Array<{ status: PerformanceRecordStatus }>;
  const byStatus: Partial<Record<PerformanceRecordStatus, number>> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }
  return { total: rows.length, byStatus };
}

export async function listPerformanceRecordsByCycleId(
  cycleId: string,
  context?: AuthorizationContext,
  limit = 50
): Promise<PerformanceRecordListItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("performance_records")
    .select("id, cycle_id, employee_id, campus_id, status, updated_at, cycle:performance_cycles(name), campus:campuses(name)")
    .eq("cycle_id", cycleId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    cycle_id: string;
    employee_id: string;
    campus_id: string;
    status: PerformanceRecordStatus;
    updated_at: string;
    cycle: { name: string } | Array<{ name: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
  }>;
  const empMap = await employeeMapByIds([...new Set(rows.map((r) => r.employee_id))]);
  return rows.map((row) => ({
    id: row.id,
    cycleId: row.cycle_id,
    cycleName: row.cycle ? (Array.isArray(row.cycle) ? row.cycle[0]?.name ?? "?" : row.cycle.name) : "?",
    employeeId: row.employee_id,
    employeeName: empMap.get(row.employee_id)?.name ?? "?",
    employeeNo: empMap.get(row.employee_id)?.no ?? "?",
    campusId: row.campus_id,
    campusName: row.campus ? (Array.isArray(row.campus) ? row.campus[0]?.name ?? "?" : row.campus.name) : "?",
    status: row.status,
    updatedAt: row.updated_at,
  }));
}
