"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RewardsReviewDecisionInput } from "@/features/rewards/schemas/review-decision.schema";

export function RewardReviewDecisionPanel({
  onSubmitDecision,
}: {
  onSubmitDecision: (input: RewardsReviewDecisionInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<RewardsReviewDecisionInput>({
    decision: "recommend",
    score: null,
    remarks: null,
  });

  function submit() {
    startTransition(async () => {
      const result = await onSubmitDecision(form);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to submit review.");
        return;
      }
      toast.success("Review decision submitted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Review decision</h3>
      <label className="space-y-1 text-sm">
        <span>Decision</span>
        <select
          className="h-9 w-full rounded-md border px-3"
          value={form.decision}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              decision: e.target.value as RewardsReviewDecisionInput["decision"],
            }))
          }
          disabled={isPending}
        >
          <option value="recommend">Recommend</option>
          <option value="request_revision">Needs revision</option>
          <option value="reject">Reject</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>Score (optional, 0-100)</span>
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          value={form.score ?? ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              score: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
          disabled={isPending}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span>Remarks</span>
        <Textarea
          className="min-h-[100px]"
          value={form.remarks ?? ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              remarks: e.target.value || null,
            }))
          }
          disabled={isPending}
        />
      </label>
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={isPending}>
          Submit review
        </Button>
      </div>
    </div>
  );
}

