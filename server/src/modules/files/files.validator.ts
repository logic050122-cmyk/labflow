
import { AppError } from "../../common/http";
import {
  ALLOWED_FILE_MIME_TYPES,
  FILE_MAX_SIZE_BYTES
} from "../../config/upload";

import type { UploadFileInput } from "./files.types";

const ORIGINAL_NAME_MAX_LENGTH = 255;

// ============================================================
// 1. 路径参数校验
// ============================================================
// Express 路径参数是字符串，进入 service 前统一转换成安全的正整数。
const validatePositiveIdParam = (value: unknown, fieldName: string): number => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue < 1) {
    throw new AppError(`${fieldName}必须是正整数`, 400, 40001);
  }

  return numberValue;
};

export const validateProjectIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "项目 ID");
};

export const validateTaskIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "任务 ID");
};

export const validateFileIdParam = (value: unknown): number => {
  return validatePositiveIdParam(value, "文件 ID");
};

// ============================================================
// 2. 上传文件校验
// ============================================================
// Multer 负责接收文件，这里再次校验业务层真正依赖的文件名、大小和 MIME 类型。
export const validateUploadedFile = (
  file: Express.Multer.File | undefined
): UploadFileInput => {
  if (!file) {
    throw new AppError("请选择要上传的文件，上传字段名必须是 file", 400, 40001);
  }

  const originalName = file.originalname.trim();
  if (!originalName) {
    throw new AppError("文件名不能为空", 400, 40001);
  }

  if (originalName.length > ORIGINAL_NAME_MAX_LENGTH) {
    throw new AppError(
      `文件名不能超过 ${ORIGINAL_NAME_MAX_LENGTH} 个字符`,
      400,
      40001
    );
  }

  if (file.size < 1) {
    throw new AppError("不能上传空文件", 400, 40001);
  }

  if (file.size > FILE_MAX_SIZE_BYTES) {
    throw new AppError("文件大小不能超过 10 MB", 400, 40001);
  }

  if (!ALLOWED_FILE_MIME_TYPES.has(file.mimetype)) {
    throw new AppError("不支持该文件类型", 400, 40001);
  }

  return {
    originalName,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    buffer: file.buffer
  };
};
