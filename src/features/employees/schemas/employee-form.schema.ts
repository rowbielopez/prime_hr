import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function preprocessEmptyDate(value: unknown): unknown {
  if (value === "" || value === undefined) return null;
  return value;
}

const nullableIsoDate = z.preprocess(
  preprocessEmptyDate,
  z
    .string()
    .trim()
    .regex(isoDatePattern, "Date must be in YYYY-MM-DD format")
    .nullable()
    .optional()
);

const optionalMultiline = z
  .string()
  .trim()
  .max(2000, "Text is too long")
  .optional()
  .nullable();

export const employeeSexValues = ["male", "female", "other", "unknown"] as const;
export type EmployeeSexValue = (typeof employeeSexValues)[number];

export const employeeFormSchema = z.object({
  employeeNo: z.string().trim().min(2, "Employee number is required").max(50, "Employee number is too long"),
  firstName: z.string().trim().min(2, "First name is required").max(120, "First name is too long"),
  middleName: z.string().trim().max(120, "Middle name is too long").optional().nullable(),
  lastName: z.string().trim().min(2, "Last name is required").max(120, "Last name is too long"),
  suffix: z.string().trim().max(50, "Suffix is too long").optional().nullable(),
  birthDate: nullableIsoDate,
  sex: z.union([z.enum(employeeSexValues), z.null()]).optional(),
  email: z
    .preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.union([z.null(), z.string().email("Please enter a valid email address.")]).optional()
    )
    .optional(),
  mobileNo: z.string().trim().max(30, "Mobile number is too long").optional().nullable(),
  campusId: z.string().uuid("Campus is required"),
  officeId: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.union([z.null(), z.string().uuid("Office must be valid")]).optional()
  ),
  positionTitle: z.string().trim().max(150, "Position title is too long").optional().nullable(),
  plantillaItemNo: z.string().trim().max(100, "Plantilla item no is too long").optional().nullable(),
  employmentStatus: z.enum(["active", "on_leave", "separated", "retired"]),
  dateHired: nullableIsoDate,
  civilStatus: z.string().trim().max(80, "Value is too long").optional().nullable(),
  tin: z.string().trim().max(32, "TIN is too long").optional().nullable(),
  gsisNo: z.string().trim().max(32, "GSIS number is too long").optional().nullable(),
  philhealthNo: z.string().trim().max(32, "PhilHealth number is too long").optional().nullable(),
  pagibigNo: z.string().trim().max(32, "Pag-IBIG number is too long").optional().nullable(),
  employmentType: z.string().trim().max(80, "Employment type is too long").optional().nullable(),
  dateSeparated: nullableIsoDate,
  separationReason: optionalMultiline,
  emergencyContactName: z.string().trim().max(200, "Name is too long").optional().nullable(),
  emergencyContactPhone: z.string().trim().max(40, "Phone is too long").optional().nullable(),
  presentAddress: optionalMultiline,
  permanentAddress: optionalMultiline,
  cabinetNo: z.string().trim().max(50, "Cabinet No. is too long").optional().nullable(),
  externalRef: z.string().trim().max(120, "External reference is too long").optional().nullable(),
});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;

export function getInitialEmployeeFormState(): EmployeeFormInput {
  return {
    employeeNo: "",
    firstName: "",
    middleName: null,
    lastName: "",
    suffix: null,
    birthDate: null,
    sex: null,
    email: null,
    mobileNo: null,
    campusId: "",
    officeId: null,
    positionTitle: null,
    plantillaItemNo: null,
    employmentStatus: "active",
    dateHired: null,
    civilStatus: null,
    tin: null,
    gsisNo: null,
    philhealthNo: null,
    pagibigNo: null,
    employmentType: null,
    dateSeparated: null,
    separationReason: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    presentAddress: null,
    permanentAddress: null,
    cabinetNo: null,
    externalRef: null,
  };
}
