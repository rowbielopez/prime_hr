"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  LinkedAppUserSummary,
} from "@/features/employees/types";
import { employeeFormSchema, type EmployeeFormInput } from "@/features/employees/schemas/employee-form.schema";
import { employeeDetailToFormInput } from "@/features/employees/employee-mappers";
import { updateEmployeeAction, linkAppUserToEmployeeAction, relinkAppUserByEmailAction, unlinkAppUserFromEmployeeAction } from "@/features/employees/actions";

type EmployeeDetailsManagementProps = {
  employee: EmployeeDetail;
  campuses: EmployeeCampusOption[];
  offices: EmployeeOfficeOption[];
  linkedAppUser: LinkedAppUserSummary | null;
  documents: EmployeeDocumentListItem[];
  isSuperAdmin: boolean;
};

function LinkAccountButton({ employeeId, hasEmail }: { employeeId: string; hasEmail: boolean }) {
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
      {isPending ? "Linking…" : "Link Account by Email"}
    </Button>
  );
}

export function EmployeeDetailsManagement({
  employee,
  campuses,
  offices,
  linkedAppUser,
  documents,
  isSuperAdmin,
}: EmployeeDetailsManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<EmployeeFormInput>(() => employeeDetailToFormInput(employee));
  const [showRelinkForm, setShowRelinkForm] = useState(false);
  const [relinkEmail, setRelinkEmail] = useState("");

  useEffect(() => {
    setFormState(employeeDetailToFormInput(employee));
  }, [employee]);

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

  return (
    <div className="space-y-8">
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-1 border-b pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">
              {employee.campusName}
              {employee.officeName ? ` · ${employee.officeName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border px-2 py-0.5">No. {employee.employeeNo}</span>
            <span className="rounded-md border px-2 py-0.5 capitalize">{employee.employmentStatus.replace("_", " ")}</span>
          </div>
        </div>

        {emailChanged ? (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
            The employee email was updated. If this email is linked to a sign-in account, the linked account may need to be updated separately.
          </p>
        ) : null}

        <div className="mt-6">
          <EmployeeFormFields formState={formState} setFormState={setFormState} campuses={campuses} offices={offices} defaultExpanded={true} emailReadOnly={!isSuperAdmin} />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
          <Link
            href={`/employees/${employee.id}/pds`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View PDS
          </Link>
          <Link
            href={`/service-records/${employee.id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Service Record
          </Link>
          <Link
            href={`/employees/${employee.id}/training`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Training history
          </Link>
          <Button onClick={saveChanges} disabled={isPending}>
            Save changes
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Linked system account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When this employee signs in with Google, the account can be matched by email and linked here for access and scope.
        </p>
        {linkedAppUser ? (
          <div className="mt-4 space-y-4">
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{linkedAppUser.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account status</dt>
                <dd className="font-medium capitalize">
                  {linkedAppUser.status}
                  {linkedAppUser.isActive ? "" : " (inactive flag)"}
                </dd>
              </div>
            </dl>
            {showRelinkForm ? (
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                <p className="text-sm font-medium">Change linked account</p>
                <p className="text-xs text-muted-foreground">Enter the Google sign-in email of the account you want to link to this employee. The person must have signed in at least once.</p>
                <div className="flex gap-2">
                  <input
                    className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                    type="email"
                    placeholder="new.account@csu.edu.ph"
                    value={relinkEmail}
                    onChange={(e) => setRelinkEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowRelinkForm(false); setRelinkEmail(""); } }}
                  />
                  <Button
                    size="sm"
                    disabled={isPending || !relinkEmail.trim()}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await relinkAppUserByEmailAction(employee.id, relinkEmail);
                        if (!result.ok) { toast.error(result.error); return; }
                        toast.success("Account relinked successfully.");
                        setShowRelinkForm(false);
                        setRelinkEmail("");
                        router.refresh();
                      });
                    }}
                  >
                    {isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={isPending} onClick={() => { setShowRelinkForm(false); setRelinkEmail(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowRelinkForm(true); setRelinkEmail(""); }}>
                  Change Account
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive border-destructive/40"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await unlinkAppUserFromEmployeeAction(employee.id);
                      if (!result.ok) { toast.error(result.error); return; }
                      toast.success("Account unlinked.");
                      router.refresh();
                    });
                  }}
                >
                  {isPending ? "Unlinking…" : "Unlink Account"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              No linked system account. The account is matched automatically by email at sign-in.
              {employee.email ? " Click below to link the account with email " : " Add an employee email first, then use this button to link."}
              {employee.email ? <span className="font-medium"> {employee.email}</span> : null}
              {employee.email ? "." : null}
            </p>
            <LinkAccountButton employeeId={employee.id} hasEmail={!!employee.email} />
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Records stored in <code className="text-xs">employee_documents</code>. Uploads via Storage can be wired in a follow-up; listed rows respect RLS.
        </p>
        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No documents on file.</p>
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
                  <TableCell>{row.documentType}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.fileName}</TableCell>
                  <TableCell className="capitalize">{row.status}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString()}
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
