import { PageHeader } from "@/components/foundation";
import { ServiceRecordsListManagement } from "@/components/features/service-records/service-records-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listServiceRecordEmployees } from "@/features/service-records/repository/service-records.repository";

export default async function ServiceRecordsPage() {
    const { context, pageMeta } = await withProtectedPageMeta({ pathname: "/service-records", permission: "employee.records.read" });
    const result = await listServiceRecordEmployees(context);
    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
            <ServiceRecordsListManagement rows={result.rows} summary={result.summary} />
        </div>
    );
}