import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasAnyActiveRole } from "@/features/auth/server/authorization-predicates";
import { logServerError } from "@/lib/logging/server-logger";
import type { Database } from "@/lib/db/types";
import type { Json } from "@/lib/db/types";

type ProvisionResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "access_pending"
        | "unauthorized_access"
        | "profile_resolution_failed"
        | "ambiguous_employee_match";
    };

type AppUserRow = {
  id: string;
  employee_id: string | null;
  status: "active" | "inactive" | "suspended";
  is_active: boolean;
  primary_campus_id: string | null;
};

type EmployeeEmailMatch = {
  id: string;
  campus_id: string;
};

type AutoLinkResult = {
  employeeId: string | null;
  primaryCampusId: string | null;
  linked: boolean;
};

type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
type AppUserInsert = Database["public"]["Tables"]["app_users"]["Insert"];

function getAdminClient(): SupabaseClient<Database> {
  return createSupabaseAdminClient();
}

function parseAuthUserName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
  const givenName =
    typeof metadata?.given_name === "string" ? metadata.given_name.trim() : "";
  const familyName =
    typeof metadata?.family_name === "string"
      ? metadata.family_name.trim()
      : "";

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
  const rows = (data ?? []) as Array<{
    effective_from: string | null;
    effective_to: string | null;
  }>;
  return hasAnyActiveRole(rows, today);
}

