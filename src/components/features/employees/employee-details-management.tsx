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
import { updateEmployeeAction } from "@/features/employees/actions";

type EmployeeDetailsManagementProps = {
  employee: EmployeeDetail;
  campuses: EmployeeCampusOption[];
  offices: EmployeeOfficeOption[];
  linkedAppUser: LinkedAppUserSummary | null;
  documents: EmployeeDocumentListItem[];
};

export function EmployeeDetailsManagement({
  employee,
  campuses,
  offices,
  linkedAppUser,
  documents,
}: EmployeeDetailsManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<EmployeeFormInput>(() => employeeDetailToFormInput(employee));

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
            You changed the work email. Sign-in provisioning matches accounts to employees by email; update HR records elsewhere if needed.
          </p>
        ) : null}

        <div className="mt-6">
          <EmployeeFormFields formState={formState} setFormState={setFormState} campuses={campuses} offices={offices} />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
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
          <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
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
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No linked app user (employee_id) for this record.</p>
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
