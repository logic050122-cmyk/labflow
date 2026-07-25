import { AppError } from "../../common/http";

import type { CreateCommentInput } from "./comments.types";

type RequestBody = Record<string, unknown>;

// 评论内容最大长度，对应数据库 TEXT 类型足够使用。
const COMMENT_CONTENT_MAX_LENGTH = 2000;

// ============================================================
// 工具函数（从 tasks.validator.ts 复制过来，不做跨模块复用）
// ============================================================
// Express 的 body 和 query 都是宽泛类型，进入业务层前先保证它是普通对象。
const ensureRequestObject = (value: unknown): RequestBody => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppError("请求参数格式不正确", 400, 40001);
  }

  return value as RequestBody;
};

// 读取必填文本：必须是字符串，去首尾空格后不能为空。
const readRequiredText = (value: unknown, fieldName: string): string => {
  if (value === undefined || value === null) {
    throw new AppError(`${fieldName}不能为空`, 400, 40001);
  }

  if (typeof value !== "string") {
    throw new AppError(`${fieldName}格式不正确`, 400, 40001);
  }

  const text = value.trim();
  if (!text) {
    throw new AppError(`${fieldName}不能为空`, 400, 40001);
  }

  return text;
};

// 读取正整数：用于路径参数 taskId 和 commentId。
const readPositiveInteger = (value: unknown, fieldName: string): number => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue < 1) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  return numberValue;
};


// ============================================================
// 业务校验函数
// ============================================================
// 新增评论只校验 content：必填、非空、长度限制。
export const validateCreateCommentRequest = (body: unknown): CreateCommentInput => {
  const requestBody = ensureRequestObject(body);
  const content = readRequiredText(requestBody.content, "评论内容");

  if (content.length > COMMENT_CONTENT_MAX_LENGTH) {
    throw new AppError(`评论内容不能超过 ${COMMENT_CONTENT_MAX_LENGTH} 个字符`, 400, 40001);
  }

  return { content };
};

// ============================================================
// 路径参数校验
// ============================================================
// 路径参数都是字符串，先用正则确认全是数字，再转成正整数。
const validatePositiveIdParam = (value: unknown, fieldName: string): number => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  return readPositiveInteger(value, fieldName);
};

// 校验 /api/tasks/:taskId/comments 中的 taskId
export const validateTaskIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "任务 ID");
};

// 校验 /api/comments/:commentId 中的 commentId
export const validateCommentIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "评论 ID");
};