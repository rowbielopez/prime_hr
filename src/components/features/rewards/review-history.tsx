import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RewardNominationReviewItem } from "@/features/rewards/types";

export function RewardReviewHistory({ rows }: { rows: RewardNominationReviewItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No review entries yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="space-y-1 rounded-md border p-2">
              <div className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</div>
              <div>
                Decision: <span className="font-medium">{row.decision}</span>
              </div>
              <div>Score: {row.score ?? "-"}</div>
              {row.remarks ? <div>Remarks: {row.remarks}</div> : null}
              <div className="text-xs text-muted-foreground">By: {row.reviewerName}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

