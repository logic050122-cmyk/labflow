import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import { create, list, remove } from "./comments.controller";

export const commentRoutes = Router();

// taskId 只从路径读取；service 会反查任务所属项目并校验成员关系。
commentRoutes.get("/tasks/:taskId/comments", authenticate, list);
commentRoutes.post("/tasks/:taskId/comments", authenticate, create);

// 删除接口只有 commentId，service 会经评论和任务反查所属项目及 Owner。
commentRoutes.delete("/comments/:commentId", authenticate, remove);
