import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { SessionParticipantsPanel } from "@/components/features/learning/sessions/session-participants-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { listEmployees } from "@/features/employees/repository/employees.repository";
import { listSessionParticipants } from "@/features/learning/participants/repository/participants.repository";
import { getTrainingSessionById } from "@/features/learning/sessions/repository/sessions.repository";

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function TrainingSessionDetailPage(props: PageProps) {
  const { sessionId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/sessions",
    permission: "learning.read",
  });
  const [detail, participants, employees] = await Promise.all([
    getTrainingSessionById(sessionId, context),
    listSessionParticipants(sessionId),
    listEmployees(),
  ]);
  if (!detail) notFound();
  const canWrite = hasPermission(context, "learning.write");
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: `${e.fullName} (${e.employeeNo})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.title }]}
      />
      <div className="flex flex-wrap gap-2">
        {canWrite ? (
          <Link href={`/learning/sessions/${sessionId}/edit`} className={cn(buttonVariants({ size: "sm" }))}>
            Edit session
          </Link>
        ) : null}
        <Link href="/learning/sessions" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to sessions
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Program: </span>
            {detail.programTitle}
          </div>
          <div>
            <span className="text-muted-foreground">Campus: </span>
            {detail.campusName}
          </div>
          <div>
            <span className="text-muted-foreground">Start: </span>
            {new Date(detail.startsAt).toLocaleString()}
          </div>
          <div>
            <span className="text-muted-foreground">End: </span>
            {new Date(detail.endsAt).toLocaleString()}
          </div>
          <div>
            <span className="text-muted-foreground">Venue: </span>
            {detail.venue ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Capacity: </span>
            {detail.capacity ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Participants: </span>
            {detail.participantCount}
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            {detail.status}
          </div>
        </CardContent>
      </Card>
      <SessionParticipantsPanel
        sessionId={sessionId}
        participants={participants}
        employeeOptions={employeeOptions}
        canManage={canWrite}
      />
    </div>
  );
}
