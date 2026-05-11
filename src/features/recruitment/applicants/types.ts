export type ApplicantStatus = "new" | "screening" | "shortlisted" | "hired" | "rejected" | "withdrawn";

export type ApplicationStatus = "submitted" | "screening" | "interview" | "for_offer" | "hired" | "rejected" | "withdrawn";

export type ApplicantListItem = {
  id: string;
  fullName: string;
  email: string | null;
  mobileNo: string | null;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  status: ApplicantStatus;
  applicationsCount: number;
  updatedAt: string;
};

export type ApplicationRecord = {
  id: string;
  applicantId: string;
  vacancyId: string;
  vacancyTitle: string;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  remarks: string | null;
  updatedAt: string;
};

export type ScreeningResult = {
  id: string;
  applicantId: string;
  result: "pass" | "fail" | "hold";
  remarks: string | null;
  screenedAt: string;
};

export type InterviewRecord = {
  id: string;
  applicantId: string;
  applicationId: string | null;
  scheduledAt: string;
  interviewMode: "in_person" | "online" | "phone";
  panelRemarks: string | null;
  outcome: "pending" | "pass" | "fail" | "no_show";
  decidedAt: string | null;
};

export type ApplicationStatusHistoryItem = {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  remarks: string | null;
  changedAt: string;
};

export type ApplicantDetail = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  fullName: string;
  email: string | null;
  mobileNo: string | null;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  status: ApplicantStatus;
  notes: string | null;
  updatedAt: string;
  applications: ApplicationRecord[];
  screeningResults: ScreeningResult[];
  interviews: InterviewRecord[];
  statusHistory: ApplicationStatusHistoryItem[];
};
