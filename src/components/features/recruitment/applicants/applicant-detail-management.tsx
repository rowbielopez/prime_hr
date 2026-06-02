"use client";

import { useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/foundation";
import { ConvertToEmployeeDialog } from "@/components/features/recruitment/applicants/convert-to-employee-dialog";
import { StageChangeDialog } from "@/components/features/recruitment/applicants/stage-change-dialog";
import { cn } from "@/lib/utils";
import type {
  ApplicantDetail,
  ApplicationRecord,
  ApplicantStatus,
  ApplicationStatus,
} from "@/features/recruitment/applicants/types";
import type { StatusTone } from "@/components/foundation/feedback/status-badge";
import {
  applicationCreateSchema,
  applicationStatusSchema,
} from "@/features/recruitment/applicants/schemas/application-form.schema";
import {
  interviewRecordSchema,
  screeningResultSchema,
  type InterviewRecordInput,
  type ScreeningResultInput,
} from "@/features/recruitment/applicants/schemas/screening-and-interview.schema";

// ─── Label / Tone Maps ────────────────────────────────────────────────────────

const APPLICANT_STATUS_LABEL: Record<ApplicantStatus, string> = {
  new: "New Application",
  screening: "Under Screening",
  shortlisted: "Shortlisted",
  hired: "Hired",
  rejected: "Not Qualified",
  withdrawn: "Withdrawn",
};

const APPLICANT_STATUS_TONE: Record<ApplicantStatus, StatusTone> = {
  new: "info",
  screening: "pending",
  shortlisted: "pending",
  hired: "active",
  rejected: "error",
  withdrawn: "inactive",
};

const APP_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  screening: "Screening",
  interview: "Interview / Assessment",
  for_offer: "For Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const APP_STATUS_TONE: Record<ApplicationStatus, StatusTone> = {
  submitted: "info",
  screening: "pending",
  interview: "pending",
  for_offer: "warning",
  hired: "active",
  rejected: "error",
  withdrawn: "inactive",
};

const APP_STATUSES: ApplicationStatus[] = [
  "submitted",
  "screening",
  "interview",
  "for_offer",
  "hired",
  "rejected",
  "withdrawn",
];

const SCREENING_LABELS: Record<"pass" | "fail" | "hold", string> = {
  pass: "Passed",
  fail: "Failed",
  hold: "On Hold",
};
const SCREENING_TONES: Record<"pass" | "fail" | "hold", StatusTone> = {
  pass: "active",
  fail: "error",
  hold: "pending",
};

const INTERVIEW_MODE_LABELS: Record<"in_person" | "online" | "phone", string> =
  {
    in_person: "In Person",
    online: "Online",
    phone: "Phone",
  };
const INTERVIEW_OUTCOME_LABELS: Record<
  "pending" | "pass" | "fail" | "no_show",
  string
> = {
  pending: "Pending",
  pass: "Passed",
  fail: "Failed",
  no_show: "No Show",
};
const INTERVIEW_OUTCOME_TONES: Record<
  "pending" | "pass" | "fail" | "no_show",
  StatusTone
> = {
  pending: "info",
  pass: "active",
  fail: "error",
  no_show: "warning",
};

const SOURCE_LABELS: Record<string, string> = {
  public_careers: "Public Application",
  manual: "HR-Created",
  referral: "Referral",
  imported: "Imported",
};

// ─── Recruitment Progress Timeline ───────────────────────────────────────────

const TIMELINE_STAGES: Array<{ key: ApplicantStatus; label: string }> = [
  { key: "new", label: "New" },
  { key: "screening", label: "Screening" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "hired", label: "Hired" },
];

