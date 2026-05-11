import { z } from "zod";

export const planFormSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  title: z.string().trim().min(3, "Title is required").max(200, "Title is too long"),
  campusId: z.string().uuid("Campus is required"),
  status: z.enum(["draft", "approved", "active", "closed"]),
  notes: z.string().trim().max(2000, "Notes are too long").nullable().optional(),
});

export type PlanFormInput = z.infer<typeof planFormSchema>;

export const planItemFormSchema = z.object({
  programId: z.string().uuid("Program is required"),
  quarter: z.coerce.number().int().min(1).max(4),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export type PlanItemFormInput = z.infer<typeof planItemFormSchema>;
