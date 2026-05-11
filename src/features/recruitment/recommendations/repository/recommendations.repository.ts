import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  RankingEntryInput,
  RecommendationInput,
  RecommendationStatusInput,
} from "@/features/recruitment/recommendations/schemas/recommendation-form.schema";
import type {
  RankingListItem,
  RecommendationDetail,
  RecommendationListItem,
  RecommendationReportSummary,
  RecommendationVacancyBreakdown,
} from "@/features/recruitment/recommendations/types";

function normalizeNullable(input?: string | null) {
  if (!input) return null;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function listRankingByVacancy(context?: AuthorizationContext): Promise<RankingListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_ranking_entries")
    .select(
      "id, vacancy_id, applicant_id, rank_no, score, remarks, recommendation_status, updated_at, vacancy:recruitment_vacancies(title), applicant:recruitment_applicants(first_name,middle_name,last_name,suffix), campus_id, office_id"
    )
    .is("deleted_at", null)
    .order("rank_no", { ascending: true });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    vacancy_id: string;
    applicant_id: string;
    rank_no: number;
    score: number | null;
    remarks: string | null;
    recommendation_status: RankingListItem["recommendationStatus"];
    updated_at: string;
    vacancy: { title: string } | Array<{ title: string }> | null;
    applicant:
      | { first_name: string; middle_name: string | null; last_name: string; suffix: string | null }
      | Array<{ first_name: string; middle_name: string | null; last_name: string; suffix: string | null }>
      | null;
  }>).map((row) => {
    const applicant = Array.isArray(row.applicant) ? row.applicant[0] : row.applicant;
    const applicantName = applicant
      ? [applicant.first_name, applicant.middle_name, applicant.last_name, applicant.suffix].filter(Boolean).join(" ")
      : "Unknown Applicant";
    return {
      id: row.id,
      vacancyId: row.vacancy_id,
      vacancyTitle: Array.isArray(row.vacancy) ? (row.vacancy[0]?.title ?? "Unknown Vacancy") : (row.vacancy?.title ?? "Unknown Vacancy"),
      applicantId: row.applicant_id,
      applicantName,
      rankNo: row.rank_no,
      score: row.score,
      remarks: row.remarks,
      recommendationStatus: row.recommendation_status,
      updatedAt: row.updated_at,
    };
  });
}

