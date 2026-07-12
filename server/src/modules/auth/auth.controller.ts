import type { RequestHandler } from "express";

import { sendSuccess } from "../../common/http";

import { loginUser, registerUser } from "./auth.service";
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
