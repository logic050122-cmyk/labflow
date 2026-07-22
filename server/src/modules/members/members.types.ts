import type {
  ProjectListItem,
  ProjectRole,
  ProjectStatus
} from "../projects/projects.types";

// 加入项目时客户端只提交邀请码；userId 和 role 由认证信息与 service 决定。
export interface JoinProjectInput {
  inviteCode: string;
}

// repository 按邀请码查找目标时只返回 service 进行状态判断需要的字段。
export interface ProjectJoinTarget {
  id: number;
  status: ProjectStatus;
}

// 加入成功后返回安全的项目列表项，方便前端刷新或展示最新项目。
export interface JoinProjectResult {
  project: ProjectListItem;
}

// 成员列表只返回页面展示和后续成员操作需要的安全字段，不返回邮箱、手机号等资料。
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
