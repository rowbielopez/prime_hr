"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText } from "@/components/foundation";
import { vacancyFormSchema, type VacancyFormInput } from "@/features/recruitment/vacancies/schemas/vacancy-form.schema";

type VacancyFormProps = {
  mode: "create" | "edit";
  initialValue: VacancyFormInput;
  campusOptions: Array<{ id: string; code: string; name: string }>;
  officeOptions: Array<{ id: string; campusId: string; code: string; name: string }>;
  onSubmit: (input: VacancyFormInput) => Promise<{ ok: boolean; error?: string; vacancyId?: string }>;
};

const STATUS_OPTIONS: VacancyFormInput["status"][] = ["draft", "open", "for_review", "filled", "closed", "cancelled"];
const NONE = "__none__";

export function VacancyForm({ mode, initialValue, campusOptions, officeOptions, onSubmit }: VacancyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<VacancyFormInput>(initialValue);
  const scopedOffices = useMemo(
    () => officeOptions.filter((office) => office.campusId === formState.campusId),
    [officeOptions, formState.campusId]
  );

  function submit() {
    const parsed = vacancyFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid vacancy details.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save vacancy.");
        return;
      }
      toast.success(mode === "create" ? "Vacancy created." : "Vacancy updated.");
      if (result.vacancyId) router.push(`/recruitment/vacancies/${result.vacancyId}`);
      else router.push("/recruitment/vacancies");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormText
          label="Vacancy Title"
          required
          className="md:col-span-2"
          value={formState.title}
          onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
        />
        <FormText
          label="Description"
          optional
          className="md:col-span-2"
          value={formState.description ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value || null }))}
        />
        <FormSelect
          label="Campus"
          required
          value={formState.campusId || undefined}
          placeholder="Select campus"
          options={campusOptions.map((c) => ({ value: c.id, label: `${c.code} – ${c.name}` }))}
          onValueChange={(v) => setFormState((p) => ({ ...p, campusId: v, officeId: null }))}
        />
        <FormSelect
          label="Office"
          optional
          value={formState.officeId ?? NONE}
          options={[
            { value: NONE, label: "No office" },
            ...scopedOffices.map((o) => ({ value: o.id, label: `${o.code} – ${o.name}` })),
          ]}
          onValueChange={(v) => setFormState((p) => ({ ...p, officeId: v === NONE ? null : v }))}
        />
        <FormText
          label="Employment Type"
          optional
          placeholder="e.g. Permanent / Job Order"
          value={formState.employmentType ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, employmentType: e.target.value || null }))}
        />
        <FormText
          label="Item Count"
          type="number"
          min={1}
          value={formState.itemCount}
          onChange={(e) => setFormState((p) => ({ ...p, itemCount: Number(e.target.value) || 1 }))}
        />
        <FormSelect
          label="Status"
          value={formState.status}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          onValueChange={(v) => setFormState((p) => ({ ...p, status: v as VacancyFormInput["status"] }))}
        />
        <FormText
          label="Posted Date"
          optional
          placeholder="YYYY-MM-DD"
          value={formState.postedAt ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, postedAt: e.target.value || null }))}
        />
        <FormText
          label="Closing Date"
          optional
          placeholder="YYYY-MM-DD"
          value={formState.closingAt ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, closingAt: e.target.value || null }))}
        />
        <FormText
          label="Plantilla Item No"
          optional
          value={formState.plantillaItemNo ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, plantillaItemNo: e.target.value || null }))}
        />
        <FormText
          label="Qualification Notes"
          optional
          className="md:col-span-2"
          value={formState.qualificationNotes ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, qualificationNotes: e.target.value || null }))}
        />
      </FormGrid>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/recruitment/vacancies")} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {mode === "create" ? "Create Vacancy" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
