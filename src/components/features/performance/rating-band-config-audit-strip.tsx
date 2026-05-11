import type { RatingBandConfigAudit } from "@/features/performance/rating-band.repository";

export function RatingBandConfigAuditStrip({ audit }: { audit: RatingBandConfigAudit }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
      {audit.updatedAt ? (
        <span>
          Last updated by <span className="font-medium text-foreground">{audit.updatedByName ?? "Unknown"}</span> on{" "}
          <span className="font-medium text-foreground">{new Date(audit.updatedAt).toLocaleString()}</span>
        </span>
      ) : (
        <span>No update audit available yet.</span>
      )}
    </div>
  );
}

