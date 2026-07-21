// 创建项目时前端只提交这四个字段。
// status、ownerId、userId 由后端根据项目状态和 JWT 决定。
export interface CreateProjectRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export type ProjectStatus = "active" | "finished" | "archived";
