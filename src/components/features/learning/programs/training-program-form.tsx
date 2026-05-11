"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText, FormTextarea } from "@/components/foundation";
import { programFormSchema, type ProgramFormInput } from "@/features/learning/programs/schemas/program-form.schema";

type Props = {
  mode: "create" | "edit";
  initialValue: ProgramFormInput;
  campusOptions: Array<{ id: string; code: string; name: string }>;
  officeOptions: Array<{ id: string; campusId: string; code: string; name: string }>;
  onSubmit: (input: ProgramFormInput) => Promise<{ ok: boolean; error?: string; programId?: string }>;
};

const NONE = "__none__";

export function TrainingProgramForm({ mode, initialValue, campusOptions, officeOptions, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<ProgramFormInput>(initialValue);

  const scopedOffices = useMemo(
    () => officeOptions.filter((o) => (formState.campusId ? o.campusId === formState.campusId : false)),
    [officeOptions, formState.campusId]
  );

  const campusLabel = useMemo(() => {
    if (!formState.campusId) return "All campuses (org-wide)";
    const c = campusOptions.find((x) => x.id === formState.campusId);
    return c ? `${c.code} — ${c.name}` : formState.campusId;
  }, [campusOptions, formState.campusId]);

  const officeLabel = useMemo(() => {
    if (!formState.officeId) return formState.campusId ? "All offices in campus" : "—";
    const o = officeOptions.find((x) => x.id === formState.officeId);
    return o ? `${o.code} — ${o.name}` : formState.officeId;
  }, [formState.campusId, formState.officeId, officeOptions]);

  function submit() {
    const parsed = programFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid program.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save program.");
        return;
      }
      toast.success(mode === "create" ? "Program created." : "Program updated.");
      if (result.programId) router.push(`/learning/programs/${result.programId}`);
      else router.push("/learning/programs");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormText
          label="Title"
          required
          className="md:col-span-2"
          value={formState.title}
          onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
        />
        <FormTextarea
          label="Description"
          optional
          className="md:col-span-2"
          rows={3}
          value={formState.description ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value || null }))}
        />
        <FormSelect
          label="Modality"
          value={formState.modality}
          options={[
            { value: "classroom", label: "Classroom" },
            { value: "online", label: "Online" },
            { value: "blended", label: "Blended" },
          ]}
          onValueChange={(v) => setFormState((p) => ({ ...p, modality: v as ProgramFormInput["modality"] }))}
        />
        <FormText
          label="Duration (hours)"
          type="number"
          step="0.25"
          min={0.25}
          value={formState.durationHours}
          onChange={(e) => setFormState((p) => ({ ...p, durationHours: Number(e.target.value) }))}
        />
        <FormSelect
          label="Campus"
          optional
          className="md:col-span-2"
          hint={`Catalog scope: ${campusLabel}`}
          value={formState.campusId ?? NONE}
          options={[
            { value: NONE, label: "All campuses (org-wide)" },
            ...campusOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
          ]}
          onValueChange={(v) =>
            setFormState((p) => ({ ...p, campusId: v === NONE ? null : v, officeId: null }))
          }
        />
        <FormSelect
          label="Office"
          optional
          className="md:col-span-2"
          hint={`Further limit to one office, or leave as campus-wide. ${officeLabel}`}
          disabled={!formState.campusId}
          value={formState.officeId ?? NONE}
          options={[
            { value: NONE, label: formState.campusId ? "All offices in this campus" : "Select a campus first" },
            ...scopedOffices.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` })),
          ]}
          onValueChange={(v) => setFormState((p) => ({ ...p, officeId: v === NONE ? null : v }))}
        />
        <FormSelect
          label="Status"
          value={formState.status}
          options={[
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
          onValueChange={(v) => setFormState((p) => ({ ...p, status: v as ProgramFormInput["status"] }))}
        />
      </FormGrid>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={submit}>
          {mode === "create" ? "Create program" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
