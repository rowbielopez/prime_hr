import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const vacancyFormSchema = z.object({
  title: z.string().trim().min(3, "Vacancy title is required").max(200, "Vacancy title is too long"),
  description: z.string().trim().max(2000, "Description is too long").nullable().optional(),
  qualificationNotes: z.string().trim().max(2000, "Qualification notes are too long").nullable().optional(),
  plantillaItemNo: z.string().trim().max(100, "Plantilla item number is too long").nullable().optional(),
  employmentType: z.string().trim().max(100, "Employment type is too long").nullable().optional(),
  campusId: z.string().uuid("Campus is required"),
  officeId: z.string().uuid("Office must be valid").nullable().optional(),
  itemCount: z.coerce.number().int().min(1, "At least one item is required").max(999, "Item count is too high"),
  status: z.enum(["draft", "open", "for_review", "filled", "closed", "cancelled"]),
  postedAt: z.string().regex(datePattern, "Posted date must be YYYY-MM-DD").nullable().optional(),
  closingAt: z.string().regex(datePattern, "Closing date must be YYYY-MM-DD").nullable().optional(),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
});

export type VacancyFormInput = z.infer<typeof vacancyFormSchema>;
