import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import { joinProject, listMembersByProject } from "./members.service";
import {
  validateJoinProjectRequest,
  validateProjectIdParam
} from "./members.validator";

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

// controller 只解析当前用户和路径参数，成员权限与数据查询交给 service。
export const listProjectMembers: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const projectId = validateProjectIdParam(request.params.projectId);
    const result = await listMembersByProject(projectId, request.userId);
    sendSuccess(response, result, "获取项目成员成功");
  } catch (error) {
    next(error);
  }
};
