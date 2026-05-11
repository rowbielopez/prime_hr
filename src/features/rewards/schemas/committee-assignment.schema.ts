import { z } from "zod";

export const rewardsCommitteeAssignmentSchema = z
  .object({
    reviewerUserIds: z.array(z.string().uuid()).min(1, "At least one committee reviewer is required."),
    chairUserId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.chairUserId && !data.reviewerUserIds.includes(data.chairUserId)) {
      ctx.addIssue({
        code: "custom",
        path: ["chairUserId"],
        message: "Chair must be one of the assigned reviewers.",
      });
    }
  });

export type RewardsCommitteeAssignmentInput = z.infer<typeof rewardsCommitteeAssignmentSchema>;

