import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import {
  join,
  listProjectMembers,
  removeMember
} from "./members.controller";

export const memberRoutes = Router();

// 加入项目必须先登录，userId 只使用认证中间件解析出的当前用户。
memberRoutes.post("/join", authenticate, join);

// Owner 和 Member 都可以查看所在项目的成员列表，权限由 service 校验。
memberRoutes.get("/:projectId/members", authenticate, listProjectMembers);

// 前端是否显示按钮不能代替权限控制，Owner 权限和业务限制由 service 再次校验。
memberRoutes.delete("/:projectId/members/:userId", authenticate, removeMember);
