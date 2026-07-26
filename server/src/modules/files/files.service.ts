
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
