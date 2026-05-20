import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import { getEmployeePdsData } from "@/features/employees/repository/pds.repository";
import { EmployeePdsViewer } from "@/components/features/employees/employee-pds-viewer";
import { PdsActions } from "@/components/features/employees/pds-actions";

type PageProps = {
    params: Promise<{ employeeId: string }>;
};

export default async function EmployeePdsPage({ params }: PageProps) {
    const { employeeId } = await params;

    const { pageMeta, context } = await withProtectedPageMeta({
        pathname: "/employees",
        permission: "employee.records.read",
    });

    const canEdit = context.permissions.includes("employee.records.write");

    const [employee, pdsData] = await Promise.all([
        getEmployeeById(employeeId),
        getEmployeePdsData(employeeId),
    ]);

    if (!employee) notFound();

    const employeeName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="space-y-6">
            <PageHeader
                title={`PDS — ${employeeName || employee.employeeNo}`}
                subtitle="Personal Data Sheet (CSC Form No. 212)"
                breadcrumb={[
                    ...pageMeta.breadcrumb,
                    { label: employeeName || employee.employeeNo, href: `/employees/${employee.id}` },
                    { label: "PDS" },
                ]}
            />
            <div className="flex flex-wrap items-center gap-2">
                <Link
                    href={`/employees/${employee.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                    ← Back to Employee
                </Link>
                <PdsActions employeeId={employee.id} canEdit={canEdit} />
            </div>
            <EmployeePdsViewer data={pdsData} />
        </div>
    );
}
