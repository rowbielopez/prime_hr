export type ReportKey =
  | "employee-roster"
  | "pds-status"
  | "service-record-completeness"
  | "employee-requests-aging"
  | "recruitment-pipeline"
  | "compliance-status-gaps";

export type ReportFormat = "pdf" | "xlsx";

export type ReportFilters = {
  campusId: string | null;
  officeId: string | null;
  from: string | null;
  to: string | null;
};

export type ReportCellValue = string | number | boolean | null;

export type ReportColumn = {
  key: string;
  header: string;
  width?: number;
};

export type ReportDataset = {
  title: string;
  description?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCellValue>>;
};

export type ReportSummaryItem = {
  label: string;
  value: string | number;
};

export type ReportDefinition = {
  key: ReportKey;
  title: string;
  description: string;
  category: "Campus HR Operations";
};

export type ReportDocument = {
  definition: ReportDefinition;
  filters: ReportFilters;
  generatedAt: string;
  scopeLabel: string;
  summary: ReportSummaryItem[];
  datasets: ReportDataset[];
};
