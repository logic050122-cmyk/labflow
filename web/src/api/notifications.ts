import { request } from "@/api/http";
import type {
  GetNotificationsParams,
  MarkAllNotificationsReadResult,
  MarkNotificationReadResult,
  NotificationListResult,
  UnreadCountResult
} from "@/types/notifications";

// 通知请求统一走 http.ts，页面不直接使用 axios，也不能传入其他用户 ID。
export async function getNotifications(params: GetNotificationsParams = {}) {
  return await request<NotificationListResult>({
    method: "GET",
    url: "/notifications",
    params
  });
}

export async function getUnreadNotificationCount() {
  return await request<UnreadCountResult>({
    method: "GET",
    url: "/notifications/unread-count"
  });
}

export async function markNotificationRead(notificationId: number) {
  return await request<MarkNotificationReadResult>({
    method: "PATCH",
    url: `/notifications/${notificationId}/read`
  });
}

export async function markAllNotificationsRead() {
  return await request<MarkAllNotificationsReadResult>({
    method: "PATCH",
    url: "/notifications/read-all"
  });
}

