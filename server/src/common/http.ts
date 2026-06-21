import type { ErrorRequestHandler, RequestHandler, Response } from "express";

// 泛型 T 表示 data 的实际类型，例如用户对象或分页结果。
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// controller 后续通过这个函数返回成功结果，保证响应结构始终一致。
// const sendSuccess = <T>(
//   参数
// ): 返回值类型 => {
//   函数体
// };
export const sendSuccess = <T>(
  response: Response,
  data: T,
  message = "success"
): Response<ApiResponse<T>> => {
  return response.json({ code: 0, message, data });//返回一个 JSON 响应，包含 code、message 和 data 字段
};

// 可预期的业务错误使用 AppError，并同时携带 HTTP 状态码和项目错误码。
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 50000
  ) {
    super(message);
    this.name = "AppError";
  }
}

// 没有路由匹配时，不直接返回响应，而是把 404 错误交给统一错误处理器。
// next = 把请求交给下一个中间件 / 路由 / 错误处理器
export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError("请求的资源不存在", 404, 40400));
};

// Express 用“四个参数”识别错误处理中间件，因此未使用的 next 也需要保留。
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next
) => {
  // 已知错误可以把安全、明确的信息返回给前端。
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      data: null
    } satisfies ApiResponse<null>);//检查类型是否满足要求
    return;
  }

  // 未知错误只在服务端记录详情，避免把堆栈或敏感信息暴露给前端。
  console.error("Unhandled request error.", error);
  response.status(500).json({
    code: 50000,
    message: "服务器内部错误",
    data: null
  } satisfies ApiResponse<null>);
};
