import type { ReactNode } from "react";
import { AppShell } from "@/components/foundation/layout/app-shell";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { buildNavGroupsForContext } from "@/components/foundation/layout/build-app-nav";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const context = await requireAuthorizedUser();
  const navGroups = buildNavGroupsForContext(context);

  return <AppShell navGroups={navGroups}>{children}</AppShell>;
}

