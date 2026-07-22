import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import { create, detail, list, refreshInviteCode, update } from "./projects.controller";

export const projectRoutes = Router();

// 先经过 authenticate，controller 才能使用当前登录用户的 userId。
// GET 和 POST 使用同一个路径，但分别对应“查看列表”和“创建项目”两种 HTTP 方法。
projectRoutes.get("/", authenticate, list);
projectRoutes.post("/", authenticate, create);
// 生成或刷新邀请码属于 Owner 操作，具体权限由 service 根据 owner_user_id 校验。
projectRoutes.post("/:projectId/invite-code", authenticate, refreshInviteCode);
projectRoutes.put("/:projectId", authenticate, update);
projectRoutes.get("/:projectId", authenticate, detail);
