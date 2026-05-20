"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText } from "@/components/foundation";
import { DuplicateApplicantWarning } from "@/components/features/recruitment/applicants/duplicate-applicant-warning";
import { applicantFormSchema, type ApplicantFormInput } from "@/features/recruitment/applicants/schemas/applicant-form.schema";

const STATUS_OPTIONS: ApplicantFormInput["status"][] = ["new", "screening", "shortlisted", "hired", "rejected", "withdrawn"];
const NONE = "__none__";

type ApplicantFormProps = {
  mode: "create" | "edit";
  initialValue: ApplicantFormInput;
  applicantId?: string;
  campusOptions: Array<{ id: string; code: string; name: string }>;
  officeOptions: Array<{ id: string; campusId: string; code: string; name: string }>;
  onSubmit: (input: ApplicantFormInput) => Promise<{ ok: boolean; error?: string; id?: string }>;
};

export function ApplicantForm({ mode, initialValue, applicantId, campusOptions, officeOptions, onSubmit }: ApplicantFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<ApplicantFormInput>(initialValue);
  const scopedOffices = useMemo(
    () => officeOptions.filter((office) => office.campusId === formState.campusId),
    [officeOptions, formState.campusId]
  );

  function submit() {
    const parsed = applicantFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid applicant details.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save applicant.");
        return;
      }
      toast.success(mode === "create" ? "Applicant created." : "Applicant updated.");
      if (result.id) router.push(`/recruitment/applicants/${result.id}`);
      else router.push("/recruitment/applicants");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <DuplicateApplicantWarning
        email={formState.email ?? null}
        mobileNo={formState.mobileNo ?? null}
        excludeApplicantId={applicantId ?? null}
      />
      <FormGrid columns={2}>
        <FormText
          label="First Name"
          required
          value={formState.firstName}
          onChange={(e) => setFormState((p) => ({ ...p, firstName: e.target.value }))}
        />
        <FormText
          label="Last Name"
          required
          value={formState.lastName}
          onChange={(e) => setFormState((p) => ({ ...p, lastName: e.target.value }))}
        />
        <FormText
          label="Middle Name"
          optional
          value={formState.middleName ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, middleName: e.target.value || null }))}
        />
        <FormText
          label="Suffix"
          optional
          value={formState.suffix ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, suffix: e.target.value || null }))}
        />
        <FormText
          label="Email"
          optional
          type="email"
          value={formState.email ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, email: e.target.value || null }))}
        />
        <FormText
          label="Mobile No"
          optional
          value={formState.mobileNo ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, mobileNo: e.target.value || null }))}
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
        <FormSelect
          label="Status"
          value={formState.status}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          onValueChange={(v) => setFormState((p) => ({ ...p, status: v as ApplicantFormInput["status"] }))}
        />
        <FormText
          label="Notes"
          optional
          className="md:col-span-2"
          value={formState.notes ?? ""}
          onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value || null }))}
        />
      </FormGrid>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/recruitment/applicants")} disabled={isPending}>Cancel</Button>
        <Button onClick={submit} disabled={isPending}>{mode === "create" ? "Create Applicant" : "Save Changes"}</Button>
      </div>
    </div>
  );
}
