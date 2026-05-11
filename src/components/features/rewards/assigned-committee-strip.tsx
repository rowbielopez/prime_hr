import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RewardCommitteeAssignmentItem } from "@/features/rewards/types";

export function RewardsAssignedCommitteeStrip({ rows }: { rows: RewardCommitteeAssignmentItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assigned committee</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No committee assignment set yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {rows.map((row) => (
              <span key={row.id} className="rounded-md border px-2 py-1">
                {row.reviewerName}
                {row.assignmentRole === "chair" ? " (Chair)" : ""}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

