import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  RewardAwardeeHistoryItem,
  RewardNominationDetail,
  RewardNominationListItem,
  RewardNominationReviewItem,
  RewardNominationReviewSummary,
  RewardNominationStatus,
  RewardNominationStatusHistoryItem,
  RewardCommitteeAssignmentItem,
  RewardCommitteeReviewerOption,
} from "@/features/rewards/types";
import type { RewardNominationFormInput } from "@/features/rewards/schemas/nomination-form.schema";
import type { RewardsReviewDecisionInput } from "@/features/rewards/schemas/review-decision.schema";

async function employeeNameMap(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("employees")
    .select("id, first_name, middle_name, last_name, suffix")
    .in("id", ids);
  return new Map(
    ((data ?? []) as Array<{
      id: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      suffix: string | null;
    }>).map((row) => [row.id, [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(" ")])
  );
}

async function appUserNameMap(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("app_users")
    .select("id, first_name, middle_name, last_name, suffix, email")
    .in("id", ids);
  return new Map(
    ((data ?? []) as Array<{
      id: string;
      first_name: string | null;
      middle_name: string | null;
      last_name: string | null;
      suffix: string | null;
      email: string | null;
    }>).map((row) => {
      const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(" ").trim();
      return [row.id, fullName || row.email || row.id];
    })
  );
}

async function appUserProfileMap(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  if (ids.length === 0) return new Map<string, { name: string; email: string }>();
  const { data } = await supabase.from("app_users").select("id, first_name, middle_name, last_name, suffix, email").in("id", ids);
  return new Map(
    ((data ?? []) as Array<{
      id: string;
      first_name: string | null;
      middle_name: string | null;
      last_name: string | null;
      suffix: string | null;
      email: string | null;
    }>).map((row) => {
      const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(" ").trim();
      return [row.id, { name: fullName || row.email || row.id, email: row.email ?? "" }];
    })
  );
}

export async function listRewardsNominations(
  context?: AuthorizationContext,
  filters?: { awardId?: string | null }
): Promise<RewardNominationListItem[]> {
  const supabase = await createSupabaseServerClient();
  let base = supabase
    .from("rewards_nominations")
    .select("id, status, nominee_employee_id, nominator_employee_id, updated_at, award:rewards_awards(title)")
    .order("updated_at", { ascending: false });
  if (filters?.awardId) {
    base = base.eq("award_id", filters.awardId);
  }
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    status: RewardNominationListItem["status"];
    nominee_employee_id: string;
    nominator_employee_id: string;
    updated_at: string;
    award: { title: string } | Array<{ title: string }> | null;
  }>;
  const ids = [...new Set(rows.flatMap((r) => [r.nominee_employee_id, r.nominator_employee_id]))];
  const names = await employeeNameMap(ids);
  return rows.map((row) => ({
    id: row.id,
    awardTitle: row.award ? (Array.isArray(row.award) ? (row.award[0]?.title ?? "?") : row.award.title) : "?",
    nomineeName: names.get(row.nominee_employee_id) ?? "?",
    nominatorName: names.get(row.nominator_employee_id) ?? "?",
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export async function countRewardsNominationsByAwardId(
  awardId: string,
  context?: AuthorizationContext
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_nominations")
    .select("id", { count: "exact", head: true })
    .eq("award_id", awardId);
  const result = await applyAuthorizationScope(base, context);
  if (result.error) return 0;
  return result.count ?? 0;
}

export async function getRewardsNominationById(
  nominationId: string,
  context?: AuthorizationContext
): Promise<RewardNominationDetail | null> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_nominations")
    .select(
      "id, award_id, nominee_employee_id, nominator_employee_id, status, justification, nominator_remarks, reviewer_remarks, approver_remarks, updated_at, submitted_at, award:rewards_awards(title)"
    )
    .eq("id", nominationId);
  const { data, error } = await applyAuthorizationScope(base, context).maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    award_id: string;
    nominee_employee_id: string;
    nominator_employee_id: string;
    status: RewardNominationStatus;
    justification: string;
    nominator_remarks: string | null;
    reviewer_remarks: string | null;
    approver_remarks: string | null;
    updated_at: string;
    submitted_at: string | null;
    award: { title: string } | Array<{ title: string }> | null;
  };
  const names = await employeeNameMap([row.nominee_employee_id, row.nominator_employee_id]);
  return {
    id: row.id,
    awardId: row.award_id,
    awardTitle: row.award ? (Array.isArray(row.award) ? (row.award[0]?.title ?? "?") : row.award.title) : "?",
    nomineeEmployeeId: row.nominee_employee_id,
    nomineeName: names.get(row.nominee_employee_id) ?? "?",
    nominatorEmployeeId: row.nominator_employee_id,
    nominatorName: names.get(row.nominator_employee_id) ?? "?",
    status: row.status,
    justification: row.justification,
    nominatorRemarks: row.nominator_remarks,
    reviewerRemarks: row.reviewer_remarks,
    approverRemarks: row.approver_remarks,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
  };
}

export async function createRewardsNomination(input: {
  awardId: string;
  nomineeEmployeeId: string;
  nominatorEmployeeId: string;
  campusId: string;
  officeId: string | null;
  justification: string;
  nominatorRemarks: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_nominations")
    .insert({
      award_id: input.awardId,
      nominee_employee_id: input.nomineeEmployeeId,
      nominator_employee_id: input.nominatorEmployeeId,
      campus_id: input.campusId,
      office_id: input.officeId,
      status: "draft",
      justification: input.justification,
      nominator_remarks: input.nominatorRemarks,
    } as never)
    .select("id")
    .single();
  return { ok: !error, error: error?.message, nominationId: (data as { id: string } | null)?.id ?? null };
}

export async function updateRewardsNominationDraft(nominationId: string, input: RewardNominationFormInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("rewards_nominations")
    .update({
      award_id: input.awardId,
      nominee_employee_id: input.nomineeEmployeeId,
      justification: input.justification.trim(),
      nominator_remarks: input.nominatorRemarks?.trim() ? input.nominatorRemarks.trim() : null,
    } as never)
    .eq("id", nominationId);
  return { ok: !error, error: error?.message };
}

export async function updateRewardsNominationStatus(nominationId: string, status: RewardNominationStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("rewards_nominations")
    .update({ status } as never)
    .eq("id", nominationId);
  return { ok: !error, error: error?.message };
}

export async function updateRewardsNominationReviewerRemarks(nominationId: string, remarks: string | null) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("rewards_nominations")
    .update({ reviewer_remarks: remarks?.trim() ? remarks.trim() : null } as never)
    .eq("id", nominationId);
  return { ok: !error, error: error?.message };
}

export async function updateRewardsNominationApproverRemarks(nominationId: string, remarks: string | null) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("rewards_nominations")
    .update({ approver_remarks: remarks?.trim() ? remarks.trim() : null } as never)
    .eq("id", nominationId);
  return { ok: !error, error: error?.message };
}

export async function addRewardsNominationReview(
  nominationId: string,
  reviewerEmployeeId: string,
  input: RewardsReviewDecisionInput
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("rewards_nomination_reviews").insert({
    nomination_id: nominationId,
    reviewer_employee_id: reviewerEmployeeId,
    decision: input.decision,
    score: input.score ?? null,
    remarks: input.remarks?.trim() ? input.remarks.trim() : null,
  } as never);
  return { ok: !error, error: error?.message };
}

export async function listRewardsNominationReviews(nominationId: string): Promise<RewardNominationReviewItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_nomination_reviews")
    .select("id, reviewer_employee_id, decision, score, remarks, created_at")
    .eq("nomination_id", nominationId)
    .order("created_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    reviewer_employee_id: string;
    decision: "recommend" | "request_revision" | "reject";
    score: number | string | null;
    remarks: string | null;
    created_at: string;
  }>;
  const names = await employeeNameMap([...new Set(rows.map((r) => r.reviewer_employee_id))]);
  return rows.map((row) => ({
    id: row.id,
    decision: row.decision,
    score: row.score == null ? null : Number(row.score),
    remarks: row.remarks,
    reviewerName: names.get(row.reviewer_employee_id) ?? "?",
    createdAt: row.created_at,
  }));
}

