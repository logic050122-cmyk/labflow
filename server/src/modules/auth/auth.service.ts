import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "crypto";
import { promisify } from "util";

import { AppError } from "../../common/http";
import { signAccessToken } from "../../config/jwt";

import {
  createUser,
  findPublicUserById,
  findUserByUsername
} from "./auth.repository";
import type {
  CurrentUserResult,
  LoginInput,
  LoginResult,
  RegisterInput,
  RegisterResult
} from "./auth.types";

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

// 使用注册时保存的算法、salt 和哈希值重新计算密码，并安全比较结果。
const verifyPassword = async (
  password: string,
  storedPasswordHash: string
): Promise<boolean> => {
  //[algorithm, salt, hashHex]是解构赋值的语法，把 storedPasswordHash 按 $ 分割成三个部分，分别赋值给 algorithm、salt 和 hashHex 变量。
  const [algorithm, salt, hashHex] = storedPasswordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !hashHex) {// 这里检查算法名称、salt 和哈希值是否存在，如果不符合预期就抛出错误，避免后续计算出错。
    throw new Error("用户密码哈希格式不正确");
  }

  // Buffer.from(hashHex, "hex") 的意思是把 hashHex 这个十六进制字符串转换成一个 Buffer 对象，方便后续进行二进制比较。
  const storedHash = Buffer.from(hashHex, "hex");
  // storedHash.toString("hex")是把 Buffer 对象转换回十六进制字符串，方便和 hashHex 进行比较。
  //hashHex.toLowerCase()是把 hashHex 转换成小写字母，确保比较时不受大小写影响。
  // buf.toString("hex")：固定返回小写字母（a-f）
  if (!storedHash.length || storedHash.toString("hex") !== hashHex.toLowerCase()) {
    throw new Error("用户密码哈希格式不正确");
  }

  const inputHash = (await scrypt(password, salt, storedHash.length)) as Buffer;
  return timingSafeEqual(inputHash, storedHash); //使用 timingSafeEqual 进行恒定时间比较。必须buffer对象
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

// 登录业务入口：查询用户、校验密码，然后签发 JWT。
export const loginUser = async (input: LoginInput): Promise<LoginResult> => {
  const user = await findUserByUsername(input.username);

  // 用户不存在和密码错误使用相同提示，避免向外暴露某个用户名是否存在。
  if (!user) {
    throw new AppError("用户名或密码错误", 401, 40101);
  }

  // verifyPassword 会把明文密码和数据库的哈希值重新计算，返回是否匹配。
  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("用户名或密码错误", 401, 40101);
  }

  return {
    token: signAccessToken(user.id)
  };
};

// 根据认证中间件提供的用户 ID 查询当前登录用户。
export const getCurrentUser = async (
  userId: number
): Promise<CurrentUserResult> => {
  const user = await findPublicUserById(userId);

  if (!user) {
    throw new AppError("当前用户不存在", 404, 40401);
  }

  return { user };
};
