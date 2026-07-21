// 分页返回的公共结构由所有列表接口复用。
import type { PageData } from "@/types/api";

// 创建项目时前端只提交这四个字段。
// status、ownerId、userId 由后端根据项目状态和 JWT 决定。
export interface CreateProjectRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export type ProjectStatus = "active" | "finished" | "archived";

export interface Project {
  id: number;
  name: string;
  description: string | null;
  ownerUserId: number;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectResult {
  project: Project;
}

export type ProjectRole = "owner" | "member";

// 项目列表只返回页面展示和后续详情跳转需要的字段，不包含邀请码。
export interface ProjectListItem {
  id: number;
  name: string;
  description: string | null;
  ownerUserId: number;
  status: ProjectStatus;
  role: ProjectRole;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetProjectsParams {
  // 后端会在没有传值时使用 page=1、pageSize=20。
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
}

export type ProjectListResult = PageData<ProjectListItem>;
