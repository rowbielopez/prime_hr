"use client";

import type { SessionUtilizationRow } from "@/features/learning/reports/types";

export function UtilizationChart({ rows }: { rows: SessionUtilizationRow[] }) {
  const top = rows.slice(0, 12).map((row) => {
    const denom = row.capacity && row.capacity > 0 ? row.capacity : row.participantCount || 1;
    const pct = Math.min(100, Math.round((row.participantCount / denom) * 100));
    return { name: row.sessionTitle, pct, participants: row.participantCount };
  });

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium">Session utilization (latest 12)</h3>
      <div className="mt-3 space-y-2">
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No utilization data yet.</p>
        ) : (
          top.map((row, idx) => (
            <div key={`${row.name}-${idx}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate pr-2">{row.name}</span>
                <span>{row.pct}%</span>
              </div>
              <div className="h-2 rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(4, row.pct)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
