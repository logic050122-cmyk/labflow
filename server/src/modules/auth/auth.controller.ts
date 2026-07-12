import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import { getCurrentUser, loginUser, registerUser } from "./auth.service";
import { validateLoginRequest, validateRegisterRequest } from "./auth.validator";

// controller 只负责衔接 HTTP 请求与 service，不在这里编写 SQL 或注册业务判断。
export const register: RequestHandler = async (request, response, next) => {
  try {
    // 先把 request.body 校验成 service 需要的输入结构。
    const input = validateRegisterRequest(request.body);
    const result = await registerUser(input);

    // 所有成功响应都通过公共函数返回统一的 code/message/data 结构。
    sendSuccess(response, result, "注册成功");
  } catch (error) {
    // 参数错误和用户名重复等错误交给 common/http.ts 统一转换成响应。
    next(error);
  }
};

// 登录 controller 只整理请求、调用 service，并返回统一响应。
export const login: RequestHandler = async (request, response, next) => {
  try {
    const input = validateLoginRequest(request.body);
    const result = await loginUser(input);

    sendSuccess(response, result, "登录成功");
  } catch (error) {
    next(error);
  }
};

// 认证中间件已经验证 token，这里只获取 userId 并查询当前用户。
export const getMe: RequestHandler = async (request, response, next) => {
  try {
    if (!request.userId) {
      throw new AppError("请先登录", 401, 40102);
    }

    // service 里会查询数据库，如果用户不存在也会返回错误。
    const result = await getCurrentUser(request.userId);
    sendSuccess(response, result, "获取当前用户成功");
  } catch (error) {
    next(error);
  }
};
