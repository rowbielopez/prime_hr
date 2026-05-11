import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { getCompetencyById } from "@/features/learning/competencies/repository/competencies.repository";
import { COMPETENCY_STATUS_LABELS } from "@/features/learning/status-labels";

type Props = { params: Promise<{ competencyId: string }> };

export default async function CompetencyDetailPage(props: Props) {
  const { competencyId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies",
    permission: "learning.competencies.read",
  });
  const row = await getCompetencyById(competencyId, context);
  if (!row) notFound();
  const canWrite = hasPermission(context, "learning.competencies.write");

  return (
    <div className="space-y-6">
      <PageHeader title={row.title} subtitle={pageMeta.subtitle} breadcrumb={[...pageMeta.breadcrumb, { label: row.code }]} />
      <div className="flex gap-2">
        {canWrite ? (
          <Link href={`/learning/competencies/${competencyId}/edit`} className={cn(buttonVariants({ size: "sm" }))}>
            Edit competency
          </Link>
        ) : null}
        <Link href="/learning/competencies" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to list
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Code: </span>
            {row.code}
          </p>
          <p>
            <span className="text-muted-foreground">Category: </span>
            {row.category ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Scope: </span>
            {row.campusName ? `${row.campusName}${row.officeName ? ` · ${row.officeName}` : ""}` : "Global"}
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            {COMPETENCY_STATUS_LABELS[row.status]}
          </p>
          {row.description ? (
            <p>
              <span className="text-muted-foreground">Description: </span>
              {row.description}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
