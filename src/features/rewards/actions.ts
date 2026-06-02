"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { requirePermission } from "@/features/auth/server/require-permission";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import { rewardAwardFormSchema, type RewardAwardFormInput } from "@/features/rewards/schemas/award-form.schema";
import { createRewardAward, getRewardAwardById, updateRewardAward } from "@/features/rewards/repository/awards.repository";
import { rewardNominationFormSchema, type RewardNominationFormInput } from "@/features/rewards/schemas/nomination-form.schema";
import {
  addRewardsNominationReview,
  createRewardAwardee,
  createRewardsNomination,
  findRewardAwardeeByNominationId,
  findOpenDuplicateNomination,
  getRewardAwardEligibilityById,
  getRewardsNominationById,
  getRewardsNominationReviewSummary,
  getRewardsNominationScopeById,
  listCommitteeReviewerOptionsByNomination,
  listRewardsCommitteeAssignmentUserIds,
  replaceRewardsCommitteeAssignments,
  updateRewardsNominationDraft,
  updateRewardsNominationApproverRemarks,
  updateRewardsNominationReviewerRemarks,
  updateRewardsNominationStatus,
} from "@/features/rewards/repository/nominations.repository";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { rewardsReviewDecisionSchema, type RewardsReviewDecisionInput } from "@/features/rewards/schemas/review-decision.schema";
import { rewardsApprovalDecisionSchema, type RewardsApprovalDecisionInput } from "@/features/rewards/schemas/approval-decision.schema";
import { rewardsCommitteeAssignmentSchema, type RewardsCommitteeAssignmentInput } from "@/features/rewards/schemas/committee-assignment.schema";

type ActionResult = { ok: true; awardId?: string } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const ok = (awardId?: string): ActionResult => ({ ok: true, awardId });

async function safeAudit(input: Parameters<typeof writeAuditLog>[0]) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    logServerError("audit_log_failed", error);
  }
}

async function assertOfficeScope(input: RewardAwardFormInput): Promise<string | null> {
  if (!input.officeId) return null;
  if (!input.campusId) return "Campus is required when office is selected.";
  const valid = await officeBelongsToCampus({ officeId: input.officeId, campusId: input.campusId });
  return valid ? null : "Selected office does not belong to selected campus.";
}

