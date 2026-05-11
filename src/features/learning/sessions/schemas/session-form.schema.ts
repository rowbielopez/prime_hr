import { z } from "zod";

export const sessionFormSchema = z
  .object({
    programId: z.string().uuid("Program is required"),
    title: z.string().trim().min(3, "Title is required").max(200, "Title is too long"),
    campusId: z.string().uuid("Campus is required"),
    venue: z.string().trim().max(200).nullable().optional(),
    capacity: z.coerce.number().int().positive().max(99999).nullable().optional(),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
    startsAt: z.string().min(1, "Start is required"),
    endsAt: z.string().min(1, "End is required"),
  })
  .superRefine((data, ctx) => {
    const start = Date.parse(data.startsAt);
    const end = Date.parse(data.endsAt);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      ctx.addIssue({ code: "custom", message: "Invalid session dates.", path: ["startsAt"] });
      return;
    }
    if (end <= start) {
      ctx.addIssue({ code: "custom", message: "End must be after start.", path: ["endsAt"] });
    }
  });

export type SessionFormInput = z.infer<typeof sessionFormSchema>;
