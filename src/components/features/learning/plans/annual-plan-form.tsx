"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { planFormSchema, type PlanFormInput } from "@/features/learning/plans/schemas/plan-form.schema";

type Props = {
  mode: "create" | "edit";
  initialValue: PlanFormInput;
  campusOptions: Array<{ id: string; code: string; name: string }>;
  onSubmit: (input: PlanFormInput) => Promise<{ ok: boolean; error?: string; planId?: string }>;
};

export function AnnualPlanForm({ mode, initialValue, campusOptions, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<PlanFormInput>(initialValue);

  function submit() {
    const parsed = planFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid plan.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save plan.");
        return;
      }
      toast.success(mode === "create" ? "Plan created." : "Plan updated.");
      if (result.planId) router.push(`/learning/plans/${result.planId}`);
      else router.push("/learning/plans");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Year</label>
          <Input
            type="number"
            value={formState.year}
            onChange={(e) => setFormState((p) => ({ ...p, year: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Campus</label>
          <select
            className="h-9 w-full rounded-md border px-3 text-sm"
            value={formState.campusId}
            onChange={(e) => setFormState((p) => ({ ...p, campusId: e.target.value }))}
          >
            <option value="">Select campus</option>
            {campusOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Title</label>
          <Input value={formState.title} onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            className="h-9 w-full rounded-md border px-3 text-sm"
            value={formState.status}
            onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value as PlanFormInput["status"] }))}
          >
            <option value="draft">draft</option>
            <option value="approved">approved</option>
            <option value="active">active</option>
            <option value="closed">closed</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            value={formState.notes ?? ""}
            onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value || null }))}
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={submit}>
          {mode === "create" ? "Create plan" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
