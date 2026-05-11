"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/features/auth/server/require-permission";
import {
  participantAddSchema,
  participantUpdateSchema,
  type ParticipantAddInput,
  type ParticipantUpdateInput,
} from "@/features/learning/participants/schemas/participant-form.schema";
import {
  addSessionParticipant,
  removeSessionParticipant,
  updateSessionParticipant,
} from "@/features/learning/participants/repository/participants.repository";
import { getTrainingSessionScopeById } from "@/features/learning/sessions/repository/sessions.repository";

type ActionResult = { ok: true } | { ok: false; error: string };

function failure(error: string): ActionResult {
  return { ok: false, error };
}

export async function addSessionParticipantAction(sessionId: string, input: ParticipantAddInput): Promise<ActionResult> {
  const scope = await getTrainingSessionScopeById(sessionId);
  if (!scope) return failure("Session not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const parsed = participantAddSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid participant.");
  const result = await addSessionParticipant(sessionId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to add participant.");
  revalidatePath(`/learning/sessions/${sessionId}`);
  return { ok: true };
}

export async function updateSessionParticipantAction(
  sessionId: string,
  participantId: string,
  input: ParticipantUpdateInput
): Promise<ActionResult> {
  const scope = await getTrainingSessionScopeById(sessionId);
  if (!scope) return failure("Session not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const parsed = participantUpdateSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid update.");
  const result = await updateSessionParticipant(participantId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update participant.");
  revalidatePath(`/learning/sessions/${sessionId}`);
  return { ok: true };
}

export async function removeSessionParticipantAction(sessionId: string, participantId: string): Promise<ActionResult> {
  const scope = await getTrainingSessionScopeById(sessionId);
  if (!scope) return failure("Session not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const result = await removeSessionParticipant(participantId);
  if (!result.ok) return failure(result.error ?? "Failed to remove participant.");
  revalidatePath(`/learning/sessions/${sessionId}`);
  return { ok: true };
}
