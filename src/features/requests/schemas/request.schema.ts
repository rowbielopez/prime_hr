import { z } from "zod";
import { CORRECTION_REQUEST_TYPES } from "@/features/requests/types";

const requestTypeSchema = z.enum([
    "profile_correction",
    "employment_detail_correction",
    "pds_update",
    "service_record_correction",
    "document_request",
    "certificate_request",
    "leave_related_request",
    "account_login_concern",
    "other_hr_request",
]);

const trimOptional = z
    .string()
    .trim()
    .max(1000, "Keep this field under 1,000 characters.")
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));

const employeeRequestBaseSchema = z.object({
    requestType: requestTypeSchema,
    subject: z.string().trim().min(1, "Subject is required.").max(160, "Keep the subject under 160 characters."),
    description: z.string().trim().min(1, "Description is required.").max(3000, "Keep the description under 3,000 characters."),
    fieldToCorrect: trimOptional,
    currentValue: trimOptional,
    requestedValue: trimOptional,
    relatedModule: z
        .string()
        .trim()
        .max(80, "Keep the related area under 80 characters.")
        .optional()
        .nullable()
        .transform((value) => (value && value.length > 0 ? value : null)),
});

/** Full schema — requires requestedValue for correction types. Used for submit mode. */
export const employeeRequestFormSchema = employeeRequestBaseSchema.superRefine((data, ctx) => {
    if (CORRECTION_REQUEST_TYPES.includes(data.requestType) && !data.requestedValue) {
        ctx.addIssue({
            code: "custom",
            path: ["requestedValue"],
            message: "Requested value is required for correction requests.",
        });
    }
});

/** Relaxed schema for draft saves — correction fields are optional. */
export const employeeRequestDraftFormSchema = employeeRequestBaseSchema;

export type EmployeeRequestFormInput = z.infer<typeof employeeRequestBaseSchema>;

export const employeeRequestModeSchema = z.enum(["draft", "submit"]);
export type EmployeeRequestMode = z.infer<typeof employeeRequestModeSchema>;
