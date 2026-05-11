import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CompletionKpiDailyRow, DeliveryLoadMonthlyRow } from "@/features/learning/reports/types";

type Props = {
  completionDaily: CompletionKpiDailyRow[];
  deliveryMonthly: DeliveryLoadMonthlyRow[];
};

export function AnalyticsSummaryTables({ completionDaily, deliveryMonthly }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Completion KPI (daily)</h3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Participants</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Attended</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completionDaily.slice(0, 30).map((row, idx) => (
                <TableRow key={`${row.metricDate}-${row.campusId}-${row.programId}-${idx}`}>
                  <TableCell>{new Date(row.metricDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{row.participantCount}</TableCell>
                  <TableCell className="text-right">{row.completedCount}</TableCell>
                  <TableCell className="text-right">{row.attendedCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Delivery load (monthly)</h3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Planned capacity</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryMonthly.slice(0, 24).map((row, idx) => (
                <TableRow key={`${row.metricMonth}-${row.campusId}-${row.programId}-${idx}`}>
                  <TableCell>{new Date(row.metricMonth).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{row.sessionCount}</TableCell>
                  <TableCell className="text-right">{row.plannedCapacity}</TableCell>
                  <TableCell className="text-right">{row.enrolledCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
