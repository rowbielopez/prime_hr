import type { AttendanceStatus, CompletionStatus, CompetencyAssessmentStatus, CompetencyStatus } from "@/features/learning/types";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  registered: "Registered",
  attended: "Attended",
  absent: "Absent",
  excused: "Excused",
};

export const COMPLETION_LABELS: Record<CompletionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  waived: "Waived",
  not_completed: "Not completed",
};

export const COMPETENCY_STATUS_LABELS: Record<CompetencyStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const COMPETENCY_ASSESSMENT_STATUS_LABELS: Record<CompetencyAssessmentStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  validated: "Validated",
};
