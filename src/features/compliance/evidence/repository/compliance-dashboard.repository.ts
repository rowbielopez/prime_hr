import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  ComplianceDashboardCampusBreakdown,
  ComplianceDashboardSummary,
  UnresolvedGapListItem,
} from "@/features/compliance/evidence/types";

export async function getComplianceDashboardSummary(
  _context?: AuthorizationContext
): Promise<{ data: ComplianceDashboardSummary; error: string | null }> {
  void _context;
  const supabase = await createSupabaseServerClient();
  // Aggregated in SQL (RLS applies).
  const { data, error } = await supabase.rpc("get_compliance_dashboard_summary");
  if (error || !data) {
    return {
      data: {
        totalItems: 0,
        draftCount: 0,
        submittedCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        withOpenGapCount: 0,
        overdueCount: 0,
      },
      error: error?.message ?? "Failed to load dashboard summary.",
    };
  }
  const row = (Array.isArray(data) ? data[0] : data) as {
    total_items: number;
    draft_count: number;
    submitted_count: number;
    approved_count: number;
    rejected_count: number;
    with_open_gap_count: number;
    overdue_count: number;
  };
  return {
    data: {
      totalItems: row.total_items ?? 0,
      draftCount: row.draft_count ?? 0,
      submittedCount: row.submitted_count ?? 0,
      approvedCount: row.approved_count ?? 0,
      rejectedCount: row.rejected_count ?? 0,
      withOpenGapCount: row.with_open_gap_count ?? 0,
      overdueCount: row.overdue_count ?? 0,
    },
    error: null,
  };
}

export async function getComplianceDashboardCampusBreakdown(
  _context?: AuthorizationContext
): Promise<{ data: ComplianceDashboardCampusBreakdown[]; error: string | null }> {
  void _context;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_compliance_dashboard_campus_breakdown");
  if (error) return { data: [], error: error.message };
  const rows = (data ?? []) as Array<{
    campus_id: string;
    campus_name: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  }>;
  return {
    data: rows.map((r) => ({
      campusId: r.campus_id,
      campusName: r.campus_name,
      total: r.total,
      approved: r.approved,
      rejected: r.rejected,
      pending: r.pending,
    })),
    error: null,
  };
}

export async function getComplianceDashboardUnresolvedGaps(
  _context?: AuthorizationContext
): Promise<{ data: UnresolvedGapListItem[]; error: string | null }> {
  void _context;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_compliance_dashboard_unresolved_gaps", { p_limit: 25 } as never);
  if (error) return { data: [], error: error.message };
  const rows = (data ?? []) as Array<{
    evidence_id: string;
    evidence_title: string;
    campus_name: string;
    office_name: string | null;
    indicator_code: string;
    indicator_title: string;
    gap_severity: UnresolvedGapListItem["gapSeverity"];
    gap_category: UnresolvedGapListItem["gapCategory"];
    action_plan_status: UnresolvedGapListItem["actionPlanStatus"];
    progress_percent: number;
    due_date: string;
    is_overdue: boolean;
    owner_name: string;
    owner_user_label: string | null;
    responsible_office_label: string | null;
    last_progress_at: string | null;
  }>;
  return {
    data: rows.map((r) => ({
      evidenceId: r.evidence_id,
      evidenceTitle: r.evidence_title,
      campusName: r.campus_name,
      officeName: r.office_name,
      indicatorCode: r.indicator_code,
      indicatorTitle: r.indicator_title,
      gapSeverity: r.gap_severity,
      gapCategory: r.gap_category,
      actionPlanStatus: r.action_plan_status,
      progressPercent: r.progress_percent,
      dueDate: r.due_date,
      isOverdue: r.is_overdue,
      ownerName: r.owner_name,
      ownerUserLabel: r.owner_user_label,
      responsibleOfficeLabel: r.responsible_office_label,
      lastProgressAt: r.last_progress_at,
    })),
    error: null,
  };
}
