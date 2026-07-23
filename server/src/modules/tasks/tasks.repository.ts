import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket
} from "mysql2/promise";

import { db } from "../../config/db";

import type {
  CreateTaskRepositoryInput,
  ListTasksInput,
  Task,
  TaskProjectWriteTarget,
  TaskStatus,
  TaskWriteTarget
} from "./tasks.types";

interface TaskRow extends RowDataPacket {
  id: number;
  project_id: number;
  project_name: string;
  project_status: Task["projectStatus"];
  title: string;
  description: string | null;
  assignee_user_id: number;
  assignee_username: string;
  assignee_nickname: string;
  creator_user_id: number;
  creator_username: string;
  creator_nickname: string;
  priority: Task["priority"];
  status: TaskStatus;
  tag: Task["tag"];
  due_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TaskCountRow extends RowDataPacket {
  total: number | string;
}

interface TaskProjectWriteTargetRow extends RowDataPacket {
  owner_user_id: number;
  status: TaskProjectWriteTarget["status"];
}

interface TaskWriteTargetRow extends RowDataPacket {
  id: number;
  project_id: number;
  owner_user_id: number;
  project_status: TaskProjectWriteTarget["status"];
  task_status: TaskStatus;
}

interface ProjectMemberRow extends RowDataPacket {
  id: number;
}

// 所有列表和详情查询复用同一组字段，避免不同接口返回字段不一致。
const TASK_SELECT_FIELDS = `
  tasks.id,
  tasks.project_id,
  projects.name AS project_name,
  projects.status AS project_status,
  tasks.title,
  tasks.description,
  tasks.assignee_user_id,
  assignee.username AS assignee_username,
  assignee.nickname AS assignee_nickname,
  tasks.creator_user_id,
  creator.username AS creator_username,
  creator.nickname AS creator_nickname,
  tasks.priority,
  tasks.status,
  tasks.tag,
  tasks.due_at,
  tasks.created_at,
  tasks.updated_at`;

const formatDateTime = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
};

// 数据库使用 snake_case，接口对象统一转换为前端更容易使用的 camelCase。
const toTask = (row: TaskRow): Task => ({
  id: Number(row.id),
  projectId: Number(row.project_id),
  projectName: row.project_name,
  projectStatus: row.project_status,
  title: row.title,
  description: row.description,
  assigneeUserId: Number(row.assignee_user_id),
  assigneeUsername: row.assignee_username,
  assigneeNickname: row.assignee_nickname,
  creatorUserId: Number(row.creator_user_id),
  creatorUsername: row.creator_username,
  creatorNickname: row.creator_nickname,
  priority: row.priority,
  status: row.status,
  tag: row.tag,
  dueAt: formatDateTime(row.due_at),
  createdAt: formatDateTime(row.created_at) ?? "",
  updatedAt: formatDateTime(row.updated_at) ?? ""
});

const TASK_FROM_AND_JOINS = `
  FROM tasks
  INNER JOIN projects ON projects.id = tasks.project_id
  INNER JOIN users AS assignee ON assignee.id = tasks.assignee_user_id
  INNER JOIN users AS creator ON creator.id = tasks.creator_user_id`;

const buildTaskConditions = (
  input: ListTasksInput,
  initialCondition: string,
  initialParameters: Array<string | number>
): { where: string; parameters: Array<string | number> } => {
  const conditions = [initialCondition];
  const parameters = [...initialParameters];

  if (input.status) {
    conditions.push("tasks.status = ?");
    parameters.push(input.status);
  }

  if (input.assigneeUserId) {
    conditions.push("tasks.assignee_user_id = ?");
    parameters.push(input.assigneeUserId);
  }

  if (input.priority) {
    conditions.push("tasks.priority = ?");
    parameters.push(input.priority);
  }

  if (input.tag) {
    conditions.push("tasks.tag = ?");
    parameters.push(input.tag);
  }

  if (input.keyword) {
    const keyword = `%${input.keyword}%`;
    conditions.push("(tasks.title LIKE ? OR tasks.description LIKE ?)");
    parameters.push(keyword, keyword);
  }

  return {
    where: conditions.join(" AND "),
    parameters
  };
};

const findTaskById = async (
  connection: PoolConnection,
  taskId: number
): Promise<Task | null> => {
  const [rows] = await connection.query<TaskRow[]>(
    `SELECT ${TASK_SELECT_FIELDS}
     ${TASK_FROM_AND_JOINS}
     WHERE tasks.id = ?
     LIMIT 1`,
    [taskId]
  );

  const task = rows[0];
  return task ? toTask(task) : null;
};

// 在创建任务的事务中锁住项目和当前操作者的成员关系，防止状态或成员关系在校验后改变。
export const findProjectForTaskWriteForUpdate = async (
  connection: PoolConnection,
  input: { projectId: number; currentUserId: number }
): Promise<TaskProjectWriteTarget | null> => {
  const [rows] = await connection.execute<TaskProjectWriteTargetRow[]>(
    `SELECT projects.owner_user_id, projects.status
     FROM projects
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = projects.id
      AND current_membership.user_id = ?
     WHERE projects.id = ?
     LIMIT 1
     FOR UPDATE`,
    [input.currentUserId, input.projectId]
  );

  const project = rows[0];
  if (!project) {
    return null;
  }

  return {
    ownerUserId: Number(project.owner_user_id),
    status: project.status
  };
};

