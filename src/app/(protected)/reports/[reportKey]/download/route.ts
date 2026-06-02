import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requirePermission } from "@/features/auth/server/require-permission";
import { generateReportPdf } from "@/features/reports/export/pdf";
import { generateReportXlsx } from "@/features/reports/export/xlsx";
import { getReportDefinition } from "@/features/reports/report-catalog";
import { buildCampusOperationsReport } from "@/features/reports/repository/campus-operations.repository";
import {
  parseReportFiltersFromSearchParams,
  parseReportFormatFromSearchParams,
} from "@/features/reports/schemas/report-filters.schema";
import { writeReportExportAudit } from "@/features/reports/server/report-export-audit";

type RouteContext = { params: Promise<{ reportKey: string }> };

const CONTENT_TYPES = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-_.]/g, "_");
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { reportKey } = await params;
  const definition = getReportDefinition(reportKey);
  if (!definition) {
    return new NextResponse("Report not found", { status: 404 });
  }

  let format;
  let filters;
  try {
    format = parseReportFormatFromSearchParams(req.nextUrl.searchParams);
    filters = parseReportFiltersFromSearchParams(req.nextUrl.searchParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid report export filters." },
        { status: 400 },
      );
    }
    throw error;
  }

  const context = await requirePermission({
    permission: "reports.export",
    campusId: filters.campusId,
    officeId: filters.officeId,
  });

  const report = await buildCampusOperationsReport(
    definition.key,
    context,
    filters,
  );
  const buffer =
    format === "pdf"
      ? await generateReportPdf(report)
      : await generateReportXlsx(report);
  await writeReportExportAudit({ report, format });

  const bytes = new Uint8Array(buffer);
  const generatedDate = new Date(report.generatedAt).toISOString().slice(0, 10);
  const filename = `${safeFilename(report.definition.key)}_${generatedDate}.${format}`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
