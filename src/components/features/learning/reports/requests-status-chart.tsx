"use client";

import type { RequestPipelineRow } from "@/features/learning/reports/types";

export function RequestsStatusChart({ rows }: { rows: RequestPipelineRow[] }) {
  const statusTotals = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + row.requestCount;
    return acc;
  }, {});
  const entries = Object.entries(statusTotals).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium">Requests by status</h3>
      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No request distribution yet.</p>
        ) : (
          entries.map(([status, count]) => (
            <div key={status} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{status}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 w-full rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(4, (count / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
