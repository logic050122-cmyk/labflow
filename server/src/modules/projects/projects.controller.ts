import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import {
  createProject,
  getProject,
  listProjects,
  refreshProjectInviteCode,
  updateProject
} from "./projects.service";
import {
  validateCreateProjectRequest,
  validateListProjectsRequest,
  validateProjectIdParam,
  validateUpdateProjectRequest
} from "./projects.validator";

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

export const list: RequestHandler = async (request, response, next) => {
  try {
    // 认证中间件先把 JWT 中的用户 ID 放到 request.userId，列表查询只允许使用这个 ID。
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    // page、pageSize 和 status 由 validator 统一转换和检查，controller 不直接判断格式。
    const input = validateListProjectsRequest(request.query);
    // service 会把当前用户 ID 和查询条件交给 repository，再返回统一分页结构。
    const result = await listProjects(input, request.userId);
    sendSuccess(response, result, "项目列表获取成功");
  } catch (error) {
    // 所有错误交给统一错误处理中间件，保持接口错误格式一致。
    next(error);
  }
};

export const detail: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const projectId = validateProjectIdParam(request.params.projectId);
    const result = await getProject(projectId, request.userId);
    sendSuccess(response, result, "项目详情获取成功");
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const projectId = validateProjectIdParam(request.params.projectId);
    const input = validateUpdateProjectRequest(request.body);
    const result = await updateProject(projectId, request.userId, input);
    sendSuccess(response, result, "项目更新成功");
  } catch (error) {
    next(error);
  }
};

export const refreshInviteCode: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    // controller 只整理路径参数和当前用户，Owner 权限在 service 中校验。
    const projectId = validateProjectIdParam(request.params.projectId);
    const result = await refreshProjectInviteCode(projectId, request.userId);
    sendSuccess(response, result, "邀请码刷新成功");
  } catch (error) {
    next(error);
  }
};
