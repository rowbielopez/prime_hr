import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { TrainingProgramDetailActions } from "@/components/features/learning/programs/training-program-detail-actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { ProgramTrainingRoster } from "@/components/features/learning/programs/program-training-roster";
import { listParticipantsForProgramOverview } from "@/features/learning/participants/repository/participants.repository";
import { getTrainingProgramById } from "@/features/learning/programs/repository/programs.repository";
import {
  getParticipantCountsBySessionIds,
  listTrainingSessionsForProgram,
} from "@/features/learning/sessions/repository/sessions.repository";
import type { TrainingProgramDetail } from "@/features/learning/types";

type PageProps = { params: Promise<{ programId: string }> };

function describeScope(detail: TrainingProgramDetail) {
  if (!detail.campusName) return "Organization-wide (all campuses)";
  if (!detail.officeName) return `${detail.campusName} — all offices in campus`;
  return `${detail.campusName} — ${detail.officeName}`;
}

export default async function TrainingProgramDetailPage(props: PageProps) {
  const { programId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/programs",
    permission: "learning.read",
  });
  const detail = await getTrainingProgramById(programId, context);
  if (!detail) notFound();
  const canWrite = hasPermission(context, "learning.write");
  const [programSessions, participantOverview] = await Promise.all([
    listTrainingSessionsForProgram(programId, context),
    listParticipantsForProgramOverview(programId),
  ]);
  const sessionIds = programSessions.map((s) => s.id);
  const participantCountBySessionId = await getParticipantCountsBySessionIds(sessionIds);

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.title }]}
      />
      <div className="flex flex-wrap items-center gap-2">
        {canWrite ? (
          <Link href={`/learning/programs/${programId}/edit`} className={cn(buttonVariants({ size: "sm" }))}>
            Edit training
          </Link>
        ) : null}
        <Link href="/learning/programs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to list
        </Link>
      </div>
      {canWrite ? <TrainingProgramDetailActions programId={programId} currentStatus={detail.status} /> : null}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Overview</CardTitle>
          <AdminStatusChip
            tone={detail.status === "active" ? "active" : detail.status === "archived" ? "inactive" : "info"}
            label={detail.status}
          />
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Modality: </span>
            {detail.modality}
          </div>
          <div>
            <span className="text-muted-foreground">Duration: </span>
            {detail.durationHours} hours
          </div>
          <div>
            <span className="text-muted-foreground">Scope: </span>
            {describeScope(detail)}
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            {detail.status}
          </div>
          {detail.description ? (
            <div className="pt-2">
              <p className="text-muted-foreground">Description</p>
              <p>{detail.description}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="rounded-lg border p-4">
        <ProgramTrainingRoster
          sessions={programSessions}
          participantCountBySessionId={participantCountBySessionId}
          overview={participantOverview}
        />
      </div>
    </div>
  );
}
