import { z } from "zod";

export const officeTypeValues = ["academic", "administrative", "student_services", "other"] as const;
export type OfficeTypeValue = (typeof officeTypeValues)[number];

export const officeFormSchema = z.object({
  campusId: z.string().uuid("Campus is required"),
  code: z.string().trim().min(2, "Office code is required").max(20, "Office code is too long"),
  name: z.string().trim().min(2, "Office name is required").max(150, "Office name is too long"),
  officeType: z.enum(officeTypeValues).default("other"),
  sortOrder: z.coerce.number().int().min(0).max(99999).default(0),
  isActive: z.boolean().default(true),
});

export type OfficeFormInput = z.infer<typeof officeFormSchema>;
