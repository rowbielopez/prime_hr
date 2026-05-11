import { z } from "zod";

export const participantAddSchema = z.object({
  employeeId: z.string().uuid("Employee is required"),
  source: z.enum(["assigned", "nominated", "self_registered"]),
});

export type ParticipantAddInput = z.infer<typeof participantAddSchema>;

export const participantUpdateSchema = z.object({
  attendance: z.enum(["registered", "attended", "absent", "excused"]),
  completion: z.enum(["not_started", "in_progress", "completed", "waived", "not_completed"]),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>;
