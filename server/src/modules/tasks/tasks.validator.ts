import { AppError } from "../../common/http";

import type {
  CreateTaskInput,
  ListTasksInput,
  RejectTaskInput,
  SubmitTaskInput,
  TaskPriority,
  TaskStatus,
  TaskTag,
  UpdateTaskInput
} from "./tasks.types";

type RequestBody = Record<string, unknown>;

const TASK_TITLE_MAX_LENGTH = 150;
const TASK_DESCRIPTION_MAX_LENGTH = 2000;
const TASK_TAG_MAX_LENGTH = 30;
const TASK_KEYWORD_MAX_LENGTH = 100;
const SUBMIT_CONTENT_MAX_LENGTH = 10000;
const REJECTION_REASON_MAX_LENGTH = 500;
const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "submitted", "done", "overdue"];
const TASK_TAGS: TaskTag[] = ["功能", "Bug", "优化", "文档", "测试", "UI"];

// Express 的 body 和 query 都是宽泛类型，进入业务层前先保证它们是普通对象。
const ensureRequestObject = (value: unknown): RequestBody => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppError("请求参数格式不正确", 400, 40001);
  }

  return value as RequestBody;
};

const readRequiredText = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new AppError(`${fieldName}不能为空`, 400, 40001);
  }

  const text = value.trim();
  if (!text) {
    throw new AppError(`${fieldName}不能为空`, 400, 40001);
  }

  return text;
};

const readOptionalText = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(`${fieldName}格式不正确`, 400, 40001);
  }

  const text = value.trim();
  return text || undefined;
};

const readPositiveInteger = (
  value: unknown,
  fieldName: string,
  defaultValue?: number,
  maxValue?: number
): number => {
  if ((value === undefined || value === "") && defaultValue !== undefined) {
    return defaultValue;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue < 1) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  if (maxValue !== undefined && numberValue > maxValue) {
    throw new AppError(`${fieldName}不能超过 ${maxValue}`, 400, 40001);
  }

  return numberValue;
};

const readTaskPriority = (value: unknown): TaskPriority => {
  if (typeof value !== "string" || !TASK_PRIORITIES.includes(value as TaskPriority)) {
    throw new AppError("任务优先级不正确", 400, 40001);
  }

  return value as TaskPriority;
};

const readOptionalTaskTag = (value: unknown): TaskTag | undefined => {
  const tag = readOptionalText(value, "任务标签");
  if (!tag) {
    return undefined;
  }

  if (tag.length > TASK_TAG_MAX_LENGTH || !TASK_TAGS.includes(tag as TaskTag)) {
    throw new AppError("任务标签不正确", 400, 40001);
  }

  return tag as TaskTag;
};

// 页面传入 ISO 8601 时间字符串，validator 统一转成 Date 再交给 repository 写入 DATETIME。
const readOptionalDueAt = (value: unknown): Date | undefined => {
  const dueAtText = readOptionalText(value, "截止时间");
  if (!dueAtText) {
    return undefined;
  }

  const dueAt = new Date(dueAtText);
  if (Number.isNaN(dueAt.getTime())) {
    throw new AppError("截止时间格式不正确", 400, 40001);
  }

  // 模块五中新任务固定为 todo，不允许创建时就填写已过期的截止时间。
  if (dueAt.getTime() <= Date.now()) {
    throw new AppError("截止时间必须晚于当前时间", 400, 40001);
  }

  return dueAt;
};

const validateTaskRequest = (body: unknown): CreateTaskInput => {
  const requestBody = ensureRequestObject(body);
  const title = readRequiredText(requestBody.title, "任务标题");
  if (title.length > TASK_TITLE_MAX_LENGTH) {
    throw new AppError("任务标题不能超过 150 个字符", 400, 40001);
  }

  const description = readOptionalText(requestBody.description, "任务描述");
  if (description && description.length > TASK_DESCRIPTION_MAX_LENGTH) {
    throw new AppError("任务描述不能超过 2000 个字符", 400, 40001);
  }

  const assigneeUserId = readPositiveInteger(requestBody.assigneeUserId, "负责人 ID");
  const priority = readTaskPriority(requestBody.priority);
  const tag = readOptionalTaskTag(requestBody.tag);
  const dueAt = readOptionalDueAt(requestBody.dueAt);

  return {
    title,
    description,
    assigneeUserId,
    priority,
    tag,
    dueAt
  };
};

// 创建和编辑都要求完整提交任务表单，避免 PUT 接口出现字段部分覆盖的歧义。
export const validateCreateTaskRequest = (body: unknown): CreateTaskInput => {
  return validateTaskRequest(body);
};

export const validateUpdateTaskRequest = (body: unknown): UpdateTaskInput => {
  return validateTaskRequest(body);
};

// 完成说明是可选文本；空字符串按未填写处理，长度限制避免超大文本落到数据库层报错。
export const validateSubmitTaskRequest = (body: unknown): SubmitTaskInput => {
  if (body === undefined) {
    return {};
  }

  const requestBody = ensureRequestObject(body);
  const submitContent = readOptionalText(requestBody.submitContent, "完成说明");
  if (submitContent && submitContent.length > SUBMIT_CONTENT_MAX_LENGTH) {
    throw new AppError("完成说明不能超过 10000 个字符", 400, 40001);
  }

  return submitContent ? { submitContent } : {};
};

// 驳回原因必须填写，并与数据库 VARCHAR(500) 长度保持一致。
export const validateRejectTaskRequest = (body: unknown): RejectTaskInput => {
  const requestBody = ensureRequestObject(body);
  const reason = readRequiredText(requestBody.reason, "驳回原因");
  if (reason.length > REJECTION_REASON_MAX_LENGTH) {
    throw new AppError("驳回原因不能超过 500 个字符", 400, 40001);
  }

  return { reason };
};

const readOptionalTaskStatus = (value: unknown): TaskStatus | undefined => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !TASK_STATUSES.includes(value as TaskStatus)) {
    throw new AppError("任务状态不正确", 400, 40001);
  }

  return value as TaskStatus;
};

const readOptionalPositiveInteger = (value: unknown, fieldName: string): number | undefined => {
  if (value === undefined || value === "") {
    return undefined;
  }

  return readPositiveInteger(value, fieldName);
};

// 两个列表共用筛选校验；我的任务在 service 中会忽略 assigneeUserId 并固定使用当前用户。
export const validateListTasksRequest = (query: unknown): ListTasksInput => {
  const requestQuery = ensureRequestObject(query);
  const page = readPositiveInteger(requestQuery.page, "page", 1);
  const pageSize = readPositiveInteger(requestQuery.pageSize, "pageSize", 10, 100);
  const keyword = readOptionalText(requestQuery.keyword, "关键词");

  if (keyword && keyword.length > TASK_KEYWORD_MAX_LENGTH) {
    throw new AppError("关键词不能超过 100 个字符", 400, 40001);
  }

  return {
    page,
    pageSize,
    status: readOptionalTaskStatus(requestQuery.status),
    assigneeUserId: readOptionalPositiveInteger(requestQuery.assigneeUserId, "负责人 ID"),
    priority:
      requestQuery.priority === undefined || requestQuery.priority === ""
        ? undefined
        : readTaskPriority(requestQuery.priority),
    tag: readOptionalTaskTag(requestQuery.tag),
    keyword
  };
};

const validatePositiveIdParam = (value: unknown, fieldName: string): number => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  return readPositiveInteger(value, fieldName);
};

export const validateProjectIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "项目 ID");
};

export const validateTaskIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "任务 ID");
};
