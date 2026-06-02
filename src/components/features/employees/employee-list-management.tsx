"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/foundation";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import {
  AdminDataTable,
  AdminStatusChip,
} from "@/components/foundation/data/admin-data-table";
import {
  createAdminColumns,
  createRowActions,
} from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import {
  ClearFiltersButton,
  FilterSelect,
} from "@/components/foundation/data/filter-controls";
import { CreateEmployeeDialog } from "@/components/features/employees/create-employee-dialog";
import type {
  EmployeeCampusOption,
  EmployeeListItem,
  EmployeeOfficeOption,
} from "@/features/employees/types";
import {
  assignEmployeeLoginEmailAction,
  archiveEmployeeAction,
  softDeleteEmployeeAction,
} from "@/features/employees/actions";

type EmployeeListManagementProps = {
  employees: EmployeeListItem[];
  campuses: EmployeeCampusOption[];
  offices: EmployeeOfficeOption[];
  canAssignEmployeeEmail: boolean;
};

type PendingEmployeeAction =
  | { rowKey: string; actionKey: "archive"; label: string }
  | { rowKey: string; actionKey: "soft-delete"; label: string };

const columns = createAdminColumns<EmployeeListItem>([
  {
    key: "employeeNo",
    header: "Employee No",
    cell: (row) => <span className="font-medium">{row.employeeNo}</span>,
  },
  { key: "fullName", header: "Name", cell: (row) => row.fullName },
  { key: "email", header: "Email", cell: (row) => row.email ?? "-" },
  { key: "campus", header: "Campus", cell: (row) => row.campusName },
  { key: "office", header: "Office", cell: (row) => row.officeName ?? "-" },
  {
    key: "status",
    header: "Employment",
    cell: (row) => (
      <AdminStatusChip
        tone={
          row.employmentStatus === "active"
            ? "active"
            : row.employmentStatus === "on_leave"
              ? "pending"
              : "inactive"
        }
        label={row.employmentStatus.replace("_", " ")}
      />
    ),
  },
]);

const employmentStatusOptions = [
  { label: "Active", value: "active" },
  { label: "On Leave", value: "on_leave" },
  { label: "Separated", value: "separated" },
  { label: "Retired", value: "retired" },
] as const;

