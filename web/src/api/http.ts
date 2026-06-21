import axios, { type AxiosRequestConfig } from "axios";

import type { ApiResponse } from "@/types/api";

// 登录模块后续保存和读取 token 时应统一使用这个键名。
export const TOKEN_STORAGE_KEY = "labflow_token";

// HTTP 状态正常但后端业务 code 非 0 时，使用这个错误保留业务错误码。
export class ApiBusinessError extends Error {
  constructor(
    message: string,
    public readonly code: number
  ) {
    super(message);
    this.name = "ApiBusinessError";
  }
}

// 创建独立 Axios 实例，后续修改地址、超时或拦截器时只改这一处。
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json"
  }
});

// 每次请求发送前读取 token，存在时自动添加 Authorization 请求头。
// 登录、注册等无 token 场景不会添加该请求头。
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 所有通过该 Axios 实例发出的请求都会经过这里，避免业务 code 检查被绕过。
http.interceptors.response.use((response) => {
  const result = response.data as ApiResponse<unknown>;

  // HTTP 200 只代表请求到达后端，code === 0 才代表业务处理成功。
  if (result.code !== 0) {
    throw new ApiBusinessError(result.message || "请求处理失败", result.code);
  }

  return response;
});

// T 由调用方指定，例如 request<User>(...) 最终得到 ApiResponse<User>。
// 当前只是通用封装，没有调用任何真实业务接口。
export const request = async <T>(
  config: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await http.request<ApiResponse<T>>(config);
    return response.data;
  } catch (error: unknown) {
    // 已经识别出的业务错误直接交给页面处理，避免被改写成网络错误。
    if (error instanceof ApiBusinessError) {
      throw error;
    }

    // Axios 错误可能带有后端返回的明确提示，优先使用该提示。
    if (axios.isAxiosError<ApiResponse<null>>(error)) {
      const result = error.response?.data;

      if (result && result.code !== 0) {
        throw new ApiBusinessError(result.message || "请求处理失败", result.code);
      }

      throw new Error(result?.message || "网络请求失败，请稍后重试");
    }

    // 非 Axios 错误保持原样抛出，交给实际页面决定如何展示。
    throw error;
  }
};

export default http;
