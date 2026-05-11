"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CompetencyFormInput } from "@/features/learning/competencies/schemas/competency-form.schema";

type CampusOption = { id: string; label: string };
type OfficeOption = { id: string; label: string; campusId: string };

export function CompetencyForm({
  initialValue,
  campusOptions,
  officeOptions,
  onSubmit,
  submitLabel,
  returnTo,
}: {
  initialValue: CompetencyFormInput;
  campusOptions: CampusOption[];
  officeOptions: OfficeOption[];
  onSubmit: (input: CompetencyFormInput) => Promise<{ ok: boolean; error?: string; id?: string }>;
  submitLabel: string;
  returnTo: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<CompetencyFormInput>(initialValue);
  const scopedOffices = officeOptions.filter((o) => !form.campusId || o.campusId === form.campusId);

  function submit() {
    startTransition(async () => {
      const result = await onSubmit(form);
      if (!result.ok) {
        toast.error(result.error ?? "Save failed.");
        return;
      }
      toast.success("Saved.");
      router.push(result.id ? `/learning/competencies/${result.id}` : returnTo);
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Code</span>
          <input
            className="h-9 w-full rounded-md border px-3"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Title</span>
          <input
            className="h-9 w-full rounded-md border px-3"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Category</span>
          <input
            className="h-9 w-full rounded-md border px-3"
            value={form.category ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Status</span>
          <select
            className="h-9 w-full rounded-md border px-3"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CompetencyFormInput["status"] }))}
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Campus</span>
          <select
            className="h-9 w-full rounded-md border px-3"
            value={form.campusId ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, campusId: e.target.value || null, officeId: null }))}
          >
            <option value="">Global</option>
            {campusOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
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
            {scopedOffices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Description</span>
        <textarea
          className="min-h-[90px] w-full rounded-md border px-3 py-2"
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </label>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={isPending}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
