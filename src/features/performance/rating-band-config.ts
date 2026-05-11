import type { PerformanceRatingBand } from "@/features/performance/types";

export type PerformanceRatingBandRule = {
  band: PerformanceRatingBand;
  minScore: number;
  sortOrder: number;
};

/**
 * Single source for rating-band thresholds used by app logic and DB migrations.
 * Keep this list sorted by descending minScore.
 */
export const PERFORMANCE_RATING_BAND_RULES: PerformanceRatingBandRule[] = [
  { band: "Outstanding", minScore: 4.5, sortOrder: 1 },
  { band: "Very Satisfactory", minScore: 3.5, sortOrder: 2 },
  { band: "Satisfactory", minScore: 2.5, sortOrder: 3 },
  { band: "Needs Improvement", minScore: 1.5, sortOrder: 4 },
  { band: "Poor", minScore: 0, sortOrder: 5 },
];

