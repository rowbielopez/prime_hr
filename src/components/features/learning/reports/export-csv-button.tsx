"use client";

import { Button } from "@/components/ui/button";

function escapeCell(input: unknown): string {
  const raw = input == null ? "" : String(input);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerRow = headers.map(escapeCell).join(",");
  const dataRows = rows.map((row) => headers.map((h) => escapeCell(row[h])).join(","));
  return [headerRow, ...dataRows].join("\n");
}

export function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
}) {
  function onExport() {
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onExport}>
      Export CSV
    </Button>
  );
}
