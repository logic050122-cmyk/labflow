import type { PageData } from "@/types/api";

export type NotificationType = "project" | "task" | "review" | "overdue" | "system";

export interface Notification {
  id: number;
  receiverUserId: number;
  projectId: number | null;
  taskId: number | null;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
}

export type NotificationListResult = PageData<Notification>;

export interface UnreadCountResult {
  unreadCount: number;
}

export interface MarkNotificationReadResult {
  notification: Notification;
}

export interface MarkAllNotificationsReadResult {
  updatedCount: number;
}