export async function getRewardsNominationReviewSummary(nominationId: string): Promise<RewardNominationReviewSummary> {
  const rows = await listRewardsNominationReviews(nominationId);
  if (rows.length === 0) {
    return {
      totalReviews: 0,
      recommendCount: 0,
      requestRevisionCount: 0,
      rejectCount: 0,
      averageScore: null,
    };
  }
  const recommendCount = rows.filter((row) => row.decision === "recommend").length;
  const requestRevisionCount = rows.filter((row) => row.decision === "request_revision").length;
  const rejectCount = rows.filter((row) => row.decision === "reject").length;
  const scored = rows.filter((row) => row.score != null).map((row) => Number(row.score));
  const averageScore =
    scored.length === 0 ? null : Number((scored.reduce((acc, value) => acc + value, 0) / scored.length).toFixed(2));
  return {
    totalReviews: rows.length,
    recommendCount,
    requestRevisionCount,
    rejectCount,
    averageScore,
  };
}

export async function listRewardsCommitteeAssignmentUserIds(nominationId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_committee_assignments")
    .select("reviewer_user_id")
    .eq("nomination_id", nominationId);
  if (error) return [];
  return ((data ?? []) as Array<{ reviewer_user_id: string }>).map((row) => row.reviewer_user_id);
}

