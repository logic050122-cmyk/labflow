import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db } from "../../config/db";

import type { AuthPublicUser, CreateUserInput } from "./auth.types";

// 数据库查询结果使用 snake_case 字段名，和 users 表的列名保持一致。
interface AuthUserRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
}

// 注册成功后返回给前端的用户查询结果，不包含密码哈希和个人资料扩展字段。
interface PublicUserRow extends RowDataPacket {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// mysql2 通常把 DATETIME 转成 Date；这里统一输出接口文档要求的字符串时间。
const formatDate = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString();//value.toISOString() 把这个 Date 转成标准的 ISO 字符串格式，比如 2026-07-11T08:00:00.000Z。
  }

  return value;
};

// camelCase是前端使用的字段名，和数据库的 snake_case 字段名不同。
// 数据库字段转成前端使用的 camelCase，并且不把 password_hash 带到返回结果中。
const toPublicUser = (row: PublicUserRow): AuthPublicUser => {
  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname,
    email: row.email,
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at)
  };
};

// 注册前查询同名用户，后续登录时也会复用这类查询。
// [
//   rows,   // 查询到的数据
//   fields  // 字段描述信息
// ]
export const findUserByUsername = async (
  username: string
): Promise<AuthUserRow | null> => {
  const [rows] = await db.query<AuthUserRow[]>(
    `SELECT id, username, password_hash
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username] //是一个参数数组，用来给 SQL 里的 ? 传值。
  );

  return rows[0] ?? null; //两个？表示 如果 rows[0] 是 undefined，则返回 null；否则返回 rows[0]。
};

// 插入成功后按 ID 读取安全的用户信息，作为注册接口响应。
const findPublicUserById = async (id: number): Promise<AuthPublicUser | null> => {
  const [rows] = await db.query<PublicUserRow[]>(
    `SELECT id, username, nickname, email, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
// rows[0];是查询结果的第一行，如果没有找到用户，则返回 null；否则调用 toPublicUser 转换为前端需要的格式。
  const user = rows[0];
  if (!user) {
    return null;
  }

  return toPublicUser(user); // 调用 toPublicUser 转换为前端需要的格式。
};

// repository 只负责执行 INSERT 和查询
export const createUser = async (
  input: CreateUserInput
): Promise<AuthPublicUser> => {
  // ? 是 SQL 参数占位符，mysql2 会安全地把数组中的值传给数据库。
  //  const [result] 数组解构赋值，result 是 ResultSetHeader 类型，包含 insertId、affectedRows 等信息。
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO users (username, password_hash, nickname, email, phone, direction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.username,
      input.passwordHash,
      input.nickname,
      input.email ?? null,
      input.phone ?? null,
      input.direction ?? null
    ]
  );

  // 使用 insertId 读取刚刚插入的记录，转换为对外的公开结构后返回。
  // 这是一个防御性检查：正常情况下 insertId 对应的记录应存在；若不存在则抛错，
  // 以便上层（controller/service）能捕获并记录、返回合适的错误给客户端。
  const user = await findPublicUserById(result.insertId);
  if (!user) {
    throw new Error("创建用户后未找到用户记录");
  }

  return user;
};
