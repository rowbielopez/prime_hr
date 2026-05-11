"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { participantAddSchema, participantUpdateSchema } from "@/features/learning/participants/schemas/participant-form.schema";
import {
  addSessionParticipantAction,
  removeSessionParticipantAction,
  updateSessionParticipantAction,
} from "@/features/learning/participants/actions";
import { ConfirmDialog } from "@/components/foundation";
import { ATTENDANCE_LABELS, COMPLETION_LABELS } from "@/features/learning/status-labels";
import type { SessionParticipantRow } from "@/features/learning/types";

type EmployeeOption = { id: string; label: string };

function ParticipantRemarksCell({
  row,
  canManage,
  isPending,
  onSave,
}: {
  row: SessionParticipantRow;
  canManage: boolean;
  isPending: boolean;
  onSave: (notes: string) => void;
}) {
  const [value, setValue] = useState(row.notes ?? "");

  if (!canManage) {
    return (
      <span className="text-sm text-muted-foreground">{row.notes?.trim() ? row.notes : "—"}</span>
    );
  }

  return (
    <div className="flex max-w-[240px] flex-col gap-1">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        disabled={isPending}
        placeholder="Attendance or completion notes"
        className="min-h-[52px] resize-y text-xs"
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 self-start text-xs"
        disabled={isPending}
        onClick={() => onSave(value)}
      >
        Save remarks
      </Button>
    </div>
  );
}

type Props = {
  sessionId: string;
  participants: SessionParticipantRow[];
  employeeOptions: EmployeeOption[];
  canManage: boolean;
};

export function SessionParticipantsPanel({ sessionId, participants, employeeOptions, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [source, setSource] = useState<"assigned" | "nominated" | "self_registered">("assigned");

  function add() {
    const parsed = participantAddSchema.safeParse({ employeeId, source });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid selection.");
      return;
    }
    startTransition(async () => {
      const result = await addSessionParticipantAction(sessionId, parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Could not add participant.");
        return;
      }
      toast.success("Participant added.");
      setEmployeeId("");
      router.refresh();
    });
  }

  function patchParticipant(
    row: SessionParticipantRow,
    patch: Partial<{ attendance: string; completion: string; notes: string | null }>
  ) {
    const next = {
      attendance: patch.attendance ?? row.attendance,
      completion: patch.completion ?? row.completion,
      notes: patch.notes !== undefined ? patch.notes : row.notes,
    };
    const parsed = participantUpdateSchema.safeParse(next);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid values.");
      return;
    }
    startTransition(async () => {
      const result = await updateSessionParticipantAction(sessionId, row.id, parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Update failed.");
        return;
      }
      toast.success("Participant updated.");
      router.refresh();
    });
  }

  function saveRemarks(row: SessionParticipantRow, notes: string) {
    patchParticipant(row, { notes: notes.length > 0 ? notes : null });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeSessionParticipantAction(sessionId, id);
      if (!result.ok) {
        toast.error(result.error ?? "Remove failed.");
        return;
      }
      toast.success("Participant removed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">Participants</h3>
        <p className="text-xs text-muted-foreground">Assign, nominate, or record attendance and completion.</p>
      </div>
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Employee</label>
            <select
              className="h-9 min-w-[220px] rounded-md border px-3 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Select employee</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Source</label>
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
            >
              <option value="assigned">assigned</option>
              <option value="nominated">nominated</option>
              <option value="self_registered">self_registered</option>
            </select>
          </div>
          <Button type="button" size="sm" disabled={isPending} onClick={add}>
            Add
          </Button>
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Attendance</TableHead>
            <TableHead>Completion</TableHead>
            <TableHead className="min-w-[200px]">Remarks</TableHead>
            <TableHead className="w-[90px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                No participants yet.
              </TableCell>
            </TableRow>
          ) : (
            participants.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                </TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>
                  <select
                    className="h-8 max-w-[140px] rounded-md border px-2 text-xs"
                    value={row.attendance}
                    disabled={isPending || !canManage}
                    onChange={(e) =>
                      patchParticipant(row, {
                        attendance: e.target.value as SessionParticipantRow["attendance"],
                      })
                    }
                  >
                    {(Object.keys(ATTENDANCE_LABELS) as SessionParticipantRow["attendance"][]).map((k) => (
                      <option key={k} value={k}>
                        {ATTENDANCE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <select
                      className="h-8 max-w-[160px] rounded-md border px-2 text-xs"
                      value={row.completion}
                      disabled={isPending || !canManage}
                      onChange={(e) =>
                        patchParticipant(row, {
                          completion: e.target.value as SessionParticipantRow["completion"],
                        })
                      }
                    >
                      {(Object.keys(COMPLETION_LABELS) as SessionParticipantRow["completion"][]).map((k) => (
                        <option key={k} value={k}>
                          {COMPLETION_LABELS[k]}
                        </option>
                      ))}
                    </select>
                    {row.completedAt ? (
                      <div className="text-[10px] text-muted-foreground">
                        Recorded {new Date(row.completedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <ParticipantRemarksCell
                    row={row}
                    canManage={canManage}
                    isPending={isPending}
                    onSave={(notes) => saveRemarks(row, notes)}
                  />
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <ConfirmDialog
                      trigger={
                        <Button type="button" variant="ghost" size="sm" disabled={isPending}>
                          Remove
                        </Button>
                      }
                      title="Remove participant?"
                      description="This will remove them from the session roster."
                      confirmLabel="Remove"
                      variant="destructive"
                      onConfirm={() => remove(row.id)}
                      isPending={isPending}
                    />
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
