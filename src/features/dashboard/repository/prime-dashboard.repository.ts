import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";

export type PrimeDashboardMetrics = {
  employeesTotal: number;
  recruitmentVacanciesForReview: number;
  recruitmentOpenVacancies: number;
  recruitmentApplicationsInPipeline: number;
  complianceEvidenceSubmitted: number;
  complianceUnresolvedGaps: number;
  complianceOverdueEvidence: number;
};

export type PrimeDashboardActivityItem = {
  occurredAt: string;
  label: string;
  detail: string | null;
  source: "audit" | "compliance";
};

function countFrom(result: { count: number | null } | null | undefined): number {
  return result?.count ?? 0;
}

export async function getPrimeDashboardMetrics(
  context: AuthorizationContext
): Promise<{ data: PrimeDashboardMetrics; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  // Employees (scoped via applyAuthorizationScope to respect campus/office scopes without hiding null offices).
  const employeesQuery = supabase.from("employees").select("id", { count: "exact", head: true }).is("deleted_at", null);
  const employeesResult = await applyAuthorizationScope(employeesQuery, context);
  if (employeesResult.error) {
    return {
      data: emptyMetrics(),
      error: employeesResult.error.message,
    };
  }

  // Recruitment vacancies.
  const vacanciesForReviewQuery = supabase
    .from("recruitment_vacancies")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "for_review");
  const vacanciesForReviewResult = await applyAuthorizationScope(vacanciesForReviewQuery, context);

  const vacanciesOpenQuery = supabase
    .from("recruitment_vacancies")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "open");
  const vacanciesOpenResult = await applyAuthorizationScope(vacanciesOpenQuery, context);

  // Recruitment applications in pipeline (excluding terminal states).
  const applicationsPipelineQuery = supabase
    .from("recruitment_applications")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .in("status", ["submitted", "screening", "interview", "for_offer"]);
  const applicationsPipelineResult = await applyAuthorizationScope(applicationsPipelineQuery, context);

  // Compliance evidence submitted (review queue signal).
  const evidenceSubmittedQuery = supabase
    .from("compliance_evidence")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "submitted");
  const evidenceSubmittedResult = await applyAuthorizationScope(evidenceSubmittedQuery, context);

  // Compliance overdue evidence (non-approved).
  const evidenceOverdueQuery = supabase
    .from("compliance_evidence")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .not("due_date", "is", null)
    .lt("due_date", today)
    .neq("status", "approved");
  const evidenceOverdueResult = await applyAuthorizationScope(evidenceOverdueQuery, context);

  // Compliance unresolved gaps (action plans open/in_progress). RLS on action plans is already scoped by evidence.
  const unresolvedGapsResult = await supabase
    .from("compliance_action_plans")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);

  const anyError =
    vacanciesForReviewResult.error ??
    vacanciesOpenResult.error ??
    applicationsPipelineResult.error ??
    evidenceSubmittedResult.error ??
    evidenceOverdueResult.error ??
    unresolvedGapsResult.error;

  if (anyError) {
    return { data: emptyMetrics({ employeesTotal: countFrom(employeesResult) }), error: anyError.message };
  }

  return {
    data: {
      employeesTotal: countFrom(employeesResult),
      recruitmentVacanciesForReview: countFrom(vacanciesForReviewResult),
      recruitmentOpenVacancies: countFrom(vacanciesOpenResult),
      recruitmentApplicationsInPipeline: countFrom(applicationsPipelineResult),
      complianceEvidenceSubmitted: countFrom(evidenceSubmittedResult),
      complianceUnresolvedGaps: countFrom(unresolvedGapsResult),
      complianceOverdueEvidence: countFrom(evidenceOverdueResult),
    },
    error: null,
  };
}

export async function listPrimeDashboardActivity(
  context: AuthorizationContext
): Promise<{ data: PrimeDashboardActivityItem[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  // Prefer audit logs if the actor can read them; otherwise fall back to compliance status history (scoped by RLS).
  if (context.permissions.includes("audit.logs.read")) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("occurred_at, event_type, entity_label, action")
      .order("occurred_at", { ascending: false })
      .limit(15);
    if (error) {
      return { data: [], error: error.message };
    }
    const rows = (data ?? []) as Array<{
      occurred_at: string;
      event_type: string;
      entity_label: string | null;
      action: string;
    }>;
    return {
      data: rows.map((r) => ({
        occurredAt: r.occurred_at,
        label: r.entity_label ?? r.event_type,
        detail: r.action,
        source: "audit" as const,
      })),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("compliance_evidence_status_history")
    .select("created_at, to_status, evidence:compliance_evidence(title)")
    .order("created_at", { ascending: false })
    .limit(15);
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []) as Array<{
    created_at: string;
    to_status: string;
    evidence: { title: string } | Array<{ title: string }> | null;
  }>;
  const resolveTitle = (e: { title: string } | Array<{ title: string }> | null) =>
    Array.isArray(e) ? (e[0]?.title ?? "Evidence") : (e?.title ?? "Evidence");

  return {
    data: rows.map((r) => ({
      occurredAt: r.created_at,
      label: resolveTitle(r.evidence),
      detail: `Evidence status → ${r.to_status}`,
      source: "compliance" as const,
    })),
    error: null,
  };
}

function emptyMetrics(overrides?: Partial<PrimeDashboardMetrics>): PrimeDashboardMetrics {
  return {
    employeesTotal: 0,
    recruitmentVacanciesForReview: 0,
    recruitmentOpenVacancies: 0,
    recruitmentApplicationsInPipeline: 0,
    complianceEvidenceSubmitted: 0,
    complianceUnresolvedGaps: 0,
    complianceOverdueEvidence: 0,
    ...overrides,
  };
}

