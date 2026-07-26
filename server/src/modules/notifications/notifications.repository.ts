import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { db } from "../../config/db";

import type {
  CreateNotificationInput,
  ListNotificationsInput,
  Notification
} from "./notifications.types";

interface NotificationRow extends RowDataPacket {
  id: number;
  receiver_user_id: number;
  project_id: number | null;
  task_id: number | null;
  type: Notification["type"];
  title: string;
  content: string;
  is_read: number | boolean;
  read_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

const formatDateTime = (value: Date | string | null): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const toNotification = (row: NotificationRow): Notification => ({
  id: Number(row.id),
  receiverUserId: Number(row.receiver_user_id),
  projectId: row.project_id === null ? null : Number(row.project_id),
  taskId: row.task_id === null ? null : Number(row.task_id),
  type: row.type,
  title: row.title,
  content: row.content,
  isRead: Boolean(row.is_read),
  readAt: formatDateTime(row.read_at),
  createdAt: formatDateTime(row.created_at) ?? "",
  updatedAt: formatDateTime(row.updated_at) ?? ""
});

const NOTIFICATION_FIELDS = `
  id, receiver_user_id, project_id, task_id, type,
  title, content, is_read, read_at, created_at, updated_at`;

export const insertNotification = async (
  connection: PoolConnection,
  input: CreateNotificationInput
): Promise<void> => {
  // 通知必须使用业务 service 传入的事务连接，不能单独提前提交。
  await connection.execute(
    `INSERT INTO notifications
      (receiver_user_id, project_id, task_id, type, title, content)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.receiverUserId,
      input.projectId ?? null,
      input.taskId ?? null,
      input.type,
      input.title,
      input.content
    ]
  );
};

export const findNotificationsByReceiver = async (
  receiverUserId: number,
  input: ListNotificationsInput
): Promise<{ list: Notification[]; total: number }> => {
  const readCondition = input.isRead === undefined ? "" : " AND is_read = ?";
  const parameters: Array<number | boolean> = [receiverUserId];
  if (input.isRead !== undefined) {
    parameters.push(input.isRead);
  }

  const offset = (input.page - 1) * input.pageSize;
  const [rows] = await db.query<NotificationRow[]>(
    `SELECT ${NOTIFICATION_FIELDS}
     FROM notifications
     WHERE receiver_user_id = ?${readCondition}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...parameters, input.pageSize, offset]
  );

  const [countRows] = await db.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM notifications
     WHERE receiver_user_id = ?${readCondition}`,
    parameters
  );

  return {
    list: rows.map(toNotification),
    total: Number(countRows[0]?.total ?? 0)
  };
};

export const countUnreadNotifications = async (
  receiverUserId: number
): Promise<number> => {
  const [rows] = await db.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM notifications
     WHERE receiver_user_id = ? AND is_read = 0`,
    [receiverUserId]
  );

  return Number(rows[0]?.total ?? 0);
};

export const findNotificationForReceiver = async (
  notificationId: number,
  receiverUserId: number
): Promise<Notification | null> => {
  const [rows] = await db.query<NotificationRow[]>(
    `SELECT ${NOTIFICATION_FIELDS}
     FROM notifications
     WHERE id = ? AND receiver_user_id = ?
     LIMIT 1`,
    [notificationId, receiverUserId]
  );

  const notification = rows[0];
  return notification ? toNotification(notification) : null;
};

export const updateNotificationAsRead = async (
  notificationId: number,
  receiverUserId: number
): Promise<void> => {
  // 已读接口保持幂等，重复调用不会覆盖第一次阅读时间。
  await db.execute(
    `UPDATE notifications
     SET is_read = 1,
         read_at = COALESCE(read_at, NOW())
     WHERE id = ? AND receiver_user_id = ?`,
    [notificationId, receiverUserId]
  );
};

export const updateAllNotificationsAsRead = async (
  receiverUserId: number
): Promise<number> => {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE notifications
     SET is_read = 1, read_at = NOW()
     WHERE receiver_user_id = ? AND is_read = 0`,
    [receiverUserId]
  );

  return result.affectedRows;
};

