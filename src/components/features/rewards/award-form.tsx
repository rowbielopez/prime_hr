"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText, FormTextarea } from "@/components/foundation";
import type { RewardAwardFormInput } from "@/features/rewards/schemas/award-form.schema";

type CampusOption = { id: string; code: string; name: string };
type OfficeOption = { id: string; campusId: string; code: string; name: string };

const NONE = "__none__";

export function RewardAwardForm({
  initialValue,
  campusOptions,
  officeOptions,
  onSubmit,
}: {
  initialValue: RewardAwardFormInput;
  campusOptions: CampusOption[];
  officeOptions: OfficeOption[];
  onSubmit: (input: RewardAwardFormInput) => Promise<{ ok: boolean; error?: string; awardId?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<RewardAwardFormInput>(initialValue);
  const scopedOffices = officeOptions.filter((o) => !form.campusId || o.campusId === form.campusId);

  function save() {
    startTransition(async () => {
      const result = await onSubmit(form);
      if (!result.ok) {
        toast.error(result.error ?? "Save failed.");
        return;
      }
      toast.success("Award saved.");
      router.push("/rewards/awards");
    });
  }

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormText
          label="Code"
          required
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
        />
        <FormSelect
          label="Status"
          value={form.status}
          options={[
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "archived", label: "Archived" },
          ]}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v as RewardAwardFormInput["status"] }))}
        />
        <FormText
          label="Title"
          required
          className="md:col-span-2"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <FormText
          label="Nomination Start"
          optional
          type="date"
          value={form.nominationStartDate ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, nominationStartDate: e.target.value || null }))}
        />
        <FormText
          label="Nomination End"
          optional
          type="date"
          value={form.nominationEndDate ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, nominationEndDate: e.target.value || null }))}
        />
        <FormText
          label="Review End"
          optional
          type="date"
          value={form.reviewEndDate ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, reviewEndDate: e.target.value || null }))}
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
        <Button onClick={save} disabled={isPending}>
          Save award
        </Button>
      </div>
    </div>
  );
}

