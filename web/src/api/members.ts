import { request } from "@/api/http";
import type {
  ListProjectMembersResult,
  RemoveProjectMemberResult
} from "@/types/members";

// 页面不直接调用 axios，成员相关请求统一从这个文件进入通用 request 封装。
export async function getProjectMembers(projectId: number) {
  return await request<ListProjectMembersResult>({
    method: "GET",
    url: `/projects/${projectId}/members`
  });
}

export async function removeProjectMember(projectId: number, userId: number) {
  // 当前操作者由 Token 决定，页面只在 URL 中指定项目和目标成员。
  return await request<RemoveProjectMemberResult>({
    method: "DELETE",
    url: `/projects/${projectId}/members/${userId}`
  });
}
