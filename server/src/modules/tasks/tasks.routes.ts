import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import {
  create,
  detail,
  listByProject,
  listMine,
  start,
  update
} from "./tasks.controller";
export const taskRoutes = Router();

// 我的任务按当前登录用户查询，负责人不从客户端传入。
taskRoutes.get("/tasks", authenticate, listMine);

// 项目任务由项目成员查看；创建操作的 Owner 权限由 service 再次校验。
taskRoutes.get("/projects/:projectId/tasks", authenticate, listByProject);
taskRoutes.post("/projects/:projectId/tasks", authenticate, create);

// 只携带 taskId 的路由会在 service/repository 中反查所属项目，再做成员和 Owner 校验。
taskRoutes.get("/tasks/:taskId", authenticate, detail);
taskRoutes.put("/tasks/:taskId", authenticate, update);

// 只有任务负责人可以把 todo/overdue 任务开始为 doing。
taskRoutes.post("/tasks/:taskId/start", authenticate, start);
