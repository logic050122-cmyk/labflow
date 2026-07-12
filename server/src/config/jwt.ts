import jwt from "jsonwebtoken";

import { env } from "./env";

// JWT 中只保存识别当前用户所需的 userId，不保存密码或个人资料。
export interface AccessTokenPayload {
  userId: number;
}

// 登录成功后由 service 调用这个函数生成访问令牌。
export const signAccessToken = (userId: number): string => {
  if (!Number.isSafeInteger(userId) || userId <= 0) { // userId 必须是正整数
    throw new Error("生成 Token 时需要有效的用户 ID");
  }

  // jwt.sign() 会把 payload、密钥和选项组合成一个 JWT 字符串，供前端保存和后续请求使用。
  return jwt.sign(
    { userId },
    env.jwt.secret,
    {
      algorithm: "HS256",
      expiresIn: env.jwt.expiresInSeconds
    }
  );
};

// 认证中间件会调用这个函数校验令牌，并取得当前用户 ID。
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, env.jwt.secret, {
    algorithms: ["HS256"] // 只允许 HS256 算法，避免算法降级攻击
  });

  // 这里 TypeScript 无法知道 jwt.verify 返回的 payload 类型，所以我们手动检查它的结构。
  if (
    typeof payload === "string" ||
    typeof payload.userId !== "number" ||
    !Number.isSafeInteger(payload.userId) ||
    payload.userId <= 0
  ) {
    throw new Error("Token 中缺少有效的用户 ID");
  }

  return { userId: payload.userId };
};
