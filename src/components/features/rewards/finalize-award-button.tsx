"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function FinalizeRewardAwardButton({
  onFinalize,
}: {
  onFinalize: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const result = await onFinalize();
          if (!result.ok) {
            toast.error(result.error ?? "Failed to finalize award.");
            return;
          }
          toast.success("Nomination finalized and moved to awardee history.");
          router.refresh();
        })
      }
      disabled={isPending}
    >
      Finalize to awardee history
    </Button>
  );
}

