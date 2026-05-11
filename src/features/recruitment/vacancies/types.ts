export type VacancyStatus = "draft" | "open" | "for_review" | "filled" | "closed" | "cancelled";

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
};

export type VacancyDetail = VacancyListItem & {
  description: string | null;
  qualificationNotes: string | null;
  remarks: string | null;
};
