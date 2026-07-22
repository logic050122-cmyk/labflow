import { request } from "@/api/http";
import type { ListProjectMembersResult } from "@/types/members";

// 页面不直接调用 axios，成员相关请求统一从这个文件进入通用 request 封装。
export async function getProjectMembers(projectId: number) {
  return await request<ListProjectMembersResult>({
    method: "GET",
    url: `/projects/${projectId}/members`
  });
}
