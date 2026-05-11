import { z } from "zod";

export const programFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required").max(200, "Title is too long"),
    description: z.string().trim().max(2000, "Description is too long").nullable().optional(),
    modality: z.enum(["classroom", "online", "blended"]),
    durationHours: z.coerce.number().positive("Duration must be greater than zero").max(999, "Duration is too high"),
    campusId: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? null : val),
      z.union([z.string().uuid(), z.null()])
    ),
    officeId: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? null : val),
      z.union([z.string().uuid(), z.null()])
    ),
    status: z.enum(["draft", "active", "archived"]),
  })
  .superRefine((data, ctx) => {
    if (data.officeId && !data.campusId) {
      ctx.addIssue({ code: "custom", message: "Select a campus before choosing an office.", path: ["officeId"] });
    }
  });

export type ProgramFormInput = z.infer<typeof programFormSchema>;

export const programStatusOnlySchema = z.object({
  status: z.enum(["draft", "active", "archived"]),
});

export type ProgramStatusOnlyInput = z.infer<typeof programStatusOnlySchema>;
