"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText, FormTextarea } from "@/components/foundation";
import {
  trainingRequestFormSchema,
  type TrainingRequestFormInput,
} from "@/features/learning/requests/schemas/request-form.schema";

type Props = {
  campusId: string;
  campusLabel: string;
  programOptions: Array<{ id: string; title: string }>;
  onSubmit: (input: TrainingRequestFormInput) => Promise<{ ok: boolean; error?: string; requestId?: string }>;
};

const NONE = "__none__";

export function MyTrainingRequestForm({ campusId, campusLabel, programOptions, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<TrainingRequestFormInput>({
    campusId,
    programId: null,
    customTitle: null,
    justification: "",
    remarks: null,
  });

  function submit() {
    const parsed = trainingRequestFormSchema.safeParse(formState);
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
      toast.success("Request submitted.");
      router.push("/learning/my-requests");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Campus: <span className="font-medium text-foreground">{campusLabel}</span>
      </p>
      <FormGrid columns={2}>
        <FormSelect
          label="Catalog Program"
          optional
          className="md:col-span-2"
          value={formState.programId ?? NONE}
          options={[
            { value: NONE, label: "None — use custom title below" },
            ...programOptions.map((p) => ({ value: p.id, label: p.title })),
          ]}
          onValueChange={(v) => setFormState((p) => ({ ...p, programId: v === NONE ? null : v }))}
        />
        <FormText
          label="Custom Training Title"
          optional
          className="md:col-span-2"
          placeholder="If not selecting a catalog program"
          value={formState.customTitle ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, customTitle: e.target.value || null }))}
        />
        <FormTextarea
          label="Justification"
          required
          className="md:col-span-2"
          rows={4}
          value={formState.justification}
          onChange={(e) => setFormState((p) => ({ ...p, justification: e.target.value }))}
        />
        <FormTextarea
          label="Remarks"
          optional
          className="md:col-span-2"
          rows={2}
          placeholder="Optional notes for HR or approvers"
          value={formState.remarks ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, remarks: e.target.value || null }))}
        />
      </FormGrid>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={submit}>
          Submit request
        </Button>
      </div>
    </div>
  );
}
