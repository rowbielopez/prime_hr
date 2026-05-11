import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { RewardNominationForm } from "@/components/features/rewards/nomination-form";
import { listEmployees } from "@/features/employees/repository/employees.repository";
import { listActiveRewardAwardOptions } from "@/features/rewards/repository/awards.repository";
import { getRewardsNominationById } from "@/features/rewards/repository/nominations.repository";
import { saveRewardNominationDraftAction, submitRewardNominationAction } from "@/features/rewards/actions";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";

type Props = { params: Promise<{ nominationId: string }> };

export default async function EditRewardsNominationPage(props: Props) {
  const { nominationId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/nominations",
    permission: "rewards.nomination.create",
  });
  const [detail, awards, employees, actorEmployeeId] = await Promise.all([
    getRewardsNominationById(nominationId, context),
    listActiveRewardAwardOptions(context),
    listEmployees(),
    getEmployeeIdForAppUser(context.appUserId),
  ]);
  if (!detail) notFound();
  if (detail.nominatorEmployeeId !== actorEmployeeId || !["draft", "needs_revision"].includes(detail.status)) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit nomination - ${detail.nomineeName}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.nomineeName }]}
      />
      <RewardNominationForm
        initialValue={{
          awardId: detail.awardId,
          nomineeEmployeeId: detail.nomineeEmployeeId,
          justification: detail.justification,
          nominatorRemarks: detail.nominatorRemarks,
        }}
        awardOptions={awards}
        nomineeOptions={employees.map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNo})` }))}
        onSaveDraft={(input) => saveRewardNominationDraftAction(nominationId, input)}
        onSubmitNomination={(input) => submitRewardNominationAction(nominationId, input)}
      />
    </div>
  );
}

