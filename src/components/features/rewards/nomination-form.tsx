"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AutosaveIndicator, FormGrid, FormSelect, FormTextarea } from "@/components/foundation";
import type { AutosaveStatus } from "@/components/foundation";
import type { RewardNominationFormInput } from "@/features/rewards/schemas/nomination-form.schema";

type AwardOption = { id: string; title: string };
type EmployeeOption = { id: string; label: string };

export function RewardNominationForm({
  initialValue,
  awardOptions,
  nomineeOptions,
  onSaveDraft,
  onSubmitNomination,
}: {
  initialValue: RewardNominationFormInput;
  awardOptions: AwardOption[];
  nomineeOptions: EmployeeOption[];
  onSaveDraft?: (input: RewardNominationFormInput) => Promise<{ ok: boolean; error?: string }>;
  onSubmitNomination: (input: RewardNominationFormInput) => Promise<{ ok: boolean; error?: string; nominationId?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<RewardNominationFormInput>(initialValue);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function saveDraft() {
    if (!onSaveDraft) return;
    setAutosaveStatus("saving");
    startTransition(async () => {
      const result = await onSaveDraft(form);
      if (!result.ok) {
        setAutosaveStatus("error");
        toast.error(result.error ?? "Failed to save draft.");
        return;
      }
      setAutosaveStatus("saved");
      setSavedAt(new Date());
      router.refresh();
    });
  }

  function submitNomination() {
    startTransition(async () => {
      const result = await onSubmitNomination(form);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to submit nomination.");
        return;
      }
      toast.success("Nomination submitted.");
      router.push("/rewards/nominations");
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormSelect
          label="Award"
          required
          value={form.awardId || undefined}
          placeholder="Select award"
          options={awardOptions.map((a) => ({ value: a.id, label: a.title }))}
          onValueChange={(v) => setForm((f) => ({ ...f, awardId: v }))}
          disabled={isPending}
        />
        <FormSelect
          label="Nominee"
          required
          value={form.nomineeEmployeeId || undefined}
          placeholder="Select employee"
          options={nomineeOptions.map((e) => ({ value: e.id, label: e.label }))}
          onValueChange={(v) => setForm((f) => ({ ...f, nomineeEmployeeId: v }))}
          disabled={isPending}
        />
        <FormTextarea
          label="Justification"
          required
          className="md:col-span-2"
          rows={5}
          value={form.justification}
          onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
          disabled={isPending}
        />
        <FormTextarea
          label="Nominator Remarks"
          optional
          className="md:col-span-2"
          rows={3}
          value={form.nominatorRemarks ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, nominatorRemarks: e.target.value || null }))}
          disabled={isPending}
        />
      </FormGrid>
      <div className="flex items-center justify-between gap-2">
        {onSaveDraft ? (
          <AutosaveIndicator status={autosaveStatus} savedAt={savedAt} onRetry={saveDraft} />
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {onSaveDraft ? (
            <Button type="button" variant="outline" onClick={saveDraft} disabled={isPending}>
              Save draft
            </Button>
          ) : null}
          <Button type="button" onClick={submitNomination} disabled={isPending}>
            Submit nomination
          </Button>
        </div>
      </div>
    </div>
  );
}

