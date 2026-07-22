import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import { joinProject } from "./members.service";
import { validateJoinProjectRequest } from "./members.validator";

// controller 只负责连接 HTTP 请求和 service，不在这里写事务或 SQL。
export const join: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    // 目标项目和 member 角色由 service 决定，不采用客户端提交的额外字段。
    const input = validateJoinProjectRequest(request.body);
    const result = await joinProject(input, request.userId);
    sendSuccess(response, result, "加入项目成功");
  } catch (error) {
    next(error);
  }
};
