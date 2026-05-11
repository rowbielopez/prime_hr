"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ClearFiltersButton, FilterSelect, StatusFilterControls } from "@/components/foundation/data/filter-controls";
import type { ComplianceIndicatorAdminItem, PrimeAreaOption } from "@/features/compliance/indicators/types";
import { indicatorFormSchema } from "@/features/compliance/indicators/schemas/indicator-form.schema";
import {
  createComplianceIndicatorAction,
  toggleComplianceIndicatorStatusAction,
  updateComplianceIndicatorAction,
} from "@/features/compliance/indicators/actions";

type IndicatorManagementProps = {
  indicators: ComplianceIndicatorAdminItem[];
  areas: PrimeAreaOption[];
  canMutate?: boolean;
};

type IndicatorFormState = {
  areaId: string;
  code: string;
  title: string;
  description: string;
  isActive: boolean;
};

const columns = createAdminColumns<ComplianceIndicatorAdminItem>([
  { key: "code", header: "Code", cell: (row) => <span className="font-medium">{row.code}</span> },
  { key: "area", header: "PRIME-HR Area", cell: (row) => `${row.areaCode} - ${row.areaName}` },
  { key: "title", header: "Title", cell: (row) => row.title },
  {
    key: "description",
    header: "Description",
    cell: (row) => row.description ?? "—",
    className: "max-w-md truncate",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip tone={row.isActive ? "active" : "inactive"} label={row.isActive ? "Active" : "Inactive"} />
    ),
  },
]);

export function IndicatorManagement({ indicators, areas, canMutate = true }: IndicatorManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<IndicatorFormState>({
    areaId: areas[0]?.id ?? "",
    code: "",
    title: "",
    description: "",
    isActive: true,
  });

  const tableState = useAdminTableState<ComplianceIndicatorAdminItem>({
    rows: indicators,
    initialPageSize: 8,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.code.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.areaCode.toLowerCase().includes(q) ||
        row.areaName.toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const areaId = filters.areaId ?? "all";
      if (areaId !== "all" && row.areaId !== areaId) return false;
      const status = filters.status ?? "all";
      if (status === "active" && !row.isActive) return false;
      if (status === "inactive" && row.isActive) return false;
      return true;
    },
  });

  const rowActions = canMutate
    ? createRowActions<ComplianceIndicatorAdminItem>(
        tableState.rows,
        (row) => row.id,
        (row) => [
          { key: "edit", label: "Edit indicator" },
          { key: "toggle-status", label: row.isActive ? "Deactivate" : "Activate", destructive: row.isActive },
        ],
      )
    : undefined;

  const areaOptions = useMemo(
    () => [{ label: "All Areas", value: "all" }, ...areas.map((a) => ({ label: `${a.code} - ${a.name}`, value: a.id }))],
    [areas],
  );

  const isEditing = !!editingId;

  function openCreateDialog() {
    if (!canMutate) return;
    setEditingId(null);
    setFormState({
      areaId: areas[0]?.id ?? "",
      code: "",
      title: "",
      description: "",
      isActive: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(id: string) {
    const row = indicators.find((item) => item.id === id);
    if (!row) return;
    setEditingId(row.id);
    setFormState({
      areaId: row.areaId,
      code: row.code,
      title: row.title,
      description: row.description ?? "",
      isActive: row.isActive,
    });
    setDialogOpen(true);
  }

  function submitForm() {
    const parsed = indicatorFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid indicator input.");
      return;
    }
    startTransition(async () => {
      const result = isEditing
        ? await updateComplianceIndicatorAction(editingId!, parsed.data)
        : await createComplianceIndicatorAction(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEditing ? "Indicator updated." : "Indicator created.");
      setDialogOpen(false);
      setEditingId(null);
    });
  }

  function handleRowAction(input: { rowKey: string; actionKey: string }) {
    if (!canMutate) return;
    if (input.actionKey === "edit") {
      openEditDialog(input.rowKey);
      return;
    }
    if (input.actionKey === "toggle-status") {
      const row = indicators.find((item) => item.id === input.rowKey);
      if (!row) return;
      startTransition(async () => {
        const result = await toggleComplianceIndicatorStatusAction(row.id, !row.isActive);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(row.isActive ? "Indicator deactivated." : "Indicator activated.");
      });
    }
  }

  return (
    <>
      <DataTableWrapper
        title="Compliance Indicators"
        description="Maintain PRIME-HR indicators used by evidence forms and compliance tracking."
        actions={
          canMutate ? (
            <Button size="sm" onClick={openCreateDialog}>
              New Indicator
            </Button>
          ) : null
        }
      >
        <AdminDataTable
          rows={tableState.rows}
          columns={columns}
          getRowKey={(row) => row.id}
          searchPlaceholder="Search indicators..."
          searchValue={tableState.search}
          onSearchChange={tableState.setSearch}
          filters={
            <>
              <FilterSelect
                value={tableState.filters.areaId ?? "all"}
                onChange={(value) => tableState.setFilter("areaId", value)}
                options={areaOptions}
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
            <DialogTitle>{isEditing ? "Edit Compliance Indicator" : "Create Compliance Indicator"}</DialogTitle>
            <DialogDescription>Use stable indicator codes so evidence reporting remains consistent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">PRIME-HR Area</label>
              <select
                className="h-9 w-full rounded-md border px-3 text-sm"
                value={formState.areaId}
                onChange={(event) => setFormState((prev) => ({ ...prev, areaId: event.target.value }))}
              >
                <option value="" disabled>
                  Select area
                </option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.code} - {area.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Indicator Code</label>
              <Input
                value={formState.code}
                placeholder="e.g. A1.3"
                onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Active indicator
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={isPending}>
              {isEditing ? "Save Changes" : "Create Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
