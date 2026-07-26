
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
