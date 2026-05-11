"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText } from "@/components/foundation";
import { sessionFormSchema, type SessionFormInput } from "@/features/learning/sessions/schemas/session-form.schema";

type Props = {
  mode: "create" | "edit";
  initialValue: SessionFormInput;
  campusOptions: Array<{ id: string; code: string; name: string }>;
  programOptions: Array<{ id: string; title: string }>;
  onSubmit: (input: SessionFormInput) => Promise<{ ok: boolean; error?: string; sessionId?: string }>;
};

export function TrainingSessionForm({ mode, initialValue, campusOptions, programOptions, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<SessionFormInput>(initialValue);

  function toLocal(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function submit() {
    const payload: SessionFormInput = {
      ...formState,
      startsAt: new Date(formState.startsAt).toISOString(),
      endsAt: new Date(formState.endsAt).toISOString(),
    };
    const parsed = sessionFormSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid session.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save session.");
        return;
      }
      toast.success(mode === "create" ? "Session created." : "Session updated.");
      if (result.sessionId) router.push(`/learning/sessions/${result.sessionId}`);
      else router.push("/learning/sessions");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormSelect
          label="Program"
          required
          className="md:col-span-2"
          value={formState.programId || undefined}
          placeholder="Select program"
          options={programOptions.map((p) => ({ value: p.id, label: p.title }))}
          onValueChange={(v) => setFormState((p) => ({ ...p, programId: v }))}
        />
        <FormText
          label="Session Title"
          required
          className="md:col-span-2"
          value={formState.title}
          onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
        />
        <FormSelect
          label="Campus"
          required
          value={formState.campusId || undefined}
          placeholder="Select campus"
          options={campusOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
          onValueChange={(v) => setFormState((p) => ({ ...p, campusId: v }))}
        />
        <FormText
          label="Capacity"
          optional
          type="number"
          min={1}
          value={formState.capacity ?? ""}
          onChange={(e) =>
            setFormState((p) => ({
              ...p,
              capacity: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
        />
        <FormText
          label="Venue"
          optional
          className="md:col-span-2"
          value={formState.venue ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, venue: e.target.value || null }))}
        />
        <FormText
          label="Starts At"
          required
          type="datetime-local"
          value={toLocal(formState.startsAt)}
          onChange={(e) => setFormState((p) => ({ ...p, startsAt: new Date(e.target.value).toISOString() }))}
        />
        <FormText
          label="Ends At"
          required
          type="datetime-local"
          value={toLocal(formState.endsAt)}
          onChange={(e) => setFormState((p) => ({ ...p, endsAt: new Date(e.target.value).toISOString() }))}
        />
        <FormSelect
          label="Status"
          value={formState.status}
          options={[
            { value: "scheduled", label: "Scheduled" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          onValueChange={(v) => setFormState((p) => ({ ...p, status: v as SessionFormInput["status"] }))}
        />
      </FormGrid>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={submit}>
          {mode === "create" ? "Create session" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
