/** Mirrors `apps/api/src/features/work-management/coordination/notifications/dto/notifications.dto.ts`. */
export const NOTIFICATION_SOURCES = ["task", "comment", "message", "meeting", "request"] as const;

export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

export interface NotificationItem {
  id: string;
  recipient: string;
  source: NotificationSource;
  title: string;
  body: string;
  link: string;
  sourceId: string | null;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

/** The list response also carries the recipient-wide unread count. */
export interface NotificationPage {
  items: NotificationItem[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
}

/** Only the fields this screen reads from `GET /auth/session`. */
export interface SessionView {
  actor: { employeeId: string; displayName: string };
}
