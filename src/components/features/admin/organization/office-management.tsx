"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import {
  ClearFiltersButton,
  FilterSelect,
  type FilterOption,
  StatusFilterControls,
} from "@/components/foundation/data/filter-controls";
import type { CampusOption, OfficeListItem } from "@/features/admin/organization/types";
import {
  officeFormSchema,
  officeTypeValues,
  type OfficeTypeValue,
} from "@/features/admin/organization/schemas/office-form.schema";

const OFFICE_TYPE_LABELS: Record<OfficeTypeValue, string> = {
  academic: "Academic",
  administrative: "Administrative",
  student_services: "Student services",
  other: "Other",
};
import {
  createOfficeAction,
  toggleOfficeStatusAction,
  updateOfficeAction,
} from "@/features/admin/organization/actions";

type OfficeManagementProps = {
  offices: OfficeListItem[];
  campuses: CampusOption[];
  canMutate?: boolean;
};

type OfficeFormState = {
  campusId: string;
  code: string;
  name: string;
  officeType: OfficeTypeValue;
  sortOrder: number;
  isActive: boolean;
};

const columns = createAdminColumns<OfficeListItem>([
  { key: "code", header: "Code", cell: (row) => <span className="font-medium">{row.code}</span> },
  { key: "name", header: "Office Name", cell: (row) => row.name },
  { key: "campus", header: "Campus", cell: (row) => row.campusName },
  {
    key: "officeType",
    header: "Type",
    cell: (row) => OFFICE_TYPE_LABELS[row.officeType] ?? row.officeType,
  },
  { key: "sortOrder", header: "Order", cell: (row) => row.sortOrder },
  { key: "status", header: "Status", cell: (row) => <AdminStatusChip tone={row.isActive ? "active" : "inactive"} label={row.isActive ? "Active" : "Inactive"} /> },
]);

export function OfficeManagement({ offices, campuses, canMutate = true }: OfficeManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [formState, setFormState] = useState<OfficeFormState>({
    campusId: campuses[0]?.id ?? "",
    code: "",
    name: "",
    officeType: "other",
    sortOrder: 0,
    isActive: true,
  });

  const tableState = useAdminTableState<OfficeListItem>({
    rows: offices,
    initialPageSize: 8,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.campusName.toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const campus = filters.campusId ?? "all";
      if (campus !== "all" && row.campusId !== campus) return false;
      const status = filters.status ?? "all";
      if (status === "active" && !row.isActive) return false;
      if (status === "inactive" && row.isActive) return false;
      return true;
    },
  });

  const campusFilterOptions: FilterOption[] = [
    { label: "All Campuses", value: "all" },
    ...campuses.map((campus) => ({
      label: `${campus.code} - ${campus.name}`,
      value: campus.id,
    })),
  ];

  const rowActions = canMutate
    ? createRowActions<OfficeListItem>(
      tableState.rows,
      (row) => row.id,
      (row) => [
        { key: "edit", label: "Edit office" },
        { key: "toggle-status", label: row.isActive ? "Deactivate" : "Activate", destructive: row.isActive },
      ]
    )
    : undefined;

  function openCreateDialog() {
    if (!canMutate) return;
    setEditingOfficeId(null);
    setFormState({
      campusId: campuses[0]?.id ?? "",
      code: "",
      name: "",
      officeType: "other",
      sortOrder: 0,
      isActive: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(officeId: string) {
    const office = offices.find((item) => item.id === officeId);
    if (!office) return;
    setEditingOfficeId(office.id);
    setFormState({
      campusId: office.campusId,
      code: office.code,
      name: office.name,
      officeType: office.officeType,
      sortOrder: office.sortOrder,
      isActive: office.isActive,
    });
    setDialogOpen(true);
  }

  function submitForm() {
    const parsed = officeFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid office details");
      return;
    }

    startTransition(async () => {
      const result = editingOfficeId
        ? await updateOfficeAction(editingOfficeId, parsed.data)
        : await createOfficeAction(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingOfficeId ? "Office updated" : "Office created");
      setDialogOpen(false);
    });
  }

  function handleRowAction(input: { rowKey: string; actionKey: string }) {
    if (!canMutate) return;
    if (input.actionKey === "edit") {
      openEditDialog(input.rowKey);
      return;
    }
    if (input.actionKey === "toggle-status") {
      const office = offices.find((item) => item.id === input.rowKey);
      if (!office) return;
      startTransition(async () => {
        const result = await toggleOfficeStatusAction(office.id, !office.isActive);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(office.isActive ? "Office deactivated" : "Office activated");
      });
    }
  }

  return (
    <>
      <DataTableWrapper
        title="Office Management"
        description="Office code is unique within a campus. Changing campus is blocked while the office is referenced elsewhere."
        actions={
          canMutate ? (
            <Button size="sm" onClick={openCreateDialog}>
              New Office
            </Button>
          ) : null
        }
      >
        <AdminDataTable
          rows={tableState.rows}
          columns={columns}
          getRowKey={(row) => row.id}
          searchPlaceholder="Search offices..."
          searchValue={tableState.search}
          onSearchChange={tableState.setSearch}
          filters={
            <>
              <FilterSelect
                value={tableState.filters.campusId ?? "all"}
                onChange={(value) => tableState.setFilter("campusId", value)}
                options={campusFilterOptions}
              />
              <StatusFilterControls
                value={(tableState.filters.status as "all" | "active" | "inactive" | undefined) ?? "all"}
                onChange={(value) => tableState.setFilter("status", value)}
              />
              <ClearFiltersButton onClear={tableState.clearFilters} label="Clear" />
            </>
          }
          rowActionsByRowKey={rowActions}
          onRowAction={canMutate ? handleRowAction : undefined}
          paginationSummary={tableState.summary}
          onPrevPage={tableState.prevPage}
          onNextPage={tableState.nextPage}
          canPrevPage={tableState.hasPrevPage}
          canNextPage={tableState.hasNextPage}
        />
      </DataTableWrapper>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOfficeId ? "Edit Office" : "Create Office"}</DialogTitle>
            <DialogDescription>
              Pick the campus this office belongs to. To move an office to another campus, clear references first (users, employees, recruitment, compliance).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Campus</label>
              <Select
                value={formState.campusId}
                onValueChange={(v) => v !== null && setFormState((prev) => ({ ...prev, campusId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {campuses.find((c) => c.id === formState.campusId)
                      ? `${campuses.find((c) => c.id === formState.campusId)!.code} - ${campuses.find((c) => c.id === formState.campusId)!.name}`
                      : "Select campus"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.code} — {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Office Code</label>
              <Input value={formState.code} onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Office Name</label>
              <Input value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Office Type</label>
              <Select
                value={formState.officeType}
                onValueChange={(v) => v !== null && setFormState((prev) => ({ ...prev, officeType: v as OfficeTypeValue }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{OFFICE_TYPE_LABELS[formState.officeType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {officeTypeValues.map((key) => (
                    <SelectItem key={key} value={key}>
                      {OFFICE_TYPE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort order</label>
              <Input
                type="number"
                min={0}
                value={formState.sortOrder}
                onChange={(event) => setFormState((prev) => ({ ...prev, sortOrder: Number.parseInt(event.target.value, 10) || 0 }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Active office
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitForm} disabled={isPending}>{editingOfficeId ? "Save Changes" : "Create Office"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

