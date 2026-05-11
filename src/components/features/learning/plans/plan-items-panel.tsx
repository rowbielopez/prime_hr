"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { ConfirmDialog } from "@/components/foundation";
import { planItemFormSchema } from "@/features/learning/plans/schemas/plan-form.schema";
import { addPlanItemAction, removePlanItemAction } from "@/features/learning/plans/actions";
import type { AnnualPlanItem } from "@/features/learning/types";

type Props = {
  planId: string;
  items: AnnualPlanItem[];
  programOptions: Array<{ id: string; title: string }>;
};

export function PlanItemsPanel({ planId, items, programOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [programId, setProgramId] = useState("");
  const [quarter, setQuarter] = useState("1");
  const [notes, setNotes] = useState("");

  function addLine() {
    const parsed = planItemFormSchema.safeParse({
      programId,
      quarter: Number(quarter),
      notes: notes || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid line.");
      return;
    }
    startTransition(async () => {
      const result = await addPlanItemAction(planId, parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to add line.");
        return;
      }
      toast.success("Plan line added.");
      setNotes("");
      router.refresh();
    });
  }

  function removeLine(itemId: string) {
    startTransition(async () => {
      const result = await removePlanItemAction(planId, itemId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to remove line.");
        return;
      }
      toast.success("Removed from plan.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">Quarterly line items</h3>
        <p className="text-xs text-muted-foreground">Link catalog programs to a quarter for execution tracking.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Program</label>
          <select
            className="h-9 min-w-[200px] rounded-md border px-3 text-sm"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            <option value="">Select program</option>
            {programOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Quarter</label>
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
          >
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Notes</label>
          <input
            className="h-9 rounded-md border px-3 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={addLine}>
          Add line
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quarter</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">
                No line items yet.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>Q{item.quarter}</TableCell>
                <TableCell className="font-medium">{item.programTitle}</TableCell>
                <TableCell className="text-muted-foreground">{item.notes ?? "—"}</TableCell>
                <TableCell>
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="ghost" size="sm" disabled={isPending}>
                        Remove
                      </Button>
                    }
                    title="Remove plan item?"
                    description="This will permanently remove the item from this training plan."
                    confirmLabel="Remove"
                    variant="destructive"
                    onConfirm={() => removeLine(item.id)}
                    isPending={isPending}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
