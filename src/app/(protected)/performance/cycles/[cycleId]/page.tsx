import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { getPerformanceCycleById } from "@/features/performance/repository/cycles.repository";
import { getPerformanceCycleRecordStats, listPerformanceRecordsByCycleId } from "@/features/performance/repository/records.repository";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = { params: Promise<{ cycleId: string }> };

export default async function PerformanceCycleDetailPage(props: Props) {
  const { cycleId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/cycles",
    permission: "performance.read",
  });
  const [cycle, stats, sampleRecords] = await Promise.all([
    getPerformanceCycleById(cycleId, context),
    getPerformanceCycleRecordStats(cycleId, context),
    listPerformanceRecordsByCycleId(cycleId, context, 25),
  ]);
  if (!cycle) notFound();
  const canWrite = hasPermission(context, "performance.write");
  return (
    <div className="space-y-6">
      <PageHeader
        title={cycle.name}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: cycle.name }]}
      />
      <div className="flex flex-wrap gap-2">
        {canWrite ? (
          <Link href={`/performance/cycles/${cycleId}/edit`} className={cn(buttonVariants({ size: "sm" }))}>
            Edit cycle
          </Link>
        ) : null}
        <Link href="/performance/cycles" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to cycles
        </Link>
      </div>
      {cycle.description ? <p className="text-sm text-muted-foreground">{cycle.description}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule & scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">State: </span>
              {cycle.status === "active" ? "Active" : "Inactive"} ({cycle.status})
            </div>
            <div>
              <span className="text-muted-foreground">Scope: </span>
              {cycle.campusName ? `${cycle.campusName}${cycle.officeName ? ` · ${cycle.officeName}` : ""}` : "Organization-wide"}
            </div>
            <div>
              <span className="text-muted-foreground">Period: </span>
              {new Date(cycle.startDate).toLocaleDateString()} – {new Date(cycle.endDate).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">Submission: </span>
              {new Date(cycle.submissionDeadline).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">Review: </span>
              {new Date(cycle.reviewDeadline).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Records in this cycle</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="text-2xl font-semibold tabular-nums">{stats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total performance records in your scope for this cycle.</p>
            {stats && Object.keys(stats.byStatus).length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs">
                {Object.entries(stats.byStatus).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="tabular-nums">{v}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Sample records (latest 25)</h3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    No records for this cycle yet.
                  </TableCell>
                </TableRow>
              ) : (
                sampleRecords.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/performance/records/${row.id}`} className="text-primary hover:underline">
                        {row.employeeName}
                      </Link>
                      <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(row.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {canWrite ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Create and manage individual records from the{" "}
            <Link href="/performance/records" className="text-primary underline-offset-4 hover:underline">
              performance records
            </Link>{" "}
            workspace.
          </p>
        ) : null}
      </div>
    </div>
  );
}
