"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveRatingBandConfigAction } from "@/features/performance/rating-band-actions";
import type { RatingBandConfigRow } from "@/features/performance/rating-band.repository";

export function RatingBandConfigForm({ initialRows }: { initialRows: RatingBandConfigRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<RatingBandConfigRow[]>([...initialRows].sort((a, b) => a.sortOrder - b.sortOrder));

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.sortOrder - b.sortOrder), [rows]);

  function updateMinScore(band: string, minScore: number) {
    setRows((current) => current.map((row) => (row.band === band ? { ...row, minScore } : row)));
  }

  function save() {
    startTransition(async () => {
      const result = await saveRatingBandConfigAction(sortedRows);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save rating bands.");
        return;
      }
      toast.success("Rating band configuration saved.");
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Rating thresholds</h3>
      <p className="text-xs text-muted-foreground">
        Higher bands should have higher minimum score. The last row must stay at 0.
      </p>
      <div className="space-y-2">
        {sortedRows.map((row) => (
          <div key={row.band} className="grid grid-cols-[1fr_160px] gap-3">
            <div className="text-sm">{row.band}</div>
            <input
              type="number"
              min={0}
              max={5}
              step={0.01}
              className="h-9 rounded-md border px-3"
              value={row.minScore}
              disabled={isPending || row.sortOrder === sortedRows.length}
              onChange={(e) => updateMinScore(row.band, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={isPending}>
          Save thresholds
        </Button>
      </div>
    </div>
  );
}

