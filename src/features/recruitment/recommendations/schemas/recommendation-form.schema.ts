import { z } from "zod";

export const rankingEntrySchema = z.object({
  vacancyId: z.string().uuid(),
  applicantId: z.string().uuid(),
  rankNo: z.coerce.number().int().min(1, "Rank is required"),
  score: z.coerce.number().min(0, "Score must be non-negative").max(100, "Score must be at most 100").nullable().optional(),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
  recommendationStatus: z.enum(["draft", "for_review", "endorsed", "approved", "rejected"]),
});

export type RankingEntryInput = z.infer<typeof rankingEntrySchema>;

export const recommendationSchema = z.object({
  vacancyId: z.string().uuid(),
  applicantId: z.string().uuid(),
  status: z.enum(["draft", "for_review", "endorsed", "approved", "rejected"]),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
  justification: z.string().trim().max(2000, "Justification is too long").nullable().optional(),
  decidedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Decision date must be YYYY-MM-DD").nullable().optional(),
});

export type RecommendationInput = z.infer<typeof recommendationSchema>;

export const recommendationStatusSchema = z.object({
  status: z.enum(["draft", "for_review", "endorsed", "approved", "rejected"]),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
});

export type RecommendationStatusInput = z.infer<typeof recommendationStatusSchema>;
