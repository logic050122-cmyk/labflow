import { AppError } from "../../common/http";

import type { ListNotificationsInput } from "./notifications.types";

type RequestQuery = Record<string, unknown>;

const ensureQueryObject = (value: unknown): RequestQuery => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppError("请求参数格式不正确", 400, 40001);
  }

  return value as RequestQuery;
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

const readOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }

  throw new AppError("isRead必须是布尔值", 400, 40001);
};

export const validateListNotificationsRequest = (
  query: unknown
): ListNotificationsInput => {
  const requestQuery = ensureQueryObject(query);

  return {
    page: readPositiveInteger(requestQuery.page, "page", 1),
    pageSize: readPositiveInteger(requestQuery.pageSize, "pageSize", 10, 100),
    isRead: readOptionalBoolean(requestQuery.isRead)
  };
};

export const validateNotificationIdParam = (value: unknown): number => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError("通知 ID 必须是正整数", 400, 40001);
  }

  return readPositiveInteger(value, "通知 ID");
};

