export type VacancyStatus = "draft" | "open" | "for_review" | "filled" | "closed" | "cancelled";

export type VacancyApplicationStatus = "submitted" | "screening" | "interview" | "for_offer" | "hired" | "rejected" | "withdrawn";

export type VacancyApplicantStatus = "new" | "screening" | "shortlisted" | "hired" | "rejected" | "withdrawn";

export type VacancyApplicationStatusCounts = Record<VacancyApplicationStatus, number>;

export type VacancyListItem = {
  id: string;
  title: string;
  plantillaItemNo: string | null;
  campusId: string;
  campusName: string;
  officeId: string | null;
  officeName: string | null;
  employmentType: string | null;
  itemCount: number;
  status: VacancyStatus;
  postedAt: string | null;
  closingAt: string | null;
  updatedAt: string;
  publicSlug: string | null;
  applicantsCount: number;
  applicationStatusCounts: VacancyApplicationStatusCounts;
};

export type VacancyDetail = VacancyListItem & {
  description: string | null;
  qualificationNotes: string | null;
  remarks: string | null;
  requiredDocuments: string[];
};

export type VacancyApplicationRecord = {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string | null;
  applicantMobileNo: string | null;
  applicantStatus: VacancyApplicantStatus;
  applicantSource: string | null;
  applicationStatus: VacancyApplicationStatus;
  appliedAt: string | null;
  remarks: string | null;
  updatedAt: string;
};
