import express from "express";

import { errorHandler, notFoundHandler } from "./common/http";

// app.ts 只负责“组装 Express 应用”，不负责监听端口。
// 这样测试时可以直接创建 app，不必真的启动一个服务器进程。
export const createApp = () => {
  const app = express();

  // 隐藏 Express 标识，并把 JSON/表单请求体解析成 req.body。
  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));// 让后端能读取表单格式请求体

  // 后续业务模块的 routes 会统一挂载在这里，目前不放任何业务路由。

  // 404 和错误处理中间件必须放在所有正常路由之后。
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
// use 是注册，不是调用。后面会不会执行，看前面有没有 next() 或 next(error)
