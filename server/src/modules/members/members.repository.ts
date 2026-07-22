import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import type {
  ProjectListItem,
  ProjectRole,
  ProjectStatus
} from "../projects/projects.types";

import type { ProjectJoinTarget } from "./members.types";

interface ProjectJoinTargetRow extends RowDataPacket {
  id: number;
  status: ProjectStatus;
}

interface ProjectMembershipRow extends RowDataPacket {
  id: number;
}

interface JoinedProjectRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  owner_user_id: number;
  status: ProjectStatus;
  role: ProjectRole;
  start_date: Date | string;
  end_date: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

const formatDateOnly = (value: Date | string): string => {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
};

const formatDateTime = (value: Date | string): string => {
  return value instanceof Date ? value.toISOString() : value;
};

// repository 只负责字段映射，不在这里判断项目状态或成员权限。
const toProjectListItem = (row: JoinedProjectRow): ProjectListItem => ({
  id: Number(row.id),
  name: row.name,
  description: row.description,
  ownerUserId: Number(row.owner_user_id),
  status: row.status,
  role: row.role,
  startDate: formatDateOnly(row.start_date),
  endDate: formatDateOnly(row.end_date),
  createdAt: formatDateTime(row.created_at),
  updatedAt: formatDateTime(row.updated_at)
});

export const findProjectByInviteCodeForUpdate = async (
  connection: PoolConnection,
  inviteCode: string
): Promise<ProjectJoinTarget | null> => {
  // FOR UPDATE 锁住目标项目行，使邀请码刷新和成员加入按顺序执行。
  const [rows] = await connection.execute<ProjectJoinTargetRow[]>(
    `SELECT id, status
     FROM projects
     WHERE invite_code = ?
     LIMIT 1
     FOR UPDATE`,
    [inviteCode]
  );

  const project = rows[0];
  if (!project) {
    return null;
  }

  return {
    id: Number(project.id),
    status: project.status
  };
};
// hasProjectMembership是用来检查用户是否已经加入某个项目的函数。并返回一个布尔值，表示用户是否已经是该项目的成员。
export const hasProjectMembership = async (
  connection: PoolConnection,
  input: { projectId: number; userId: number }
): Promise<boolean> => {
  // Owner 创建项目时也会写入成员表，因此同一个查询可以识别 Owner 和普通 Member。
  const [rows] = await connection.execute<ProjectMembershipRow[]>(
    `SELECT id
     FROM project_members
     WHERE project_id = ? AND user_id = ?
     LIMIT 1`,
    [input.projectId, input.userId]
  );

  return Boolean(rows[0]);
};

export const insertProjectMember = async (
  connection: PoolConnection,
  input: { projectId: number; userId: number }
): Promise<void> => {
  // 通过邀请码加入的角色固定为 member，不接收客户端传入的 role。
  await connection.execute(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES (?, ?, 'member')`,
    [input.projectId, input.userId]
  );
};

export const findJoinedProjectByIdForUser = async (
  connection: PoolConnection,
  input: { projectId: number; userId: number }
): Promise<ProjectListItem | null> => {
  // INSERT 后继续使用同一连接读取，事务提交前也能返回刚建立的成员关系。
  const [rows] = await connection.query<JoinedProjectRow[]>(
    `SELECT projects.id, projects.name, projects.description,
            projects.owner_user_id, projects.status,
            projects.start_date, projects.end_date,
            projects.created_at, projects.updated_at,
            CASE
              WHEN projects.owner_user_id = ? THEN 'owner'
              ELSE 'member'
            END AS role
     FROM project_members
     INNER JOIN projects ON projects.id = project_members.project_id
     WHERE project_members.user_id = ?
       AND projects.id = ?
     LIMIT 1`,
    [input.userId, input.userId, input.projectId]
  );

  const project = rows[0];
  return project ? toProjectListItem(project) : null;
};
