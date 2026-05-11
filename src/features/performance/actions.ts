"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { requirePermission } from "@/features/auth/server/require-permission";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import {
  performanceCycleFormSchema,
  type PerformanceCycleFormInput,
} from "@/features/performance/schemas/cycle-form.schema";
import {
  createPerformanceCycle,
  getPerformanceCycleById,
  updatePerformanceCycle,
} from "@/features/performance/repository/cycles.repository";

type ActionResult = { ok: true; cycleId?: string } | { ok: false; error: string };
const success = (cycleId?: string): ActionResult => ({ ok: true, cycleId });
const fail = (error: string): ActionResult => ({ ok: false, error });

async function safeAudit(input: Parameters<typeof writeAuditLog>[0]) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    console.error("audit_log_failed", error);
  }
}

async function assertOfficeScope(input: PerformanceCycleFormInput): Promise<string | null> {
  if (!input.officeId) return null;
  if (!input.campusId) return "Campus is required when office is selected.";
  const ok = await officeBelongsToCampus({ officeId: input.officeId, campusId: input.campusId });
  return ok ? null : "Selected office does not belong to the selected campus.";
}

export async function createPerformanceCycleAction(input: PerformanceCycleFormInput): Promise<ActionResult> {
  const parsed = performanceCycleFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid cycle.");
  const scopeError = await assertOfficeScope(parsed.data);
  if (scopeError) return fail(scopeError);
  await requirePermission({ permission: "performance.write", campusId: parsed.data.campusId ?? undefined, officeId: parsed.data.officeId ?? undefined });
  const result = await createPerformanceCycle(parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to create cycle.");
  if (result.cycleId) {
    await safeAudit({
      eventType: "performance.cycle_created",
      action: "create_performance_cycle",
      entityType: "performance_cycles",
      entityId: result.cycleId,
      campusId: parsed.data.campusId,
      metadata: { name: parsed.data.name },
    });
  }
  revalidatePath("/performance");
  revalidatePath("/performance/cycles");
  return success(result.cycleId ?? undefined);
}

export async function updatePerformanceCycleAction(cycleId: string, input: PerformanceCycleFormInput): Promise<ActionResult> {
  const parsed = performanceCycleFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid cycle.");
  const current = await getPerformanceCycleById(cycleId);
  if (!current) return fail("Cycle not found.");
  await requirePermission({ permission: "performance.write", campusId: current.campusId ?? undefined, officeId: current.officeId ?? undefined });
  const scopeError = await assertOfficeScope(parsed.data);
  if (scopeError) return fail(scopeError);
  await requirePermission({ permission: "performance.write", campusId: parsed.data.campusId ?? undefined, officeId: parsed.data.officeId ?? undefined });
  const result = await updatePerformanceCycle(cycleId, parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to update cycle.");
  await safeAudit({
    eventType: "performance.cycle_updated",
    action: "update_performance_cycle",
    entityType: "performance_cycles",
    entityId: cycleId,
    campusId: parsed.data.campusId,
    metadata: { name: parsed.data.name, status: parsed.data.status },
  });
  revalidatePath("/performance");
  revalidatePath("/performance/cycles");
  revalidatePath(`/performance/cycles/${cycleId}/edit`);
  return success(cycleId);
}
