import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listRewardsNominations } from "@/features/rewards/repository/nominations.repository";
import { getRewardAwardById } from "@/features/rewards/repository/awards.repository";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { hasPermission } from "@/lib/rbac/scopes";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function RewardsNominationsPage(props: Props) {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/nominations",
    permission: "rewards.nomination.read",
  });
  const resolvedSearchParams = (await props.searchParams) ?? {};
  const awardId = firstValue(resolvedSearchParams.awardId).trim();
  const activeAwardId = awardId || null;
  const rows = await listRewardsNominations(context, { awardId: activeAwardId });
  const filteredAward = activeAwardId ? await getRewardAwardById(activeAwardId, context) : null;
  const canCreate = hasPermission(context, "rewards.nomination.create");
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {activeAwardId ? (
            filteredAward ? (
              <span>
                Filtered by award: <span className="font-medium">{filteredAward.title}</span>{" "}
                <Link href="/rewards/nominations" className="text-primary hover:underline">
                  Clear filter
                </Link>
              </span>
            ) : (
              <span>
                Award filter not found or inaccessible.{" "}
                <Link href="/rewards/nominations" className="text-primary hover:underline">
                  Clear filter
                </Link>
              </span>
            )
          ) : null}
        </div>
        {canCreate ? (
          <Link href="/rewards/nominations/new" className="text-sm font-medium text-primary hover:underline">
            New nomination
          </Link>
        ) : null}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Award</TableHead>
              <TableHead>Nominee</TableHead>
              <TableHead>Nominator</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No nominations yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/rewards/nominations/${row.id}`} className="text-primary hover:underline">
                      {row.awardTitle}
                    </Link>
                  </TableCell>
                  <TableCell>{row.nomineeName}</TableCell>
                  <TableCell>{row.nominatorName}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(row.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

