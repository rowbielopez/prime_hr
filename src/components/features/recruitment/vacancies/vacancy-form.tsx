"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Save, Eye, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  FormControl,
  FormGrid,
  FormSelect,
  FormText,
  FormTextarea,
  StatusBadge,
} from "@/components/foundation";
import {
  vacancyFormSchema,
  type VacancyFormInput,
} from "@/features/recruitment/vacancies/schemas/vacancy-form.schema";
import type { StatusTone } from "@/components/foundation/feedback/status-badge";

type VacancyFormProps = {
  mode: "create" | "edit";
  initialValue: VacancyFormInput;
  campusOptions: Array<{ id: string; code: string; name: string }>;
  officeOptions: Array<{
    id: string;
    campusId: string;
    code: string;
    name: string;
  }>;
  onSubmit: (
    input: VacancyFormInput,
  ) => Promise<{ ok: boolean; error?: string; vacancyId?: string }>;
};

const STATUS_OPTIONS: VacancyFormInput["status"][] = [
  "draft",
  "for_review",
  "open",
  "filled",
  "closed",
  "cancelled",
];
const NONE = "__none__";

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "Permanent", label: "Permanent" },
  { value: "Temporary", label: "Temporary" },
  { value: "Co-Terminus", label: "Co-Terminus" },
  { value: "Contractual", label: "Contractual" },
  { value: "Contract of Service (COS)", label: "Contract of Service (COS)" },
  { value: "Job Order (JO)", label: "Job Order (JO)" },
] as const;

type DocumentGroup = {
  label: string;
  items: { value: string; label: string }[];
};

const REQUIRED_DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    label: "Standard HR Documents",
    items: [
      { value: "pds", label: "Personal Data Sheet (CSC Form 212 Rev. 2025)" },
      { value: "application_letter", label: "Application Letter" },
      {
        value: "saln",
        label: "SALN (Statement of Assets, Liabilities & Net Worth)",
      },
      { value: "medical_certificate", label: "Medical Certificate" },
    ],
  },
  {
    label: "Credentials & Service Records",
    items: [
      { value: "tor_diploma", label: "Transcript of Records / Diploma" },
      {
        value: "civil_service_eligibility",
        label: "Certificate of Civil Service Eligibility",
      },
      { value: "service_record", label: "Service Record" },
      {
        value: "performance_rating",
        label: "Performance Rating (IPCR/OPCR — last 2 rating periods)",
      },
      {
        value: "training_certificates",
        label: "Training Certificates (relevant to position)",
      },
    ],
  },
  {
    label: "Government Clearances & IDs",
    items: [
      { value: "nbi_clearance", label: "NBI Clearance" },
      { value: "police_clearance", label: "Police Clearance" },
      { value: "passport_photo", label: "2×2 Passport-size Photo (3 copies)" },
    ],
  },
  {
    label: "Civil Registry Documents",
    items: [
      { value: "birth_certificate", label: "PSA Birth Certificate" },
      {
        value: "marriage_certificate",
        label: "PSA Marriage Certificate (if applicable)",
      },
    ],
  },
  {
    label: "Other Requirements",
    items: [
      {
        value: "position_description_form",
        label: "Position Description Form (DBM-CSC Form No. 1)",
      },
      {
        value: "employment_certificate",
        label: "Certificate of Previous Employment",
      },
    ],
  },
];

const STATUS_DESCRIPTIONS: Record<VacancyFormInput["status"], string> = {
  draft: "Vacancy is being prepared. Not visible to applicants.",
  for_review: "Submitted for HR review and approval before publishing.",
  open: "Published and accepting applications from the public.",
  filled: "Position has been filled. No new applications accepted.",
  closed: "Vacancy is closed. Application window has ended.",
  cancelled: "Vacancy was cancelled and will not be filled.",
};

function StatusInfoLabel() {
  return (
    <span className="inline-flex items-center gap-1.5">
      Workflow Status
      <TooltipRoot>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-150"
              aria-label="Status descriptions"
            />
          }
        >
          <Info className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="right" className="w-64 space-y-2 p-3">
          {STATUS_OPTIONS.map((s) => (
            <div key={s}>
              <span className="font-semibold capitalize">
                {statusLabel(s)}:
              </span>{" "}
              <span className="text-muted-foreground">
                {STATUS_DESCRIPTIONS[s]}
              </span>
            </div>
          ))}
        </TooltipContent>
      </TooltipRoot>
    </span>
  );
}

