import { z } from "zod";

export const userFormSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(150),
  role: z.string().min(1),
  campusId: z.string().uuid().nullable(),
  officeId: z.string().uuid().nullable(),
  isActive: z.boolean(),
});

export type UserFormInput = z.infer<typeof userFormSchema>;

