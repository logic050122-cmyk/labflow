import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { db } from "../../config/db";

import type {
  ProjectListItem,
  ProjectRole,
  ProjectStatus
} from "../projects/projects.types";

import type {
  ProjectJoinTarget,
  ProjectMemberListItem
} from "./members.types";

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

interface ProjectMemberListRow extends RowDataPacket {
  user_id: number;
  username: string;
  nickname: string;
  role: ProjectRole;
  joined_at: Date | string;
  total_task_count: number | string;
  completed_task_count: number | string;
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

const toProjectMemberListItem = (
  row: ProjectMemberListRow
): ProjectMemberListItem => ({
  userId: Number(row.user_id),
  username: row.username,
  nickname: row.nickname,
  role: row.role,
  joinedAt: formatDateTime(row.joined_at),
  totalTaskCount: Number(row.total_task_count),
  completedTaskCount: Number(row.completed_task_count)
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

export const findProjectMembersForUser = async (input: {
  projectId: number;
  currentUserId: number;
}): Promise<ProjectMemberListItem[]> => {
  // EXISTS 同时完成项目成员权限隔离；非成员即使知道 projectId 也查询不到成员数据。
  //查询某个项目的全部成员，同时统计每个成员的任务总数和已完成任务数，并且保证当前登录用户必须属于这个项目。
  const [rows] = await db.query<ProjectMemberListRow[]>(
    `SELECT users.id AS user_id,
            users.username,
            users.nickname,
            CASE
              WHEN projects.owner_user_id = users.id THEN 'owner'
              ELSE 'member'
            END AS role,
            project_members.joined_at,
            COUNT(tasks.id) AS total_task_count,
            SUM(CASE WHEN tasks.status = 'done' THEN 1 ELSE 0 END) AS completed_task_count
     FROM project_members
     INNER JOIN projects ON projects.id = project_members.project_id
     INNER JOIN users ON users.id = project_members.user_id
     LEFT JOIN tasks
       ON tasks.project_id = project_members.project_id
      AND tasks.assignee_user_id = project_members.user_id
     WHERE project_members.project_id = ?
       AND EXISTS (
         SELECT 1
         FROM project_members AS current_membership
         WHERE current_membership.project_id = project_members.project_id
           AND current_membership.user_id = ?
       )
     GROUP BY users.id, users.username, users.nickname,
              projects.owner_user_id, project_members.joined_at
     ORDER BY CASE WHEN projects.owner_user_id = users.id THEN 0 ELSE 1 END,
              project_members.joined_at ASC,
              users.id ASC`,
    [input.projectId, input.currentUserId]
  );

  return rows.map(toProjectMemberListItem);
};
