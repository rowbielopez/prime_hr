import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listRewardsAwardeeHistory } from "@/features/rewards/repository/nominations.repository";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function RewardsHistoryPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/history",
    permission: "rewards.history.read",
  });
  const rows = await listRewardsAwardeeHistory(context);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Award</TableHead>
              <TableHead>Awardee</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Awarded At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No awardee history yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.awardTitle}</TableCell>
                  <TableCell>{row.awardeeName}</TableCell>
                  <TableCell>{row.campusName ?? "—"}</TableCell>
                  <TableCell>{new Date(row.awardedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

