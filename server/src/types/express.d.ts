export {};

declare global {
  namespace Express {
    interface Request {
      // 认证中间件验证 token 后写入，公开接口中可能不存在。
      userId?: number;
    }
  }
}
