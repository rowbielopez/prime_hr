import ExcelJS from "exceljs";

import type { ReportDocument } from "@/features/reports/types";

function formatFilterValue(value: string | null): string {
  return value ?? "All authorized";
}

export async function generateReportXlsx(
  report: ReportDocument,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CSU PRIME-HR";
  workbook.created = new Date(report.generatedAt);
  workbook.modified = new Date(report.generatedAt);

  for (const dataset of report.datasets) {
    const worksheet = workbook.addWorksheet(dataset.title.slice(0, 31));
    const totalColumns = Math.max(dataset.columns.length, 1);

    worksheet.mergeCells(1, 1, 1, totalColumns);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = report.definition.title;
    titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
    titleCell.alignment = { vertical: "middle" };

    worksheet.mergeCells(2, 1, 2, totalColumns);
    worksheet.getCell(2, 1).value = dataset.title;
    worksheet.getCell(2, 1).font = { bold: true, size: 12 };

    worksheet.mergeCells(3, 1, 3, totalColumns);
    worksheet.getCell(3, 1).value =
      `Generated: ${new Date(report.generatedAt).toLocaleString()} | Scope: ${report.scopeLabel}`;

    worksheet.mergeCells(4, 1, 4, totalColumns);
    worksheet.getCell(4, 1).value =
      `Filters: campus=${formatFilterValue(report.filters.campusId)}, office=${formatFilterValue(report.filters.officeId)}, from=${formatFilterValue(report.filters.from)}, to=${formatFilterValue(report.filters.to)}`;

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(
      dataset.columns.map((column) => column.header),
    );
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF374151" },
    };
    headerRow.alignment = { vertical: "middle", wrapText: true };

    for (const row of dataset.rows) {
      worksheet.addRow(dataset.columns.map((column) => row[column.key] ?? ""));
    }

    dataset.columns.forEach((column, index) => {
      worksheet.getColumn(index + 1).width = column.width ?? 18;
    });

    worksheet.views = [{ state: "frozen", ySplit: 6 }];
    worksheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6, column: totalColumns },
    };
  }

  const summarySheet = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  summarySheet.columns = [
    { header: "Metric", key: "label", width: 34 },
    { header: "Value", key: "value", width: 18 },
  ];
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF374151" },
  };
  for (const item of report.summary) {
    summarySheet.addRow({ label: item.label, value: item.value });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
