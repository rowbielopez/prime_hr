"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { requirePermission } from "@/features/auth/server/require-permission";
import { sessionFormSchema, type SessionFormInput } from "@/features/learning/sessions/schemas/session-form.schema";
import {
  createTrainingSession,
  getTrainingSessionScopeById,
  updateTrainingSession,
} from "@/features/learning/sessions/repository/sessions.repository";

type ActionResult = { ok: true; sessionId?: string } | { ok: false; error: string };

function success(sessionId?: string): ActionResult {
  return { ok: true, sessionId };
}

function failure(error: string): ActionResult {
  return { ok: false, error };
}

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    console.error("audit_log_failed", error);
  }
}

export async function createTrainingSessionAction(input: SessionFormInput): Promise<ActionResult> {
  const parsed = sessionFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid session.");
  await requirePermission({ permission: "learning.write", campusId: parsed.data.campusId });
  const result = await createTrainingSession(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create session.");
  if (result.sessionId) {
    await safeAuditLog({
      eventType: "learning.session_created",
      action: "create_training_session",
      entityType: "ld_training_sessions",
      entityId: result.sessionId,
      campusId: parsed.data.campusId,
      metadata: { title: parsed.data.title },
    });
  }
  revalidatePath("/learning/sessions");
  return success(result.sessionId ?? undefined);
}

export async function updateTrainingSessionAction(sessionId: string, input: SessionFormInput): Promise<ActionResult> {
  const scope = await getTrainingSessionScopeById(sessionId);
  if (!scope) return failure("Session not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const parsed = sessionFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid session.");
  await requirePermission({ permission: "learning.write", campusId: parsed.data.campusId });
  const result = await updateTrainingSession(sessionId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update session.");
  revalidatePath("/learning/sessions");
  revalidatePath(`/learning/sessions/${sessionId}`);
  return success(sessionId);
}