export async function createRewardAwardAction(input: RewardAwardFormInput): Promise<ActionResult> {
  const parsed = rewardAwardFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid award.");
  const scopeError = await assertOfficeScope(parsed.data);
  if (scopeError) return fail(scopeError);
  await requirePermission({
    permission: "rewards.catalog.write",
    campusId: parsed.data.campusId ?? undefined,
    officeId: parsed.data.officeId ?? undefined,
  });
  const result = await createRewardAward(parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to create award.");
  if (result.awardId) {
    await safeAudit({
      eventType: "rewards.award.create",
      action: "create_rewards_award",
      entityType: "rewards_awards",
      entityId: result.awardId,
      campusId: parsed.data.campusId,
      metadata: { code: parsed.data.code, title: parsed.data.title, status: parsed.data.status },
    });
  }
  revalidatePath("/rewards");
  revalidatePath("/rewards/awards");
  return ok(result.awardId ?? undefined);
}

export async function updateRewardAwardAction(awardId: string, input: RewardAwardFormInput): Promise<ActionResult> {
  const parsed = rewardAwardFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid award.");
  const current = await getRewardAwardById(awardId);
  if (!current) return fail("Award not found.");
  await requirePermission({
    permission: "rewards.catalog.write",
    campusId: current.campusId ?? undefined,
    officeId: current.officeId ?? undefined,
  });
  const scopeError = await assertOfficeScope(parsed.data);
  if (scopeError) return fail(scopeError);
  await requirePermission({
    permission: "rewards.catalog.write",
    campusId: parsed.data.campusId ?? undefined,
    officeId: parsed.data.officeId ?? undefined,
  });
  const result = await updateRewardAward(awardId, parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to update award.");
  await safeAudit({
    eventType: "rewards.award.update",
    action: "update_rewards_award",
    entityType: "rewards_awards",
    entityId: awardId,
    campusId: parsed.data.campusId,
    metadata: { code: parsed.data.code, title: parsed.data.title, status: parsed.data.status },
  });
  revalidatePath("/rewards");
  revalidatePath("/rewards/awards");
  revalidatePath(`/rewards/awards/${awardId}/edit`);
  return ok(awardId);
}

type NominationActionResult = { ok: true; nominationId?: string } | { ok: false; error: string };

function nominationFail(error: string): NominationActionResult {
  return { ok: false, error };
}

const COMMITTEE_MIN_REVIEWERS = 3;
const COMMITTEE_MIN_RECOMMENDATIONS = 2;

async function ensureNominationEligibility(input: {
  awardId: string;
  nomineeEmployeeId: string;
  excludeNominationId?: string;
  enforceWindow: boolean;
}): Promise<string | null> {
  const award = await getRewardAwardEligibilityById(input.awardId);
  if (!award) return "Award not found.";
  if (award.status !== "active") return "Only active awards can accept nominations.";
  if (input.enforceWindow) {
    const today = new Date();
    const start = award.nomination_start_date ? new Date(award.nomination_start_date) : null;
    const end = award.nomination_end_date ? new Date(award.nomination_end_date) : null;
    if (start && today < start) return "Nomination window has not started yet.";
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (today > end) return "Nomination window is already closed for this award.";
    }
  }
  const nominee = await getEmployeeById(input.nomineeEmployeeId);
  if (!nominee) return "Nominee employee not found.";
  if (award.campus_id && nominee.campusId !== award.campus_id) {
    return "Nominee is outside the award campus scope.";
  }
  if (award.office_id && nominee.officeId !== award.office_id) {
    return "Nominee is outside the award office scope.";
  }
  const duplicate = await findOpenDuplicateNomination({
    awardId: input.awardId,
    nomineeEmployeeId: input.nomineeEmployeeId,
    excludeNominationId: input.excludeNominationId,
  });
  if (duplicate) return "A nomination for this nominee and award already exists in active workflow.";
  return null;
}

export async function createRewardNominationAction(input: RewardNominationFormInput): Promise<NominationActionResult> {
  const parsed = rewardNominationFormSchema.safeParse(input);
  if (!parsed.success) return nominationFail(parsed.error.issues[0]?.message ?? "Invalid nomination.");
  const context = await requireAuthorizedUser();
  const nominatorEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!nominatorEmployeeId) return nominationFail("No linked employee profile.");
  const nominee = await getEmployeeById(parsed.data.nomineeEmployeeId);
  if (!nominee) return nominationFail("Nominee employee not found.");
  const eligibilityError = await ensureNominationEligibility({
    awardId: parsed.data.awardId,
    nomineeEmployeeId: parsed.data.nomineeEmployeeId,
    enforceWindow: true,
  });
  if (eligibilityError) return nominationFail(eligibilityError);
  await requirePermission({
    permission: "rewards.nomination.create",
    campusId: nominee.campusId,
    officeId: nominee.officeId ?? undefined,
  });
  const result = await createRewardsNomination({
    awardId: parsed.data.awardId,
    nomineeEmployeeId: parsed.data.nomineeEmployeeId,
    nominatorEmployeeId,
    campusId: nominee.campusId,
    officeId: nominee.officeId,
    justification: parsed.data.justification.trim(),
    nominatorRemarks: parsed.data.nominatorRemarks?.trim() ? parsed.data.nominatorRemarks.trim() : null,
  });
  if (!result.ok || !result.nominationId) return nominationFail(result.error ?? "Failed to create nomination.");
  await safeAudit({
    eventType: "rewards.nomination.create",
    action: "create_rewards_nomination",
    entityType: "rewards_nominations",
    entityId: result.nominationId,
    campusId: nominee.campusId,
    metadata: { awardId: parsed.data.awardId, nomineeEmployeeId: parsed.data.nomineeEmployeeId },
  });
  revalidatePath("/rewards");
  revalidatePath("/rewards/nominations");
  return { ok: true, nominationId: result.nominationId };
}

