import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import { join } from "./members.controller";

export const memberRoutes = Router();

// 加入项目必须先登录，userId 只使用认证中间件解析出的当前用户。
memberRoutes.post("/join", authenticate, join);
