"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canTransitionProgramStatus } from "@/features/learning/programs/program-status";
import { updateTrainingProgramStatusAction } from "@/features/learning/programs/actions";
import type { ProgramStatus } from "@/features/learning/types";

type Props = {
  programId: string;
  currentStatus: ProgramStatus;
};

export function TrainingProgramDetailActions({ programId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(next: ProgramStatus) {
    if (!canTransitionProgramStatus(currentStatus, next)) {
      toast.error("That status change is not allowed.");
      return;
    }
    startTransition(async () => {
      const result = await updateTrainingProgramStatusAction(programId, next);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to update status.");
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canTransitionProgramStatus(currentStatus, "draft") && currentStatus !== "draft" ? (
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => run("draft")}>
          Set draft
        </Button>
      ) : null}
      {canTransitionProgramStatus(currentStatus, "active") && currentStatus !== "active" ? (
        <Button type="button" size="sm" disabled={isPending} onClick={() => run("active")}>
          Activate
        </Button>
      ) : null}
      {canTransitionProgramStatus(currentStatus, "archived") && currentStatus !== "archived" ? (
        <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={() => run("archived")}>
          Archive
        </Button>
      ) : null}
    </div>
  );
}
