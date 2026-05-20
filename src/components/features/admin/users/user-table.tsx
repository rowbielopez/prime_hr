"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import {
  AdminDataTable,
  AdminStatusChip,
} from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import {
  ClearFiltersButton,
  FilterSelect,
  StatusFilterControls,
  type FilterOption,
} from "@/components/foundation/data/filter-controls";
import type {
  CampusOption,
  EmployeeSearchResult,
  OfficeOption,
  RoleOption,
  UserListItem,
} from "@/features/admin/users/types";
import { actorCanMutateUserRow } from "@/features/admin/users/user-management-guards";
import { userManagementSchema } from "@/features/admin/users/schemas/user-management.schema";
import {
  toggleUserAccessAction,
  updateUserManagementAction,
  relinkEmployeeAction,
  searchEmployeesAction,
  manualProvisionUserAction,
} from "@/features/admin/users/actions";

type UserTableProps = {
  users: UserListItem[];
  roles: RoleOption[];
  campuses: CampusOption[];
  offices: OfficeOption[];
  actorIsSuperAdmin: boolean;
};

const columns = createAdminColumns<UserListItem>([
  {
    key: "name",
    header: "Name",
    cell: (row) => <span className="font-medium">{row.fullName}</span>,
  },
  {
    key: "email",
    header: "Email",
    cell: (row) => row.email,
  },
  {
    key: "role",
    header: "Role",
    cell: (row) => row.roleName ?? "Unassigned",
  },
  {
    key: "campus",
    header: "Campus",
    cell: (row) => row.campusName ?? "-",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={row.isActive ? "active" : row.status === "suspended" ? "warning" : "inactive"}
        label={row.isActive ? "Active" : row.status === "suspended" ? "Suspended" : "Inactive"}
      />
    ),
  },
]);

type UserFormState = {
  userId: string;
  roleId: string;
  campusId: string | null;
  officeId: string | null;
  isActive: boolean;
};

