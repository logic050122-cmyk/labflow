
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket
} from "mysql2/promise";

import { db } from "../../config/db";

import type {
  FileAccessTarget,
  FileCategory,
  FileWriteTarget,
  ProjectFileListTarget,
  StoredFileRecord
} from "./files.types";

// ============================================================
// 1. Row 类型：描述 MySQL 查询返回的 snake_case 字段
// ============================================================
// 文件查询会 JOIN users，直接带回上传人的用户名和昵称。
interface FileRow extends RowDataPacket {
  id: number;
  project_id: number;
  task_id: number | null;
  uploader_user_id: number;
  uploader_username: string;
  uploader_nickname: string;
  original_name: string;
  stored_name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  category: FileCategory;
  created_at: Date | string;
  updated_at: Date | string;
}

// LEFT JOIN 用于“有权限但还没有文件”的列表，因此文件字段允许为 null。
interface FileListRow extends RowDataPacket {
  membership_project_id: number;
  owner_user_id: number;
  project_status: FileWriteTarget["projectStatus"];
  id: number | null;
  project_id: number | null;
  task_id: number | null;
  uploader_user_id: number | null;
  uploader_username: string | null;
  uploader_nickname: string | null;
  original_name: string | null;
  stored_name: string | null;
  storage_path: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  category: FileCategory | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

interface FileWriteTargetRow extends RowDataPacket {
  project_id: number;
  task_id: number | null;
  owner_user_id: number;
  project_status: FileWriteTarget["projectStatus"];
}

interface FileAccessRow extends FileRow {
  owner_user_id: number;
  project_status: FileAccessTarget["projectStatus"];
}

// ============================================================
// 2. 数据格式转换
// ============================================================
// repository 负责把数据库 snake_case 转成 service 使用的 camelCase。
const formatDateTime = (value: Date | string): string => {
  return value instanceof Date ? value.toISOString() : value;
};

const toStoredFile = (row: FileRow): StoredFileRecord => ({
  id: Number(row.id),
  projectId: Number(row.project_id),
  taskId: row.task_id === null ? null : Number(row.task_id),
  uploaderUserId: Number(row.uploader_user_id),
  uploaderUsername: row.uploader_username,
  uploaderNickname: row.uploader_nickname,
  originalName: row.original_name,
  storedName: row.stored_name,
  storagePath: row.storage_path,
  sizeBytes: Number(row.size_bytes),
  mimeType: row.mime_type,
  category: row.category,
  createdAt: formatDateTime(row.created_at),
  updatedAt: formatDateTime(row.updated_at)
});

// 列表查询可能返回只有项目/任务信息、没有文件信息的空行。
// id 为 null 表示成员有查看权限，但当前列表确实为空。
const toStoredFileFromListRow = (
  row: FileListRow
): StoredFileRecord | null => {
  if (row.id === null) {
    return null;
  }

  if (
    row.project_id === null ||
    row.uploader_user_id === null ||
    row.uploader_username === null ||
    row.uploader_nickname === null ||
    row.original_name === null ||
    row.stored_name === null ||
    row.storage_path === null ||
    row.size_bytes === null ||
    row.mime_type === null ||
    row.category === null ||
    row.created_at === null ||
    row.updated_at === null
  ) {
    throw new Error("文件关联信息不完整");
  }

  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    taskId: row.task_id === null ? null : Number(row.task_id),
    uploaderUserId: Number(row.uploader_user_id),
    uploaderUsername: row.uploader_username,
    uploaderNickname: row.uploader_nickname,
    originalName: row.original_name,
    storedName: row.stored_name,
    storagePath: row.storage_path,
    sizeBytes: Number(row.size_bytes),
    mimeType: row.mime_type,
    category: row.category,
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at)
  };
};

// 多个文件查询复用同一组字段，避免列表、下载、删除返回的内部数据不一致。
const FILE_SELECT_FIELDS = `
  files.id,
  files.project_id,
  files.task_id,
  files.uploader_user_id,
  uploader.username AS uploader_username,
  uploader.nickname AS uploader_nickname,
  files.original_name,
  files.stored_name,
  files.storage_path,
  files.size_bytes,
  files.mime_type,
  files.category,
  files.created_at,
  files.updated_at`;

