import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const convertApplicantToEmployeeSchema = z.object({
    applicantId: z.string().uuid("Invalid applicant."),
    employeeNo: z
        .string()
        .trim()
        .min(2, "Employee number is required")
        .max(50, "Employee number is too long"),
    dateHired: z
        .string()
        .trim()
        .regex(isoDatePattern, "Date Hired must be in YYYY-MM-DD format"),
    employmentStatus: z.enum(["active", "on_leave", "separated", "retired"]).default("active"),
    positionTitle: z
        .string()
        .trim()
        .max(150, "Position title is too long")
        .optional()
        .nullable(),
    employmentType: z
        .string()
        .trim()
        .max(80, "Employment type is too long")
        .optional()
        .nullable(),
    campusId: z.string().uuid("Campus is required"),
    officeId: z
        .preprocess(
            (v) => (v === "" || v === undefined ? null : v),
            z.union([z.null(), z.string().uuid("Office must be valid")]).optional()
        ),
});

export type ConvertApplicantToEmployeeInput = z.infer<typeof convertApplicantToEmployeeSchema>;

export const stageChangeSchema = z.object({
    applicantId: z.string().uuid("Invalid applicant."),
    status: z.enum(["new", "screening", "shortlisted", "hired", "rejected", "withdrawn"]),
    remarks: z
        .string()
        .trim()
        .max(2000, "Remarks are too long")
        .optional()
        .nullable(),
});

export type StageChangeInput = z.infer<typeof stageChangeSchema>;
