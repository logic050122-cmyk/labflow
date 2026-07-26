
import { Router } from "express";

import { uploadSingleFile } from "../../config/upload";
import { authenticate } from "../../middlewares/auth.middleware";

import {
  download,
  listForProject,
  listForTask,
  remove,
  uploadForProject,
  uploadForTask
} from "./files.controller";

export const fileRoutes = Router();

// 项目文件：当前项目成员可以查看，只有项目 Owner 可以上传。
fileRoutes.get("/projects/:projectId/files", authenticate, listForProject);
fileRoutes.post(
  "/projects/:projectId/files",
  authenticate,
  uploadSingleFile,
  uploadForProject
);

// 任务附件：当前项目成员可以查看和上传，具体成员关系由 service 校验。
fileRoutes.get("/tasks/:taskId/files", authenticate, listForTask);
fileRoutes.post(
  "/tasks/:taskId/files",
  authenticate,
  uploadSingleFile,
  uploadForTask
);

// 下载和删除只接收 fileId，service 会通过文件反查项目、成员关系和 Owner。
fileRoutes.get("/files/:fileId/download", authenticate, download);
fileRoutes.delete("/files/:fileId", authenticate, remove);
