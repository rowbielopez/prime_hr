"use client";

import type { CompletionKpiDailyRow } from "@/features/learning/reports/types";

export function CompletionTrendChart({ rows }: { rows: CompletionKpiDailyRow[] }) {
  const byDate = rows.reduce<Record<string, { participants: number; completed: number }>>((acc, row) => {
    const key = row.metricDate;
    const prev = acc[key] ?? { participants: 0, completed: 0 };
    acc[key] = {
      participants: prev.participants + row.participantCount,
      completed: prev.completed + row.completedCount,
    };
    return acc;
  }, {});
  const points = Object.entries(byDate)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-30)
    .map(([date, totals]) => ({
      date,
      rate: totals.participants > 0 ? Math.round((totals.completed / totals.participants) * 100) : 0,
    }));
  const max = Math.max(1, ...points.map((p) => p.rate));

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium">Completion rate trend (last 30 days)</h3>
      <div className="mt-3 flex h-36 items-end gap-1">
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completion trend data yet.</p>
        ) : (
          points.map((p) => (
            <div key={p.date} className="group flex-1">
              <div
                className="w-full rounded-t bg-primary/80"
                style={{ height: `${Math.max(6, (p.rate / max) * 100)}%` }}
                title={`${new Date(p.date).toLocaleDateString()}: ${p.rate}%`}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
