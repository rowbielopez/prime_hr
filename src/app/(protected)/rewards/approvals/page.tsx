import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listRewardsNominations } from "@/features/rewards/repository/nominations.repository";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function RewardsApprovalsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/approvals",
    permission: "rewards.nomination.approve",
  });
  const rows = (await listRewardsNominations(context)).filter((row) => row.status === "recommended" || row.status === "approved");
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Award</TableHead>
              <TableHead>Nominee</TableHead>
              <TableHead>Nominator</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No nominations pending approval.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/rewards/approvals/${row.id}`} className="underline-offset-2 hover:underline">
                      {row.awardTitle}
                    </Link>
                  </TableCell>
                  <TableCell>{row.nomineeName}</TableCell>
                  <TableCell>{row.nominatorName}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

