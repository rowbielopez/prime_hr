"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge, InspectorLayout } from "@/components/foundation";
import type { DeletedEvidenceAttachmentItem, EvidenceDetail, EvidenceStatus } from "@/features/compliance/evidence/types";
import { StatusUpdateDialog } from "@/components/features/compliance/evidence/status-update-dialog";
import { EvidenceAttachments } from "@/components/features/compliance/evidence/evidence-attachments";
import { evidenceActionPlanSchema, type EvidenceActionPlanInput } from "@/features/compliance/evidence/schemas/evidence-attachment.schema";
import type { EmployeeOfficeOption } from "@/features/employees/types";

type EvidenceDetailManagementProps = {
  detail: EvidenceDetail;
  allowedStatusOptions: EvidenceStatus[];
  officeOptions: EmployeeOfficeOption[];
  canEditEvidence: boolean;
  canManageEvidence: boolean;
  canReviewEvidence: boolean;
  onUpdateStatus: (input: { status: "draft" | "submitted" | "approved" | "rejected"; remarks?: string | null }) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  onAddAttachment: (input: { evidenceId: string; fileName: string; fileType: string; storagePath?: string | null }) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  onUploadAttachment: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  onGetAttachmentSignedUrl: (attachmentId: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
  onDeleteAttachment: (input: { attachmentId: string; deleteFromStorage: boolean }) => Promise<{ ok: boolean; error?: string }>;
  onRestoreAttachment: (input: { attachmentId: string }) => Promise<{ ok: boolean; error?: string }>;
  onSaveActionPlan: (input: EvidenceActionPlanInput) => Promise<{ ok: boolean; error?: string }>;
};

export function EvidenceDetailManagement({
  detail,
  allowedStatusOptions,
  officeOptions,
  canEditEvidence,
  canManageEvidence,
  canReviewEvidence,
  onUpdateStatus,
  onAddAttachment,
  onUploadAttachment,
  onGetAttachmentSignedUrl,
  onDeleteAttachment,
  onRestoreAttachment,
  onSaveActionPlan,
}: EvidenceDetailManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const actionPlanState: EvidenceActionPlanInput = detail.actionPlan
    ? {
      evidenceId: detail.id,
      gapSummary: detail.actionPlan.gapSummary,
      correctiveAction: detail.actionPlan.correctiveAction,
      ownerName: detail.actionPlan.ownerName,
      ownerUserId: detail.actionPlan.ownerUserId,
      ownerOfficeId: detail.actionPlan.ownerOfficeId,
      gapSeverity: detail.actionPlan.gapSeverity,
      gapCategory: detail.actionPlan.gapCategory,
      rootCause: detail.actionPlan.rootCause,
      referenceClause: detail.actionPlan.referenceClause,
      progressPercent: detail.actionPlan.progressPercent,
      dueDate: detail.actionPlan.dueDate,
      status: detail.actionPlan.status,
      progressNotes: detail.actionPlan.progressNotes,
    }
    : {
      evidenceId: detail.id,
      gapSummary: "",
      correctiveAction: "",
      ownerName: "",
      ownerUserId: null,
      ownerOfficeId: null,
      gapSeverity: "medium",
      gapCategory: "other",
      rootCause: null,
      referenceClause: null,
      progressPercent: 0,
      dueDate: "",
      status: "open",
      progressNotes: null,
    };

  const showStatusDialog = allowedStatusOptions.length > 0 && (canManageEvidence || canReviewEvidence);

  const inspector = (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge
            tone={detail.status === "approved" ? "active" : detail.status === "submitted" ? "pending" : detail.status === "rejected" ? "inactive" : "info"}
            label={detail.status}
          />
        </div>
        {showStatusDialog ? (
          <div className="mt-3">
            <StatusUpdateDialog currentStatus={detail.status} allowedStatuses={allowedStatusOptions} onSubmit={onUpdateStatus} />
          </div>
        ) : null}
        {canEditEvidence ? (
          <Button className="mt-2 w-full" variant="outline" size="sm" onClick={() => router.push(`/compliance/evidence/${detail.id}/edit`)}>
            Edit Entry
          </Button>
        ) : null}
      </div>
      <div className="border-t border-border/70 pt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reporting Period</p>
          <p className="mt-0.5">{detail.reportingPeriod}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</p>
          <p className="mt-0.5">{detail.campusName}{detail.officeName ? ` / ${detail.officeName}` : ""}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Date</p>
          <p className="mt-0.5">{detail.dueDate ?? "—"}</p>
        </div>
        {detail.reviewerRemarks ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reviewer Remarks</p>
            <p className="mt-0.5 text-muted-foreground">{detail.reviewerRemarks}</p>
          </div>
        ) : null}
      </div>
    </div>
  );

  function restoreAttachment(item: DeletedEvidenceAttachmentItem) {
    if (!item.canRestore) {
      toast.error("Cannot restore attachment because the storage object was deleted.");
      return;
    }
    startTransition(async () => {
      const result = await onRestoreAttachment({ attachmentId: item.id });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to restore attachment.");
        return;
      }
      toast.success("Attachment restored.");
    });
  }

  return (
    <InspectorLayout inspector={inspector} inspectorTitle="Evidence Info" inspectorWidth="sm">
      <div className="space-y-6">
        <section className="rounded-xl border border-border/70 bg-surface-panel p-5 shadow-premium-sm">
          <h2 className="text-base font-semibold">{detail.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {detail.areaName} / {detail.indicatorCode} — {detail.indicatorTitle}
          </p>
        </section>

        {canManageEvidence ? (
          <EvidenceAttachments
            evidenceId={detail.id}
            attachments={detail.attachments}
            onAddAttachment={onAddAttachment}
            onUploadAttachment={onUploadAttachment}
            onGetSignedUrl={onGetAttachmentSignedUrl}
            onDeleteAttachment={onDeleteAttachment}
          />
        ) : null}

        {canManageEvidence ? (
          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Deleted Attachments</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Recover previously removed attachments when storage retention was enabled.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">Filename</th>
                    <th className="px-2 py-2">Deleted At</th>
                    <th className="px-2 py-2">Deleted By</th>
                    <th className="px-2 py-2">Storage</th>
                    <th className="px-2 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.deletedAttachments.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-muted-foreground" colSpan={5}>
                        No deleted attachments.
                      </td>
                    </tr>
                  ) : (
                    detail.deletedAttachments.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-2 py-2">{item.fileName}</td>
                        <td className="px-2 py-2">{item.deletedAt.slice(0, 19).replace("T", " ")}</td>
                        <td className="px-2 py-2">{item.deletedByLabel ?? "Unknown"}</td>
                        <td className="px-2 py-2">
                          {item.storageDeletedAt ? (
                            <span className="text-destructive">Object removed</span>
                          ) : (
                            <span className="text-muted-foreground">Retained</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreAttachment(item)}
                            disabled={isPending || !item.canRestore}
                          >
                            Restore
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {canManageEvidence ? (
          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Gap and Action Plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">Track compliance gaps and corrective actions.</p>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const payload: EvidenceActionPlanInput = {
                  evidenceId: detail.id,
                  gapSummary: String(formData.get("gapSummary") ?? ""),
                  correctiveAction: String(formData.get("correctiveAction") ?? ""),
                  ownerName: String(formData.get("ownerName") ?? ""),
                  ownerUserId: String(formData.get("ownerUserId") ?? "") || null,
                  ownerOfficeId: String(formData.get("ownerOfficeId") ?? "") || null,
                  gapSeverity: String(formData.get("gapSeverity") ?? "medium") as EvidenceActionPlanInput["gapSeverity"],
                  gapCategory: String(formData.get("gapCategory") ?? "other") as EvidenceActionPlanInput["gapCategory"],
                  rootCause: String(formData.get("rootCause") ?? "") || null,
                  referenceClause: String(formData.get("referenceClause") ?? "") || null,
                  progressPercent: Number(formData.get("progressPercent") ?? 0),
                  dueDate: String(formData.get("dueDate") ?? ""),
                  status: String(formData.get("status") ?? "open") as EvidenceActionPlanInput["status"],
                  progressNotes: String(formData.get("progressNotes") ?? "") || null,
                };
                const parsed = evidenceActionPlanSchema.safeParse(payload);
                if (!parsed.success) {
                  toast.error(parsed.error.issues[0]?.message ?? "Invalid action plan details.");
                  return;
                }
                startTransition(async () => {
                  const result = await onSaveActionPlan(parsed.data);
                  if (!result.ok) {
                    toast.error(result.error ?? "Failed to save action plan.");
                    return;
                  }
                  toast.success("Action plan updated.");
                  router.refresh();
                });
              }}
            >
              <textarea name="gapSummary" className="min-h-20 rounded-md border p-2 text-sm" defaultValue={actionPlanState.gapSummary} placeholder="Gap summary" />
              <textarea name="correctiveAction" className="min-h-20 rounded-md border p-2 text-sm" defaultValue={actionPlanState.correctiveAction} placeholder="Corrective action" />
              <div className="grid gap-3 md:grid-cols-3">
                <input name="ownerName" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.ownerName} placeholder="Owner (display)" />
                <input name="ownerUserId" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.ownerUserId ?? ""} placeholder="Owner user UUID (optional)" />
                <select name="ownerOfficeId" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.ownerOfficeId ?? ""}>
                  <option value="">Responsible office (optional)</option>
                  {officeOptions
                    .filter((o) => o.campusId === detail.campusId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select name="gapSeverity" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.gapSeverity}>
                  <option value="low">Severity: Low</option>
                  <option value="medium">Severity: Medium</option>
                  <option value="high">Severity: High</option>
                  <option value="critical">Severity: Critical</option>
                </select>
                <select name="gapCategory" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.gapCategory}>
                  <option value="policy">Category: Policy</option>
                  <option value="process">Category: Process</option>
                  <option value="documentation">Category: Documentation</option>
                  <option value="systems">Category: Systems</option>
                  <option value="people">Category: People</option>
                  <option value="other">Category: Other</option>
                </select>
                <input
                  name="progressPercent"
                  type="number"
                  min={0}
                  max={100}
                  className="h-9 rounded-md border px-3 text-sm"
                  defaultValue={String(actionPlanState.progressPercent)}
                  placeholder="Progress %"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <input name="dueDate" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.dueDate} placeholder="Due date (YYYY-MM-DD)" />
                <select name="status" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.status}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
                <input name="referenceClause" className="h-9 rounded-md border px-3 text-sm" defaultValue={actionPlanState.referenceClause ?? ""} placeholder="Reference clause (optional)" />
              </div>
              <textarea name="rootCause" className="min-h-16 rounded-md border p-2 text-sm" defaultValue={actionPlanState.rootCause ?? ""} placeholder="Root cause (optional)" />
              <textarea name="progressNotes" className="min-h-20 rounded-md border p-2 text-sm" defaultValue={actionPlanState.progressNotes ?? ""} placeholder="Progress notes" />
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>Save Action Plan</Button>
              </div>
            </form>
          </section>
        ) : null}

        {canManageEvidence ? (
          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Action Plan History</h3>
            <div className="mt-3 space-y-2 text-sm">
              {detail.actionPlanHistory.length === 0 ? (
                <p className="text-muted-foreground">No action plan changes yet.</p>
              ) : (
                detail.actionPlanHistory.map((entry) => (
                  <div key={entry.id} className="rounded border p-2">
                    <p className="font-medium">{entry.eventType}</p>
                    <p className="text-muted-foreground">{entry.changedAt.slice(0, 19).replace("T", " ")}</p>
                    {entry.changedByLabel ? <p className="text-muted-foreground">By {entry.changedByLabel}</p> : null}
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Status Timeline</h3>
          <div className="mt-3 space-y-2 text-sm">
            {detail.statusHistory.length === 0 ? (
              <p className="text-muted-foreground">No status changes yet.</p>
            ) : (
              detail.statusHistory.map((entry) => (
                <div key={entry.id} className="rounded border p-2">
                  <p className="font-medium">{entry.fromStatus ?? "none"} {"->"} {entry.toStatus}</p>
                  <p className="text-muted-foreground">{entry.changedAt.slice(0, 19).replace("T", " ")}</p>
                  {entry.changedByLabel ? (
                    <p className="text-muted-foreground">By {entry.changedByLabel}</p>
                  ) : null}
                  {entry.remarks ? <p>{entry.remarks}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </InspectorLayout>
  );
}
