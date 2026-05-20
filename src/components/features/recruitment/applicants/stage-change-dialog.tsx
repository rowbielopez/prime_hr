"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { changeApplicantStageAction } from "@/features/recruitment/applicants/actions";
import type { ApplicantStatus } from "@/features/recruitment/applicants/types";

type StageChangeDialogProps = {
    applicantId: string;
    currentStatus: ApplicantStatus;
    alreadyConverted: boolean;
    disabled?: boolean;
};

const STAGES: { value: ApplicantStatus; label: string; description: string }[] = [
    { value: "new", label: "New", description: "Newly received candidate" },
    { value: "screening", label: "Screening", description: "Document and qualification review" },
    { value: "shortlisted", label: "Shortlisted", description: "Qualified for interview" },
    { value: "hired", label: "Hired", description: "Offer accepted — requires conversion" },
    { value: "rejected", label: "Rejected", description: "Not pursued further" },
    { value: "withdrawn", label: "Withdrawn", description: "Withdrew application" },
];

export function StageChangeDialog({
    applicantId,
    currentStatus,
    alreadyConverted,
    disabled,
}: StageChangeDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [newStatus, setNewStatus] = useState<ApplicantStatus>(currentStatus);
    const [remarks, setRemarks] = useState("");

    function submit() {
        if (newStatus === currentStatus) {
            toast.error("Select a different stage.");
            return;
        }
        if (newStatus === "hired" && !alreadyConverted) {
            toast.error('Use "Convert to Employee" to mark this applicant as hired.');
            return;
        }
        startTransition(async () => {
            const result = await changeApplicantStageAction({
                applicantId,
                status: newStatus,
                remarks: remarks.trim() || null,
            });
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success("Stage updated.");
            setOpen(false);
            setRemarks("");
            router.refresh();
        });
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) setNewStatus(currentStatus);
            }}
        >
            <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={disabled}>
                Change Stage
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change applicant stage</DialogTitle>
                    <DialogDescription>
                        Current stage: <span className="font-medium capitalize">{currentStatus}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="newStage">New Stage</Label>
                        <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ApplicantStatus)}>
                            <SelectTrigger id="newStage">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STAGES.map((stage) => (
                                    <SelectItem key={stage.value} value={stage.value}>
                                        <div className="flex flex-col">
                                            <span>{stage.label}</span>
                                            <span className="text-xs text-muted-foreground">{stage.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="remarks">Remarks (optional)</Label>
                        <Textarea
                            id="remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Reason for the change, decision, or next steps."
                            rows={3}
                        />
                    </div>
                    {newStatus === "hired" && !alreadyConverted ? (
                        <p className="text-xs text-amber-600">
                            To mark as hired, use &quot;Convert to Employee&quot; — that workflow creates the
                            employee record and links it to this applicant.
                        </p>
                    ) : null}
                </div>
                <DialogFooter>
                    <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>
                        Cancel
                    </DialogClose>
                    <Button
                        onClick={submit}
                        disabled={isPending || newStatus === currentStatus || (newStatus === "hired" && !alreadyConverted)}
                    >
                        {isPending ? "Saving…" : "Update Stage"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
