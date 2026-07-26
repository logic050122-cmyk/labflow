from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write_file(relative_path: str, content: str) -> None:
    path = ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = ROOT / relative_path
    content = path.read_text(encoding="utf-8")
    if old not in content:
        raise RuntimeError(f"未找到待替换内容: {relative_path}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


write_file(
    "server/src/config/upload.ts",
    r"""
import multer from "multer";
import type { RequestHandler } from "express";

import { AppError } from "../common/http";

export const FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_FILE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed"
]);

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: FILE_MAX_SIZE_BYTES
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_FILE_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError("不支持该文件类型", 400, 40001));
      return;
    }

    callback(null, true);
  }
});

const singleFile = uploader.single("file");

// Multer 只负责解析 multipart/form-data 和文件大小、类型限制。
// 具体项目、任务、成员和 Owner 权限仍由 files.service.ts 校验。
export const uploadSingleFile: RequestHandler = (request, response, next) => {
  singleFile(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError("文件大小不能超过 10 MB", 400, 40001));
        return;
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        next(new AppError("上传字段名必须是 file，且一次只能上传一个文件", 400, 40001));
        return;
      }

      next(new AppError("文件上传参数不正确", 400, 40001));
      return;
    }

    next(error);
  });
};
""",
)

write_file(
    "server/src/modules/files/files.types.ts",
    r"""
import type { ProjectStatus } from "../projects/projects.types";

export type FileCategory = "project" | "task";

export interface StoredFileRecord {
  id: number;
  projectId: number;
  taskId: number | null;
  uploaderUserId: number;
  uploaderUsername: string;
  uploaderNickname: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
  category: FileCategory;
  createdAt: string;
  updatedAt: string;
}

export interface FileListItem {
  id: number;
  projectId: number;
  taskId: number | null;
  uploaderUserId: number;
  uploaderUsername: string;
  uploaderNickname: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  category: FileCategory;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
}

export interface UploadFileInput {
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  buffer: Buffer;
}

export interface ListFilesResult {
  files: FileListItem[];
}

export interface UploadFileResult {
  file: FileListItem;
}

export interface DeleteFileResult {
  deletedFileId: number;
}

export interface DownloadFileResult {
  absolutePath: string;
  originalName: string;
  mimeType: string;
}

export interface ProjectFileListTarget {
  ownerUserId: number;
  projectStatus: ProjectStatus;
  files: StoredFileRecord[];
}

export interface FileWriteTarget {
  projectId: number;
  taskId: number | null;
  ownerUserId: number;
  projectStatus: ProjectStatus;
}

export interface FileAccessTarget {
  ownerUserId: number;
  projectStatus: ProjectStatus;
  file: StoredFileRecord;
}
""",
)

write_file(
    "server/src/modules/files/files.validator.ts",
    r"""
import { AppError } from "../../common/http";
import {
  ALLOWED_FILE_MIME_TYPES,
  FILE_MAX_SIZE_BYTES
} from "../../config/upload";

import type { UploadFileInput } from "./files.types";

const ORIGINAL_NAME_MAX_LENGTH = 255;

const validatePositiveIdParam = (value: unknown, fieldName: string): number => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue < 1) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  return numberValue;
};

export const validateProjectIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "项目 ID");
};

export const validateTaskIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "任务 ID");
};

export const validateFileIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "文件 ID");
};

export const validateUploadedFile = (
  file: Express.Multer.File | undefined
): UploadFileInput => {
  if (!file) {
    throw new AppError("请选择要上传的文件，上传字段名必须是 file", 400, 40001);
  }

  const originalName = file.originalname.trim();
  if (!originalName) {
    throw new AppError("文件名不能为空", 400, 40001);
  }

  if (originalName.length > ORIGINAL_NAME_MAX_LENGTH) {
    throw new AppError(
      `文件名不能超过 ${ORIGINAL_NAME_MAX_LENGTH} 个字符`,
      400,
      40001
    );
  }

  if (file.size < 1) {
    throw new AppError("不能上传空文件", 400, 40001);
  }

  if (file.size > FILE_MAX_SIZE_BYTES) {
    throw new AppError("文件大小不能超过 10 MB", 400, 40001);
  }

  if (!ALLOWED_FILE_MIME_TYPES.has(file.mimetype)) {
    throw new AppError("不支持该文件类型", 400, 40001);
  }

  return {
    originalName,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    buffer: file.buffer
  };
};
""",
)

write_file(
    "server/src/modules/files/files.storage.ts",
    r"""
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { UploadFileInput } from "./files.types";

const UPLOAD_ROOT = path.resolve(__dirname, "../../../uploads");

const getSafeExtension = (originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase();

  if (!/^\.[a-z0-9]{1,10}$/.test(extension)) {
    return "";
  }

  return extension;
};

const resolveInsideUploadRoot = (storagePath: string): string => {
  const absolutePath = path.resolve(
    UPLOAD_ROOT,
    ...storagePath.split("/").filter(Boolean)
  );
  const rootWithSeparator = `${UPLOAD_ROOT}${path.sep}`;

  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(rootWithSeparator)) {
    throw new Error("文件存储路径不安全");
  }

  return absolutePath;
};

export const saveUploadedFile = async (input: {
  projectId: number;
  taskId: number | null;
  file: UploadFileInput;
}): Promise<{ storedName: string; storagePath: string }> => {
  const storedName = `${randomUUID()}${getSafeExtension(input.file.originalName)}`;
  const directory = input.taskId
    ? path.posix.join(
        "projects",
        String(input.projectId),
        "tasks",
        String(input.taskId)
      )
    : path.posix.join("projects", String(input.projectId), "project-files");
  const storagePath = path.posix.join(directory, storedName);
  const absolutePath = resolveInsideUploadRoot(storagePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.file.buffer, { flag: "wx" });

  return { storedName, storagePath };
};

export const resolveStoredFilePath = (storagePath: string): string => {
  return resolveInsideUploadRoot(storagePath);
};

export const removeStoredFile = async (storagePath: string): Promise<void> => {
  try {
    await unlink(resolveInsideUploadRoot(storagePath));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
};
""",
)

write_file(
    "server/src/modules/files/files.repository.ts",
    r"""
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
""",
)

write_file(
    "server/src/modules/files/files.service.ts",
    r"""
import { access } from "node:fs/promises";
import type { PoolConnection } from "mysql2/promise";

import { AppError } from "../../common/http";
import { db } from "../../config/db";

import {
  deleteFileById,
  findFileForDelete,
  findFileForMember,
  findProjectFilesForMember,
  findProjectForFileUpload,
  findTaskFilesForMember,
  findTaskForFileUpload,
  insertFile
} from "./files.repository";
import {
  removeStoredFile,
  resolveStoredFilePath,
  saveUploadedFile
} from "./files.storage";
import type {
  DeleteFileResult,
  DownloadFileResult,
  FileListItem,
  FileWriteTarget,
  ListFilesResult,
  StoredFileRecord,
  UploadFileInput,
  UploadFileResult
} from "./files.types";

const toFileListItem = (
  file: StoredFileRecord,
  context: {
    currentUserId: number;
    ownerUserId: number;
    canWrite: boolean;
  }
): FileListItem => ({
  id: file.id,
  projectId: file.projectId,
  taskId: file.taskId,
  uploaderUserId: file.uploaderUserId,
  uploaderUsername: file.uploaderUsername,
  uploaderNickname: file.uploaderNickname,
  originalName: file.originalName,
  sizeBytes: file.sizeBytes,
  mimeType: file.mimeType,
  category: file.category,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
  canDelete:
    context.canWrite &&
    (file.uploaderUserId === context.currentUserId ||
      context.ownerUserId === context.currentUserId)
});

const ensureProjectWritable = (target: FileWriteTarget): void => {
  if (target.projectStatus === "archived") {
    throw new AppError("项目已归档，不允许上传或删除文件", 409, 40904);
  }
};

export const listProjectFiles = async (
  projectId: number,
  currentUserId: number
): Promise<ListFilesResult> => {
  const target = await findProjectFilesForMember(projectId, currentUserId);
  if (!target) {
    throw new AppError("项目不存在或你不是项目成员", 404, 40401);
  }

  return {
    files: target.files.map((file) =>
      toFileListItem(file, {
        currentUserId,
        ownerUserId: target.ownerUserId,
        canWrite: target.projectStatus !== "archived"
      })
    )
  };
};

export const listTaskFiles = async (
  taskId: number,
  currentUserId: number
): Promise<ListFilesResult> => {
  const target = await findTaskFilesForMember(taskId, currentUserId);
  if (!target) {
    throw new AppError("任务不存在或你不是所属项目成员", 404, 40401);
  }

  return {
    files: target.files.map((file) =>
      toFileListItem(file, {
        currentUserId,
        ownerUserId: target.ownerUserId,
        canWrite: target.projectStatus !== "archived"
      })
    )
  };
};

const uploadFileWithLock = async (input: {
  file: UploadFileInput;
  currentUserId: number;
  notFoundMessage: string;
  requireOwner: boolean;
  findTarget: (connection: PoolConnection) => Promise<FileWriteTarget | null>;
}): Promise<UploadFileResult> => {
  const connection = await db.getConnection();
  let savedStoragePath: string | null = null;

  try {
    await connection.beginTransaction();

    // 资源归属、成员关系、项目状态和元数据写入都在同一事务连接中完成。
    const target = await input.findTarget(connection);
    if (!target) {
      throw new AppError(input.notFoundMessage, 404, 40401);
    }

    if (input.requireOwner && target.ownerUserId !== input.currentUserId) {
      throw new AppError("只有项目负责人可以上传项目文件", 403, 40301);
    }

    ensureProjectWritable(target);

    const savedFile = await saveUploadedFile({
      projectId: target.projectId,
      taskId: target.taskId,
      file: input.file
    });
    savedStoragePath = savedFile.storagePath;

    const file = await insertFile(connection, {
      projectId: target.projectId,
      taskId: target.taskId,
      uploaderUserId: input.currentUserId,
      originalName: input.file.originalName,
      storedName: savedFile.storedName,
      storagePath: savedFile.storagePath,
      sizeBytes: input.file.sizeBytes,
      mimeType: input.file.mimeType,
      category: target.taskId === null ? "project" : "task"
    });

    await connection.commit();

    return {
      file: toFileListItem(file, {
        currentUserId: input.currentUserId,
        ownerUserId: target.ownerUserId,
        canWrite: true
      })
    };
  } catch (error) {
    await connection.rollback();

    // 元数据写入失败时同步清理已经写到磁盘的文件，避免留下半成品。
    if (savedStoragePath) {
      try {
        await removeStoredFile(savedStoragePath);
      } catch (cleanupError) {
        console.error("清理上传失败文件时出错", cleanupError);
      }
    }

    throw error;
  } finally {
    connection.release();
  }
};

export const uploadProjectFile = async (
  projectId: number,
  file: UploadFileInput,
  currentUserId: number
): Promise<UploadFileResult> => {
  return await uploadFileWithLock({
    file,
    currentUserId,
    notFoundMessage: "项目不存在或你不是项目成员",
    requireOwner: true,
    findTarget: async (connection) =>
      await findProjectForFileUpload(connection, {
        projectId,
        currentUserId
      })
  });
};

export const uploadTaskFile = async (
  taskId: number,
  file: UploadFileInput,
  currentUserId: number
): Promise<UploadFileResult> => {
  return await uploadFileWithLock({
    file,
    currentUserId,
    notFoundMessage: "任务不存在或你不是所属项目成员",
    requireOwner: false,
    findTarget: async (connection) =>
      await findTaskForFileUpload(connection, {
        taskId,
        currentUserId
      })
  });
};

export const getFileDownload = async (
  fileId: number,
  currentUserId: number
): Promise<DownloadFileResult> => {
  const target = await findFileForMember(fileId, currentUserId);
  if (!target) {
    throw new AppError("文件不存在或你不是所属项目成员", 404, 40401);
  }

  const absolutePath = resolveStoredFilePath(target.file.storagePath);

  try {
    await access(absolutePath);
  } catch {
    throw new AppError("文件内容不存在", 404, 40402);
  }

  return {
    absolutePath,
    originalName: target.file.originalName,
    mimeType: target.file.mimeType
  };
};

export const deleteFile = async (
  fileId: number,
  currentUserId: number
): Promise<DeleteFileResult> => {
  const connection = await db.getConnection();
  let storagePath: string | null = null;

  try {
    await connection.beginTransaction();

    const target = await findFileForDelete(connection, fileId, currentUserId);
    if (!target) {
      throw new AppError("文件不存在或你不是所属项目成员", 404, 40401);
    }

    ensureProjectWritable({
      projectId: target.file.projectId,
      taskId: target.file.taskId,
      ownerUserId: target.ownerUserId,
      projectStatus: target.projectStatus
    });

    const isUploader = target.file.uploaderUserId === currentUserId;
    const isProjectOwner = target.ownerUserId === currentUserId;
    if (!isUploader && !isProjectOwner) {
      throw new AppError("只能删除自己上传的文件，或由项目负责人删除", 403, 40301);
    }

    storagePath = target.file.storagePath;
    await deleteFileById(connection, fileId);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (storagePath) {
    try {
      await removeStoredFile(storagePath);
    } catch (error) {
      // 数据库记录已经删除，磁盘清理失败只记录服务端日志，避免接口假装元数据仍存在。
      console.error("删除文件记录后清理磁盘文件失败", error);
    }
  }

  return { deletedFileId: fileId };
};
""",
)

write_file(
    "server/src/modules/files/files.controller.ts",
    r"""
import type { RequestHandler } from "express";

import { AppError, sendSuccess } from "../../common/http";

import {
  deleteFile,
  getFileDownload,
  listProjectFiles,
  listTaskFiles,
  uploadProjectFile,
  uploadTaskFile
} from "./files.service";
import {
  validateFileIdParam,
  validateProjectIdParam,
  validateTaskIdParam,
  validateUploadedFile
} from "./files.validator";

const requireCurrentUserId = (userId: number | undefined): number => {
  if (!userId) {
    throw new AppError("请先登录", 401, 40102);
  }

  return userId;
};

export const listForProject: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const projectId = validateProjectIdParam(request.params.projectId);
    const result = await listProjectFiles(projectId, currentUserId);

    sendSuccess(response, result, "项目文件获取成功");
  } catch (error) {
    next(error);
  }
};

export const uploadForProject: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const projectId = validateProjectIdParam(request.params.projectId);
    const file = validateUploadedFile(request.file);
    const result = await uploadProjectFile(projectId, file, currentUserId);

    sendSuccess(response, result, "项目文件上传成功");
  } catch (error) {
    next(error);
  }
};

export const listForTask: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const taskId = validateTaskIdParam(request.params.taskId);
    const result = await listTaskFiles(taskId, currentUserId);

    sendSuccess(response, result, "任务附件获取成功");
  } catch (error) {
    next(error);
  }
};

export const uploadForTask: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const taskId = validateTaskIdParam(request.params.taskId);
    const file = validateUploadedFile(request.file);
    const result = await uploadTaskFile(taskId, file, currentUserId);

    sendSuccess(response, result, "任务附件上传成功");
  } catch (error) {
    next(error);
  }
};

export const download: RequestHandler = async (request, response, next) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const fileId = validateFileIdParam(request.params.fileId);
    const result = await getFileDownload(fileId, currentUserId);

    response.type(result.mimeType);
    response.download(result.absolutePath, result.originalName, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const remove: RequestHandler = async (request, response, next) => {
  try {
    const currentUserId = requireCurrentUserId(request.userId);
    const fileId = validateFileIdParam(request.params.fileId);
    const result = await deleteFile(fileId, currentUserId);

    sendSuccess(response, result, "文件删除成功");
  } catch (error) {
    next(error);
  }
};
""",
)

write_file(
    "server/src/modules/files/files.routes.ts",
    r"""
import { Router } from "express";

import { uploadSingleFile } from "../../config/upload";
import { authenticate } from "../../middlewares/auth.middleware";

import {
  download,
  listForProject,
  listForTask,
  remove,
  uploadForProject,
  uploadForTask
} from "./files.controller";

export const fileRoutes = Router();

fileRoutes.get("/projects/:projectId/files", authenticate, listForProject);
fileRoutes.post(
  "/projects/:projectId/files",
  authenticate,
  uploadSingleFile,
  uploadForProject
);

fileRoutes.get("/tasks/:taskId/files", authenticate, listForTask);
fileRoutes.post(
  "/tasks/:taskId/files",
  authenticate,
  uploadSingleFile,
  uploadForTask
);

fileRoutes.get("/files/:fileId/download", authenticate, download);
fileRoutes.delete("/files/:fileId", authenticate, remove);
""",
)

write_file(
    "web/src/types/files.ts",
    r"""
export type FileCategory = "project" | "task";

export interface FileListItem {
  id: number;
  projectId: number;
  taskId: number | null;
  uploaderUserId: number;
  uploaderUsername: string;
  uploaderNickname: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  category: FileCategory;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
}

export interface ListFilesResult {
  files: FileListItem[];
}

export interface UploadFileResult {
  file: FileListItem;
}

export interface DeleteFileResult {
  deletedFileId: number;
}
""",
)

write_file(
    "web/src/api/files.ts",
    r"""
import axios from "axios";

import http, { request } from "@/api/http";
import type { ApiResponse } from "@/types/api";
import type {
  DeleteFileResult,
  ListFilesResult,
  UploadFileResult
} from "@/types/files";

const createFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

export async function getProjectFiles(projectId: number) {
  return await request<ListFilesResult>({
    method: "GET",
    url: `/projects/${projectId}/files`
  });
}

export async function uploadProjectFile(projectId: number, file: File) {
  return await request<UploadFileResult>({
    method: "POST",
    url: `/projects/${projectId}/files`,
    data: createFormData(file),
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
}

export async function getTaskFiles(taskId: number) {
  return await request<ListFilesResult>({
    method: "GET",
    url: `/tasks/${taskId}/files`
  });
}

export async function uploadTaskFile(taskId: number, file: File) {
  return await request<UploadFileResult>({
    method: "POST",
    url: `/tasks/${taskId}/files`,
    data: createFormData(file),
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
}

export async function deleteFile(fileId: number) {
  return await request<DeleteFileResult>({
    method: "DELETE",
    url: `/files/${fileId}`
  });
}

export async function downloadFile(fileId: number): Promise<Blob> {
  try {
    const response = await http.get<Blob>(`/files/${fileId}/download`, {
      responseType: "blob"
    });

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError<Blob>(error) && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const result = JSON.parse(text) as ApiResponse<null>;
        throw new Error(result.message || "文件下载失败");
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== "文件下载失败") {
          throw parseError;
        }
      }
    }

    throw error instanceof Error ? error : new Error("文件下载失败");
  }
}
""",
)

write_file(
    "web/src/components/files/FileListPanel.vue",
    r"""
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  deleteFile,
  downloadFile,
  getProjectFiles,
  getTaskFiles,
  uploadProjectFile,
  uploadTaskFile
} from "@/api/files";
import type { FileListItem } from "@/types/files";
import type {
  ProjectRole,
  ProjectStatus
} from "@/types/projects";

const props = withDefaults(
  defineProps<{
    projectId: number;
    taskId?: number;
    projectRole?: ProjectRole;
    projectStatus: ProjectStatus;
    card?: boolean;
  }>(),
  {
    taskId: undefined,
    projectRole: undefined,
    card: false
  }
);

const files = ref<FileListItem[]>([]);
const loading = ref(false);
const uploading = ref(false);
const deletingFileId = ref<number | null>(null);
const downloadingFileId = ref<number | null>(null);
const errorMessage = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const isTaskAttachment = computed(() => props.taskId !== undefined);
const canUpload = computed(() => {
  if (props.projectStatus === "archived") {
    return false;
  }

  return isTaskAttachment.value || props.projectRole === "owner";
});

const title = computed(() =>
  isTaskAttachment.value ? "任务附件" : "项目文件"
);

const loadFiles = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = isTaskAttachment.value
      ? await getTaskFiles(props.taskId as number)
      : await getProjectFiles(props.projectId);
    files.value = result.files;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : `${title.value}加载失败`;
  } finally {
    loading.value = false;
  }
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
};

const openFilePicker = () => {
  if (!canUpload.value || uploading.value) {
    return;
  }

  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0];
  input.value = "";

  if (!selectedFile || uploading.value || !canUpload.value) {
    return;
  }

  if (selectedFile.size < 1) {
    ElMessage.warning("不能上传空文件");
    return;
  }

  if (selectedFile.size > 10 * 1024 * 1024) {
    ElMessage.warning("文件大小不能超过 10 MB");
    return;
  }

  uploading.value = true;

  try {
    const result = isTaskAttachment.value
      ? await uploadTaskFile(props.taskId as number, selectedFile)
      : await uploadProjectFile(props.projectId, selectedFile);
    files.value.unshift(result.file);
    ElMessage.success(`${title.value}上传成功`);
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : `${title.value}上传失败`
    );
  } finally {
    uploading.value = false;
  }
};

const handleDownload = async (file: FileListItem) => {
  if (downloadingFileId.value !== null) {
    return;
  }

  downloadingFileId.value = file.id;

  try {
    const blob = await downloadFile(file.id);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件下载失败");
  } finally {
    downloadingFileId.value = null;
  }
};

const handleDelete = async (file: FileListItem) => {
  if (!file.canDelete || deletingFileId.value !== null) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除文件“${file.originalName}”吗？删除后无法恢复。`,
      "删除文件",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }

  deletingFileId.value = file.id;

  try {
    await deleteFile(file.id);
    files.value = files.value.filter((item) => item.id !== file.id);
    ElMessage.success("文件删除成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件删除失败");
  } finally {
    deletingFileId.value = null;
  }
};

watch(
  () => [props.projectId, props.taskId],
  () => {
    void loadFiles();
  },
  { immediate: true }
);
</script>

<template>
  <section
    class="file-panel"
    :class="{ 'file-panel--card': props.card }"
    :aria-label="title"
  >
    <div class="file-panel__heading">
      <div>
        <p v-if="props.card">PROJECT FILES</p>
        <h2>{{ title }}</h2>
        <span>
          {{
            isTaskAttachment
              ? "项目成员可上传任务附件"
              : "项目负责人可上传项目公共文件"
          }}
        </span>
      </div>

      <div class="file-panel__upload">
        <input
          ref="fileInput"
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
          @change="handleFileChange"
        />
        <el-button
          v-if="canUpload"
          type="primary"
          :loading="uploading"
          @click="openFilePicker"
        >
          上传文件
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="props.projectStatus === 'archived'"
      class="file-panel__notice"
      type="info"
      :closable="false"
      show-icon
      title="项目已归档，只能查看和下载历史文件。"
    />

    <div v-if="loading" v-loading="true" class="file-panel__loading" />

    <el-alert v-else-if="errorMessage" type="error" :closable="false" show-icon>
      <template #title>
        {{ errorMessage }}
        <el-button link type="primary" @click="loadFiles">重新加载</el-button>
      </template>
    </el-alert>

    <el-empty
      v-else-if="files.length === 0"
      :image-size="72"
      :description="`暂时没有${title}`"
    />

    <el-table v-else :data="files" class="file-panel__table">
      <el-table-column label="文件名" min-width="220">
        <template #default="scope: { row: FileListItem }">
          <strong>{{ scope.row.originalName }}</strong>
          <p>{{ scope.row.mimeType }}</p>
        </template>
      </el-table-column>

      <el-table-column label="上传人" min-width="130">
        <template #default="scope: { row: FileListItem }">
          {{ scope.row.uploaderNickname }}
          <small>@{{ scope.row.uploaderUsername }}</small>
        </template>
      </el-table-column>

      <el-table-column label="大小" width="100">
        <template #default="scope: { row: FileListItem }">
          {{ formatFileSize(scope.row.sizeBytes) }}
        </template>
      </el-table-column>

      <el-table-column label="上传时间" min-width="170">
        <template #default="scope: { row: FileListItem }">
          {{ formatDateTime(scope.row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="150" fixed="right">
        <template #default="scope: { row: FileListItem }">
          <el-button
            link
            type="primary"
            :loading="downloadingFileId === scope.row.id"
            :disabled="downloadingFileId !== null"
            @click="handleDownload(scope.row)"
          >
            下载
          </el-button>
          <el-button
            v-if="scope.row.canDelete"
            link
            type="danger"
            :loading="deletingFileId === scope.row.id"
            :disabled="deletingFileId !== null"
            @click="handleDelete(scope.row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <p v-if="canUpload" class="file-panel__help">
      单个文件最大 10 MB，支持图片、PDF、Office 文档、文本和 ZIP。
    </p>
  </section>
</template>

<style scoped>
.file-panel {
  min-width: 0;
}

.file-panel--card {
  margin-top: 22px;
  padding: clamp(24px, 3vw, 34px);
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6eaf0;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(38, 53, 79, 0.04);
}

.file-panel__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.file-panel__heading p {
  margin: 0 0 6px;
  color: #5c7fb5;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.file-panel__heading h2 {
  margin: 0;
  color: #27364c;
  font-size: 20px;
}

.file-panel__heading span,
.file-panel__help,
.file-panel__table p,
.file-panel__table small {
  color: #98a2b3;
  font-size: 12px;
}

.file-panel__heading span {
  display: block;
  margin-top: 6px;
}

.file-panel__notice {
  margin-bottom: 16px;
}

.file-panel__loading {
  min-height: 120px;
}

.file-panel__table strong {
  color: #344054;
}

.file-panel__table p {
  margin: 4px 0 0;
}

.file-panel__table small {
  display: block;
  margin-top: 3px;
}

.file-panel__help {
  margin: 14px 0 0;
  text-align: right;
}

@media (max-width: 640px) {
  .file-panel__heading {
    flex-direction: column;
  }
}
</style>
""",
)

replace_once(
    "server/src/app.ts",
    'import { commentRoutes } from "./modules/comments/comments.routes";\n',
    'import { commentRoutes } from "./modules/comments/comments.routes";\n'
    'import { fileRoutes } from "./modules/files/files.routes";\n',
)

replace_once(
    "server/src/app.ts",
    '  // projectRoutes 内部的 / 会和这里拼成 POST /api/projects。\n'
    '  app.use("/api/projects", projectRoutes);\n',
    '  // 文件路由包含项目文件、任务附件、下载和删除。\n'
    '  app.use("/api", fileRoutes);\n\n'
    '  // projectRoutes 内部的 / 会和这里拼成 POST /api/projects。\n'
    '  app.use("/api/projects", projectRoutes);\n',
)

replace_once(
    "web/src/views/ProjectDetailView.vue",
    'import BrandLogo from "@/components/auth/BrandLogo.vue";\n',
    'import BrandLogo from "@/components/auth/BrandLogo.vue";\n'
    'import FileListPanel from "@/components/files/FileListPanel.vue";\n',
)

replace_once(
    "web/src/views/ProjectDetailView.vue",
    '      <ProjectTaskList\n'
    '        v-if="project"\n',
    '      <FileListPanel\n'
    '        v-if="project"\n'
    '        :project-id="project.id"\n'
    '        :project-role="project.role"\n'
    '        :project-status="project.status"\n'
    '        card\n'
    '      />\n\n'
    '      <ProjectTaskList\n'
    '        v-if="project"\n',
)

replace_once(
    "web/src/components/tasks/TaskDetailDialog.vue",
    'import TaskComments from "@/components/comments/TaskComments.vue";\n',
    'import TaskComments from "@/components/comments/TaskComments.vue";\n'
    'import FileListPanel from "@/components/files/FileListPanel.vue";\n',
)

replace_once(
    "web/src/components/tasks/TaskDetailDialog.vue",
    '        <el-divider content-position="left">任务评论</el-divider>\n'
    '        <TaskComments\n',
    '        <el-divider content-position="left">任务附件</el-divider>\n'
    '        <FileListPanel\n'
    '          :project-id="task.projectId"\n'
    '          :task-id="task.id"\n'
    '          :project-status="task.projectStatus"\n'
    '        />\n\n'
    '        <el-divider content-position="left">任务评论</el-divider>\n'
    '        <TaskComments\n',
)

package_json_path = ROOT / "server/package.json"
package_json = json.loads(package_json_path.read_text(encoding="utf-8"))
package_json["dependencies"]["multer"] = "^2.2.0"
package_json["devDependencies"]["@types/multer"] = "^2.2.0"
package_json_path.write_text(
    json.dumps(package_json, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

replace_once(
    "docs/TODO.md",
    """### 模块 9：文件上传

- [ ] 模块完成
- 开发目标：使用 Multer 上传、查询、下载和删除项目文件及任务附件，MySQL 只保存文件元数据。
- 涉及后端目录：`server/src/modules/files`、`server/src/modules/projects`、`server/src/modules/tasks`、`server/src/modules/members`、`server/src/config`。
- 涉及前端目录：`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`files`、`projects`、`tasks`、`project_members`、`users`。
- 完成标准：区分项目文件和任务附件；校验文件大小、类型和资源归属；服务端生成安全存储名；上传人或 Owner 可按规则删除；不做文件版本控制。
- 是否依赖前一个模块：否直接依赖评论；固定在模块 8 后开发，并复用项目、任务和成员权限。
""",
    """### 模块 9：文件上传

- [ ] 模块完成
- [x] 固定项目文件、任务附件、下载和删除接口字段、权限、文件限制及错误码
- [x] 新增 Multer 内存接收、安全存储名、磁盘存储和 `files` 元数据写入
- [x] 实现项目文件与任务附件列表、上传、下载、删除的后端完整分层
- [x] 项目详情页接入项目文件列表、Owner 上传、下载和按权限删除
- [x] 任务详情接入任务附件列表、项目成员上传、下载和按权限删除
- [x] 后端和前端类型检查、生产构建通过
- [ ] 完成真实 HTTP + MySQL 文件上传、下载、权限和归档业务验收后，再标记模块完成
- 开发目标：使用 Multer 上传、查询、下载和删除项目文件及任务附件，MySQL 只保存文件元数据。
- 涉及后端目录：`server/src/modules/files`、`server/src/modules/projects`、`server/src/modules/tasks`、`server/src/modules/members`、`server/src/config`。
- 涉及前端目录：`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`files`、`projects`、`tasks`、`project_members`、`users`。
- 完成标准：区分项目文件和任务附件；校验文件大小、类型和资源归属；服务端生成安全存储名；上传人或 Owner 可按规则删除；不做文件版本控制。
- 是否依赖前一个模块：否直接依赖评论；固定在模块 8 后开发，并复用项目、任务和成员权限。
""",
)

replace_once(
    "docs/API.md",
    """### 4.7 文件 files

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects/:projectId/files` | ProjectMember | 获取项目文件列表 |
| POST | `/api/projects/:projectId/files` | ProjectOwner | 上传项目文件 |
| GET | `/api/tasks/:taskId/files` | ProjectMember | 获取任务附件列表 |
| POST | `/api/tasks/:taskId/files` | ProjectMember | 上传任务附件 |
| GET | `/api/files/:fileId/download` | ProjectMember | 下载文件 |
| DELETE | `/api/files/:fileId` | User | 上传人可删除；项目负责人可删除项目内文件 |

上传字段名统一为 `file`。第一版不做文件版本控制，同名文件由服务端生成不同的存储名。
""",
    """### 4.7 文件 files

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects/:projectId/files` | ProjectMember | 获取项目文件列表 |
| POST | `/api/projects/:projectId/files` | ProjectOwner | 上传项目文件 |
| GET | `/api/tasks/:taskId/files` | ProjectMember | 获取任务附件列表 |
| POST | `/api/tasks/:taskId/files` | ProjectMember | 上传任务附件 |
| GET | `/api/files/:fileId/download` | ProjectMember | 下载文件 |
| DELETE | `/api/files/:fileId` | User | 上传人可删除；项目负责人可删除项目内文件 |

上传请求使用 `multipart/form-data`，字段名固定为 `file`，每次只能上传一个文件。单个文件最大为 10 MB，支持 JPEG、PNG、GIF、WebP、PDF、TXT、CSV、Word、Excel、PowerPoint 和 ZIP。项目文件只能由 Owner 上传；任务附件可以由任务所属项目的任意当前成员上传。`archived` 项目只允许查看和下载历史文件，不允许继续上传或删除。

文件本体保存在服务端 `uploads` 目录，MySQL 的 `files` 表只保存元数据。服务端使用 UUID 生成存储名，同名文件不会互相覆盖；接口不返回 `storedName` 和 `storagePath`，避免暴露服务器目录。第一版不做文件版本控制。

列表成功响应：

```json
{
  "code": 0,
  "message": "项目文件获取成功",
  "data": {
    "files": [
      {
        "id": 31,
        "projectId": 8,
        "taskId": null,
        "uploaderUserId": 2,
        "uploaderUsername": "alice",
        "uploaderNickname": "小林",
        "originalName": "需求说明.pdf",
        "sizeBytes": 245760,
        "mimeType": "application/pdf",
        "category": "project",
        "createdAt": "2026-07-26T08:00:00.000Z",
        "updatedAt": "2026-07-26T08:00:00.000Z",
        "canDelete": true
      }
    ]
  }
}
```

任务附件列表字段相同，但 `taskId` 为目标任务 ID、`category` 为 `task`。`canDelete` 由后端根据当前用户是否为上传人或项目 Owner、项目是否归档计算，前端不能自行决定删除权限。

上传成功返回 `data.file`，字段与列表项一致。删除成功响应：

```json
{
  "code": 0,
  "message": "文件删除成功",
  "data": {
    "deletedFileId": 31
  }
}
```

下载接口成功时直接返回二进制文件，并通过 `Content-Disposition: attachment` 使用原始文件名下载，不使用统一 JSON 成功结构。非法 ID、未选择文件、字段名错误、空文件、文件过大或类型不支持返回 `40001`；非 Owner 上传项目文件或无删除权限返回 `40301`；资源不存在或当前用户不是所属项目成员返回 `40401`；元数据存在但磁盘文件缺失返回 `40402`；归档项目上传或删除返回 `40904`。
""",
)

replace_once(
    "docs/DEV_LOG.md",
    "## 2026-07-26\n",
    """## 2026-07-26

### 模块 9：文件上传前后端实现

- 新增 `server/src/modules/files` 的 routes、controller、service、repository、validator、types 和磁盘存储分层，提供项目文件、任务附件的列表、上传、下载和删除接口。
- 新增 Multer 配置，上传字段固定为 `file`，单文件最大 10 MB，并限制为图片、PDF、文本、Office 文档和 ZIP；服务端使用 UUID 存储名，接口不暴露服务器路径。
- 项目文件只允许 Owner 上传，任务附件允许项目成员上传；查看和下载要求当前项目成员，删除要求上传人或项目 Owner，归档项目只读。
- 前端新增文件类型、API 封装和独立 `FileListPanel.vue`，项目详情展示项目文件，任务详情展示任务附件，并支持上传、下载、删除确认、错误重试和归档提示。
- 后端和前端类型检查及生产构建通过；真实 HTTP + MySQL 文件业务验收仍待执行，因此模块九总完成项暂不勾选。
- 复用既有 `files` 表，本次未修改数据库表、迁移文件、`docs/DATABASE.md`、认证逻辑或数据库连接配置。
""",
)
