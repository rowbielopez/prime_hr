import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceFinalizationHistoryItem } from "@/features/performance/repository/records.repository";

export function FinalizationHistoryTimeline({ rows }: { rows: PerformanceFinalizationHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Finalization timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No finalization snapshots yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-md border p-3">
              <div className="font-medium">
                {row.finalRating} ({row.finalScore.toFixed(2)})
              </div>
              <div className="text-xs text-muted-foreground">
                Finalized at {new Date(row.finalizedAt).toLocaleString()} | Snapshot {new Date(row.snapshotAt).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                By: {row.finalizedByName ?? row.finalizedByUserId ?? "System"}
              </div>
              {row.finalizerComments ? <p className="mt-1">{row.finalizerComments}</p> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
