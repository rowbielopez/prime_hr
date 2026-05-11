import { z } from "zod";

export const campusFormSchema = z.object({
  code: z.string().trim().min(2, "Campus code is required").max(20, "Campus code is too long"),
  name: z.string().trim().min(2, "Campus name is required").max(150, "Campus name is too long"),
  shortName: z
    .string()
    .trim()
    .max(80, "Short name is too long")
    .transform((v) => (v.length > 0 ? v : null)),
  sortOrder: z.coerce.number().int().min(0).max(99999).default(0),
  isActive: z.boolean().default(true),
});

export type CampusFormInput = z.infer<typeof campusFormSchema>;