// ============================================================
// 3. 文件列表查询
// ============================================================
// 从项目和当前成员关系开始查询，因此无文件时仍能区分“空列表”和“无权限”。
export const findProjectFilesForMember = async (
  projectId: number,
  currentUserId: number
): Promise<ProjectFileListTarget | null> => {
  const [rows] = await db.query<FileListRow[]>(
    `SELECT projects.id AS membership_project_id,
            projects.owner_user_id,
            projects.status AS project_status,
            ${FILE_SELECT_FIELDS}
     FROM projects
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = projects.id
      AND current_membership.user_id = ?
     LEFT JOIN files
       ON files.project_id = projects.id
      AND files.category = 'project'
     LEFT JOIN users AS uploader ON uploader.id = files.uploader_user_id
     WHERE projects.id = ?
     ORDER BY files.created_at DESC, files.id DESC`,
    [currentUserId, projectId]
  );

  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  return {
    ownerUserId: Number(firstRow.owner_user_id),
    projectStatus: firstRow.project_status,
    files: rows
      .map(toStoredFileFromListRow)
      .filter((file): file is StoredFileRecord => file !== null)
  };
};

// 从任务反查项目成员关系，只返回当前任务的 task 类附件。
export const findTaskFilesForMember = async (
  taskId: number,
  currentUserId: number
): Promise<ProjectFileListTarget | null> => {
  const [rows] = await db.query<FileListRow[]>(
    `SELECT projects.id AS membership_project_id,
            projects.owner_user_id,
            projects.status AS project_status,
            ${FILE_SELECT_FIELDS}
     FROM tasks
     INNER JOIN projects ON projects.id = tasks.project_id
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = tasks.project_id
      AND current_membership.user_id = ?
     LEFT JOIN files
       ON files.task_id = tasks.id
      AND files.category = 'task'
     LEFT JOIN users AS uploader ON uploader.id = files.uploader_user_id
     WHERE tasks.id = ?
     ORDER BY files.created_at DESC, files.id DESC`,
    [currentUserId, taskId]
  );

  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  return {
    ownerUserId: Number(firstRow.owner_user_id),
    projectStatus: firstRow.project_status,
    files: rows
      .map(toStoredFileFromListRow)
      .filter((file): file is StoredFileRecord => file !== null)
  };
};

// ============================================================
// 4. 上传目标查询
// ============================================================
// 上传前锁定项目和成员关系，service 随后在同一事务中写入文件元数据。
export const findProjectForFileUpload = async (
  connection: PoolConnection,
  input: { projectId: number; currentUserId: number }
): Promise<FileWriteTarget | null> => {
  const [rows] = await connection.execute<FileWriteTargetRow[]>(
    `SELECT projects.id AS project_id,
            NULL AS task_id,
            projects.owner_user_id,
            projects.status AS project_status
     FROM projects
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = projects.id
      AND current_membership.user_id = ?
     WHERE projects.id = ?
     LIMIT 1
     FOR UPDATE`,
    [input.currentUserId, input.projectId]
  );

  const row = rows[0];
  return row
    ? {
        projectId: Number(row.project_id),
        taskId: null,
        ownerUserId: Number(row.owner_user_id),
        projectStatus: row.project_status
      }
    : null;
};

