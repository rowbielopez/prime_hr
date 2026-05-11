"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PerformanceRecordDetail } from "@/features/performance/repository/records.repository";
import {
  savePerformanceRecordDraftAction,
  savePerformanceRecordDraftHrAction,
  submitPerformanceRecordAction,
  submitPerformanceRecordHrAction,
} from "@/features/performance/actions-stage2";
import type { PerformanceRecordDraftInput } from "@/features/performance/schemas/record-form.schema";

type EditMode = "self" | "hr";

export function PerformanceRecordEditor({
  detail,
  editMode = "self",
  readOnly = false,
}: {
  detail: PerformanceRecordDetail;
  editMode?: EditMode;
  /** When true, show data but block all edits (e.g. HR read-only). */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<PerformanceRecordDraftInput>({
    employeeComments: detail.employeeComments,
    objectives: detail.objectives.map((row) => ({
      id: row.id,
      title: row.title,
      metric: row.metric,
      targetValue: row.targetValue,
      weight: row.weight,
      accomplishments: row.accomplishments.map((acc) => ({
        id: acc.id,
        periodDate: acc.periodDate,
        accomplishmentText: acc.accomplishmentText,
        evidenceLink: acc.evidenceLink,
      })),
    })),
  });

  function addObjective() {
    setForm((f) => ({
      ...f,
      objectives: [...f.objectives, { title: "", metric: null, targetValue: null, weight: 0, accomplishments: [] }],
    }));
  }

  function saveDraft() {
    startTransition(async () => {
      const result =
        editMode === "hr"
          ? await savePerformanceRecordDraftHrAction(detail.id, form)
          : await savePerformanceRecordDraftAction(detail.id, form);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save draft.");
        return;
      }
      toast.success("Draft saved.");
      router.refresh();
    });
  }

  function submit() {
    startTransition(async () => {
      const save =
        editMode === "hr"
          ? await savePerformanceRecordDraftHrAction(detail.id, form)
          : await savePerformanceRecordDraftAction(detail.id, form);
      if (!save.ok) {
        toast.error(save.error ?? "Cannot submit due to validation.");
        return;
      }
      const result =
        editMode === "hr" ? await submitPerformanceRecordHrAction(detail.id) : await submitPerformanceRecordAction(detail.id);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to submit.");
        return;
      }
      toast.success("Record submitted.");
      router.refresh();
    });
  }

  const canEdit = !readOnly && ["draft", "needs_revision"].includes(detail.status);
  const weightTotal = form.objectives.reduce((acc, row) => acc + (Number(row.weight) || 0), 0);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Objectives and accomplishments</h3>
        <span className="text-xs text-muted-foreground">Weight total: {weightTotal}%</span>
      </div>
      {form.objectives.map((obj, idx) => (
        <div key={idx} className="space-y-2 rounded-md border p-3">
          <div className="grid gap-2 md:grid-cols-4">
            <input
              className="h-9 rounded-md border px-3 md:col-span-2"
              disabled={!canEdit || isPending}
              placeholder="Objective title"
              value={obj.title}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  objectives: f.objectives.map((r, i) => (i === idx ? { ...r, title: e.target.value } : r)),
                }))
              }
            />
            <input
              className="h-9 rounded-md border px-3"
              disabled={!canEdit || isPending}
              placeholder="Metric"
              value={obj.metric ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  objectives: f.objectives.map((r, i) => (i === idx ? { ...r, metric: e.target.value } : r)),
                }))
              }
            />
            <input
              type="number"
              min={0}
              max={100}
              className="h-9 rounded-md border px-3"
              disabled={!canEdit || isPending}
              placeholder="Weight %"
              value={obj.weight}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  objectives: f.objectives.map((r, i) => (i === idx ? { ...r, weight: Number(e.target.value) } : r)),
                }))
              }
            />
          </div>
          <input
            className="h-9 w-full rounded-md border px-3"
            disabled={!canEdit || isPending}
            placeholder="Target value / expected result"
            value={obj.targetValue ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                objectives: f.objectives.map((r, i) => (i === idx ? { ...r, targetValue: e.target.value } : r)),
              }))
            }
          />
          <div className="space-y-2">
            {obj.accomplishments.map((acc, accIdx) => (
              <div key={accIdx} className="grid gap-2 md:grid-cols-3">
                <input
                  type="date"
                  className="h-9 rounded-md border px-3"
                  disabled={!canEdit || isPending}
                  value={acc.periodDate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      objectives: f.objectives.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              accomplishments: r.accomplishments.map((a, j) =>
                                j === accIdx ? { ...a, periodDate: e.target.value } : a
                              ),
                            }
                          : r
                      ),
                    }))
                  }
                />
                <input
                  className="h-9 rounded-md border px-3 md:col-span-2"
                  disabled={!canEdit || isPending}
                  placeholder="Accomplishment"
                  value={acc.accomplishmentText}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      objectives: f.objectives.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              accomplishments: r.accomplishments.map((a, j) =>
                                j === accIdx ? { ...a, accomplishmentText: e.target.value } : a
                              ),
                            }
                          : r
                      ),
                    }))
                  }
                />
              </div>
            ))}
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    objectives: f.objectives.map((r, i) =>
                      i === idx
                        ? {
                            ...r,
                            accomplishments: [
                              ...r.accomplishments,
                              { periodDate: new Date().toISOString().slice(0, 10), accomplishmentText: "", evidenceLink: null },
                            ],
                          }
                        : r
                    ),
                  }))
                }
              >
                Add accomplishment
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      {canEdit ? (
        <Button type="button" variant="outline" size="sm" onClick={addObjective} disabled={isPending}>
          Add objective
        </Button>
      ) : null}
      <textarea
        className="min-h-[90px] w-full rounded-md border px-3 py-2"
        disabled={!canEdit || isPending}
        placeholder={editMode === "hr" ? "Employee comments / remarks" : "Employee comments"}
        value={form.employeeComments ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, employeeComments: e.target.value }))}
      />
      <div className="flex justify-end gap-2">
        {canEdit ? (
          <>
            <Button type="button" variant="outline" onClick={saveDraft} disabled={isPending}>
              Save draft
            </Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              Submit for review
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