export function EmployeeListManagement({
  employees,
  campuses,
  offices,
  canAssignEmployeeEmail,
}: EmployeeListManagementProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<PendingEmployeeAction | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [assignEmailValue, setAssignEmailValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const tableState = useAdminTableState<EmployeeListItem>({
    rows: employees,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.employeeNo.toLowerCase().includes(q) ||
        row.fullName.toLowerCase().includes(q) ||
        (row.email ?? "").toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const campus = filters.campusId ?? "all";
      if (campus !== "all" && row.campusId !== campus) return false;
      const status = filters.employmentStatus ?? "all";
      if (status !== "all" && row.employmentStatus !== status) return false;
      return true;
    },
  });

  const rowActions = createRowActions<EmployeeListItem>(
    tableState.rows,
    (row) => row.id,
    () => [
      { key: "view-details", label: "View Details" },
      { key: "view-pds", label: "View PDS" },
      ...(canAssignEmployeeEmail
        ? [{ key: "assign-email", label: "Assign Email" }]
        : []),
      { key: "archive", label: "End employment (mark separated)" },
      { key: "soft-delete", label: "Remove from directory", destructive: true },
    ],
  );

  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;

  const campusFilterOptions = [
    { label: "All Campuses", value: "all" },
    ...campuses.map((campus) => ({
      label: `${campus.code} - ${campus.name}`,
      value: campus.id,
    })),
  ];
  const statusFilterOptions = [
    { label: "All Status", value: "all" },
    ...employmentStatusOptions.map((status) => ({
      label: status.label,
      value: status.value,
    })),
  ];

  function executeConfirmedAction(action: PendingEmployeeAction) {
    startTransition(async () => {
      if (action.actionKey === "archive") {
        const result = await archiveEmployeeAction(action.rowKey);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Employment status set to separated.");
        router.refresh();
        return;
      }

      const result = await softDeleteEmployeeAction(action.rowKey);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Employee removed from active directory.");
      router.refresh();
    });
  }

  function openAssignEmail(employeeId: string) {
    const employee = employees.find((row) => row.id === employeeId);
    if (!employee) return;
    setSelectedEmployeeId(employee.id);
    setAssignEmailValue(employee.email ?? "");
    setEmailDialogOpen(true);
  }

  function resetAssignEmailDialog() {
    setEmailDialogOpen(false);
    setSelectedEmployeeId(null);
    setAssignEmailValue("");
  }

  function submitAssignEmail() {
    if (!selectedEmployee) return;
    startTransition(async () => {
      const result = await assignEmployeeLoginEmailAction({
        employeeId: selectedEmployee.id,
        email: assignEmailValue,
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
      resetAssignEmailDialog();
      router.refresh();
    });
  }

  function handleRowAction(input: { rowKey: string; actionKey: string }) {
    if (input.actionKey === "view-details") {
      router.push(`/employees/${input.rowKey}`);
      return;
    }
    if (input.actionKey === "view-pds") {
      router.push(`/employees/${input.rowKey}/pds`);
      return;
    }
    if (input.actionKey === "assign-email") {
      openAssignEmail(input.rowKey);
      return;
    }
    if (input.actionKey === "archive") {
      setPendingAction({
        rowKey: input.rowKey,
        actionKey: "archive",
        label: "mark this employee as separated (employment ended)",
      });
      setConfirmDialogOpen(true);
      return;
    }
    if (input.actionKey === "soft-delete") {
      setPendingAction({
        rowKey: input.rowKey,
        actionKey: "soft-delete",
        label:
          "remove this employee from the directory (soft delete). This is different from ending employment.",
      });
      setConfirmDialogOpen(true);
    }
  }

  return (
    <>
      <DataTableWrapper
        title="Employee Master Data"
        description="Manage employee records linked to campus and office. Visibility follows your role and campus/office scope (see RLS)."
        actions={
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            New Employee
          </Button>
        }
      >
        <AdminDataTable
          rows={tableState.rows}
          columns={columns}
          getRowKey={(row) => row.id}
          searchPlaceholder="Search employee no, name, or email..."
          searchValue={tableState.search}
          onSearchChange={tableState.setSearch}
          filters={
            <>
              <FilterSelect
                value={tableState.filters.campusId ?? "all"}
                onChange={(value) => tableState.setFilter("campusId", value)}
                options={campusFilterOptions}
              />
              <FilterSelect
                value={tableState.filters.employmentStatus ?? "all"}
                onChange={(value) =>
                  tableState.setFilter("employmentStatus", value)
                }
                options={statusFilterOptions}
              />
              <ClearFiltersButton onClear={tableState.clearFilters} />
            </>
          }
          rowActionsByRowKey={rowActions}
          onRowAction={handleRowAction}
          paginationSummary={tableState.summary}
          onPrevPage={tableState.prevPage}
          onNextPage={tableState.nextPage}
          canPrevPage={tableState.hasPrevPage}
          canNextPage={tableState.hasNextPage}
        />
      </DataTableWrapper>

      <CreateEmployeeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        campuses={campuses}
        offices={offices}
      />

      <Dialog
        open={emailDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetAssignEmailDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Email</DialogTitle>
            <DialogDescription>
              Assign a CSU email to this employee for Google sign-in matching.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  {selectedEmployee.employeeNo} — {selectedEmployee.fullName}
                </p>
                <p className="text-muted-foreground">
                  {selectedEmployee.campusName}
                  {selectedEmployee.officeName
                    ? ` · ${selectedEmployee.officeName}`
                    : ""}
                </p>
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="assign-employee-email"
                >
                  CSU email
                </label>
                <Input
                  id="assign-employee-email"
                  type="email"
                  placeholder="employee@csu.edu.ph"
                  value={assignEmailValue}
                  onChange={(event) => setAssignEmailValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !isPending &&
                      assignEmailValue.trim()
                    ) {
                      submitAssignEmail();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Only `@csu.edu.ph` is accepted. If no sign-in account exists
                  yet, the employee must sign in once with CSU Google.
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={resetAssignEmailDialog}
            >
              Cancel
            </Button>
            <Button
              disabled={
                isPending || !selectedEmployee || !assignEmailValue.trim()
              }
              onClick={submitAssignEmail}
            >
              {isPending ? "Saving..." : "Assign Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) setPendingAction(null);
        }}
        title="Confirm action"
        description={
          pendingAction
            ? `Are you sure you want to ${pendingAction.label}?`
            : "Please confirm this action."
        }
        variant={
          pendingAction?.actionKey === "soft-delete" ? "destructive" : "default"
        }
        isPending={isPending}
        onConfirm={() => {
          if (!pendingAction) return;
          executeConfirmedAction(pendingAction);
          setConfirmDialogOpen(false);
          setPendingAction(null);
        }}
      />
    </>
  );
}
