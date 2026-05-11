import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { getAnnualPlanById } from "@/features/learning/plans/repository/plans.repository";

type PageProps = { params: Promise<{ planId: string }> };

export default async function AnnualPlanDetailPage(props: PageProps) {
  const { planId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/plans",
    permission: "learning.read",
  });
  const detail = await getAnnualPlanById(planId, context);
  if (!detail) notFound();
  const canWrite = hasPermission(context, "learning.write");

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.title }]}
      />
      <div className="flex flex-wrap gap-2">
        {canWrite ? (
          <Link href={`/learning/plans/${planId}/edit`} className={cn(buttonVariants({ size: "sm" }))}>
            Edit plan
          </Link>
        ) : null}
        <Link href="/learning/plans" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to plans
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Year: </span>
            {detail.year}
          </div>
          <div>
            <span className="text-muted-foreground">Campus: </span>
            {detail.campusName}
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            {detail.status}
          </div>
          {detail.notes ? (
            <div className="pt-2">
              <p className="text-muted-foreground">Notes</p>
              <p>{detail.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium">Line items</h3>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Quarter</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No line items.
                </TableCell>
              </TableRow>
            ) : (
              detail.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>Q{item.quarter}</TableCell>
                  <TableCell className="font-medium">{item.programTitle}</TableCell>
                  <TableCell>{item.notes ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
