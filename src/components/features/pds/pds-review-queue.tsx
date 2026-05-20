"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { ContentSection, EmptyState } from "@/components/foundation";
import { AdminDataTable } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PdsReviewItem } from "@/features/employees/repository/pds.repository";
import { approvePdsAction, rejectPdsAction } from "@/features/pds/pds-review.actions";

type PdsReviewQueueProps = {
    items: PdsReviewItem[];
};

const columns = createAdminColumns<PdsReviewItem>([
    {
        key: "employeeNo",
        header: "Employee No.",
        cell: (row) => <span className="font-mono text-xs">{row.employeeNo || "-"}</span>,
    },
    {
        key: "employeeName",
        header: "Employee",
        cell: (row) => <span className="font-medium">{row.employeeName}</span>,
    },
    {
        key: "updatedAt",
        header: "Submitted",
        cell: (row) =>
            row.updatedAt
                ? new Date(row.updatedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                : "-",
    },
]);

export function PdsReviewQueue({ items }: PdsReviewQueueProps) {
    const [isPending, startTransition] = useTransition();
    const [approveTarget, setApproveTarget] = useState<PdsReviewItem | null>(null);
    const [rejectTarget, setRejectTarget] = useState<PdsReviewItem | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const tableState = useAdminTableState<PdsReviewItem>({
        rows: items,
        initialPageSize: 10,
        searchPredicate: (row, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return row.employeeName.toLowerCase().includes(q) || row.employeeNo.toLowerCase().includes(q);
        },
    });

    const rowActions = createRowActions<PdsReviewItem>(
        tableState.rows,
        (row) => row.profileId,
        () => [
            { key: "approve", label: "Approve" },
            { key: "reject", label: "Reject", destructive: true },
        ]
    );

    function handleRowAction({ rowKey, actionKey }: { rowKey: string; actionKey: string }) {
        const item = items.find((i) => i.profileId === rowKey);
        if (!item) return;
        if (actionKey === "approve") {
            setApproveTarget(item);
        } else if (actionKey === "reject") {
            setRejectReason("");
            setRejectTarget(item);
        }
    }

    function submitApprove() {
        if (!approveTarget) return;
        startTransition(async () => {
            const result = await approvePdsAction(approveTarget.profileId, approveTarget.employeeId);
            setApproveTarget(null);
            if (!result.ok) {
                toast.error(result.error ?? "Failed to approve PDS.");
                return;
            }
            toast.success(`PDS for ${approveTarget.employeeName} approved.`);
        });
    }

    function submitReject() {
        if (!rejectTarget) return;
        if (!rejectReason.trim()) {
            toast.error("A reason is required for rejection.");
            return;
        }
        startTransition(async () => {
            const result = await rejectPdsAction(rejectTarget.profileId, rejectTarget.employeeId, rejectReason);
            setRejectTarget(null);
            if (!result.ok) {
                toast.error(result.error ?? "Failed to reject PDS.");
                return;
            }
            toast.success(`PDS for ${rejectTarget.employeeName} rejected.`);
        });
    }

    return (
        <>
            <ContentSection
                header={
                    <div>
                        <h2 className="text-base font-semibold">Submitted PDS Drafts</h2>
                        <p className="text-sm text-muted-foreground">HR verification queue for campus-scoped and central review.</p>
                    </div>
                }
            >
                {items.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardCheck className="size-5" aria-hidden />}
                        title="No submitted PDS drafts"
                        description="Records will appear here after employees submit their CSC PDS drafts for HR review."
                    />
                ) : (
                    <AdminDataTable
                        rows={tableState.rows}
                        columns={columns}
                        getRowKey={(row) => row.profileId}
                        searchPlaceholder="Search by name or employee no..."
                        searchValue={tableState.search}
                        onSearchChange={tableState.setSearch}
                        rowActionsByRowKey={rowActions}
                        onRowAction={handleRowAction}
                        paginationSummary={tableState.summary}
                        onPrevPage={tableState.prevPage}
                        onNextPage={tableState.nextPage}
                        canPrevPage={tableState.hasPrevPage}
                        canNextPage={tableState.hasNextPage}
                        emptyTitle="No matching records"
                        emptyDescription="Try a different search term."
                    />
                )}
            </ContentSection>

            {/* Approve confirmation dialog */}
            <Dialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve PDS</DialogTitle>
                        <DialogDescription>
                            Approve the PDS draft submitted by{" "}
                            <span className="font-semibold text-foreground">{approveTarget?.employeeName}</span>?
                            This will mark it as approved and notify the employee.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={submitApprove} disabled={isPending}>
                            {isPending ? "Approving…" : "Confirm Approval"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject dialog */}
            <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject PDS</DialogTitle>
                        <DialogDescription>
                            Reject the PDS draft submitted by{" "}
                            <span className="font-semibold text-foreground">{rejectTarget?.employeeName}</span>.
                            A reason is required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="reject-reason">Reason for rejection</Label>
                        <Textarea
                            id="reject-reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Describe what needs to be corrected…"
                            disabled={isPending}
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={submitReject} disabled={isPending || !rejectReason.trim()}>
                            {isPending ? "Rejecting…" : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
