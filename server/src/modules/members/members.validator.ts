import { AppError } from "../../common/http";

import type { JoinProjectInput } from "./members.types";

type RequestBody = Record<string, unknown>;

const PROJECT_INVITE_CODE_MAX_LENGTH = 32;
const INVITE_CODE_PATTERN = /^[A-Z0-9]+$/;

const ensureRequestBody = (body: unknown): RequestBody => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError("请求参数格式不正确", 400, 40001);
  }

  return body as RequestBody;
};

// 加入项目接口只读取 inviteCode，客户端提交的 projectId、userId 或 role 都不会被采用。
export const validateJoinProjectRequest = (body: unknown): JoinProjectInput => {
  const requestBody = ensureRequestBody(body);

  if (typeof requestBody.inviteCode !== "string") {
    throw new AppError("邀请码不能为空", 400, 40001);
  }

  // 服务端保存的是大写邀请码；去除首尾空格后统一转大写，兼容用户的小写输入。
  const inviteCode = requestBody.inviteCode.trim().toUpperCase();
  if (!inviteCode) {
    throw new AppError("邀请码不能为空", 400, 40001);
  }

  if (inviteCode.length > PROJECT_INVITE_CODE_MAX_LENGTH) {
    throw new AppError("邀请码不能超过 32 个字符", 400, 40001);
  }

  if (!INVITE_CODE_PATTERN.test(inviteCode)) {
    throw new AppError("邀请码只能包含英文字母和数字", 400, 40001);
  }

  return { inviteCode };
};

// URL 路径参数默认是字符串，进入 service 前必须转换成安全的正整数。
export const validateProjectIdParam = (value: unknown): number => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError("项目 ID 必须是正整数", 400, 40001);
  }

  const projectId = Number(value);
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    throw new AppError("项目 ID 必须是正整数", 400, 40001);
  }

  return projectId;
};
