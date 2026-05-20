import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { ServiceRecordDetailManagement } from "@/components/features/service-records/service-record-detail-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeServiceRecordDetail } from "@/features/service-records/repository/service-records.repository";
import { cn } from "@/lib/utils";

export default async function EmployeeServiceRecordPage({ params }: { params: Promise<{ employeeId: string }> }) {
    const { employeeId } = await params;
    const { context, pageMeta } = await withProtectedPageMeta({ pathname: "/service-records", permission: "employee.records.read" });
    const detail = await getEmployeeServiceRecordDetail(employeeId);
    if (!detail) notFound();
    const canEdit = context.permissions.includes("employee.records.write");
    const breadcrumb = [
        ...pageMeta.breadcrumb.map((item, index) =>
            index === pageMeta.breadcrumb.length - 1 ? { ...item, href: "/service-records" } : item,
        ),
        { label: `${detail.employee.fullName} (${detail.employee.employeeNo})` },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${detail.employee.fullName} Service Record`}
                subtitle="Official employment history, appointment movement, and service period records."
                breadcrumb={breadcrumb}
                secondaryActions={
                    <Link href="/service-records" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        <ArrowLeft className="size-4" /> Back to Service Records
                    </Link>
                }
            />
            <ServiceRecordDetailManagement detail={detail} canEdit={canEdit} />
        </div>
    );
}