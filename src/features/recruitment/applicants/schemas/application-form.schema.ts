import { z } from "zod";

export const applicationCreateSchema = z.object({
  applicantId: z.string().uuid(),
  vacancyId: z.string().uuid("Vacancy is required"),
  status: z.enum(["submitted", "screening", "interview", "for_offer", "hired", "rejected", "withdrawn"]),
  appliedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Applied date must be YYYY-MM-DD").nullable().optional(),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;

export const applicationStatusSchema = z.object({
  status: z.enum(["submitted", "screening", "interview", "for_offer", "hired", "rejected", "withdrawn"]),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
});

export type ApplicationStatusInput = z.infer<typeof applicationStatusSchema>;
