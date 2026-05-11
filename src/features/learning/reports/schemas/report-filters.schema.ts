import { z } from "zod";

export const reportFiltersSchema = z.object({
  campusId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;
