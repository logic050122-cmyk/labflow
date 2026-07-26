import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "./notifications.service";
import {
  validateListNotificationsRequest,
  validateNotificationIdParam
} from "./notifications.validator";

export const list: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const input = validateListNotificationsRequest(request.query);
    const result = await listNotifications(input, request.userId);
    sendSuccess(response, result, "通知列表获取成功");
  } catch (error) {
    next(error);
  }
};

export const unreadCount: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const result = await getUnreadNotificationCount(request.userId);
    sendSuccess(response, result, "未读通知数量获取成功");
  } catch (error) {
    next(error);
  }
};

export const markRead: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const notificationId = validateNotificationIdParam(
      request.params.notificationId
    );
    const result = await markNotificationRead(notificationId, request.userId);
    sendSuccess(response, result, "通知已标记为已读");
  } catch (error) {
    next(error);
  }
};

export const markAllRead: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const result = await markAllNotificationsRead(request.userId);
    sendSuccess(response, result, "全部通知已标记为已读");
  } catch (error) {
    next(error);
  }
};

