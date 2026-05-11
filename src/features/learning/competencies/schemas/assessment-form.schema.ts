import { z } from "zod";

const assessmentItemSchema = z.object({
  competencyId: z.string().uuid(),
  targetLevel: z.coerce.number().int().min(1).max(5),
  currentLevel: z.coerce.number().int().min(1).max(5),
  evidenceNotes: z.string().trim().max(2000).nullable().optional(),
});

export const competencyAssessmentFormSchema = z.object({
  employeeId: z.string().uuid(),
  campusId: z.string().uuid(),
  officeId: z.preprocess((v) => (v === "" ? null : v), z.union([z.string().uuid(), z.null()])),
  assessmentDate: z.string().min(1),
  status: z.enum(["draft", "submitted", "validated"]),
  remarks: z.string().trim().max(2000).nullable().optional(),
  items: z.array(assessmentItemSchema).min(1, "At least one competency rating is required."),
});

export type CompetencyAssessmentFormInput = z.infer<typeof competencyAssessmentFormSchema>;
