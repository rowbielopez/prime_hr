import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { RewardNominationForm } from "@/components/features/rewards/nomination-form";
import { createRewardNominationAction } from "@/features/rewards/actions";
import { listEmployees } from "@/features/employees/repository/employees.repository";
import { listActiveRewardAwardOptions } from "@/features/rewards/repository/awards.repository";

export default async function NewRewardsNominationPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/nominations",
    permission: "rewards.nomination.create",
  });
  const [awards, employees] = await Promise.all([listActiveRewardAwardOptions(context), listEmployees()]);
  return (
    <div className="space-y-6">
      <PageHeader title="New nomination" subtitle={pageMeta.subtitle} breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]} />
      <RewardNominationForm
        initialValue={{ awardId: "", nomineeEmployeeId: "", justification: "", nominatorRemarks: null }}
        awardOptions={awards}
        nomineeOptions={employees.map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNo})` }))}
        onSubmitNomination={createRewardNominationAction}
      />
    </div>
  );
}

