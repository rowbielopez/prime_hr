"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect, FormText, Stepper } from "@/components/foundation";
import type { EvidenceFormInput } from "@/features/compliance/evidence/schemas/evidence-form.schema";
import { evidenceFormSchema } from "@/features/compliance/evidence/schemas/evidence-form.schema";
import type { ComplianceIndicator, PrimeArea } from "@/features/compliance/evidence/types";

type EvidenceFormProps = {
  mode: "create" | "edit";
  areas: PrimeArea[];
  indicators: ComplianceIndicator[];
  campusOptions: Array<{ id: string; code: string; name: string }>;
  officeOptions: Array<{ id: string; campusId: string; code: string; name: string }>;
  initialValue: EvidenceFormInput;
  onSubmit: (input: EvidenceFormInput) => Promise<{ ok: boolean; error?: string; evidenceId?: string }>;
};

const STEPS = [
  { id: "area", label: "Area & Indicator" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
] as const;

const NONE = "__none__";

export function EvidenceForm({
  mode,
  areas,
  indicators,
  campusOptions,
  officeOptions,
  initialValue,
  onSubmit,
}: EvidenceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<EvidenceFormInput>(initialValue);
  const [activeStep, setActiveStep] = useState(0);

  const areaIndicators = useMemo(
    () => indicators.filter((indicator) => indicator.areaId === formState.areaId),
    [indicators, formState.areaId]
  );
  const scopedOffices = useMemo(
    () => officeOptions.filter((office) => office.campusId === formState.campusId),
    [officeOptions, formState.campusId]
  );

  function submit() {
    const parsed = evidenceFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid evidence details.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save evidence.");
        return;
      }
      toast.success(mode === "create" ? "Evidence created." : "Evidence updated.");
      if (result.evidenceId) {
        router.push(`/compliance/evidence/${result.evidenceId}`);
      } else {
        router.push("/compliance/evidence");
      }
      router.refresh();
    });
  }

  const areaLabel = areas.find((a) => a.id === formState.areaId)
    ? `${areas.find((a) => a.id === formState.areaId)!.code} — ${areas.find((a) => a.id === formState.areaId)!.name}`
    : "—";
  const indicatorLabel = indicators.find((i) => i.id === formState.indicatorId)
    ? `${indicators.find((i) => i.id === formState.indicatorId)!.code} — ${indicators.find((i) => i.id === formState.indicatorId)!.title}`
    : "—";
  const campusLabel = campusOptions.find((c) => c.id === formState.campusId)
    ? `${campusOptions.find((c) => c.id === formState.campusId)!.code} — ${campusOptions.find((c) => c.id === formState.campusId)!.name}`
    : "—";
  const officeLabel = officeOptions.find((o) => o.id === formState.officeId)
    ? `${officeOptions.find((o) => o.id === formState.officeId)!.code} — ${officeOptions.find((o) => o.id === formState.officeId)!.name}`
    : "None";

  return (
    <div className="space-y-6">
      <Stepper steps={STEPS} activeIndex={activeStep} onStepClick={setActiveStep} />

      {activeStep === 0 && (
        <FormGrid columns={2}>
          <FormSelect
            label="PRIME-HR Area"
            required
            value={formState.areaId || undefined}
            placeholder="Select area"
            options={areas.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
            onValueChange={(v) => setFormState((p) => ({ ...p, areaId: v, indicatorId: "" }))}
          />
          <FormSelect
            label="Indicator"
            required
            value={formState.indicatorId || undefined}
            placeholder={formState.areaId ? "Select indicator" : "Select an area first"}
            disabled={!formState.areaId}
            options={areaIndicators.map((i) => ({ value: i.id, label: `${i.code} — ${i.title}` }))}
            onValueChange={(v) => setFormState((p) => ({ ...p, indicatorId: v }))}
          />
        </FormGrid>
      )}

      {activeStep === 1 && (
        <FormGrid columns={2}>
          <FormText
            label="Evidence Title"
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
            options={campusOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
            onValueChange={(v) => setFormState((p) => ({ ...p, campusId: v, officeId: null }))}
          />
          <FormSelect
            label="Office"
            optional
            value={formState.officeId ?? NONE}
            options={[
              { value: NONE, label: "No office" },
              ...scopedOffices.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` })),
            ]}
            onValueChange={(v) => setFormState((p) => ({ ...p, officeId: v === NONE ? null : v }))}
          />
          <FormText
            label="Reporting Period"
            required
            placeholder="YYYY-MM"
            value={formState.reportingPeriod}
            onChange={(e) => setFormState((p) => ({ ...p, reportingPeriod: e.target.value }))}
          />
          <FormText
            label="Due Date"
            optional
            placeholder="YYYY-MM-DD"
            value={formState.dueDate ?? ""}
            onChange={(e) => setFormState((p) => ({ ...p, dueDate: e.target.value || null }))}
          />
          <FormText
            label="Owner User ID"
            optional
            className="md:col-span-2"
            hint="Optional link to an app user responsible for follow-up."
            placeholder="Internal app user id (UUID)"
            value={formState.ownerUserId ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              setFormState((p) => ({ ...p, ownerUserId: v.length > 0 ? v : null }));
            }}
          />
        </FormGrid>
      )}

      {activeStep === 2 && (
        <dl className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Area</dt>
            <dd className="font-medium">{areaLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Indicator</dt>
            <dd className="font-medium">{indicatorLabel}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">Title</dt>
            <dd className="font-medium">{formState.title || "—"}</dd>
          </div>
          {formState.description && (
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="font-medium">{formState.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Campus</dt>
            <dd className="font-medium">{campusLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Office</dt>
            <dd className="font-medium">{officeLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reporting Period</dt>
            <dd className="font-medium">{formState.reportingPeriod || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Due Date</dt>
            <dd className="font-medium">{formState.dueDate ?? "—"}</dd>
          </div>
          {formState.ownerUserId && (
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Owner User ID</dt>
              <dd className="font-medium font-mono text-xs">{formState.ownerUserId}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/compliance/evidence")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          {activeStep > 0 && (
            <Button variant="outline" onClick={() => setActiveStep((s) => s - 1)} disabled={isPending}>
              Previous
            </Button>
          )}
          {activeStep < STEPS.length - 1 ? (
            <Button onClick={() => setActiveStep((s) => s + 1)} disabled={isPending}>
              Next
            </Button>
          ) : (
            <Button onClick={submit} disabled={isPending}>
              {mode === "create" ? "Create Evidence" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
