import { PageHeader } from "@/components/foundation";
import { NoEmployeeLink } from "@/components/features/me/no-employee-link";
import { MyServiceRecordView } from "@/components/features/service-records/my-service-record-view";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getMyServiceRecord } from "@/features/service-records/repository/service-records.repository";

export default async function MyServiceRecordPage() {
    const { context, pageMeta } = await withProtectedPageMeta({ pathname: "/me/service-record" });
    const detail = await getMyServiceRecord(context.appUserId);
    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
            {detail ? <MyServiceRecordView detail={detail} /> : <NoEmployeeLink />}
        </div>
    );
}