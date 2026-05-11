"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createMyPerformanceRecordAction } from "@/features/performance/actions-stage2";

export function CreateMyRecordList({ cycles }: { cycles: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (cycles.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Create my record</h3>
      <p className="text-xs text-muted-foreground">Start a draft performance record for an active cycle.</p>
      <div className="flex flex-wrap gap-2">
        {cycles.map((cycle) => (
          <Button
            key={cycle.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await createMyPerformanceRecordAction(cycle.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Performance record created.");
                router.push(`/performance/my/${result.recordId}`);
              })
            }
          >
            {cycle.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
