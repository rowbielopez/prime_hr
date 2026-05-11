import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasAnyActiveRole } from "@/features/auth/server/authorization-predicates";
import type { Database } from "@/lib/db/types";
import type { Json } from "@/lib/db/types";

type ProvisionResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "access_pending" | "unauthorized_access" | "profile_resolution_failed" | "ambiguous_employee_match";
    };

type AppUserRow = {
  id: string;
  employee_id: string | null;
  status: "active" | "inactive" | "suspended";
  is_active: boolean;
  primary_campus_id: string | null;
};

type EmployeeMatch = {
  id: string;
  campus_id: string;
  office_id: string | null;
};

type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
type AppUserInsert = Database["public"]["Tables"]["app_users"]["Insert"];

function getAdminClient(): SupabaseClient<Database> {
  return createSupabaseAdminClient();
}

function parseAuthUserName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
  const givenName = typeof metadata?.given_name === "string" ? metadata.given_name.trim() : "";
  const familyName = typeof metadata?.family_name === "string" ? metadata.family_name.trim() : "";

  if (givenName || familyName) {
    return { firstName: givenName || null, lastName: familyName || null };
  }

  if (!fullName) return { firstName: null, lastName: null };
  const [first, ...rest] = fullName.split(/\s+/);
  return {
    firstName: first || null,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}

async function logAuthEvent(input: {
  eventType: string;
  action: string;
  actorUserId: string | null;
  campusId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getAdminClient();
  const payload: AuditLogInsert = {
    event_type: input.eventType,
    action: input.action,
    actor_user_id: input.actorUserId,
    campus_id: input.campusId ?? null,
    entity_type: "app_users",
    entity_id: input.actorUserId,
    metadata: (input.metadata ?? {}) as Json,
  };
  await admin.from("audit_logs").insert(payload as never);
}

async function findEmployeesByEmail(email: string): Promise<EmployeeMatch[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("employees")
    .select("id, campus_id, office_id")
    .eq("email", email)
    .is("deleted_at", null)
    .limit(2);

  if (error) return [];
  return (data ?? []) as EmployeeMatch[];
}

async function hasActiveRole(userId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("id, effective_from, effective_to")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);

  if (error) return false;
  const today = new Date().toISOString().slice(0, 10);
  const rows = (data ?? []) as Array<{ effective_from: string | null; effective_to: string | null }>;
  return hasAnyActiveRole(rows, today);
}

export async function provisionAndAuthorizeUser(authUser: User): Promise<ProvisionResult> {
  try {
    if (!authUser.email) {
      return { allowed: false, reason: "profile_resolution_failed" };
    }

    const admin = getAdminClient();
    const normalizedEmail = authUser.email.trim().toLowerCase();
    const { firstName, lastName } = parseAuthUserName(authUser);

    const { data: existingUser, error: existingUserError } = await admin
      .from("app_users")
      .select("id, employee_id, status, is_active, primary_campus_id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (existingUserError) {
      return { allowed: false, reason: "profile_resolution_failed" };
    }

    const appUser = existingUser as AppUserRow | null;

    let employeeMatch: EmployeeMatch | null = null;
    let hasAmbiguousEmployeeMatch = false;
    if (!appUser || !appUser.employee_id) {
      const employeeMatches = await findEmployeesByEmail(normalizedEmail);
      if (employeeMatches.length > 1) {
        hasAmbiguousEmployeeMatch = true;
      } else {
        employeeMatch = employeeMatches[0] ?? null;
      }
    }

    if (!appUser) {
      const newUserPayload: AppUserInsert = {
        auth_user_id: authUser.id,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        employee_id: employeeMatch?.id ?? null,
        status: "inactive",
        is_active: false,
        primary_campus_id: employeeMatch?.campus_id ?? null,
        primary_office_id: employeeMatch?.office_id ?? null,
        last_login_at: new Date().toISOString(),
      };
      const { data: createdUser, error: createError } = await admin
        .from("app_users")
        .upsert(newUserPayload as never, { onConflict: "auth_user_id" })
        .select("id, primary_campus_id")
        .single();

      if (createError || !createdUser) {
        return { allowed: false, reason: "profile_resolution_failed" };
      }

      await logAuthEvent({
        eventType: "auth.first_login_provisioned",
        action: "provision",
        actorUserId: (createdUser as { id: string }).id,
        campusId: (createdUser as { primary_campus_id: string | null }).primary_campus_id,
        metadata: {
          auth_user_id: authUser.id,
          email: normalizedEmail,
          matched_employee: !!employeeMatch,
          ambiguous_employee_match: hasAmbiguousEmployeeMatch,
          matched_employee_id: employeeMatch?.id ?? null,
        },
      }).catch(() => undefined);

      if (hasAmbiguousEmployeeMatch) {
        return { allowed: false, reason: "ambiguous_employee_match" };
      }
      return { allowed: false, reason: "access_pending" };
    }

    await admin
      .from("app_users")
      .update(
        {
          email: normalizedEmail,
          first_name: firstName,
          last_name: lastName,
          employee_id: appUser.employee_id ?? employeeMatch?.id ?? null,
          last_login_at: new Date().toISOString(),
        } as never
      )
      .eq("id", appUser.id);

    const userHasRole = await hasActiveRole(appUser.id);
    const isAllowed = appUser.status === "active" && appUser.is_active && userHasRole;

    await logAuthEvent({
      eventType: isAllowed ? "auth.sign_in_success" : "auth.sign_in_blocked",
      action: "sign_in",
      actorUserId: appUser.id,
      campusId: appUser.primary_campus_id,
      metadata: {
        auth_user_id: authUser.id,
        email: normalizedEmail,
        status: appUser.status,
        is_active: appUser.is_active,
        has_active_role: userHasRole,
      },
    }).catch(() => undefined);

    if (!isAllowed) {
      return { allowed: false, reason: "unauthorized_access" };
    }
    if (hasAmbiguousEmployeeMatch) {
      return { allowed: false, reason: "ambiguous_employee_match" };
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: "profile_resolution_failed" };
  }
}

