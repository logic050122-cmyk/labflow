import axios from "axios";

import http, { request } from "@/api/http";
import type { ApiResponse } from "@/types/api";
import type {
  DeleteFileResult,
  ListFilesResult,
  UploadFileResult
} from "@/types/files";

// 文件上传必须使用 multipart/form-data，字段名与后端 Multer 约定为 file。
const createFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

// 文件相关请求统一经过 api/http.ts，页面组件不直接拼接 axios 请求。
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

// 下载返回的是二进制 Blob，不走普通 JSON data 解包。
// 如果后端返回 JSON 错误，先从 Blob 中还原 message，页面才能展示明确原因。
const readBlobErrorMessage = async (blob: Blob): Promise<string | null> => {
  try {
    const result = JSON.parse(await blob.text()) as ApiResponse<null>;
    return result.message || null;
  } catch {
    return null;
  }
};

export async function downloadFile(fileId: number): Promise<Blob> {
  try {
    const response = await http.get<Blob>(`/files/${fileId}/download`, {
      responseType: "blob"
    });

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError<Blob>(error)) {
      const responseData = error.response?.data;
      const message =
        responseData instanceof Blob
          ? await readBlobErrorMessage(responseData)
          : null;
      throw new Error(message || "文件下载失败");
    }

    throw error instanceof Error ? error : new Error("文件下载失败");
  }
}
