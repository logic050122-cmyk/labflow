
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
