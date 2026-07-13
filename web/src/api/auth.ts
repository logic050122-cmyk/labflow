// 从统一请求封装文件中导入 request 方法。
// 后续登录、注册接口都通过 request 发送请求。
import { request } from "@/api/http";

// 登录请求参数类型。
// payload 就是前端要发送给后端的数据。
export interface LoginPayload {
  username: string;
  password: string;
}

// 注册请求参数类型。
// email 后面有 ?，表示这个字段可传可不传。
export interface RegisterPayload {
  username: string;
  password: string;
  nickname: string;
  email?: string;
  phone?: string;
  direction?: string;
}

// 登录成功后，后端返回的数据类型。
// 这里表示后端会返回一个 token。
export interface LoginResult {
  token: string;
}

// 当前登录用户的基础信息，与 GET /api/auth/me 响应保持一致。
export interface AuthUser {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUserResult {
  user: AuthUser;
}

// 登录接口函数。
// payload 是用户名和密码。
// request<LoginResult> 表示：这个接口成功后，返回的数据应该是 LoginResult 类型。
export async function login(payload: LoginPayload) {
  return await request<LoginResult>({
    // 请求方式：POST，一般用于提交数据。
    method: "POST",

    // 请求地址。
    // 如果 http.ts 里 baseURL 是 "/api"，最终地址就是 "/api/auth/login"。
    url: "/auth/login",

    // 发送给后端的数据。
    // Axios 里 POST 请求体用 data 表示。
    data: payload
  });
}

// 根据请求头中的 token 获取当前登录用户。
export async function getCurrentUser() {
  return await request<CurrentUserResult>({
    method: "GET",
    url: "/auth/me"
  });
}

// 注册接口函数。
// payload 与 PROJECT_PLAN.md 的注册信息保持一致。
export async function register(payload: RegisterPayload) {
  return await request({
    // 请求方式：POST。
    method: "POST",

    // 注册接口地址。
    // 最终请求地址通常是 "/api/auth/register"。
    url: "/auth/register",

    // 发送给后端的注册数据。
    data: payload
  });
}