export async function listRecommendations(context?: AuthorizationContext): Promise<RecommendationListItem[]> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_appointment_recommendations")
    .select(
      "id, vacancy_id, applicant_id, status, remarks, created_at, updated_at, vacancy:recruitment_vacancies(title), applicant:recruitment_applicants(first_name,middle_name,last_name,suffix), campus_id, office_id"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(baseQuery, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    vacancy_id: string;
    applicant_id: string;
    status: RecommendationListItem["status"];
    remarks: string | null;
    created_at: string;
    updated_at: string;
    vacancy: { title: string } | Array<{ title: string }> | null;
    applicant:
      | { first_name: string; middle_name: string | null; last_name: string; suffix: string | null }
      | Array<{ first_name: string; middle_name: string | null; last_name: string; suffix: string | null }>
      | null;
  }>).map((row) => {
    const applicant = Array.isArray(row.applicant) ? row.applicant[0] : row.applicant;
    const applicantName = applicant
      ? [applicant.first_name, applicant.middle_name, applicant.last_name, applicant.suffix].filter(Boolean).join(" ")
      : "Unknown Applicant";
    return {
      id: row.id,
      vacancyId: row.vacancy_id,
      vacancyTitle: Array.isArray(row.vacancy) ? (row.vacancy[0]?.title ?? "Unknown Vacancy") : (row.vacancy?.title ?? "Unknown Vacancy"),
      applicantId: row.applicant_id,
      applicantName,
      status: row.status,
      remarks: row.remarks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function getRecommendationById(recommendationId: string, context?: AuthorizationContext): Promise<RecommendationDetail | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("recruitment_appointment_recommendations")
    .select(
      "id, vacancy_id, applicant_id, status, remarks, justification, decided_at, created_at, updated_at, vacancy:recruitment_vacancies(title), applicant:recruitment_applicants(first_name,middle_name,last_name,suffix), campus_id, office_id"
    )
    .eq("id", recommendationId)
    .is("deleted_at", null);
  const { data, error } = await applyAuthorizationScope(baseQuery, context).maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    vacancy_id: string;
    applicant_id: string;
    status: RecommendationDetail["status"];
    remarks: string | null;
    justification: string | null;
    decided_at: string | null;
    created_at: string;
    updated_at: string;
    vacancy: { title: string } | Array<{ title: string }> | null;
    applicant:
      | { first_name: string; middle_name: string | null; last_name: string; suffix: string | null }
      | Array<{ first_name: string; middle_name: string | null; last_name: string; suffix: string | null }>
      | null;
  };
  const applicant = Array.isArray(row.applicant) ? row.applicant[0] : row.applicant;
  const applicantName = applicant
    ? [applicant.first_name, applicant.middle_name, applicant.last_name, applicant.suffix].filter(Boolean).join(" ")
    : "Unknown Applicant";
  return {
    id: row.id,
    vacancyId: row.vacancy_id,
    vacancyTitle: Array.isArray(row.vacancy) ? (row.vacancy[0]?.title ?? "Unknown Vacancy") : (row.vacancy?.title ?? "Unknown Vacancy"),
    applicantId: row.applicant_id,
    applicantName,
    status: row.status,
    remarks: row.remarks,
    justification: row.justification,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRecommendationScopeById(
  recommendationId: string
): Promise<{ campusId: string; officeId: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_appointment_recommendations")
    .select("campus_id, office_id")
    .eq("id", recommendationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { campus_id: string; office_id: string | null };
  return { campusId: row.campus_id, officeId: row.office_id };
}

export async function getRecommendationByVacancyAndApplicant(
  vacancyId: string,
  applicantId: string
): Promise<{ id: string; status: RecommendationListItem["status"] } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_appointment_recommendations")
    .select("id, status")
    .eq("vacancy_id", vacancyId)
    .eq("applicant_id", applicantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; status: RecommendationListItem["status"] };
  return row;
}

export async function hasApplicantApplicationForVacancy(input: { vacancyId: string; applicantId: string }): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_applications")
    .select("id")
    .eq("vacancy_id", input.vacancyId)
    .eq("applicant_id", input.applicantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return false;
  return Boolean((data as { id: string } | null)?.id);
}

export async function upsertRankingEntry(input: RankingEntryInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("recruitment_ranking_entries")
    .upsert(
      {
        vacancy_id: input.vacancyId,
        applicant_id: input.applicantId,
        rank_no: input.rankNo,
        score: input.score,
        remarks: normalizeNullable(input.remarks),
        recommendation_status: input.recommendationStatus,
      } as never,
      { onConflict: "vacancy_id,applicant_id" }
    );
  return { ok: !error, error: error?.message };
}

export async function upsertRecommendation(input: RecommendationInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recruitment_appointment_recommendations")
    .upsert(
      {
        vacancy_id: input.vacancyId,
        applicant_id: input.applicantId,
        status: input.status,
        remarks: normalizeNullable(input.remarks),
        justification: normalizeNullable(input.justification),
        decided_at: normalizeNullable(input.decidedAt),
      } as never,
      { onConflict: "vacancy_id,applicant_id" }
    )
    .select("id")
    .single();
  return { ok: !error, error: error?.message, recommendationId: (data as { id: string } | null)?.id ?? null };
}

export async function updateRecommendationStatus(recommendationId: string, input: RecommendationStatusInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("recruitment_appointment_recommendations")
    .update({
      status: input.status,
      remarks: normalizeNullable(input.remarks),
    } as never)
    .eq("id", recommendationId);
  return { ok: !error, error: error?.message };
}

export async function getRecommendationReportSummary(
  context?: AuthorizationContext
): Promise<RecommendationReportSummary> {
  const rows = await listRecommendations(context);
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const byStatus: RecommendationReportSummary["byStatus"] = {
    draft: 0,
    for_review: 0,
    endorsed: 0,
    approved: 0,
    rejected: 0,
  };
  let recentlyUpdatedCount = 0;
  for (const row of rows) {
    byStatus[row.status] += 1;
    const updatedAtEpoch = new Date(row.updatedAt).getTime();
    if (!Number.isNaN(updatedAtEpoch) && updatedAtEpoch >= sevenDaysAgo) {
      recentlyUpdatedCount += 1;
    }
  }
  return {
    total: rows.length,
    byStatus,
    recentlyUpdatedCount,
  };
}

export async function getRecommendationVacancyBreakdown(
  context?: AuthorizationContext
): Promise<RecommendationVacancyBreakdown[]> {
  const rows = await listRecommendations(context);
  const grouped = new Map<string, RecommendationVacancyBreakdown>();
  for (const row of rows) {
    const key = row.vacancyId;
    const current =
      grouped.get(key) ??
      ({
        vacancyId: row.vacancyId,
        vacancyTitle: row.vacancyTitle,
        total: 0,
        approved: 0,
        endorsed: 0,
        forReview: 0,
        rejected: 0,
        draft: 0,
      } satisfies RecommendationVacancyBreakdown);
    current.total += 1;
    if (row.status === "approved") current.approved += 1;
    else if (row.status === "endorsed") current.endorsed += 1;
    else if (row.status === "for_review") current.forReview += 1;
    else if (row.status === "rejected") current.rejected += 1;
    else current.draft += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => b.total - a.total || a.vacancyTitle.localeCompare(b.vacancyTitle));
}
