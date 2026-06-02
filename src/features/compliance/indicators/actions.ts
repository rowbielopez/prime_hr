"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { requirePermission } from "@/features/auth/server/require-permission";
import { indicatorFormSchema, type IndicatorFormInput } from "@/features/compliance/indicators/schemas/indicator-form.schema";
import {
  createComplianceIndicator,
  getIndicatorSnapshot,
  setComplianceIndicatorActive,
  updateComplianceIndicator,
} from "@/features/compliance/indicators/repository/indicator.repository";

type ActionResult = { ok: true } | { ok: false; error: string };

function success(): ActionResult {
  return { ok: true };
}

function failure(message: string): ActionResult {
  return { ok: false, error: message };
}

export async function createComplianceIndicatorAction(input: IndicatorFormInput): Promise<ActionResult> {
  await requirePermission({ permission: "compliance.indicators.write" });
  const parsed = indicatorFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid indicator input.");
  const result = await createComplianceIndicator(parsed.data);
  if (!result.ok) return failure(result.error);
  try {
    await writeAuditLog({
      eventType: "admin.compliance_indicator_created",
      action: "create_compliance_indicator",
      entityType: "compliance_indicators",
      entityId: result.indicatorId,
      metadata: { input: parsed.data },
    });
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
  revalidatePath("/admin/compliance-indicators");
  revalidatePath("/compliance/evidence/new");
  return success();
}

export async function updateComplianceIndicatorAction(indicatorId: string, input: IndicatorFormInput): Promise<ActionResult> {
  await requirePermission({ permission: "compliance.indicators.write" });
  const parsed = indicatorFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid indicator input.");
  const before = await getIndicatorSnapshot(indicatorId);
  const result = await updateComplianceIndicator(indicatorId, parsed.data);
  if (!result.ok) return failure(result.error);
  try {
    await writeAuditLog({
      eventType: "admin.compliance_indicator_updated",
      action: "update_compliance_indicator",
      entityType: "compliance_indicators",
      entityId: indicatorId,
      metadata: { before, after: parsed.data },
    });
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
  revalidatePath("/admin/compliance-indicators");
  revalidatePath("/compliance/evidence/new");
  return success();
}

export async function toggleComplianceIndicatorStatusAction(indicatorId: string, isActive: boolean): Promise<ActionResult> {
  await requirePermission({ permission: "compliance.indicators.write" });
  const before = await getIndicatorSnapshot(indicatorId);
  const result = await setComplianceIndicatorActive(indicatorId, isActive);
  if (!result.ok) return failure(result.error);
  try {
    await writeAuditLog({
      eventType: "admin.compliance_indicator_status_toggled",
      action: "toggle_compliance_indicator_status",
      entityType: "compliance_indicators",
      entityId: indicatorId,
      metadata: { before, isActive, previousIsActive: before?.is_active ?? null },
    });
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
  revalidatePath("/admin/compliance-indicators");
  revalidatePath("/compliance/evidence/new");
  return success();
}
