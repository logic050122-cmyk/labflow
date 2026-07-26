
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

fileRoutes.get("/projects/:projectId/files", authenticate, listForProject);
fileRoutes.post(
  "/projects/:projectId/files",
  authenticate,
  uploadSingleFile,
  uploadForProject
);

fileRoutes.get("/tasks/:taskId/files", authenticate, listForTask);
fileRoutes.post(
  "/tasks/:taskId/files",
  authenticate,
  uploadSingleFile,
  uploadForTask
);

fileRoutes.get("/files/:fileId/download", authenticate, download);
fileRoutes.delete("/files/:fileId", authenticate, remove);
