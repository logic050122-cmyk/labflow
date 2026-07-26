import { AppError } from "../../common/http";

import {
  countUnreadNotifications,
  findNotificationForReceiver,
  findNotificationsByReceiver,
  insertNotification,
  updateAllNotificationsAsRead,
  updateNotificationAsRead
} from "./notifications.repository";
import type {
  CreateNotificationInput,
  ListNotificationsInput,
  ListNotificationsResult,
  MarkAllNotificationsReadResult,
  MarkNotificationReadResult,
  NotificationTransaction,
  UnreadCountResult
} from "./notifications.types";

export const listNotifications = async (
  input: ListNotificationsInput,
  currentUserId: number
): Promise<ListNotificationsResult> => {
  const result = await findNotificationsByReceiver(currentUserId, input);

  return {
    ...result,
    page: input.page,
    pageSize: input.pageSize
  };
};

export const getUnreadNotificationCount = async (
  currentUserId: number
): Promise<UnreadCountResult> => {
  return {
    unreadCount: await countUnreadNotifications(currentUserId)
  };
};

export const markNotificationRead = async (
  notificationId: number,
  currentUserId: number
): Promise<MarkNotificationReadResult> => {
  const notification = await findNotificationForReceiver(
    notificationId,
    currentUserId
  );
  if (!notification) {
    // 只按接收人查询，不能通过错误差异判断别人的通知是否存在。
    throw new AppError("通知不存在", 404, 40401);
  }

  await updateNotificationAsRead(notificationId, currentUserId);
  const updatedNotification = await findNotificationForReceiver(
    notificationId,
    currentUserId
  );
  if (!updatedNotification) {
    throw new AppError("通知更新后无法读取最新数据", 500, 50001);
  }

  return { notification: updatedNotification };
};

export const markAllNotificationsRead = async (
  currentUserId: number
): Promise<MarkAllNotificationsReadResult> => {
  return {
    updatedCount: await updateAllNotificationsAsRead(currentUserId)
  };
};

// 以下函数是通知模块提供给项目、成员、任务 service 的公开写入入口。
// 它们只负责固定通知文案和字段，不接管触发模块的权限与状态判断。
export const createNotification = async (
  connection: NotificationTransaction,
  input: CreateNotificationInput
): Promise<void> => {
  // 文案中会带项目名、任务名或驳回原因，写入前按数据库字段上限兜底截断。
  await insertNotification(connection, {
    ...input,
    title: input.title.slice(0, 150),
    content: input.content.slice(0, 500)
  });
};

export const notifyProjectJoined = async (
  connection: NotificationTransaction,
  input: { userId: number; projectId: number; projectName: string }
): Promise<void> => {
  await createNotification(connection, {
    receiverUserId: input.userId,
    projectId: input.projectId,
    type: "project",
    title: "加入项目成功",
    content: `你已加入项目「${input.projectName}」。`
  });
};

export const notifyTaskAssigned = async (
  connection: NotificationTransaction,
  input: {
    assigneeUserId: number;
    projectId: number;
    taskId: number;
    taskTitle: string;
  }
): Promise<void> => {
  await createNotification(connection, {
    receiverUserId: input.assigneeUserId,
    projectId: input.projectId,
    taskId: input.taskId,
    type: "task",
    title: "收到新任务",
    content: `你收到一个新任务「${input.taskTitle}」。`
  });
};

export const notifyTaskSubmitted = async (
  connection: NotificationTransaction,
  input: {
    ownerUserId: number;
    projectId: number;
    taskId: number;
    taskTitle: string;
    assigneeName: string;
  }
): Promise<void> => {
  await createNotification(connection, {
    receiverUserId: input.ownerUserId,
    projectId: input.projectId,
    taskId: input.taskId,
    type: "review",
    title: "任务待审核",
    content: `${input.assigneeName}提交了任务「${input.taskTitle}」，等待审核。`
  });
};

export const notifyTaskApproved = async (
  connection: NotificationTransaction,
  input: {
    assigneeUserId: number;
    projectId: number;
    taskId: number;
    taskTitle: string;
  }
): Promise<void> => {
  await createNotification(connection, {
    receiverUserId: input.assigneeUserId,
    projectId: input.projectId,
    taskId: input.taskId,
    type: "review",
    title: "任务审核通过",
    content: `你的任务「${input.taskTitle}」已审核通过。`
  });
};

export const notifyTaskRejected = async (
  connection: NotificationTransaction,
  input: {
    assigneeUserId: number;
    projectId: number;
    taskId: number;
    taskTitle: string;
    reason: string;
  }
): Promise<void> => {
  await createNotification(connection, {
    receiverUserId: input.assigneeUserId,
    projectId: input.projectId,
    taskId: input.taskId,
    type: "review",
    title: "任务审核被驳回",
    content: `你的任务「${input.taskTitle}」被驳回：${input.reason}`
  });
};

export const notifyTaskOverdue = async (
  connection: NotificationTransaction,
  input: {
    receiverUserId: number;
    projectId: number;
    taskId: number;
    taskTitle: string;
  }
): Promise<void> => {
  await createNotification(connection, {
    receiverUserId: input.receiverUserId,
    projectId: input.projectId,
    taskId: input.taskId,
    type: "overdue",
    title: "任务已逾期",
    content: `任务「${input.taskTitle}」已逾期，请尽快处理。`
  });
};

export const notifyProjectArchived = async (
  connection: NotificationTransaction,
  input: { receiverUserId: number; projectId: number; projectName: string }
): Promise<void> => {
  await createNotification(connection, {
    receiverUserId: input.receiverUserId,
    projectId: input.projectId,
    type: "project",
    title: "项目已归档",
    content: `项目「${input.projectName}」已归档，历史数据仍可查看。`
  });
};
