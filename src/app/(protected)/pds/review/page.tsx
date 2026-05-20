import { PdsReviewQueue } from "@/components/features/pds/pds-review-queue";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listPendingPdsReviews } from "@/features/employees/repository/pds.repository";
import { requirePermission } from "@/features/auth/server/require-permission";

export default async function PdsReviewPage() {
    const [{ pageMeta }, context] = await Promise.all([
        withProtectedPageMeta({ pathname: "/pds/review", permission: "pds.review.read" }),
        requirePermission({ permission: "pds.review.read" }),
    ]);

    const campusScopedId = context.isSuperAdmin || context.roles.includes("central_hr_admin")
        ? null
        : context.primaryCampusId;

    const pendingReviews = await listPendingPdsReviews(campusScopedId);

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
            <PdsReviewQueue items={pendingReviews} />
        </div>
    );
}
