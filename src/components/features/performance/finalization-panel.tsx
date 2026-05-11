"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { finalizePerformanceRecordAction } from "@/features/performance/actions-stage3";

type Objective = { id: string; title: string; weight: number; reviewerScore: number | null };

export function FinalizationPanel({
  recordId,
  objectives,
  disabled,
}: {
  recordId: string;
  objectives: Objective[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(objectives.map((o) => [o.id, o.reviewerScore ?? 3]))
  );

  const preview = useMemo(() => {
    const totalWeight = objectives.reduce((acc, o) => acc + o.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.001) return null;
    const score = objectives.reduce((acc, o) => acc + (o.weight * (scores[o.id] ?? 0)) / 100, 0);
    return Number(score.toFixed(2));
  }, [objectives, scores]);

  function finalize() {
    startTransition(async () => {
      const objectiveScores = objectives.map((o) => ({
        objectiveId: o.id,
        reviewerScore: Number(scores[o.id] ?? 0),
      }));
      const result = await finalizePerformanceRecordAction(recordId, {
        finalizerComments: comments,
        objectiveScores,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Finalization failed.");
        return;
      }
      toast.success("Record finalized.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Finalization panel</h3>
      <div className="space-y-2">
        {objectives.map((obj) => (
          <div key={obj.id} className="grid grid-cols-[1fr_120px_100px] items-center gap-2">
            <div className="text-sm">
              {obj.title}
              <span className="ml-2 text-xs text-muted-foreground">({obj.weight}%)</span>
            </div>
            <input
              type="number"
              min={1}
              max={5}
              step={0.01}
              className="h-9 rounded-md border px-3"
              value={scores[obj.id] ?? 0}
              disabled={disabled || isPending}
              onChange={(e) => setScores((s) => ({ ...s, [obj.id]: Number(e.target.value) }))}
            />
            <span className="text-xs text-muted-foreground">1 to 5</span>
          </div>
        ))}
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Computed final score: </span>
        {preview ?? "Invalid weights"}
      </div>
      <textarea
        className="min-h-[90px] w-full rounded-md border px-3 py-2"
        placeholder="Finalizer comments"
        value={comments}
        disabled={disabled || isPending}
        onChange={(e) => setComments(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="button" onClick={finalize} disabled={disabled || isPending || preview == null}>
          Finalize rating
        </Button>
      </div>
    </div>
  );
}
