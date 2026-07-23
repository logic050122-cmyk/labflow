import type { PageData } from "@/types/api";
import type { ProjectStatus } from "@/types/projects";

// 任务状态、优先级和标签统一维护，页面不再各自写一套中文文案或颜色判断。
export type TaskStatus = "todo" | "doing" | "submitted" | "done" | "overdue";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskTag = "功能" | "Bug" | "优化" | "文档" | "测试" | "UI";

type ElementTagType = "primary" | "success" | "warning" | "danger" | "info";

export const TASK_STATUS_TEXT: Record<TaskStatus, string> = {
  todo: "待开始",
  doing: "进行中",
  submitted: "待审核",
  done: "已完成",
  overdue: "已逾期"
};

export const TASK_STATUS_TAG_TYPE: Record<TaskStatus, ElementTagType> = {
  todo: "info",
  doing: "primary",
  submitted: "warning",
  done: "success",
  overdue: "danger"
};

export const TASK_PRIORITY_TEXT: Record<TaskPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急"
};

export const TASK_PRIORITY_TAG_TYPE: Record<TaskPriority, ElementTagType> = {
  low: "info",
  medium: "primary",
  high: "warning",
  urgent: "danger"
};

export const TASK_TAG_OPTIONS: TaskTag[] = ["功能", "Bug", "优化", "文档", "测试", "UI"];

// 后端返回的任务字段。负责人、创建人和项目名称已经由服务端关联查询完成。
export interface Task {
  id: number;
  projectId: number;
  projectName: string;
  projectStatus: ProjectStatus;
  title: string;
  description: string | null;
  assigneeUserId: number;
  assigneeUsername: string;
  assigneeNickname: string;
  creatorUserId: number;
  creatorUsername: string;
  creatorNickname: string;
  priority: TaskPriority;
  status: TaskStatus;
  tag: TaskTag | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 页面创建或编辑时只提交可编辑字段；项目、创建人和状态由后端决定。
export interface CreateTaskRequest {
  title: string;
  description?: string;
  assigneeUserId: number;
  priority: TaskPriority;
  tag?: TaskTag;
  dueAt?: string;
}

export interface UpdateTaskRequest extends CreateTaskRequest {}

export interface GetTasksParams {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  assigneeUserId?: number;
  priority?: TaskPriority;
  tag?: TaskTag;
  keyword?: string;
}

export interface CreateTaskResult {
  task: Task;
}

export interface UpdateTaskResult {
  task: Task;
}

export interface StartTaskResult {
  task: Task;
}

export interface GetTaskResult {
  task: Task;
}

export type TaskListResult = PageData<Task>;
