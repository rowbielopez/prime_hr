import { z } from "zod";

import type { ReportFilters, ReportFormat } from "@/features/reports/types";

const optionalUuidSchema = z
  .string()
  .uuid()
  .optional()
  .nullable()
  .transform((value) => value ?? null);

const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .nullable()
  .transform((value) => value ?? null);

export const reportFiltersSchema = z
  .object({
    campusId: optionalUuidSchema,
    officeId: optionalUuidSchema,
    from: optionalDateSchema,
    to: optionalDateSchema,
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ["to"],
    message: "The end date must be on or after the start date.",
  });

export const reportFormatSchema = z.enum(["pdf", "xlsx"]);

export function parseReportFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ReportFilters {
  return reportFiltersSchema.parse({
    campusId: searchParams.get("campusId"),
    officeId: searchParams.get("officeId"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });
}

export function parseReportFormatFromSearchParams(
  searchParams: URLSearchParams,
): ReportFormat {
  return reportFormatSchema.parse(searchParams.get("format") ?? "xlsx");
}
