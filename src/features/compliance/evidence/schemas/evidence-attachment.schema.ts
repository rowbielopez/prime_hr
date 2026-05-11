import { z } from "zod";

export const evidenceAttachmentSchema = z.object({
  evidenceId: z.string().uuid(),
  fileName: z.string().trim().min(1, "Filename is required").max(255, "Filename is too long"),
  fileType: z.string().trim().min(1, "File type is required").max(100, "File type is too long"),
  storageBucket: z.string().trim().min(1).max(100).optional(),
  storagePath: z.string().trim().max(500, "Storage path is too long").nullable().optional(),
  uploadedByUserId: z.string().uuid().nullable().optional(),
});

export type EvidenceAttachmentInput = z.infer<typeof evidenceAttachmentSchema>;

export const evidenceActionPlanSchema = z.object({
  evidenceId: z.string().uuid(),
  gapSummary: z.string().trim().min(3, "Gap summary is required").max(1000, "Gap summary is too long"),
  correctiveAction: z.string().trim().min(3, "Corrective action is required").max(1500, "Corrective action is too long"),
  ownerName: z.string().trim().min(2, "Owner is required").max(160, "Owner name is too long"),
  ownerUserId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  ownerOfficeId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  gapSeverity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  gapCategory: z.enum(["policy", "process", "documentation", "systems", "people", "other"]).default("other"),
  rootCause: z.string().trim().max(1000, "Root cause is too long").nullable().optional(),
  referenceClause: z.string().trim().max(200, "Reference clause is too long").nullable().optional(),
  progressPercent: z.coerce
    .number()
    .int("Progress must be a whole number")
    .min(0, "Progress must be at least 0%")
    .max(100, "Progress must be at most 100%")
    .default(0),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD"),
  status: z.enum(["open", "in_progress", "closed"]),
  progressNotes: z.string().trim().max(1000, "Progress notes are too long").nullable().optional(),
});

export type EvidenceActionPlanInput = z.infer<typeof evidenceActionPlanSchema>;
