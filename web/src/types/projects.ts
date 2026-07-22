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

// 加入项目时页面只发送邀请码，不允许自行指定用户、项目角色或项目 ID。
export interface JoinProjectRequest {
  inviteCode: string;
}

export interface UpdateProjectRequest extends CreateProjectRequest {}

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

// Owner 生成或刷新邀请码后的接口数据。
export interface RefreshProjectInviteCodeResult {
  inviteCode: string;
}

// 加入成功后返回不包含邀请码的安全项目数据。
export interface JoinProjectResult {
  project: ProjectListItem;
}

export interface GetProjectsParams {
  // 后端会在没有传值时使用 page=1、pageSize=20。
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
}

export type ProjectListResult = PageData<ProjectListItem>;

// 详情页使用与列表相同的安全字段，不返回邀请码。
export type ProjectDetail = ProjectListItem;

export interface ProjectDetailResult {
  project: ProjectDetail;
}

export interface UpdateProjectResult {
  project: ProjectDetail;
}
