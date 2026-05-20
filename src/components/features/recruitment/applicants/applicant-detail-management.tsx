"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/foundation";
import { ConvertToEmployeeDialog } from "@/components/features/recruitment/applicants/convert-to-employee-dialog";
import { StageChangeDialog } from "@/components/features/recruitment/applicants/stage-change-dialog";
import type { ApplicantDetail, ApplicationRecord, ApplicationStatus } from "@/features/recruitment/applicants/types";
import { applicationCreateSchema, applicationStatusSchema } from "@/features/recruitment/applicants/schemas/application-form.schema";
import {
  interviewRecordSchema,
  screeningResultSchema,
  type InterviewRecordInput,
  type ScreeningResultInput,
} from "@/features/recruitment/applicants/schemas/screening-and-interview.schema";

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
  onUpdateApplicationStatus: (applicationId: string, input: { status: ApplicationStatus; remarks?: string | null }) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  onCreateScreeningResult: (input: ScreeningResultInput) => Promise<{ ok: boolean; error?: string }>;
  onCreateInterviewRecord: (input: InterviewRecordInput) => Promise<{ ok: boolean; error?: string }>;
};

const applicationStatuses: ApplicationStatus[] = ["submitted", "screening", "interview", "for_offer", "hired", "rejected", "withdrawn"];

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
  const [renderedAtEpoch] = useState(() => Date.now());
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ApplicationStatus | "all">("all");
  const applicationStatusCounts = detail.applications.reduce<Record<ApplicationStatus, number>>(
    (acc, record) => {
      acc[record.status] += 1;
      return acc;
    },
    {
      submitted: 0,
      screening: 0,
      interview: 0,
      for_offer: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    }
  );
  const latestScreening = detail.screeningResults[0] ?? null;
  const filteredApplications =
    selectedStatusFilter === "all"
      ? detail.applications
      : detail.applications.filter((record) => record.status === selectedStatusFilter);
  const nextInterview = detail.interviews
    .filter((interview) => new Date(interview.scheduledAt).getTime() >= renderedAtEpoch)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;
  const [createState, setCreateState] = useState({
    vacancyId: "",
    status: "submitted" as ApplicationStatus,
    appliedAt: "",
    remarks: "",
  });
  const [screeningState, setScreeningState] = useState({
    result: "pass" as "pass" | "fail" | "hold",
    remarks: "",
    screenedAt: "",
  });
  const [interviewState, setInterviewState] = useState({
    applicationId: "",
    scheduledAt: "",
    interviewMode: "in_person" as "in_person" | "online" | "phone",
    panelRemarks: "",
    outcome: "pending" as "pending" | "pass" | "fail" | "no_show",
    decidedAt: "",
  });

  function submitApplication() {
    const parsed = applicationCreateSchema.safeParse({
      applicantId: detail.id,
      vacancyId: createState.vacancyId,
      status: createState.status,
      appliedAt: createState.appliedAt || null,
      remarks: createState.remarks || null,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid application input.");
    startTransition(async () => {
      const result = await onCreateApplication(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to add application.");
        return;
      }
      toast.success("Application added.");
      setCreateState({ vacancyId: "", status: "submitted", appliedAt: "", remarks: "" });
      router.refresh();
    });
  }

  function setApplicationStatus(record: ApplicationRecord, status: ApplicationStatus) {
    const parsed = applicationStatusSchema.safeParse({ status, remarks: record.remarks });
    if (!parsed.success) return;
    startTransition(async () => {
      const result = await onUpdateApplicationStatus(record.id, parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to update application.");
        return;
      }
      toast.success(`Application status updated to ${status}.`);
      router.refresh();
    });
  }

  function submitScreening() {
    const parsed = screeningResultSchema.safeParse({
      applicantId: detail.id,
      result: screeningState.result,
      remarks: screeningState.remarks || null,
      screenedAt: screeningState.screenedAt,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid screening result.");
    startTransition(async () => {
      const result = await onCreateScreeningResult(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save screening.");
        return;
      }
      toast.success("Screening result recorded.");
      setScreeningState({ result: "pass", remarks: "", screenedAt: "" });
      router.refresh();
    });
  }

  function submitInterview() {
    const parsed = interviewRecordSchema.safeParse({
      applicantId: detail.id,
      applicationId: interviewState.applicationId || null,
      scheduledAt: interviewState.scheduledAt,
      interviewMode: interviewState.interviewMode,
      panelRemarks: interviewState.panelRemarks || null,
      outcome: interviewState.outcome,
      decidedAt: interviewState.decidedAt || null,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid interview record.");
    startTransition(async () => {
      const result = await onCreateInterviewRecord(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save interview.");
        return;
      }
      toast.success("Interview record saved.");
      setInterviewState({
        applicationId: "",
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
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{detail.fullName}</h2>
            <p className="text-sm text-muted-foreground">
              {detail.email ?? "No email"} · {detail.mobileNo ?? "No mobile"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={detail.status === "hired" ? "active" : detail.status === "screening" || detail.status === "shortlisted" ? "pending" : detail.status === "rejected" || detail.status === "withdrawn" ? "inactive" : "info"}
              label={detail.status}
            />
            {detail.convertedEmployeeId ? (
              <StatusBadge tone="active" label="Converted" />
            ) : null}
            {canEditApplicant ? (
              <>
                <StageChangeDialog
                  applicantId={detail.id}
                  currentStatus={detail.status}
                  alreadyConverted={Boolean(detail.convertedEmployeeId)}
                  disabled={isPending}
                />
                <ConvertToEmployeeDialog applicant={detail} disabled={isPending} />
                <Button size="sm" variant="outline" onClick={() => router.push(`/recruitment/applicants/${detail.id}/edit`)}>
                  Edit Applicant
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-sm">
          <span className="font-medium">Scope:</span> {detail.campusName}{detail.officeName ? ` / ${detail.officeName}` : ""}
        </p>
        {detail.notes ? <p className="mt-2 text-sm"><span className="font-medium">Notes:</span> {detail.notes}</p> : null}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Pipeline Summary</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Applications by Status</p>
              <Button
                size="sm"
                variant={selectedStatusFilter === "all" ? "default" : "outline"}
                onClick={() => setSelectedStatusFilter("all")}
              >
                All ({detail.applications.length})
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {applicationStatuses.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={selectedStatusFilter === status ? "default" : "outline"}
                  onClick={() => setSelectedStatusFilter(status)}
                  className="justify-between"
                >
                  <span>{status}</span>
                  <span>{applicationStatusCounts[status]}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Latest Screening</p>
            {latestScreening ? (
              <div className="mt-2 space-y-1 text-xs">
                <p className="font-medium">{latestScreening.result}</p>
                <p>{latestScreening.screenedAt}</p>
                <p className="text-muted-foreground">{latestScreening.remarks ?? "No remarks"}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No screening result yet.</p>
            )}
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Next Interview</p>
            {nextInterview ? (
              <div className="mt-2 space-y-1 text-xs">
                <p className="font-medium">{nextInterview.interviewMode}</p>
                <p>{nextInterview.scheduledAt.replace("T", " ")}</p>
                <p className="text-muted-foreground">Outcome: {nextInterview.outcome}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No upcoming interview scheduled.</p>
            )}
          </div>
        </div>
      </section>

      {canManageApplications ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Create Application Record</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <select className="h-9 rounded-md border px-3 text-sm" value={createState.vacancyId} onChange={(e) => setCreateState((p) => ({ ...p, vacancyId: e.target.value }))}>
              <option value="">Select vacancy</option>
              {vacancyOptions.map((vacancy) => <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>)}
            </select>
            <select className="h-9 rounded-md border px-3 text-sm" value={createState.status} onChange={(e) => setCreateState((p) => ({ ...p, status: e.target.value as ApplicationStatus }))}>
              {applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input className="h-9 rounded-md border px-3 text-sm" placeholder="Applied Date (YYYY-MM-DD)" value={createState.appliedAt} onChange={(e) => setCreateState((p) => ({ ...p, appliedAt: e.target.value }))} />
            <input className="h-9 rounded-md border px-3 text-sm" placeholder="Remarks" value={createState.remarks} onChange={(e) => setCreateState((p) => ({ ...p, remarks: e.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submitApplication} disabled={isPending}>Add Application</Button>
          </div>
        </section>
      ) : null}

      {canManageApplications ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Initial Screening Results</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select className="h-9 rounded-md border px-3 text-sm" value={screeningState.result} onChange={(e) => setScreeningState((p) => ({ ...p, result: e.target.value as "pass" | "fail" | "hold" }))}>
              <option value="pass">pass</option>
              <option value="fail">fail</option>
              <option value="hold">hold</option>
            </select>
            <input className="h-9 rounded-md border px-3 text-sm" placeholder="Screened Date (YYYY-MM-DD)" value={screeningState.screenedAt} onChange={(e) => setScreeningState((p) => ({ ...p, screenedAt: e.target.value }))} />
            <input className="h-9 rounded-md border px-3 text-sm" placeholder="Remarks" value={screeningState.remarks} onChange={(e) => setScreeningState((p) => ({ ...p, remarks: e.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submitScreening} disabled={isPending}>Save Screening</Button>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {detail.screeningResults.length === 0 ? (
              <p className="text-muted-foreground">No screening results recorded.</p>
            ) : (
              detail.screeningResults.map((result) => (
                <div key={result.id} className="rounded border p-2">
                  <p className="font-medium">{result.result}</p>
                  <p className="text-muted-foreground">{result.screenedAt}</p>
                  {result.remarks ? <p>{result.remarks}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {canManageApplications ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Interview Records</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select className="h-9 rounded-md border px-3 text-sm" value={interviewState.applicationId} onChange={(e) => setInterviewState((p) => ({ ...p, applicationId: e.target.value }))}>
              <option value="">No linked application</option>
              {detail.applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.vacancyTitle}
                </option>
              ))}
            </select>
            <input className="h-9 rounded-md border px-3 text-sm" placeholder="Schedule (YYYY-MM-DDTHH:MM)" value={interviewState.scheduledAt} onChange={(e) => setInterviewState((p) => ({ ...p, scheduledAt: e.target.value }))} />
            <select className="h-9 rounded-md border px-3 text-sm" value={interviewState.interviewMode} onChange={(e) => setInterviewState((p) => ({ ...p, interviewMode: e.target.value as "in_person" | "online" | "phone" }))}>
              <option value="in_person">in_person</option>
              <option value="online">online</option>
              <option value="phone">phone</option>
            </select>
            <select className="h-9 rounded-md border px-3 text-sm" value={interviewState.outcome} onChange={(e) => setInterviewState((p) => ({ ...p, outcome: e.target.value as "pending" | "pass" | "fail" | "no_show" }))}>
              <option value="pending">pending</option>
              <option value="pass">pass</option>
              <option value="fail">fail</option>
              <option value="no_show">no_show</option>
            </select>
            <input className="h-9 rounded-md border px-3 text-sm" placeholder="Decision Date (YYYY-MM-DD)" value={interviewState.decidedAt} onChange={(e) => setInterviewState((p) => ({ ...p, decidedAt: e.target.value }))} />
            <input className="h-9 rounded-md border px-3 text-sm" placeholder="Panel Remarks" value={interviewState.panelRemarks} onChange={(e) => setInterviewState((p) => ({ ...p, panelRemarks: e.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submitInterview} disabled={isPending}>Save Interview</Button>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {detail.interviews.length === 0 ? (
              <p className="text-muted-foreground">No interview records yet.</p>
            ) : (
              detail.interviews.map((interview) => (
                <div key={interview.id} className="rounded border p-2">
                  <p className="font-medium">{interview.outcome} · {interview.interviewMode}</p>
                  <p className="text-muted-foreground">{interview.scheduledAt}</p>
                  {interview.panelRemarks ? <p>{interview.panelRemarks}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Application Records</h3>
          <p className="text-xs text-muted-foreground">
            {selectedStatusFilter === "all"
              ? `Showing all (${filteredApplications.length})`
              : `Filtered: ${selectedStatusFilter} (${filteredApplications.length})`}
          </p>
        </div>
        <div className="mt-3 space-y-3">
          {filteredApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No application records yet.</p>
          ) : (
            filteredApplications.map((record) => (
              <div key={record.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{record.vacancyTitle}</p>
                  <StatusBadge
                    tone={record.status === "hired" ? "active" : record.status === "screening" || record.status === "interview" || record.status === "for_offer" ? "pending" : record.status === "rejected" || record.status === "withdrawn" ? "inactive" : "info"}
                    label={record.status}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {record.campusName}{record.officeName ? ` / ${record.officeName}` : ""} · Applied: {record.appliedAt ?? "-"}
                </p>
                {canManageApplications ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {applicationStatuses.map((status) => (
                      <Button key={status} size="sm" variant={status === record.status ? "default" : "outline"} onClick={() => setApplicationStatus(record, status)} disabled={isPending}>
                        {status}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Application Status History</h3>
        <div className="mt-3 space-y-2 text-sm">
          {detail.statusHistory.length === 0 ? (
            <p className="text-muted-foreground">No status history yet.</p>
          ) : (
            detail.statusHistory.map((entry) => (
              <div key={entry.id} className="rounded border p-2">
                <p className="font-medium">{entry.fromStatus ?? "none"} {"->"} {entry.toStatus}</p>
                <p className="text-muted-foreground">{entry.changedAt.slice(0, 19).replace("T", " ")}</p>
                {entry.remarks ? <p>{entry.remarks}</p> : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
