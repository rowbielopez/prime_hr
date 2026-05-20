import { redirect } from "next/navigation";
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

  redirect("/login");
}
