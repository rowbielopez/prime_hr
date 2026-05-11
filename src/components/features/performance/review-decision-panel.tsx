"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decidePerformanceReviewAction, startPerformanceReviewAction } from "@/features/performance/actions-stage2";
import type { PerformanceRecordStatus } from "@/features/performance/types";

export function ReviewDecisionPanel({ recordId, status }: { recordId: string; status: PerformanceRecordStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState("");

  function startReview() {
    startTransition(async () => {
      const result = await startPerformanceReviewAction(recordId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to start review.");
        return;
      }
      toast.success("Record moved to under review.");
      router.refresh();
    });
  }

  function decide(decision: "approve" | "request_revision" | "reject") {
    startTransition(async () => {
      const result = await decidePerformanceReviewAction(recordId, { decision, comments });
      if (!result.ok) {
        toast.error(result.error ?? "Decision failed.");
        return;
      }
      if (decision === "approve") {
        toast.success("Record approved.");
      } else if (decision === "reject") {
        toast.success("Record rejected.");
      } else {
        toast.success("Record returned for revision.");
      }
      router.refresh();
    });
  }

  if (["approved", "finalized", "rejected", "withdrawn"].includes(status)) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        No review actions: this record is in <span className="font-medium text-foreground">{status}</span> and is not
        pending review.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Review decision</h3>
      <textarea
        className="min-h-[90px] w-full rounded-md border px-3 py-2"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Remarks (required if rejecting)"
        disabled={isPending}
      />
      <div className="flex flex-wrap gap-2">
        {status === "submitted" ? (
          <Button type="button" variant="outline" onClick={startReview} disabled={isPending}>
            Start review
          </Button>
        ) : null}
        <Button type="button" onClick={() => decide("approve")} disabled={isPending}>
          Approve
        </Button>
        <Button type="button" variant="outline" onClick={() => decide("request_revision")} disabled={isPending}>
          Return for revision
        </Button>
        <Button type="button" variant="destructive" onClick={() => decide("reject")} disabled={isPending}>
          Reject
        </Button>
      </div>
    </div>
  );
}
