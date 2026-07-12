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

// validator 校验完成后交给 service 的登录数据。
export interface LoginInput {
  username: string;
  password: string;
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

// repository 查询登录用户时返回的数据，密码哈希只供 service 校验密码。
export interface AuthUserWithPassword {
  id: number;
  username: string;
  passwordHash: string;
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

// 登录成功后只返回访问令牌，用户信息将在 /api/auth/me 中获取。
export interface LoginResult {
  token: string;
}

// /api/auth/me 返回当前登录用户的安全信息。
export interface CurrentUserResult {
  user: AuthPublicUser;
}
