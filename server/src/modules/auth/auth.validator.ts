import { AppError } from "../../common/http";

import type { RegisterInput } from "./auth.types";

// Express 的 request.body 默认不能直接相信，所以先把它缩小为对象类型。
// “键是字符串，值暂时未知的对象”。可以有任意多个
type RequestBody = Record<string, unknown>;

// 注册接口只接收 JSON 对象，数组、null 等格式直接返回参数错误。
// !== "object"如果不是对象
const ensureRequestBody = (body: unknown): RequestBody => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError("请求参数格式不正确", 400, 40001);
  }

  return body as RequestBody;
};

// 用户名只保留最基本的非空校验，并去掉首尾空格。
const readRequiredText = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new AppError(`${fieldName}不能为空`, 400, 40001);
  }

  const text = value.trim();
  if (!text) {
    throw new AppError(`${fieldName}不能为空`, 400, 40001);
  }

  return text;
};

// 密码只检查是否为空，返回用户原始输入，不去掉首尾空格。
const readPassword = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("密码不能为空", 400, 40001);
  }

  return value;
};

// 选填字段为空时统一变成 undefined，repository 会把它写成数据库 NULL。
const readOptionalText = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(`${fieldName}格式不正确`, 400, 40001);
  }

  const text = value.trim();
  if (!text) {
    return undefined;
  }

  return text;
};

// 把前端提交的未知数据校验并整理成 RegisterInput，
// 这样 service 不需要重复处理字段类型和空值问题。
export const validateRegisterRequest = (body: unknown): RegisterInput => {
  const requestBody = ensureRequestBody(body);

  const username = readRequiredText(requestBody.username, "用户名");
  if (username.length > 50) {
    throw new AppError("用户名不能超过 50 个字符", 400, 40001);
  }

  const password = readPassword(requestBody.password);
  const nickname = readRequiredText(requestBody.nickname, "昵称");
  if (nickname.length > 50) {
    throw new AppError("昵称不能超过 50 个字符", 400, 40001);
  }

  const email = readOptionalText(requestBody.email, "邮箱");
  if (email && email.length > 100) {
    throw new AppError("邮箱不能超过 100 个字符", 400, 40001);
  }

  const phone = readOptionalText(requestBody.phone, "手机号");
  if (phone && phone.length > 20) {
    throw new AppError("手机号不能超过 20 个字符", 400, 40001);
  }

  const direction = readOptionalText(requestBody.direction, "所属方向");
  if (direction && direction.length > 50) {
    throw new AppError("所属方向不能超过 50 个字符", 400, 40001);
  }

  return {
    username,
    password,
    nickname,
    email,
    phone,
    direction
  };
};
