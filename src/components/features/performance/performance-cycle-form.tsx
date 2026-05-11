"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText, FormTextarea } from "@/components/foundation";
import type { PerformanceCycleFormInput } from "@/features/performance/schemas/cycle-form.schema";

type CampusOption = { id: string; code: string; name: string };
type OfficeOption = { id: string; campusId: string; code: string; name: string };

const NONE = "__none__";

export function PerformanceCycleForm({
  initialValue,
  campusOptions,
  officeOptions,
  onSubmit,
}: {
  initialValue: PerformanceCycleFormInput;
  campusOptions: CampusOption[];
  officeOptions: OfficeOption[];
  onSubmit: (input: PerformanceCycleFormInput) => Promise<{ ok: boolean; error?: string; cycleId?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<PerformanceCycleFormInput>(initialValue);
  const scopedOffices = officeOptions.filter((o) => !form.campusId || o.campusId === form.campusId);

  function save() {
    startTransition(async () => {
      const result = await onSubmit(form);
      if (!result.ok) {
        toast.error(result.error ?? "Save failed.");
        return;
      }
      toast.success("Cycle saved.");
      router.push("/performance/cycles");
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormText
          label="Cycle Name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <FormSelect
          label="Status"
          value={form.status}
          options={[
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
            { value: "closed", label: "Closed" },
            { value: "archived", label: "Archived" },
          ]}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v as PerformanceCycleFormInput["status"] }))}
        />
        <FormText
          label="Start Date"
          required
          type="date"
          value={form.startDate}
          onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
        />
        <FormText
          label="Submission Deadline"
          required
          type="date"
          value={form.submissionDeadline}
          onChange={(e) => setForm((f) => ({ ...f, submissionDeadline: e.target.value }))}
        />
        <FormText
          label="Review Deadline"
          required
          type="date"
          value={form.reviewDeadline}
          onChange={(e) => setForm((f) => ({ ...f, reviewDeadline: e.target.value }))}
        />
        <FormText
          label="End Date"
          required
          type="date"
          value={form.endDate}
          onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
        />
        <FormSelect
          label="Campus"
          optional
          value={form.campusId ?? NONE}
          options={[
            { value: NONE, label: "All campuses" },
            ...campusOptions.map((c) => ({ value: c.id, label: `${c.code} – ${c.name}` })),
          ]}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, campusId: v === NONE ? null : v, officeId: null }))
          }
        />
        <FormSelect
          label="Office"
          optional
          value={form.officeId ?? NONE}
          options={[
            { value: NONE, label: "All offices" },
            ...scopedOffices.map((o) => ({ value: o.id, label: `${o.code} – ${o.name}` })),
          ]}
          onValueChange={(v) => setForm((f) => ({ ...f, officeId: v === NONE ? null : v }))}
        />
        <FormTextarea
          label="Description"
          optional
          className="md:col-span-2"
          rows={3}
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </FormGrid>
      <div className="flex justify-end">
        <Button onClick={save} disabled={isPending}>Save cycle</Button>
      </div>
    </div>
  );
}
