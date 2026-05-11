import { z } from "zod";

export const performanceObjectiveInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(200),
  metric: z.string().trim().max(500).nullable().optional(),
  targetValue: z.string().trim().max(500).nullable().optional(),
  weight: z.coerce.number().positive().max(100),
  accomplishments: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        periodDate: z.string().min(1),
        accomplishmentText: z.string().trim().min(3).max(3000),
        evidenceLink: z.string().trim().max(1000).nullable().optional(),
      })
    )
    .default([]),
});

export const performanceRecordDraftSchema = z
  .object({
    employeeComments: z.string().trim().max(3000).nullable().optional(),
    objectives: z.array(performanceObjectiveInputSchema).min(1, "Add at least one objective."),
  })
  .superRefine((data, ctx) => {
    const sum = data.objectives.reduce((acc, row) => acc + row.weight, 0);
    if (Math.abs(sum - 100) > 0.001) {
      ctx.addIssue({
        code: "custom",
        message: "Objective weights must total 100%.",
        path: ["objectives"],
      });
    }
  });

export const performanceReviewDecisionSchema = z
  .object({
    decision: z.enum(["approve", "request_revision", "reject"]),
    comments: z.string().trim().max(3000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "reject" && (!data.comments || data.comments.trim().length < 5)) {
      ctx.addIssue({
        code: "custom",
        path: ["comments"],
        message: "Remarks are required when rejecting a record (at least 5 characters).",
      });
    }
  });

export const performanceFinalizationSchema = z.object({
  finalizerComments: z.string().trim().max(3000).nullable().optional(),
  objectiveScores: z
    .array(
      z.object({
        objectiveId: z.string().uuid(),
        reviewerScore: z.coerce.number().min(1).max(5),
      })
    )
    .min(1),
});

export type PerformanceRecordDraftInput = z.infer<typeof performanceRecordDraftSchema>;
export type PerformanceReviewDecisionInput = z.infer<typeof performanceReviewDecisionSchema>;
export type PerformanceFinalizationInput = z.infer<typeof performanceFinalizationSchema>;
