import type { Database } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { EvidenceFormInput } from "@/features/compliance/evidence/schemas/evidence-form.schema";
import type { EvidenceActionPlanInput, EvidenceAttachmentInput } from "@/features/compliance/evidence/schemas/evidence-attachment.schema";
import type {
  EvidenceStatus,
  EvidenceDetail,
  EvidenceListItem,
  PrimeArea,
  ComplianceIndicator,
  DeletedEvidenceAttachmentItem,
  ActionPlanHistoryEvent,
} from "@/features/compliance/evidence/types";

type EvidenceRow = {
  id: string;
  title: string;
  description: string | null;
  area_id: string;
  indicator_id: string;
  campus_id: string;
  office_id: string | null;
  reporting_period: string;
  due_date: string | null;
  owner_user_id: string | null;
  status: EvidenceStatus;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  reviewer_remarks: string | null;
  updated_at: string;
  campus: { name: string } | Array<{ name: string }> | null;
  office: { name: string } | Array<{ name: string }> | null;
  area: { name: string } | Array<{ name: string }> | null;
  indicator: { code: string; title: string } | Array<{ code: string; title: string }> | null;
};

function resolveSingle<T>(input: T | T[] | null): T | null {
  if (!input) return null;
  return Array.isArray(input) ? (input[0] ?? null) : input;
}

export async function listPrimeAreas(): Promise<PrimeArea[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_areas")
    .select("id, code, name")
    .is("deleted_at", null)
    .order("code", { ascending: true });
  if (error) return [];
  return (data ?? []) as PrimeArea[];
}

export async function listComplianceIndicators(): Promise<ComplianceIndicator[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_indicators")
    .select("id, area_id, code, title, description, area:compliance_areas(name)")
    .is("deleted_at", null)
    .order("code", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    area_id: string;
    code: string;
    title: string;
    description: string | null;
    area: { name: string } | Array<{ name: string }> | null;
  }>).map((row) => ({
    id: row.id,
    areaId: row.area_id,
    areaName: resolveSingle(row.area)?.name ?? "Unknown Area",
    code: row.code,
    title: row.title,
    description: row.description,
  }));
}

export async function listEvidenceItems(context?: AuthorizationContext): Promise<EvidenceListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("compliance_evidence")
    .select(
      "id, title, area_id, indicator_id, campus_id, office_id, status, due_date, submitted_at, updated_at, campus:campuses(name), office:offices(name), area:compliance_areas(name), indicator:compliance_indicators(code,title)"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  const rows = (data ?? []) as EvidenceRow[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    areaName: resolveSingle(row.area)?.name ?? "Unknown Area",
    indicatorCode: resolveSingle(row.indicator)?.code ?? "N/A",
    indicatorTitle: resolveSingle(row.indicator)?.title ?? "Unknown Indicator",
    campusId: row.campus_id,
    campusName: resolveSingle(row.campus)?.name ?? "Unknown Campus",
    officeId: row.office_id,
    officeName: resolveSingle(row.office)?.name ?? null,
    status: row.status,
    dueDate: row.due_date,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  }));
}

