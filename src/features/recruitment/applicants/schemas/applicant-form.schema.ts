import { z } from "zod";

export const applicantFormSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(120, "First name is too long"),
  middleName: z.string().trim().max(120, "Middle name is too long").nullable().optional(),
  lastName: z.string().trim().min(2, "Last name is required").max(120, "Last name is too long"),
  suffix: z.string().trim().max(50, "Suffix is too long").nullable().optional(),
  email: z.string().email("Invalid email address").nullable().optional(),
  mobileNo: z.string().trim().max(30, "Mobile number is too long").nullable().optional(),
  campusId: z.string().uuid("Campus is required"),
  officeId: z.string().uuid("Office must be valid").nullable().optional(),
  status: z.enum(["new", "screening", "shortlisted", "hired", "rejected", "withdrawn"]),
  notes: z.string().trim().max(2000, "Notes are too long").nullable().optional(),
});

export type ApplicantFormInput = z.infer<typeof applicantFormSchema>;
