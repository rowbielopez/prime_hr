export type RewardAwardStatus = "draft" | "active" | "inactive" | "archived";

export type RewardNominationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "recommended"
  | "approved"
  | "awarded"
  | "rejected"
  | "withdrawn";

export type RewardDashboardSummary = {
  activeAwards: number;
  totalNominations: number;
  pendingReviews: number;
  approvedNominations: number;
  awardedCount: number;
};

export type RewardStatusCount = {
  status: RewardNominationStatus;
  count: number;
};

export type RewardAwardListItem = {
  id: string;
  code: string;
  title: string;
  campusName: string | null;
  officeName: string | null;
  status: RewardAwardStatus;
  updatedAt: string;
};

export type RewardNominationListItem = {
  id: string;
  awardTitle: string;
  nomineeName: string;
  nominatorName: string;
  status: RewardNominationStatus;
  updatedAt: string;
};

export type RewardNominationDetail = {
  id: string;
  awardId: string;
  awardTitle: string;
  nomineeEmployeeId: string;
  nomineeName: string;
  nominatorEmployeeId: string;
  nominatorName: string;
  status: RewardNominationStatus;
  justification: string;
  nominatorRemarks: string | null;
  reviewerRemarks: string | null;
  approverRemarks: string | null;
  updatedAt: string;
  submittedAt: string | null;
};

export type RewardNominationReviewItem = {
  id: string;
  decision: "recommend" | "request_revision" | "reject";
  score: number | null;
  remarks: string | null;
  reviewerName: string;
  createdAt: string;
};

export type RewardNominationReviewSummary = {
  totalReviews: number;
  recommendCount: number;
  requestRevisionCount: number;
  rejectCount: number;
  averageScore: number | null;
};

export type RewardCommitteeAssignmentItem = {
  id: string;
  reviewerUserId: string;
  reviewerName: string;
  reviewerEmail: string;
  assignmentRole: "member" | "chair";
  assignedAt: string;
};

export type RewardCommitteeReviewerOption = {
  userId: string;
  name: string;
  email: string;
};

export type RewardNominationStatusHistoryItem = {
  id: string;
  fromStatus: RewardNominationStatus | null;
  toStatus: RewardNominationStatus;
  changedByUserId: string | null;
  changedByName: string | null;
  changedAt: string;
};

export type RewardAwardeeHistoryItem = {
  id: string;
  awardTitle: string;
  awardeeName: string;
  campusName: string | null;
  awardedAt: string;
};

export type RewardsReportPeriod = {
  from: string | null;
  to: string | null;
};

export type RewardsApprovalTurnaroundSummary = {
  consideredCount: number;
  averageDays: number | null;
  medianDays: number | null;
  within7Days: number;
  within14Days: number;
};

export type RewardsApprovalTurnaroundMonthlyRow = {
  month: string;
  count: number;
  averageDays: number;
};

export type RewardsAwardDistributionByCampusRow = {
  campusId: string | null;
  campusName: string;
  awardeeCount: number;
};

