"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText, FormTextarea } from "@/components/foundation";
import {
  trainingNominationFormSchema,
  type TrainingNominationFormInput,
} from "@/features/learning/requests/schemas/request-form.schema";
import type { EmployeeListItem } from "@/features/employees/types";

type Props = {
  campusOptions: Array<{ id: string; code: string; name: string }>;
  programOptions: Array<{ id: string; title: string }>;
  employees: EmployeeListItem[];
  onSubmit: (input: TrainingNominationFormInput) => Promise<{ ok: boolean; error?: string; requestId?: string }>;
};

const NONE = "__none__";

export function TrainingNominationForm({ campusOptions, programOptions, employees, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<TrainingNominationFormInput>({
    campusId: campusOptions[0]?.id ?? "",
    subjectEmployeeId: "",
    programId: null,
    customTitle: null,
    justification: "",
    remarks: null,
  });

  const scopedEmployees = useMemo(
    () => employees.filter((e) => e.campusId === formState.campusId && e.employmentStatus === "active"),
    [employees, formState.campusId]
  );

  function submit() {
    const parsed = trainingNominationFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your inputs.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to submit.");
        return;
      }
      toast.success("Nomination submitted.");
      router.push("/learning/requests");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormSelect
          label="Campus"
          required
          className="md:col-span-2"
          value={formState.campusId || undefined}
          placeholder="Select campus"
          options={campusOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
          onValueChange={(v) => setFormState((p) => ({ ...p, campusId: v, subjectEmployeeId: "" }))}
        />
        <FormSelect
          label="Employee"
          required
          className="md:col-span-2"
          disabled={!formState.campusId}
          value={formState.subjectEmployeeId || undefined}
          placeholder={formState.campusId ? "Select employee" : "Choose a campus first"}
          options={scopedEmployees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeNo})` }))}
          onValueChange={(v) => setFormState((p) => ({ ...p, subjectEmployeeId: v }))}
        />
        <FormSelect
          label="Training Program"
          optional
          className="md:col-span-2"
          value={formState.programId ?? NONE}
          options={[
            { value: NONE, label: "Select catalog program (or use custom title below)" },
            ...programOptions.map((p) => ({ value: p.id, label: p.title })),
          ]}
          onValueChange={(v) => setFormState((p) => ({ ...p, programId: v === NONE ? null : v }))}
        />
        <FormText
          label="Custom Training Title"
          optional
          className="md:col-span-2"
          placeholder="If not using a catalog program"
          value={formState.customTitle ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, customTitle: e.target.value || null }))}
        />
        <FormTextarea
          label="Rationale"
          required
          className="md:col-span-2"
          rows={3}
          placeholder="Why should this employee attend?"
          value={formState.justification}
          onChange={(e) => setFormState((p) => ({ ...p, justification: e.target.value }))}
        />
        <FormTextarea
          label="Remarks"
          optional
          className="md:col-span-2"
          rows={2}
          placeholder="Scheduling notes, priority, or context for approvers"
          value={formState.remarks ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, remarks: e.target.value || null }))}
        />
      </FormGrid>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={submit}>
          Submit nomination
        </Button>
      </div>
    </div>
  );
}
