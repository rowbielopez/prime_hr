import Link from "next/link";
import { UserRoundX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Friendly empty-state for self-service pages when the signed-in account has
 * no linked employee record yet.
 */
export function NoEmployeeLink() {
    return (
        <Card className="border-dashed">
            <CardHeader className="flex flex-row items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserRoundX className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-base">We could not find your employee record</CardTitle>
                    <CardDescription>
                        Your sign-in account exists, but it has not been linked to an employee profile in PRIME-HR yet. Please contact your HR
                        officer so they can connect your account to your employee record. Once linked, your profile and personal information
                        will appear here.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Link href="mailto:hr@csu.edu.ph" className={cn(buttonVariants({ variant: "outline" }))}>
                    Email HR
                </Link>
                <Link href="/me/settings" className={cn(buttonVariants({ variant: "ghost" }))}>
                    View account settings
                </Link>
            </CardContent>
        </Card>
    );
}
