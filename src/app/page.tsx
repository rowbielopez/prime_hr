import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import { resolveAuthorizationContext } from "@/features/auth/server/resolve-authorization-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const context = await resolveAuthorizationContext(user);
    if (context) {
      redirect("/dashboard");
    }
    redirect(buildForbiddenUrl("unauthorized_access"));
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-balance text-2xl">CSU PRIME-HR</CardTitle>
          <CardDescription className="text-pretty">
            Production-minded PRIME-HRM workflows: role-based, multi-campus, document-heavy, and audit-ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            Sign in with your authorized CSU account to continue.
          </div>
          <div className="flex gap-3">
            <Link className={buttonVariants({ variant: "default" })} href="/login">
              Continue to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
