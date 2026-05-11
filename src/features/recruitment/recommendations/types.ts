export type RecommendationStatus = "draft" | "for_review" | "endorsed" | "approved" | "rejected";

export type RankingListItem = {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  applicantId: string;
  applicantName: string;
  rankNo: number;
  score: number | null;
  remarks: string | null;
  recommendationStatus: RecommendationStatus;
  updatedAt: string;
};

export type RecommendationListItem = {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  applicantId: string;
  applicantName: string;
  status: RecommendationStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationDetail = RecommendationListItem & {
  justification: string | null;
  decidedAt: string | null;
};

export type RecommendationReportSummary = {
  total: number;
  byStatus: Record<RecommendationStatus, number>;
  recentlyUpdatedCount: number;
};

export type RecommendationVacancyBreakdown = {
  vacancyId: string;
  vacancyTitle: string;
  total: number;
  approved: number;
  endorsed: number;
  forReview: number;
  rejected: number;
  draft: number;
};
