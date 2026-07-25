import { request } from "@/api/http";
import type {
  CreateCommentRequest,
  CreateCommentResult,
  DeleteCommentResult,
  ListCommentsResult
} from "@/types/comments";

// 评论请求统一经过 api/http.ts，页面不直接使用 axios。
export async function getTaskComments(taskId: number) {
  return await request<ListCommentsResult>({
    method: "GET",
    url: `/tasks/${taskId}/comments`
  });
}

export async function createTaskComment(taskId: number, payload: CreateCommentRequest) {
  return await request<CreateCommentResult>({
    method: "POST",
    url: `/tasks/${taskId}/comments`,
    data: payload
  });
}

export async function deleteTaskComment(commentId: number) {
  return await request<DeleteCommentResult>({
    method: "DELETE",
    url: `/comments/${commentId}`
  });
}
