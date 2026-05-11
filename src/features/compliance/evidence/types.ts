export type EvidenceStatus = "draft" | "submitted" | "approved" | "rejected";

export type GapStatus = "open" | "in_progress" | "closed";

export type PrimeArea = {
  id: string;
  code: string;
  name: string;
};

export type ComplianceIndicator = {
  id: string;
  areaId: string;
  areaName: string;
  code: string;
  title: string;
  description: string | null;
};

export type EvidenceListItem = {
  id: string;
  title: string;
  areaName: string;
  indicatorCode: string;
  indicatorTitle: string;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  status: EvidenceStatus;
  dueDate: string | null;
  submittedAt: string | null;
  updatedAt: string;
};

export type EvidenceAttachmentItem = {
  id: string;
  evidenceId: string;
  fileName: string;
  fileType: string;
  storageBucket: string;
  storagePath: string | null;
  uploadedAt: string;
  uploadedByUserId: string | null;
  uploadedByLabel: string | null;
};

export type DeletedEvidenceAttachmentItem = {
  id: string;
  evidenceId: string;
  fileName: string;
  fileType: string;
  storageBucket: string;
  storagePath: string | null;
  uploadedAt: string;
  uploadedByLabel: string | null;
  deletedAt: string;
  deletedByUserId: string | null;
  deletedByLabel: string | null;
  storageDeletedAt: string | null;
  canRestore: boolean;
};

export type EvidenceActionPlan = {
  id: string;
  evidenceId: string;
  gapSummary: string;
  correctiveAction: string;
  ownerName: string;
  ownerUserId: string | null;
  ownerOfficeId: string | null;
  gapSeverity: "low" | "medium" | "high" | "critical";
  gapCategory: "policy" | "process" | "documentation" | "systems" | "people" | "other";
  rootCause: string | null;
  referenceClause: string | null;
  progressPercent: number;
  lastProgressAt: string | null;
  lastProgressByLabel: string | null;
  dueDate: string;
  status: GapStatus;
  progressNotes: string | null;
  updatedAt: string;
};

export type ActionPlanHistoryEvent = {
  id: string;
  evidenceId: string;
  actionPlanId: string;
  eventType: "created" | "updated";
  changedAt: string;
  changedByLabel: string | null;
};

export type EvidenceStatusEvent = {
  id: string;
  evidenceId: string;
  fromStatus: EvidenceStatus | null;
  toStatus: EvidenceStatus;
  remarks: string | null;
  changedAt: string;
  changedByUserId: string | null;
  changedByLabel: string | null;
};

export type EvidenceDetail = {
  id: string;
  title: string;
  description: string | null;
  areaId: string;
  areaName: string;
  indicatorId: string;
  indicatorCode: string;
  indicatorTitle: string;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  reportingPeriod: string;
  ownerUserId: string | null;
  ownerName: string | null;
  dueDate: string | null;
  status: EvidenceStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  reviewerRemarks: string | null;
  attachments: EvidenceAttachmentItem[];
  deletedAttachments: DeletedEvidenceAttachmentItem[];
  actionPlan: EvidenceActionPlan | null;
  actionPlanHistory: ActionPlanHistoryEvent[];
  statusHistory: EvidenceStatusEvent[];
};

export type UnresolvedGapListItem = {
  evidenceId: string;
  evidenceTitle: string;
  campusName: string;
  officeName: string | null;
  indicatorCode: string;
  indicatorTitle: string;
  gapSeverity: "low" | "medium" | "high" | "critical";
  gapCategory: "policy" | "process" | "documentation" | "systems" | "people" | "other";
  actionPlanStatus: GapStatus;
  progressPercent: number;
  dueDate: string;
  isOverdue: boolean;
  ownerName: string;
  ownerUserLabel: string | null;
  responsibleOfficeLabel: string | null;
  lastProgressAt: string | null;
};

export type ComplianceDashboardSummary = {
  totalItems: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  withOpenGapCount: number;
  overdueCount: number;
};

export type ComplianceDashboardCampusBreakdown = {
  campusId: string;
  campusName: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
};

