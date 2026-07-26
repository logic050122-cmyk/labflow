import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import {
  list,
  markAllRead,
  markRead,
  unreadCount
} from "./notifications.controller";

export const notificationRoutes = Router();

// 固定路径必须放在动态 notificationId 前面，避免被当成 ID 校验。
notificationRoutes.get("/", authenticate, list);
notificationRoutes.get("/unread-count", authenticate, unreadCount);
notificationRoutes.patch("/read-all", authenticate, markAllRead);
notificationRoutes.patch("/:notificationId/read", authenticate, markRead);

