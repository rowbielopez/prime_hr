export type TrainingModality = "classroom" | "online" | "blended";
export type ProgramStatus = "draft" | "active" | "archived";
export type PlanStatus = "draft" | "approved" | "active" | "closed";
export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type RequestStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
export type TrainingRequestKind = "self_request" | "nomination";
export type ParticipantSource = "assigned" | "nominated" | "self_registered";
export type AttendanceStatus = "registered" | "attended" | "absent" | "excused";
export type CompletionStatus = "not_started" | "in_progress" | "completed" | "waived" | "not_completed";
export type CompetencyStatus = "draft" | "active" | "archived";
export type CompetencyAssessmentStatus = "draft" | "submitted" | "validated";

export type TrainingProgramListItem = {
  id: string;
  title: string;
  modality: TrainingModality;
  durationHours: number;
  campusId: string | null;
  campusName: string | null;
  officeId: string | null;
  officeName: string | null;
  status: ProgramStatus;
  updatedAt: string;
};

export type TrainingProgramDetail = TrainingProgramListItem & {
  description: string | null;
};

export type AnnualPlanListItem = {
  id: string;
  year: number;
  title: string;
  campusId: string;
  campusName: string;
  status: PlanStatus;
  updatedAt: string;
};

export type AnnualPlanItem = {
  id: string;
  programId: string;
  programTitle: string;
  quarter: number;
  notes: string | null;
};

export type AnnualPlanDetail = AnnualPlanListItem & {
  notes: string | null;
  items: AnnualPlanItem[];
};

export type TrainingSessionListItem = {
  id: string;
  title: string;
  programId: string;
  programTitle: string;
  campusId: string;
  campusName: string;
  startsAt: string;
  endsAt: string;
  venue: string | null;
  capacity: number | null;
  status: SessionStatus;
  updatedAt: string;
};

export type TrainingSessionDetail = TrainingSessionListItem & {
  participantCount: number;
};

export type TrainingRequestListItem = {
  id: string;
  campusId: string;
  campusName: string;
  /** Employee the training is for (subject / trainee). */
  requesterEmployeeId: string;
  requesterName: string;
  requestKind: TrainingRequestKind;
  submittedByEmployeeId: string | null;
  submittedByName: string | null;
  programId: string | null;
  programTitle: string | null;
  customTitle: string | null;
  status: RequestStatus;
  justification: string;
  remarks: string | null;
  reviewerNotes: string | null;
  updatedAt: string;
};

export type SessionParticipantRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  source: ParticipantSource;
  attendance: AttendanceStatus;
  completion: CompletionStatus;
  completedAt: string | null;
  notes: string | null;
};

/** Participants across all sessions for a catalog program (read-only overview). */
export type ProgramParticipantOverviewRow = {
  participantId: string;
  sessionId: string;
  sessionTitle: string;
  sessionStartsAt: string;
  employeeName: string;
  employeeNo: string;
  source: ParticipantSource;
  attendance: AttendanceStatus;
  completion: CompletionStatus;
  completedAt: string | null;
  remarks: string | null;
};

/** Session participation row for “my training” and employee training history UIs. */
export type TrainingHistoryRow = {
  id: string;
  sessionId: string;
  programId: string;
  sessionTitle: string;
  programTitle: string;
  campusName: string;
  startsAt: string;
  endsAt: string;
  attendance: AttendanceStatus;
  completion: CompletionStatus;
  completedAt: string | null;
  notes: string | null;
};

export type MyTrainingRow = TrainingHistoryRow;

export type LearningDashboardSummary = {
  activePrograms: number;
  upcomingSessions: number;
  pendingRequests: number;
  completedLast90Days: number;
};

export type CompetencyListItem = {
  id: string;
  code: string;
  title: string;
  category: string | null;
  campusId: string | null;
  campusName: string | null;
  officeId: string | null;
  officeName: string | null;
  status: CompetencyStatus;
  updatedAt: string;
};

export type CompetencyDetail = CompetencyListItem & {
  description: string | null;
};

export type ProgramCompetencyMapItem = {
  id: string;
  programId: string;
  competencyId: string;
  competencyCode: string;
  competencyTitle: string;
  weight: number;
};

export type CompetencyAssessmentItem = {
  id: string;
  competencyId: string;
  competencyCode: string;
  competencyTitle: string;
  targetLevel: number;
  currentLevel: number;
  evidenceNotes: string | null;
};

export type CompetencyAssessmentListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  campusId: string;
  campusName: string;
  assessmentDate: string;
  status: CompetencyAssessmentStatus;
  remarks: string | null;
};

export type CompetencyAssessmentDetail = CompetencyAssessmentListItem & {
  assessorEmployeeId: string | null;
  reviewerEmployeeId: string | null;
  items: CompetencyAssessmentItem[];
};
