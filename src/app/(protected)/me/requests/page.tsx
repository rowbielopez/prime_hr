import { PageHeader } from "@/components/foundation";
import { NoEmployeeLink } from "@/components/features/me/no-employee-link";
import { MyRequestsList } from "@/components/features/requests/my-requests-list";
import { MyRequestsSummaryCards } from "@/components/features/requests/my-requests-summary-cards";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getMyEmployee } from "@/features/me/repository/me.repository";
import { listMyEmployeeRequests } from "@/features/requests/repository/requests.repository";
import type { EmployeeRequestListItem, EmployeeRequestSummary } from "@/features/requests/types";

function summarizeRequests(requests: EmployeeRequestListItem[]): EmployeeRequestSummary {
    return {
        total: requests.length,
        pending: requests.filter((request) => request.status === "submitted").length,
        underReview: requests.filter((request) => request.status === "under_review").length,
        returned: requests.filter((request) => request.status === "returned_for_revision").length,
        approved: requests.filter((request) => request.status === "approved").length,
        completed: requests.filter((request) => request.status === "completed").length,
    };
}

export default async function MyRequestsPage() {
    const { context, pageMeta } = await withProtectedPageMeta({ pathname: "/me/requests" });
    const me = await getMyEmployee(context.appUserId);

    if (!me?.employee) {
        return (
            <div className="space-y-6">
                <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
                <NoEmployeeLink />
            </div>
        );
    }

    const requests = await listMyEmployeeRequests(me.employee.id);
    const summary = summarizeRequests(requests);

    return (
        <div className="space-y-6">
            <PageHeader
                title={pageMeta.title}
                subtitle="Submit and track your HR-related requests and corrections."
                breadcrumb={pageMeta.breadcrumb}
            />
            <MyRequestsSummaryCards summary={summary} />
            <MyRequestsList requests={requests} />
        </div>
    );
}
