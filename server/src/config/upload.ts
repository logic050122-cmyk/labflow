
import multer from "multer";
import type { RequestHandler } from "express";

import { AppError } from "../common/http";

export const FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_FILE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed"
]);

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: FILE_MAX_SIZE_BYTES
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_FILE_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError("不支持该文件类型", 400, 40001));
      return;
    }

    callback(null, true);
  }
});

const singleFile = uploader.single("file");

// Multer 只负责解析 multipart/form-data 和文件大小、类型限制。
// 具体项目、任务、成员和 Owner 权限仍由 files.service.ts 校验。
export const uploadSingleFile: RequestHandler = (request, response, next) => {
  singleFile(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError("文件大小不能超过 10 MB", 400, 40001));
        return;
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        next(new AppError("上传字段名必须是 file，且一次只能上传一个文件", 400, 40001));
        return;
      }

      next(new AppError("文件上传参数不正确", 400, 40001));
      return;
    }

    next(error);
  });
};
