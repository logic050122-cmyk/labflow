import type { ProjectStatus } from "../projects/projects.types";

// 任务优先级、状态和标签统一在这里定义，前后端可以按同一套业务值对齐。
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "todo" | "doing" | "submitted" | "done" | "overdue";

// 第一版只允许选择计划书中列出的单个任务标签，不做自定义标签管理。
export type TaskTag = "功能" | "Bug" | "优化" | "文档" | "测试" | "UI";

// 创建和编辑都只接收任务本身的可编辑字段。
// projectId、creatorUserId、status 都由 service 根据当前请求和业务规则决定。
export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeUserId: number;
  priority: TaskPriority;
  tag?: TaskTag;
  dueAt?: Date;
}

export interface UpdateTaskInput extends CreateTaskInput {}

// 提交任务时客户端只传可选完成说明，任务和用户身份由路径与 JWT 确定。
export interface SubmitTaskInput {
  submitContent?: string;
}

// 驳回原因是审核操作必须填写的业务数据。
export interface RejectTaskInput {
  reason: string;
}

// 两个任务列表共用分页和筛选条件；“我的任务”会由 service 固定负责人为当前用户。
export interface ListTasksInput {
  page: number;
  pageSize: number;
  status?: TaskStatus;
  assigneeUserId?: number;
  priority?: TaskPriority;
  tag?: TaskTag;
  keyword?: string;
}

// 接口返回的任务对象统一使用 camelCase，不把数据库的 snake_case 直接暴露给页面。
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
  submitContent: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewerUserId: number | null;
  reviewedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskResult {
  task: Task;
}

export interface UpdateTaskResult {
  task: Task;
}

export interface GetTaskResult {
  task: Task;
}

// 开始任务成功后，接口返回状态已经更新的完整任务。
export interface StartTaskResult {
  task: Task;
}

// 提交、通过和驳回成功后都返回状态已经更新的完整任务。
export interface SubmitTaskResult {
  task: Task;
}

export interface ApproveTaskResult {
  task: Task;
}

export interface RejectTaskResult {
  task: Task;
}

export interface ListTasksResult {
  list: Task[];
  total: number;
  page: number;
  pageSize: number;
}

// repository 插入任务时需要的完整字段，其中的状态固定由 service 指定为 todo。
export interface CreateTaskRepositoryInput extends CreateTaskInput {
  projectId: number;
  creatorUserId: number;
  status: TaskStatus;
}

// 创建任务时查询到的项目数据，只保留 service 做权限和状态判断所需字段。
export interface TaskProjectWriteTarget {
  ownerUserId: number;
  status: ProjectStatus;
}

// 编辑任务时还需要知道任务当前状态，避免模块五提前修改后续模块的状态流转。
export interface TaskWriteTarget extends TaskProjectWriteTarget {
  taskId: number;
  projectId: number;
  taskStatus: TaskStatus;
}

// 开始任务时，service 做权限和状态判断所需要的数据。
export interface TaskStartTarget {
  taskId: number;
  projectId: number;
  assigneeUserId: number;
  projectStatus: ProjectStatus;
  taskStatus: TaskStatus;
}

// 提交与审核时需要同时判断成员关系、Assignee、Owner、项目状态和任务状态。
export interface TaskReviewTarget {
  taskId: number;
  projectId: number;
  assigneeUserId: number;
  ownerUserId: number;
  projectStatus: ProjectStatus;
  taskStatus: TaskStatus;
}
