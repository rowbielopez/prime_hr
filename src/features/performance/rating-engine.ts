import type { PerformanceRatingBand } from "@/features/performance/types";
import { PERFORMANCE_RATING_BAND_RULES } from "@/features/performance/rating-band-config";

export function mapScoreToRatingBand(score: number): PerformanceRatingBand {
  const resolved = PERFORMANCE_RATING_BAND_RULES.find((row) => score >= row.minScore);
  return resolved?.band ?? "Poor";
}

export function computeWeightedFinalScore(rows: Array<{ weight: number; reviewerScore: number }>): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce((acc, row) => acc + row.weight, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error("Objective weights must total 100% before finalization.");
  }
  const score = rows.reduce((acc, row) => acc + (row.weight * row.reviewerScore) / 100, 0);
  return Number(score.toFixed(2));
}
