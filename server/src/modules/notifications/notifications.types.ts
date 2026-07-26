import type { PoolConnection } from "mysql2/promise";

// 第一版通知只使用数据库文档中约定的五种类型。
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

export interface ListNotificationsInput {
  page: number;
  pageSize: number;
  isRead?: boolean;
}

export interface ListNotificationsResult {
  list: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UnreadCountResult {
  unreadCount: number;
}

export interface MarkNotificationReadResult {
  notification: Notification;
}

export interface MarkAllNotificationsReadResult {
  updatedCount: number;
}

// 业务 service 只提交通知需要的字段，已读状态和时间由数据库维护。
export interface CreateNotificationInput {
  receiverUserId: number;
  projectId?: number;
  taskId?: number;
  type: NotificationType;
  title: string;
  content: string;
}

// 触发通知的业务模块把自己的事务连接传进来，保证业务写入与通知一起提交或回滚。
export type NotificationTransaction = PoolConnection;