export async function getEvidenceById(evidenceId: string, context?: AuthorizationContext): Promise<EvidenceDetail | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("compliance_evidence")
    .select(
      "id, title, description, area_id, indicator_id, campus_id, office_id, reporting_period, due_date, owner_user_id, status, submitted_at, approved_at, rejected_at, reviewer_remarks, updated_at, campus:campuses(name), office:offices(name), area:compliance_areas(name), indicator:compliance_indicators(code,title)"
    )
    .eq("id", evidenceId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(baseQuery, context).maybeSingle();
  if (error || !data) return null;
  const row = data as EvidenceRow;

  const [attachments, deletedAttachments, actionPlan, actionPlanHistory, statusHistory] = await Promise.all([
    listEvidenceAttachments(evidenceId),
    listDeletedEvidenceAttachments(evidenceId),
    getEvidenceActionPlan(evidenceId),
    listEvidenceActionPlanHistory(evidenceId),
    listEvidenceStatusHistory(evidenceId),
  ]);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    areaId: row.area_id,
    areaName: resolveSingle(row.area)?.name ?? "Unknown Area",
    indicatorId: row.indicator_id,
    indicatorCode: resolveSingle(row.indicator)?.code ?? "N/A",
    indicatorTitle: resolveSingle(row.indicator)?.title ?? "Unknown Indicator",
    campusId: row.campus_id,
    campusName: resolveSingle(row.campus)?.name ?? "Unknown Campus",
    officeId: row.office_id,
    officeName: resolveSingle(row.office)?.name ?? null,
    reportingPeriod: row.reporting_period,
    ownerUserId: row.owner_user_id,
    ownerName: null,
    dueDate: row.due_date,
    status: row.status,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    reviewerRemarks: row.reviewer_remarks,
    attachments,
    deletedAttachments,
    actionPlan,
    actionPlanHistory,
    statusHistory,
  };
}

function normalizeNullable(input?: string | null) {
  if (!input) return null;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function createEvidence(input: EvidenceFormInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    title: input.title.trim(),
    description: normalizeNullable(input.description),
    area_id: input.areaId,
    indicator_id: input.indicatorId,
    campus_id: input.campusId,
    office_id: normalizeNullable(input.officeId),
    reporting_period: input.reportingPeriod,
    due_date: normalizeNullable(input.dueDate),
    owner_user_id: normalizeNullable(input.ownerUserId),
    status: "draft" as EvidenceStatus,
  };
  const { data, error } = await supabase
    .from("compliance_evidence")
    .insert(payload as never)
    .select("id")
    .single();
  if (error) {
    const msg = error.message ?? "";
    if (error.code === "23505" || msg.includes("uq_compliance_evidence_indicator_scope_period")) {
      return {
        ok: false,
        error:
          "An evidence record already exists for this indicator, campus, office (if any), and reporting period.",
        evidenceId: null,
      };
    }
    return { ok: false, error: msg, evidenceId: null };
  }
  return { ok: true, evidenceId: (data as { id: string } | null)?.id ?? null };
}

