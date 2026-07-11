// validator 校验完成后交给 service 的注册数据。
// password 在这一层仍是明文，只能在 service 中用于生成密码哈希。
export interface RegisterInput {
  username: string;
  password: string;
  nickname: string;
  email?: string;
  phone?: string;
  direction?: string;
}

// repository 写入 users 表时使用的数据。
// 这里故意只保存 passwordHash，避免把明文密码传到数据库层。
export interface CreateUserInput {
  username: string;
  passwordHash: string;
  nickname: string;
  email?: string;
  phone?: string;
  direction?: string;
}

// 可以返回给前端的用户信息。
// 不包含 password_hash，防止密码哈希出现在接口响应中。
export interface AuthPublicUser {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

// 注册接口 data 字段的结构，方便后续 controller 和前端保持一致。
export interface RegisterResult {
  user: AuthPublicUser;
}
