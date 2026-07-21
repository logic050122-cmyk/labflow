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

// 项目状态是项目自身的数据，不放进 CreateProjectInput，避免客户端创建时改状态。
export type ProjectStatus = "active" | "finished" | "archived";
