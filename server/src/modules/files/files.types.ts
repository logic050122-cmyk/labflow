
import type { ProjectStatus } from "../projects/projects.types";

export type FileCategory = "project" | "task";

// ============================================================
// 1. 数据库文件记录
// ============================================================
// repository 从 files 表和 users 表查出完整内部记录。
// storedName、storagePath 只供后端定位磁盘文件，不能返回给前端。
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

// ============================================================
// 2. 返回给前端的文件对象
// ============================================================
// 接口只返回展示需要的元数据；canDelete 由 service 根据当前用户和项目状态计算。
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

// Multer 把上传内容放在内存后，validator 将其整理成 service 使用的输入。
export interface UploadFileInput {
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  buffer: Buffer;
}

// ============================================================
// 3. service 操作结果
// ============================================================
// controller 可以把这些明确的结果类型直接交给 sendSuccess。
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

// ============================================================
// 4. service 权限判断需要的中间数据
// ============================================================
// 列表查询同时返回项目 Owner、项目状态和文件，避免 service 再查一次项目。
export interface ProjectFileListTarget {
  ownerUserId: number;
  projectStatus: ProjectStatus;
  files: StoredFileRecord[];
}

// 上传前需要确认文件应写入哪个项目/任务，以及项目是否仍允许写操作。
export interface FileWriteTarget {
  projectId: number;
  taskId: number | null;
  ownerUserId: number;
  projectStatus: ProjectStatus;
}

// 下载和删除时先通过文件反查所属项目，再进行成员与 Owner 权限判断。
export interface FileAccessTarget {
  ownerUserId: number;
  projectStatus: ProjectStatus;
  file: StoredFileRecord;
}