function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipRoot>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </TooltipRoot>
  );
}

export function VacancyForm({
  mode,
  initialValue,
  campusOptions,
  officeOptions,
  onSubmit,
}: VacancyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<VacancyFormInput>({
    ...initialValue,
    requiredDocuments: initialValue.requiredDocuments ?? [],
  });

  function toggleDocument(value: string) {
    setFormState((prev) => {
      const current = prev.requiredDocuments ?? [];
      return {
        ...prev,
        requiredDocuments: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }
  const scopedOffices = useMemo(
    () =>
      officeOptions.filter((office) => office.campusId === formState.campusId),
    [officeOptions, formState.campusId],
  );

  function submit(nextStatus?: VacancyFormInput["status"]) {
    const candidate = { ...formState, status: nextStatus ?? formState.status };
    const parsed = vacancyFormSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ??
          "Please complete the required vacancy details before saving.",
      );
      return;
    }
    startTransition(async () => {
      try {
        const result = await onSubmit(parsed.data);
        if (!result.ok) {
          toast.error(
            result.error ??
              "We could not save your changes right now. Please try again.",
          );
          return;
        }
        toast.success(saveMessage(mode, parsed.data.status));
        if (result.vacancyId)
          router.push(`/recruitment/vacancies/${result.vacancyId}`);
        else router.push("/recruitment/vacancies");
        router.refresh();
      } catch {
        toast.error(
          "We could not save your changes right now. Please try again.",
        );
      }
    });
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Vacancy Information</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a job vacancy record. You can save it as draft before
                publishing.
              </p>
            </div>
            <StatusBadge
              tone={statusTone(formState.status)}
              label={statusLabel(formState.status)}
            />
          </div>
          <FormGrid columns={2} className="mt-4">
            <FormText
              label="Vacancy Title"
              required
              className="md:col-span-2"
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <FormText
              label="Position / Plantilla Item No."
              optional
              help="Use the plantilla item number when applicable. Keep the vacancy title readable for HR staff."
              value={formState.plantillaItemNo ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  plantillaItemNo: event.target.value || null,
                }))
              }
            />
            <FormSelect
              label="Employment Type"
              optional
              value={formState.employmentType ?? undefined}
              placeholder="Select employment type…"
              options={EMPLOYMENT_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  employmentType: value || null,
                }))
              }
            />
            <FormText
              label="Number of Slots"
              type="number"
              min={1}
              required
              value={formState.itemCount}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  itemCount: Number(event.target.value) || 1,
                }))
              }
            />
            <FormSelect
              label={<StatusInfoLabel />}
              value={formState.status}
              options={STATUS_OPTIONS.map((status) => ({
                value: status,
                label: statusLabel(status),
              }))}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  status: value as VacancyFormInput["status"],
                }))
              }
            />
          </FormGrid>
        </section>

        <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
          <h2 className="text-base font-semibold">Assignment</h2>
          <FormGrid columns={2} className="mt-4">
            {/* Campus — uses SearchableSelect to reliably show campus name (not raw UUID) */}
            <FormControl label="Campus" required>
              <SearchableSelect
                value={formState.campusId || null}
                onValueChange={(v) =>
                  setFormState((prev) => ({
                    ...prev,
                    campusId: v ?? "",
                    officeId: null,
                  }))
                }
                options={campusOptions.map((c) => ({
                  value: c.id,
                  label: `${c.code} — ${c.name}`,
                }))}
                placeholder="Select campus…"
                searchPlaceholder="Search campuses…"
              />
            </FormControl>
            <FormSelect
              label="Office / Place of Assignment"
              optional
              value={formState.officeId ?? NONE}
              placeholder="— Select office —"
              options={[
                { value: NONE, label: "— Select office —" },
                ...scopedOffices.map((office) => ({
                  value: office.id,
                  label: `${office.code} — ${office.name}`,
                })),
              ]}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  officeId: value === NONE ? null : value,
                }))
              }
            />
          </FormGrid>
        </section>

        <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
          <h2 className="text-base font-semibold">Posting Schedule</h2>
          <FormGrid columns={2} className="mt-4">
            <FormText
              label="Posting Date"
              type="date"
              optional
              value={formState.postedAt ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  postedAt: event.target.value || null,
                }))
              }
            />
            <FormText
              label="Application Deadline"
              type="date"
              optional
              value={formState.closingAt ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  closingAt: event.target.value || null,
                }))
              }
            />
          </FormGrid>
        </section>

        <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
          <h2 className="text-base font-semibold">
            Qualifications and Job Description
          </h2>
          <FormGrid columns={2} className="mt-4">
            <FormTextarea
              label="Job Summary / Duties and Responsibilities"
              optional
              className="md:col-span-2"
              rows={5}
              value={formState.description ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  description: event.target.value || null,
                }))
              }
            />
            <FormTextarea
              label="Qualifications / Requirements"
              optional
              className="md:col-span-2"
              rows={5}
              value={formState.qualificationNotes ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  qualificationNotes: event.target.value || null,
                }))
              }
            />
          </FormGrid>
        </section>

        <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Required Documents</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check all documents applicants must submit. Only checked items
                will be shown on the public posting.
              </p>
            </div>
            {(formState.requiredDocuments ?? []).length > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {(formState.requiredDocuments ?? []).length} selected
              </span>
            )}
          </div>
          <div className="mt-4 space-y-5">
            {REQUIRED_DOCUMENT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const checked = (
                      formState.requiredDocuments ?? []
                    ).includes(item.value);
                    return (
                      <label
                        key={item.value}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                          checked
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-border bg-surface-inset text-muted-foreground hover:border-primary/20 hover:bg-surface-raised",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                          checked={checked}
                          onChange={() => toggleDocument(item.value)}
                        />
                        <span className="text-sm leading-snug">
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
          <h2 className="text-base font-semibold">Internal Notes</h2>
          <FormTextarea
            label="Remarks"
            optional
            hideLabel
            rows={4}
            placeholder="Internal HR notes. These are not part of the public posting preview."
            value={formState.remarks ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                remarks: event.target.value || null,
              }))
            }
          />
        </section>

        {/* ── Action buttons ── */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Cancel */}
          <ActionTooltip label="Discard changes and return to vacancies list">
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => router.push("/recruitment/vacancies")}
              disabled={isPending}
            >
              <X className="size-4" />
              Cancel
            </Button>
          </ActionTooltip>

          {/* Save Draft */}
          <ActionTooltip label="Save as draft — you can continue editing later">
            <Button
              variant="outline"
              className="border-blue-500/40 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
              onClick={() => submit("draft")}
              disabled={isPending}
            >
              <Save className="size-4" />
              Save Draft
            </Button>
          </ActionTooltip>

          {/* Review Posting */}
          <ActionTooltip label="Submit for HR review before publishing to the public careers page">
            <Button
              variant="outline"
              className="border-amber-500/40 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
              onClick={() => submit("for_review")}
              disabled={isPending}
            >
              <Eye className="size-4" />
              Review Posting
            </Button>
          </ActionTooltip>

          {/* Create / Save */}
          <ActionTooltip
            label={
              mode === "create"
                ? "Save and create the vacancy with the current status"
                : "Save all changes to this vacancy"
            }
          >
            <Button onClick={() => submit()} disabled={isPending}>
              <CheckCircle2 className="size-4" />
              {mode === "create" ? "Create Vacancy" : "Save Changes"}
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

function saveMessage(
  mode: "create" | "edit",
  status: VacancyFormInput["status"],
) {
  if (status === "draft")
    return mode === "create"
      ? "Draft vacancy created."
      : "Draft vacancy saved.";
  if (status === "for_review") return "Job vacancy saved for review.";
  return mode === "create"
    ? "Vacancy created successfully."
    : "Job vacancy updated successfully.";
}

function statusLabel(status: VacancyFormInput["status"]) {
  const labels: Record<VacancyFormInput["status"], string> = {
    draft: "Draft",
    for_review: "For Review",
    open: "Published",
    filled: "Filled",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

function statusTone(status: VacancyFormInput["status"]): StatusTone {
  if (status === "open" || status === "filled") return "active";
  if (status === "draft" || status === "for_review") return "pending";
  if (status === "closed" || status === "cancelled") return "inactive";
  return "info";
}
