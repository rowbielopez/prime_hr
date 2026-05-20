import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    central_hr_admin: "Central HR Admin",
    campus_hr_officer: "Campus HR Officer",
    office_unit_head: "Office / Unit Head",
    committee_member: "Committee Member",
    employee: "Employee",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[200px_1fr]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{children}</dd>
        </div>
    );
}

export default async function AccountSettingsPage() {
    const { pageMeta, context } = await withProtectedPageMeta({ pathname: "/me/settings" });
    const roles = context.roles ?? [];

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">Sign-in account</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Your sign-in email is managed by HR and tied to your employee record.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                    <Row label="Login email">{context.email ?? "—"}</Row>
                    <Row label="Account status">
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            Active
                        </Badge>
                    </Row>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                    <Row label="Roles">
                        <div className="flex flex-wrap gap-1.5">
                            {roles.length > 0 ? (
                                roles.map((role) => (
                                    <Badge key={role} variant="secondary">
                                        {roleLabels[role] ?? role}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-muted-foreground">No roles assigned</span>
                            )}
                        </div>
                    </Row>
                    <p className="text-xs text-muted-foreground">
                        Roles determine what you can see and do in PRIME-HR. To request a role change, please contact HR.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">Need help?</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-sm text-muted-foreground">
                    For password, sign-in, or access questions, please contact your HR officer or the PRIME-HR support team.
                </CardContent>
            </Card>
        </div>
    );
}
