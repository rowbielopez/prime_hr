export type NotificationStatus = "unread" | "read" | "archived" | "failed";
export type NotificationChannel = "in_app" | "email" | "sms";

export type PlatformNotification = {
  id: string;
  recipientUserId: string;
  recipientEmployeeId: string | null;
  campusId: string | null;
  officeId: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  eventType: string;
  title: string;
  message: string;
  actionUrl: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  sentAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
};

