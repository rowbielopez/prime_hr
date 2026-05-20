import { z } from "zod";

const emptyToNull = (value: unknown) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

const nullableText = (max: number) =>
    z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const nullableDate = z.preprocess(
    emptyToNull,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.").nullable().optional(),
);

const nullableMoney = z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "string") return Number(value);
    return value;
}, z.number().min(0, "Salary cannot be negative.").nullable().optional());

export const serviceRecordEntrySchema = z
    .object({
        id: z.string().uuid().nullable().optional(),
        employeeId: z.string().uuid("Please select an employee."),
        campusId: z.string().uuid("Please select a campus."),
        officeId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date From is required."),
        dateTo: nullableDate,
        isCurrent: z.boolean().default(false),
        positionTitle: z.string().trim().min(1, "Position title is required.").max(150),
        appointmentStatus: nullableText(80),
        employmentType: nullableText(80),
        stationPlace: nullableText(160),
        branch: nullableText(80),
        monthlySalary: nullableMoney,
        salaryGradeStep: nullableText(40),
        movementType: nullableText(80),
        separationDate: nullableDate,
        separationCause: nullableText(240),
        leaveWithoutPay: nullableText(160),
        remarks: nullableText(1000),
        allowOverlap: z.boolean().optional().default(false),
    })
    .superRefine((value, ctx) => {
        if (value.dateTo && value.dateTo < value.dateFrom) {
            ctx.addIssue({ code: "custom", path: ["dateTo"], message: "Date To cannot be earlier than Date From." });
        }
        if (value.separationDate && value.separationDate < value.dateFrom) {
            ctx.addIssue({ code: "custom", path: ["separationDate"], message: "Separation date cannot be earlier than Date From." });
        }
        if (value.isCurrent && value.dateTo) {
            ctx.addIssue({ code: "custom", path: ["dateTo"], message: "Leave Date To blank for the current assignment." });
        }
    });

export type ServiceRecordEntryInput = z.infer<typeof serviceRecordEntrySchema>;