import { request } from "@/api/http";
import type {
  CreateProjectRequest,
  CreateProjectResult
} from "@/types/projects";

// 页面不直接使用 axios，所有项目请求统一经过 api/http.ts。
export async function createProject(payload: CreateProjectRequest) {
  // http.ts 会自动补上 /api 前缀和当前登录用户的 Bearer Token。
  return await request<CreateProjectResult>({
    method: "POST",
    url: "/projects",
    data: payload
  });
}
