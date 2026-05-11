import { z } from "zod";

export const rewardsReviewDecisionSchema = z
  .object({
    decision: z.enum(["recommend", "request_revision", "reject"]),
    score: z.preprocess((v) => (v === "" || v == null ? null : v), z.union([z.coerce.number().min(0).max(100), z.null()])),
    remarks: z.string().trim().max(3000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision !== "recommend" && (!data.remarks || data.remarks.trim().length < 5)) {
      ctx.addIssue({
        code: "custom",
        path: ["remarks"],
        message: "Remarks are required for revision or rejection decisions.",
      });
    }
  });

export type RewardsReviewDecisionInput = z.infer<typeof rewardsReviewDecisionSchema>;