export function UserTable({ users, roles, campuses, offices, actorIsSuperAdmin }: UserTableProps) {
  const [isPending, startTransition] = useTransition();
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState | null>(null);
  const [relinkingUserId, setRelinkingUserId] = useState<string | null>(null);
  const [relinkQuery, setRelinkQuery] = useState("");
  const [relinkResults, setRelinkResults] = useState<EmployeeSearchResult[]>([]);
  const [relinkSelectedId, setRelinkSelectedId] = useState<string | null | undefined>(undefined);
  const [showProvisionDialog, setShowProvisionDialog] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const tableState = useAdminTableState<UserListItem>({
    rows: users,
    initialPageSize: 8,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.fullName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.roleName ?? "").toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const role = filters.roleId ?? "all";
      if (role !== "all" && row.roleId !== role) return false;
      const campus = filters.campusId ?? "all";
      if (campus !== "all" && row.campusId !== campus) return false;
      const status = filters.status ?? "all";
      if (status === "active" && !row.isActive) return false;
      if (status === "inactive" && row.isActive) return false;
      return true;
    },
  });

  const visibleRowActions = createRowActions<UserListItem>(
    tableState.rows,
    (row) => row.id,
    (row) => {
      const canMutate = actorCanMutateUserRow(actorIsSuperAdmin, row.roleCode);
      return [
        { key: "view", label: "View Details" },
        ...(canMutate
          ? [
            { key: "edit", label: "Assign Role/Campus/Office" },
            { key: "relink-employee", label: "Change Employee Link" },
            {
              key: "toggle-access",
              label: row.isActive ? "Deactivate Access" : "Activate Access",
              destructive: row.isActive,
            },
          ]
          : []),
      ];
    }
  );

  const roleOptions: FilterOption[] = useMemo(
    () => [{ label: "All Roles", value: "all" }, ...roles.map((role) => ({ label: role.name, value: role.id }))],
    [roles]
  );
  const campusOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Campuses", value: "all" },
      ...campuses.map((campus) => ({ label: `${campus.code} - ${campus.name}`, value: campus.id })),
    ],
    [campuses]
  );

  const viewingUser = users.find((user) => user.id === viewingUserId) ?? null;
  const editingUser = users.find((user) => user.id === editingUserId) ?? null;
  const relinkingUser = users.find((user) => user.id === relinkingUserId) ?? null;
  const selectedRole = roles.find((role) => role.id === (formState?.roleId ?? "")) ?? null;
  const requiresCampus = selectedRole?.scopeType === "scoped";
  const officeOptions = offices.filter((office) => {
    if (!formState?.campusId) return false;
    return office.campusId === formState.campusId;
  });

  function openEdit(userId: string) {
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    setEditingUserId(user.id);
    setFormState({
      userId: user.id,
      roleId: user.roleId ?? roles[0]?.id ?? "",
      campusId: user.campusId,
      officeId: user.officeId,
      isActive: user.isActive,
    });
  }

  function openRelink(userId: string) {
    setRelinkingUserId(userId);
    setRelinkQuery("");
    setRelinkResults([]);
    setRelinkSelectedId(undefined);
  }

  async function handleRelinkSearch() {
    if (!relinkQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchEmployeesAction(relinkQuery);
      setRelinkResults(results);
    } finally {
      setIsSearching(false);
    }
  }

  function submitRelink() {
    if (!relinkingUserId || relinkSelectedId === undefined) return;
    startTransition(async () => {
      const result = await relinkEmployeeAction(relinkingUserId, relinkSelectedId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(relinkSelectedId ? "Employee linked successfully" : "Employee link removed");
      setRelinkingUserId(null);
    });
  }

  function handleProvision() {
    startTransition(async () => {
      const result = await manualProvisionUserAction(provisionEmail);
      if (!result.ok) {
        toast.error(result.error, { duration: 8000 });
        return;
      }
      toast.success("Account provisioned. Find it in the table below and assign a role to activate it.");
      setShowProvisionDialog(false);
      setProvisionEmail("");
    });
  }

  function handleRowAction(input: { rowKey: string; actionKey: string }) {
    const user = users.find((item) => item.id === input.rowKey);
    if (!user) return;

    if (input.actionKey === "view") {
      setViewingUserId(user.id);
      return;
    }
    if (input.actionKey === "edit") {
      openEdit(user.id);
      return;
    }
    if (input.actionKey === "relink-employee") {
      openRelink(user.id);
      return;
    }
    if (input.actionKey === "toggle-access") {
      startTransition(async () => {
        const result = await toggleUserAccessAction(user.id, !user.isActive);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(user.isActive ? "User access deactivated" : "User access activated");
      });
    }
  }

  function submitUserAssignment() {
    if (!formState) return;
    const payload: UserFormState = {
      ...formState,
      campusId: requiresCampus ? formState.campusId : null,
      officeId: requiresCampus ? formState.officeId : null,
    };
    const parsed = userManagementSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid assignment");
      return;
    }
    startTransition(async () => {
      const result = await updateUserManagementAction(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User assignment updated");
      setEditingUserId(null);
      setFormState(null);
    });
  }

  return (
    <DataTableWrapper
      title="Users"
      description="Manage user access, role scope, and organizational assignments."
      actions={
        actorIsSuperAdmin ? (
          <Button size="sm" variant="outline" onClick={() => { setProvisionEmail(""); setShowProvisionDialog(true); }}>
            Provision Account
          </Button>
        ) : undefined
      }
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search users by name or email..."
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        filters={
          <>
            <FilterSelect
              value={tableState.filters.roleId ?? "all"}
              onChange={(value) => tableState.setFilter("roleId", value)}
              options={roleOptions}
            />
            <FilterSelect
              value={tableState.filters.campusId ?? "all"}
              onChange={(value) => tableState.setFilter("campusId", value)}
              options={campusOptions}
            />
            <StatusFilterControls
              value={(tableState.filters.status as "all" | "active" | "inactive" | undefined) ?? "all"}
              onChange={(value) => tableState.setFilter("status", value)}
            />
            <ClearFiltersButton onClear={tableState.clearFilters} />
          </>
        }
        rowActionsByRowKey={visibleRowActions}
        onRowAction={handleRowAction}
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
        canPrevPage={tableState.hasPrevPage}
        canNextPage={tableState.hasNextPage}
      />

      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View assigned access and scope details.</DialogDescription>
          </DialogHeader>
          {viewingUser ? (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {viewingUser.fullName}</p>
              <p><span className="font-medium">Email:</span> {viewingUser.email}</p>
              <p><span className="font-medium">Role:</span> {viewingUser.roleName ?? "Unassigned"}</p>
              <p><span className="font-medium">Campus:</span> {viewingUser.campusName ?? "-"}</p>
              <p><span className="font-medium">Office:</span> {viewingUser.officeName ?? "-"}</p>
              <p><span className="font-medium">Status:</span> {viewingUser.isActive ? "Active" : "Inactive"}</p>
              <p><span className="font-medium">Last login:</span> {viewingUser.lastLoginAt ?? "Never"}</p>
              <p>
                <span className="font-medium">Linked employee:</span>{" "}
                {viewingUser.employeeNo
                  ? `${viewingUser.employeeNo} — ${viewingUser.employeeName ?? ""}`
                  : <span className="text-muted-foreground">Not linked</span>}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingUserId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User Access</DialogTitle>
            <DialogDescription>Assign role, campus, office, and activation status.</DialogDescription>
          </DialogHeader>
          {editingUser && formState ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editingUser.fullName} ({editingUser.email})</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  className="h-9 w-full rounded-md border px-3 text-sm"
                  value={formState.roleId}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev
                        ? {
                          ...prev,
                          roleId: event.target.value,
                          campusId: null,
                          officeId: null,
                        }
                        : prev
                    )
                  }
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              {requiresCampus ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Campus</label>
                  <select
                    className="h-9 w-full rounded-md border px-3 text-sm"
                    value={formState.campusId ?? ""}
                    onChange={(event) =>
                      setFormState((prev) =>
                        prev
                          ? {
                            ...prev,
                            campusId: event.target.value || null,
                            officeId: null,
                          }
                          : prev
                      )
                    }
                  >
                    <option value="">Select campus</option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.code} - {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {requiresCampus ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Office</label>
                  <select
                    className="h-9 w-full rounded-md border px-3 text-sm"
                    value={formState.officeId ?? ""}
                    onChange={(event) =>
                      setFormState((prev) =>
                        prev
                          ? {
                            ...prev,
                            officeId: event.target.value || null,
                          }
                          : prev
                      )
                    }
                  >
                    <option value="">No office assignment</option>
                    {officeOptions.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.code} - {office.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev
                        ? {
                          ...prev,
                          isActive: event.target.checked,
                        }
                        : prev
                    )
                  }
                />
                Active access
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUserId(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitUserAssignment} disabled={isPending}>Save Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!relinkingUser} onOpenChange={(open) => { if (!open) setRelinkingUserId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Employee Link</DialogTitle>
            <DialogDescription>Link this user account to an employee record, or remove the existing link.</DialogDescription>
          </DialogHeader>
          {relinkingUser ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {relinkingUser.fullName} ({relinkingUser.email})
              </p>
              <p className="text-sm">
                <span className="font-medium">Current link: </span>
                {relinkingUser.employeeNo
                  ? `${relinkingUser.employeeNo} — ${relinkingUser.employeeName ?? ""}`
                  : <span className="text-muted-foreground">Not linked</span>}
              </p>
              <div className="flex gap-2">
                <input
                  className="h-9 flex-1 rounded-md border px-3 text-sm"
                  placeholder="Search by name, email, or employee no."
                  value={relinkQuery}
                  onChange={(e) => setRelinkQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRelinkSearch(); }}
                />
                <Button
                  variant="outline"
                  onClick={handleRelinkSearch}
                  disabled={isSearching || !relinkQuery.trim()}
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              {relinkResults.length > 0 ? (
                <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                  {relinkResults.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${relinkSelectedId === emp.id ? "bg-muted font-medium" : ""
                        }`}
                      onClick={() => setRelinkSelectedId(emp.id)}
                    >
                      <span className="font-medium">{emp.employeeNo}</span> — {emp.fullName}
                      {emp.email ? <span className="text-muted-foreground"> · {emp.email}</span> : null}
                      {emp.campusName ? <span className="text-muted-foreground"> · {emp.campusName}</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {relinkingUser.employeeId ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive border-destructive/40"
                  onClick={() => setRelinkSelectedId(null)}
                  disabled={relinkSelectedId === null}
                >
                  {relinkSelectedId === null ? "Will remove link on save" : "Remove employee link"}
                </Button>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelinkingUserId(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitRelink} disabled={isPending || relinkSelectedId === undefined}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProvisionDialog} onOpenChange={(open) => { if (!open) setShowProvisionDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Provision Account</DialogTitle>
            <DialogDescription>
              Manually create a system account for someone whose automatic provisioning failed or who needs to be set up before their first sign-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100 space-y-1">
              <p className="font-medium">Requirement</p>
              <p>The person must have attempted to sign in with Google at least once — even if they saw an error. That registers their Google account. If they have never done so, ask them to click &quot;Continue with CSU Google Account&quot; on the login page, then come back here.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Google sign-in email</label>
              <input
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                type="email"
                placeholder="employee@csu.edu.ph"
                value={provisionEmail}
                onChange={(e) => setProvisionEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isPending) handleProvision(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={() => setShowProvisionDialog(false)}>Cancel</Button>
            <Button disabled={isPending || !provisionEmail.trim()} onClick={handleProvision}>
              {isPending ? "Provisioning…" : "Provision Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataTableWrapper>
  );
}

