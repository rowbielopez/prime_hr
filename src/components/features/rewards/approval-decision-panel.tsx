"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RewardsApprovalDecisionInput } from "@/features/rewards/schemas/approval-decision.schema";

export function RewardApprovalDecisionPanel({
  onSubmitDecision,
}: {
  onSubmitDecision: (input: RewardsApprovalDecisionInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<RewardsApprovalDecisionInput>({
    decision: "approve",
    remarks: null,
  });

  function submit() {
    startTransition(async () => {
      const result = await onSubmitDecision(form);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to submit approval decision.");
        return;
      }
      toast.success(form.decision === "approve" ? "Nomination approved." : "Nomination rejected.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Approval decision</h3>
      <label className="space-y-1 text-sm">
        <span>Decision</span>
        <select
          className="h-9 w-full rounded-md border px-3"
          value={form.decision}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              decision: e.target.value as RewardsApprovalDecisionInput["decision"],
            }))
          }
          disabled={isPending}
        >
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>Approver remarks</span>
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
          Submit decision
        </Button>
      </div>
    </div>
  );
}

