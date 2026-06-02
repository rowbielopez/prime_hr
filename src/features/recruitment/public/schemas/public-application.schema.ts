import { z } from "zod";

const trimmed = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Required").max(max));

const optionalTrimmed = (max: number) =>
  z
    .string()
    .optional()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(z.string().max(max));

export const publicApplicationSchema = z.object({
  vacancySlug: z
    .string()
    .trim()
    .min(1, "Vacancy is required")
    .max(160, "Invalid vacancy reference"),
  firstName: trimmed(80),
  middleName: optionalTrimmed(80),
  lastName: trimmed(80),
  suffix: optionalTrimmed(20),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(160, "Email is too long")
    .email("Enter a valid email address"),
  mobileNo: z
    .string()
    .trim()
    .min(7, "Enter a valid mobile number")
    .max(32, "Mobile number is too long")
    .regex(
      /^[0-9+\-()\s]+$/,
      "Mobile number may only contain digits, spaces, +, -, (, )",
    ),
  coverNote: optionalTrimmed(2000),
  consent: z.literal(true, {
    message: "You must agree to the Data Privacy Notice",
  }),
  // Honeypot: must be absent or empty. Bots that auto-fill all fields will
  // set this; the server action silently rejects such submissions.
  _hp: z.string().optional(),
});

export type PublicApplicationInput = z.infer<typeof publicApplicationSchema>;
