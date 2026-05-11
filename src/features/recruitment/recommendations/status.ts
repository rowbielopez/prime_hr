import type { StatusTone } from "@/components/foundation/feedback/status-badge";
import type { RecommendationStatus } from "@/features/recruitment/recommendations/types";

export const recommendationStatusOrder: RecommendationStatus[] = [
  "draft",
  "for_review",
  "endorsed",
  "approved",
  "rejected",
];

export function mapRecommendationStatusToTone(status: RecommendationStatus): StatusTone {
  if (status === "approved") return "active";
  if (status === "for_review" || status === "endorsed") return "pending";
  if (status === "rejected") return "inactive";
  return "info";
}

const recommendationTransitions: Record<RecommendationStatus, RecommendationStatus[]> = {
  draft: ["for_review", "rejected"],
  for_review: ["endorsed", "rejected", "draft"],
  endorsed: ["approved", "rejected", "for_review"],
  approved: [],
  rejected: ["draft", "for_review"],
};

export function canTransitionRecommendationStatus(from: RecommendationStatus, to: RecommendationStatus) {
  if (from === to) return true;
  return recommendationTransitions[from].includes(to);
}

export function getAllowedRecommendationNextStatuses(from: RecommendationStatus): RecommendationStatus[] {
  return [...recommendationTransitions[from]];
}
