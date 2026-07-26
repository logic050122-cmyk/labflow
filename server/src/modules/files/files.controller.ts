
import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import {
  deleteFile,
  getFileDownload,
  listProjectFiles,
  listTaskFiles,
  uploadProjectFile,
  uploadTaskFile
} from "./files.service";
import {
  validateFileIdParam,
  validateProjectIdParam,
  validateTaskIdParam,
  validateUploadedFile
} from "./files.validator";

// controller 只负责 HTTP 参数、调用 validator/service 和组织响应，不处理文件权限或 SQL。
const requireCurrentUserId = (userId: number | undefined): number => {
  if (!userId) {
    throw new AppError("请先登录", 401, 40102);
  }

  return userId;
};

export const listForProject: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const projectId = validateProjectIdParam(request.params.projectId);
    const result = await listProjectFiles(projectId, currentUserId);

    sendSuccess(response, result, "项目文件获取成功");
  } catch (error) {
    next(error);
  }
};

export const uploadForProject: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const projectId = validateProjectIdParam(request.params.projectId);
    const file = validateUploadedFile(request.file);
    const result = await uploadProjectFile(projectId, file, currentUserId);

    sendSuccess(response, result, "项目文件上传成功");
  } catch (error) {
    next(error);
  }
};

export const listForTask: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const taskId = validateTaskIdParam(request.params.taskId);
    const result = await listTaskFiles(taskId, currentUserId);

    sendSuccess(response, result, "任务附件获取成功");
  } catch (error) {
    next(error);
  }
};

export const uploadForTask: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const taskId = validateTaskIdParam(request.params.taskId);
    const file = validateUploadedFile(request.file);
    const result = await uploadTaskFile(taskId, file, currentUserId);

    sendSuccess(response, result, "任务附件上传成功");
  } catch (error) {
    next(error);
  }
};

// 下载成功返回二进制文件，不使用普通接口的 JSON 成功结构。
// response.download 会设置附件响应头，让浏览器使用原始文件名下载。
export const download: RequestHandler = async (request, response, next) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const fileId = validateFileIdParam(request.params.fileId);
    const result = await getFileDownload(fileId, currentUserId);

    response.type(result.mimeType);
    response.download(result.absolutePath, result.originalName, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const remove: RequestHandler = async (request, response, next) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const fileId = validateFileIdParam(request.params.fileId);
    const result = await deleteFile(fileId, currentUserId);

    sendSuccess(response, result, "文件删除成功");
  } catch (error) {
    next(error);
  }
};
