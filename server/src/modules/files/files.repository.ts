
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
