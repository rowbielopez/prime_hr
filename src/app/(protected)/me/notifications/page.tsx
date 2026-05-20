import { Bell } from "lucide-react";
import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function MyNotificationsPage() {
    const { pageMeta } = await withProtectedPageMeta({ pathname: "/me/notifications" });

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">Notifications</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        System and HR notifications will appear here so you do not miss important updates.
                    </p>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">You are all caught up</p>
                        <p className="max-w-md text-xs text-muted-foreground">
                            You have no notifications right now. We will let you know here when HR sends you an update.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
