export type PerformanceCycleStatus = "draft" | "active" | "closed" | "archived";
export type PerformanceRecordStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "approved"
  | "finalized"
  | "rejected"
  | "withdrawn";
export type PerformanceRatingBand =
  | "Outstanding"
  | "Very Satisfactory"
  | "Satisfactory"
  | "Needs Improvement"
  | "Poor";

export type PerformanceCycleListItem = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  submissionDeadline: string;
  reviewDeadline: string;
  endDate: string;
  campusId: string | null;
  campusName: string | null;
  officeId: string | null;
  officeName: string | null;
  status: PerformanceCycleStatus;
  updatedAt: string;
};

export type PerformanceCycleDetail = PerformanceCycleListItem;

export type PerformanceDashboardSummary = {
  activeCycles: number;
  totalRecords: number;
  submittedRecords: number;
  finalizedRecords: number;
  pendingReviews: number;
  rejectedRecords: number;
};

export type PerformanceCycleProgressRow = {
  cycleId: string;
  cycleName: string;
  totalRecords: number;
  finalized: number;
  pendingReview: number;
};

export type PerformanceStatusCount = {
  status: PerformanceRecordStatus;
  count: number;
};

export type PerformanceFinalSummaryRow = {
  id: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  campusName: string;
  finalScore: number;
  finalRating: PerformanceRatingBand;
  finalizedAt: string;
  latestSnapshotAt: string | null;
  snapshotCount: number;
};
