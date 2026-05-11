"use server";

import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { logPlatformAudit } from "@/features/platform/audit/log-platform-audit";
import { AUDIT_EVENTS } from "@/features/platform/audit/audit-events";
import { createNotification, markNotificationStatus } from "@/features/platform/notifications/repository/notifications.repository";

type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

export async function createPlatformNotificationAction(input: {
  recipientUserId: string;
  recipientEmployeeId?: string | null;
  campusId?: string | null;
  officeId?: string | null;
  eventType: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  payload?: Record<string, unknown>;
}): Promise<ActionResult> {
  const context = await requireAuthorizedUser();
  const result = await createNotification({
    ...input,
    createdByUserId: context.appUserId,
  });
  if (!result.ok) return fail(result.error ?? "Failed to create notification.");
  await logPlatformAudit({
    eventType: AUDIT_EVENTS.notification.created,
    action: "create_notification",
    entityType: "notifications",
    campusId: input.campusId ?? null,
    metadata: { recipientUserId: input.recipientUserId, eventType: input.eventType },
  });
  return { ok: true };
}

export async function markPlatformNotificationReadAction(notificationId: string): Promise<ActionResult> {
  const context = await requireAuthorizedUser();
  const result = await markNotificationStatus(notificationId, "read", context);
  if (!result.ok) return fail(result.error ?? "Failed to mark notification as read.");
  await logPlatformAudit({
    eventType: AUDIT_EVENTS.notification.markedRead,
    action: "mark_notification_read",
    entityType: "notifications",
    entityId: notificationId,
  });
  return { ok: true };
}

export async function archivePlatformNotificationAction(notificationId: string): Promise<ActionResult> {
  const context = await requireAuthorizedUser();
  const result = await markNotificationStatus(notificationId, "archived", context);
  if (!result.ok) return fail(result.error ?? "Failed to archive notification.");
  await logPlatformAudit({
    eventType: AUDIT_EVENTS.notification.markedArchived,
    action: "archive_notification",
    entityType: "notifications",
    entityId: notificationId,
  });
  return { ok: true };
}

