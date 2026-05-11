"use client";

import { useMemo, useState, useTransition } from "react";
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
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import {
  ClearFiltersButton,
  StatusFilterControls,
} from "@/components/foundation/data/filter-controls";
import type { CampusListItem } from "@/features/admin/organization/types";
import { campusFormSchema } from "@/features/admin/organization/schemas/campus-form.schema";
import {
  createCampusAction,
  toggleCampusStatusAction,
  updateCampusAction,
} from "@/features/admin/organization/actions";

type CampusManagementProps = {
  campuses: CampusListItem[];
  /** When false, table is view-only (e.g. central HR without org write). */
  canMutate?: boolean;
};

type CampusFormState = {
  code: string;
  name: string;
  shortName: string;
  sortOrder: number;
  isActive: boolean;
};

const columns = createAdminColumns<CampusListItem>([
  { key: "order", header: "Order", cell: (row) => row.sortOrder },
  { key: "code", header: "Code", cell: (row) => <span className="font-medium">{row.code}</span> },
  { key: "name", header: "Campus Name", cell: (row) => row.name },
  {
    key: "shortName",
    header: "Short name",
    cell: (row) => row.shortName ?? "—",
  },
  { key: "status", header: "Status", cell: (row) => <AdminStatusChip tone={row.isActive ? "active" : "inactive"} label={row.isActive ? "Active" : "Inactive"} /> },
]);

const initialFormState: CampusFormState = { code: "", name: "", shortName: "", sortOrder: 0, isActive: true };

export function CampusManagement({ campuses, canMutate = true }: CampusManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CampusFormState>(initialFormState);

  const tableState = useAdminTableState<CampusListItem>({
    rows: campuses,
    initialPageSize: 8,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        (row.shortName?.toLowerCase().includes(q) ?? false)
      );
    },
    filterPredicate: (row, filters) => {
      const status = filters.status ?? "all";
      if (status === "active") return row.isActive;
      if (status === "inactive") return !row.isActive;
      return true;
    },
  });

  const rowActions = canMutate
    ? createRowActions<CampusListItem>(
        tableState.rows,
        (row) => row.id,
        (row) => [
          { key: "edit", label: "Edit campus" },
          { key: "toggle-status", label: row.isActive ? "Deactivate" : "Activate", destructive: row.isActive },
        ]
      )
    : undefined;

  const isEditing = !!editingCampusId;
  const dialogTitle = isEditing ? "Edit Campus" : "Create Campus";

  const editingCampus = useMemo(
    () => campuses.find((campus) => campus.id === editingCampusId) ?? null,
    [campuses, editingCampusId]
  );

  function openCreateDialog() {
    if (!canMutate) return;
    setEditingCampusId(null);
    setFormState(initialFormState);
    setDialogOpen(true);
  }

  function openEditDialog(campusId: string) {
    const campus = campuses.find((item) => item.id === campusId);
    if (!campus) return;
    setEditingCampusId(campus.id);
    setFormState({
      code: campus.code,
      name: campus.name,
      shortName: campus.shortName ?? "",
      sortOrder: campus.sortOrder,
      isActive: campus.isActive,
    });
    setDialogOpen(true);
  }

  function submitForm() {
    const parsed = campusFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid campus details");
      return;
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateCampusAction(editingCampusId!, parsed.data)
        : await createCampusAction(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEditing ? "Campus updated" : "Campus created");
      setDialogOpen(false);
      setFormState(initialFormState);
      setEditingCampusId(null);
    });
  }

  function handleRowAction(input: { rowKey: string; actionKey: string }) {
    if (!canMutate) return;
    if (input.actionKey === "edit") {
      openEditDialog(input.rowKey);
      return;
    }
    if (input.actionKey === "toggle-status") {
      const campus = campuses.find((item) => item.id === input.rowKey);
      if (!campus) return;
      startTransition(async () => {
        const result = await toggleCampusStatusAction(campus.id, !campus.isActive);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(campus.isActive ? "Campus deactivated" : "Campus activated");
      });
    }
  }

  return (
    <>
      <DataTableWrapper
        title="Campus Management"
        description="Campus code is the stable identifier; display name must be unique. Use sort order for lists and dropdowns."
        actions={
          canMutate ? (
            <Button size="sm" onClick={openCreateDialog}>
              New Campus
            </Button>
          ) : null
        }
      >
        <AdminDataTable
          rows={tableState.rows}
          columns={columns}
          getRowKey={(row) => row.id}
          searchPlaceholder="Search campuses..."
          searchValue={tableState.search}
          onSearchChange={tableState.setSearch}
          filters={
            <>
              <StatusFilterControls
                value={(tableState.filters.status as "all" | "active" | "inactive" | undefined) ?? "all"}
                onChange={(value) => tableState.setFilter("status", value)}
              />
              <ClearFiltersButton onClear={tableState.clearFilters} />
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
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Use a short, stable code (for example for exports). The full name is the official label shown across the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Campus Code</label>
              <Input value={formState.code} onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))} placeholder="e.g. AND" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Campus Name</label>
              <Input value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. Andrews" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Short name (optional)</label>
              <Input
                value={formState.shortName}
                onChange={(event) => setFormState((prev) => ({ ...prev, shortName: event.target.value }))}
                placeholder="Abbreviation or alternate label"
              />
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
              Active campus
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitForm} disabled={isPending}>{isEditing ? "Save Changes" : "Create Campus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingCampus ? <p className="sr-only">{editingCampus.name}</p> : null}
    </>
  );
}

