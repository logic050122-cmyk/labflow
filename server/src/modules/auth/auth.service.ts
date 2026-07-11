import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

import { AppError } from "../../common/http";

import { createUser, findUserByUsername } from "./auth.repository";
import type { RegisterInput, RegisterResult } from "./auth.types";

// crypto.scrypt 原本使用回调，这里转换成 Promise 后就能用 await 等待密码哈希完成。
const scrypt = promisify(scryptCallback);

// 每个用户生成不同 salt，再用 scrypt 得到固定长度的密码哈希。
// 返回值把算法名称、salt 和哈希值一起保存，后续登录校验时可以拆开使用。
const hashPassword = async (password: string): Promise<string> => {
//   randomBytes(16).toString("hex") 的意思是：

// randomBytes(16)：生成 16 个随机字节（128 位随机数据）
// toString("hex")：把这 16 个字节按十六进制编码成一个字符串
// 结果是一个长度 32 的十六进制字符串
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${hashedPassword.toString("hex")}`;
};

// 先查询再插入之间仍可能有并发注册，所以还要识别数据库唯一索引报错。
const isDuplicateEntryError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
};

// 注册业务的入口：检查用户名、哈希密码、调用 repository 写入用户。
export const registerUser = async (
  input: RegisterInput
): Promise<RegisterResult> => {
  // 普通情况下先给用户明确的“用户名已存在”提示。
  const existingUser = await findUserByUsername(input.username);
  if (existingUser) {
    throw new AppError("用户名已存在", 409, 40901);
  }

  // 明文密码只在这里参与哈希，不会传给 createUser。
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await createUser({
      username: input.username,
      passwordHash,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      direction: input.direction
    });

    return { user };
  } catch (error) {
    // 并发情况下可能两个请求都没有查到用户，第二次 INSERT 会触发唯一索引错误。
    if (isDuplicateEntryError(error)) {
      throw new AppError("用户名已存在", 409, 40901);
    }

    throw error;
  }
};
