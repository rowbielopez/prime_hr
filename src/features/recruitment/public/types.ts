export type PublicVacancySummary = {
  slug: string;
  title: string;
  campusName: string;
  officeName: string | null;
  employmentType: string | null;
  itemCount: number;
  postedAt: string | null;
  closingAt: string | null;
};

export type PublicVacancyDetail = PublicVacancySummary & {
  description: string | null;
  qualificationNotes: string | null;
  plantillaItemNo: string | null;
  requiredDocuments: string[];
  updatedAt: string;
};

export type PublicApplicationResult =
  | { status: "ok"; referenceNo: string }
  | { status: "duplicate"; referenceNo: string }
  | { status: "vacancy_unavailable" }
  | { status: "rate_limited" }
  | { status: "validation_error"; fieldErrors: Record<string, string[]> }
  | { status: "error"; message: string };
