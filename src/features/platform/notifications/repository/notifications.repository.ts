import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { PlatformNotification } from "@/features/platform/notifications/types";
import type { Json } from "@/lib/db/types";

function mapNotification(row: {
  id: string;
  recipient_user_id: string;
  recipient_employee_id: string | null;
  campus_id: string | null;
  office_id: string | null;
  channel: "in_app" | "email" | "sms";
  status: "unread" | "read" | "archived" | "failed";
  event_type: string;
  title: string;
  message: string;
  action_url: string | null;
  payload: Json;
  read_at: string | null;
  sent_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
}): PlatformNotification {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    recipientEmployeeId: row.recipient_employee_id,
    campusId: row.campus_id,
    officeId: row.office_id,
    channel: row.channel,
    status: row.status,
    eventType: row.event_type,
    title: row.title,
    message: row.message,
    actionUrl: row.action_url,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    readAt: row.read_at,
    sentAt: row.sent_at,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

export async function listNotificationsForCurrentUser(limit = 50): Promise<PlatformNotification[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: appUser } = await supabase.from("app_users").select("id").eq("auth_user_id", user.id).maybeSingle();
  const appUserId = (appUser as { id: string } | null)?.id;
  if (!appUserId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, recipient_user_id, recipient_employee_id, campus_id, office_id, channel, status, event_type, title, message, action_url, payload, read_at, sent_at, created_by_user_id, created_at"
    )
    .eq("recipient_user_id", appUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    recipient_user_id: string;
    recipient_employee_id: string | null;
    campus_id: string | null;
    office_id: string | null;
    channel: "in_app" | "email" | "sms";
    status: "unread" | "read" | "archived" | "failed";
    event_type: string;
    title: string;
    message: string;
    action_url: string | null;
    payload: Json;
    read_at: string | null;
    sent_at: string | null;
    created_by_user_id: string | null;
    created_at: string;
  }>).map(mapNotification);
}

export async function createNotification(input: {
  recipientUserId: string;
  recipientEmployeeId?: string | null;
  campusId?: string | null;
  officeId?: string | null;
  channel?: "in_app" | "email" | "sms";
  eventType: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  payload?: Record<string, unknown>;
  createdByUserId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("notifications").insert({
    recipient_user_id: input.recipientUserId,
    recipient_employee_id: input.recipientEmployeeId ?? null,
    campus_id: input.campusId ?? null,
    office_id: input.officeId ?? null,
    channel: input.channel ?? "in_app",
    event_type: input.eventType,
    title: input.title,
    message: input.message,
    action_url: input.actionUrl ?? null,
    dedupe_key: input.dedupeKey ?? null,
    payload: (input.payload ?? {}) as Json,
    created_by_user_id: input.createdByUserId ?? null,
  } as never);
  return { ok: !error, error: error?.message };
}

export async function markNotificationStatus(
  notificationId: string,
  status: "read" | "archived",
  context?: AuthorizationContext
) {
  const supabase = await createSupabaseServerClient();
  let base = supabase.from("notifications").update({ status, read_at: status === "read" ? new Date().toISOString() : null } as never).eq("id", notificationId);
  if (context && !context.isSuperAdmin) {
    base = applyAuthorizationScope(base, context);
  }
  const { error } = await base;
  return { ok: !error, error: error?.message };
}

