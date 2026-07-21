import { request } from "@/api/http";
import type {
  CreateProjectRequest,
  CreateProjectResult,
  GetProjectsParams,
  ProjectDetailResult,
  ProjectListResult,
  UpdateProjectRequest,
  UpdateProjectResult
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

export async function getProjects(params: GetProjectsParams = {}) {
  // request 会自动补 /api 前缀、读取 localStorage 里的 token，并只返回 data 部分。
  return await request<ProjectListResult>({
    method: "GET",
    url: "/projects",
    params
  });
}

export async function getProject(projectId: number) {
  return await request<ProjectDetailResult>({
    method: "GET",
    url: `/projects/${projectId}`
  });
}

export async function updateProject(
  projectId: number,
  payload: UpdateProjectRequest
) {
  return await request<UpdateProjectResult>({
    method: "PUT",
    url: `/projects/${projectId}`,
    data: payload
  });
}
