"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trainingRequestReviewSchema, type TrainingRequestReviewInput } from "@/features/learning/requests/schemas/request-form.schema";

type Props = {
  initial: TrainingRequestReviewInput;
  onSubmit: (input: TrainingRequestReviewInput) => Promise<{ ok: boolean; error?: string }>;
};

export function TrainingRequestReviewForm({ initial, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<TrainingRequestReviewInput>(initial);

  function submit() {
    const parsed = trainingRequestReviewSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid review.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save.");
        return;
      }
      toast.success("Request updated.");
      router.push("/learning/requests");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Decision</label>
        <select
          className="h-9 w-full rounded-md border px-3 text-sm"
          value={formState.status}
          onChange={(e) =>
            setFormState((p) => ({ ...p, status: e.target.value as TrainingRequestReviewInput["status"] }))
          }
        >
          <option value="under_review">under_review</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Reviewer notes</label>
        <Textarea
          value={formState.reviewerNotes ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, reviewerNotes: e.target.value || null }))}
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={submit}>
          Save decision
        </Button>
      </div>
    </div>
  );
}
