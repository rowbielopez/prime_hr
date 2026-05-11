import { z } from "zod";

export const screeningResultSchema = z.object({
  applicantId: z.string().uuid(),
  result: z.enum(["pass", "fail", "hold"]),
  remarks: z.string().trim().max(1000, "Remarks are too long").nullable().optional(),
  screenedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Screened date must be YYYY-MM-DD"),
});

export type ScreeningResultInput = z.infer<typeof screeningResultSchema>;

export const interviewRecordSchema = z.object({
  applicantId: z.string().uuid(),
  applicationId: z.string().uuid().nullable().optional(),
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Schedule must be YYYY-MM-DDTHH:MM"),
  interviewMode: z.enum(["in_person", "online", "phone"]),
  panelRemarks: z.string().trim().max(1000, "Panel remarks are too long").nullable().optional(),
  outcome: z.enum(["pending", "pass", "fail", "no_show"]),
  decidedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Decision date must be YYYY-MM-DD").nullable().optional(),
});

export type InterviewRecordInput = z.infer<typeof interviewRecordSchema>;
