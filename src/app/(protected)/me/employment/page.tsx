import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getMyEmployee } from "@/features/me/repository/me.repository";
import { NoEmployeeLink } from "@/components/features/me/no-employee-link";
import type { EmployeeDetail } from "@/features/employees/types";

function formatDate(input: string | null) {
    if (!input) return "—";
    try {
        return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    } catch {
        return input;
    }
}

function value(input: string | null | undefined) {
    return input && input.length > 0 ? input : "—";
}

const statusVariant: Record<EmployeeDetail["employmentStatus"], { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    on_leave: { label: "On Leave", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    separated: { label: "Separated", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
    retired: { label: "Retired", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[200px_1fr]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{children}</dd>
        </div>
    );
}

export default async function MyEmploymentPage() {
    const { pageMeta, context } = await withProtectedPageMeta({ pathname: "/me/employment" });
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
    const status = statusVariant[employee.employmentStatus];

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />

            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">Employment Record</CardTitle>
                        <Badge variant="secondary" className={status.className}>{status.label}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                    <Row label="Employee number">{value(employee.employeeNo)}</Row>
                    <Row label="Position">{value(employee.positionTitle)}</Row>
                    <Row label="Plantilla item">{value(employee.plantillaItemNo)}</Row>
                    <Row label="Employment type">{value(employee.employmentType)}</Row>
                    <Row label="Campus">{value(employee.campusName)}</Row>
                    <Row label="Office / Unit">{value(employee.officeName)}</Row>
                    <Row label="Date hired">{formatDate(employee.dateHired)}</Row>
                    {employee.employmentStatus === "separated" || employee.employmentStatus === "retired" ? (
                        <>
                            <Row label="Date separated">{formatDate(employee.dateSeparated)}</Row>
                            <Row label="Reason">{value(employee.separationReason)}</Row>
                        </>
                    ) : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">See something wrong?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                    <p className="text-muted-foreground">
                        Employment information is maintained by HR. If anything here is incorrect, please file a correction request
                        and HR will review your case.
                    </p>
                    <Button variant="outline" disabled>
                        Request a correction (coming soon)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
