"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { requirePermission } from "@/features/auth/server/require-permission";
import {
  planFormSchema,
  planItemFormSchema,
  type PlanFormInput,
  type PlanItemFormInput,
} from "@/features/learning/plans/schemas/plan-form.schema";
import {
  addPlanItem,
  createAnnualPlan,
  getAnnualPlanScopeById,
  removePlanItem,
  updateAnnualPlan,
} from "@/features/learning/plans/repository/plans.repository";

type ActionResult = { ok: true; planId?: string } | { ok: false; error: string };

function success(planId?: string): ActionResult {
  return { ok: true, planId };
}

function failure(error: string): ActionResult {
  return { ok: false, error };
}

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
}

export async function createAnnualPlanAction(input: PlanFormInput): Promise<ActionResult> {
  const parsed = planFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid plan.");
  await requirePermission({ permission: "learning.write", campusId: parsed.data.campusId });
  const result = await createAnnualPlan(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create plan.");
  if (result.planId) {
    await safeAuditLog({
      eventType: "learning.plan_created",
      action: "create_annual_plan",
      entityType: "ld_annual_plans",
      entityId: result.planId,
      campusId: parsed.data.campusId,
      metadata: { year: parsed.data.year, title: parsed.data.title },
    });
  }
  revalidatePath("/learning/plans");
  return success(result.planId ?? undefined);
}

export async function updateAnnualPlanAction(planId: string, input: PlanFormInput): Promise<ActionResult> {
  const scope = await getAnnualPlanScopeById(planId);
  if (!scope) return failure("Plan not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const parsed = planFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid plan.");
  await requirePermission({ permission: "learning.write", campusId: parsed.data.campusId });
  const result = await updateAnnualPlan(planId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update plan.");
  revalidatePath("/learning/plans");
  revalidatePath(`/learning/plans/${planId}`);
  return success(planId);
}

export async function addPlanItemAction(planId: string, input: PlanItemFormInput): Promise<ActionResult> {
  const scope = await getAnnualPlanScopeById(planId);
  if (!scope) return failure("Plan not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const parsed = planItemFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid line item.");
  const result = await addPlanItem(planId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to add plan item.");
  revalidatePath(`/learning/plans/${planId}`);
  return success(planId);
}

export async function removePlanItemAction(planId: string, itemId: string): Promise<ActionResult> {
  const scope = await getAnnualPlanScopeById(planId);
  if (!scope) return failure("Plan not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const result = await removePlanItem(itemId);
  if (!result.ok) return failure(result.error ?? "Failed to remove plan item.");
  revalidatePath(`/learning/plans/${planId}`);
  return success(planId);
}
