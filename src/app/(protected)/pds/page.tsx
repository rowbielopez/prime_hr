import { PdsWorkspaceShell } from "@/components/features/pds/pds-workspace-shell";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { getEmployeePdsData } from "@/features/employees/repository/pds.repository";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";

export default async function PdsPage() {
    const { pageMeta, context } = await withProtectedPageMeta({
        pathname: "/pds",
        permission: "pds.self.read",
    });

    const employeeId = await getEmployeeIdForAppUser(context.appUserId);

    if (!employeeId) {
        return (
            <div className="space-y-6">
                <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
                <div className="rounded-lg border border-dashed border-border/70 bg-surface-inset/50 p-8 text-center text-sm text-muted-foreground">
                    No employee profile is linked to your account. Please contact HR to link your employee record before filling your PDS.
                </div>
            </div>
        );
    }

    const [employee, pdsData] = await Promise.all([
        getEmployeeById(employeeId),
        getEmployeePdsData(employeeId),
    ]);

    const campusId = employee?.campusId ?? "";

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
            <PdsWorkspaceShell
                employeeId={employeeId}
                campusId={campusId}
                pdsData={pdsData}
            />
        </div>
    );
}
