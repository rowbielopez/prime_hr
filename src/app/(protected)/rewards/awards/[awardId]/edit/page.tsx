import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";
import { RewardAwardForm } from "@/components/features/rewards/award-form";
import { getRewardAwardById } from "@/features/rewards/repository/awards.repository";
import { updateRewardAwardAction } from "@/features/rewards/actions";

type Props = { params: Promise<{ awardId: string }> };

export default async function EditRewardAwardPage(props: Props) {
  const { awardId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/awards",
    permission: "rewards.catalog.write",
  });
  const [award, campuses, offices] = await Promise.all([
    getRewardAwardById(awardId, context),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  if (!award) notFound();
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${award.title}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: award.title }]}
      />
      <RewardAwardForm
        initialValue={{
          code: award.code,
          title: award.title,
          description: award.description,
          nominationStartDate: award.nominationStartDate,
          nominationEndDate: award.nominationEndDate,
          reviewEndDate: award.reviewEndDate,
          campusId: award.campusId,
          officeId: award.officeId,
          status: award.status,
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={(input) => updateRewardAwardAction(awardId, input)}
      />
    </div>
  );
}