export async function listRewardsCommitteeAssignments(
  nominationId: string,
  context?: AuthorizationContext
): Promise<RewardCommitteeAssignmentItem[]> {
  const supabase = await createSupabaseServerClient();
  const access = await getRewardsNominationById(nominationId, context);
  if (!access) return [];
  const { data, error } = await supabase
    .from("rewards_committee_assignments")
    .select("id, reviewer_user_id, assignment_role, assigned_at")
    .eq("nomination_id", nominationId)
    .order("assigned_at", { ascending: true });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    reviewer_user_id: string;
    assignment_role: "member" | "chair";
    assigned_at: string;
  }>;
  const userMap = await appUserProfileMap([...new Set(rows.map((row) => row.reviewer_user_id))]);
  return rows.map((row) => ({
    id: row.id,
    reviewerUserId: row.reviewer_user_id,
    reviewerName: userMap.get(row.reviewer_user_id)?.name ?? row.reviewer_user_id,
    reviewerEmail: userMap.get(row.reviewer_user_id)?.email ?? "",
    assignmentRole: row.assignment_role,
    assignedAt: row.assigned_at,
  }));
}

export async function listCommitteeReviewerOptionsByNomination(
  nominationId: string,
  context?: AuthorizationContext
): Promise<RewardCommitteeReviewerOption[]> {
  const supabase = await createSupabaseServerClient();
  const nomination = await getRewardsNominationScopeById(nominationId);
  if (!nomination) return [];
  if (context && !context.isSuperAdmin && !context.campusScopes.includes(nomination.campus_id)) {
    return [];
  }
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, campus_id, effective_from, effective_to, role:roles(code), user:app_users(first_name, middle_name, last_name, suffix, email)")
    .eq("is_active", true);
  if (error) return [];
  const today = new Date().toISOString().slice(0, 10);
  const rows = (data ?? []) as Array<{
    user_id: string;
    campus_id: string | null;
    effective_from?: string | null;
    effective_to?: string | null;
    role: { code: string } | Array<{ code: string }> | null;
    user:
      | {
          first_name: string | null;
          middle_name: string | null;
          last_name: string | null;
          suffix: string | null;
          email: string | null;
        }
      | Array<{
          first_name: string | null;
          middle_name: string | null;
          last_name: string | null;
          suffix: string | null;
          email: string | null;
        }>
      | null;
  }>;
  const filtered = rows.filter((row) => {
    const role = Array.isArray(row.role) ? row.role[0] : row.role;
    if (!role || role.code !== "committee_member") return false;
    const fromOk = !row.effective_from || row.effective_from <= today;
    const toOk = !row.effective_to || row.effective_to >= today;
    if (!fromOk || !toOk) return false;
    return row.campus_id === nomination.campus_id;
  });
  const byUser = new Map<string, RewardCommitteeReviewerOption>();
  for (const row of filtered) {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    if (!user) continue;
    const name = [user.first_name, user.middle_name, user.last_name, user.suffix].filter(Boolean).join(" ").trim() || user.email || row.user_id;
    byUser.set(row.user_id, { userId: row.user_id, name, email: user.email ?? "" });
  }
  return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function replaceRewardsCommitteeAssignments(
  nominationId: string,
  reviewerUserIds: string[],
  chairUserId: string | null
) {
  const supabase = await createSupabaseServerClient();
  const deleteResult = await supabase.from("rewards_committee_assignments").delete().eq("nomination_id", nominationId);
  if (deleteResult.error) return { ok: false, error: deleteResult.error.message };
  const payload = reviewerUserIds.map((userId) => ({
    nomination_id: nominationId,
    reviewer_user_id: userId,
    assignment_role: chairUserId === userId ? "chair" : "member",
  }));
  const { error } = await supabase.from("rewards_committee_assignments").insert(payload as never);
  return { ok: !error, error: error?.message };
}

export async function listRewardsNominationStatusHistory(
  nominationId: string,
  context?: AuthorizationContext
): Promise<RewardNominationStatusHistoryItem[]> {
  const supabase = await createSupabaseServerClient();
  const access = await getRewardsNominationById(nominationId, context);
  if (!access) return [];
  const { data, error } = await supabase
    .from("rewards_nomination_status_history")
    .select("id, from_status, to_status, changed_by_user_id, changed_at")
    .eq("nomination_id", nominationId)
    .order("changed_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    from_status: RewardNominationStatus | null;
    to_status: RewardNominationStatus;
    changed_by_user_id: string | null;
    changed_at: string;
  }>;
  const names = await appUserNameMap([...new Set(rows.map((r) => r.changed_by_user_id).filter(Boolean))] as string[]);
  return rows.map((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedByUserId: row.changed_by_user_id,
    changedByName: row.changed_by_user_id ? (names.get(row.changed_by_user_id) ?? row.changed_by_user_id) : null,
    changedAt: row.changed_at,
  }));
}

