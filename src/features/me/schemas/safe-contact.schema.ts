import { z } from "zod";

/**
 * Whitelisted self-edit fields an employee can update on their own master
 * record without HR review. Any other change must go through a correction
 * request workflow.
 */
export const safeContactInfoSchema = z.object({
    mobileNo: z
        .string()
        .trim()
        .max(40, "Mobile number is too long.")
        .nullable()
        .transform((value) => (value && value.length > 0 ? value : null)),
    presentAddress: z
        .string()
        .trim()
        .max(500, "Present address is too long.")
        .nullable()
        .transform((value) => (value && value.length > 0 ? value : null)),
    permanentAddress: z
        .string()
        .trim()
        .max(500, "Permanent address is too long.")
        .nullable()
        .transform((value) => (value && value.length > 0 ? value : null)),
    emergencyContactName: z
        .string()
        .trim()
        .max(200, "Emergency contact name is too long.")
        .nullable()
        .transform((value) => (value && value.length > 0 ? value : null)),
    emergencyContactPhone: z
        .string()
        .trim()
        .max(40, "Emergency contact phone is too long.")
        .nullable()
        .transform((value) => (value && value.length > 0 ? value : null)),
});

export type SafeContactInfoInput = z.input<typeof safeContactInfoSchema>;
export type SafeContactInfo = z.output<typeof safeContactInfoSchema>;
