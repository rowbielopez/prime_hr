"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/features/auth/server/require-permission";
import {
  recommendationSchema,
  recommendationStatusSchema,
  rankingEntrySchema,
  type RecommendationInput,
  type RecommendationStatusInput,
  type RankingEntryInput,
} from "@/features/recruitment/recommendations/schemas/recommendation-form.schema";
import { getVacancyScopeById } from "@/features/recruitment/vacancies/repository/vacancies.repository";
import {
  getRecommendationByVacancyAndApplicant,
  getRecommendationScopeById,
  hasApplicantApplicationForVacancy,
  updateRecommendationStatus,
  upsertRankingEntry,
  upsertRecommendation,
} from "@/features/recruitment/recommendations/repository/recommendations.repository";
import { canTransitionRecommendationStatus } from "@/features/recruitment/recommendations/status";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function success(id?: string): ActionResult {
  return { ok: true, id };
}

function failure(error: string): ActionResult {
  return { ok: false, error };
}

export async function upsertRankingEntryAction(input: RankingEntryInput): Promise<ActionResult> {
  const parsed = rankingEntrySchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid ranking entry.");
  const vacancyScope = await getVacancyScopeById(parsed.data.vacancyId);
  if (!vacancyScope) return failure("Vacancy not found.");
  await requirePermission({
    permission: "recruitment.recommendations.write",
    campusId: vacancyScope.campusId,
    officeId: vacancyScope.officeId,
  });
  const result = await upsertRankingEntry(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to save ranking entry.");
  try {
    await writeAuditLog({
      eventType: "recruitment.ranking_entry_upserted",
      action: "upsert_ranking_entry",
      entityType: "recruitment_ranking_entries",
      entityId: null,
      campusId: vacancyScope.campusId,
      metadata: {
        vacancyId: parsed.data.vacancyId,
        applicantId: parsed.data.applicantId,
        rankNo: parsed.data.rankNo,
        score: parsed.data.score,
        recommendationStatus: parsed.data.recommendationStatus,
      },
    });
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
  revalidatePath("/recruitment/ranking");
  return success();
}

export async function upsertRecommendationAction(input: RecommendationInput): Promise<ActionResult> {
  const parsed = recommendationSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid recommendation.");
  const vacancyScope = await getVacancyScopeById(parsed.data.vacancyId);
  if (!vacancyScope) return failure("Vacancy not found.");
  await requirePermission({
    permission: "recruitment.recommendations.write",
    campusId: vacancyScope.campusId,
    officeId: vacancyScope.officeId,
  });
  const hasLinkedApplication = await hasApplicantApplicationForVacancy({
    vacancyId: parsed.data.vacancyId,
    applicantId: parsed.data.applicantId,
  });
  if (!hasLinkedApplication) {
    return failure("Applicant must have an application record for the selected vacancy.");
  }
  const existing = await getRecommendationByVacancyAndApplicant(parsed.data.vacancyId, parsed.data.applicantId);
  if (existing && !canTransitionRecommendationStatus(existing.status, parsed.data.status)) {
    return failure(`Invalid recommendation status transition: ${existing.status} -> ${parsed.data.status}.`);
  }
  const result = await upsertRecommendation(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to save recommendation.");
  try {
    await writeAuditLog({
      eventType: existing ? "recruitment.recommendation_updated" : "recruitment.recommendation_created",
      action: existing ? "upsert_recommendation_update" : "upsert_recommendation_create",
      entityType: "recruitment_appointment_recommendations",
      entityId: result.recommendationId ?? null,
      campusId: vacancyScope.campusId,
      metadata: {
        vacancyId: parsed.data.vacancyId,
        applicantId: parsed.data.applicantId,
        status: parsed.data.status,
        beforeStatus: existing?.status ?? null,
      },
    });
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
  revalidatePath("/recruitment/recommendations");
  if (result.recommendationId) revalidatePath(`/recruitment/recommendations/${result.recommendationId}`);
  revalidatePath("/recruitment/recommendations/reports");
  return success(result.recommendationId ?? undefined);
}

export async function updateRecommendationStatusAction(
  recommendationId: string,
  input: RecommendationStatusInput
): Promise<ActionResult> {
  const parsed = recommendationStatusSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid recommendation status.");
  const scope = await getRecommendationScopeById(recommendationId);
  if (!scope) return failure("Recommendation not found.");
  await requirePermission({
    permission: "recruitment.recommendations.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const supabase = await createSupabaseServerClient();
  const { data: currentRow } = await supabase
    .from("recruitment_appointment_recommendations")
    .select("status")
    .eq("id", recommendationId)
    .is("deleted_at", null)
    .maybeSingle();
  const currentStatus = (currentRow as { status: RecommendationStatusInput["status"] } | null)?.status;
  if (!currentStatus) return failure("Recommendation not found.");
  if (!canTransitionRecommendationStatus(currentStatus, parsed.data.status)) {
    return failure(`Invalid recommendation status transition: ${currentStatus} -> ${parsed.data.status}.`);
  }
  const result = await updateRecommendationStatus(recommendationId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update recommendation status.");
  try {
    await writeAuditLog({
      eventType: "recruitment.recommendation_status_updated",
      action: "update_recommendation_status",
      entityType: "recruitment_appointment_recommendations",
      entityId: recommendationId,
      campusId: scope.campusId,
      metadata: { beforeStatus: currentStatus, afterStatus: parsed.data.status, remarks: parsed.data.remarks ?? null },
    });
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
  revalidatePath("/recruitment/recommendations");
  revalidatePath(`/recruitment/recommendations/${recommendationId}`);
  revalidatePath("/recruitment/recommendations/reports");
  return success(recommendationId);
}
