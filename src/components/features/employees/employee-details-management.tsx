"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  Link2,
  Printer,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeFormFields } from "@/components/features/employees/employee-form-fields";
import type {
  EmployeeCampusOption,
  EmployeeDetail,
  EmployeeDocumentListItem,
  EmployeeOfficeOption,
  EmployeeProfileHubSummary,
  EmployeeProfileIssue,
  LinkedAppUserSummary,
} from "@/features/employees/types";
import {
  employeeFormSchema,
  type EmployeeFormInput,
} from "@/features/employees/schemas/employee-form.schema";
import { employeeDetailToFormInput } from "@/features/employees/employee-mappers";
import {
  assignEmployeeLoginEmailAction,
  updateEmployeeAction,
  linkAppUserToEmployeeAction,
  relinkAppUserByEmailAction,
  unlinkAppUserFromEmployeeAction,
} from "@/features/employees/actions";
import { cn } from "@/lib/utils";

type EmployeeDetailsManagementProps = {
  employee: EmployeeDetail;
  campuses: EmployeeCampusOption[];
  offices: EmployeeOfficeOption[];
  linkedAppUser: LinkedAppUserSummary | null;
  documents: EmployeeDocumentListItem[];
  profileSummary: EmployeeProfileHubSummary;
  isSuperAdmin: boolean;
  canAssignLoginEmail: boolean;
};

