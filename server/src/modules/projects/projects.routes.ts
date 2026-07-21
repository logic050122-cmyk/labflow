import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import { create, list } from "./projects.controller";

export const projectRoutes = Router();

// 先经过 authenticate，controller 才能使用当前登录用户的 userId。
// GET 和 POST 使用同一个路径，但分别对应“查看列表”和“创建项目”两种 HTTP 方法。
projectRoutes.get("/", authenticate, list);
projectRoutes.post("/", authenticate, create);
