"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { RewardCommitteeAssignmentItem, RewardCommitteeReviewerOption } from "@/features/rewards/types";
import type { RewardsCommitteeAssignmentInput } from "@/features/rewards/schemas/committee-assignment.schema";

export function RewardsCommitteeAssignmentPanel({
  options,
  assignments,
  onSave,
}: {
  options: RewardCommitteeReviewerOption[];
  assignments: RewardCommitteeAssignmentItem[];
  onSave: (input: RewardsCommitteeAssignmentInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initiallySelected = useMemo(() => assignments.map((row) => row.reviewerUserId), [assignments]);
  const initialChair = useMemo(() => assignments.find((row) => row.assignmentRole === "chair")?.reviewerUserId ?? null, [assignments]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initiallySelected);
  const [chairUserId, setChairUserId] = useState<string | null>(initialChair);

  function toggleUser(userId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = checked ? [...new Set([...prev, userId])] : prev.filter((id) => id !== userId);
      if (!checked && chairUserId === userId) setChairUserId(null);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await onSave({ reviewerUserIds: selectedIds, chairUserId });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save committee assignments.");
        return;
      }
      toast.success("Committee assignments saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Committee assignments</h3>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No eligible committee members found in this nomination scope.</p>
      ) : (
        <>
          <div className="space-y-2">
            {options.map((row) => (
              <label key={row.userId} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>
                  {row.name}
                  {row.email ? <span className="ml-2 text-muted-foreground">({row.email})</span> : null}
                </span>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(row.userId)}
                  onChange={(e) => toggleUser(row.userId, e.target.checked)}
                  disabled={isPending}
                />
              </label>
            ))}
          </div>
          <label className="space-y-1 text-sm">
            <span>Chair reviewer</span>
            <select
              className="h-9 w-full rounded-md border px-3"
              value={chairUserId ?? ""}
              onChange={(e) => setChairUserId(e.target.value || null)}
              disabled={isPending || selectedIds.length === 0}
            >
              <option value="">No chair selected</option>
              {options
                .filter((row) => selectedIds.includes(row.userId))
                .map((row) => (
                  <option key={row.userId} value={row.userId}>
                    {row.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={isPending}>
              Save assignments
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

