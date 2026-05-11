import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceRatingBand } from "@/features/performance/types";

export function FinalRatingSummaryCard({
  finalScore,
  finalRating,
  finalizedAt,
  comments,
}: {
  finalScore: number;
  finalRating: PerformanceRatingBand;
  finalizedAt: string;
  comments?: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Final rating summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Final score: </span>
          {finalScore.toFixed(2)}
        </div>
        <div>
          <span className="text-muted-foreground">Rating band: </span>
          {finalRating}
        </div>
        <div>
          <span className="text-muted-foreground">Finalized at: </span>
          {new Date(finalizedAt).toLocaleString()}
        </div>
        {comments ? (
          <div>
            <span className="text-muted-foreground">Finalizer comments: </span>
            {comments}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
