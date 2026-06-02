import { EmptyState } from "@/components/foundation/feedback/empty-state";
import { ContentSection } from "@/components/foundation/page/content-section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogListItem } from "@/features/audit/logs/repository/audit-logs.repository";

const SEVERITY_LABELS: Record<AuditLogListItem["severity"], string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

function formatDateTime(input: string): string {
  try {
    return new Date(input).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return input;
  }
}

function formatEventType(value: string): string {
  return value.replaceAll(".", " / ").replaceAll("_", " ");
}

function formatAction(value: string): string {
  return value.replaceAll("_", " ");
}

export function AuditLogList({ logs }: { logs: AuditLogListItem[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        title="No audit activity found"
        description="No matching audit events are visible for your current access scope."
      />
    );
  }

  return (
    <ContentSection
      header={
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Audit Activity
          </h2>
          <p className="text-xs text-muted-foreground">
            Showing the latest 100 events visible to your access scope.
          </p>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Campus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground">
                {formatDateTime(log.occurredAt)}
              </TableCell>
              <TableCell>{SEVERITY_LABELS[log.severity]}</TableCell>
              <TableCell className="capitalize">
                {formatEventType(log.eventType)}
              </TableCell>
              <TableCell className="capitalize">
                {formatAction(log.action)}
              </TableCell>
              <TableCell>
                <span className="font-medium">
                  {log.entityLabel ?? log.entityType}
                </span>
                {log.entityId ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {log.entityId}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{log.campusName ?? "System"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentSection>
  );
}
