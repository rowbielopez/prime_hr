"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText } from "@/components/foundation";
import {
  recommendationSchema,
  type RecommendationInput,
} from "@/features/recruitment/recommendations/schemas/recommendation-form.schema";

type RecommendationFormProps = {
  initialValue: RecommendationInput;
  vacancyOptions: Array<{ id: string; title: string }>;
  applicantOptions: Array<{ id: string; fullName: string }>;
  onSubmit: (input: RecommendationInput) => Promise<{ ok: boolean; error?: string; id?: string }>;
};

const STATUS_OPTIONS: RecommendationInput["status"][] = [
  "draft",
  "for_review",
  "endorsed",
  "approved",
  "rejected",
];

export function RecommendationForm({
  initialValue,
  vacancyOptions,
  applicantOptions,
  onSubmit,
}: RecommendationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<RecommendationInput>(initialValue);

  const sortedApplicants = useMemo(
    () => [...applicantOptions].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [applicantOptions]
  );

  function submit() {
    const parsed = recommendationSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid recommendation details.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to create recommendation.");
        return;
      }
      toast.success("Recommendation created.");
      if (result.id) router.push(`/recruitment/recommendations/${result.id}`);
      else router.push("/recruitment/recommendations");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormSelect
          label="Vacancy"
          required
          value={formState.vacancyId || undefined}
          placeholder="Select vacancy"
          options={vacancyOptions.map((v) => ({ value: v.id, label: v.title }))}
          onValueChange={(v) => setFormState((prev) => ({ ...prev, vacancyId: v }))}
        />
        <FormSelect
          label="Applicant"
          required
          value={formState.applicantId || undefined}
          placeholder="Select applicant"
          options={sortedApplicants.map((a) => ({ value: a.id, label: a.fullName }))}
          onValueChange={(v) => setFormState((prev) => ({ ...prev, applicantId: v }))}
        />
        <FormSelect
          label="Recommendation Status"
          value={formState.status}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          onValueChange={(v) => setFormState((prev) => ({ ...prev, status: v as RecommendationInput["status"] }))}
        />
        <FormText
          label="Decision Date"
          optional
          placeholder="YYYY-MM-DD"
          value={formState.decidedAt ?? ""}
          onChange={(e) => setFormState((prev) => ({ ...prev, decidedAt: e.target.value || null }))}
        />
        <FormText
          label="Remarks"
          optional
          className="md:col-span-2"
          value={formState.remarks ?? ""}
          onChange={(e) => setFormState((prev) => ({ ...prev, remarks: e.target.value || null }))}
        />
        <FormText
          label="Justification"
          optional
          className="md:col-span-2"
          value={formState.justification ?? ""}
          onChange={(e) => setFormState((prev) => ({ ...prev, justification: e.target.value || null }))}
        />
      </FormGrid>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/recruitment/recommendations")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending}>
          Create Recommendation
        </Button>
      </div>
    </div>
  );
}