// 负责人必须是同一项目当前成员；加锁可避免校验通过后成员刚好被移除。
export const hasProjectMemberForUpdate = async (
  connection: PoolConnection,
  input: { projectId: number; userId: number }
): Promise<boolean> => {
  const [rows] = await connection.execute<ProjectMemberRow[]>(
    `SELECT id
     FROM project_members
     WHERE project_id = ? AND user_id = ?
     LIMIT 1
     FOR UPDATE`,
    [input.projectId, input.userId]
  );

  return Boolean(rows[0]);
};

export const insertTask = async (
  connection: PoolConnection,
  input: CreateTaskRepositoryInput
): Promise<Task> => {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO tasks
      (project_id, title, description, assignee_user_id, creator_user_id, priority, status, tag, due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.projectId,
      input.title,
      input.description ?? null,
      input.assigneeUserId,
      input.creatorUserId,
      input.priority,
      input.status,
      input.tag ?? null,
      input.dueAt ?? null
    ]
  );

  const task = await findTaskById(connection, Number(result.insertId));
  if (!task) {
    throw new Error("创建任务后未找到任务记录");
  }

  return task;
};

// 编辑时以任务 ID 为入口，同时限制当前用户必须仍是任务所属项目的成员。
export const findTaskForTaskWriteForUpdate = async (
  connection: PoolConnection,
  input: { taskId: number; currentUserId: number }
): Promise<TaskWriteTarget | null> => {
  const [rows] = await connection.execute<TaskWriteTargetRow[]>(
    `SELECT tasks.id,
            tasks.project_id,
            tasks.status AS task_status,
            projects.owner_user_id,
            projects.status AS project_status
     FROM tasks
     INNER JOIN projects ON projects.id = tasks.project_id
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = tasks.project_id
      AND current_membership.user_id = ?
     WHERE tasks.id = ?
     LIMIT 1
     FOR UPDATE`,
    [input.currentUserId, input.taskId]
  );

  const task = rows[0];
  if (!task) {
    return null;
  }

  return {
    taskId: Number(task.id),
    projectId: Number(task.project_id),
    ownerUserId: Number(task.owner_user_id),
    status: task.project_status,
    taskStatus: task.task_status
  };
};

export const updateTask = async (
  connection: PoolConnection,
  input: CreateTaskRepositoryInput & { taskId: number }
): Promise<Task> => {
  await connection.execute(
    `UPDATE tasks
     SET title = ?,
         description = ?,
         assignee_user_id = ?,
         priority = ?,
         tag = ?,
         due_at = ?
     WHERE id = ?`,
    [
      input.title,
      input.description ?? null,
      input.assigneeUserId,
      input.priority,
      input.tag ?? null,
      input.dueAt ?? null,
      input.taskId
    ]
  );

  const task = await findTaskById(connection, input.taskId);
  if (!task) {
    throw new Error("更新任务后未找到任务记录");
  }

  return task;
};

export const findTasksByProject = async (
  projectId: number,
  input: ListTasksInput
): Promise<{ list: Task[]; total: number }> => {
  const { where, parameters } = buildTaskConditions(input, "tasks.project_id = ?", [projectId]);
  const offset = (input.page - 1) * input.pageSize;

  const [rows] = await db.query<TaskRow[]>(
    `SELECT ${TASK_SELECT_FIELDS}
     ${TASK_FROM_AND_JOINS}
     WHERE ${where}
     ORDER BY tasks.created_at DESC, tasks.id DESC
     LIMIT ? OFFSET ?`,
    [...parameters, input.pageSize, offset]
  );

  const [countRows] = await db.query<TaskCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM tasks
     WHERE ${where}`,
    parameters
  );

  return {
    list: rows.map(toTask),
    total: Number(countRows[0]?.total ?? 0)
  };
};

// 我的任务固定使用当前登录用户作为负责人，并只返回他仍有项目成员关系的任务。
export const findTasksForAssignee = async (
  currentUserId: number,
  input: ListTasksInput
): Promise<{ list: Task[]; total: number }> => {
  const queryInput: ListTasksInput = {
    ...input,
    // 前端即使传入其他负责人 ID，也不能借此查询别人的任务。
    assigneeUserId: undefined
  };
  const { where, parameters } = buildTaskConditions(
    queryInput,
    "tasks.assignee_user_id = ?",
    [currentUserId]
  );
  const offset = (input.page - 1) * input.pageSize;
  const membershipJoin = `
    INNER JOIN project_members AS current_membership
      ON current_membership.project_id = tasks.project_id
     AND current_membership.user_id = ?`;

  const [rows] = await db.query<TaskRow[]>(
    `SELECT ${TASK_SELECT_FIELDS}
     ${TASK_FROM_AND_JOINS}
     ${membershipJoin}
     WHERE ${where}
     ORDER BY tasks.created_at DESC, tasks.id DESC
     LIMIT ? OFFSET ?`,
    [currentUserId, ...parameters, input.pageSize, offset]
  );

  const [countRows] = await db.query<TaskCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM tasks
     ${membershipJoin}
     WHERE ${where}`,
    [currentUserId, ...parameters]
  );

  return {
    list: rows.map(toTask),
    total: Number(countRows[0]?.total ?? 0)
  };
};

// 任务详情同样从任务所属项目的成员关系做数据隔离，非成员不会知道该任务是否存在。
export const findTaskDetailForUser = async (input: {
  taskId: number;
  currentUserId: number;
}): Promise<Task | null> => {
  const [rows] = await db.query<TaskRow[]>(
    `SELECT ${TASK_SELECT_FIELDS}
     ${TASK_FROM_AND_JOINS}
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = tasks.project_id
      AND current_membership.user_id = ?
     WHERE tasks.id = ?
     LIMIT 1`,
    [input.currentUserId, input.taskId]
  );

  const task = rows[0];
  return task ? toTask(task) : null;
};
