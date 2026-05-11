import { z } from "zod";

export const rewardAwardFormSchema = z
  .object({
    code: z.string().trim().min(2).max(50),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(3000).nullable().optional(),
    nominationStartDate: z.preprocess((v) => (v === "" ? null : v), z.union([z.string(), z.null()])),
    nominationEndDate: z.preprocess((v) => (v === "" ? null : v), z.union([z.string(), z.null()])),
    reviewEndDate: z.preprocess((v) => (v === "" ? null : v), z.union([z.string(), z.null()])),
    campusId: z.preprocess((v) => (v === "" ? null : v), z.union([z.string().uuid(), z.null()])),
    officeId: z.preprocess((v) => (v === "" ? null : v), z.union([z.string().uuid(), z.null()])),
    status: z.enum(["draft", "active", "inactive", "archived"]),
  })
  .superRefine((data, ctx) => {
    const start = data.nominationStartDate ? Date.parse(data.nominationStartDate) : null;
    const end = data.nominationEndDate ? Date.parse(data.nominationEndDate) : null;
    const review = data.reviewEndDate ? Date.parse(data.reviewEndDate) : null;
    if (start !== null && Number.isNaN(start)) {
      ctx.addIssue({ code: "custom", path: ["nominationStartDate"], message: "Invalid nomination start date." });
    }
    if (end !== null && Number.isNaN(end)) {
      ctx.addIssue({ code: "custom", path: ["nominationEndDate"], message: "Invalid nomination end date." });
    }
    if (review !== null && Number.isNaN(review)) {
      ctx.addIssue({ code: "custom", path: ["reviewEndDate"], message: "Invalid review end date." });
    }
    if (start !== null && end !== null && !Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      ctx.addIssue({
        code: "custom",
        path: ["nominationEndDate"],
        message: "Nomination end date cannot be before nomination start date.",
      });
    }
    if (end !== null && review !== null && !Number.isNaN(end) && !Number.isNaN(review) && review < end) {
      ctx.addIssue({
        code: "custom",
        path: ["reviewEndDate"],
        message: "Review end date cannot be before nomination end date.",
      });
    }
    if (data.officeId && !data.campusId) {
      ctx.addIssue({
        code: "custom",
        path: ["officeId"],
        message: "Campus is required when office is selected.",
      });
    }
  });

export type RewardAwardFormInput = z.infer<typeof rewardAwardFormSchema>;

