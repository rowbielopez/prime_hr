import type { ReactNode } from "react";

export type AdminTableColumn<RowT> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: RowT) => ReactNode;
  sortAccessor?: (row: RowT) => string | number | Date | null | undefined;
  enableHiding?: boolean;
};

export type AdminRowAction = {
  key: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
};

export function createAdminColumns<RowT>(columns: AdminTableColumn<RowT>[]) {
  return columns;
}

export function createRowActions<RowT>(
  rows: RowT[],
  getRowKey: (row: RowT) => string,
  builder: (row: RowT) => AdminRowAction[]
): Record<string, AdminRowAction[]> {
  return rows.reduce<Record<string, AdminRowAction[]>>((acc, row) => {
    acc[getRowKey(row)] = builder(row);
    return acc;
  }, {});
}

