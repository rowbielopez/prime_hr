import type { AuthorizationContext } from "@/features/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuditLogListItem = {
  id: number;
  occurredAt: string;
  severity: "info" | "warning" | "critical";
  eventType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  campusId: string | null;
  campusName: string | null;
};

type AuditLogRow = {
  id: number;
  occurred_at: string;
  severity: "info" | "warning" | "critical";
  event_type: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  campus_id: string | null;
  campus: { name: string } | Array<{ name: string }> | null;
};

function canReadGlobalAudit(context: AuthorizationContext): boolean {
  return (
    context.isSuperAdmin ||
    context.roles.includes("central_hr_admin") ||
    context.permissions.includes("audit.logs.read")
  );
}

function resolveCampusName(campus: AuditLogRow["campus"]): string | null {
  if (!campus) return null;
  return Array.isArray(campus) ? (campus[0]?.name ?? null) : campus.name;
}

export async function listAuditLogs(
  context: AuthorizationContext,
): Promise<AuditLogListItem[]> {
  if (!canReadGlobalAudit(context) && context.campusScopes.length === 0)
    return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_logs")
    .select(
      "id, occurred_at, severity, event_type, action, entity_type, entity_id, entity_label, campus_id, campus:campuses(name)",
    )
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (!canReadGlobalAudit(context)) {
    query = query.in("campus_id", context.campusScopes);
  }

  const { data, error } = await query;
  if (error) return [];

  return ((data ?? []) as AuditLogRow[]).map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    severity: row.severity,
    eventType: row.event_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    campusId: row.campus_id,
    campusName: resolveCampusName(row.campus),
  }));
}
