import { z } from "zod";

export const competencyFormSchema = z.object({
  code: z.string().trim().min(2).max(40),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  campusId: z.preprocess((v) => (v === "" ? null : v), z.union([z.string().uuid(), z.null()])),
  officeId: z.preprocess((v) => (v === "" ? null : v), z.union([z.string().uuid(), z.null()])),
  status: z.enum(["draft", "active", "archived"]),
});

export type CompetencyFormInput = z.infer<typeof competencyFormSchema>;
