import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import {
  createComment,
  deleteComment,
  listComments
} from "./comments.service";
import {
  validateCommentIdParam,
  validateCreateCommentRequest,
  validateTaskIdParam
} from "./comments.validator";

// controller 只处理 HTTP 参数、调用 validator/service，并统一返回响应。
export const list: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const taskId = validateTaskIdParam(request.params.taskId);
    const result = await listComments(taskId, request.userId);

    sendSuccess(response, result, "任务评论获取成功");
  } catch (error) {
    next(error);
  }
};

export const create: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const taskId = validateTaskIdParam(request.params.taskId);
    const input = validateCreateCommentRequest(request.body);
    const result = await createComment(taskId, input, request.userId);

    sendSuccess(response, result, "评论发布成功");
  } catch (error) {
    next(error);
  }
};

export const remove: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    const commentId = validateCommentIdParam(request.params.commentId);
    const result = await deleteComment(commentId, request.userId);

    sendSuccess(response, result, "评论删除成功");
  } catch (error) {
    next(error);
  }
};
