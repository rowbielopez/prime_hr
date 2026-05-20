import Link from "next/link";
import { FileText, UserRound, Briefcase, Bell, MessageSquareWarning, Settings, FileSearch2 } from "lucide-react";
import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getMyEmployee } from "@/features/me/repository/me.repository";
import { NoEmployeeLink } from "@/components/features/me/no-employee-link";
import { QuickActionTile } from "@/components/features/me/quick-action-tile";

const quickActions = [
    {
        href: "/me/profile",
        title: "My Profile",
        description: "View and update your contact details",
        icon: UserRound,
        accent: "bg-module-people/12 text-module-people border-module-people/20",
    },
    {
        href: "/pds",
        title: "My PDS",
        description: "Complete your CSC Personal Data Sheet",
        icon: FileSearch2,
        accent: "bg-module-people/12 text-module-people border-module-people/20",
    },
    {
        href: "/me/employment",
        title: "My Employment",
        description: "Position, office, and status",
        icon: Briefcase,
        accent: "bg-module-recruitment/12 text-module-recruitment border-module-recruitment/20",
    },
    {
        href: "/me/documents",
        title: "My Documents",
        description: "Records HR has attached to your 201 file",
        icon: FileText,
        accent: "bg-muted text-foreground border-border/60",
    },
    {
        href: "/me/requests",
        title: "My Requests",
        description: "Correction requests and statuses",
        icon: MessageSquareWarning,
        accent: "bg-muted text-foreground border-border/60",
    },
    {
        href: "/me/notifications",
        title: "Notifications",
        description: "Updates from HR and the system",
        icon: Bell,
        accent: "bg-muted text-foreground border-border/60",
    },
    {
        href: "/me/settings",
        title: "Account Settings",
        description: "Login email, status, and roles",
        icon: Settings,
        accent: "bg-muted text-foreground border-border/60",
    },
];

export default async function MyWorkspacePage() {
    const { pageMeta, context } = await withProtectedPageMeta({ pathname: "/me" });
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
    const firstName = employee.firstName.split(" ")[0] ?? employee.firstName;

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Welcome, ${firstName}`}
                subtitle="This is your personal workspace. View your information, complete your PDS, and manage your account."
                breadcrumb={pageMeta.breadcrumb}
            />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base">Your Employment</CardTitle>
                            <Badge variant="secondary">{employee.campusName}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">Position</dt>
                                <dd className="font-medium">{employee.positionTitle ?? "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Office</dt>
                                <dd className="font-medium">{employee.officeName ?? "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Employee number</dt>
                                <dd className="font-medium">{employee.employeeNo}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Status</dt>
                                <dd className="font-medium capitalize">{employee.employmentStatus.replace("_", " ")}</dd>
                            </div>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link href="/me/employment" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                                View employment details
                            </Link>
                            <Link href="/me/profile" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                                Edit my contact info
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="text-base">PDS Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 text-sm">
                        <p className="text-muted-foreground">
                            Your Personal Data Sheet (CSC Form 212) is the official source of your HR record. Keep it up to date.
                        </p>
                        <Link href="/pds" className={cn(buttonVariants({ size: "sm" }))}>
                            Open my PDS
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick actions</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action) => (
                        <QuickActionTile
                            key={action.href}
                            href={action.href}
                            title={action.title}
                            description={action.description}
                            icon={action.icon}
                            accentClassName={action.accent}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
