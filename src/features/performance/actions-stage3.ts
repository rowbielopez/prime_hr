"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/features/auth/server/require-permission";
import { computeWeightedFinalScore, mapScoreToRatingBand } from "@/features/performance/rating-engine";
import {
  performanceFinalizationSchema,
  type PerformanceFinalizationInput,
} from "@/features/performance/schemas/record-form.schema";
import {
  finalizePerformanceRecord,
  getPerformanceRecordById,
  getPerformanceRecordScopeById,
  setPerformanceObjectiveReviewerScores,
} from "@/features/performance/repository/records.repository";

type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

export async function finalizePerformanceRecordAction(
  recordId: string,
  input: PerformanceFinalizationInput
): Promise<ActionResult> {
  const parsed = performanceFinalizationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid finalization input.");
  const scope = await getPerformanceRecordScopeById(recordId);
  if (!scope) return fail("Record not found.");
  await requirePermission({
    permission: "performance.finalize",
    campusId: scope.campus_id,
    officeId: scope.office_id ?? undefined,
  });
  if (scope.status !== "approved") return fail("Only approved records can be finalized.");
  const detail = await getPerformanceRecordById(recordId);
  if (!detail) return fail("Record details not found.");
  const byId = new Map(detail.objectives.map((row) => [row.id, row]));
  const rows = parsed.data.objectiveScores.map((row) => {
    const objective = byId.get(row.objectiveId);
    if (!objective) throw new Error("Objective score contains invalid objective.");
    return { weight: objective.weight, reviewerScore: row.reviewerScore };
  });
  let finalScore = 0;
  try {
    finalScore = computeWeightedFinalScore(rows);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to compute final score.");
  }
  const setScores = await setPerformanceObjectiveReviewerScores(recordId, parsed.data.objectiveScores);
  if (!setScores.ok) return fail(setScores.error ?? "Failed to save reviewer scores.");
  const finalize = await finalizePerformanceRecord({
    recordId,
    finalScore,
    finalRating: mapScoreToRatingBand(finalScore),
    finalizerComments: parsed.data.finalizerComments?.trim() ? parsed.data.finalizerComments.trim() : null,
  });
  if (!finalize.ok) return fail(finalize.error ?? "Failed to finalize record.");
  revalidatePath("/performance/finalizations");
  revalidatePath(`/performance/finalizations/${recordId}`);
  revalidatePath("/performance/summary");
  revalidatePath("/performance/my");
  revalidatePath(`/performance/my/${recordId}`);
  return { ok: true };
}
