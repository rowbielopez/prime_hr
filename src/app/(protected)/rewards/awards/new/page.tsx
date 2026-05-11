import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";
import { RewardAwardForm } from "@/components/features/rewards/award-form";
import { createRewardAwardAction } from "@/features/rewards/actions";

export default async function NewRewardAwardPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/awards",
    permission: "rewards.catalog.write",
  });
  const [campuses, offices] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="New award"
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <RewardAwardForm
        initialValue={{
          code: "",
          title: "",
          description: null,
          nominationStartDate: null,
          nominationEndDate: null,
          reviewEndDate: null,
          campusId: null,
          officeId: null,
          status: "draft",
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={createRewardAwardAction}
      />
    </div>
  );
}

