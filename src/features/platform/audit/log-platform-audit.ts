import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import type { AuditEventType } from "@/features/platform/audit/audit-events";

export async function logPlatformAudit(input: {
  eventType: AuditEventType;
  action: string;
  entityType: string;
  entityId?: string | null;
  campusId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await writeAuditLog({
      eventType: input.eventType,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      campusId: input.campusId ?? null,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("platform_audit_log_failed", error);
  }
}

