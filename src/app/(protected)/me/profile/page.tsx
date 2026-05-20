import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getMyEmployee } from "@/features/me/repository/me.repository";
import { NoEmployeeLink } from "@/components/features/me/no-employee-link";
import {
    BasicInfoCard,
    EmploymentSnapshotCard,
    GovernmentIdsCard,
} from "@/components/features/me/profile-summary-cards";
import { SafeContactForm } from "@/components/features/me/safe-contact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MyProfilePage() {
    const { pageMeta, context } = await withProtectedPageMeta({ pathname: "/me/profile" });
    const me = await getMyEmployee(context.appUserId);

    if (!me || !me.employee) {
        return (
            <div className="space-y-6">
                <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
                <NoEmployeeLink />
            </div>
        );
    }

    const { employee } = me;

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />

            <div className="grid gap-4 lg:grid-cols-2">
                <BasicInfoCard employee={employee} />
                <EmploymentSnapshotCard employee={employee} />
            </div>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">Contact Information</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        You can update these fields yourself. They are saved immediately when you click Save.
                    </p>
                </CardHeader>
                <CardContent className="pt-4">
                    <SafeContactForm
                        initialValues={{
                            mobileNo: employee.mobileNo,
                            presentAddress: employee.presentAddress,
                            permanentAddress: employee.permanentAddress,
                            emergencyContactName: employee.emergencyContactName,
                            emergencyContactPhone: employee.emergencyContactPhone,
                        }}
                    />
                </CardContent>
            </Card>

            <GovernmentIdsCard employee={employee} />
        </div>
    );
}
