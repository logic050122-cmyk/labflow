import { AppError } from "../../common/http";

import type {
  CreateProjectInput,
  ListProjectsInput,
  ProjectStatus
} from "./projects.types";

type RequestBody = Record<string, unknown>;

const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_DESCRIPTION_MAX_LENGTH = 2000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ensureRequestBody = (body: unknown): RequestBody => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError("请求参数格式不正确", 400, 40001);
  }

  return body as RequestBody;
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

const readDate = (value: unknown, fieldName: string): string => {
  const text = readRequiredText(value, fieldName);

  if (!DATE_ONLY_PATTERN.test(text)) {
    throw new AppError(`${fieldName}必须使用 YYYY-MM-DD 格式`, 400, 40001);
  }

  const [yearText, monthText, dayText] = text.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !yearText ||
    !monthText ||
    !dayText ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AppError(`${fieldName}不是有效日期`, 400, 40001);
  }

  return text;
};

// 创建接口只读取 name、description、startDate、endDate。
// 客户端即使额外提交 status、ownerId 或 userId，也不会影响后续业务判断。
export const validateCreateProjectRequest = (body: unknown): CreateProjectInput => {
  const requestBody = ensureRequestBody(body);

  const name = readRequiredText(requestBody.name, "项目名称");
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    throw new AppError("项目名称不能超过 100 个字符", 400, 40001);
  }

  const description = readOptionalText(requestBody.description, "项目描述");
  if (description && description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    throw new AppError("项目描述不能超过 2000 个字符", 400, 40001);
  }

  const startDate = readDate(requestBody.startDate, "开始日期");
  const endDate = readDate(requestBody.endDate, "截止日期");
  if (endDate < startDate) {
    throw new AppError("截止日期不能早于开始日期", 400, 40001);
  }

  return {
    name,
    description,
    startDate,
    endDate
  };
};

const readPositiveInteger = (
  value: unknown,
  fieldName: string,
  defaultValue: number,
  maxValue?: number
): number => {
  // 没有传分页参数时使用默认值；传了以后必须是正整数。
  if (value === undefined || value === "") {
    return defaultValue;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  if (maxValue && numberValue > maxValue) {
    throw new AppError(`${fieldName}不能超过 ${maxValue}`, 400, 40001);
  }

  return numberValue;
};

const PROJECT_STATUSES: ProjectStatus[] = ["active", "finished", "archived"];

export const validateListProjectsRequest = (query: unknown): ListProjectsInput => {
  // Express 的 request.query 类型比较宽，这里先转换成普通对象再读取字段。
  const requestQuery = ensureRequestBody(query);
  const page = readPositiveInteger(requestQuery.page, "page", 1);
  const pageSize = readPositiveInteger(requestQuery.pageSize, "pageSize", 20, 100);

  const statusValue = requestQuery.status;
  if (statusValue === undefined || statusValue === "") {
    // 不传 status 表示查询当前用户参与的全部项目。
    return { page, pageSize };
  }

  if (
    typeof statusValue !== "string" ||
    !PROJECT_STATUSES.includes(statusValue as ProjectStatus)
  ) {
    throw new AppError("项目状态不正确", 400, 40001);
  }

  return {
    page,
    pageSize,
    status: statusValue as ProjectStatus
  };
};
