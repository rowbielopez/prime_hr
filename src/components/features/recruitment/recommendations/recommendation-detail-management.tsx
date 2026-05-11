"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/foundation";
import type { RecommendationDetail, RecommendationStatus } from "@/features/recruitment/recommendations/types";
import { updateRecommendationStatusAction } from "@/features/recruitment/recommendations/actions";
import {
  canTransitionRecommendationStatus,
  getAllowedRecommendationNextStatuses,
  mapRecommendationStatusToTone,
  recommendationStatusOrder,
} from "@/features/recruitment/recommendations/status";

type RecommendationDetailManagementProps = {
  detail: RecommendationDetail;
  canManage: boolean;
};

const statuses: RecommendationStatus[] = recommendationStatusOrder;

export function RecommendationDetailManagement({ detail, canManage }: RecommendationDetailManagementProps) {
  const [isPending, startTransition] = useTransition();
  const allowedNextStatuses = getAllowedRecommendationNextStatuses(detail.status);

  function setStatus(status: RecommendationStatus) {
    startTransition(async () => {
      const result = await updateRecommendationStatusAction(detail.id, {
        status,
        remarks: detail.remarks,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Recommendation status set to ${status}.`);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{detail.vacancyTitle}</h2>
            <p className="text-sm text-muted-foreground">{detail.applicantName}</p>
          </div>
          <StatusBadge
            tone={mapRecommendationStatusToTone(detail.status)}
            label={detail.status}
          />
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <p><span className="font-medium">Remarks:</span> {detail.remarks ?? "-"}</p>
          <p><span className="font-medium">Justification:</span> {detail.justification ?? "-"}</p>
          <p><span className="font-medium">Decision Date:</span> {detail.decidedAt ?? "-"}</p>
        </div>
      </section>

      {canManage ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Recommendation Status</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Allowed next statuses from <span className="font-medium">{detail.status}</span>:{" "}
            {allowedNextStatuses.length > 0 ? allowedNextStatuses.join(", ") : "no further transitions"}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {statuses.map((status) => {
              const isCurrent = status === detail.status;
              const isAllowed = canTransitionRecommendationStatus(detail.status, status);
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={isCurrent ? "default" : "outline"}
                  onClick={() => setStatus(status)}
                  disabled={isPending || !isAllowed || isCurrent}
                  title={!isAllowed ? `Cannot transition from ${detail.status} to ${status}.` : undefined}
                >
                {status}
                </Button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
