import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getForbiddenReasonMessage } from "@/features/auth/auth-errors";

export default function ForbiddenPage({
  searchParams,
}: {
  searchParams?: { reason?: string | string[] };
}) {
  const rawReason = searchParams?.reason;
  const reason = Array.isArray(rawReason) ? rawReason[0] : rawReason;
  const message = getForbiddenReasonMessage(reason);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Access forbidden</CardTitle>
          <CardDescription>
            You are signed in, but your current authorization scope does not allow this operation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm">{message}</div>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants({ variant: "default" })} href="/dashboard">
              Go to dashboard
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/login">
              Sign in as different account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

