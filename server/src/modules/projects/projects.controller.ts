import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import { createProject } from "./projects.service";
import { validateCreateProjectRequest } from "./projects.validator";

// controller 只负责连接 HTTP 请求和 service，不在这里写事务或 SQL。
export const create: RequestHandler = async (request, response, next) => {
  try {
    // authenticate 成功后会把 JWT 中的用户 ID 放到 request.userId。
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    // 先校验未知的 request.body，再把整理后的数据交给 service。
    const input = validateCreateProjectRequest(request.body);
    const result = await createProject(input, request.userId);

    // 使用项目统一的 code/message/data 响应格式。
    sendSuccess(response, result, "项目创建成功");
  } catch (error) {
    // 参数错误、认证错误和数据库错误统一交给错误处理中间件。
    next(error);
  }
};
