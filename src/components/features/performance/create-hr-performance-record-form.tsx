"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormGrid, FormSelect } from "@/components/foundation";
import { createHrPerformanceRecordAction } from "@/features/performance/actions-stage2";
import type { EmployeeListItem } from "@/features/employees/types";
import type { PerformanceCycleListItem } from "@/features/performance/types";

export function CreateHrPerformanceRecordForm({
  employees,
  activeCycles,
}: {
  employees: EmployeeListItem[];
  activeCycles: PerformanceCycleListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [cycleId, setCycleId] = useState("");

  function onCreate() {
    if (!employeeId || !cycleId) {
      toast.error("Select an employee and an active cycle.");
      return;
    }
    startTransition(async () => {
      const result = await createHrPerformanceRecordAction(employeeId, cycleId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to create record.");
        return;
      }
      toast.success("Performance record created.");
      router.push(`/performance/records/${result.recordId}`);
    });
  }

  if (activeCycles.length === 0) {
    return <p className="text-sm text-muted-foreground">No active cycles. Activate a cycle before creating records.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Assign an employee to an active performance cycle. Campus comes from the employee profile.</p>
      <FormGrid columns={2}>
        <FormSelect
          label="Employee"
          required
          value={employeeId || undefined}
          placeholder="Select employee"
          options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeNo})` }))}
          onValueChange={setEmployeeId}
          disabled={isPending}
        />
        <FormSelect
          label="Active Cycle"
          required
          value={cycleId || undefined}
          placeholder="Select cycle"
          options={activeCycles.map((c) => ({ value: c.id, label: c.name }))}
          onValueChange={setCycleId}
          disabled={isPending}
        />
      </FormGrid>
      <div className="flex justify-end">
        <Button type="button" onClick={onCreate} disabled={isPending}>
          Create record
        </Button>
      </div>
    </div>
  );
}
