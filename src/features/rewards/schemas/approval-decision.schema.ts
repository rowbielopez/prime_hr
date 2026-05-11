import { z } from "zod";

export const rewardsApprovalDecisionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    remarks: z.string().trim().max(3000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "reject" && (!data.remarks || data.remarks.trim().length < 5)) {
      ctx.addIssue({
        code: "custom",
        path: ["remarks"],
        message: "Remarks are required when rejecting a recommendation.",
      });
    }
  });

export type RewardsApprovalDecisionInput = z.infer<typeof rewardsApprovalDecisionSchema>;

