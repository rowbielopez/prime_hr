import { z } from "zod";

export const trainingRequestFormSchema = z
  .object({
    campusId: z.string().uuid("Campus is required"),
    programId: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    customTitle: z.string().trim().max(200).nullable().optional(),
    justification: z.string().trim().min(10, "Justification should be at least 10 characters").max(2000),
    remarks: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.programId && (!data.customTitle || data.customTitle.trim().length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Select a catalog program or enter a custom training title.",
        path: ["customTitle"],
      });
    }
  });

export type TrainingRequestFormInput = z.infer<typeof trainingRequestFormSchema>;

/** HR / manager nomination: choose employee, training, and notes. */
export const trainingNominationFormSchema = z
  .object({
    campusId: z.string().uuid("Campus is required"),
    subjectEmployeeId: z.string().uuid("Employee is required"),
    programId: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    customTitle: z.string().trim().max(200).nullable().optional(),
    justification: z.string().trim().min(10, "Provide a short rationale (at least 10 characters)").max(2000),
    remarks: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.programId && (!data.customTitle || data.customTitle.trim().length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Select a catalog program or enter a custom training title.",
        path: ["customTitle"],
      });
    }
  });

export type TrainingNominationFormInput = z.infer<typeof trainingNominationFormSchema>;

export const trainingRequestReviewSchema = z
  .object({
    status: z.enum(["under_review", "approved", "rejected"]),
    reviewerNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "rejected" && (!data.reviewerNotes || data.reviewerNotes.trim().length < 5)) {
      ctx.addIssue({
        code: "custom",
        path: ["reviewerNotes"],
        message: "Reviewer notes are required when rejecting a request.",
      });
    }
  });

export type TrainingRequestReviewInput = z.infer<typeof trainingRequestReviewSchema>;
