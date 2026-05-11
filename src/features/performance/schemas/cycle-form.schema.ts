import { z } from "zod";

export const performanceCycleFormSchema = z
  .object({
    name: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    startDate: z.string().min(1),
    submissionDeadline: z.string().min(1),
    reviewDeadline: z.string().min(1),
    endDate: z.string().min(1),
    campusId: z.preprocess((v) => (v === "" ? null : v), z.union([z.string().uuid(), z.null()])),
    officeId: z.preprocess((v) => (v === "" ? null : v), z.union([z.string().uuid(), z.null()])),
    status: z.enum(["draft", "active", "closed", "archived"]),
  })
  .superRefine((data, ctx) => {
    const start = Date.parse(data.startDate);
    const submit = Date.parse(data.submissionDeadline);
    const review = Date.parse(data.reviewDeadline);
    const end = Date.parse(data.endDate);
    if ([start, submit, review, end].some(Number.isNaN)) {
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "Invalid cycle dates." });
      return;
    }
    if (submit < start) ctx.addIssue({ code: "custom", path: ["submissionDeadline"], message: "Submission deadline cannot be before start." });
    if (review < submit) ctx.addIssue({ code: "custom", path: ["reviewDeadline"], message: "Review deadline cannot be before submission deadline." });
    if (end < review) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date cannot be before review deadline." });
    if (data.officeId && !data.campusId) {
      ctx.addIssue({ code: "custom", path: ["officeId"], message: "Campus is required when office is set." });
    }
  });

export type PerformanceCycleFormInput = z.infer<typeof performanceCycleFormSchema>;
