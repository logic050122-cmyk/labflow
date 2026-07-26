
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
