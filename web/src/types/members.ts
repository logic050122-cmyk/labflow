import type { ProjectRole } from "@/types/projects";

// 成员列表字段与后端 GET /projects/:projectId/members 响应保持一致。
export interface ProjectMemberListItem {
  userId: number;
  username: string;
  nickname: string;
  role: ProjectRole;
  joinedAt: string;
  totalTaskCount: number;
  completedTaskCount: number;
}

export interface ListProjectMembersResult {
  members: ProjectMemberListItem[];
}

export interface RemoveProjectMemberResult {
  removedUserId: number;
}
