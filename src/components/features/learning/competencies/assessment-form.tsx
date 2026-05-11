"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CompetencyAssessmentFormInput } from "@/features/learning/competencies/schemas/assessment-form.schema";

type Option = { id: string; label: string };
type OfficeOption = { id: string; label: string; campusId: string };

export function AssessmentForm({
  initialValue,
  employeeOptions,
  campusOptions,
  officeOptions,
  competencyOptions,
  onSubmit,
}: {
  initialValue: CompetencyAssessmentFormInput;
  employeeOptions: Option[];
  campusOptions: Option[];
  officeOptions: OfficeOption[];
  competencyOptions: Option[];
  onSubmit: (input: CompetencyAssessmentFormInput) => Promise<{ ok: boolean; error?: string; id?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<CompetencyAssessmentFormInput>(initialValue);
  const filteredOffices = officeOptions.filter((o) => o.campusId === form.campusId);

  function addItem() {
    const first = competencyOptions[0];
    if (!first) return;
    setForm((f) => ({
      ...f,
      items: [...f.items, { competencyId: first.id, targetLevel: 3, currentLevel: 3, evidenceNotes: null }],
    }));
  }

  function submit() {
    startTransition(async () => {
      const result = await onSubmit(form);
      if (!result.ok) {
        toast.error(result.error ?? "Save failed.");
        return;
      }
      toast.success("Saved.");
      router.push(result.id ? `/learning/competencies/assessments/${result.id}` : "/learning/competencies/assessments");
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Employee</span>
          <select
            className="h-9 w-full rounded-md border px-3"
            value={form.employeeId}
            onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
          >
            <option value="">Select employee</option>
            {employeeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Date</span>
          <input
            type="date"
            className="h-9 w-full rounded-md border px-3"
            value={form.assessmentDate}
            onChange={(e) => setForm((f) => ({ ...f, assessmentDate: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Campus</span>
          <select
            className="h-9 w-full rounded-md border px-3"
            value={form.campusId}
            onChange={(e) => setForm((f) => ({ ...f, campusId: e.target.value, officeId: null }))}
          >
            <option value="">Select campus</option>
            {campusOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Office</span>
          <select
            className="h-9 w-full rounded-md border px-3"
            value={form.officeId ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, officeId: e.target.value || null }))}
          >
            <option value="">All offices</option>
            {filteredOffices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Status</span>
        <select
          className="h-9 w-full rounded-md border px-3"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CompetencyAssessmentFormInput["status"] }))}
        >
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="validated">validated</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Remarks</span>
        <textarea
          className="min-h-[70px] w-full rounded-md border px-3 py-2"
          value={form.remarks ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
        />
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Competency ratings</h3>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            Add competency
          </Button>
        </div>
        {form.items.map((item, idx) => (
          <div key={idx} className="grid gap-2 rounded-md border p-3 md:grid-cols-4">
            <select
              className="h-9 rounded-md border px-3"
              value={item.competencyId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  items: f.items.map((x, i) => (i === idx ? { ...x, competencyId: e.target.value } : x)),
                }))
              }
            >
              {competencyOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={5}
              className="h-9 rounded-md border px-3"
              value={item.targetLevel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  items: f.items.map((x, i) => (i === idx ? { ...x, targetLevel: Number(e.target.value) } : x)),
                }))
              }
            />
            <input
              type="number"
              min={1}
              max={5}
              className="h-9 rounded-md border px-3"
              value={item.currentLevel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  items: f.items.map((x, i) => (i === idx ? { ...x, currentLevel: Number(e.target.value) } : x)),
                }))
              }
            />
            <input
              className="h-9 rounded-md border px-3"
              value={item.evidenceNotes ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  items: f.items.map((x, i) => (i === idx ? { ...x, evidenceNotes: e.target.value } : x)),
                }))
              }
              placeholder="Evidence notes"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={isPending}>
          Save assessment
        </Button>
      </div>
    </div>
  );
}
