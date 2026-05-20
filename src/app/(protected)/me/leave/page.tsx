import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function MyLeavePage() {
    const { pageMeta } = await withProtectedPageMeta({ pathname: "/me/leave" });

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">My Leave</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        View your leave balances, filed leaves, and approval status.
                    </p>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
                        <CalendarDays className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">Leave management is coming soon</p>
                        <p className="max-w-md text-xs text-muted-foreground">
                            This feature is being prepared. In the meantime, please coordinate with your HR officer regarding
                            leave applications and balances.
                        </p>
                        <Button variant="outline" disabled className="mt-2">
                            File a leave (coming soon)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