export async function saveRewardNominationDraftAction(
  nominationId: string,
  input: RewardNominationFormInput
): Promise<NominationActionResult> {
  const parsed = rewardNominationFormSchema.safeParse(input);
  if (!parsed.success) return nominationFail(parsed.error.issues[0]?.message ?? "Invalid nomination.");
  const context = await requireAuthorizedUser();
  const actorEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!actorEmployeeId) return nominationFail("No linked employee profile.");
  const current = await getRewardsNominationById(nominationId);
  if (!current) return nominationFail("Nomination not found.");
  if (current.nominatorEmployeeId !== actorEmployeeId) return nominationFail("You can only edit your own nomination.");
  if (!["draft", "needs_revision"].includes(current.status)) return nominationFail("Only draft or revision nominations can be edited.");
  const nominee = await getEmployeeById(parsed.data.nomineeEmployeeId);
  if (!nominee) return nominationFail("Nominee employee not found.");
  const eligibilityError = await ensureNominationEligibility({
    awardId: parsed.data.awardId,
    nomineeEmployeeId: parsed.data.nomineeEmployeeId,
    excludeNominationId: nominationId,
    enforceWindow: false,
  });
  if (eligibilityError) return nominationFail(eligibilityError);
  await requirePermission({
    permission: "rewards.nomination.create",
    campusId: nominee.campusId,
    officeId: nominee.officeId ?? undefined,
  });
  const result = await updateRewardsNominationDraft(nominationId, parsed.data);
  if (!result.ok) return nominationFail(result.error ?? "Failed to save nomination draft.");
  await safeAudit({
    eventType: "rewards.nomination.update",
    action: "update_rewards_nomination_draft",
    entityType: "rewards_nominations",
    entityId: nominationId,
    campusId: nominee.campusId,
    metadata: { awardId: parsed.data.awardId, nomineeEmployeeId: parsed.data.nomineeEmployeeId },
  });
  revalidatePath("/rewards/nominations");
  revalidatePath(`/rewards/nominations/${nominationId}`);
  revalidatePath(`/rewards/nominations/${nominationId}/edit`);
  return { ok: true, nominationId };
}

export async function submitRewardNominationAction(
  nominationId: string,
  input: RewardNominationFormInput
): Promise<NominationActionResult> {
  const saveResult = await saveRewardNominationDraftAction(nominationId, input);
  if (!saveResult.ok) return saveResult;
  const context = await requireAuthorizedUser();
  const actorEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!actorEmployeeId) return nominationFail("No linked employee profile.");
  const current = await getRewardsNominationById(nominationId);
  if (!current) return nominationFail("Nomination not found.");
  if (current.nominatorEmployeeId !== actorEmployeeId) return nominationFail("You can only submit your own nomination.");
  if (!["draft", "needs_revision"].includes(current.status)) return nominationFail("Only draft or revision nominations can be submitted.");
  const eligibilityError = await ensureNominationEligibility({
    awardId: current.awardId,
    nomineeEmployeeId: current.nomineeEmployeeId,
    excludeNominationId: nominationId,
    enforceWindow: true,
  });
  if (eligibilityError) return nominationFail(eligibilityError);
  const nominee = await getEmployeeById(current.nomineeEmployeeId);
  if (!nominee) return nominationFail("Nominee employee not found.");
  await requirePermission({
    permission: "rewards.nomination.create",
    campusId: nominee.campusId,
    officeId: nominee.officeId ?? undefined,
  });
  const statusResult = await updateRewardsNominationStatus(nominationId, "submitted");
  if (!statusResult.ok) return nominationFail(statusResult.error ?? "Failed to submit nomination.");
  await safeAudit({
    eventType: "rewards.nomination.submit",
    action: "submit_rewards_nomination",
    entityType: "rewards_nominations",
    entityId: nominationId,
    campusId: nominee.campusId,
    metadata: { awardId: current.awardId, nomineeEmployeeId: current.nomineeEmployeeId },
  });
  revalidatePath("/rewards/nominations");
  revalidatePath("/rewards/reviews");
  revalidatePath(`/rewards/nominations/${nominationId}`);
  return { ok: true, nominationId };
}

