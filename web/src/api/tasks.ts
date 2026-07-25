import { request } from "@/api/http";
import type {
  ApproveTaskResult,
  CreateTaskRequest,
  CreateTaskResult,
  GetTaskResult,
  GetTasksParams,
  RejectTaskRequest,
  RejectTaskResult,
  StartTaskResult,
  SubmitTaskRequest,
  SubmitTaskResult,
  TaskListResult,
  UpdateTaskRequest,
  UpdateTaskResult
} from "@/types/tasks";

// 页面不直接使用 axios，任务相关请求统一经过 api/http.ts 的 Token 和错误处理逻辑。
export async function getMyTasks(params: GetTasksParams = {}) {
  return await request<TaskListResult>({
    method: "GET",
    url: "/tasks",
    params
  });
}

export async function getProjectTasks(projectId: number, params: GetTasksParams = {}) {
  return await request<TaskListResult>({
    method: "GET",
    url: `/projects/${projectId}/tasks`,
    params
  });
}

export async function createTask(projectId: number, payload: CreateTaskRequest) {
  return await request<CreateTaskResult>({
    method: "POST",
    url: `/projects/${projectId}/tasks`,
    data: payload
  });
}

export async function getTask(taskId: number) {
  return await request<GetTaskResult>({
    method: "GET",
    url: `/tasks/${taskId}`
  });
}

export async function updateTask(taskId: number, payload: UpdateTaskRequest) {
  return await request<UpdateTaskResult>({
    method: "PUT",
    url: `/tasks/${taskId}`,
    data: payload
  });
}

// 当前登录用户开始处理分配给自己的任务。
export async function startTask(taskId: number) {
  return await request<StartTaskResult>({
    method: "POST",
    url: `/tasks/${taskId}/start`
  });
}

// Assignee 提交任务，完成说明为空时不传字段。
export async function submitTask(taskId: number, payload: SubmitTaskRequest) {
  return await request<SubmitTaskResult>({
    method: "POST",
    url: `/tasks/${taskId}/submit`,
    data: payload
  });
}

// Owner 审核通过不需要请求体，审核人由 JWT 当前用户确定。
export async function approveTask(taskId: number) {
  return await request<ApproveTaskResult>({
    method: "POST",
    url: `/tasks/${taskId}/approve`
  });
}

// Owner 驳回时必须提交原因。
export async function rejectTask(taskId: number, payload: RejectTaskRequest) {
  return await request<RejectTaskResult>({
    method: "POST",
    url: `/tasks/${taskId}/reject`,
    data: payload
  });
}
