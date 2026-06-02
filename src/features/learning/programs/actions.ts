"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import { requirePermission } from "@/features/auth/server/require-permission";
import { canTransitionProgramStatus } from "@/features/learning/programs/program-status";
import {
  programFormSchema,
  programStatusOnlySchema,
  type ProgramFormInput,
} from "@/features/learning/programs/schemas/program-form.schema";
import {
  createTrainingProgram,
  getTrainingProgramScopeById,
  softDeleteTrainingProgram,
  updateTrainingProgram,
  updateTrainingProgramStatus,
} from "@/features/learning/programs/repository/programs.repository";
import type { ProgramStatus } from "@/features/learning/types";

type ActionResult = { ok: true; programId?: string } | { ok: false; error: string };

function success(programId?: string): ActionResult {
  return { ok: true, programId };
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

async function assertProgramOfficeScope(input: ProgramFormInput) {
  if (input.officeId) {
    if (!input.campusId) return failure("Campus is required when an office is selected.");
    const ok = await officeBelongsToCampus({ officeId: input.officeId, campusId: input.campusId });
    if (!ok) return failure("Selected office does not belong to the selected campus.");
  }
  return null;
}

export async function createTrainingProgramAction(input: ProgramFormInput): Promise<ActionResult> {
  const parsed = programFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid program.");
  const scopeErr = await assertProgramOfficeScope(parsed.data);
  if (scopeErr) return scopeErr;
  await requirePermission({
    permission: "learning.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await createTrainingProgram(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create program.");
  if (result.programId) {
    await safeAuditLog({
      eventType: "learning.program_created",
      action: "create_training_program",
      entityType: "ld_training_programs",
      entityId: result.programId,
      campusId: parsed.data.campusId,
      metadata: { title: parsed.data.title, officeId: parsed.data.officeId },
    });
  }
  revalidatePath("/learning/programs");
  return success(result.programId ?? undefined);
}

export async function updateTrainingProgramAction(programId: string, input: ProgramFormInput): Promise<ActionResult> {
  const current = await getTrainingProgramScopeById(programId);
  if (!current) return failure("Program not found.");
  await requirePermission({
    permission: "learning.write",
    campusId: current.campusId,
    officeId: current.officeId,
  });
  const parsed = programFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid program.");
  const scopeErr = await assertProgramOfficeScope(parsed.data);
  if (scopeErr) return scopeErr;
  await requirePermission({
    permission: "learning.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await updateTrainingProgram(programId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update program.");
  await safeAuditLog({
    eventType: "learning.program_updated",
    action: "update_training_program",
    entityType: "ld_training_programs",
    entityId: programId,
    campusId: parsed.data.campusId,
    metadata: { title: parsed.data.title, officeId: parsed.data.officeId },
  });
  revalidatePath("/learning/programs");
  revalidatePath(`/learning/programs/${programId}`);
  return success(programId);
}

export async function updateTrainingProgramStatusAction(programId: string, nextStatus: ProgramStatus): Promise<ActionResult> {
  const parsed = programStatusOnlySchema.safeParse({ status: nextStatus });
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid status.");
  const current = await getTrainingProgramScopeById(programId);
  if (!current) return failure("Program not found.");
  if (!canTransitionProgramStatus(current.status, parsed.data.status)) {
    return failure("That status change is not allowed.");
  }
  await requirePermission({
    permission: "learning.write",
    campusId: current.campusId,
    officeId: current.officeId,
  });
  const result = await updateTrainingProgramStatus(programId, parsed.data.status);
  if (!result.ok) return failure(result.error ?? "Failed to update status.");
  await safeAuditLog({
    eventType: "learning.program_status_updated",
    action: "update_training_program_status",
    entityType: "ld_training_programs",
    entityId: programId,
    campusId: current.campusId,
    metadata: { status: parsed.data.status },
  });
  revalidatePath("/learning/programs");
  revalidatePath(`/learning/programs/${programId}`);
  return success(programId);
}

export async function archiveTrainingProgramAction(programId: string): Promise<ActionResult> {
  const current = await getTrainingProgramScopeById(programId);
  if (!current) return failure("Program not found.");
  await requirePermission({
    permission: "learning.write",
    campusId: current.campusId,
    officeId: current.officeId,
  });
  const result = await softDeleteTrainingProgram(programId);
  if (!result.ok) return failure(result.error ?? "Failed to archive program.");
  revalidatePath("/learning/programs");
  return success(programId);
}