export async function submitRewardNominationReviewAction(
  nominationId: string,
  input: RewardsReviewDecisionInput
): Promise<NominationActionResult> {
  const parsed = rewardsReviewDecisionSchema.safeParse(input);
  if (!parsed.success) return nominationFail(parsed.error.issues[0]?.message ?? "Invalid review decision.");
  const context = await requireAuthorizedUser();
  const actorEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!actorEmployeeId) return nominationFail("No linked employee profile.");
  const nomination = await getRewardsNominationScopeById(nominationId);
  if (!nomination) return nominationFail("Nomination not found.");
  await requirePermission({
    permission: "rewards.nomination.review",
    campusId: nomination.campus_id,
    officeId: nomination.office_id ?? undefined,
  });

  if (!["submitted", "under_review"].includes(nomination.status)) {
    return nominationFail("Only submitted or under-review nominations can be reviewed.");
  }
  if (nomination.nominator_employee_id === actorEmployeeId || nomination.nominee_employee_id === actorEmployeeId) {
    return nominationFail("Conflict of interest: nominators/nominees cannot review this nomination.");
  }
  const assignedReviewerUserIds = await listRewardsCommitteeAssignmentUserIds(nominationId);
  if (assignedReviewerUserIds.length > 0 && !assignedReviewerUserIds.includes(context.appUserId)) {
    return nominationFail("You are not assigned to this committee review.");
  }

  if (nomination.status === "submitted") {
    const moveToUnderReview = await updateRewardsNominationStatus(nominationId, "under_review");
    if (!moveToUnderReview.ok) return nominationFail(moveToUnderReview.error ?? "Failed to start review.");
  }

  const saveReview = await addRewardsNominationReview(nominationId, actorEmployeeId, parsed.data);
  if (!saveReview.ok) return nominationFail(saveReview.error ?? "Failed to save review.");

  let targetStatus: "under_review" | "recommended" | "needs_revision" | "rejected";
  if (parsed.data.decision === "request_revision") {
    targetStatus = "needs_revision";
  } else if (parsed.data.decision === "reject") {
    targetStatus = "rejected";
  } else {
    const summary = await getRewardsNominationReviewSummary(nominationId);
    targetStatus =
      summary.totalReviews >= COMMITTEE_MIN_REVIEWERS && summary.recommendCount >= COMMITTEE_MIN_RECOMMENDATIONS
        ? "recommended"
        : "under_review";
  }
  const updateStatus = await updateRewardsNominationStatus(nominationId, targetStatus);
  if (!updateStatus.ok) return nominationFail(updateStatus.error ?? "Failed to update nomination status.");

  const saveRemarks = await updateRewardsNominationReviewerRemarks(nominationId, parsed.data.remarks ?? null);
  if (!saveRemarks.ok) return nominationFail(saveRemarks.error ?? "Failed to save reviewer remarks.");

  await safeAudit({
    eventType: "rewards.nomination.review",
    action: "review_rewards_nomination",
    entityType: "rewards_nominations",
    entityId: nominationId,
    campusId: nomination.campus_id,
    metadata: {
      decision: parsed.data.decision,
      score: parsed.data.score ?? null,
      nextStatus: targetStatus,
    },
  });

  revalidatePath("/rewards");
  revalidatePath("/rewards/reviews");
  revalidatePath("/rewards/approvals");
  revalidatePath("/rewards/nominations");
  revalidatePath(`/rewards/nominations/${nominationId}`);
  revalidatePath(`/rewards/reviews/${nominationId}`);
  return { ok: true, nominationId };
}

export async function submitRewardNominationApprovalAction(
  nominationId: string,
  input: RewardsApprovalDecisionInput
): Promise<NominationActionResult> {
  const parsed = rewardsApprovalDecisionSchema.safeParse(input);
  if (!parsed.success) return nominationFail(parsed.error.issues[0]?.message ?? "Invalid approval decision.");
  const context = await requireAuthorizedUser();
  const actorEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  const nomination = await getRewardsNominationScopeById(nominationId);
  if (!nomination) return nominationFail("Nomination not found.");
  await requirePermission({
    permission: "rewards.nomination.approve",
    campusId: nomination.campus_id,
    officeId: nomination.office_id ?? undefined,
  });
  if (actorEmployeeId && (nomination.nominator_employee_id === actorEmployeeId || nomination.nominee_employee_id === actorEmployeeId)) {
    return nominationFail("Conflict of interest: nominators/nominees cannot approve this nomination.");
  }

  if (nomination.status !== "recommended") {
    return nominationFail("Only recommended nominations can be approved or rejected.");
  }

  if (parsed.data.decision === "reject") {
    if (nomination.status !== "recommended") {
      return nominationFail("Only recommended nominations can be rejected.");
    }
    const rejectStatus = await updateRewardsNominationStatus(nominationId, "rejected");
    if (!rejectStatus.ok) return nominationFail(rejectStatus.error ?? "Failed to reject nomination.");
    const saveRemarks = await updateRewardsNominationApproverRemarks(nominationId, parsed.data.remarks ?? null);
    if (!saveRemarks.ok) return nominationFail(saveRemarks.error ?? "Failed to save approver remarks.");
    await safeAudit({
      eventType: "rewards.nomination.approval",
      action: "reject_rewards_nomination",
      entityType: "rewards_nominations",
      entityId: nominationId,
      campusId: nomination.campus_id,
      metadata: { decision: "reject" },
    });
  } else {
    const approveStatus = await updateRewardsNominationStatus(nominationId, "approved");
    if (!approveStatus.ok) return nominationFail(approveStatus.error ?? "Failed to approve nomination.");
    const saveRemarks = await updateRewardsNominationApproverRemarks(nominationId, parsed.data.remarks ?? null);
    if (!saveRemarks.ok) return nominationFail(saveRemarks.error ?? "Failed to save approver remarks.");
    await safeAudit({
      eventType: "rewards.nomination.approval",
      action: "approve_rewards_nomination",
      entityType: "rewards_nominations",
      entityId: nominationId,
      campusId: nomination.campus_id,
      metadata: { decision: "approve", finalizedAsAwarded: false },
    });
  }

  revalidatePath("/rewards");
  revalidatePath("/rewards/approvals");
  revalidatePath("/rewards/history");
  revalidatePath("/rewards/nominations");
  revalidatePath(`/rewards/nominations/${nominationId}`);
  revalidatePath(`/rewards/approvals/${nominationId}`);
  return { ok: true, nominationId };
}

