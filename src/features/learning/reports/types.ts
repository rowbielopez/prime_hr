export type ReportFilters = {
  campusId?: string;
  fromDate?: string;
  toDate?: string;
};

export type RequestPipelineRow = {
  campusId: string;
  campusName: string;
  requestKind: "self_request" | "nomination";
  status: string;
  requestCount: number;
};

export type SessionUtilizationRow = {
  sessionId: string;
  campusId: string;
  campusName: string;
  sessionTitle: string;
  startsAt: string;
  capacity: number | null;
  status: string;
  participantCount: number;
  attendedCount: number;
  absentCount: number;
  completedCount: number;
};

export type CompletionKpiDailyRow = {
  metricDate: string;
  campusId: string;
  programId: string;
  participantCount: number;
  completedCount: number;
  attendedCount: number;
};

export type DeliveryLoadMonthlyRow = {
  metricMonth: string;
  campusId: string;
  programId: string;
  sessionCount: number;
  plannedCapacity: number;
  enrolledCount: number;
};
