// 创建项目接口经过 validator 后，service 只接收这四个业务字段。
// status 和 ownerUserId 不属于客户端请求，由后续 service 根据规则决定。
export interface CreateProjectInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface CreateProjectRepositoryInput extends CreateProjectInput {
  ownerUserId: number;
  status: ProjectStatus;
  inviteCode: string;
}

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

export interface UpdateProjectInput extends CreateProjectInput {}

export interface UpdateProjectResult {
  project: ProjectListItem;
}

export interface ListProjectsInput {
  page: number;
  pageSize: number;
  status?: ProjectStatus;
}

export interface ListProjectsRepositoryInput extends ListProjectsInput {
  userId: number;
}

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

// Owner 刷新邀请码后只返回新邀请码，不把项目内部字段一起暴露给页面。
export interface RefreshProjectInviteCodeResult {
  inviteCode: string;
}

export interface ListProjectsResult {
  list: ProjectListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// 项目详情沿用项目列表项的安全字段，不把邀请码暴露给项目成员。
export interface GetProjectResult {
  project: ProjectListItem;
}

// 项目状态是项目自身的数据，不放进 CreateProjectInput，避免客户端创建时改状态。
export type ProjectStatus = "active" | "finished" | "archived";

export type ProjectRole = "owner" | "member";
