import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type {
  CreateProjectRepositoryInput,
  Project
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
