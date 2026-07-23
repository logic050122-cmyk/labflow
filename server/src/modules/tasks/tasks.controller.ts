import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import {
  createTask,
  getTask,
  listMyTasks,
  listProjectTasks,
  startTask,
  updateTaskByOwner
} from "./tasks.service";
import {
  validateCreateTaskRequest,
  validateListTasksRequest,
  validateProjectIdParam,
  validateTaskIdParam,
  validateUpdateTaskRequest
} from "./tasks.validator";

// controller 只负责把 HTTP 参数交给 validator 和 service，不直接写 SQL 或权限判断。
export const listMine: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const input = validateListTasksRequest(request.query);
    const result = await listMyTasks(input, request.userId);
    sendSuccess(response, result, "我的任务获取成功");
  } catch (error) {
    next(error);
  }
};

export const listByProject: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const projectId = validateProjectIdParam(request.params.projectId);
    const input = validateListTasksRequest(request.query);
    const result = await listProjectTasks(projectId, input, request.userId);
    sendSuccess(response, result, "项目任务获取成功");
  } catch (error) {
    next(error);
  }
};

export const create: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const projectId = validateProjectIdParam(request.params.projectId);
    const input = validateCreateTaskRequest(request.body);
    const result = await createTask(projectId, input, request.userId);
    sendSuccess(response, result, "任务创建成功");
  } catch (error) {
    next(error);
  }
};

export const detail: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const taskId = validateTaskIdParam(request.params.taskId);
    const result = await getTask(taskId, request.userId);
    sendSuccess(response, result, "任务详情获取成功");
  } catch (error) {
    next(error);
  }
};

// 当前任务负责人开始处理自己的任务。
export const start: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const taskId = validateTaskIdParam(
      request.params.taskId
    );

    const result = await startTask(
      taskId,
      request.userId
    );

    sendSuccess(
      response,
      result,
      "任务已开始"
    );
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const taskId = validateTaskIdParam(request.params.taskId);
    const input = validateUpdateTaskRequest(request.body);
    const result = await updateTaskByOwner(taskId, input, request.userId);
    sendSuccess(response, result, "任务更新成功");
  } catch (error) {
    next(error);
  }
};
