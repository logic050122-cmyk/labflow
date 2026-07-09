// 引入 axios，用来发送 HTTP 请求
// AxiosRequestConfig 是 axios 请求配置的类型
import axios, { type AxiosRequestConfig } from "axios";

// 引入后端统一响应结构的类型
import type { ApiResponse } from "@/types/api";

// token 存在 localStorage 里的 key 名
export const TOKEN_STORAGE_KEY = "labflow_token";

// 创建一个 axios 实例
// 以后项目里的请求都尽量用这个 http，而不是直接用 axios
const http = axios.create({
  // 请求的基础地址
  // 如果环境变量里配置了 VITE_API_BASE_URL，就用环境变量
  // 否则默认使用 /api
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",

  // 请求超时时间，单位是毫秒
  // 10_000 等于 10000，也就是 10 秒
  timeout: 10_000,

  // 默认请求头
  headers: {
    "Content-Type": "application/json"
  }
});

// 请求拦截器
// 作用：每次请求发送之前，先执行这里的代码
http.interceptors.request.use((config) => {
  // 从浏览器 localStorage 中取出 token
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  // 如果 token 存在，并且当前请求头里还没有 Authorization
  if (token && !config.headers.Authorization) {
    // 给请求头自动加上 token
    // 后端一般会从 Authorization 里校验用户身份
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 必须返回 config，请求才会继续发送
  return config;
});

// 封装统一请求方法
// T 表示接口真正返回的数据类型
// 例如 request<LoginResult>(...)，那么返回值就是 Promise<LoginResult>
export const request = async <T>(
  // 参数 config 是 axios 请求配置，类型是 AxiosRequestConfig
  // config 是请求配置，比如 method、url、data、params
  config: AxiosRequestConfig
): Promise<T> => {
  try {
    // 发送请求。
    // ApiResponse<T> 描述的是后端响应体 response.data 的格式：
    // {
    //   code: number;
    //   message: string;
    //   data: T;
    // }
    //
    // response 是 Axios 的完整响应对象：
    // response.status 是 HTTP 状态码
    // response.data 是 ApiResponse<T>

    const response = await http.request<ApiResponse<T>>(config);

    // response = {
    //   status: 200,        // HTTP 状态码
    //   headers: {},
    //   data: {             // 后端响应体
    //     code: 0,          // 后端业务码
    //     message: "success",
    //     data: {}
    //   }
    // }
    // 取出后端返回的真正响应体
    const result = response.data;

    // 如果 code 不等于 0，说明业务失败
    // 比如密码错误、权限不足、参数错误
    if (result.code !== 0) {
      throw new Error(result.message || "请求失败");
    }

    // 如果 code 等于 0，说明请求成功
    // 只返回 data，外面调用时不用再写 response.data.data
    return result.data;
  } catch (error: unknown) {
    // 判断这个错误是不是 axios 请求错误
    if (axios.isAxiosError<ApiResponse<null>>(error)) {
      // 尝试从后端错误响应里取 message
      const message = error.response?.data?.message;

      // 如果后端有 message，就使用后端 message
      // 否则给一个默认错误提示
      throw new Error(message || "网络请求失败，请稍后重试");
    }

    // 如果不是 axios 错误，就继续抛出原错误
    throw error;
  }
};

// 默认导出 http
// 如果以后某些地方想直接使用原始 axios 实例，也可以导入它
export default http;