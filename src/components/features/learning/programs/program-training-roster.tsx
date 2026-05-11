import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ATTENDANCE_LABELS, COMPLETION_LABELS } from "@/features/learning/status-labels";
import type { ProgramParticipantOverviewRow, TrainingSessionListItem } from "@/features/learning/types";

type Props = {
  sessions: TrainingSessionListItem[];
  participantCountBySessionId: Map<string, number>;
  overview: ProgramParticipantOverviewRow[];
};

export function ProgramTrainingRoster({ sessions, participantCountBySessionId, overview }: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Scheduled sessions</h3>
          <p className="text-xs text-muted-foreground">
            Open a session to mark attendance, completion, and remarks for each participant.
          </p>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions scheduled for this training yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Participants</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(s.startsAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{s.campusName}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell className="text-right">{participantCountBySessionId.get(s.id) ?? 0}</TableCell>
                  <TableCell>
                    <Link
                      href={`/learning/sessions/${s.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "whitespace-nowrap")}
                    >
                      Roster
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Participants (all sessions)</h3>
          <p className="text-xs text-muted-foreground">
            Consolidated view of roster, attendance, completion, and remarks for this training.
          </p>
        </div>
        {overview.length === 0 ? (
          <p className="text-sm text-muted-foreground">No participants enrolled in any session yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.map((row) => (
                <TableRow key={row.participantId}>
                  <TableCell>
                    <div className="font-medium">{row.sessionTitle}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.sessionStartsAt).toLocaleString()}
                    </div>
                    <Link href={`/learning/sessions/${row.sessionId}`} className="text-xs text-primary hover:underline">
                      Open session
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{row.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                  </TableCell>
                  <TableCell>{ATTENDANCE_LABELS[row.attendance]}</TableCell>
                  <TableCell>{COMPLETION_LABELS[row.completion]}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                    {row.remarks?.trim() ? row.remarks : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
