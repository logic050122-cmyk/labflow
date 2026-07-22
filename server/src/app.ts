import express from "express";

import { errorHandler, notFoundHandler } from "./common/http";
import { authRoutes } from "./modules/auth/auth.routes";
import { memberRoutes } from "./modules/members/members.routes";
import { projectRoutes } from "./modules/projects/projects.routes";

// app.ts 只负责“组装 Express 应用”，不负责监听端口。
// 这样测试时可以直接创建 app，不必真的启动一个服务器进程。
export const createApp = () => {
  const app = express();

  // 隐藏 Express 标识，并把 JSON/表单请求体解析成 req.body。
  app.disable("x-powered-by"); //表示隐藏 Express 标识，防止泄露服务器信息
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));// 让后端能读取表单格式请求体

  // authRoutes 内部的 /register 会和这里的 /api/auth 拼成完整地址
  // POST /api/auth/register。
  app.use("/api/auth", authRoutes);

  // 静态 /join 必须先于项目动态路由挂载，完整路径为 POST /api/projects/join。
  app.use("/api/projects", memberRoutes);

  // projectRoutes 内部的 / 会和这里拼成 POST /api/projects。
  app.use("/api/projects", projectRoutes);

  // 404 和错误处理中间件必须放在所有正常路由之后。
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
// use 是注册，不是调用。后面会不会执行，看前面有没有 next() 或 next(error)
