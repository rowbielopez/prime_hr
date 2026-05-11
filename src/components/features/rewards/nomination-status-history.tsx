import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RewardNominationStatusHistoryItem } from "@/features/rewards/types";

export function RewardNominationStatusHistory({ rows }: { rows: RewardNominationStatusHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No status changes logged yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">{new Date(row.changedAt).toLocaleString()}</div>
              <div>
                {row.fromStatus ?? "—"} {"->"} {row.toStatus}
              </div>
              <div className="text-xs text-muted-foreground">
                By: {row.changedByName ?? row.changedByUserId ?? "System"}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