function fullName(employee: EmployeeDetail) {
  return [
    employee.firstName,
    employee.middleName,
    employee.lastName,
    employee.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function initials(employee: EmployeeDetail) {
  return (
    [employee.firstName, employee.lastName]
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "HR"
  );
}

function formatDate(input: string | null) {
  if (!input) return "Not recorded";
  try {
    return new Date(input).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return input;
  }
}

function formatLabel(input: string | null | undefined) {
  if (!input) return "Not specified";
  return input
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadgeVariant(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  const normalized = status.toLowerCase();
  if (
    ["active", "verified", "approved", "filled", "hired"].includes(normalized)
  )
    return "default";
  if (
    normalized.includes("reject") ||
    normalized.includes("return") ||
    normalized.includes("separated")
  )
    return "destructive";
  if (
    normalized.includes("draft") ||
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("leave")
  )
    return "secondary";
  return "outline";
}

function issueTone(issue: EmployeeProfileIssue) {
  if (issue.severity === "critical")
    return "border-destructive/40 bg-destructive/10 text-destructive";
  if (issue.severity === "warning")
    return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
  return "border-border bg-muted/40 text-muted-foreground";
}

function qualityLabel(issues: EmployeeProfileIssue[]) {
  if (issues.some((issue) => issue.severity === "critical")) return "Critical";
  if (issues.length > 0) return "Needs Review";
  return "Good";
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value || "Not recorded"}</dd>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/25 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-normal">{value}</p>
      {helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function LinkAccountButton({
  employeeId,
  hasEmail,
}: {
  employeeId: string;
  hasEmail: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLink() {
    startTransition(async () => {
      const result = await linkAppUserToEmployeeAction(employeeId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Account linked successfully.");
      router.refresh();
    });
  }

  return (
    <Button size="sm" disabled={!hasEmail || isPending} onClick={handleLink}>
      <Link2 className="size-3.5" />
      {isPending ? "Linking..." : "Link account"}
    </Button>
  );
}

export function EmployeeDetailsManagement({
  employee,
  campuses,
  offices,
  linkedAppUser,
  documents,
  profileSummary,
  isSuperAdmin,
  canAssignLoginEmail,
}: EmployeeDetailsManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<EmployeeFormInput>(() =>
    employeeDetailToFormInput(employee),
  );
  const [showRelinkForm, setShowRelinkForm] = useState(false);
  const [relinkEmail, setRelinkEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState(employee.email ?? "");
  const employeeName = fullName(employee) || employee.employeeNo;
  const quality = qualityLabel(profileSummary.issues);
  const visibleIssues = profileSummary.issues.slice(0, 5);
  const topMissing = profileSummary.completion.missingItems.slice(0, 5);

  const emailChanged = (formState.email ?? "") !== (employee.email ?? "");

  function saveChanges() {
    const parsed = employeeFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid employee data.");
      return;
    }
    startTransition(async () => {
      const result = await updateEmployeeAction(employee.id, parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Employee updated.");
      router.refresh();
    });
  }

  function assignLoginEmail() {
    if (!loginEmail.trim()) {
      toast.error("CSU email address is required.");
      return;
    }
    startTransition(async () => {
      const result = await assignEmployeeLoginEmailAction({
        employeeId: employee.id,
        email: loginEmail,
      });
      if (!result.ok) {
        toast.error(result.error, { duration: 8000 });
        return;
      }
      if (result.linkedExistingAccount) {
        toast.success(
          result.accountIsActive
            ? "CSU email assigned and an active sign-in account was linked."
            : "CSU email assigned and the existing sign-in account was linked. Assign a role and activate access if needed.",
          { duration: 8000 },
        );
      } else {
        toast.success(
          "CSU email assigned. Ask the employee to sign in once with their CSU Google account.",
          { duration: 8000 },
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted text-lg font-semibold text-muted-foreground">
              {initials(employee)}
            </div>
            <div className="min-w-0 space-y-2">
              <div>
                <h2 className="text-xl font-semibold tracking-normal">
                  {employeeName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Employee No. {employee.employeeNo}
                </p>
              </div>
              <p className="text-sm font-medium">
                {employee.positionTitle ?? "Position not recorded"}
              </p>
              <p className="text-sm text-muted-foreground">
                {employee.campusName}
                {employee.officeName ? ` | ${employee.officeName}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusBadgeVariant(employee.employmentStatus)}>
                  {formatLabel(employee.employmentStatus)}
                </Badge>
                <Badge variant="outline">
                  {formatLabel(employee.employmentType)}
                </Badge>
                <Badge variant={linkedAppUser ? "default" : "secondary"}>
                  {linkedAppUser ? "Account Linked" : "No Account Linked"}
                </Badge>
                <Badge
                  variant={
                    profileSummary.completion.percentage >= 80
                      ? "default"
                      : "secondary"
                  }
                >
                  Profile {profileSummary.completion.percentage}% Complete
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href={`/employees/${employee.id}/pds`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ClipboardCheck className="size-3.5" /> View PDS
            </Link>
            <Link
              href={`/service-records/${employee.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <BriefcaseBusiness className="size-3.5" /> Service Record
            </Link>
            <Link
              href={`/service-records/${employee.id}/print`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Printer className="size-3.5" /> Print Service Record
            </Link>
            <Link
              href={`/employees/${employee.id}/training`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <GraduationCap className="size-3.5" /> Training
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="size-4 text-muted-foreground" />{" "}
              Current Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Campus" value={employee.campusName} />
              <Field label="Office" value={employee.officeName} />
              <Field label="Position" value={employee.positionTitle} />
              <Field
                label="Employment type"
                value={formatLabel(employee.employmentType)}
              />
              <Field
                label="Status"
                value={formatLabel(employee.employmentStatus)}
              />
              <Field
                label="Date hired"
                value={formatDate(employee.dateHired)}
              />
              {employee.dateSeparated ? (
                <Field
                  label="Date separated"
                  value={formatDate(employee.dateSeparated)}
                />
              ) : null}
              {employee.separationReason ? (
                <Field
                  label="Separation reason"
                  value={employee.separationReason}
                />
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-muted-foreground" />{" "}
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div>
              <p className="text-3xl font-semibold tracking-normal">
                {profileSummary.completion.percentage}%
              </p>
              <p className="text-xs text-muted-foreground">
                {profileSummary.completion.completedItems} of{" "}
                {profileSummary.completion.totalItems} checks complete
              </p>
            </div>
            {topMissing.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Missing
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {topMissing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Core profile checks are complete.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-muted-foreground" /> Data
              Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Badge
              variant={
                quality === "Critical"
                  ? "destructive"
                  : quality === "Needs Review"
                    ? "secondary"
                    : "default"
              }
            >
              {quality}
            </Badge>
            {visibleIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No profile quality issues found.
              </p>
            ) : (
              <div className="space-y-2">
                {visibleIssues.map((issue) => (
                  <div
                    key={issue.key}
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs",
                      issueTone(issue),
                    )}
                  >
                    <p className="font-medium">{issue.label}</p>
                    <p className="mt-1 opacity-90">{issue.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4 text-muted-foreground" /> PDS
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <Badge variant={statusBadgeVariant(profileSummary.pds.status)}>
                {formatLabel(profileSummary.pds.status)}
              </Badge>
              <span className="text-sm font-medium">
                {profileSummary.pds.completionScore ?? 0}%
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <Field
                label="Last updated"
                value={formatDate(profileSummary.pds.updatedAt)}
              />
              <Field
                label="Submitted"
                value={formatDate(profileSummary.pds.submittedAt)}
              />
              <Field
                label="Reviewed"
                value={formatDate(
                  profileSummary.pds.reviewedAt ??
                    profileSummary.pds.verifiedAt ??
                    profileSummary.pds.returnedAt,
                )}
              />
            </dl>
            <Link
              href={`/employees/${employee.id}/pds`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <ClipboardCheck className="size-3.5" /> Open PDS
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="size-4 text-muted-foreground" />{" "}
              Service Record
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <SummaryMetric
                label="Entries"
                value={String(profileSummary.serviceRecord.entriesCount)}
              />
              <SummaryMetric
                label="Warnings"
                value={String(profileSummary.serviceRecord.warningsCount)}
                helper={
                  profileSummary.serviceRecord.hasCurrentRecord
                    ? "Current entry exists"
                    : "No current entry"
                }
              />
            </div>
            <dl className="space-y-2 text-sm">
              <Field
                label="Current position"
                value={profileSummary.serviceRecord.currentPosition}
              />
              <Field
                label="Current period"
                value={
                  profileSummary.serviceRecord.currentDateFrom
                    ? `${formatDate(profileSummary.serviceRecord.currentDateFrom)} to ${profileSummary.serviceRecord.currentDateTo ? formatDate(profileSummary.serviceRecord.currentDateTo) : "Present"}`
                    : null
                }
              />
              <Field
                label="Last updated"
                value={formatDate(profileSummary.serviceRecord.lastUpdated)}
              />
            </dl>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/service-records/${employee.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <BriefcaseBusiness className="size-3.5" /> View Record
              </Link>
              <Link
                href={`/service-records/${employee.id}/print`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <Printer className="size-3.5" /> Print
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="size-4 text-muted-foreground" /> Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <SummaryMetric
                label="Uploaded"
                value={String(profileSummary.documents.totalUploaded)}
              />
              <SummaryMetric
                label="Missing"
                value={String(profileSummary.documents.missingCount)}
              />
              <SummaryMetric
                label="Verified"
                value={String(profileSummary.documents.verifiedCount)}
              />
              <SummaryMetric
                label="Pending"
                value={String(profileSummary.documents.pendingCount)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Required checklist
              </p>
              <div className="flex flex-wrap gap-2">
                {profileSummary.documents.requiredDocuments.map((document) => (
                  <Badge
                    key={document.key}
                    variant={
                      document.status === "missing"
                        ? "outline"
                        : document.status === "rejected"
                          ? "destructive"
                          : document.status === "verified"
                            ? "default"
                            : "secondary"
                    }
                  >
                    {document.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-muted-foreground" /> Account
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {canAssignLoginEmail ? (
              <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                <div>
                  <p className="text-sm font-medium">Assign CSU login email</p>
                  <p className="text-xs text-muted-foreground">
                    Use the employee&apos;s @csu.edu.ph email for Google sign-in
                    matching.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                    type="email"
                    placeholder="employee@csu.edu.ph"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !isPending)
                        assignLoginEmail();
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={isPending || !loginEmail.trim()}
                    onClick={assignLoginEmail}
                  >
                    {isPending ? "Saving..." : "Assign Email"}
                  </Button>
                </div>
              </div>
            ) : null}
            {linkedAppUser ? (
              <div className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <Field label="Login email" value={linkedAppUser.email} />
                  <Field
                    label="Account status"
                    value={`${formatLabel(linkedAppUser.status)}${linkedAppUser.isActive ? "" : " (inactive flag)"}`}
                  />
                </dl>
                {showRelinkForm ? (
                  <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                    <p className="text-sm font-medium">Change linked account</p>
                    <p className="text-xs text-muted-foreground">
                      Enter the Google sign-in email for the account that should
                      be linked to this employee.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                        type="email"
                        placeholder="new.account@csu.edu.ph"
                        value={relinkEmail}
                        onChange={(event) => setRelinkEmail(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setShowRelinkForm(false);
                            setRelinkEmail("");
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        disabled={isPending || !relinkEmail.trim()}
                        onClick={() => {
                          startTransition(async () => {
                            const result = await relinkAppUserByEmailAction(
                              employee.id,
                              relinkEmail,
                            );
                            if (!result.ok) {
                              toast.error(result.error);
                              return;
                            }
                            toast.success("Account relinked successfully.");
                            setShowRelinkForm(false);
                            setRelinkEmail("");
                            router.refresh();
                          });
                        }}
                      >
                        {isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => {
                          setShowRelinkForm(false);
                          setRelinkEmail("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowRelinkForm(true);
                        setRelinkEmail("");
                      }}
                    >
                      <Link2 className="size-3.5" /> Change Account
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await unlinkAppUserFromEmployeeAction(
                            employee.id,
                          );
                          if (!result.ok) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("Account unlinked.");
                          router.refresh();
                        });
                      }}
                    >
                      {isPending ? "Unlinking..." : "Unlink Account"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No sign-in account is linked yet. Add or confirm the employee
                  email, then link the system account after the employee has
                  signed in once.
                </p>
                <LinkAccountButton
                  employeeId={employee.id}
                  hasEmail={!!employee.email}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-muted-foreground" /> Connected
              Records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/25 p-3">
              <div>
                <p className="font-medium">Recruitment source</p>
                <p className="text-xs text-muted-foreground">
                  {profileSummary.recruitment
                    ? `Converted from ${profileSummary.recruitment.applicantName}`
                    : "No linked applicant conversion record."}
                </p>
              </div>
              {profileSummary.recruitment ? (
                <Link
                  href={`/recruitment/applicants/${profileSummary.recruitment.applicantId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  View
                </Link>
              ) : null}
            </div>
            <div className="rounded-md border bg-muted/25 p-3">
              <p className="font-medium">Requests and leave</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Correction requests and leave management are not wired to
                Employee Profile yet, so no action is shown here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section
        id="edit-profile"
        className="rounded-lg border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-col gap-1 border-b pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Edit Official Profile</h2>
            <p className="text-sm text-muted-foreground">
              Update HR-managed identity, assignment, employment, contact, and
              201-file reference fields.
            </p>
          </div>
          <Button onClick={saveChanges} disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>

        {emailChanged ? (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
            The employee email was updated. If this email is linked to a sign-in
            account, the linked account may need to be updated separately.
          </p>
        ) : null}

        <div className="mt-6">
          <EmployeeFormFields
            formState={formState}
            setFormState={setFormState}
            campuses={campuses}
            offices={offices}
            defaultExpanded={false}
            emailReadOnly={!isSuperAdmin}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Documents on File</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          HR document metadata attached to this employee record. File upload,
          secure preview, and verification actions need the document workflow
          before they are shown here.
        </p>
        {documents.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
            <FolderOpen className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No documents on file yet</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Required document status is shown above so HR can see what still
              needs to be collected.
            </p>
          </div>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>{formatLabel(row.documentType)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {row.fileName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.status)}>
                      {formatLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
