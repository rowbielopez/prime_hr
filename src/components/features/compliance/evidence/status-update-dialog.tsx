"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { statusUpdateSchema, type StatusUpdateInput } from "@/features/compliance/evidence/schemas/status-update.schema";
import type { EvidenceStatus } from "@/features/compliance/evidence/types";

type StatusUpdateDialogProps = {
  currentStatus: EvidenceStatus;
  allowedStatuses: EvidenceStatus[];
  onSubmit: (input: StatusUpdateInput) => Promise<{ ok: boolean; error?: string }>;
};

export function StatusUpdateDialog({ currentStatus, allowedStatuses, onSubmit }: StatusUpdateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<EvidenceStatus>(currentStatus);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  function submit() {
    const normalizedRemarks = remarks.trim();
    const requiresRemarks =
      status !== currentStatus && (status === "approved" || status === "rejected" || status === "draft" || currentStatus === "approved");
    if (requiresRemarks && normalizedRemarks.length === 0) {
      toast.error("Remarks are required for this status change.");
      return;
    }
    const parsed = statusUpdateSchema.safeParse({ status, remarks: remarks || null });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid status update.");
      return;
    }
    if (!allowedStatuses.includes(parsed.data.status)) {
      toast.error("You do not have permission for this status change.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to update status.");
        return;
      }
      toast.success("Evidence status updated.");
      setOpen(false);
    });
  }

  if (allowedStatuses.length === 0) {
    return null;
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Update Status
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Evidence Status</DialogTitle>
            <DialogDescription>Move this evidence through the compliance lifecycle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="h-9 w-full rounded-md border px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as EvidenceStatus)}
              >
                {allowedStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <textarea
                className="min-h-24 w-full rounded-md border p-2 text-sm"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
