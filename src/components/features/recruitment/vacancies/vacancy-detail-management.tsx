"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge, InspectorLayout } from "@/components/foundation";
import type { VacancyDetail, VacancyStatus } from "@/features/recruitment/vacancies/types";
import { updateVacancyStatusAction } from "@/features/recruitment/vacancies/actions";

type VacancyDetailManagementProps = {
  detail: VacancyDetail;
  canManageStatus: boolean;
};

const transitions: VacancyStatus[] = ["draft", "open", "for_review", "filled", "closed", "cancelled"];

export function VacancyDetailManagement({ detail, canManageStatus }: VacancyDetailManagementProps) {
  const [isPending, startTransition] = useTransition();

  function updateStatus(status: VacancyStatus) {
    startTransition(async () => {
      const result = await updateVacancyStatusAction(detail.id, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status updated to ${status}.`);
    });
  }

  const inspector = canManageStatus ? (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Status</p>
        <div className="mt-2">
          <StatusBadge
            tone={detail.status === "open" ? "active" : detail.status === "for_review" ? "pending" : detail.status === "cancelled" ? "inactive" : "info"}
            label={detail.status}
          />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Set Status</p>
        <div className="flex flex-col gap-1.5">
          {transitions.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === detail.status ? "default" : "outline"}
              onClick={() => updateStatus(status)}
              disabled={isPending}
              className="justify-start"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <InspectorLayout
      inspector={inspector}
      inspectorTitle="Status"
      inspectorWidth="sm"
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-border/70 bg-surface-panel p-5 shadow-premium-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{detail.title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {detail.campusName}
                {detail.officeName ? ` / ${detail.officeName}` : ""} · {detail.itemCount} item(s)
              </p>
            </div>
            <StatusBadge
              tone={detail.status === "open" ? "active" : detail.status === "for_review" ? "pending" : detail.status === "cancelled" ? "inactive" : "info"}
              label={detail.status}
            />
          </div>

          <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Employment Type</dt>
              <dd className="mt-0.5 text-foreground">{detail.employmentType ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plantilla Item No.</dt>
              <dd className="mt-0.5 text-foreground">{detail.plantillaItemNo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Posted Date</dt>
              <dd className="mt-0.5 text-foreground">{detail.postedAt ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Closing Date</dt>
              <dd className="mt-0.5 text-foreground">{detail.closingAt ?? "—"}</dd>
            </div>
          </dl>

          {detail.description ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm text-foreground">{detail.description}</p>
            </div>
          ) : null}
          {detail.qualificationNotes ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Qualification Notes</p>
              <p className="mt-1 text-sm text-foreground">{detail.qualificationNotes}</p>
            </div>
          ) : null}
          {detail.remarks ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remarks</p>
              <p className="mt-1 text-sm text-foreground">{detail.remarks}</p>
            </div>
          ) : null}
        </section>
      </div>
    </InspectorLayout>
  );
}
