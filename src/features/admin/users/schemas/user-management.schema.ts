import { z } from "zod";

export const userManagementSchema = z
  .object({
    userId: z.string().uuid(),
    roleId: z.string().uuid(),
    campusId: z.string().uuid().nullable(),
    officeId: z.string().uuid().nullable(),
    isActive: z.boolean(),
  })
  .refine((data) => !(data.officeId && !data.campusId), {
    message: "Office assignment requires campus scope.",
    path: ["officeId"],
  });

export type UserManagementInput = z.infer<typeof userManagementSchema>;

