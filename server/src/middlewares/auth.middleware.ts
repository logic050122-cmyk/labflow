import type { RequestHandler } from "express";

import { AppError } from "../common/http";
import { verifyAccessToken } from "../config/jwt";

// 验证请求头中的 JWT，并把当前用户 ID 交给后续 controller 使用。
export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.headers.authorization;

  //没有token就返回401错误，401是未授权的意思
  if (!authorization) {
    next(new AppError("请先登录", 401, 40102));
    return;
  }

  const parts = authorization.trim().split(/\s+/);// 按空格分成两部分，第一部分是 Bearer，第二部分是 token
  const [scheme, token] = parts;//scheme就是 Bearer，token就是JWT字符串
  if (parts.length !== 2 || scheme?.toLowerCase() !== "bearer" || !token) { //HTTP 头里的认证方式对大小写不敏感的所以用 toLowerCase()，如果不是两部分或者 scheme 不是 Bearer 或者 token 为空，就返回错误
    next(new AppError("认证信息格式不正确", 401, 40102));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.userId = payload.userId;
    next();
  } catch {
    next(new AppError("登录状态无效或已过期", 401, 40103));
  }
};