async function tryAutoLinkEmployeeByEmail(input: {
  appUserId: string;
  currentEmployeeId: string | null;
  currentPrimaryCampusId: string | null;
  normalizedEmail: string;
}): Promise<AutoLinkResult> {
  if (input.currentEmployeeId) {
    return {
      employeeId: input.currentEmployeeId,
      primaryCampusId: input.currentPrimaryCampusId,
      linked: false,
    };
  }

  const admin = getAdminClient();
  const { data: employeeMatches, error: employeeError } = await admin
    .from("employees")
    .select("id, campus_id")
    .ilike("email", input.normalizedEmail)
    .is("deleted_at", null)
    .limit(2);

  if (employeeError) {
    logServerError("[provision] employee email match failed", employeeError);
    return {
      employeeId: null,
      primaryCampusId: input.currentPrimaryCampusId,
      linked: false,
    };
  }

  const matches = (employeeMatches ?? []) as EmployeeEmailMatch[];
  if (matches.length !== 1) {
    return {
      employeeId: null,
      primaryCampusId: input.currentPrimaryCampusId,
      linked: false,
    };
  }

  const matchedEmployee = matches[0];
  const { data: existingLinkedUser, error: linkedUserError } = await admin
    .from("app_users")
    .select("id")
    .eq("employee_id", matchedEmployee.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (linkedUserError) {
    logServerError(
      "[provision] existing employee link check failed",
      linkedUserError,
    );
    return {
      employeeId: null,
      primaryCampusId: input.currentPrimaryCampusId,
      linked: false,
    };
  }

  const linkedUserId =
    (existingLinkedUser as { id: string } | null)?.id ?? null;
  if (linkedUserId && linkedUserId !== input.appUserId) {
    return {
      employeeId: null,
      primaryCampusId: input.currentPrimaryCampusId,
      linked: false,
    };
  }

  const primaryCampusId =
    input.currentPrimaryCampusId ?? matchedEmployee.campus_id;
  const { error: updateError } = await admin
    .from("app_users")
    .update({
      employee_id: matchedEmployee.id,
      primary_campus_id: primaryCampusId,
    } as never)
    .eq("id", input.appUserId);

  if (updateError) {
    logServerError("[provision] employee auto-link update failed", updateError);
    return {
      employeeId: null,
      primaryCampusId: input.currentPrimaryCampusId,
      linked: false,
    };
  }

  await logAuthEvent({
    eventType: "auth.employee_auto_linked",
    action: "link_employee",
    actorUserId: input.appUserId,
    campusId: primaryCampusId,
    metadata: {
      email: input.normalizedEmail,
      employee_id: matchedEmployee.id,
      link_method: "sign_in_email_match",
    },
  }).catch(() => undefined);

  return {
    employeeId: matchedEmployee.id,
    primaryCampusId,
    linked: true,
  };
}

export async function provisionAndAuthorizeUser(
  authUser: User,
): Promise<ProvisionResult> {
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
      logServerError("[provision] app_users select failed", existingUserError);
      return { allowed: false, reason: "profile_resolution_failed" };
    }

    const appUser = existingUser as AppUserRow | null;

    const hasAmbiguousEmployeeMatch = false;

    if (!appUser) {
      const newUserPayload: AppUserInsert = {
        auth_user_id: authUser.id,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        employee_id: null,
        status: "inactive",
        is_active: false,
        primary_campus_id: null,
        // primary_office_id intentionally null — the office-scope trigger fires on
        // INSERT and would raise if the value is stale or mismatched.
        primary_office_id: null,
        last_login_at: new Date().toISOString(),
      };
      const { data: createdUser, error: createError } = await admin
        .from("app_users")
        .upsert(newUserPayload as never, { onConflict: "auth_user_id" })
        .select("id, primary_campus_id")
        .single();

      if (createError || !createdUser) {
        // Handle email uniqueness conflict (Postgres code 23505).
        // This happens when an app_users record already exists with this email
        // but a different auth_user_id (e.g. after a Supabase project reset or
        // manual provisioning). Since Google OAuth guarantees that the same
        // email address always belongs to the same person, we can safely update
        // the auth_user_id on the existing record to unblock sign-in.
        if (createError?.code === "23505") {
          const { data: existingByEmail } = await admin
            .from("app_users")
            .select("id, employee_id, status, is_active, primary_campus_id")
            .eq("email", normalizedEmail)
            .maybeSingle();
          const claimable = existingByEmail as AppUserRow | null;
          if (claimable) {
            await admin
              .from("app_users")
              .update({
                auth_user_id: authUser.id,
                first_name: firstName,
                last_name: lastName,
                last_login_at: new Date().toISOString(),
              } as never)
              .eq("id", claimable.id);
            const autoLinkResult = await tryAutoLinkEmployeeByEmail({
              appUserId: claimable.id,
              currentEmployeeId: claimable.employee_id,
              currentPrimaryCampusId: claimable.primary_campus_id,
              normalizedEmail,
            });
            await logAuthEvent({
              eventType: "auth.account_reclaimed_by_email",
              action: "reclaim",
              actorUserId: claimable.id,
              campusId:
                autoLinkResult.primaryCampusId ?? claimable.primary_campus_id,
              metadata: {
                auth_user_id: authUser.id,
                email: normalizedEmail,
                employee_id:
                  autoLinkResult.employeeId ?? claimable.employee_id ?? null,
              },
            }).catch(() => undefined);
            const userHasRole = await hasActiveRole(claimable.id);
            const isAllowed =
              claimable.status === "active" &&
              claimable.is_active &&
              userHasRole;
            if (!isAllowed) {
              return { allowed: false, reason: "access_pending" };
            }
            return { allowed: true };
          }
        }
        logServerError("[provision] app_users upsert failed", createError);
        return { allowed: false, reason: "profile_resolution_failed" };
      }

      await logAuthEvent({
        eventType: "auth.first_login_provisioned",
        action: "provision",
        actorUserId: (createdUser as { id: string }).id,
        campusId: (createdUser as { primary_campus_id: string | null })
          .primary_campus_id,
        metadata: {
          auth_user_id: authUser.id,
          email: normalizedEmail,
        },
      }).catch(() => undefined);

      await tryAutoLinkEmployeeByEmail({
        appUserId: (createdUser as { id: string }).id,
        currentEmployeeId: null,
        currentPrimaryCampusId: (
          createdUser as { primary_campus_id: string | null }
        ).primary_campus_id,
        normalizedEmail,
      });

      return { allowed: false, reason: "access_pending" };
    }

    await admin
      .from("app_users")
      .update({
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        // Do NOT change employee_id here — only the admin linking UI may do that.
        last_login_at: new Date().toISOString(),
      } as never)
      .eq("id", appUser.id);

    const autoLinkResult = await tryAutoLinkEmployeeByEmail({
      appUserId: appUser.id,
      currentEmployeeId: appUser.employee_id,
      currentPrimaryCampusId: appUser.primary_campus_id,
      normalizedEmail,
    });

    const userHasRole = await hasActiveRole(appUser.id);
    const isAllowed =
      appUser.status === "active" && appUser.is_active && userHasRole;

    await logAuthEvent({
      eventType: isAllowed ? "auth.sign_in_success" : "auth.sign_in_blocked",
      action: "sign_in",
      actorUserId: appUser.id,
      campusId: autoLinkResult.primaryCampusId ?? appUser.primary_campus_id,
      metadata: {
        auth_user_id: authUser.id,
        email: normalizedEmail,
        status: appUser.status,
        is_active: appUser.is_active,
        has_active_role: userHasRole,
        employee_id: autoLinkResult.employeeId ?? appUser.employee_id,
      },
    }).catch(() => undefined);

    if (!isAllowed) {
      return { allowed: false, reason: "unauthorized_access" };
    }
    if (hasAmbiguousEmployeeMatch) {
      return { allowed: false, reason: "ambiguous_employee_match" };
    }

    return { allowed: true };
  } catch (err) {
    logServerError("[provision] unexpected error", err);
    return { allowed: false, reason: "profile_resolution_failed" };
  }
}
