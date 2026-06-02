import Link from "next/link";
import { FileDown, Sheet } from "lucide-react";

import type { ReportFilters, ReportKey } from "@/features/reports/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportDownloadButtonsProps = {
  reportKey: ReportKey;
  filters: ReportFilters;
};

function downloadHref(
  reportKey: ReportKey,
  format: "pdf" | "xlsx",
  filters: ReportFilters,
): string {
  const params = new URLSearchParams({ format });
  if (filters.campusId) params.set("campusId", filters.campusId);
  if (filters.officeId) params.set("officeId", filters.officeId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return `/reports/${reportKey}/download?${params.toString()}`;
}

export function ReportDownloadButtons({
  reportKey,
  filters,
}: ReportDownloadButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        href={downloadHref(reportKey, "pdf", filters)}
        prefetch={false}
      >
        <FileDown data-icon="inline-start" />
        PDF
      </Link>
      <Link
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        href={downloadHref(reportKey, "xlsx", filters)}
        prefetch={false}
      >
        <Sheet data-icon="inline-start" />
        XLSX
      </Link>
    </div>
  );
}