export async function updateEvidence(evidenceId: string, input: EvidenceFormInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    title: input.title.trim(),
    description: normalizeNullable(input.description),
    area_id: input.areaId,
    indicator_id: input.indicatorId,
    campus_id: input.campusId,
    office_id: normalizeNullable(input.officeId),
    reporting_period: input.reportingPeriod,
    due_date: normalizeNullable(input.dueDate),
    owner_user_id: normalizeNullable(input.ownerUserId),
  };
  const { error } = await supabase.from("compliance_evidence").update(payload as never).eq("id", evidenceId);
  if (error) {
    const msg = error.message ?? "";
    if (error.code === "23505" || msg.includes("uq_compliance_evidence_indicator_scope_period")) {
      return {
        ok: false,
        error:
          "Another evidence record already uses this indicator, campus, office (if any), and reporting period.",
      };
    }
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function getEvidenceMutationContext(
  evidenceId: string
): Promise<{ campusId: string; officeId: string | null; status: EvidenceStatus } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence")
    .select("campus_id, office_id, status")
    .eq("id", evidenceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { campus_id: string; office_id: string | null; status: EvidenceStatus };
  return { campusId: row.campus_id, officeId: row.office_id, status: row.status };
}

export async function getEvidenceScopeById(evidenceId: string): Promise<{ campusId: string; officeId: string | null } | null> {
  const row = await getEvidenceMutationContext(evidenceId);
  if (!row) return null;
  return { campusId: row.campusId, officeId: row.officeId };
}

export async function getEvidenceReportingPeriodById(evidenceId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence")
    .select("reporting_period")
    .eq("id", evidenceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { reporting_period: string };
  return row.reporting_period ?? null;
}

export async function updateEvidenceStatus(input: { evidenceId: string; status: EvidenceStatus; remarks?: string | null }) {
  const supabase = await createSupabaseServerClient();
  const rpcArgs: Database["public"]["Functions"]["apply_compliance_evidence_status_change"]["Args"] = {
    p_evidence_id: input.evidenceId,
    p_to_status: input.status,
    p_remarks: input.remarks ?? "",
  };
  const { error } = await supabase.rpc("apply_compliance_evidence_status_change", rpcArgs as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addEvidenceAttachment(input: EvidenceAttachmentInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    evidence_id: input.evidenceId,
    file_name: input.fileName.trim(),
    file_type: input.fileType.trim(),
    storage_bucket: input.storageBucket ?? "compliance-evidence",
    storage_path: normalizeNullable(input.storagePath),
    uploaded_by_user_id: input.uploadedByUserId ?? null,
  };
  const { error } = await supabase.from("compliance_evidence_attachments").insert(payload as never);
  if (error) {
    const msg = error.message ?? "";
    if (error.code === "23505" || msg.includes("uq_compliance_evidence_attachments_storage_object")) {
      return {
        ok: false,
        error: "This exact storage object is already attached to the selected evidence record.",
      };
    }
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function softDeleteEvidenceAttachment(input: {
  attachmentId: string;
  deletedByUserId: string;
  storageDeleted: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const patch = {
    deleted_at: new Date().toISOString(),
    deleted_by_user_id: input.deletedByUserId,
    storage_deleted_at: input.storageDeleted ? new Date().toISOString() : null,
  };
  const { error } = await supabase
    .from("compliance_evidence_attachments")
    .update(patch as never)
    .eq("id", input.attachmentId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function restoreEvidenceAttachment(input: {
  attachmentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const patch = {
    deleted_at: null,
    deleted_by_user_id: null,
  };
  const { error } = await supabase
    .from("compliance_evidence_attachments")
    .update(patch as never)
    .eq("id", input.attachmentId)
    .not("deleted_at", "is", null)
    .is("storage_deleted_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function saveEvidenceActionPlan(input: EvidenceActionPlanInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    evidence_id: input.evidenceId,
    gap_summary: input.gapSummary.trim(),
    corrective_action: input.correctiveAction.trim(),
    owner_name: input.ownerName.trim(),
    owner_user_id: input.ownerUserId ?? null,
    owner_office_id: input.ownerOfficeId ?? null,
    gap_severity: input.gapSeverity,
    gap_category: input.gapCategory,
    root_cause: normalizeNullable(input.rootCause),
    reference_clause: normalizeNullable(input.referenceClause),
    progress_percent: input.progressPercent,
    due_date: input.dueDate,
    status: input.status,
    progress_notes: normalizeNullable(input.progressNotes),
  };
  const { error } = await supabase
    .from("compliance_action_plans")
    .upsert(payload as never, { onConflict: "evidence_id" });
  return { ok: !error, error: error?.message };
}

/** @deprecated Use `saveEvidenceActionPlan`. */
export const upsertEvidenceActionPlan = saveEvidenceActionPlan;

async function listEvidenceAttachments(evidenceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence_attachments")
    .select("id, evidence_id, file_name, file_type, storage_bucket, storage_path, created_at, uploaded_by_user_id")
    .eq("evidence_id", evidenceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    evidence_id: string;
    file_name: string;
    file_type: string;
    storage_bucket: string;
    storage_path: string | null;
    created_at: string;
    uploaded_by_user_id: string | null;
  }>;
  const userIds = [...new Set(rows.map((r) => r.uploaded_by_user_id).filter((id): id is string => !!id))];
  const labelById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("app_users")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    const actorRows = (users ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    }>;
    for (const u of actorRows) {
      labelById.set(u.id, formatActorLabel(u));
    }
  }
  return rows.map((row) => ({
    id: row.id,
    evidenceId: row.evidence_id,
    fileName: row.file_name,
    fileType: row.file_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    uploadedAt: row.created_at,
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedByLabel: row.uploaded_by_user_id ? (labelById.get(row.uploaded_by_user_id) ?? null) : null,
  }));
}

export async function getAttachmentAccessContext(
  attachmentId: string,
): Promise<{ evidenceId: string; campusId: string; officeId: string | null; storageBucket: string; storagePath: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence_attachments")
    .select("evidence_id, storage_bucket, storage_path, evidence:compliance_evidence!inner(campus_id, office_id)")
    .eq("id", attachmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    evidence_id: string;
    storage_bucket: string;
    storage_path: string | null;
    evidence: { campus_id: string; office_id: string | null } | Array<{ campus_id: string; office_id: string | null }> | null;
  };
  const evidence = resolveSingle(row.evidence);
  if (!evidence) return null;
  return {
    evidenceId: row.evidence_id,
    campusId: evidence.campus_id,
    officeId: evidence.office_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
  };
}

export async function getDeletedAttachmentAccessContext(
  attachmentId: string,
): Promise<{
  evidenceId: string;
  campusId: string;
  officeId: string | null;
  storageBucket: string;
  storagePath: string | null;
  storageDeletedAt: string | null;
  fileName: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence_attachments")
    .select("evidence_id, file_name, storage_bucket, storage_path, storage_deleted_at, evidence:compliance_evidence!inner(campus_id, office_id)")
    .eq("id", attachmentId)
    .not("deleted_at", "is", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    evidence_id: string;
    file_name: string;
    storage_bucket: string;
    storage_path: string | null;
    storage_deleted_at: string | null;
    evidence: { campus_id: string; office_id: string | null } | Array<{ campus_id: string; office_id: string | null }> | null;
  };
  const evidence = resolveSingle(row.evidence);
  if (!evidence) return null;
  return {
    evidenceId: row.evidence_id,
    campusId: evidence.campus_id,
    officeId: evidence.office_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    storageDeletedAt: row.storage_deleted_at,
    fileName: row.file_name,
  };
}

async function listDeletedEvidenceAttachments(evidenceId: string): Promise<DeletedEvidenceAttachmentItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence_attachments")
    .select(
      "id, evidence_id, file_name, file_type, storage_bucket, storage_path, created_at, uploaded_by_user_id, deleted_at, deleted_by_user_id, storage_deleted_at"
    )
    .eq("evidence_id", evidenceId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    evidence_id: string;
    file_name: string;
    file_type: string;
    storage_bucket: string;
    storage_path: string | null;
    created_at: string;
    uploaded_by_user_id: string | null;
    deleted_at: string;
    deleted_by_user_id: string | null;
    storage_deleted_at: string | null;
  }>;
  const userIds = [
    ...new Set(
      rows.flatMap((r) => [r.uploaded_by_user_id, r.deleted_by_user_id]).filter((id): id is string => !!id)
    ),
  ];
  const labelById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("app_users")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    const actorRows = (users ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    }>;
    for (const u of actorRows) {
      labelById.set(u.id, formatActorLabel(u));
    }
  }
  return rows.map((row) => ({
    id: row.id,
    evidenceId: row.evidence_id,
    fileName: row.file_name,
    fileType: row.file_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    uploadedAt: row.created_at,
    uploadedByLabel: row.uploaded_by_user_id ? (labelById.get(row.uploaded_by_user_id) ?? null) : null,
    deletedAt: row.deleted_at,
    deletedByUserId: row.deleted_by_user_id,
    deletedByLabel: row.deleted_by_user_id ? (labelById.get(row.deleted_by_user_id) ?? null) : null,
    storageDeletedAt: row.storage_deleted_at,
    canRestore: row.storage_deleted_at === null,
  }));
}

async function getEvidenceActionPlan(evidenceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_action_plans")
    .select(
      "id, evidence_id, gap_summary, corrective_action, owner_name, owner_user_id, owner_office_id, gap_severity, gap_category, root_cause, reference_clause, progress_percent, last_progress_at, last_progress_by_user_id, due_date, status, progress_notes, updated_at"
    )
    .eq("evidence_id", evidenceId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    evidence_id: string;
    gap_summary: string;
    corrective_action: string;
    owner_name: string;
    owner_user_id: string | null;
    owner_office_id: string | null;
    gap_severity: "low" | "medium" | "high" | "critical";
    gap_category: "policy" | "process" | "documentation" | "systems" | "people" | "other";
    root_cause: string | null;
    reference_clause: string | null;
    progress_percent: number;
    last_progress_at: string | null;
    last_progress_by_user_id: string | null;
    due_date: string;
    status: "open" | "in_progress" | "closed";
    progress_notes: string | null;
    updated_at: string;
  };
  const lastProgressByLabel = await resolveActorLabel(row.last_progress_by_user_id);
  return {
    id: row.id,
    evidenceId: row.evidence_id,
    gapSummary: row.gap_summary,
    correctiveAction: row.corrective_action,
    ownerName: row.owner_name,
    ownerUserId: row.owner_user_id,
    ownerOfficeId: row.owner_office_id,
    gapSeverity: row.gap_severity,
    gapCategory: row.gap_category,
    rootCause: row.root_cause,
    referenceClause: row.reference_clause,
    progressPercent: row.progress_percent,
    lastProgressAt: row.last_progress_at,
    lastProgressByLabel,
    dueDate: row.due_date,
    status: row.status,
    progressNotes: row.progress_notes,
    updatedAt: row.updated_at,
  };
}

async function resolveActorLabel(appUserId: string | null): Promise<string | null> {
  if (!appUserId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("app_users").select("first_name, last_name, email").eq("id", appUserId).maybeSingle();
  if (!data) return null;
  const row = data as { first_name: string | null; last_name: string | null; email: string };
  return formatActorLabel(row);
}

async function listEvidenceActionPlanHistory(evidenceId: string): Promise<ActionPlanHistoryEvent[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_action_plan_history")
    .select("id, evidence_id, action_plan_id, event_type, actor_user_id, created_at")
    .eq("evidence_id", evidenceId)
    .order("created_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    evidence_id: string;
    action_plan_id: string;
    event_type: "created" | "updated" | string;
    actor_user_id: string | null;
    created_at: string;
  }>;
  const userIds = [...new Set(rows.map((r) => r.actor_user_id).filter((id): id is string => !!id))];
  const labelById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("app_users")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    const actorRows = (users ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; email: string }>;
    for (const u of actorRows) labelById.set(u.id, formatActorLabel(u));
  }
  return rows.map((row) => ({
    id: row.id,
    evidenceId: row.evidence_id,
    actionPlanId: row.action_plan_id,
    eventType: row.event_type === "created" ? "created" : "updated",
    changedAt: row.created_at,
    changedByLabel: row.actor_user_id ? (labelById.get(row.actor_user_id) ?? null) : null,
  }));
}

function formatActorLabel(input: { first_name: string | null; last_name: string | null; email: string }): string {
  const name = [input.first_name, input.last_name].filter(Boolean).join(" ").trim();
  if (name.length > 0) return name;
  return input.email;
}

async function listEvidenceStatusHistory(evidenceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence_status_history")
    .select("id, evidence_id, from_status, to_status, remarks, created_at, changed_by_user_id")
    .eq("evidence_id", evidenceId)
    .order("created_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    evidence_id: string;
    from_status: EvidenceStatus | null;
    to_status: EvidenceStatus;
    remarks: string | null;
    created_at: string;
    changed_by_user_id: string | null;
  }>;
  const userIds = [...new Set(rows.map((r) => r.changed_by_user_id).filter((id): id is string => !!id))];
  const labelById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("app_users")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    const actorRows = (users ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    }>;
    for (const u of actorRows) {
      labelById.set(u.id, formatActorLabel(u));
    }
  }
  return rows.map((row) => ({
    id: row.id,
    evidenceId: row.evidence_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    remarks: row.remarks,
    changedAt: row.created_at,
    changedByUserId: row.changed_by_user_id,
    changedByLabel: row.changed_by_user_id ? (labelById.get(row.changed_by_user_id) ?? null) : null,
  }));
}
