import { z } from "zod";

export const statusUpdateSchema = z.object({
  status: z.enum(["draft", "submitted", "approved", "rejected"]),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
});

export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