export async function finalizeRewardNominationAwardingAction(nominationId: string): Promise<NominationActionResult> {
  const context = await requireAuthorizedUser();
  const actorEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  const nomination = await getRewardsNominationScopeById(nominationId);
  if (!nomination) return nominationFail("Nomination not found.");
  await requirePermission({
    permission: "rewards.nomination.approve",
    campusId: nomination.campus_id,
    officeId: nomination.office_id ?? undefined,
  });
  if (actorEmployeeId && (nomination.nominator_employee_id === actorEmployeeId || nomination.nominee_employee_id === actorEmployeeId)) {
    return nominationFail("Conflict of interest: nominators/nominees cannot finalize awarding.");
  }
  if (nomination.status !== "approved") {
    return nominationFail("Only approved nominations can be finalized to awarded.");
  }
  const existingAwardee = await findRewardAwardeeByNominationId(nominationId);
  if (!existingAwardee) {
    const awardeeResult = await createRewardAwardee({
      nominationId,
      awardId: nomination.award_id,
      awardeeEmployeeId: nomination.nominee_employee_id,
      campusId: nomination.campus_id,
      officeId: nomination.office_id,
    });
    if (!awardeeResult.ok && awardeeResult.code !== "23505") {
      return nominationFail(awardeeResult.error ?? "Failed to create awardee record.");
    }
  }
  const awardedStatus = await updateRewardsNominationStatus(nominationId, "awarded");
  if (!awardedStatus.ok) return nominationFail(awardedStatus.error ?? "Failed to finalize nomination as awarded.");
  await safeAudit({
    eventType: "rewards.nomination.award",
    action: "finalize_rewards_nomination_award",
    entityType: "rewards_nominations",
    entityId: nominationId,
    campusId: nomination.campus_id,
    metadata: { finalizedAsAwarded: true },
  });
  revalidatePath("/rewards");
  revalidatePath("/rewards/approvals");
  revalidatePath("/rewards/history");
  revalidatePath("/rewards/nominations");
  revalidatePath(`/rewards/nominations/${nominationId}`);
  revalidatePath(`/rewards/approvals/${nominationId}`);
  return { ok: true, nominationId };
}

export async function saveRewardsCommitteeAssignmentsAction(
  nominationId: string,
  input: RewardsCommitteeAssignmentInput
): Promise<NominationActionResult> {
  const parsed = rewardsCommitteeAssignmentSchema.safeParse(input);
  if (!parsed.success) return nominationFail(parsed.error.issues[0]?.message ?? "Invalid committee assignment.");
  const nomination = await getRewardsNominationScopeById(nominationId);
  if (!nomination) return nominationFail("Nomination not found.");
  await requirePermission({
    permission: "rewards.nomination.approve",
    campusId: nomination.campus_id,
    officeId: nomination.office_id ?? undefined,
  });
  const options = await listCommitteeReviewerOptionsByNomination(nominationId);
  const allowed = new Set(options.map((row) => row.userId));
  for (const userId of parsed.data.reviewerUserIds) {
    if (!allowed.has(userId)) {
      return nominationFail("One or more reviewers are not eligible committee members for this nomination scope.");
    }
  }
  if (parsed.data.chairUserId && !allowed.has(parsed.data.chairUserId)) {
    return nominationFail("Selected chair is not eligible for this nomination scope.");
  }
  const result = await replaceRewardsCommitteeAssignments(
    nominationId,
    [...new Set(parsed.data.reviewerUserIds)],
    parsed.data.chairUserId ?? null
  );
  if (!result.ok) return nominationFail(result.error ?? "Failed to save committee assignments.");
  await safeAudit({
    eventType: "rewards.nomination.committee.assignment",
    action: "save_rewards_committee_assignments",
    entityType: "rewards_nominations",
    entityId: nominationId,
    campusId: nomination.campus_id,
    metadata: {
      reviewerUserIds: [...new Set(parsed.data.reviewerUserIds)],
      chairUserId: parsed.data.chairUserId ?? null,
    },
  });
  revalidatePath("/rewards/reviews");
  revalidatePath(`/rewards/reviews/${nominationId}`);
  revalidatePath(`/rewards/approvals/${nominationId}`);
  return { ok: true, nominationId };
}

