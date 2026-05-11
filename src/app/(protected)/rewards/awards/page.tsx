import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listRewardsAwards } from "@/features/rewards/repository/awards.repository";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { hasPermission } from "@/lib/rbac/scopes";

export default async function RewardsAwardsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/awards",
    permission: "rewards.catalog.read",
  });
  const rows = await listRewardsAwards(context);
  const canWrite = hasPermission(context, "rewards.catalog.write");
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      {canWrite ? (
        <div className="flex justify-end">
          <Link href="/rewards/awards/new" className="text-sm font-medium text-primary hover:underline">
            Create award
          </Link>
        </div>
      ) : null}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  No awards yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>
                    <Link href={`/rewards/awards/${row.id}`} className="text-primary hover:underline">
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell>{row.campusName ? `${row.campusName}${row.officeName ? ` · ${row.officeName}` : ""}` : "Organization-wide"}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(row.updatedAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/rewards/awards/${row.id}`} className="text-sm text-primary hover:underline">
                        View
                      </Link>
                      {canWrite ? (
                        <Link href={`/rewards/awards/${row.id}/edit`} className="text-sm text-primary hover:underline">
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

