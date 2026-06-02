import { z } from "zod";

const CSU_EMAIL_DOMAIN = "@csu.edu.ph";

export const employeeLoginEmailAssignmentSchema = z.object({
  employeeId: z.string().uuid("Employee is required."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid CSU email address.")
    .refine((value) => value.endsWith(CSU_EMAIL_DOMAIN), {
      message: "Email must use the @csu.edu.ph domain.",
    }),
});

export type EmployeeLoginEmailAssignmentInput = z.infer<
  typeof employeeLoginEmailAssignmentSchema
>;