// 任务附件上传同时查出 taskId、projectId、Owner 和项目状态。
export const findTaskForFileUpload = async (
  connection: PoolConnection,
  input: { taskId: number; currentUserId: number }
): Promise<FileWriteTarget | null> => {
  const [rows] = await connection.execute<FileWriteTargetRow[]>(
    `SELECT tasks.project_id,
            tasks.id AS task_id,
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

  const row = rows[0];
  return row
    ? {
        projectId: Number(row.project_id),
        taskId: row.task_id === null ? null : Number(row.task_id),
        ownerUserId: Number(row.owner_user_id),
        projectStatus: row.project_status
      }
    : null;
};

// ============================================================
// 5. 文件元数据写入
// ============================================================
// 插入后在同一事务连接中查回完整记录，补齐上传人展示信息。
const findFileById = async (
  connection: PoolConnection,
  fileId: number
): Promise<StoredFileRecord | null> => {
  const [rows] = await connection.query<FileRow[]>(
    `SELECT ${FILE_SELECT_FIELDS}
     FROM files
     INNER JOIN users AS uploader ON uploader.id = files.uploader_user_id
     WHERE files.id = ?
     LIMIT 1`,
    [fileId]
  );

  const row = rows[0];
  return row ? toStoredFile(row) : null;
};

export const insertFile = async (
  connection: PoolConnection,
  input: {
    projectId: number;
    taskId: number | null;
    uploaderUserId: number;
    originalName: string;
    storedName: string;
    storagePath: string;
    sizeBytes: number;
    mimeType: string;
    category: FileCategory;
  }
): Promise<StoredFileRecord> => {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO files (
       project_id,
       task_id,
       uploader_user_id,
       original_name,
       stored_name,
       storage_path,
       size_bytes,
       mime_type,
       category
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.projectId,
      input.taskId,
      input.uploaderUserId,
      input.originalName,
      input.storedName,
      input.storagePath,
      input.sizeBytes,
      input.mimeType,
      input.category
    ]
  );

  const file = await findFileById(connection, Number(result.insertId));
  if (!file) {
    throw new Error("新增文件后未找到文件记录");
  }

  return file;
};

// ============================================================
// 6. 下载和删除目标查询
// ============================================================
// 下载要求当前用户仍是文件所属项目的成员。
export const findFileForMember = async (
  fileId: number,
  currentUserId: number
): Promise<FileAccessTarget | null> => {
  const [rows] = await db.query<FileAccessRow[]>(
    `SELECT ${FILE_SELECT_FIELDS},
            projects.owner_user_id,
            projects.status AS project_status
     FROM files
     INNER JOIN projects ON projects.id = files.project_id
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = files.project_id
      AND current_membership.user_id = ?
     INNER JOIN users AS uploader ON uploader.id = files.uploader_user_id
     WHERE files.id = ?
     LIMIT 1`,
    [currentUserId, fileId]
  );

  const row = rows[0];
  return row
    ? {
        ownerUserId: Number(row.owner_user_id),
        projectStatus: row.project_status,
        file: toStoredFile(row)
      }
    : null;
};

// 删除查询使用 FOR UPDATE 锁住文件记录，避免两个请求同时删除同一文件。
export const findFileForDelete = async (
  connection: PoolConnection,
  fileId: number,
  currentUserId: number
): Promise<FileAccessTarget | null> => {
  const [rows] = await connection.execute<FileAccessRow[]>(
    `SELECT ${FILE_SELECT_FIELDS},
            projects.owner_user_id,
            projects.status AS project_status
     FROM files
     INNER JOIN projects ON projects.id = files.project_id
     INNER JOIN project_members AS current_membership
       ON current_membership.project_id = files.project_id
      AND current_membership.user_id = ?
     INNER JOIN users AS uploader ON uploader.id = files.uploader_user_id
     WHERE files.id = ?
     LIMIT 1
     FOR UPDATE`,
    [currentUserId, fileId]
  );

  const row = rows[0];
  return row
    ? {
        ownerUserId: Number(row.owner_user_id),
        projectStatus: row.project_status,
        file: toStoredFile(row)
      }
    : null;
};

// service 完成权限判断后才调用这里；repository 只负责执行删除 SQL。
export const deleteFileById = async (
  connection: PoolConnection,
  fileId: number
): Promise<void> => {
  const [result] = await connection.execute<ResultSetHeader>(
    `DELETE FROM files WHERE id = ?`,
    [fileId]
  );

  if (result.affectedRows !== 1) {
    throw new Error("删除文件时未找到文件记录");
  }
};