export async function getRewardsNominationScopeById(nominationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_nominations")
    .select("id, award_id, campus_id, office_id, nominator_employee_id, nominee_employee_id, status")
    .eq("id", nominationId)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    award_id: string;
    campus_id: string;
    office_id: string | null;
    nominator_employee_id: string;
    nominee_employee_id: string;
    status: RewardNominationStatus;
  };
}

export async function findRewardAwardeeByNominationId(nominationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_awardees")
    .select("id")
    .eq("nomination_id", nominationId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function createRewardAwardee(input: {
  nominationId: string;
  awardId: string;
  awardeeEmployeeId: string;
  campusId: string;
  officeId: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_awardees")
    .insert({
      nomination_id: input.nominationId,
      award_id: input.awardId,
      awardee_employee_id: input.awardeeEmployeeId,
      campus_id: input.campusId,
      office_id: input.officeId,
    } as never)
    .select("id")
    .maybeSingle();
  return { ok: !error, error: error?.message, code: (error as { code?: string } | null)?.code, id: (data as { id: string } | null)?.id ?? null };
}

export async function findOpenDuplicateNomination(input: {
  awardId: string;
  nomineeEmployeeId: string;
  excludeNominationId?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("rewards_nominations")
    .select("id")
    .eq("award_id", input.awardId)
    .eq("nominee_employee_id", input.nomineeEmployeeId)
    .in("status", ["draft", "submitted", "under_review", "needs_revision", "recommended", "approved"])
    .limit(1);
  if (input.excludeNominationId) {
    query = query.neq("id", input.excludeNominationId);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function getRewardAwardEligibilityById(awardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards_awards")
    .select("id, status, nomination_start_date, nomination_end_date, campus_id, office_id")
    .eq("id", awardId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    status: "draft" | "active" | "inactive" | "archived";
    nomination_start_date: string | null;
    nomination_end_date: string | null;
    campus_id: string | null;
    office_id: string | null;
  };
}

export async function listRewardsAwardeeHistory(context?: AuthorizationContext): Promise<RewardAwardeeHistoryItem[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("rewards_awardees")
    .select("id, awardee_employee_id, awarded_at, campus:campuses(name), award:rewards_awards(title), campus_id")
    .order("awarded_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    awardee_employee_id: string;
    awarded_at: string;
    campus: { name: string } | Array<{ name: string }> | null;
    award: { title: string } | Array<{ title: string }> | null;
    campus_id: string;
  }>;
  const names = await employeeNameMap([...new Set(rows.map((r) => r.awardee_employee_id))]);
  return rows.map((row) => ({
    id: row.id,
    awardTitle: row.award ? (Array.isArray(row.award) ? (row.award[0]?.title ?? "?") : row.award.title) : "?",
    awardeeName: names.get(row.awardee_employee_id) ?? "?",
    campusName: row.campus ? (Array.isArray(row.campus) ? (row.campus[0]?.name ?? null) : row.campus.name) : null,
    awardedAt: row.awarded_at,
  }));
}

