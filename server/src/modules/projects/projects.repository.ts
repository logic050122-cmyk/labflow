import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { db } from "../../config/db";

import type {
  CreateProjectRepositoryInput,
  ListProjectsRepositoryInput,
  Project,
  ProjectListItem,
  ProjectRole
} from "./projects.types";

interface ProjectRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  owner_user_id: number;
  status: Project["status"];
  start_date: Date | string;
  end_date: Date | string;
  invite_code: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProjectListRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  owner_user_id: number;
  status: Project["status"];
  role: ProjectRole;
  start_date: Date | string;
  end_date: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProjectCountRow extends RowDataPacket {
  total: number;
}

// MySQL 字段是 snake_case，接口返回字段统一转换为前端使用的 camelCase。
const formatDateOnly = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
};

const formatDateTime = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

// 把数据库查询行转换成接口中的项目对象，不在 repository 里做权限判断。
const toProject = (row: ProjectRow): Project => ({
  id: Number(row.id),
  name: row.name,
  description: row.description,
  ownerUserId: Number(row.owner_user_id),
  status: row.status,
  startDate: formatDateOnly(row.start_date),
  endDate: formatDateOnly(row.end_date),
  inviteCode: row.invite_code,
  createdAt: formatDateTime(row.created_at),
  updatedAt: formatDateTime(row.updated_at)
});

// 把数据库查询行转换成接口中的项目列表项对象，不在 repository 里做权限判断。
const toProjectListItem = (row: ProjectListRow): ProjectListItem => ({
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

export const insertProject = async (
  connection: PoolConnection,
  input: CreateProjectRepositoryInput
): Promise<Project> => {
  // 使用 ? 占位符传参，避免把用户输入直接拼进 SQL。
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO projects
      (name, description, owner_user_id, status, start_date, end_date, invite_code)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.description ?? null,
      input.ownerUserId,
      input.status,
      input.startDate,
      input.endDate,
      input.inviteCode
    ]
  );

  // 插入后重新查询完整项目，拿到数据库生成的时间和自增 ID。
  const [rows] = await connection.query<ProjectRow[]>(
    `SELECT id, name, description, owner_user_id, status,
            start_date, end_date, invite_code, created_at, updated_at
     FROM projects
     WHERE id = ?
     LIMIT 1`,
    [result.insertId]
  );

  const project = rows[0];
  if (!project) {
    throw new Error("创建项目后未找到项目记录");
  }

  return toProject(project);
};

export const insertProjectOwner = async (
  connection: PoolConnection,
  projectId: number,
  userId: number
): Promise<void> => {
  // 项目创建成功后写入唯一的 Owner 成员关系。
  await connection.execute(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES (?, ?, 'owner')`,
    [projectId, userId]
  );
};

export const findProjectsByUser = async (
  input: ListProjectsRepositoryInput
): Promise<{ list: ProjectListItem[]; total: number }> => {
  // offset 表示跳过前面多少条记录，例如第 2 页会跳过 pageSize 条。
  const offset = (input.page - 1) * input.pageSize;
  const statusCondition = input.status ? " AND projects.status = ?" : "";

  // 列表 SQL 需要两个用户 ID：一个用于计算角色，一个用于筛选成员关系。
  const listParameters: Array<number | string> = [input.userId, input.userId];
  const countParameters: Array<number | string> = [input.userId];
  if (input.status) {
    listParameters.push(input.status);
    countParameters.push(input.status);
  }
  listParameters.push(input.pageSize, offset);

  // mysql2 的 query 同样会安全转义 ? 参数，并兼容当前 MySQL 的 LIMIT/OFFSET 参数。
  const [rows] = await db.query<ProjectListRow[]>(
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
     WHERE project_members.user_id = ?${statusCondition}
     ORDER BY projects.created_at DESC, projects.id DESC
     LIMIT ? OFFSET ?`,
    listParameters
  );

  const [countRows] = await db.execute<ProjectCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM project_members
     INNER JOIN projects ON projects.id = project_members.project_id
     WHERE project_members.user_id = ?${statusCondition}`,
    countParameters
  );

  // 列表不返回 invite_code，避免把邀请码暴露给普通项目成员。
  return {
    list: rows.map(toProjectListItem),
    total: Number(countRows[0]?.total ?? 0)
  };
};
