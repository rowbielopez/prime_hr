import { z } from "zod";

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const evidenceFormSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long").nullable().optional(),
  areaId: z.string().uuid("Area is required"),
  indicatorId: z.string().uuid("Indicator is required"),
  campusId: z.string().uuid("Campus is required"),
  officeId: z.string().uuid("Office must be valid").nullable().optional(),
  reportingPeriod: z.string().regex(periodPattern, "Reporting period must be YYYY-MM"),
  dueDate: z.string().regex(datePattern, "Due date must be YYYY-MM-DD").nullable().optional(),
  ownerUserId: z
    .union([z.string().uuid("Owner must be a valid user id"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
});

export type EvidenceFormInput = z.infer<typeof evidenceFormSchema>;
