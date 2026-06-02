import { EmployeeRequestsReviewQueue } from "@/components/features/requests/employee-requests-review-queue";
import { PageHeader } from "@/components/foundation";
import { requirePermission } from "@/features/auth/server/require-permission";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listEmployeeRequestsForReview } from "@/features/requests/repository/requests.repository";

export default async function EmployeeRequestsReviewPage() {
    const [{ pageMeta }] = await Promise.all([
        withProtectedPageMeta({ pathname: "/requests/review", permission: "employee.requests.review.read" }),
        requirePermission({ permission: "employee.requests.review.read" }),
    ]);

    const requests = await listEmployeeRequestsForReview();

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
            <EmployeeRequestsReviewQueue items={requests} />
        </div>
    );
}