function RecruitmentProgressTimeline({ status }: { status: ApplicantStatus }) {
  const isTerminal = status === "rejected" || status === "withdrawn";
  const currentIdx = isTerminal
    ? -1
    : TIMELINE_STAGES.findIndex((s) => s.key === status);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-start pb-1 pt-1">
        {TIMELINE_STAGES.map((stage, idx) => {
          const done = !isTerminal && idx < currentIdx;
          const active = !isTerminal && idx === currentIdx;
          return (
            <Fragment key={stage.key}>
              <div className="flex w-24 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    done && "border-green-600 bg-green-600 text-white",
                    active &&
                      "border-primary bg-primary text-primary-foreground shadow shadow-primary/20",
                    !done &&
                      !active &&
                      "border-muted-foreground/30 bg-muted text-muted-foreground",
                  )}
                >
                  {done ? "✓" : idx + 1}
                </div>
                <p
                  className={cn(
                    "text-center text-xs leading-tight",
                    done && "font-medium text-green-700 dark:text-green-400",
                    active && "font-semibold text-foreground",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </p>
              </div>
              {idx < TIMELINE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "mt-4 h-0.5 w-8 shrink-0",
                    !isTerminal && idx < currentIdx
                      ? "bg-green-500"
                      : "bg-border",
                  )}
                />
              )}
            </Fragment>
          );
        })}
        {isTerminal && (
          <>
            <div className="mt-4 h-0.5 w-8 shrink-0 bg-border" />
            <div className="flex w-24 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold",
                  status === "rejected"
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-muted-foreground/40 bg-muted text-muted-foreground",
                )}
              >
                ✕
              </div>
              <p
                className={cn(
                  "text-center text-xs font-medium leading-tight",
                  status === "rejected"
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {status === "rejected" ? "Not Qualified" : "Withdrawn"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Application Status Update Form ──────────────────────────────────────────

function ApplicationStatusUpdateForm({
  record,
  onSave,
  isPending,
}: {
  record: ApplicationRecord;
  onSave: (status: ApplicationStatus, remarks: string) => void;
  isPending: boolean;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(record.status);
  const [remarks, setRemarks] = useState(record.remarks ?? "");
  return (
    <div className="mt-3 space-y-3 rounded-md border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Update Application Status
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">New Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ApplicationStatus)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {APP_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Remarks (optional)</Label>
          <Textarea
            className="min-h-[72px] text-xs"
            placeholder="Add remarks..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => onSave(status, remarks)}
          disabled={isPending || status === record.status}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

// ─── Create Application Form ──────────────────────────────────────────────────

function CreateApplicationForm({
  applicantId,
  vacancyOptions,
  onSubmit,
  isPending,
  onCancel,
}: {
  applicantId: string;
  vacancyOptions: Array<{ id: string; title: string }>;
  onSubmit: (data: {
    applicantId: string;
    vacancyId: string;
    status: ApplicationStatus;
    appliedAt?: string | null;
    remarks?: string | null;
  }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [vacancyId, setVacancyId] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("submitted");
  const [appliedAt, setAppliedAt] = useState("");
  const [remarks, setRemarks] = useState("");
  return (
    <div className="rounded-md border bg-muted/40 p-4 space-y-3">
      <p className="text-sm font-medium">Link Applicant to Vacancy</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">
            Vacancy <span className="text-destructive">*</span>
          </Label>
          <Select
            value={vacancyId}
            onValueChange={(v) => setVacancyId(v ?? "")}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select a vacancy…" />
            </SelectTrigger>
            <SelectContent>
              {vacancyOptions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Initial Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ApplicationStatus)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {APP_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date Applied</Label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Remarks</Label>
          <Input
            className="h-9 text-sm"
            placeholder="Optional remarks…"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSubmit({
              applicantId,
              vacancyId,
              status,
              appliedAt: appliedAt || null,
              remarks: remarks || null,
            })
          }
          disabled={isPending || !vacancyId}
        >
          Link to Vacancy
        </Button>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type ApplicantDetailManagementProps = {
  detail: ApplicantDetail;
  vacancyOptions: Array<{ id: string; title: string }>;
  canEditApplicant: boolean;
  canManageApplications: boolean;
  onCreateApplication: (input: {
    applicantId: string;
    vacancyId: string;
    status: ApplicationStatus;
    appliedAt?: string | null;
    remarks?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateApplicationStatus: (
    applicationId: string,
    input: { status: ApplicationStatus; remarks?: string | null },
  ) => Promise<{ ok: boolean; error?: string }>;
  onCreateScreeningResult: (
    input: ScreeningResultInput,
  ) => Promise<{ ok: boolean; error?: string }>;
  onCreateInterviewRecord: (
    input: InterviewRecordInput,
  ) => Promise<{ ok: boolean; error?: string }>;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ApplicantDetailManagement({
  detail,
  vacancyOptions,
  canEditApplicant,
  canManageApplications,
  onCreateApplication,
  onUpdateApplicationStatus,
  onCreateScreeningResult,
  onCreateInterviewRecord,
}: ApplicantDetailManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreateApp, setShowCreateApp] = useState(
    detail.applications.length === 0,
  );
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [screeningState, setScreeningState] = useState({
    result: "pass" as "pass" | "fail" | "hold",
    remarks: "",
    screenedAt: new Date().toISOString().slice(0, 10),
  });
  const [interviewState, setInterviewState] = useState({
    linkedApplicationId: "__none__",
    scheduledAt: "",
    interviewMode: "in_person" as "in_person" | "online" | "phone",
    panelRemarks: "",
    outcome: "pending" as "pending" | "pass" | "fail" | "no_show",
    decidedAt: "",
  });

  const primaryApp = detail.applications[0] ?? null;
  const appliedAt = primaryApp?.appliedAt ?? null;
  const sourceLabel = detail.source
    ? (SOURCE_LABELS[detail.source] ?? detail.source)
    : null;

  function handleCreateApp(data: {
    applicantId: string;
    vacancyId: string;
    status: ApplicationStatus;
    appliedAt?: string | null;
    remarks?: string | null;
  }) {
    const parsed = applicationCreateSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Invalid application input.",
      );
      return;
    }
    startTransition(async () => {
      const result = await onCreateApplication(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to link applicant to vacancy.");
        return;
      }
      toast.success("Applicant linked to vacancy.");
      setShowCreateApp(false);
      router.refresh();
    });
  }

  function handleUpdateAppStatus(
    record: ApplicationRecord,
    status: ApplicationStatus,
    remarks: string,
  ) {
    const parsed = applicationStatusSchema.safeParse({
      status,
      remarks: remarks || null,
    });
    if (!parsed.success) return;
    startTransition(async () => {
      const result = await onUpdateApplicationStatus(record.id, parsed.data);
      if (!result.ok) {
        toast.error(
          result.error ??
            "Could not update the application status right now. Please try again.",
        );
        return;
      }
      toast.success("Application status updated successfully.");
      setUpdatingAppId(null);
      router.refresh();
    });
  }

  function handleScreeningSubmit() {
    const parsed = screeningResultSchema.safeParse({
      applicantId: detail.id,
      result: screeningState.result,
      remarks: screeningState.remarks || null,
      screenedAt: screeningState.screenedAt,
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Invalid screening result.",
      );
      return;
    }
    startTransition(async () => {
      const result = await onCreateScreeningResult(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save screening result.");
        return;
      }
      toast.success("Screening result recorded.");
      setScreeningState({
        result: "pass",
        remarks: "",
        screenedAt: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
    });
  }

  function handleInterviewSubmit() {
    const resolvedAppId =
      interviewState.linkedApplicationId === "__none__"
        ? null
        : interviewState.linkedApplicationId;
    const parsed = interviewRecordSchema.safeParse({
      applicantId: detail.id,
      applicationId: resolvedAppId,
      scheduledAt: interviewState.scheduledAt,
      interviewMode: interviewState.interviewMode,
      panelRemarks: interviewState.panelRemarks || null,
      outcome: interviewState.outcome,
      decidedAt: interviewState.decidedAt || null,
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Invalid interview record.",
      );
      return;
    }
    startTransition(async () => {
      const result = await onCreateInterviewRecord(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save interview record.");
        return;
      }
      toast.success("Interview record saved.");
      setInterviewState({
        linkedApplicationId: "__none__",
        scheduledAt: "",
        interviewMode: "in_person",
        panelRemarks: "",
        outcome: "pending",
        decidedAt: "",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* 1 ─ Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={APPLICANT_STATUS_TONE[detail.status]}
                  label={APPLICANT_STATUS_LABEL[detail.status]}
                />
                {sourceLabel && <StatusBadge tone="info" label={sourceLabel} />}
                {detail.convertedEmployeeId && (
                  <StatusBadge tone="active" label="Converted to Employee" />
                )}
              </div>
              <div className="space-y-0.5 text-sm text-muted-foreground">
                <p>{detail.email ?? "No email address"}</p>
                <p>{detail.mobileNo ?? "No mobile number"}</p>
                <p className="text-xs">
                  {detail.campusName}
                  {detail.officeName ? ` · ${detail.officeName}` : ""}
                </p>
              </div>
              {detail.notes && (
                <p className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                  {detail.notes}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {canEditApplicant && (
                <>
                  <StageChangeDialog
                    applicantId={detail.id}
                    currentStatus={detail.status}
                    alreadyConverted={Boolean(detail.convertedEmployeeId)}
                    disabled={isPending}
                  />
                  <ConvertToEmployeeDialog
                    applicant={detail}
                    disabled={isPending}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(`/recruitment/applicants/${detail.id}/edit`)
                    }
                    disabled={isPending}
                  >
                    Edit Applicant
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 2 ─ Recruitment Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recruitment Progress</CardTitle>
          <CardDescription className="text-xs">
            Current stage:{" "}
            <span className="font-medium text-foreground">
              {APPLICANT_STATUS_LABEL[detail.status]}
            </span>
            {appliedAt && (
              <>
                {" · "}Applied:{" "}
                <span className="font-medium text-foreground">
                  {new Date(appliedAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </>
            )}
            {" · "}Last updated:{" "}
            <span className="font-medium text-foreground">
              {new Date(detail.updatedAt).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecruitmentProgressTimeline status={detail.status} />
        </CardContent>
      </Card>

      {/* 3 ─ Applied Position(s) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Applied Position{detail.applications.length > 1 ? "s" : ""}
          </h3>
          {canManageApplications &&
            detail.applications.length > 0 &&
            !showCreateApp && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateApp(true)}
              >
                + Link to Another Vacancy
              </Button>
            )}
        </div>

        {detail.applications.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-medium">No linked vacancy found.</p>
                <p className="text-xs text-muted-foreground">
                  This applicant has not been linked to a specific vacancy yet.
                </p>
                {canManageApplications && !showCreateApp && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateApp(true)}
                  >
                    Link to Vacancy
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          detail.applications.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {record.vacancyTitle}
                      </p>
                      <StatusBadge
                        tone={APP_STATUS_TONE[record.status]}
                        label={APP_STATUS_LABEL[record.status]}
                      />
                    </div>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {record.plantillaItemNo && (
                        <p>
                          Plantilla Item No.:{" "}
                          <span className="font-medium text-foreground">
                            {record.plantillaItemNo}
                          </span>
                        </p>
                      )}
                      {record.employmentType && (
                        <p>
                          Employment Type:{" "}
                          <span className="font-medium text-foreground">
                            {record.employmentType}
                          </span>
                        </p>
                      )}
                      <p>
                        {record.campusName}
                        {record.officeName ? ` · ${record.officeName}` : ""}
                      </p>
                      {record.appliedAt && (
                        <p>
                          Applied:{" "}
                          <span className="font-medium text-foreground">
                            {new Date(record.appliedAt).toLocaleDateString(
                              "en-PH",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </p>
                      )}
                      {record.remarks && (
                        <p className="italic">&quot;{record.remarks}&quot;</p>
                      )}
                    </div>
                  </div>
                  {canManageApplications && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant={
                          updatingAppId === record.id ? "default" : "outline"
                        }
                        onClick={() =>
                          setUpdatingAppId(
                            updatingAppId === record.id ? null : record.id,
                          )
                        }
                        disabled={isPending}
                      >
                        Update Status
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/recruitment/vacancies/${record.vacancyId}`,
                          )
                        }
                      >
                        View Vacancy
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {updatingAppId === record.id && (
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <ApplicationStatusUpdateForm
                    record={record}
                    onSave={(status, remarks) =>
                      handleUpdateAppStatus(record, status, remarks)
                    }
                    isPending={isPending}
                  />
                </CardContent>
              )}
            </Card>
          ))
        )}

        {canManageApplications && showCreateApp && (
          <CreateApplicationForm
            applicantId={detail.id}
            vacancyOptions={vacancyOptions}
            onSubmit={handleCreateApp}
            isPending={isPending}
            onCancel={() => {
              setShowCreateApp(false);
            }}
          />
        )}
      </div>

      {/* 4 ─ Initial Screening */}
      {canManageApplications && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Initial Screening</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Record Screening Result
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Result</Label>
                  <Select
                    value={screeningState.result}
                    onValueChange={(v) =>
                      setScreeningState((p) => ({
                        ...p,
                        result: v as "pass" | "fail" | "hold",
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Passed</SelectItem>
                      <SelectItem value="fail">Failed</SelectItem>
                      <SelectItem value="hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date Screened</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={screeningState.screenedAt}
                    onChange={(e) =>
                      setScreeningState((p) => ({
                        ...p,
                        screenedAt: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Remarks</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Optional…"
                    value={screeningState.remarks}
                    onChange={(e) =>
                      setScreeningState((p) => ({
                        ...p,
                        remarks: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleScreeningSubmit}
                  disabled={isPending}
                >
                  Save Screening Result
                </Button>
              </div>
            </div>
            {detail.screeningResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No screening results recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.screeningResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-start justify-between rounded-md border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.screenedAt).toLocaleDateString(
                          "en-PH",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                      {result.remarks && (
                        <p className="text-sm">{result.remarks}</p>
                      )}
                    </div>
                    <StatusBadge
                      tone={SCREENING_TONES[result.result]}
                      label={SCREENING_LABELS[result.result]}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5 ─ Interview Records */}
      {canManageApplications && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Interview Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Schedule / Record Interview
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Linked Application (optional)
                  </Label>
                  <Select
                    value={interviewState.linkedApplicationId}
                    onValueChange={(v) =>
                      setInterviewState((p) => ({
                        ...p,
                        linkedApplicationId: v ?? "__none__",
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {detail.applications.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.vacancyTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Schedule <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    className="h-8 text-xs"
                    value={interviewState.scheduledAt}
                    onChange={(e) =>
                      setInterviewState((p) => ({
                        ...p,
                        scheduledAt: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mode</Label>
                  <Select
                    value={interviewState.interviewMode}
                    onValueChange={(v) =>
                      setInterviewState((p) => ({
                        ...p,
                        interviewMode: v as "in_person" | "online" | "phone",
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Outcome</Label>
                  <Select
                    value={interviewState.outcome}
                    onValueChange={(v) =>
                      setInterviewState((p) => ({
                        ...p,
                        outcome: v as "pending" | "pass" | "fail" | "no_show",
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="pass">Passed</SelectItem>
                      <SelectItem value="fail">Failed</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Decision Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={interviewState.decidedAt}
                    onChange={(e) =>
                      setInterviewState((p) => ({
                        ...p,
                        decidedAt: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Panel Remarks</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Optional…"
                    value={interviewState.panelRemarks}
                    onChange={(e) =>
                      setInterviewState((p) => ({
                        ...p,
                        panelRemarks: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleInterviewSubmit}
                  disabled={isPending}
                >
                  Save Interview Record
                </Button>
              </div>
            </div>
            {detail.interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No interview records yet.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-start justify-between rounded-md border p-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          tone={INTERVIEW_OUTCOME_TONES[interview.outcome]}
                          label={INTERVIEW_OUTCOME_LABELS[interview.outcome]}
                        />
                        <span className="text-xs text-muted-foreground">
                          {INTERVIEW_MODE_LABELS[interview.interviewMode]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(interview.scheduledAt).toLocaleDateString(
                          "en-PH",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                      {interview.panelRemarks && (
                        <p className="text-sm">{interview.panelRemarks}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6 ─ Application Status History */}
      {detail.statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Application Status History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detail.statusHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="flex-1 space-y-0.5">
                    <p className="text-xs font-medium">
                      {entry.fromStatus
                        ? APP_STATUS_LABEL[entry.fromStatus]
                        : "—"}
                      {" → "}
                      <span className="text-foreground">
                        {APP_STATUS_LABEL[entry.toStatus]}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.changedAt).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {entry.remarks && (
                      <p className="text-xs italic">{entry.remarks}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
