import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket
} from "mysql2/promise";

import { db } from "../../config/db";

import type {
  Comment,
  CommentCreateTarget,
  CommentDeleteTarget
} from "./comments.types";

// ============================================================
// 1. Row 类型：描述数据库返回的行结构
// ============================================================
// 查询评论时 JOIN users 表，带出 username 和 nickname。
interface CommentRow extends RowDataPacket {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  nickname: string;
  content: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// 新增评论前，查任务所属项目并校验当前用户是否为项目成员。
interface CommentCreateTargetRow extends RowDataPacket {
  id: number;
  project_id: number;
  project_status: CommentCreateTarget["projectStatus"];
}

// 删除评论前，查评论人和项目 Owner。
interface CommentDeleteTargetRow extends RowDataPacket {
  id: number;
  task_id: number;
  user_id: number;
  project_id: number;
  owner_user_id: number;
}

// ============================================================
// 2. 格式化工具函数（从 tasks.repository.ts 复制过来）
// ============================================================
// 数据库使用 snake_case，接口对象统一转换为前端更容易使用的 camelCase。
const formatDateTime = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
};

// 把数据库行转成接口返回的 Comment 对象。
const toComment = (row: CommentRow): Comment => ({
  id: Number(row.id),
  taskId: Number(row.task_id),
  userId: Number(row.user_id),
  username: row.username,
  nickname: row.nickname,
  content: row.content,
  createdAt: formatDateTime(row.created_at) ?? "",
  updatedAt: formatDateTime(row.updated_at) ?? ""
});

// 评论查询复用同一组字段，避免不同接口返回字段不一致。
const COMMENT_SELECT_FIELDS = `
  task_comments.id,
  task_comments.task_id,
  task_comments.user_id,
  users.username,
  users.nickname,
  task_comments.content,
  task_comments.created_at,
  task_comments.updated_at`;

const COMMENT_FROM_AND_JOIN = `
  FROM task_comments
  INNER JOIN users ON users.id = task_comments.user_id`;

// ============================================================
// 3. 查询函数
// ============================================================
// 获取某个任务的全部评论，按创建时间升序（最早发的在最前面）。
// 只读查询，不需要事务，直接用 db.query。
export const findCommentsByTaskId = async (taskId: number): Promise<Comment[]> => {
  const [rows] = await db.query<CommentRow[]>(
    `SELECT ${COMMENT_SELECT_FIELDS}
     ${COMMENT_FROM_AND_JOIN}
     WHERE task_comments.task_id = ?
     ORDER BY task_comments.created_at ASC, task_comments.id ASC`,
    [taskId]
  );

  return rows.map(toComment);
};

// 插入评论后，用这个函数查回完整评论（带 username 和 nickname）。
// 使用 connection 参数，因为调用方在事务中。
const findCommentById = async (
  connection: PoolConnection,
  commentId: number
): Promise<Comment | null> => {
  const [rows] = await connection.query<CommentRow[]>(
    `SELECT ${COMMENT_SELECT_FIELDS}
     ${COMMENT_FROM_AND_JOIN}
     WHERE task_comments.id = ?
     LIMIT 1`,
    [commentId]
  );

  const comment = rows[0];
  return comment ? toComment(comment) : null;
};

// 新增评论前，查任务所属项目并校验当前用户是否为项目成员。
// 加锁（FOR UPDATE）防止校验后项目状态或成员关系被改变。
// 写法和 tasks.repository.ts 的 findTaskForStartForUpdate 一致。
export const findTaskForCommentWrite = async (
  connection: PoolConnection,
  input: { taskId: number; currentUserId: number }
): Promise<CommentCreateTarget | null> => {
  const [rows] = await connection.execute<CommentCreateTargetRow[]>(
    `SELECT tasks.id,
            tasks.project_id,
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
    projectStatus: task.project_status
  };
};

// 列表查询前校验当前用户是否为项目成员。
// 和 findTaskForCommentWrite 的区别：不带 FOR UPDATE，用 db.query，适合只读场景。
export const findTaskForCommentRead = async (
  taskId: number,
  currentUserId: number
): Promise<CommentCreateTarget | null> => {
  const [rows] = await db.query<CommentCreateTargetRow[]>(
    `SELECT tasks.id,
            tasks.project_id,
            projects.status AS project_status
     FROM tasks
     INNER JOIN projects ON projects.id = tasks.project_id
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = tasks.project_id
      AND current_membership.user_id = ?
     WHERE tasks.id = ?
     LIMIT 1`,
    [currentUserId, taskId]
  );

  const task = rows[0];
  if (!task) {
    return null;
  }

  return {
    taskId: Number(task.id),
    projectId: Number(task.project_id),
    projectStatus: task.project_status
  };
};

// 插入评论，使用 connection 保证在事务中执行。
// 插入后用 findCommentById 查回完整评论（带 username 和 nickname）。
export const insertComment = async (
  connection: PoolConnection,
  input: { taskId: number; userId: number; content: string }
): Promise<Comment> => {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO task_comments (task_id, user_id, content)
     VALUES (?, ?, ?)`,
    [input.taskId, input.userId, input.content]
  );

  const comment = await findCommentById(connection, Number(result.insertId));
  if (!comment) {
    throw new Error("新增评论后未找到评论记录");
  }

  return comment;
};

// 删除评论前，通过 task_comments -> tasks -> projects 一次查齐权限判断需要的数据。
// 加锁（FOR UPDATE）防止并发删除同一条评论。
export const findCommentForDelete = async (
  connection: PoolConnection,
  commentId: number
): Promise<CommentDeleteTarget | null> => {
  const [rows] = await connection.execute<CommentDeleteTargetRow[]>(
    `SELECT task_comments.id,
            task_comments.task_id,
            task_comments.user_id,
            tasks.project_id,
            projects.owner_user_id
     FROM task_comments
     INNER JOIN tasks ON tasks.id = task_comments.task_id
     INNER JOIN projects ON projects.id = tasks.project_id
     WHERE task_comments.id = ?
     LIMIT 1
     FOR UPDATE`,
    [commentId]
  );

  const comment = rows[0];
  if (!comment) {
    return null;
  }

  return {
    commentId: Number(comment.id),
    taskId: Number(comment.task_id),
    projectId: Number(comment.project_id),
    authorUserId: Number(comment.user_id),
    ownerUserId: Number(comment.owner_user_id)
  };
};

// 按 ID 删除评论，检查 affectedRows 确保确实删了一条。
export const deleteCommentById = async (
  connection: PoolConnection,
  commentId: number
): Promise<void> => {
  const [result] = await connection.execute<ResultSetHeader>(
    `DELETE FROM task_comments WHERE id = ?`,
    [commentId]
  );

  if (result.affectedRows !== 1) {
    throw new Error("删除评论时未找到评论记录");
  }
};
